import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import {
  AdminsService,
  CreateAdminDto,
  UpdateAdminEmailDto,
} from './admins.service';
import { Admin } from './admin.entity';
import { Site } from './types';

describe('AdminsService', () => {
  let service: AdminsService;
  let repository: Repository<Admin>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockAdmin: Admin = {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    site: Site.FENWAY,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminsService,
        {
          provide: getRepositoryToken(Admin),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AdminsService>(AdminsService);
    repository = module.get<Repository<Admin>>(getRepositoryToken(Admin));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create and save a new admin', async () => {
      const createAdminDto: CreateAdminDto = {
        name: 'John Doe',
        email: 'john@example.com',
        site: Site.FENWAY,
      };

      mockRepository.create.mockReturnValue(mockAdmin);
      mockRepository.save.mockResolvedValue(mockAdmin);

      const result = await service.create(createAdminDto);

      expect(mockRepository.create).toHaveBeenCalledWith(createAdminDto);
      expect(mockRepository.save).toHaveBeenCalledWith(mockAdmin);
      expect(result).toEqual(mockAdmin);
    });

    it('should handle repository errors during creation', async () => {
      const createAdminDto: CreateAdminDto = {
        name: 'John Doe',
        email: 'john@example.com',
        site: Site.FENWAY,
      };

      mockRepository.create.mockReturnValue(mockAdmin);
      mockRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.create(createAdminDto)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('findAll', () => {
    it('should return an array of admins', async () => {
      const mockAdmins = [
        mockAdmin,
        { ...mockAdmin, id: 2, email: 'jane@example.com' },
      ];
      mockRepository.find.mockResolvedValue(mockAdmins);

      const result = await service.findAll();

      expect(mockRepository.find).toHaveBeenCalled();
      expect(result).toEqual(mockAdmins);
    });

    it('should return empty array when no admins exist', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return an admin by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockAdmin);

      const result = await service.findOne(1);

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(mockAdmin);
    });

    it('should throw NotFoundException when admin not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        new NotFoundException('Admin with ID 999 not found'),
      );
    });
  });

  describe('findByEmail', () => {
    it('should return an admin by email', async () => {
      mockRepository.findOne.mockResolvedValue(mockAdmin);

      const result = await service.findByEmail('john@example.com');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
      });
      expect(result).toEqual(mockAdmin);
    });

    it('should return null when admin not found by email', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findBySite', () => {
    it('should return admins filtered by site', async () => {
      const mockAdmins = [mockAdmin];
      mockRepository.find.mockResolvedValue(mockAdmins);

      const result = await service.findBySite(Site.FENWAY);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { site: Site.FENWAY },
      });
      expect(result).toEqual(mockAdmins);
    });

    it('should return empty array when no admins found for site', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findBySite(Site.SITE_A);

      expect(result).toEqual([]);
    });
  });

  describe('updateEmail', () => {
    it('should update admin email and return the admin', async () => {
      const updateEmailDto: UpdateAdminEmailDto = {
        email: 'newemail@example.com',
      };

      const updatedAdmin = { ...mockAdmin, email: 'newemail@example.com' };

      mockRepository.findOne.mockResolvedValue(mockAdmin);
      mockRepository.save.mockResolvedValue(updatedAdmin);

      const result = await service.updateEmail(1, updateEmailDto);

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'newemail@example.com' }),
      );
      expect(result.email).toBe('newemail@example.com');
      expect(result.name).toBe(mockAdmin.name); // Should remain unchanged
      expect(result.site).toBe(mockAdmin.site); // Should remain unchanged
    });

    it('should throw NotFoundException when admin not found for email update', async () => {
      const updateEmailDto: UpdateAdminEmailDto = {
        email: 'newemail@example.com',
      };

      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.updateEmail(999, updateEmailDto)).rejects.toThrow(
        new NotFoundException('Admin with ID 999 not found'),
      );
    });

    it('should handle email validation', async () => {
      const updateEmailDto: UpdateAdminEmailDto = {
        email: 'valid@example.com',
      };

      const updatedAdmin = { ...mockAdmin, email: 'valid@example.com' };

      mockRepository.findOne.mockResolvedValue(mockAdmin);
      mockRepository.save.mockResolvedValue(updatedAdmin);

      const result = await service.updateEmail(1, updateEmailDto);

      expect(result.email).toBe('valid@example.com');
    });
  });

  describe('remove', () => {
    it('should remove an admin', async () => {
      mockRepository.findOne.mockResolvedValue(mockAdmin);
      mockRepository.remove.mockResolvedValue(mockAdmin);

      await service.remove(1);

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockRepository.remove).toHaveBeenCalledWith(mockAdmin);
    });

    it('should throw NotFoundException when admin not found for removal', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(
        new NotFoundException('Admin with ID 999 not found'),
      );
    });
  });

  describe('edge cases', () => {
    it('should handle database connection errors', async () => {
      mockRepository.find.mockRejectedValue(new Error('Connection failed'));

      await expect(service.findAll()).rejects.toThrow('Connection failed');
    });

    it('should handle invalid email format in findByEmail', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('invalid-email');

      expect(result).toBeNull();
    });

    it('should handle email update with same email', async () => {
      const updateEmailDto: UpdateAdminEmailDto = {
        email: 'john@example.com', // Same as current email
      };

      mockRepository.findOne.mockResolvedValue(mockAdmin);
      mockRepository.save.mockResolvedValue(mockAdmin);

      const result = await service.updateEmail(1, updateEmailDto);

      expect(result.email).toBe('john@example.com');
    });
  });
});
