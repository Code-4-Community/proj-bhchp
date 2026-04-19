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

  it('should return the current user when present on the request', async () => {
    await expect(
      controller.getCurrentUser({ user: mockUser }),
    ).resolves.toEqual(mockUser);
  });

  it('should return NotFoundException when the request user is missing', async () => {
    const result = await controller.getCurrentUser({});

    expect(result).toBeInstanceOf(NotFoundException);
    expect((result as NotFoundException).message).toBe(
      'No user matching the JWT was found.',
    );
  });
});
