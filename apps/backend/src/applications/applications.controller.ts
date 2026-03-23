import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { Application } from './application.entity';
import { CreateApplicationDto } from './dto/create-application.request.dto';
import { ApiTags } from '@nestjs/swagger';
import { UpdateApplicationStatusDto } from './dto/update-application-status.request.dto';
import { UpdateApplicationDisciplineDto } from './dto/update-application-discipline.request.dto';
import { UpdateApplicationAvailabilityDto } from './dto/update-application-availability.request.dto';

/**
 * Controller to expose HTTP endpoints to interface, extract, and change information about the app's applications.
 */
@ApiTags('Applications')
@Controller('applications')
export class ApplicationsController {
  constructor(private applicationsService: ApplicationsService) {}

  /**
   * Exposes an endpoint to return all applications.
   * @returns A promise of the list of all available applications.
   * @throws {Error} which is unchanged from what repository throws.
   */
  @Get()
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
  @Get('/:appId')
  async getApplicationById(
    @Param('appId', ParseIntPipe) appId: number,
  ): Promise<Application> {
    return await this.applicationsService.findById(appId);
  }

  /**
   * Exposes an endpoint to create an application.
   * @param createApplicationDto The expected data required to create an application (applicant's info).
   * @param req The request object from the caller (frontend). Currently not used.
   * @returns The newly created application.
   * @throws {Error} which is unchanged from what repository throws.
   */
  @Post()
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
  async updateApplicationStatus(
    @Param('appId', ParseIntPipe) appId: number,
    @Body() updateStatusDto: UpdateApplicationStatusDto,
  ): Promise<Application> {
    return await this.applicationsService.update(appId, {
      appStatus: updateStatusDto.appStatus,
    });
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
  @Patch('/:appId/start-date')
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
  async deleteApplication(
    @Param('appId', ParseIntPipe) appId: number,
  ): Promise<void> {
    await this.applicationsService.delete(appId);
  }
}
