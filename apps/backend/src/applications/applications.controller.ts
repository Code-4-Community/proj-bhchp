import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UseFilters,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { Application } from './application.entity';
import { CreateApplicationDto } from './dto/create-application.request.dto';
import { ApiTags } from '@nestjs/swagger';
import { UpdateApplicationStatusDto } from './dto/update-application-status.request.dto';
import { UpdateApplicationDisciplineDto } from './dto/update-application-discipline.request.dto';
import { UpdateApplicationAvailabilityDto } from './dto/update-application-availability.request.dto';
import { CurrentUserInterceptor } from '../interceptors/current-user.interceptor';
import { AuthGuard } from '@nestjs/passport';
import { UserType } from '../users/types';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ApplicationValidationEmailFilter } from './filters/application-validation-email.filter';
import { ApplicationCreationErrorFilter } from './filters/application-creation-validation.filter';
import { User } from '../users/user.entity';
import { CandidateInfoService } from '../candidate-info/candidate-info.service';

/**
 * Controller to expose HTTP endpoints to interface, extract, and change information about the app's applications.
 */
@ApiTags('Applications')
@Controller('applications')
@UseInterceptors(CurrentUserInterceptor)
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ApplicationsController {
  private readonly logger = new Logger(ApplicationsController.name);

  constructor(
    private applicationsService: ApplicationsService,
    private candidateInfoService: CandidateInfoService,
  ) {}

  /**
   * Exposes an endpoint to return the total number of applications.
   * @returns Object containing the total application count.
   */
  @Get('count/total')
  @Roles(UserType.ADMIN)
  async getTotalApplicationsCount(): Promise<{ count: number }> {
    const count = await this.applicationsService.countAll();
    return { count };
  }

  /**
   * Exposes an endpoint to return the total number of applications in review.
   * @returns Object containing the in-review application count.
   */
  @Get('count/in-review')
  @Roles(UserType.ADMIN)
  async getInReviewApplicationsCount(): Promise<{ count: number }> {
    const count = await this.applicationsService.countInReview();
    return { count };
  }

  /**
   * Exposes an endpoint to return the total number of rejected applications.
   * @returns Object containing the rejected application count.
   */
  @Get('count/rejected')
  @Roles(UserType.ADMIN)
  async getRejectedApplicationsCount(): Promise<{ count: number }> {
    const count = await this.applicationsService.countRejected();
    return { count };
  }

  /**
   * Exposes an endpoint to return the total number of approved/active applications.
   * @returns Object containing the approved/active application count.
   */
  @Get('count/approved')
  @Roles(UserType.ADMIN)
  async getApprovedApplicationsCount(): Promise<{ count: number }> {
    const count = await this.applicationsService.countApprovedOrActive();
    return { count };
  }

  /**
   * Exposes an endpoint to return all applications.
   * @returns A promise of the list of all available applications.
   * @throws {Error} which is unchanged from what repository throws.
   */
  @Get()
  @Roles(UserType.ADMIN)
  async getAllApplications(): Promise<Application[]> {
    return await this.applicationsService.findAll();
  }

  /**
   * Exposes an endpoint to return all applications filtered by discipline.
   * @param discipline The discipline to filter applications by.
   * @param req The request object from the caller (frontend). Currently not used.
   * @returns A promise of the list of applications with the specified discipline.
   *          Returns an empty array if no applications match the discipline.
   * @throws {BadRequestException} if the discipline is not a valid DISCIPLINE_VALUES enum value.
   * @throws {Error} which is unchanged from what repository throws.
   */
  @Get('by-discipline')
  @Roles(UserType.ADMIN)
  async getApplicationsByDiscipline(
    @Query('discipline') discipline: string,
  ): Promise<Application[]> {
    return await this.applicationsService.findByDiscipline(discipline);
  }

  /**
   * Exposes an endpoint to return an application by id.
   * @param appId The desired application id to search for.
   * @param req The request object from the caller (frontend). Currently not used.
   * @returns A promise of the application with that id.
   * @throws {NotFoundException} with message 'Application with ID <id> not found'
   *         if an application with that id does not exist.
   * @throws {Error} which is unchanged from what repository throws.
   */
  @Get(':appId(\\d+)')
  @Roles(UserType.ADMIN, UserType.STANDARD)
  async getApplicationById(
    @Param('appId', ParseIntPipe) appId: number,
    @Req() req: { user?: { email?: string; userType?: UserType } },
  ): Promise<Application> {
    const application = await this.applicationsService.findById(appId);

    // Standard users may only access their own application.
    if (
      req.user?.userType === UserType.STANDARD &&
      req.user.email !== application.email
    ) {
      throw new ForbiddenException(
        'Standard users can only access their own application.',
      );
    }

    return application;
  }

  /**
   * Exposes an endpoint to create an application.
   * @param createApplicationDto The expected data required to create an application (applicant's info).
   * @param req The request object from the caller (frontend). Currently not used.
   * @returns The newly created application.
   * @throws {Error} which is unchanged from what repository throws.
   */
  @Post()
  @Roles(UserType.ADMIN)
  @UseFilters(ApplicationCreationErrorFilter, ApplicationValidationEmailFilter)
  async createApplication(
    @Body() createApplicationDto: CreateApplicationDto,
  ): Promise<Application> {
    return await this.applicationsService.create(createApplicationDto);
  }

  /**
   * Exposes an endpoint to update the status of the application.
   * @param appId The id of the application to update.
   * @param updateStatusDto Object containing the desired new application status.
   * @param req The request object from the caller (frontend). Currently not used.
   * @returns The updated application object.
   * @throws {NotFoundException} with message 'Application with ID <id> not found'
   *         if the application does not exist.
   * @throws {Error} which is unchanged from what repository throws.
   */
  @Patch('/:appId/status')
  @Roles(UserType.ADMIN)
  async updateApplicationStatus(
    @Param('appId', ParseIntPipe) appId: number,
    @Body() updateStatusDto: UpdateApplicationStatusDto,
  ): Promise<Application> {
    return await this.applicationsService.updateStatus(
      appId,
      updateStatusDto.appStatus,
    );
  }

  /**
   * Exposes an endpoint to update the application's discipline.
   * @param appId The id of the application to modify.
   * @param updateDisciplineDto Object containing the desired new discipline (must be a valid DISCIPLINE_VALUES enum value).
   * @param req The request object from the caller (frontend). Currently not used.
   * @returns The updated application object.
   * @throws {NotFoundException} with message 'Application with ID <id> not found'
   *         if the application does not exist.
   * @throws {Error} which is unchanged from what repository throws.
   */
  @Patch('/:appId/discipline')
  @Roles(UserType.ADMIN)
  async updateApplicationDiscipline(
    @Param('appId', ParseIntPipe) appId: number,
    @Body() updateDisciplineDto: UpdateApplicationDisciplineDto,
  ): Promise<Application> {
    return await this.applicationsService.update(appId, {
      discipline: updateDisciplineDto.discipline,
    });
  }

  /**
   * Exposes an endpoint to update the availability fields of an application.
   * @param appId The id of the application to update.
   * @param updateAvailabilityDto Object containing one or more day availability strings.
   * @param req The request object from the caller (frontend). Currently not used.
   * @returns The updated application object.
   * @throws {NotFoundException} if the application does not exist.
   */
  @Patch('/:appId/availability')
  @Roles(UserType.ADMIN)
  async updateApplicationAvailability(
    @Param('appId', ParseIntPipe) appId: number,
    @Body() updateAvailabilityDto: UpdateApplicationAvailabilityDto,
  ): Promise<Application> {
    return await this.applicationsService.update(appId, updateAvailabilityDto);
  }

  /**
   * Exposes an endpoint to update an application's commitment starting date.
   * @param appId The id of the application to update.
   * @param startDate The new starting date for the application's commitment.
   * @returns The updated application object.
   * @throws {BadRequestException} if any field is invalid (e.g. null or undefined).
   * @throws {NotFoundException} with message 'Application with ID <appId> not found'
   *         if the application does not exist.
   */
  @Patch('/:appId/start-date')
  @Roles(UserType.ADMIN)
  async updateApplicationProposedStartDate(
    @Param('appId', ParseIntPipe) appId: number,
    @Body('proposedStartDate') startDate: string,
  ): Promise<Application> {
    return await this.applicationsService.updateProposedStartDate(
      appId,
      new Date(startDate),
    );
  }

  /**
   * Exposes an endpoint to update an application's actual commitment starting date.
   * @param appId The id of the application to update.
   * @param startDate The new actual starting date for the application's commitment.
   * @returns The updated application object.
   * @throws {BadRequestException} if any field is invalid (e.g. null or undefined).
   * @throws {NotFoundException} with message 'Application with ID <appId> not found'
   *         if the application does not exist.
   */
  @Patch('/:appId/actual-start-date')
  @Roles(UserType.ADMIN)
  async updateApplicationActualStartDate(
    @Param('appId', ParseIntPipe) appId: number,
    @Body('actualStartDate') startDate: string,
  ): Promise<Application> {
    return await this.applicationsService.updateActualStartDate(
      appId,
      new Date(startDate),
    );
  }

  /**
   * Exposes an endpoint to update an application's commitment ending date.
   * @param appId The id of the application to update.
   * @param endDate The new ending date for the application's commitment.
   * @returns The updated application object.
   * @throws {BadRequestException} if any field is invalid (e.g. null or undefined).
   * @throws {NotFoundException} with message 'Application with ID <appId> not found'
   *         if the application does not exist.
   */
  @Patch('/:appId/end-date')
  @Roles(UserType.ADMIN)
  async updateApplicationEndDate(
    @Param('appId', ParseIntPipe) appId: number,
    @Body('endDate') endDate: string,
  ): Promise<Application> {
    return await this.applicationsService.updateEndDate(
      appId,
      new Date(endDate),
    );
  }

  /**
   * Exposes an endpoint to delete an application from the system.
   * @param appId The id of the application to delete.
   * @param req The request object from the caller (frontend). Currently not used.
   * @throws {NotFoundException} with message 'Application with ID <id> not found'
   *         if the application does not exist.
   * @throws {Error} which is unchanged from what repository throws.
   * @returns {Application} The application object which has been deleted.
   */
  @Delete('/:appId')
  @Roles(UserType.ADMIN)
  async deleteApplication(
    @Param('appId', ParseIntPipe) appId: number,
  ): Promise<void> {
    await this.applicationsService.delete(appId);
  }

  /**
   * Returns the current database-backend application resolved from the same email of the User Interceptor/ JWT/ Cognito.
   * @param req: payload with user injected from the Interceptor/ JWT/ Cognito
   * @returns {Application | null} Returns the Application object or nothing.
   */
  @Get('/me')
  @Roles(UserType.STANDARD)
  async getCurrentApplication(
    @Req() req: { user?: User },
  ): Promise<Application | NotFoundException> {
    this.logger.log(
      `GET /applications/me called userType=${
        req.user?.userType ?? 'missing'
      } email=${req.user?.email ?? 'missing'}`,
    );

    if (!req.user || !req.user.userType || !req.user.email) {
      this.logger.warn(
        'GET /applications/me missing user context (user, userType, or email).',
      );
      return new NotFoundException('No user matching the JWT was found.');
    }

    try {
      const candidateInfo = await this.candidateInfoService.findOne(
        req.user.email,
      );
      this.logger.log(
        `GET /applications/me candidate_info found email=${req.user.email} appId=${candidateInfo.appId}`,
      );
      return this.applicationsService.findById(candidateInfo.appId);
    } catch (error) {
      this.logger.error(
        `GET /applications/me failed for email=${req.user.email}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
