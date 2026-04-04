import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { passportJwtSecret } from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Logger } from '@nestjs/common';

import envConfig from '../aws-exports';

// Passport strategy that validates Cognito JWTs before protected routes run.
// Once a token passes this strategy, request.user contains the decoded claims.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  /**
   * Configures the JWT strategy to trust Cognito-issued access tokens for
   * this user pool/app client.
   * @throws {Error} If required Cognito configuration is missing.
   */
  constructor() {
    const cognitoAuthority = `https://cognito-idp.${envConfig.CognitoAuthConfig.region}.amazonaws.com/${envConfig.CognitoAuthConfig.userPoolId}`;

    // These settings tell Passport which tokens to trust and where to fetch
    // the public keys that Cognito uses to sign JWTs.
    Logger.log(
      `Configuring JWT strategy for issuer ${cognitoAuthority} and client ${envConfig.CognitoAuthConfig.clientId}`,
      JwtStrategy.name,
    );

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      audience: envConfig.CognitoAuthConfig.clientId,
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

  /**
   * Normalizes validated JWT claims into the request user object used by the
   * rest of the backend.
   * @param payload Decoded Cognito JWT payload.
   * @returns Minimal user identity payload for downstream guards/controllers.
   */
  async validate(payload) {
    // `validate` runs only after Passport has already verified the JWT
    // signature and issuer. We keep only the fields the rest of the app uses.
    this.logger.debug(
      `Validated JWT payload: sub=${payload?.sub ?? 'unknown'}, token_use=${
        payload?.token_use ?? 'unknown'
      }`,
    );
    return { idUser: payload.sub, email: payload.email };
  }
}
