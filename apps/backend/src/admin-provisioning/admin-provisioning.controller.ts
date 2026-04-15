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
 * Controller for the admin provisioning flow described in phases 2-5 of the
 * authentication plan.
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
   * Attempts to provision an admin within our database and authentication provider.
   * @param provisionAdminDto information about the admin, which hinges on the admin email
   * @returns {Promise<ProvisionAdminResponse>} with key information regarding whether provisioning failed or not
   */
  @Post('provision')
  @Roles(UserType.ADMIN)
  async provisionAdmin(
    @Body() provisionAdminDto: ProvisionAdminDto,
  ): Promise<ProvisionAdminResponse> {
    return this.adminProvisioningService.provisionAdmin(provisionAdminDto);
  }
}
