import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { LearnersService } from './learners.service';
import { AuthGuard } from '@nestjs/passport';
import { Learner } from './learner.entity';
import { CurrentUserInterceptor } from '../interceptors/current-user.interceptor';
import { CreateLearnerDto } from './dto/learner.dto';

/**
 * Controller exposing HTTP endpoints to get, create, and change information
 * about the app's learners, including start and end dates.
 */
@Controller('learners')
@UseGuards(AuthGuard('jwt'))
@UseInterceptors(CurrentUserInterceptor)
export class LearnersController {
  constructor(private learnersService: LearnersService) {}

  /**
   * Exposes an endpoint to create a learner.
   * @param createLearnerDto Object with the necessary starting data for the
   *                         learner corresponding to their application.
   * @returns The new learner.
   * @throws {Error} If the repository throws an error.
   * @throws {BadRequestException} if any fields are invalid.
   */
  @Post()
  async createLearner(
    @Body()
    createLearnerDto: CreateLearnerDto,
  ): Promise<Learner> {
    return this.learnersService.create(
      createLearnerDto.appId,
      createLearnerDto.firstName,
      createLearnerDto.lastName,
      new Date(createLearnerDto.startDate),
      new Date(createLearnerDto.endDate),
    );
  }

  /**
   * Exposes an endpoint to return all learners in the system.
   * @returns An array of learner objects.
   * @throws {Error} If the repository throws an error.
   */
  @Get()
  async getAllLearners(): Promise<Learner[]> {
    return this.learnersService.findAll();
  }

  /**
   * Exposes an endpoint to return a specific learner by appId.
   * @param appId The appId of the desired learner to return.
   * @returns The learner with the desired appId.
   * @throws {Error} If the repository throws an error.
   * @throws {BadRequestException} if the id field is invalid (e.g. null or undefined).
   * @throws {NotFoundException} with message 'Learner with ID <id> not found'
   *                             if the learner with the specified appId does not exist.
   *
   * TODO: Resolve logical issue: appId is not the same as learner id but the
   *       service searches by learner id despite this accepting appId.
   */
  @Get('/:appId')
  async getLearner(
    @Param('appId', ParseIntPipe) appId: number,
  ): Promise<Learner> {
    return this.learnersService.findOne(appId);
  }

  /**
   * Exposes an endpoint to update a learner's commitment starting date.
   * @param id The id (not appId) of the learner to update.
   * @param startDate The new starting date for the learner's commitment.
   * @throws {Error} If the repository throws an error.
   * @throws {BadRequestException} if any field is invalid (e.g. null or undefined).
   * @throws {NotFoundException} with message 'Learner with ID <id> not found'
   *                             if the learner with the specified appId does not exist.
   */
  @Patch('/:id/start-date')
  async updateStartDate(
    @Param('id', ParseIntPipe) id: number,
    @Body('startDate') startDate: string,
  ): Promise<Learner> {
    return this.learnersService.updateStartDate(id, new Date(startDate));
  }

  /**
   * Exposes an endpoint to update a learner's commitment ending date.
   * @param id The id (not appId) of the learner to update.
   * @param endDate The new ending date for the learner's commitment.
   * @returns The updated learner object.
   * @throws {Error} If the repository throws an error.
   * @throws {BadRequestException} if any field is invalid (e.g. null or undefined).
   * @throws {NotFoundException} with message 'Learner with ID <id> not found'
   *                             if the learner with the specified appId does not exist.
   */
  @Patch('/:id/end-date')
  async updateEndDate(
    @Param('id', ParseIntPipe) id: number,
    @Body('endDate') endDate: string,
  ): Promise<Learner> {
    return this.learnersService.updateEndDate(id, new Date(endDate));
  }
}
