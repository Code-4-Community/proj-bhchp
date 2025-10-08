import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { Status } from '../users/types';

// Mock the entire AWS SDK v3 module
jest.mock('@aws-sdk/client-cognito-identity-provider');

describe('AuthService', () => {
  let service: AuthService;

  // Create a mock for the send method
  const mockSend = jest.fn();

  beforeAll(() => {
    // Set environment variables
    process.env.NX_AWS_ACCESS_KEY = 'test-access-key';
    process.env.NX_AWS_SECRET_ACCESS_KEY = 'test-secret-key';
    process.env.COGNITO_CLIENT_SECRET = 'test-client-secret';
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock the CognitoIdentityProviderClient constructor
    (CognitoIdentityProviderClient as jest.Mock).mockImplementation(() => ({
      send: mockSend,
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateHash', () => {
    it('should generate a valid HMAC hash', () => {
      const email = 'test@northeastern.edu';
      const hash = service.calculateHash(email);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      // Base64 encoded string pattern
      expect(hash).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it('should generate consistent hashes for same input', () => {
      const email = 'test@northeastern.edu';
      const hash1 = service.calculateHash(email);
      const hash2 = service.calculateHash(email);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different inputs', () => {
      const hash1 = service.calculateHash('user1@northeastern.edu');
      const hash2 = service.calculateHash('user2@northeastern.edu');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('signup', () => {
    it('should successfully sign up a new user', async () => {
      const signUpDto = {
        firstName: 'c4c',
        lastName: 'neu',
        email: 'c4c.neu@northestern.edu',
        password: 'SecurePass123!',
      };

      // Mock Cognito response
      mockSend.mockResolvedValueOnce({
        UserConfirmed: false,
        UserSub: 'user-sub-123',
      });

      const result = await service.signup(signUpDto);

      expect(result).toBe(false); // User needs email confirmation
      expect(mockSend).toHaveBeenCalledTimes(1);
      // Just verify that send was called with a command object
      expect(mockSend).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should sign up user with admin status', async () => {
      const signUpDto = {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@northeastern.edu',
        password: 'AdminPass123!',
      };

      mockSend.mockResolvedValueOnce({
        UserConfirmed: false,
        UserSub: 'admin-sub-123',
      });

      const result = await service.signup(signUpDto, Status.ADMIN);

      expect(result).toBe(false);
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should handle username already exists error', async () => {
      const signUpDto = {
        firstName: 'Test',
        lastName: 'User',
        email: 'existing@northeastern.edu',
        password: 'Pass123!',
      };

      mockSend.mockRejectedValueOnce(new Error('UsernameExistsException'));

      await expect(service.signup(signUpDto)).rejects.toThrow(
        'UsernameExistsException',
      );
    });
  });

  describe('verifyUser', () => {
    it('should verify user with confirmation code', async () => {
      mockSend.mockResolvedValueOnce({});

      await service.verifyUser('test@northeastern.edu', '123456');

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should handle invalid confirmation code', async () => {
      mockSend.mockRejectedValueOnce(new Error('CodeMismatchException'));

      await expect(
        service.verifyUser('test@northeastern.edu', 'wrong'),
      ).rejects.toThrow('CodeMismatchException');
    });
  });

  describe('signin', () => {
    it('should authenticate user and return tokens', async () => {
      const signInDto = {
        email: 'c4c.neu@northestern.edu',
        password: 'Password123!',
      };

      mockSend.mockResolvedValueOnce({
        AuthenticationResult: {
          AccessToken: 'access-token-123',
          RefreshToken: 'refresh-token-456',
          IdToken: 'id-token-789',
        },
      });

      const result = await service.signin(signInDto);

      expect(result).toEqual({
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        idToken: 'id-token-789',
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should handle incorrect password', async () => {
      const signInDto = {
        email: 'test@northeastern.edu',
        password: 'WrongPassword',
      };

      mockSend.mockRejectedValueOnce(new Error('NotAuthorizedException'));

      await expect(service.signin(signInDto)).rejects.toThrow(
        'NotAuthorizedException',
      );
    });

    it('should handle unconfirmed user', async () => {
      const signInDto = {
        email: 'unconfirmed@northeastern.edu',
        password: 'Password123!',
      };

      mockSend.mockRejectedValueOnce(new Error('UserNotConfirmedException'));

      await expect(service.signin(signInDto)).rejects.toThrow(
        'UserNotConfirmedException',
      );
    });
  });

  describe('refreshToken', () => {
    it('should refresh access token', async () => {
      const refreshDto = {
        refreshToken: 'old-refresh-token',
        userSub: 'user-sub-123',
      };

      mockSend.mockResolvedValueOnce({
        AuthenticationResult: {
          AccessToken: 'new-access-token',
          IdToken: 'new-id-token',
        },
      });

      const result = await service.refreshToken(refreshDto);

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'old-refresh-token', // Stays the same
        idToken: 'new-id-token',
      });
    });

    it('should handle expired refresh token', async () => {
      const refreshDto = {
        refreshToken: 'expired-token',
        userSub: 'user-sub-123',
      };

      mockSend.mockRejectedValueOnce(
        new Error('NotAuthorizedException: Refresh token expired'),
      );

      await expect(service.refreshToken(refreshDto)).rejects.toThrow(
        'NotAuthorizedException',
      );
    });
  });

  describe('getUser', () => {
    it('should retrieve user attributes by sub', async () => {
      mockSend.mockResolvedValueOnce({
        Users: [
          {
            Attributes: [
              { Name: 'email', Value: 'test@northeastern.edu' },
              { Name: 'name', Value: 'Test User' },
              { Name: 'sub', Value: 'user-sub-123' },
            ],
          },
        ],
      });

      const result = await service.getUser('user-sub-123');

      expect(result).toEqual([
        { Name: 'email', Value: 'test@northeastern.edu' },
        { Name: 'name', Value: 'Test User' },
        { Name: 'sub', Value: 'user-sub-123' },
      ]);
    });

    it('should handle user not found', async () => {
      mockSend.mockResolvedValueOnce({
        Users: [],
      });

      // This will throw because Users[0] is undefined
      await expect(service.getUser('non-existent')).rejects.toThrow();
    });
  });

  describe('forgotPassword', () => {
    it('should initiate password reset', async () => {
      mockSend.mockResolvedValueOnce({
        CodeDeliveryDetails: {
          AttributeName: 'email',
          DeliveryMedium: 'EMAIL',
          Destination: 't***@northeastern.edu',
        },
      });

      await service.forgotPassword('test@northeastern.edu');

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe('confirmForgotPassword', () => {
    it('should reset password with confirmation code', async () => {
      const confirmDto = {
        email: 'test@northeastern.edu',
        confirmationCode: '123456',
        newPassword: 'NewSecurePass123!',
      };

      mockSend.mockResolvedValueOnce({});

      await service.confirmForgotPassword(confirmDto);

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should handle invalid code', async () => {
      const confirmDto = {
        email: 'test@northeastern.edu',
        confirmationCode: 'wrong',
        newPassword: 'NewPass123!',
      };

      mockSend.mockRejectedValueOnce(new Error('CodeMismatchException'));

      await expect(service.confirmForgotPassword(confirmDto)).rejects.toThrow(
        'CodeMismatchException',
      );
    });
  });

  describe('deleteUser', () => {
    it('should delete user from Cognito', async () => {
      mockSend.mockResolvedValueOnce({});

      await service.deleteUser('test@northeastern.edu');

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should handle user not found', async () => {
      mockSend.mockRejectedValueOnce(new Error('UserNotFoundException'));

      await expect(
        service.deleteUser('nonexistent@northeastern.edu'),
      ).rejects.toThrow('UserNotFoundException');
    });
  });
});
