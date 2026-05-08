import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { UserType } from './types';

const mockUsersService = {
  findAll: jest.fn(),
  findStandard: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

const mockUser: User = {
  email: 'user@example.com',
  firstName: 'Test',
  lastName: 'User',
  userType: UserType.STANDARD,
};

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return all users', async () => {
    mockUsersService.findAll.mockResolvedValue([mockUser]);

    await expect(controller.getAllUsers()).resolves.toEqual([mockUser]);
    expect(mockUsersService.findAll).toHaveBeenCalledTimes(1);
  });

  it('should return all standard users', async () => {
    mockUsersService.findStandard.mockResolvedValue([mockUser]);

    await expect(controller.getAllStandardUsers()).resolves.toEqual([mockUser]);
    expect(mockUsersService.findStandard).toHaveBeenCalledTimes(1);
  });

  it('should decode the email before fetching a user', async () => {
    mockUsersService.findOne.mockResolvedValue(mockUser);

    await expect(controller.getUser('user%40example.com')).resolves.toEqual(
      mockUser,
    );
    expect(mockUsersService.findOne).toHaveBeenCalledWith('user@example.com');
  });

  it('should decode the email before removing a user', async () => {
    mockUsersService.remove.mockResolvedValue(undefined);

    await expect(controller.removeUser('user%40example.com')).resolves.toBe(
      undefined,
    );
    expect(mockUsersService.remove).toHaveBeenCalledWith('user@example.com');
  });

  it('should trim names and decode the email before updating a user', async () => {
    const updatedUser = {
      ...mockUser,
      firstName: 'Updated',
      lastName: 'Person',
    };
    mockUsersService.update.mockResolvedValue(updatedUser);

    await expect(
      controller.updateUserByEmail('user%40example.com', {
        firstName: '  Updated  ',
        lastName: ' Person ',
      }),
    ).resolves.toEqual(updatedUser);
    expect(mockUsersService.update).toHaveBeenCalledWith('user@example.com', {
      firstName: 'Updated',
      lastName: 'Person',
    });
  });

  it('should return the existing user when no valid updates are provided', async () => {
    mockUsersService.findOne.mockResolvedValue(mockUser);

    await expect(
      controller.updateUserByEmail('user%40example.com', {}),
    ).resolves.toEqual(mockUser);
    expect(mockUsersService.findOne).toHaveBeenCalledWith('user@example.com');
    expect(mockUsersService.update).not.toHaveBeenCalled();
  });

  it('should return NotFoundException when no valid updates are provided for a missing user', async () => {
    mockUsersService.findOne.mockResolvedValue(null);

    await expect(
      controller.updateUserByEmail('missing%40example.com', {
        firstName: '   ',
        lastName: '',
      }),
    ).rejects.toThrow(new NotFoundException('User not found'));
    expect(mockUsersService.findOne).toHaveBeenCalledWith(
      'missing@example.com',
    );
    expect(mockUsersService.update).not.toHaveBeenCalled();
  });

  it('should return the current user when present on the request', async () => {
    await expect(
      controller.getCurrentUser({ user: mockUser }),
    ).resolves.toEqual(mockUser);
  });

  it('should return NotFoundException when the request user is missing', async () => {
    await expect(controller.getCurrentUser({})).rejects.toThrow(
      new NotFoundException('No user matching the JWT was found.'),
    );
  });
});
