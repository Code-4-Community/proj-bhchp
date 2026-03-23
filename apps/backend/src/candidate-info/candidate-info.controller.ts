import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  UseInterceptors,
  Delete,
} from '@nestjs/common';
import { CandidateInfoService } from './candidate-info.service';
import { CandidateInfo } from './candidate-info.entity';
import { CurrentUserInterceptor } from '../interceptors/current-user.interceptor';
import { CreateCandidateInfoDto } from './dto/candidate-info.dto';

/**
 * Controller exposing HTTP endpoints to get, create, and change information
 * about the app's CandidateInfo, including start and end dates.
 */
@Controller('CandidateInfo')
// @UseGuards(AuthGuard('jwt'))
@UseInterceptors(CurrentUserInterceptor)
export class CandidateInfoController {
  constructor(private CandidateInfoService: CandidateInfoService) {}

  /**
   * Exposes an endpoint to create a CandidateInfo.
   * @param createCandidateInfoDto Object with the necessary starting data for the
   *                         CandidateInfo corresponding to their application.
   * @returns The new CandidateInfo.
   * @throws {Error} If the repository throws an error.
   * @throws {BadRequestException} if any fields are invalid.
   */
  @Post()
  async createCandidateInfo(
    @Body()
    createCandidateInfoDto: CreateCandidateInfoDto,
  ): Promise<CandidateInfo> {
    return this.CandidateInfoService.create(
      createCandidateInfoDto.appId,
      createCandidateInfoDto.email,
    );
  }

  /**
   * Exposes an endpoint to return all CandidateInfo in the system.
   * @returns An array of CandidateInfo objects.
   * @throws {Error} If the repository throws an error.
   */
  @Get()
  async getAllCandidateInfo(): Promise<CandidateInfo[]> {
    return this.CandidateInfoService.findAll();
  }

  /**
   * Exposes an endpoint to return a specific CandidateInfo by email.
   * @param email The email of the desired CandidateInfo (primary key).
   * @returns The CandidateInfo with the desired email.
   * @throws {Error} If the repository throws an error.
   * @throws {NotFoundException} if the CandidateInfo with the specified email does not exist.
   */
  @Get('email/:email')
  async getCandidateInfoByEmail(
    @Param('email') email: string,
  ): Promise<CandidateInfo> {
    return this.CandidateInfoService.findOne(email);
  }

  /**
   * Exposes an endpoint to return a specific CandidateInfo by appId (returns first match if multiple).
   * @param appId The appId of the desired CandidateInfo to return.
   * @returns The CandidateInfo(s) with the desired appId.
   */
  @Get('/:appId')
  async getCandidateInfoByAppId(
    @Param('appId', ParseIntPipe) appId: number,
  ): Promise<CandidateInfo[]> {
    return this.CandidateInfoService.findByAppId(appId);
  }

  /**
   * Exposes an endpoint to delete an CandidateInfo by email.
   * @param email The email of the CandidateInfo to delete (primary key).
   * @returns The deleted CandidateInfo object.
   * @throws {Error} If the repository throws an error.
   * @throws {NotFoundException} if the CandidateInfo with the specified email does not exist.
   */
  @Delete('email/:email')
  async deleteCandidateInfo(
    @Param('email') email: string,
  ): Promise<CandidateInfo> {
    return this.CandidateInfoService.delete(email);
  }
}
