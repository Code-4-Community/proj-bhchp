import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';

@Injectable()
export class CurrentUserInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CurrentUserInterceptor.name);

  constructor(private usersService: UsersService) {}

  async intercept(context: ExecutionContext, handler: CallHandler) {
    // At this point JWT auth has already succeeded. This interceptor upgrades
    // the lightweight Cognito payload into the app's database-backed user.
    const request = context.switchToHttp().getRequest();

    if (!request.user) {
      this.logger.debug(
        'No request.user found; skipping current-user enrichment',
      );
      return handler.handle();
    }

    // The JWT strategy exposes the Cognito email claim, which is enough to
    // locate the local user profile without asking Cognito for extra metadata.
    const userEmail = request.user.email;

    if (!userEmail) {
      this.logger.debug(
        'JWT payload did not include an email claim; skipping current-user enrichment',
      );
      return handler.handle();
    }

    this.logger.debug(
      `Enriching request.user from database by email=${userEmail}`,
    );
    const user = await this.usersService.findOne(userEmail);

    if (user) {
      this.logger.debug(
        `Matched database user for email=${userEmail}; userType=${user.userType}`,
      );
      request.user = user;
    } else {
      this.logger.debug(`No database user found for email=${userEmail}`);
    }

    return handler.handle();
  }
}
