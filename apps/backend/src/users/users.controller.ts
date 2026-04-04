import {
  Controller,
  Delete,
  Get,
  Param,
  Req,
  UseGuards,
  UseInterceptors,
  Headers,
  Logger,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { User } from './user.entity';
import { CurrentUserInterceptor } from '../interceptors/current-user.interceptor';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserType } from './types';

/**
 * Controller to expose callable HTTP endpoints to
 * extract information about the app's users or delete them.
 * Email is the primary key; use encoded email in path (e.g. user%40example.com).
 */
@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(AuthGuard('jwt'))
@UseInterceptors(CurrentUserInterceptor)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private usersService: UsersService) {}

  /**
   * Returns the current database-backed user resolved from the authenticated
   * request. This keeps standard users from probing arbitrary emails.
   */
  @Get('me')
  async getCurrentUser(@Req() req: { user?: User }): Promise<User | null> {
    if (!req.user || !req.user.userType) {
      this.logger.warn(
        'GET /users/me resolved without database user or userType on request.user',
      );
      return null;
    }

    this.logger.log(
      `GET /users/me returning user email=${req.user.email}, userType=${req.user.userType}`,
    );

    return req.user;
  }

  /**
   * Exposes an endpoint to get a user's information by their email.
   * Admins may look up other users by email; standard users should use /me.
   * @param email The email of the desired user (URL-encoded).
   * @returns The user with the corresponding email or null if not found.
   */
  @Get('email/:email')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  async getUser(
    @Param('email') email: string,
    @Headers('authorization') authorization?: string,
  ): Promise<User | null> {
    const decoded = decodeURIComponent(email);
    this.logger.debug(
      `GET /users/email/${decoded} called. Authorization present: ${
        authorization ? 'yes' : 'no'
      }`,
    );

    try {
      const user = await this.usersService.findOne(decoded);
      if (user) {
        this.logger.debug(
          `Found user for ${decoded}: userType=${user.userType}`,
        );
      } else {
        this.logger.debug(`No user found for ${decoded}`);
      }
      return user;
    } catch (err: unknown) {
      this.logger.error(`Error fetching user for ${decoded}: ${String(err)}`);
      throw err;
    }
  }

  /**
   * Exposes an endpoint to delete a user by their email.
   * @param email The email of the user to delete (URL-encoded).
   */
  @Delete('email/:email')
  @Roles(UserType.ADMIN)
  async removeUser(@Param('email') email: string): Promise<void> {
    const decoded = decodeURIComponent(email);
    await this.usersService.remove(decoded);
  }
}
