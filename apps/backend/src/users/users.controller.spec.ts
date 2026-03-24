import { Test, TestingModule } from '@nestjs/testing';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { RolesGuard } from '../auth/roles.guard';

describe('UsersController', () => {
  let controller: UsersController;

  const mockUsersService = {
    findOne: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockRolesGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: RolesGuard,
          useValue: mockRolesGuard,
        },
      ],
    }).compile();

    controller = module.get(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns the authenticated database user from /users/me', async () => {
    const currentUser = {
      email: 'jane@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      userType: 'STANDARD',
    };

    await expect(
      controller.getCurrentUser({ user: currentUser as never }),
    ).resolves.toEqual(currentUser);
  });

  it('returns null from /users/me when no user is attached', async () => {
    await expect(controller.getCurrentUser({})).resolves.toBeNull();
  });
});
