import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserType } from '../users/types';
import { AdminProvisioningService } from './admin-provisioning.service';
import { ProvisionAdminDto } from './dto/provision-admin.dto';
import { ProvisionAdminResponse } from './types';

/**
 * Mock controller for the admin provisioning flow described in phases 2-5 of
 * the authentication plan.
 */
@ApiTags('Admin Provisioning')
@ApiBearerAuth()
@Controller('admins')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AdminProvisioningController {
  constructor(
    private readonly adminProvisioningService: AdminProvisioningService,
  ) {}

  /**
   * Mock admin provisioning endpoint.
   *
   * TODO:
   * - Keep this route admin-only once the real implementation lands.
   * - Replace the mocked response with real service orchestration results.
   */
  @Post('provision')
  @Roles(UserType.ADMIN)
  async provisionAdmin(
    @Body() provisionAdminDto: ProvisionAdminDto,
  ): Promise<ProvisionAdminResponse> {
    return this.adminProvisioningService.provisionAdmin(provisionAdminDto);
  }
}
