import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { UserType } from './types';

const mockRepository = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOneBy: jest.fn(),
  remove: jest.fn(),
};

const mockUser: User = {
  email: 'user@example.com',
  firstName: 'Test',
  lastName: 'User',
  userType: UserType.STANDARD,
};

describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and save a user', async () => {
      mockRepository.create.mockReturnValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);

      await expect(
        service.create('user@example.com', 'Test', 'User'),
      ).resolves.toEqual(mockUser);
      expect(repository.create).toHaveBeenCalledWith({
        email: 'user@example.com',
        firstName: 'Test',
        lastName: 'User',
        userType: UserType.STANDARD,
      });
      expect(repository.save).toHaveBeenCalledWith(mockUser);
    });

    it('should create and save an admin user when userType is provided', async () => {
      const adminUser = { ...mockUser, userType: UserType.ADMIN };
      mockRepository.create.mockReturnValue(adminUser);
      mockRepository.save.mockResolvedValue(adminUser);

      await expect(
        service.create('admin@example.com', 'Admin', 'User', UserType.ADMIN),
      ).resolves.toEqual(adminUser);
      expect(repository.create).toHaveBeenCalledWith({
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        userType: UserType.ADMIN,
      });
    });

    it('should pass through repository save errors during create', async () => {
      mockRepository.create.mockReturnValue(mockUser);
      mockRepository.save.mockRejectedValue(new Error('Save failed'));

      await expect(
        service.create('user@example.com', 'Test', 'User'),
      ).rejects.toThrow('Save failed');
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      mockRepository.find.mockResolvedValue([mockUser]);

      await expect(service.findAll()).resolves.toEqual([mockUser]);
      expect(repository.find).toHaveBeenCalledTimes(1);
    });

    it('should pass through repository errors during findAll', async () => {
      mockRepository.find.mockRejectedValue(new Error('Find failed'));

      await expect(service.findAll()).rejects.toThrow('Find failed');
    });
  });

  describe('findOne', () => {
    it('should return null when email is empty', async () => {
      await expect(service.findOne('')).resolves.toBeNull();
      expect(repository.findOneBy).not.toHaveBeenCalled();
    });

    it('should return a user by email', async () => {
      mockRepository.findOneBy.mockResolvedValue(mockUser);

      await expect(service.findOne('user@example.com')).resolves.toEqual(
        mockUser,
      );
      expect(repository.findOneBy).toHaveBeenCalledWith({
        email: 'user@example.com',
      });
    });

    it('should pass through repository errors during findOne', async () => {
      mockRepository.findOneBy.mockRejectedValue(new Error('Lookup failed'));

      await expect(service.findOne('user@example.com')).rejects.toThrow(
        'Lookup failed',
      );
    });
  });

  describe('find', () => {
    it('should return users matching an email', async () => {
      mockRepository.find.mockResolvedValue([mockUser]);

      await expect(service.find('user@example.com')).resolves.toEqual([
        mockUser,
      ]);
      expect(repository.find).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
      });
    });

    it('should pass through repository errors during find', async () => {
      mockRepository.find.mockRejectedValue(new Error('Find failed'));

      await expect(service.find('user@example.com')).rejects.toThrow(
        'Find failed',
      );
    });
  });

  describe('findStandard', () => {
    it('should return users with standard user type', async () => {
      mockRepository.find.mockResolvedValue([mockUser]);

      await expect(service.findStandard()).resolves.toEqual([mockUser]);
      expect(repository.find).toHaveBeenCalledWith({
        where: { userType: UserType.STANDARD },
      });
    });

    it('should pass through repository errors during findStandard', async () => {
      mockRepository.find.mockRejectedValue(new Error('Find failed'));

      await expect(service.findStandard()).rejects.toThrow('Find failed');
    });
  });

  describe('update', () => {
    it('should update and save a user', async () => {
      mockRepository.findOneBy.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue({
        ...mockUser,
        firstName: 'Updated',
      });

      await expect(
        service.update('user@example.com', { firstName: 'Updated' }),
      ).resolves.toEqual({
        ...mockUser,
        firstName: 'Updated',
      });
      expect(repository.save).toHaveBeenCalledWith({
        ...mockUser,
        firstName: 'Updated',
      });
    });

    it('should throw when updating a missing user', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(
        service.update('missing@example.com', { firstName: 'Updated' }),
      ).rejects.toThrow(new NotFoundException('User not found'));
    });

    it('should pass through repository save errors during update', async () => {
      mockRepository.findOneBy.mockResolvedValue(mockUser);
      mockRepository.save.mockRejectedValue(new Error('Save failed'));

      await expect(
        service.update('user@example.com', { firstName: 'Updated' }),
      ).rejects.toThrow('Save failed');
    });
  });

  describe('remove', () => {
    it('should remove an existing user', async () => {
      mockRepository.findOneBy.mockResolvedValue(mockUser);
      mockRepository.remove.mockResolvedValue(mockUser);

      await expect(service.remove('user@example.com')).resolves.toBeUndefined();
      expect(repository.remove).toHaveBeenCalledWith(mockUser);
    });

    it('should throw when removing a missing user', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.remove('missing@example.com')).rejects.toThrow(
        new NotFoundException('User not found'),
      );
    });

    it('should pass through repository remove errors during delete', async () => {
      mockRepository.findOneBy.mockResolvedValue(mockUser);
      mockRepository.remove.mockRejectedValue(new Error('Remove failed'));

      await expect(service.remove('user@example.com')).rejects.toThrow(
        'Remove failed',
      );
    });
  });
});
