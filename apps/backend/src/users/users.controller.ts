import {
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { User } from './user.entity';
import { CurrentUserInterceptor } from '../interceptors/current-user.interceptor';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserType } from './types';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

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
  constructor(private usersService: UsersService) {}

  /**
   * Exposes an endpoint to get all users.
   * @returns {User[]} All users in the system.
   */
  @Get()
  async getAllUsers(): Promise<User[]> {
    return this.usersService.findAll();
  }

  /**
   * Exposes an endpoint to get all users of standard type.
   * @returns {User[]} All users in the system of standard type.
   */
  @Get('standard')
  async getAllStandardUsers(): Promise<User[]> {
    return this.usersService.findStandard();
  }

  /**
   * Exposes an endpoint to get a user's information by their email.
   * @param email The email of the desired user (URL-encoded).
   * @returns {User} The user with the corresponding email or null if not found.
   */
  @Get('email/:email')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  async getUser(@Param('email') email: string): Promise<User | null> {
    const decoded = decodeURIComponent(email);
    return this.usersService.findOne(decoded);
  }

  /**
   * Exposes an endpoint to delete a user by their email.
   * @param email The email of the user to delete (URL-encoded).
   *
   * Does not return anything.
   */
  @Delete('email/:email')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  async removeUser(@Param('email') email: string): Promise<void> {
    const decoded = decodeURIComponent(email);
    await this.usersService.remove(decoded);
  }

  /**
   * Returns the current database-backed user resolved from the Interceptor/ JWT/ Cognito.
   * @param req: payload with user injected from the Interceptor/ JWT/ Cognito
   * @returns {User | null} Returns the user object or nothing.
   */
  @Get('me')
  async getCurrentUser(
    @Req() req: { user?: User },
  ): Promise<User | NotFoundException> {
    if (!req.user || !req.user.userType) {
      return new NotFoundException('No user matching the JWT was found.');
    }
    return req.user;
  }
}
