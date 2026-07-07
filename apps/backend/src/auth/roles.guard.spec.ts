import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UsersService } from '../users/users.service';
import { UserType } from '../users/types';
import { User } from '../users/user.entity';

const makeContext = (user: { email?: string }): ExecutionContext => {
  const request: { user?: unknown } = { user };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
};

const makeUser = (overrides: Partial<User> = {}): User => ({
  email: 'ada@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  userType: UserType.ADMIN,
  isActive: true,
  ...overrides,
});

describe('RolesGuard', () => {
  let guard: RolesGuard;
  const reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;
  const usersService = { findOne: jest.fn() };

  beforeEach(() => {
    guard = new RolesGuard(reflector, usersService as unknown as UsersService);
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
      UserType.ADMIN,
    ]);
  });

  afterEach(() => jest.clearAllMocks());

  it('allows an active user with the required role', async () => {
    usersService.findOne.mockResolvedValue(makeUser());

    await expect(
      guard.canActivate(makeContext({ email: 'ada@example.com' })),
    ).resolves.toBe(true);
  });

  it('forbids a deactivated user even with the required role', async () => {
    usersService.findOne.mockResolvedValue(makeUser({ isActive: false }));

    await expect(
      guard.canActivate(makeContext({ email: 'ada@example.com' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('skips checks when no roles are required', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);

    await expect(guard.canActivate(makeContext({}))).resolves.toBe(true);
    expect(usersService.findOne).not.toHaveBeenCalled();
  });
});
