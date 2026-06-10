import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
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

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

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

  /**
   * Process a PandaDoc webhook payload: map fields, create all three
   * records inside a single transaction.
   *
   * @param payload Raw PandaDoc webhook body (flat field id -> value record)
   * @returns Object containing the created appId
   */
  async processWebhook(
    payload: Record<string, unknown>,
  ): Promise<{ appId: number }> {
    const startedAt = Date.now();
    const payloadKeys = Object.keys(payload ?? {});
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

      this.logger.debug(
        `[PandaDoc] Prepared application record applicantType=${applicantType} phoneMask=${this.maskPhone(
          applicationData['phone'],
        )}`,
      );
      this.validatePhone(applicationData['phone']);

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
        throw new BadRequestException(
          'Webhook payload missing applicant email',
        );
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
          const saved = await em.save(application);
          this.logger.debug(
            `[PandaDoc] Application saved appId=${saved.appId}`,
          );

          this.logger.debug(
            `[PandaDoc] Persisting CandidateInfo entity appId=${
              saved.appId
            } emailMask=${this.maskEmail(normalizedEmail)}`,
          );
          const candidate = em.create(CandidateInfo, {
            appId: saved.appId,
            email: normalizedEmail,
          });
          await em.save(candidate);
          this.logger.debug(
            `[PandaDoc] CandidateInfo saved appId=${saved.appId}`,
          );

          this.logger.debug(
            `[PandaDoc] Persisting LearnerInfo entity appId=${
              saved.appId
            } learnerFieldCount=${Object.keys(learnerData).length}`,
          );
          const learner = em.create(LearnerInfo, {
            ...learnerData,
            appId: saved.appId,
          });
          await em.save(learner);
          this.logger.debug(
            `[PandaDoc] LearnerInfo saved appId=${saved.appId}`,
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
