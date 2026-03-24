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

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
  ) {}

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
