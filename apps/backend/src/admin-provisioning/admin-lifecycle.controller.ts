import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserType } from '../users/types';
import { AdminLifecycleService } from './admin-lifecycle.service';
import {
  AdminAccountSummary,
  AdminLifecycleResult,
} from './admin-lifecycle.types';

/**
 * Admin-only endpoints for managing the admin account lifecycle: listing
 * admins and deactivating / directly reactivating accounts (the requester's own
 * account or another admin's).
 */
@ApiTags('Admin Lifecycle')
@ApiBearerAuth()
@Controller('admins')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AdminLifecycleController {
  constructor(private readonly adminLifecycleService: AdminLifecycleService) {}

  /**
   * Lists all admin accounts with their active status.
   */
  @Get()
  @Roles(UserType.ADMIN)
  async listAdmins(): Promise<AdminAccountSummary[]> {
    return this.adminLifecycleService.listAdmins();
  }

  /**
   * Deactivates an admin account so it can no longer authenticate.
   * @param email the admin to deactivate.
   */
  @Patch(':email/deactivate')
  @Roles(UserType.ADMIN)
  async deactivateAdmin(
    @Param('email') email: string,
  ): Promise<AdminLifecycleResult> {
    return this.adminLifecycleService.deactivateAdmin(email);
  }

  /**
   * Reactivates an admin account directly (admin-initiated).
   * @param email the admin to reactivate.
   */
  @Patch(':email/reactivate')
  @Roles(UserType.ADMIN)
  async reactivateAdmin(
    @Param('email') email: string,
  ): Promise<AdminLifecycleResult> {
    return this.adminLifecycleService.reactivateAdmin(email);
  }
}
