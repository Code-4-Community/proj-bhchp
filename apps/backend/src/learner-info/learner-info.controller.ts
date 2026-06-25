import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { LearnerInfo } from './learner-info.entity';
import { ApiTags } from '@nestjs/swagger';
import { LearnerInfoService } from './learner-info.service';
import { CreateLearnerInfoDto } from './dto/create-learner-info.request.dto';
import { ApplicationsService } from '../applications/applications.service';
import { CurrentUserInterceptor } from '../interceptors/current-user.interceptor';
import { AuthGuard } from '@nestjs/passport';
import { UserType } from '../users/types';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

/**
 * Controller to expose HTTP endpoints to interface, extract, and change information about learner-specific application info.
 */
@ApiTags('LearnerInfo')
@Controller('learner_info')
@UseInterceptors(CurrentUserInterceptor)
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class LearnerInfoController {
  constructor(
    private learnerInfoService: LearnerInfoService,
    private applicationsService: ApplicationsService,
  ) {}

  /**
   * Exposes an endpoint to create a learner info.
   * @param createLearnerInfoDto The expected data required to create a learner specific info object
   * @returns The newly created application.
   * @throws {Error} which is unchanged from what repository throws.
   */
  @Post()
  @Roles(UserType.ADMIN)
  async createLearnerInfo(
    @Body() createLearnerInfoDto: CreateLearnerInfoDto,
  ): Promise<LearnerInfo> {
    return await this.learnerInfoService.create(createLearnerInfoDto);
  }

  /**
   * Exposes an endpoint to retrieve a learner info by appId.
   * @param appId the appId of the learner info to be returned.
   * @returns The learner info with the given appId
   * @throws {Error} which is unchanged from what repository throws.
   * @throws {NotFoundException} with message 'learner info with AppId <id> not found'
   *         if an application with that id does not exist.
   * @throws {BadRequestException} if the id field is invalid (e.g. null or undefined)
   */
  @Get('/:appId')
  @Roles(UserType.ADMIN, UserType.STANDARD)
  async getLearnerInfo(
    @Param('appId') appId: number,
    @Req() req: { user?: { email?: string; userType?: UserType } },
  ): Promise<LearnerInfo> {
    if (req.user?.userType === UserType.STANDARD) {
      const application = await this.applicationsService.findById(appId);
      if (req.user.email !== application.email) {
        throw new ForbiddenException(
          'Standard users can only access their own learner info.',
        );
      }
    }

    return await this.learnerInfoService.findById(appId);
  }
}
