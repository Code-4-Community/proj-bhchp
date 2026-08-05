import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { pandadocMapper } from '../pandadoc-helpers/pandadoc-mapper';
import { AppStatus, ApplicantType, PHONE_REGEX } from '../applications/types';
import { School } from '../learner-info/types';
import { ApplicationsService } from '../applications/applications.service';
import { CreateApplicationDto } from '../applications/dto/create-application.request.dto';
import { CreateLearnerInfoDto } from '../learner-info/dto/create-learner-info.request.dto';
import { LearnerInfoService } from '../learner-info/learner-info.service';
import { AWSS3Service } from '../util/aws-s3/aws-s3.service';

const PANDADOC_API_BASE = 'https://api.pandadoc.com/public/v1';
const PANDADOC_FILE_FIELDS = [
  {
    fieldId: 'Volunteer_ResumeUpload2',
    folder: 'resumes',
    label: 'resume',
  },
  {
    fieldId: 'Volunteer_CoverletterUpload2',
    folder: 'cover-letters',
    label: 'coverLetter',
  },
  {
    fieldId: 'Volunteer_SyllabusUpload',
    folder: 'syllabus',
    label: 'syllabus',
  },
] as const;

type PandaDocFileValue = {
  name?: string;
  url?: string;
};

/**
 * Orchestrates creation of Application, CandidateInfo, and LearnerInfo
 * records from a PandaDoc webhook payload.
 *
 * All three inserts run inside a single TypeORM transaction so a failure
 * in any step rolls back the others — preventing orphaned Application
 * rows without their candidate/learner data.
 */
@Injectable()
export class PandadocWebhookService {
  private readonly logger = new Logger(PandadocWebhookService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly awsS3Service: AWSS3Service,
    private readonly applicationsService: ApplicationsService,
    private readonly learnerInfoService: LearnerInfoService,
  ) {}

  private maskEmail(email: string): string {
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) return 'invalid-email';
    if (localPart.length <= 2) return `***@${domain}`;
    return `${localPart.slice(0, 2)}***@${domain}`;
  }

  private maskPhone(phone: unknown): string {
    if (typeof phone !== 'string' || !phone.trim()) return 'missing';
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 4) return '***';
    return `***-***-${digits.slice(-4)}`;
  }

  private getPayloadString(
    payload: Record<string, unknown>,
    key: string,
  ): string | undefined {
    const value = payload[key];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  /**
   * Formats a Date object or ISO-8601 string into a YYYY-MM-DD string.
   * Returns `undefined` when the input is null/undefined.
   */
  private formatDate(value: unknown): string | undefined {
    if (value == null) return undefined;
    if (value instanceof Date) return this.toYmd(value);
    if (typeof value === 'string') {
      // Already YYYY-MM-DD? leave as-is.
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
      // Parse ISO or other date strings and reformat.
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? value : this.toYmd(parsed);
    }
    return String(value);
  }

  private toYmd(date: Date): string {
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private isPandaDocFileValue(value: unknown): value is PandaDocFileValue {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  private inferMimeType(fileName: string, contentType?: string): string {
    if (contentType && contentType.trim()) {
      return contentType;
    }

    const lower = fileName.toLowerCase();
    if (lower.endsWith('.pdf')) return 'application/pdf';
    if (lower.endsWith('.doc')) return 'application/msword';
    if (lower.endsWith('.docx')) {
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }
    if (lower.endsWith('.txt')) return 'text/plain';
    return 'application/octet-stream';
  }

  private async uploadPandaDocFiles(
    payload: Record<string, unknown>,
    apiKey: string,
  ): Promise<void> {
    for (const fileField of PANDADOC_FILE_FIELDS) {
      const rawValue = payload[fileField.fieldId];
      if (!this.isPandaDocFileValue(rawValue)) {
        continue;
      }

      const fileName = rawValue.name?.trim();
      const fileUrl = rawValue.url?.trim();
      if (!fileName || !fileUrl) {
        this.logger.warn(
          `[PandaDoc] Skipping ${fileField.label} upload field=${fileField.fieldId} because name or url is missing`,
        );
        continue;
      }

      this.logger.log(
        `[PandaDoc] Downloading PandaDoc ${fileField.label} field=${fileField.fieldId} fileName=${fileName}`,
      );

      const response = await axios.get<ArrayBuffer>(fileUrl, {
        headers: { Authorization: `API-Key ${apiKey}` },
        responseType: 'arraybuffer',
      });

      const contentTypeHeader = response.headers['content-type'];
      const mimeType = this.inferMimeType(
        fileName,
        typeof contentTypeHeader === 'string' ? contentTypeHeader : undefined,
      );
      const uploadBaseName = `${fileField.folder}/${fileName}`;
      const uploadResult = await this.awsS3Service.uploadWithKey(
        Buffer.from(response.data),
        uploadBaseName,
        mimeType,
      );

      payload[fileField.fieldId] = uploadResult.key;
      this.logger.log(
        `[PandaDoc] Uploaded ${fileField.label} to S3 field=${fileField.fieldId} s3Key=${uploadResult.key}`,
      );
    }
  }

  /**
   * Entry point called by the controller. Receives the raw PandaDoc webhook
   * body (an array of events), extracts the document ID, fetches the field
   * values from the PandaDoc API, then delegates to `processWebhook`.
   *
   * PandaDoc webhook format: [{ event: string, data: { id: string, ... } }]
   */
  async handleIncomingWebhook(rawBody: unknown): Promise<{ appId: number }> {
    const documentId = this.extractDocumentId(rawBody);
    this.logger.log(
      `[PandaDoc] Extracted documentId=${documentId} from webhook event`,
    );

    const fields = await this.fetchDocumentFields(documentId);
    this.logger.log(
      `[PandaDoc] Fetched ${
        Object.keys(fields).length
      } fields for documentId=${documentId}`,
    );

    return this.processWebhook(fields);
  }

  private extractDocumentId(rawBody: unknown): string {
    const events = Array.isArray(rawBody) ? rawBody : [rawBody];
    const firstEvent = events[0];

    if (!firstEvent || typeof firstEvent !== 'object') {
      throw new BadRequestException(
        'Invalid webhook payload: expected an array of events',
      );
    }

    const event = firstEvent as Record<string, unknown>;
    const data = event['data'];

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new BadRequestException('Webhook event missing data field');
    }

    const id = (data as Record<string, unknown>)['id'];
    if (typeof id !== 'string' || !id.trim()) {
      throw new BadRequestException(
        'Webhook event missing document ID in data.id',
      );
    }

    return id.trim();
  }

  private async fetchDocumentFields(
    documentId: string,
  ): Promise<Record<string, unknown>> {
    const apiKey = this.configService.get<string>('PANDADOC_API_KEY');
    if (!apiKey) {
      this.logger.error('[PandaDoc] PANDADOC_API_KEY is not configured');
      throw new InternalServerErrorException(
        'PandaDoc API key is not configured',
      );
    }

    this.logger.debug(
      `[PandaDoc] Fetching fields from API documentId=${documentId}`,
    );

    const response = await axios.get<{
      fields: Array<{
        field_id: string;
        value: unknown;
        assigned_to?: {
          email?: string;
          phone?: string;
          first_name?: string;
          last_name?: string;
        };
      }>;
    }>(`${PANDADOC_API_BASE}/documents/${documentId}/fields`, {
      headers: { Authorization: `API-Key ${apiKey}` },
    });

    const fields = response.data?.fields ?? [];
    this.logger.debug(
      `[PandaDoc] API returned ${fields.length} fields for documentId=${documentId}`,
    );

    const result = Object.fromEntries(fields.map((f) => [f.field_id, f.value]));

    this.logger.log(
      `[PandaDoc] Raw Volunteer_Affiliation from API: "${result['Volunteer_Affiliation']}"`,
    );

    // Email, phone, and name are not form fields — inject from recipient assigned_to.
    // PandaDoc populates these depending on how the doc was sent.
    const recipient = fields[0]?.assigned_to;
    if (!result['email'] && recipient?.email) {
      result['email'] = recipient.email;
      this.logger.debug(`[PandaDoc] Injected email from recipient assigned_to`);
    }
    if (!result['Volunteer_Phone'] && recipient?.phone) {
      result['Volunteer_Phone'] = recipient.phone;
      this.logger.debug(`[PandaDoc] Injected phone from recipient assigned_to`);
    }
    if (recipient?.first_name) {
      result['_firstName'] = recipient.first_name.trim();
      this.logger.debug(
        `[PandaDoc] Injected firstName from recipient assigned_to`,
      );
    }
    if (recipient?.last_name) {
      result['_lastName'] = recipient.last_name.trim();
      this.logger.debug(
        `[PandaDoc] Injected lastName from recipient assigned_to`,
      );
    }

    // Resume and cover letter each have two upload slots (*1 = supervisor, *2 = applicant).
    // Coalesce so the mapper always sees the value regardless of which slot was used.
    const isEmpty = (v: unknown) =>
      !v || (typeof v === 'object' && Object.keys(v as object).length === 0);
    if (isEmpty(result['Volunteer_ResumeUpload2'])) {
      result['Volunteer_ResumeUpload2'] = result['Volunteer_ResumeUpload1'];
    }
    if (isEmpty(result['Volunteer_CoverletterUpload2'])) {
      result['Volunteer_CoverletterUpload2'] =
        result['Volunteer_CoverletterUpload1'];
    }

    await this.uploadPandaDocFiles(result, apiKey);

    return result;
  }

  /**
   * Process a flat PandaDoc field map: map fields into persistence buckets and
   * create all three records inside a single transaction.
   *
   * @param payload Flat field id -> value record (e.g. from the PandaDoc fields API)
   * @returns Object containing the created appId
   */
  async processWebhook(
    payload: Record<string, unknown>,
  ): Promise<{ appId: number }> {
    const startedAt = Date.now();
    const payloadKeys = Object.keys(payload ?? {});
    let applicationDto: CreateApplicationDto | undefined;
    const eventType = this.getPayloadString(payload, 'event') ?? 'unknown';
    const documentId =
      this.getPayloadString(payload, 'document_id') ??
      this.getPayloadString(payload, 'id') ??
      'unknown';

    this.logger.log(
      `[PandaDoc] Received webhook payload event=${eventType} documentId=${documentId} payloadFieldCount=${payloadKeys.length}`,
    );
    this.logger.debug(
      `[PandaDoc] Incoming payload key sample: ${
        payloadKeys.slice(0, 30).join(', ') || 'none'
      }`,
    );

    try {
      this.logger.debug(
        '[PandaDoc] Mapping webhook payload into persistence buckets',
      );
      let buckets: ReturnType<typeof pandadocMapper>;
      try {
        buckets = pandadocMapper(payload);
      } catch (mapErr) {
        const msg = mapErr instanceof Error ? mapErr.message : String(mapErr);
        if (msg.startsWith('Missing required PandaDoc fields')) {
          throw new BadRequestException(msg);
        }
        throw mapErr;
      }
      this.logger.log(
        `[PandaDoc] Mapped payload into buckets: application(${
          Object.keys(buckets.application).length
        } fields), candidateInfo(${
          Object.keys(buckets.candidateInfo).length
        } fields), learnerInfo(${
          Object.keys(buckets.learnerInfo).length
        } fields)`,
      );

      const rawAffiliation = payload['Volunteer_Affiliation'];
      const mappedSchool = buckets.learnerInfo['school'];
      const isDoesNotApply = mappedSchool === School.DOES_NOT_APPLY;
      const applicantType =
        mappedSchool && !isDoesNotApply
          ? ApplicantType.LEARNER
          : ApplicantType.VOLUNTEER;

      this.logger.log(
        `[PandaDoc] Applicant type determination:` +
          ` rawAffiliation="${rawAffiliation}"` +
          ` mappedSchool="${mappedSchool}"` +
          ` isDoesNotApply=${isDoesNotApply}` +
          ` applicantType=${applicantType}`,
      );

      const applicationData = {
        ...buckets.application,
        appStatus: AppStatus.APP_SUBMITTED,
        applicantType,
        proposedStartDate: this.formatDate(
          buckets.application['proposedStartDate'],
        ),
        endDate: this.formatDate(buckets.application['endDate']),
      };
      applicationDto = applicationData as CreateApplicationDto;
      const applicationRecord = applicationData as Record<string, unknown>;

      this.logger.debug(
        `[PandaDoc] Prepared application record applicantType=${applicantType} phoneMask=${this.maskPhone(
          applicationRecord['phone'],
        )}`,
      );
      this.validatePhone(applicationRecord['phone']);

      const learnerData = {
        ...(buckets.learnerInfo as Record<string, unknown>),
        dateOfBirth: this.formatDate(buckets.learnerInfo['dateOfBirth']),
      };
      const learnerRecord = learnerData as Record<string, unknown>;

      const email = String(buckets.candidateInfo['email'] ?? '');
      const normalizedEmail = email.trim();
      const candidateFirstName =
        this.getPayloadString(payload, '_firstName') ??
        this.getPayloadString(payload, 'Volunteer_FirstName') ??
        this.getPayloadString(payload, 'firstName');
      const candidateLastName =
        this.getPayloadString(payload, '_lastName') ??
        this.getPayloadString(payload, 'Volunteer_LastName') ??
        this.getPayloadString(payload, 'lastName');
      if (!normalizedEmail) {
        this.logger.warn(
          `[PandaDoc] Candidate email missing after mapping event=${eventType} documentId=${documentId}`,
        );
        throw new BadRequestException(
          'Webhook payload missing applicant email',
        );
      }

      this.logger.log(
        `[PandaDoc] Delegating application creation emailMask=${this.maskEmail(
          normalizedEmail,
        )} applicantType=${applicantType}`,
      );

      const candidateName =
        candidateFirstName || candidateLastName
          ? {
              firstName: candidateFirstName,
              lastName: candidateLastName,
            }
          : undefined;

      const createdApplication = candidateName
        ? await this.applicationsService.create(applicationDto, {
            candidateName,
          })
        : await this.applicationsService.create(applicationDto);

      this.logger.debug(
        `[PandaDoc] ApplicationsService.create complete appId=${createdApplication.appId}`,
      );

      if (
        learnerRecord['school'] &&
        learnerRecord['school'] !== School.DOES_NOT_APPLY
      ) {
        this.logger.debug(
          `[PandaDoc] Delegating learner info creation appId=${
            createdApplication.appId
          } learnerFieldCount=${Object.keys(learnerData).length}`,
        );
        const learnerCreateData = learnerData as unknown as Omit<
          CreateLearnerInfoDto,
          'appId'
        >;
        await this.learnerInfoService.create({
          ...learnerCreateData,
          appId: createdApplication.appId,
        });
        this.logger.debug(
          `[PandaDoc] LearnerInfoService.create complete appId=${createdApplication.appId}`,
        );
      }

      this.logger.log(
        `[PandaDoc] Webhook processing complete appId=${
          createdApplication.appId
        } durationMs=${Date.now() - startedAt}`,
      );
      return { appId: createdApplication.appId };
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const message = error instanceof Error ? error.message : String(error);

      if (error instanceof BadRequestException) {
        if (applicationDto) {
          try {
            await this.applicationsService.sendSubmissionErrorEmail(
              applicationDto,
              message,
            );
          } catch (emailError) {
            this.logger.error(
              `[PandaDoc] Failed to send invalid-submission email event=${eventType} documentId=${documentId}`,
              emailError instanceof Error
                ? emailError.stack
                : String(emailError),
            );
          }
        }
        this.logger.warn(
          `[PandaDoc] Webhook rejected event=${eventType} documentId=${documentId} durationMs=${durationMs} reason=${message}`,
        );
      } else if (error instanceof Error) {
        this.logger.error(
          `[PandaDoc] Webhook processing failed event=${eventType} documentId=${documentId} durationMs=${durationMs} error=${message}`,
          error.stack,
        );
      } else {
        this.logger.error(
          `[PandaDoc] Webhook processing failed event=${eventType} documentId=${documentId} durationMs=${durationMs} error=${message}`,
        );
      }

      throw error;
    }
  }

  private validatePhone(phone: unknown): void {
    if (typeof phone !== 'string' || phone === '') return;
    if (!PHONE_REGEX.test(phone)) {
      this.logger.warn(
        `[PandaDoc] Phone validation failed phoneMask=${this.maskPhone(phone)}`,
      );
      throw new BadRequestException(
        'Phone number must be in ###-###-#### format',
      );
    }

    this.logger.debug(
      `[PandaDoc] Phone validation passed phoneMask=${this.maskPhone(phone)}`,
    );
  }
}
