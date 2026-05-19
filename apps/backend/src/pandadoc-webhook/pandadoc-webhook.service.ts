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
    this.logger.log('[PandaDoc] Received webhook payload');

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

    const applicationData = {
      ...buckets.application,
      appStatus: AppStatus.APP_SUBMITTED,
      applicantType: buckets.learnerInfo['schoolDepartment']
        ? ApplicantType.LEARNER
        : ApplicantType.VOLUNTEER,
      proposedStartDate: this.formatDate(
        buckets.application['proposedStartDate'],
      ),
      endDate: this.formatDate(buckets.application['endDate']),
    };
    this.validatePhone(applicationData['phone']);

    const learnerData = {
      ...buckets.learnerInfo,
      dateOfBirth: this.formatDate(buckets.learnerInfo['dateOfBirth']),
    };

    const email = String(buckets.candidateInfo['email'] ?? '');
    if (!email.trim()) {
      throw new BadRequestException('Webhook payload missing applicant email');
    }

    this.logger.log(`[PandaDoc] Creating application for email=${email}`);

    const appId = await this.dataSource.transaction(
      async (em: EntityManager) => {
        const application = em.create(Application, applicationData);
        const saved = await em.save(application);

        const candidate = em.create(CandidateInfo, {
          appId: saved.appId,
          email: email.trim(),
        });
        await em.save(candidate);

        const learner = em.create(LearnerInfo, {
          ...learnerData,
          appId: saved.appId,
        });
        await em.save(learner);

        return saved.appId;
      },
    );

    this.logger.log(
      `[PandaDoc] Webhook processing complete for appId=${appId}`,
    );
    return { appId };
  }

  private validatePhone(phone: unknown): void {
    if (typeof phone !== 'string' || !PHONE_REGEX.test(phone)) {
      throw new BadRequestException(
        'Phone number must be in ###-###-#### format',
      );
    }
  }
}
