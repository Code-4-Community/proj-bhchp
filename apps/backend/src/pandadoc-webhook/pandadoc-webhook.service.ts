import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ApplicationsService } from '../applications/applications.service';
import { CandidateInfoService } from '../candidate-info/candidate-info.service';
import { LearnerInfoService } from '../learner-info/learner-info.service';
import { pandadocMapper } from '../pandadoc-helpers/pandadoc-mapper';
import { AppStatus, ApplicantType } from '../applications/types';
import { CreateApplicationDto } from '../applications/dto/create-application.request.dto';
import { CreateLearnerInfoDto } from '../learner-info/dto/create-learner-info.request.dto';

/**
 * Orchestrates creation of Application, CandidateInfo, and LearnerInfo
 * records from a PandaDoc webhook payload.
 */
@Injectable()
export class PandadocWebhookService {
  private readonly logger = new Logger(PandadocWebhookService.name);

  constructor(
    private readonly applicationsService: ApplicationsService,
    private readonly candidateInfoService: CandidateInfoService,
    private readonly learnerInfoService: LearnerInfoService,
  ) {}

  /**
   * Formats a Date object into a YYYY-MM-DD string.
   * Returns the value as-is if it is already a string.
   */
  private formatDate(value: unknown): string | undefined {
    if (value == null) return undefined;
    if (typeof value === 'string') return value;
    if (value instanceof Date) {
      const yyyy = value.getFullYear();
      const mm = String(value.getMonth() + 1).padStart(2, '0');
      const dd = String(value.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return String(value);
  }

  /**
   * Process a PandaDoc webhook payload: map fields, create all three records.
   *
   * @param payload - Raw PandaDoc webhook body (flat field id -> value record)
   * @returns Object containing the created appId
   */
  async processWebhook(
    payload: Record<string, unknown>,
  ): Promise<{ appId: number }> {
    this.logger.log('[PandaDoc] Received webhook payload');

    // Run the raw payload through the field mapper
    const buckets = pandadocMapper(payload);
    this.logger.log(
      `[PandaDoc] Mapped payload into buckets: application(${
        Object.keys(buckets.application).length
      } fields), ` +
        `candidateInfo(${Object.keys(buckets.candidateInfo).length} fields), ` +
        `learnerInfo(${Object.keys(buckets.learnerInfo).length} fields)`,
    );

    // Set defaults for fields the mapper does not produce
    buckets.application['appStatus'] = AppStatus.APP_SUBMITTED;

    // Derive applicantType: if schoolDepartment is present, it's a learner
    buckets.application['applicantType'] = buckets.learnerInfo[
      'schoolDepartment'
    ]
      ? ApplicantType.LEARNER
      : ApplicantType.VOLUNTEER;

    // Convert Date objects to YYYY-MM-DD strings for DTO validation
    if (buckets.application['proposedStartDate']) {
      buckets.application['proposedStartDate'] = this.formatDate(
        buckets.application['proposedStartDate'],
      );
    }
    if (buckets.application['endDate']) {
      buckets.application['endDate'] = this.formatDate(
        buckets.application['endDate'],
      );
    }
    if (buckets.learnerInfo['dateOfBirth']) {
      buckets.learnerInfo['dateOfBirth'] = this.formatDate(
        buckets.learnerInfo['dateOfBirth'],
      );
    }

    this.logger.log(
      `[PandaDoc] Creating application for email=${buckets.application['email']}`,
    );

    // 1. Create Application (generates appId)
    const application = await this.applicationsService.create(
      buckets.application as unknown as CreateApplicationDto,
    );
    const { appId } = application;
    this.logger.log(`[PandaDoc] Application created with appId=${appId}`);

    // 2. Create CandidateInfo
    const email = String(buckets.candidateInfo['email'] ?? '');
    await this.candidateInfoService.create(appId, email);
    this.logger.log(`[PandaDoc] CandidateInfo created for appId=${appId}`);

    // 3. Create LearnerInfo
    const learnerDto = {
      ...buckets.learnerInfo,
      appId,
    } as unknown as CreateLearnerInfoDto;
    await this.learnerInfoService.create(learnerDto);
    this.logger.log(`[PandaDoc] LearnerInfo created for appId=${appId}`);

    this.logger.log(
      `[PandaDoc] Webhook processing complete for appId=${appId}`,
    );
    return { appId };
  }
}
