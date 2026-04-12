import { CognitoService } from './cognito.service';

/**
 * These tests cover the SCAFFOLD / MOCK behavior of {@link CognitoService}.
 *
 * The goal is to lock in the fake return shapes so that:
 *   (1) downstream callers (applications service, frontend challenge screen)
 *       can rely on the mocks while the real AWS implementation is pending,
 *   (2) any accidental change to the mock surface is caught early,
 *   (3) when the real implementation lands, these tests can be rewritten to
 *       use `aws-sdk-client-mock` against the real `CognitoIdentityProviderClient`
 *       without changing the public interface of the service.
 *
 * None of these tests hit AWS. They intentionally do not import
 * `aws-exports` so they don't need any env vars.
 */
describe('CognitoService (scaffold / mock)', () => {
  let service: CognitoService;

  beforeEach(() => {
    service = new CognitoService();
  });

  describe('createCognitoUser', () => {
    it('returns a realistically-shaped AdminCreateUserResponse', async () => {
      const email = 'applicant@example.com';
      const response = await service.createCognitoUser(email, 'Temp!Pass123');

      expect(response.User).toBeDefined();
      expect(response.User?.Username).toBe(email);
      expect(response.User?.Enabled).toBe(true);
      expect(response.User?.UserStatus).toBe('FORCE_CHANGE_PASSWORD');
      expect(response.User?.UserCreateDate).toBeInstanceOf(Date);
      expect(response.User?.UserLastModifiedDate).toBeInstanceOf(Date);

      const attributes = response.User?.Attributes ?? [];
      expect(attributes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ Name: 'email', Value: email }),
          expect.objectContaining({ Name: 'email_verified', Value: 'true' }),
          expect.objectContaining({ Name: 'sub' }),
        ]),
      );
    });

    it('throws when email is empty', async () => {
      await expect(
        service.createCognitoUser('', 'Temp!Pass123'),
      ).rejects.toThrow('[MOCK] createCognitoUser: email is required');
    });

    it('throws when temporaryPassword is empty', async () => {
      await expect(
        service.createCognitoUser('applicant@example.com', ''),
      ).rejects.toThrow(
        '[MOCK] createCognitoUser: temporaryPassword is required',
      );
    });
  });

  describe('handleNewPasswordChallenge', () => {
    it('returns realistic Cognito auth tokens on success', async () => {
      const username = 'applicant@example.com';
      const response = await service.handleNewPasswordChallenge(
        username,
        'Temp!Pass123',
        'NewPermanent!Pass456',
      );

      expect(response.AuthenticationResult).toBeDefined();
      const auth = response.AuthenticationResult!;
      expect(typeof auth.AccessToken).toBe('string');
      expect(typeof auth.IdToken).toBe('string');
      expect(typeof auth.RefreshToken).toBe('string');
      expect(auth.TokenType).toBe('Bearer');
      expect(auth.ExpiresIn).toBe(3600);

      // The mock embeds the username so callers can differentiate tokens in
      // test fixtures — lock it down so nobody accidentally drops it.
      expect(auth.AccessToken).toContain(encodeURIComponent(username));
      expect(auth.IdToken).toContain(encodeURIComponent(username));
      expect(auth.RefreshToken).toContain(encodeURIComponent(username));
    });

    it.each([
      ['', 'temp', 'new'],
      ['user', '', 'new'],
      ['user', 'temp', ''],
    ])(
      'throws when any required argument is empty (%s, %s, %s)',
      async (username, tempPassword, newPassword) => {
        await expect(
          service.handleNewPasswordChallenge(
            username,
            tempPassword,
            newPassword,
          ),
        ).rejects.toThrow(
          '[MOCK] handleNewPasswordChallenge: username, tempPassword, and newPassword are all required',
        );
      },
    );
  });

  describe('resendTemporaryPassword', () => {
    it('returns an AdminCreateUserResponse matching the RESEND flow', async () => {
      const email = 'applicant@example.com';
      const response = await service.resendTemporaryPassword(email);

      expect(response.User).toBeDefined();
      expect(response.User?.Username).toBe(email);
      expect(response.User?.UserStatus).toBe('FORCE_CHANGE_PASSWORD');
      expect(response.User?.Enabled).toBe(true);

      // RESEND must not look like a fresh create: the mock sets
      // UserCreateDate earlier than UserLastModifiedDate to mirror what
      // Cognito returns when it re-sends the invitation for an existing user.
      const createDate = response.User?.UserCreateDate?.getTime() ?? 0;
      const modifiedDate = response.User?.UserLastModifiedDate?.getTime() ?? 0;
      expect(createDate).toBeLessThan(modifiedDate);
    });

    it('throws when email is empty', async () => {
      await expect(service.resendTemporaryPassword('')).rejects.toThrow(
        '[MOCK] resendTemporaryPassword: email is required',
      );
    });
  });

  describe('no-AWS guarantee', () => {
    it('does not instantiate an AWS SDK client', () => {
      // The mock must not import any AWS SDK client at runtime — if it did,
      // the service would either hit real AWS or require credentials. The
      // easiest way to assert that is to confirm the service has no own
      // properties beyond the logger.
      const ownProps = Object.getOwnPropertyNames(service);
      expect(ownProps).toEqual(['logger']);
    });
  });
});
