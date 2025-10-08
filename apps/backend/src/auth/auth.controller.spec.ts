import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { BadRequestException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;

  // Create proper mocks with all methods
  const mockAuthService = {
    signup: jest.fn(),
    verifyUser: jest.fn(),
    signin: jest.fn(),
    refreshToken: jest.fn(),
    forgotPassword: jest.fn(),
    confirmForgotPassword: jest.fn(),
    deleteUser: jest.fn(),
  };

  const mockUsersService = {
    create: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService, // No quotes! Use the actual class
          useValue: mockAuthService,
        },
        {
          provide: UsersService, // No quotes! Use the actual class
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /signup', () => {
    it('should create a new user successfully', async () => {
      const signUpDto = {
        firstName: 'c4c',
        lastName: 'neu',
        email: 'c4c.neu@northestern.edu',
        password: 'Password1!',
      };

      const mockUser = {
        id: 1,
        email: 'c4c.neu@northestern.edu',
        firstName: 'c4c',
        lastName: 'neu',
      };

      // Setup mocks
      mockAuthService.signup.mockResolvedValue(false); // Returns false for unconfirmed
      mockUsersService.create.mockResolvedValue(mockUser);

      // Call controller method
      const result = await controller.createUser(signUpDto);

      // Verify results
      expect(result).toEqual(mockUser);
      expect(mockAuthService.signup).toHaveBeenCalledWith(signUpDto);
      expect(mockUsersService.create).toHaveBeenCalledWith(
        'c4c.neu@northestern.edu',
        'c4c',
        'neu',
      );
    });

    it('should throw BadRequestException when Cognito signup fails', async () => {
      const signUpDto = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@northeastern.edu',
        password: 'Pass123!',
      };

      // Mock Cognito error
      mockAuthService.signup.mockRejectedValue(
        new Error('UsernameExistsException'),
      );

      // Verify error is caught and wrapped
      await expect(controller.createUser(signUpDto)).rejects.toThrow(
        BadRequestException,
      );

      // Verify database user was NOT created
      expect(mockUsersService.create).not.toHaveBeenCalled();
    });

    it('should handle database creation failure after successful Cognito signup', async () => {
      const signUpDto = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@husky.neu.edu',
        password: 'Pass123!',
      };

      mockAuthService.signup.mockResolvedValue(false);
      mockUsersService.create.mockRejectedValue(
        new Error('Database connection error'),
      );

      await expect(controller.createUser(signUpDto)).rejects.toThrow(
        'Database connection error',
      );
    });
  });

  describe('POST /signin', () => {
    it('should return tokens on successful signin', async () => {
      const signInDto = {
        email: 'neu.nich@northeastern.edu',
        password: 'Password1!',
      };

      const mockTokens = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        idToken: 'id-token-789',
      };

      mockAuthService.signin.mockResolvedValue(mockTokens);

      const result = await controller.signin(signInDto);

      expect(result).toEqual(mockTokens);
      expect(mockAuthService.signin).toHaveBeenCalledWith(signInDto);
    });

    it('should propagate authentication errors', async () => {
      const signInDto = {
        email: 'test@northeastern.edu',
        password: 'WrongPassword',
      };

      mockAuthService.signin.mockRejectedValue(
        new Error('NotAuthorizedException'),
      );

      await expect(controller.signin(signInDto)).rejects.toThrow(
        'NotAuthorizedException',
      );
    });
  });

  describe('POST /verify', () => {
    it('should verify user email with confirmation code', async () => {
      const verifyDto = {
        email: 'test@northeastern.edu',
        verificationCode: '123456',
      };

      mockAuthService.verifyUser.mockResolvedValue(undefined);

      // The controller method is not async, so we don't await it
      expect(() => controller.verifyUser(verifyDto)).not.toThrow();

      expect(mockAuthService.verifyUser).toHaveBeenCalledWith(
        'test@northeastern.edu',
        '123456',
      );
    });

    it('should throw BadRequestException for invalid verification code', () => {
      const verifyDto = {
        email: 'test@northeastern.edu',
        verificationCode: 'wrong',
      };

      mockAuthService.verifyUser.mockImplementation(() => {
        throw new Error('CodeMismatchException');
      });

      expect(() => controller.verifyUser(verifyDto)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('POST /refresh', () => {
    it('should refresh access token successfully', async () => {
      const refreshDto = {
        refreshToken: 'old-refresh-token',
        userSub: 'user-sub-123',
      };

      const mockNewTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'old-refresh-token',
        idToken: 'new-id-token',
      };

      mockAuthService.refreshToken.mockResolvedValue(mockNewTokens);

      const result = await controller.refresh(refreshDto);

      expect(result).toEqual(mockNewTokens);
    });
  });

  describe('POST /forgotPassword', () => {
    it('should initiate password reset', async () => {
      const forgotDto = {
        email: 'test@northeastern.edu',
      };

      mockAuthService.forgotPassword.mockResolvedValue(undefined);

      await expect(controller.forgotPassword(forgotDto)).resolves.not.toThrow();

      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith(
        'test@northeastern.edu',
      );
    });
  });

  describe('POST /confirmPassword', () => {
    it('should reset password with confirmation code', async () => {
      const confirmDto = {
        email: 'test@northeastern.edu',
        confirmationCode: '123456',
        newPassword: 'NewPassword123!',
      };

      mockAuthService.confirmForgotPassword.mockResolvedValue(undefined);

      await expect(
        controller.confirmPassword(confirmDto),
      ).resolves.not.toThrow();

      expect(mockAuthService.confirmForgotPassword).toHaveBeenCalledWith(
        confirmDto,
      );
    });
  });

  describe('POST /delete', () => {
    it('should delete user from Cognito and database', async () => {
      const deleteDto = {
        userId: 1,
      };

      const mockUser = {
        id: 1,
        email: 'test@northeastern.edu',
        firstName: 'Test',
        lastName: 'User',
      };

      mockUsersService.findOne.mockResolvedValue(mockUser);
      mockAuthService.deleteUser.mockResolvedValue(undefined);
      mockUsersService.remove.mockResolvedValue(undefined);

      await controller.delete(deleteDto);

      // Verify correct order: find user, delete from Cognito, then database
      expect(mockUsersService.findOne).toHaveBeenCalledWith(1);
      expect(mockAuthService.deleteUser).toHaveBeenCalledWith(
        'test@northeastern.edu',
      );
      expect(mockUsersService.remove).toHaveBeenCalledWith(1);
    });

    it('should throw BadRequestException if Cognito deletion fails', async () => {
      const deleteDto = {
        userId: 1,
      };

      const mockUser = {
        id: 1,
        email: 'test@northeastern.edu',
      };

      mockUsersService.findOne.mockResolvedValue(mockUser);
      mockAuthService.deleteUser.mockRejectedValue(
        new Error('UserNotFoundException'),
      );

      await expect(controller.delete(deleteDto)).rejects.toThrow(
        BadRequestException,
      );

      // Database deletion should NOT happen if Cognito fails
      expect(mockUsersService.remove).not.toHaveBeenCalled();
    });
  });
});
