import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Application } from './application.entity';
import { CreateApplicationDto } from './dto/create-application.request.dto';
import { AppStatus, PHONE_REGEX } from './types';
import { EmailService } from '../util/email/email.service';
import { UsersService } from '../users/users.service';
import { CandidateInfoService } from '../candidate-info/candidate-info.service';
import { AWSS3Service } from '../util/aws-s3/aws-s3.service';
import { DisciplinesService } from '../disciplines/disciplines.service';

const STATUS_EMAIL_SUBJECTS: Partial<Record<AppStatus, string>> = {
  [AppStatus.ACCEPTED]: 'Your Application Has Been Updated',
  [AppStatus.DECLINED]: 'Your Application Has Been Updated',
  [AppStatus.NO_AVAILABILITY]: 'Your Application Has Been Updated',
};

const buildEmailBody = (
  appStatus: AppStatus,
  name: string,
): string | undefined => {
  const greeting = `Hello ${name},<br><br>`;
  switch (appStatus) {
    case AppStatus.ACCEPTED:
      return `${greeting}Congratulations! Your application has been accepted. Please complete your forms in the MyForms tab on your applicant portal.<br><br>Thank you,<br>BHCHP Team`;
    case AppStatus.DECLINED:
      return `${greeting}We regret to inform you that your application has not been accepted at this time.<br><br>Thank you,<br>BHCHP Team`;
    case AppStatus.NO_AVAILABILITY:
      return `${greeting}We wanted to inform you that there is currently no availability at this time.<br><br>Thank you,<br>BHCHP Team`;
    default:
      return undefined;
  }
};

/**
 * Escapes characters that have special meaning in HTML so a string is safe to embed in text or attributes.
 *
 * @param text Raw string that may contain `&`, `<`, `>`, or `"`.
 * @returns The same content with those characters replaced by entity references (`&amp;`, `&lt;`, `&gt;`, `&quot;`).
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
/**
 * Service for applications that interfaces with the application repository.
 */
@Injectable()
export class ApplicationsService {
  private static readonly CONFIDENTIALITY_TEMPLATE_FILE =
    'Confidentiality_Form.pdf';
  private static readonly CONFIDENTIALITY_UPLOAD_FOLDER =
    'confidentiality-forms';

  constructor(
    @InjectRepository(Application)
    private applicationRepository: Repository<Application>,
    private emailService: EmailService,
    private usersService: UsersService,
    private candidateInfoService: CandidateInfoService,
    private awsS3Service: AWSS3Service,
    private disciplinesService: DisciplinesService,
  ) {}

  /**
   * Ensures the application is in a status allowed to upload a confidentiality form.
   * @param application the application being checked.
   * @throws {ForbiddenException} if the current status is not upload-eligible.
   */
  private ensureCanUploadConfidentialityForm(application: Application): void {
    const allowedStatuses = [AppStatus.ACCEPTED, AppStatus.FORMS_SIGNED];

    if (!allowedStatuses.includes(application.appStatus)) {
      throw new ForbiddenException(
        'Only accepted or forms-signed applicants can upload confidentiality forms.',
      );
    }
  }

  /**
   * Ensures the application is in a status allowed to download a confidentiality form.
   * @param application the application being checked.
   * @throws {ForbiddenException} if the current status is not download-eligible.
   */
  private ensureCanDownloadConfidentialityForm(application: Application): void {
    const allowedStatuses = [AppStatus.ACTIVE, AppStatus.INACTIVE];

    if (!allowedStatuses.includes(application.appStatus)) {
      throw new ForbiddenException(
        'Only active or inactive applicants can download confidentiality forms.',
      );
    }
  }

  /**
   * Resolves the current user's application through candidate_info.
   * @param email the user's email.
   * @returns the corresponding application record.
   * @throws {NotFoundException} if candidate info or application cannot be found.
   */
  private async findCurrentUserApplication(
    email: string,
  ): Promise<Application> {
    const candidateInfo = await this.candidateInfoService.findOne(email);
    return this.findById(candidateInfo.appId);
  }

  /**
   * Returns a signed URL for the confidentiality-form template.
   * @returns object containing the template URL.
   */
  async getConfidentialityTemplateUrl(): Promise<{ templateUrl: string }> {
    return {
      templateUrl: this.awsS3Service.createObjectLink(
        ApplicationsService.CONFIDENTIALITY_TEMPLATE_FILE,
      ),
    };
  }

  /**
   * Returns the current user's uploaded confidentiality form metadata.
   * @param email the current user's email.
   * @returns form metadata if present, otherwise null.
   * @throws {ForbiddenException} if the user's application status cannot download forms.
   * @throws {NotFoundException} if the user has no application.
   */
  async getConfidentialityForm(email: string): Promise<{
    fileName: string;
    fileUrl: string;
  } | null> {
    const application = await this.findCurrentUserApplication(email);
    this.ensureCanDownloadConfidentialityForm(application);

    if (!application.confidentialityForm) {
      return null;
    }

    return {
      fileName: application.confidentialityForm,
      fileUrl: this.awsS3Service.createObjectLink(
        application.confidentialityForm,
      ),
    };
  }

  /**
   * Uploads and persists a confidentiality form for the current user.
   * @param email the current user's email.
   * @param file uploaded file payload.
   * @returns uploaded form metadata and the updated application status.
   * @throws {ForbiddenException} if the user's application status cannot upload forms.
   * @throws {NotFoundException} if the user has no application.
   * @throws {Error} anything thrown by S3 upload or repository save.
   */
  async uploadConfidentialityForm(
    email: string,
    file: { buffer: Buffer; mimetype: string },
  ): Promise<{ fileName: string; fileUrl: string; appStatus: AppStatus }> {
    const application = await this.findCurrentUserApplication(email);
    this.ensureCanUploadConfidentialityForm(application);

    const uploadBaseName = `${ApplicationsService.CONFIDENTIALITY_UPLOAD_FOLDER}/${application.appId}_confidentiality.pdf`;
    const uploadResult = await this.awsS3Service.uploadWithKey(
      file.buffer,
      uploadBaseName,
      file.mimetype,
    );

    application.confidentialityForm = uploadResult.key;
    application.appStatus = AppStatus.FORMS_SIGNED;

    await this.applicationRepository.save(application);

    return {
      fileName: uploadResult.key,
      fileUrl: uploadResult.url,
      appStatus: application.appStatus,
    };
  }

  /**
   * Validates the fields of a CreateApplicationDto.
   * @param dto The DTO to validate.
   * @throws {BadRequestException} if any field fails validation.
   */
  private validateApplicationDto(dto: CreateApplicationDto): void {
    // Validate phone number format
    if (!PHONE_REGEX.test(dto.phone)) {
      throw new BadRequestException(
        'Phone number must be in ###-###-#### format',
      );
    }

    // Validate weeklyHours is positive
    if (dto.weeklyHours <= 0 || dto.weeklyHours > 7 * 24) {
      throw new BadRequestException(
        'Weekly hours must be greater than 0 and less than 7 * 24 hours',
      );
    }
  }

  /**
   * Returns all applications in the repository.
   * @returns A promise resolving to all applications in the repository.
   * @throws {Error} which is unchanged from what repository throws.
   */
  async findAll(): Promise<Application[]> {
    return await this.applicationRepository.find();
  }

  /**
   * Returns the total number of applications.
   * @returns A promise resolving to the total number of applications.
   */
  async countAll(): Promise<number> {
    return await this.applicationRepository.count();
  }

  /**
   * Returns the number of applications in review.
   * @returns A promise resolving to the count for AppStatus.IN_REVIEW.
   */
  async countInReview(): Promise<number> {
    return await this.applicationRepository.count({
      where: { appStatus: AppStatus.IN_REVIEW },
    });
  }

  /**
   * Returns the number of rejected applications.
   * @returns A promise resolving to the count for declined applications.
   */
  async countRejected(): Promise<number> {
    return await this.applicationRepository.count({
      where: { appStatus: AppStatus.DECLINED },
    });
  }

  /**
   * Returns the number of approved/active applications.
   * @returns A promise resolving to the count for accepted or active applications.
   */
  async countApprovedOrActive(): Promise<number> {
    return await this.applicationRepository.count({
      where: { appStatus: In([AppStatus.ACCEPTED, AppStatus.ACTIVE]) },
    });
  }

  /**
   * Returns an application by id from the repository.
   * @param appId The desired application id to search for.
   * @returns A promise resolving to the application with that id.
   * @throws {NotFoundException} with message 'Application with ID <id> not found'
   *         if an application with that id does not exist.
   * @throws {Error} which is unchanged from what repository throws.
   */
  async findById(appId: number): Promise<Application> {
    const application = await this.applicationRepository.findOne({
      where: { appId },
    });

    if (!application) {
      throw new NotFoundException(`Application with ID ${appId} not found`);
    }

    return application;
  }

  /**
   * Validates an application discipline key against the active discipline catalog.
   * @param discipline the discipline key to validate.
   * @throws {BadRequestException} if the discipline is invalid or inactive.
   */
  private async validateDiscipline(discipline: string): Promise<string> {
    const normalized = discipline.trim().toLowerCase();
    await this.disciplinesService.ensureActiveDisciplineKey(normalized);
    return normalized;
  }

  /**
   * Returns all applications that have the specified discipline.
   * @param discipline The discipline to filter applications by.
   * @returns A promise resolving to an array of applications with the specified discipline.
   *          Returns an empty array if no applications match the discipline.
   * @throws {BadRequestException} if the discipline key does not exist in the active discipline catalog.
   * @throws {Error} which is unchanged from what repository throws.
   */
  async findByDiscipline(discipline: string): Promise<Application[]> {
    const normalizedDiscipline = await this.validateDiscipline(discipline);
    return await this.applicationRepository.find({
      where: { discipline: normalizedDiscipline },
    });
  }

  /**
   * Returns applications that belong to any of the provided disciplines.
   * @param disciplines discipline keys to filter by.
   * @returns matching applications across all provided disciplines.
   * @throws {BadRequestException} if no disciplines are provided or keys are invalid/inactive.
   * @throws {Error} anything that the repository throws.
   */
  async findByDisciplines(disciplines: string[]): Promise<Application[]> {
    const uniqueDisciplines = [
      ...new Set(
        disciplines
          .map((discipline) => discipline.trim().toLowerCase())
          .filter(Boolean),
      ),
    ];

    if (!uniqueDisciplines.length) {
      throw new BadRequestException('At least one discipline must be provided');
    }

    await this.disciplinesService.ensureActiveDisciplineKeys(uniqueDisciplines);

    return this.applicationRepository.find({
      where: { discipline: In(uniqueDisciplines) },
    });
  }

  /**
   * Creates an application in the repository.
   * @param createApplicationDto The expected data required to create an application (applicant's info).
   * @returns The newly created application.
   * @throws {BadRequestException} if validation fails.
   * @throws {Error} which is unchanged from what repository throws.
   */
  async create(
    createApplicationDto: CreateApplicationDto,
  ): Promise<Application> {
    this.validateApplicationDto(createApplicationDto);
    const normalizedDiscipline = await this.validateDiscipline(
      createApplicationDto.discipline,
    );
    const application = this.applicationRepository.create({
      ...createApplicationDto,
      discipline: normalizedDiscipline,
    });
    const saved = await this.applicationRepository.save(application);

    const name = String(saved.email).split('@')[0];
    const applicantName = name
      .split('.')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    const emailBody = `<p>Hello ${applicantName},</p>

      <p>Thank you for submitting your application! You can now create an account here on the portal to track your status. Please use the same name and email as your application.</p>

      <p>Thank you,<br/>BHCHP</p>`;

    await this.emailService.queueEmail(
      saved.email,
      'Your Application Has Been Received',
      emailBody,
    );

    return saved;
  }

  /**
   * Updates the status of the application in the repository.
   * @param appId The id of the application to update.
   * @param updateData Object containing the desired new application status.
   * @returns The updated application object.
   * @throws {NotFoundException} with message 'Application with ID <id> not found'
   *         if the application does not exist.
   * @throws {Error} which is unchanged from what repository throws.
   */
  async update(
    appId: number,
    updateData: Partial<Application>,
  ): Promise<Application> {
    const application = await this.findById(appId);
    if (!application) {
      throw new NotFoundException(`Application with ID ${appId} not found`);
    }
    if (updateData.discipline) {
      updateData.discipline = await this.validateDiscipline(
        updateData.discipline,
      );
    }
    Object.assign(application, updateData);
    return await this.applicationRepository.save(application);
  }

  /**
   * Updates the status of an application and sends a notification email
   * if the new status is ACCEPTED, DECLINED, or NO_AVAILABILITY.
   * @param appId The id of the application to update.
   * @param appStatus The new application status.
   * @returns The updated application object.
   * @throws {NotFoundException} if the application does not exist.
   * @throws {Error} which is unchanged from what repository or email service throws.
   */
  async updateStatus(
    appId: number,
    appStatus: AppStatus,
  ): Promise<Application> {
    const application = await this.findById(appId);

    application.appStatus = appStatus;
    const updated = await this.applicationRepository.save(application);

    const subject = STATUS_EMAIL_SUBJECTS[appStatus];
    if (subject) {
      let name = 'Applicant';
      try {
        const user = await this.usersService.findOne(application.email);
        if (user) {
          const toTitleCase = (s: string) =>
            s
              .split(/\s+/)
              .filter(Boolean)
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
              .join(' ');

          name = toTitleCase(`${user.firstName} ${user.lastName}`);
        }
      } catch {
        name = `applicant`;
      }
      const body = buildEmailBody(appStatus, name);
      if (body) {
        await this.emailService.queueEmail(application.email, subject, body);
      }
    }

    return updated;
  }

  /**
   * Updates an application's commitment starting date with validation.
   * @param appId The id of the application to update.
   * @param proposedStartDate The new starting date for the application's commitment.
   * @returns The updated application object.
   * @throws {BadRequestException} if the date is invalid or not before endDate (when present).
   * @throws {NotFoundException} if the application does not exist.
   */
  async updateProposedStartDate(
    appId: number,
    proposedStartDate: Date,
  ): Promise<Application> {
    if (!appId) {
      throw new BadRequestException('Application ID is required');
    }

    if (!proposedStartDate) {
      throw new BadRequestException('Start date is required');
    }

    if (isNaN(proposedStartDate.getTime())) {
      throw new BadRequestException('Start date must be a valid date');
    }

    const application = await this.findById(appId);

    if (application.endDate && proposedStartDate >= application.endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    application.proposedStartDate = proposedStartDate;
    return await this.applicationRepository.save(application);
  }

  /**
   * Updates an application's actual commitment starting date with validation.
   * @param appId The id of the application to update.
   * @param actualStartDate The new starting date for the application's commitment.
   * @returns The updated application object.
   * @throws {BadRequestException} if the date is invalid or not before endDate (when present).
   * @throws {NotFoundException} if the application does not exist.
   */
  async updateActualStartDate(
    appId: number,
    actualStartDate: Date,
  ): Promise<Application> {
    if (!appId) {
      throw new BadRequestException('Application ID is required');
    }

    if (!actualStartDate) {
      throw new BadRequestException('Start date is required');
    }

    if (isNaN(actualStartDate.getTime())) {
      throw new BadRequestException('Start date must be a valid date');
    }

    const application = await this.findById(appId);

    if (application.endDate && actualStartDate >= application.endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    application.proposedStartDate = actualStartDate;
    return await this.applicationRepository.save(application);
  }

  /**
   * Updates an application's commitment ending date with validation.
   * @param appId The id of the application to update.
   * @param endDate The new ending date for the application's commitment.
   * @returns The updated application object.
   * @throws {BadRequestException} if the date is invalid or not after proposedStartDate (when present).
   * @throws {NotFoundException} if the application does not exist.
   */
  async updateEndDate(appId: number, endDate: Date): Promise<Application> {
    if (!appId) {
      throw new BadRequestException('Application ID is required');
    }

    if (!endDate) {
      throw new BadRequestException('End date is required');
    }

    if (isNaN(endDate.getTime())) {
      throw new BadRequestException('End date must be a valid date');
    }

    const application = await this.findById(appId);

    if (
      application.proposedStartDate &&
      application.proposedStartDate >= endDate
    ) {
      throw new BadRequestException('End date must be after start date');
    }

    application.endDate = endDate;
    return await this.applicationRepository.save(application);
  }

  /**
   * Deletes an application from the repository by id.
   * @param appId the id of the application to delete.
   * @throws {NotFoundException} if the application does not exist.
   * @throws {Error} anything that the repository throws.
   */
  async delete(appId: number): Promise<void> {
    const application = await this.findById(appId);
    if (!application) {
      throw new NotFoundException(`Application with ID ${appId} not found`);
    }
    await this.applicationRepository.remove(application);
  }

  /**
   * Builds the HTML email body for a failed application submission.
   * Uses data directly from the DTO — no database lookup required.
   *
   * @param applicantDto The submitted application data.
   * @param errorMessage The sanitized validation error message.
   * @param pandaDocLink The URL to the PandaDoc resubmission form.
   * @returns The formatted HTML email body string.
   */
  private buildApplicationSubmissionErrorEmailBody(
    applicantName: string,
    applicantDto: CreateApplicationDto,
    errorMessage: string,
    pandaDocLink: string,
  ): string {
    const submittedFields = escapeHtml(JSON.stringify(applicantDto, null, 2));

    const linkBlock = pandaDocLink
      ? `<p><a href="${escapeHtml(
          pandaDocLink,
        )}">Click here to resubmit your application</a></p>`
      : '';

    return `<p>Hello ${applicantName},</p>
      <p>We were unable to process your application due to an issue with the information provided.</p>
      <p><strong>What needs to be corrected:</strong></p>
      <p>${escapeHtml(errorMessage)}</p>
      <p><strong>Your submitted information:</strong></p>
      <pre style="white-space:pre-wrap;font-family:inherit;">${submittedFields}</pre>
      <p>Please review the information above and resubmit your application through the PandaDoc form with the correct details.</p>
      ${linkBlock}
      <p>We appreciate your time and apologize for the inconvenience.</p>
      <p>Best regards,<br/>Boston Health Care for the Homeless Program</p>`;
  }
}
