import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsersService } from '../users/users.service';
import { UserType } from '../users/types';
import { ROLES_KEY } from './roles.decorator';

type RequestUser = {
  email?: string;
  userType?: UserType;
};

type HttpRequest = {
  user?: RequestUser;
};

/**
 * Authorization guard that enforces role-based access using `@Roles(...)`
 * metadata on route handlers/classes.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Determines whether the current request may access the route.
   * It always reloads the current user from the database by authenticated
   * email before evaluating role membership so authorization never relies on
   * a previously attached role value even if it's from the interceptor.
   * @param context Current execution context from Nest.
   * @returns `true` when access is allowed.
   * @throws {UnauthorizedException} If an authenticated email is not present.
   * @throws {ForbiddenException} If the user does not exist or lacks a
   * required role.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserType[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<HttpRequest>();
    const requestUser = request.user;

    if (!requestUser?.email) {
      throw new UnauthorizedException('Missing authenticated user email.');
    }

    const databaseUser = await this.usersService.findOne(requestUser.email);
    if (!databaseUser) {
      throw new ForbiddenException('Authenticated user was not found.');
    }

    if (!databaseUser.isActive) {
      throw new ForbiddenException('This account has been deactivated.');
    }

    request.user = databaseUser;

    if (!requiredRoles.includes(databaseUser.userType)) {
      throw new ForbiddenException('Insufficient role for this route.');
    }

    return true;
  }
}
