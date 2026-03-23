import { Injectable } from '@nestjs/common';
import {
  AdminDeleteUserCommand,
  AdminInitiateAuthCommand,
  AttributeType,
  CognitoIdentityProviderClient,
  ConfirmForgotPasswordCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  ListUsersCommand,
  SignUpCommand,
} from '@aws-sdk/client-cognito-identity-provider';

import CognitoAuthConfig from './aws-exports';
import { SignUpDto } from './dtos/sign-up.dto';
import { SignInDto } from './dtos/sign-in.dto';
import { SignInResponseDto } from './dtos/sign-in-response.dto';
import { createHmac } from 'crypto';
import { RefreshTokenDto } from './dtos/refresh-token.dto';
import { UserType } from '../users/types';
import { ConfirmPasswordDto } from './dtos/confirm-password.dto';

/**
 * Service to interface with the external auth provider (AWS Cognito).
 */
@Injectable()
export class AuthService {
  private readonly providerClient: CognitoIdentityProviderClient;
  private readonly clientSecret: string;

  constructor() {
    const accessKeyId =
      process.env.AWS_ACCESS_KEY_ID ?? process.env.NX_AWS_ACCESS_KEY;
    const secretAccessKey =
      process.env.AWS_SECRET_ACCESS_KEY ?? process.env.NX_AWS_SECRET_ACCESS_KEY;

    this.providerClient = new CognitoIdentityProviderClient({
      region: CognitoAuthConfig.region,
      credentials:
        accessKeyId && secretAccessKey
          ? {
              accessKeyId,
              secretAccessKey,
            }
          : undefined,
    });

    this.clientSecret = process.env.COGNITO_CLIENT_SECRET;
  }

  /**
   * Computes the secret hash to authenticate this backend to Cognito.
   * The hash key is the Cognito client secret; the message is username + client ID.
   * @param username Value which depends on the command.
   *                 See: https://docs.aws.amazon.com/cognito/latest/developerguide/signing-up-users-in-your-app.html#cognito-user-pools-computing-secret-hash
   * @returns The HMAC digest for the given username.
   * @throws {Error} If the HMAC handling interface throws an error.
   */
  calculateHash(username: string): string {
    const hmac = createHmac('sha256', this.clientSecret);
    hmac.update(username + CognitoAuthConfig.clientId);
    return hmac.digest('base64');
  }

  async getUser(userSub: string): Promise<AttributeType[]> {
    const listUsersCommand = new ListUsersCommand({
      UserPoolId: CognitoAuthConfig.userPoolId,
      Filter: `sub = "${userSub}"`,
    });

    // TODO need error handling
    const { Users } = await this.providerClient.send(listUsersCommand);
    return Users[0].Attributes;
  }

  /**
   * Creates a user in the external auth provider (AWS Cognito).
   * @param signUpDto Object containing the necessary fields to create a new user.
   * @returns Whether the user was confirmed as created in the external auth provider.
   * @throws {Error} If the external auth client throws an error.
   */
  async signup(
    { firstName, lastName, email, password }: SignUpDto,
    userType: UserType = UserType.STANDARD,
  ): Promise<boolean> {
    // Needs error handling
    const signUpCommand = new SignUpCommand({
      ClientId: CognitoAuthConfig.clientId,
      SecretHash: this.calculateHash(email),
      Username: email,
      Password: password,
      UserAttributes: [
        {
          Name: 'name',
          Value: `${firstName} ${lastName}`,
        },
        // Optional: add a custom Cognito attribute called "role" that also stores the user's status/role
        // If you choose to do so, you'll have to first add this custom attribute in your user pool
        {
          Name: 'custom:role',
          Value: userType,
        },
      ],
    });

    const response = await this.providerClient.send(signUpCommand);
    return response.UserConfirmed;
  }

  /**
   * Verifies a user by email and verification code with the external auth provider (AWS Cognito).
   * @param email The email of the user to verify.
   * @param verificationCode The code required to verify the user with the external auth provider.
   * @throws {Error} If the external auth provider throws an error.
   */
  async verifyUser(email: string, verificationCode: string): Promise<void> {
    const confirmCommand = new ConfirmSignUpCommand({
      ClientId: CognitoAuthConfig.clientId,
      SecretHash: this.calculateHash(email),
      Username: email,
      ConfirmationCode: verificationCode,
    });

    await this.providerClient.send(confirmCommand);
  }

  /**
   * Signs an existing user into the application using the external auth provider.
   * @param signInDto Object containing the necessary fields to sign in a user.
   * @returns SignInResponseDto with session tokens for the user.
   * @throws {Error} If the external auth provider throws an error.
   */
  async signin({ email, password }: SignInDto): Promise<SignInResponseDto> {
    const signInCommand = new AdminInitiateAuthCommand({
      AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
      ClientId: CognitoAuthConfig.clientId,
      UserPoolId: CognitoAuthConfig.userPoolId,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
        SECRET_HASH: this.calculateHash(email),
      },
    });

    const response = await this.providerClient.send(signInCommand);

    return {
      accessToken: response.AuthenticationResult.AccessToken,
      refreshToken: response.AuthenticationResult.RefreshToken,
      idToken: response.AuthenticationResult.IdToken,
    };
  }

  /**
   * Refreshes a user's session token with the external auth provider.
   * @param refreshDto Object containing the necessary fields to refresh the token.
   * @returns SignInResponseDto with the new (refreshed) session tokens for the user.
   * @throws {Error} If the external auth provider throws an error.
   *
   * Note: Refresh token hash uses a user's sub (unique ID), not their username (typically their email).
   */
  async refreshToken({
    refreshToken,
    userSub,
  }: RefreshTokenDto): Promise<SignInResponseDto> {
    const refreshCommand = new AdminInitiateAuthCommand({
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: CognitoAuthConfig.clientId,
      UserPoolId: CognitoAuthConfig.userPoolId,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
        SECRET_HASH: this.calculateHash(userSub),
      },
    });

    const response = await this.providerClient.send(refreshCommand);

    return {
      accessToken: response.AuthenticationResult.AccessToken,
      refreshToken: refreshToken,
      idToken: response.AuthenticationResult.IdToken,
    };
  }

  /**
   * Initiates the forgot-password flow with the external auth provider.
   * @param body The email address of the user who forgot their password.
   * @throws {Error} If the external auth provider throws an error.
   *
   * Does not return a value.
   */
  async forgotPassword(email: string) {
    const forgotCommand = new ForgotPasswordCommand({
      ClientId: CognitoAuthConfig.clientId,
      Username: email,
      SecretHash: this.calculateHash(email),
    });

    await this.providerClient.send(forgotCommand);
  }

  /**
   * Confirms a forgotten password with the external auth provider.
   * @param body Object containing the necessary fields (email, confirmation code, new password) to confirm.
   * @throws {Error} If the external auth provider throws an error.
   *
   * Does not return a value.
   */
  async confirmForgotPassword({
    email,
    confirmationCode,
    newPassword,
  }: ConfirmPasswordDto) {
    const confirmComamnd = new ConfirmForgotPasswordCommand({
      ClientId: CognitoAuthConfig.clientId,
      SecretHash: this.calculateHash(email),
      Username: email,
      ConfirmationCode: confirmationCode,
      Password: newPassword,
    });

    await this.providerClient.send(confirmComamnd);
  }

  /**
   * Deletes a user by email in the external auth provider.
   * @param body The email address of the user to delete.
   * @throws {Error} If the repository or external auth provider throws an error.
   *
   * Does not return a value.
   */
  async deleteUser(email: string): Promise<void> {
    const adminDeleteUserCommand = new AdminDeleteUserCommand({
      Username: email,
      UserPoolId: CognitoAuthConfig.userPoolId,
    });

    await this.providerClient.send(adminDeleteUserCommand);
  }
}
