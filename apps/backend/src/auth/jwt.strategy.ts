import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { passportJwtSecret } from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Logger } from '@nestjs/common';

import CognitoAuthConfig from './aws-exports';

// TODO: Clarify what this is
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor() {
    if (
      !CognitoAuthConfig.userPoolId ||
      !CognitoAuthConfig.clientId ||
      !CognitoAuthConfig.region
    ) {
      throw new Error(
        'Missing Cognito auth config for backend JWT strategy. Set COGNITO_USER_POOL_ID, COGNITO_APP_CLIENT_ID, and COGNITO_REGION (or the VITE_ equivalents).',
      );
    }

    const cognitoAuthority = `https://cognito-idp.${CognitoAuthConfig.region}.amazonaws.com/${CognitoAuthConfig.userPoolId}`;

    Logger.log(
      `Configuring JWT strategy for issuer ${cognitoAuthority} and client ${CognitoAuthConfig.clientId}`,
      JwtStrategy.name,
    );

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      audience: CognitoAuthConfig.clientId,
      issuer: cognitoAuthority,
      algorithms: ['RS256'],
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: cognitoAuthority + '/.well-known/jwks.json',
      }),
    });
  }

  async validate(payload) {
    this.logger.debug(
      `Validated JWT payload: sub=${payload?.sub ?? 'unknown'}, token_use=${
        payload?.token_use ?? 'unknown'
      }`,
    );
    return { idUser: payload.sub, email: payload.email };
  }
}
