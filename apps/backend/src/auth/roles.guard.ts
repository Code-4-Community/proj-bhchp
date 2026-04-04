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
   * If role metadata exists and `request.user.userType` is missing, it loads
   * the user from the database by email before evaluating role membership.
   * @param context Current execution context from Nest.
   * @returns `true` when access is allowed.
   * @throws {UnauthorizedException} If an authenticated email is not present.
   * @throws {ForbiddenException} If the user does not exist or lacks a
   * required role.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserType[]>(
      'roles',
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

    let resolvedUserType = requestUser.userType;

    if (!resolvedUserType) {
      const databaseUser = await this.usersService.findOne(requestUser.email);
      if (!databaseUser) {
        throw new ForbiddenException('Authenticated user was not found.');
      }
      request.user = databaseUser;
      resolvedUserType = databaseUser.userType;
    }

    if (!requiredRoles.includes(resolvedUserType)) {
      throw new ForbiddenException('Insufficient role for this route.');
    }

    return true;
  }
}
