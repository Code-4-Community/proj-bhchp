import { Injectable, Logger } from '@nestjs/common';
import type {
  AdminCreateUserResponse,
  RespondToAuthChallengeResponse,
} from '@aws-sdk/client-cognito-identity-provider';

/**
 * =============================================================================
 * CognitoService — SCAFFOLD / MOCK ONLY (see ./README.md)
 * =============================================================================
 *
 * This service is a placeholder for the real AWS Cognito integration that will
 * be added in a follow-up ticket. Every method returns fake but realistically
 * shaped data so that callers (controllers, pandadoc webhook, frontend) can be
 * wired up in parallel without making any real AWS calls.
 *
 * High-level flow this service will eventually support:
 *
 *   1. Applicant signs a PandaDoc application.
 *   2. Our PandaDoc webhook / create-application endpoint calls
 *      {@link CognitoService.createCognitoUser}, which will call
 *      `AdminCreateUser` on the Cognito User Pool. Cognito generates a
 *      temporary password and emails it to the applicant automatically.
 *   3. The applicant logs in with that temporary password. Cognito responds
 *      with a `NEW_PASSWORD_REQUIRED` challenge.
 *   4. The frontend collects a new permanent password and calls
 *      {@link CognitoService.handleNewPasswordChallenge}, which will call
 *      `RespondToAuthChallenge` with the `NEW_PASSWORD_REQUIRED` challenge
 *      type and return real Cognito auth tokens.
 *   5. If the applicant never received the email or the temp password expired,
 *      an admin (or a support endpoint) can call
 *      {@link CognitoService.resendTemporaryPassword}, which will call
 *      `AdminCreateUser` with `MessageAction: "RESEND"`.
 *
 * Real implementation details (TODO in follow-up ticket):
 *   - SDK package: `@aws-sdk/client-cognito-identity-provider` (already in
 *     `package.json`).
 *   - Env vars consumed: `COGNITO_USER_POOL_ID`, `COGNITO_APP_CLIENT_ID`,
 *     `COGNITO_REGION` (a.k.a. `AWS_REGION`). Values are intentionally left
 *     unset here — configuration will be added alongside the real SDK calls.
 *   - Credentials: will use the same IAM creds the rest of the backend uses
 *     (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`).
 *   - No AWS SDK client is constructed in this file on purpose. This keeps the
 *     mock free of network and credential concerns.
 * =============================================================================
 */
@Injectable()
export class CognitoService {
  private readonly logger = new Logger(CognitoService.name);

  /**
   * MOCK — Does not call AWS. Pretends to create a new user in the Cognito
   * User Pool by invoking `AdminCreateUser`.
   *
   * In the real implementation this method will:
   *   - Build an `AdminCreateUserCommand` for `COGNITO_USER_POOL_ID` with
   *     `Username: email`, `TemporaryPassword: temporaryPassword`,
   *     `UserAttributes: [{ Name: 'email', Value: email }, { Name: 'email_verified', Value: 'true' }]`,
   *     and `DesiredDeliveryMediums: ['EMAIL']`.
   *   - Send it through a `CognitoIdentityProviderClient` configured with the
   *     backend's AWS credentials and region.
   *   - Return the resulting `AdminCreateUserResponse` so the caller can
   *     persist the Cognito `sub` / username alongside the application.
   *
   * Side effects (real implementation):
   *   - Cognito sends an invitation email containing the temporary password
   *     to `email` using the user pool's configured message template.
   *   - The user is created in `FORCE_CHANGE_PASSWORD` state and cannot access
   *     any protected resources until they complete the NEW_PASSWORD_REQUIRED
   *     challenge via {@link handleNewPasswordChallenge}.
   *
   * @param email             The applicant's email address. Becomes the
   *                          Cognito username and the destination for the
   *                          invitation email.
   * @param temporaryPassword A temporary password that satisfies the Cognito
   *                          user pool's password policy. The caller is
   *                          expected to generate a high-entropy value.
   * @returns A promise resolving to a fake {@link AdminCreateUserResponse}
   *          that mirrors what Cognito returns on success — includes a
   *          `User` object with `Username`, `UserStatus: 'FORCE_CHANGE_PASSWORD'`,
   *          `Enabled: true`, `UserCreateDate`, `UserLastModifiedDate`, and
   *          the `email` / `email_verified` attributes.
   *
   * @throws {Error} Real implementation will surface:
   *   - `UsernameExistsException` if a user with this email already exists
   *     in the pool.
   *   - `InvalidPasswordException` if `temporaryPassword` does not meet the
   *     pool's password policy.
   *   - `InvalidParameterException` / `NotAuthorizedException` /
   *     `ResourceNotFoundException` for malformed input, missing IAM
   *     permissions, or a misconfigured pool id.
   *   The mock currently throws a generic `Error` when `email` is empty so
   *   callers can exercise the failure path.
   */
  async createCognitoUser(
    email: string,
    temporaryPassword: string,
  ): Promise<AdminCreateUserResponse> {
    this.logger.debug(
      `[MOCK] createCognitoUser called for email=${email} (tempPassword redacted)`,
    );

    if (!email) {
      throw new Error('[MOCK] createCognitoUser: email is required');
    }
    if (!temporaryPassword) {
      throw new Error(
        '[MOCK] createCognitoUser: temporaryPassword is required',
      );
    }

    const now = new Date();
    return {
      User: {
        Username: email,
        Attributes: [
          { Name: 'sub', Value: `mock-sub-${encodeURIComponent(email)}` },
          { Name: 'email', Value: email },
          { Name: 'email_verified', Value: 'true' },
        ],
        UserCreateDate: now,
        UserLastModifiedDate: now,
        Enabled: true,
        UserStatus: 'FORCE_CHANGE_PASSWORD',
      },
    };
  }

  /**
   * MOCK — Does not call AWS. Pretends to complete the
   * `NEW_PASSWORD_REQUIRED` challenge by invoking `RespondToAuthChallenge`.
   *
   * When called from the frontend, the flow is:
   *   1. User logs in with their temporary password via `InitiateAuth` /
   *      Amplify. Cognito replies with `ChallengeName: 'NEW_PASSWORD_REQUIRED'`
   *      and a `Session` token.
   *   2. The frontend prompts the user for a new permanent password and then
   *      calls this method (real implementation will forward `Session`).
   *   3. Cognito validates the new password and responds with
   *      `AuthenticationResult` containing the access, id, and refresh tokens
   *      the user is now authenticated with.
   *
   * In the real implementation this method will:
   *   - Build a `RespondToAuthChallengeCommand` with
   *     `ChallengeName: 'NEW_PASSWORD_REQUIRED'`,
   *     `ClientId: COGNITO_APP_CLIENT_ID`,
   *     `Session: <session from the InitiateAuth response>`, and
   *     `ChallengeResponses: { USERNAME: username, NEW_PASSWORD: newPassword }`
   *     (plus a `SECRET_HASH` if the app client has a secret configured).
   *   - Send it through a `CognitoIdentityProviderClient`.
   *   - Return the `RespondToAuthChallengeResponse` — on success this contains
   *     the `AuthenticationResult` tokens; on some flows it may contain
   *     another `ChallengeName` the frontend has to handle.
   *
   * When is it called? Only after the user has already authenticated once
   * with the temp password and received the `NEW_PASSWORD_REQUIRED` challenge.
   * It is typically invoked from a frontend "set your new password" screen.
   *
   * @param username     The Cognito username (email) of the applicant
   *                     responding to the challenge.
   * @param tempPassword The temporary password that was emailed to the user
   *                     by Cognito in {@link createCognitoUser}. In the real
   *                     flow this is only needed if we re-run `InitiateAuth`
   *                     here; otherwise the caller will pass the `Session`
   *                     string from the prior challenge response. Kept in the
   *                     mock signature to match the ticket spec.
   * @param newPassword  The new permanent password the user chose. Must meet
   *                     the user pool's password policy.
   * @returns A promise resolving to a fake {@link RespondToAuthChallengeResponse}
   *          whose `AuthenticationResult` contains realistically shaped
   *          (but non-functional) `AccessToken`, `IdToken`, `RefreshToken`,
   *          `TokenType: 'Bearer'`, and `ExpiresIn: 3600`.
   *
   * @throws {Error} Real implementation will surface:
   *   - `NotAuthorizedException` if `tempPassword` is wrong or expired.
   *   - `InvalidPasswordException` if `newPassword` does not meet the pool's
   *     password policy.
   *   - `CodeMismatchException` / `ExpiredCodeException` for invalid or
   *     expired `Session` values.
   *   - `UserNotFoundException` if `username` does not exist in the pool.
   *   The mock throws a generic `Error` when any required argument is empty.
   */
  async handleNewPasswordChallenge(
    username: string,
    tempPassword: string,
    newPassword: string,
  ): Promise<RespondToAuthChallengeResponse> {
    this.logger.debug(
      `[MOCK] handleNewPasswordChallenge called for username=${username}`,
    );

    if (!username || !tempPassword || !newPassword) {
      throw new Error(
        '[MOCK] handleNewPasswordChallenge: username, tempPassword, and newPassword are all required',
      );
    }

    return {
      ChallengeParameters: {},
      AuthenticationResult: {
        AccessToken: `mock.access.token.for.${encodeURIComponent(username)}`,
        ExpiresIn: 3600,
        TokenType: 'Bearer',
        RefreshToken: `mock.refresh.token.for.${encodeURIComponent(username)}`,
        IdToken: `mock.id.token.for.${encodeURIComponent(username)}`,
      },
    };
  }

  /**
   * MOCK — Does not call AWS. Pretends to re-trigger the Cognito invitation
   * email by invoking `AdminCreateUser` with `MessageAction: 'RESEND'`.
   *
   * In the real implementation this method will:
   *   - Build an `AdminCreateUserCommand` for `COGNITO_USER_POOL_ID` with
   *     `Username: email`, `MessageAction: 'RESEND'`, and
   *     `DesiredDeliveryMediums: ['EMAIL']`. Per the AWS SDK, `RESEND`
   *     generates a fresh temporary password and re-sends the invitation
   *     email without creating a new user record.
   *   - Send it through a `CognitoIdentityProviderClient`.
   *   - Return the resulting `AdminCreateUserResponse` — the returned `User`
   *     will still be in `FORCE_CHANGE_PASSWORD` state.
   *
   * When is it called?
   *   - The applicant reports they never received the original invitation
   *     email (spam filter, typo on their side, bounce, etc.).
   *   - The original temporary password expired (default is 7 days in
   *     Cognito) before the applicant completed first login.
   *   - Admin is manually re-sending from an admin tool.
   *
   * @param email The email / username of an existing Cognito user who needs
   *              a fresh invitation email. Must already exist in the pool.
   * @returns A promise resolving to a fake {@link AdminCreateUserResponse}
   *          mirroring the create flow.
   *
   * @throws {Error} Real implementation will surface:
   *   - `UserNotFoundException` if no user with `email` exists in the pool.
   *   - `UnsupportedUserStateException` if the user is no longer in
   *     `FORCE_CHANGE_PASSWORD` state (e.g. they already set a permanent
   *     password).
   *   - `NotAuthorizedException` / `ResourceNotFoundException` for missing
   *     IAM permissions or a misconfigured pool id.
   *   The mock throws a generic `Error` when `email` is empty.
   */
  async resendTemporaryPassword(
    email: string,
  ): Promise<AdminCreateUserResponse> {
    this.logger.debug(
      `[MOCK] resendTemporaryPassword called for email=${email}`,
    );

    if (!email) {
      throw new Error('[MOCK] resendTemporaryPassword: email is required');
    }

    const now = new Date();
    return {
      User: {
        Username: email,
        Attributes: [
          { Name: 'sub', Value: `mock-sub-${encodeURIComponent(email)}` },
          { Name: 'email', Value: email },
          { Name: 'email_verified', Value: 'true' },
        ],
        // Simulate Cognito updating `UserLastModifiedDate` while preserving
        // the original `UserCreateDate` — RESEND does not create a new user.
        UserCreateDate: new Date(now.getTime() - 1000 * 60 * 60 * 24),
        UserLastModifiedDate: now,
        Enabled: true,
        UserStatus: 'FORCE_CHANGE_PASSWORD',
      },
    };
  }
}
