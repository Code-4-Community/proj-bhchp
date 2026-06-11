import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import axios from 'axios';

const PANDADOC_API_BASE = 'https://api.pandadoc.com/public/v1';
const DOCUMENT_COMPLETED_STATUS = 'document.completed';
import { DataSource, EntityManager } from 'typeorm';
import { pandadocMapper } from '../pandadoc-helpers/pandadoc-mapper';
import { AppStatus, ApplicantType, PHONE_REGEX } from '../applications/types';
import { Application } from '../applications/application.entity';
import { CandidateInfo } from '../candidate-info/candidate-info.entity';
import { LearnerInfo } from '../learner-info/learner-info.entity';

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
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
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

  private maskValue(value: unknown): string {
    if (value == null) return 'null';
    if (typeof value !== 'string') return String(value);
    const s = value.trim();
    if (s.includes('@')) {
      const [local, domain] = s.split('@');
      return `${local.slice(0, 1)}***@${domain}`;
    }
    if (s.length <= 4) return '***';
    return `${s.slice(0, 2)}***${s.slice(-2)}`;
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

  /**
   * Fetch the filled form field values for a completed PandaDoc document.
   * Returns a flat `{fieldName: value}` record suitable for `pandadocMapper`.
   */
  private async fetchDocumentFields(
    documentId: string,
    apiKey: string,
  ): Promise<Record<string, unknown>> {
    const url = `${PANDADOC_API_BASE}/documents/${documentId}/fields`;
    const started = Date.now();
    this.logger.debug(
      `[PandaDoc] Fetching document fields documentId=${documentId} url=${url}`,
    );

    try {
      const response = await axios.get<{
        fields: Array<{ name: string; value: unknown }>;
      }>(url, {
        headers: { Authorization: `API-Key ${apiKey}` },
        timeout: 10_000,
      });

      const elapsed = Date.now() - started;
      const fields = response.data?.fields ?? [];
      const flat: Record<string, unknown> = {};
      for (const field of fields) {
        if (typeof field.name === 'string') {
          flat[field.name] = field.value ?? null;
        }
      }

      this.logger.log(
        `[PandaDoc] Fetched document fields documentId=${documentId} count=${
          Object.keys(flat).length
        } status=${response.status} durationMs=${elapsed}`,
      );
      this.logger.debug(
        `[PandaDoc] Field name sample: ${
          Object.keys(flat).slice(0, 20).join(', ') || 'none'
        }`,
      );
      return flat;
    } catch (error) {
      const elapsed = Date.now() - started;
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[PandaDoc] Error fetching document fields documentId=${documentId} durationMs=${elapsed} error=${msg}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Process a raw PandaDoc webhook event envelope, fetch the document's form
   * field values via the PandaDoc API, then persist the application records.
   *
   * PandaDoc sends an array: `[{event, data: {id, status, ...}}]`. Only
   * `document.completed` events are processed; others are acknowledged with
   * `appId: null` so PandaDoc does not retry.
   */
  async processWebhook(body: unknown): Promise<{ appId: number | null }> {
    const startedAt = Date.now();

    // Unwrap the PandaDoc event envelope array.
    const events = Array.isArray(body) ? body : [body];
    const first = events[0] as Record<string, unknown> | undefined;

    if (!first || typeof first !== 'object') {
      this.logger.warn('[PandaDoc] Received malformed webhook body');
      throw new BadRequestException('Malformed webhook payload');
    }

    const eventType =
      typeof first['event'] === 'string' ? first['event'] : 'unknown';
    const data =
      first['data'] != null && typeof first['data'] === 'object'
        ? (first['data'] as Record<string, unknown>)
        : {};
    const documentId = typeof data['id'] === 'string' ? data['id'] : undefined;
    const documentStatus =
      typeof data['status'] === 'string' ? data['status'] : 'unknown';

    this.logger.log(
      `[PandaDoc] Received webhook event=${eventType} documentId=${
        documentId ?? 'unknown'
      } status=${documentStatus}`,
    );

    if (documentStatus !== DOCUMENT_COMPLETED_STATUS) {
      this.logger.log(
        `[PandaDoc] Skipping event=${eventType} status=${documentStatus} — only processing ${DOCUMENT_COMPLETED_STATUS}`,
      );
      return { appId: null };
    }

    if (!documentId) {
      this.logger.warn(
        `[PandaDoc] Missing document ID in completed event event=${eventType}`,
      );
      throw new BadRequestException('Webhook payload missing document ID');
    }

    const apiKey = this.configService.get<string>('PANDADOC_API_KEY');
    if (!apiKey) {
      this.logger.error('[PandaDoc] PANDADOC_API_KEY is not configured');
      throw new Error('PANDADOC_API_KEY is not configured');
    }

    this.logger.log(`[PandaDoc] Fetching form fields documentId=${documentId}`);
    let fields: Record<string, unknown>;
    try {
      fields = await this.fetchDocumentFields(documentId, apiKey);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[PandaDoc] Failed to fetch document fields documentId=${documentId} error=${message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }

    this.logger.log(
      `[PandaDoc] Fetched ${
        Object.keys(fields).length
      } form fields for documentId=${documentId}`,
    );

    try {
      return await this.createApplication(
        fields,
        eventType,
        documentId,
        startedAt,
      );
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const message = error instanceof Error ? error.message : String(error);
      if (error instanceof BadRequestException) {
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

  private async createApplication(
    payload: Record<string, unknown>,
    eventType: string,
    documentId: string,
    startedAt: number,
  ): Promise<{ appId: number }> {
    this.logger.debug(
      `[PandaDoc] Mapping form fields into persistence buckets fieldCount=${
        Object.keys(payload).length
      }`,
    );

    const buckets = pandadocMapper(payload);
    this.logger.log(
      `[PandaDoc] Mapped payload into buckets: application(${
        Object.keys(buckets.application).length
      } fields), candidateInfo(${
        Object.keys(buckets.candidateInfo).length
      } fields), learnerInfo(${
        Object.keys(buckets.learnerInfo).length
      } fields)`,
    );

    // Log small masked samples of each bucket to aid debugging without leaking PII
    try {
      const sample = (obj: Record<string, unknown>) =>
        Object.entries(obj)
          .slice(0, 5)
          .map(([k, v]) => `${k}=${this.maskValue(v)}`)
          .join(', ');
      this.logger.debug(
        `[PandaDoc] Bucket samples application=[${sample(
          buckets.application,
        )}] candidateInfo=[${sample(
          buckets.candidateInfo,
        )}] learnerInfo=[${sample(buckets.learnerInfo)}]`,
      );
    } catch (e) {
      /* ignore sample failures */
    }

    const applicantType = buckets.learnerInfo['schoolDepartment']
      ? ApplicantType.LEARNER
      : ApplicantType.VOLUNTEER;

    const applicationData = {
      ...buckets.application,
      appStatus: AppStatus.APP_SUBMITTED,
      applicantType,
      proposedStartDate: this.formatDate(
        buckets.application['proposedStartDate'],
      ),
      endDate: this.formatDate(buckets.application['endDate']),
    };
    const applicationRecord = applicationData as Record<string, unknown>;

    this.logger.debug(
      `[PandaDoc] Prepared application record applicantType=${applicantType} phoneMask=${this.maskPhone(
        applicationRecord['phone'],
      )}`,
    );
    this.validatePhone(applicationRecord['phone']);

    const learnerData = {
      ...buckets.learnerInfo,
      dateOfBirth: this.formatDate(buckets.learnerInfo['dateOfBirth']),
    };

    const email = String(buckets.candidateInfo['email'] ?? '');
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      this.logger.warn(
        `[PandaDoc] Candidate email missing after mapping event=${eventType} documentId=${documentId}`,
      );
      throw new BadRequestException('Webhook payload missing applicant email');
    }

    this.logger.log(
      `[PandaDoc] Creating application transaction emailMask=${this.maskEmail(
        normalizedEmail,
      )} applicantType=${applicantType}`,
    );

    const appId = await this.dataSource.transaction(
      async (em: EntityManager) => {
        this.logger.debug('[PandaDoc] Transaction started');

        this.logger.debug('[PandaDoc] Persisting Application entity');
        const application = em.create(Application, applicationData);
        const appStart = Date.now();
        const saved = await em.save(application);
        const appSaveMs = Date.now() - appStart;
        this.logger.log(
          `[PandaDoc] Application saved appId=${saved.appId} durationMs=${appSaveMs}`,
        );

        this.logger.debug(
          `[PandaDoc] Persisting CandidateInfo entity appId=${
            saved.appId
          } emailMask=${this.maskEmail(normalizedEmail)}`,
        );
        const candStart = Date.now();
        const candidate = em.create(CandidateInfo, {
          appId: saved.appId,
          email: normalizedEmail,
        });
        await em.save(candidate);
        const candSaveMs = Date.now() - candStart;
        this.logger.log(
          `[PandaDoc] CandidateInfo saved appId=${saved.appId} durationMs=${candSaveMs}`,
        );

        this.logger.debug(
          `[PandaDoc] Persisting LearnerInfo entity appId=${
            saved.appId
          } learnerFieldCount=${Object.keys(learnerData).length}`,
        );
        const learnerStart = Date.now();
        const learner = em.create(LearnerInfo, {
          ...learnerData,
          appId: saved.appId,
        });
        await em.save(learner);
        const learnerSaveMs = Date.now() - learnerStart;
        this.logger.log(
          `[PandaDoc] LearnerInfo saved appId=${saved.appId} durationMs=${learnerSaveMs}`,
        );

        this.logger.debug(
          `[PandaDoc] Transaction complete appId=${saved.appId}`,
        );
        return saved.appId;
      },
    );

    this.logger.log(
      `[PandaDoc] Webhook processing complete appId=${appId} durationMs=${
        Date.now() - startedAt
      }`,
    );
    return { appId };
  }

  private validatePhone(phone: unknown): void {
    if (typeof phone !== 'string' || !PHONE_REGEX.test(phone)) {
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
