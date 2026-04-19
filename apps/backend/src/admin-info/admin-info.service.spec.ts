import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { AdminInfoService } from './admin-info.service';
import { CreateAdminInfoDto } from './dto/create-admin.dto';
import { UpdateAdminInfoEmailDto } from './dto/update-admin-email.dto';
import { AdminInfo } from './admin-info.entity';
import { DISCIPLINE_VALUES } from '../disciplines/disciplines.constants';
import { UsersService } from '../users/users.service';

describe('AdminInfoService', () => {
  let service: AdminInfoService;
  let repository: Repository<AdminInfo>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockUsersService = {
    findOne: jest.fn(),
  };

  const mockAdminInfo: AdminInfo = {
    email: 'john@example.com',
    discipline: DISCIPLINE_VALUES.RN,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminInfoService,
        {
          provide: getRepositoryToken(AdminInfo),
          useValue: mockRepository,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    service = module.get<AdminInfoService>(AdminInfoService);
    repository = module.get<Repository<AdminInfo>>(
      getRepositoryToken(AdminInfo),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOldestDisciplineAdminMap', () => {
    it('should return one oldest admin per discipline with names', async () => {
      const qb = {
        distinctOn: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            email: 'oldest-rn@example.com',
            discipline: DISCIPLINE_VALUES.RN,
          },
          {
            email: 'oldest-sw@example.com',
            discipline: DISCIPLINE_VALUES.SocialWork,
          },
        ]),
      };
      mockRepository.createQueryBuilder.mockReturnValue(qb);
      mockUsersService.findOne
        .mockResolvedValueOnce({
          email: 'oldest-rn@example.com',
          firstName: 'Alex',
          lastName: 'Kim',
          userType: 'ADMIN',
        })
        .mockResolvedValueOnce({
          email: 'oldest-sw@example.com',
          firstName: 'Jo',
          lastName: 'Rivera',
          userType: 'ADMIN',
        });

      await expect(service.getOldestDisciplineAdminMap()).resolves.toEqual({
        [DISCIPLINE_VALUES.RN]: { firstName: 'Alex', lastName: 'Kim' },
        [DISCIPLINE_VALUES.SocialWork]: {
          firstName: 'Jo',
          lastName: 'Rivera',
        },
      });

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('admin');
      expect(qb.distinctOn).toHaveBeenCalledWith(['admin.discipline']);
      expect(qb.orderBy).toHaveBeenCalledWith('admin.discipline', 'ASC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('admin.createdAt', 'ASC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('admin.email', 'ASC');
    });

    it('should fall back to email when user record is missing', async () => {
      const qb = {
        distinctOn: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            email: 'oldest-rn@example.com',
            discipline: DISCIPLINE_VALUES.RN,
          },
        ]),
      };
      mockRepository.createQueryBuilder.mockReturnValue(qb);
      mockUsersService.findOne.mockResolvedValue(null);

      await expect(service.getOldestDisciplineAdminMap()).resolves.toEqual({
        [DISCIPLINE_VALUES.RN]: {
          firstName: 'oldest-rn@example.com',
          lastName: '',
        },
      });
    });
  });

  describe('create', () => {
    it('should create and save a new admin', async () => {
      const createAdminInfoDto: CreateAdminInfoDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        discipline: DISCIPLINE_VALUES.RN,
      };

      mockRepository.create.mockReturnValue(mockAdminInfo);
      mockRepository.save.mockResolvedValue(mockAdminInfo);

      const result = await service.create(createAdminInfoDto);

      expect(mockRepository.create).toHaveBeenCalledWith({
        email: createAdminInfoDto.email,
        discipline: createAdminInfoDto.discipline,
      });
      expect(mockRepository.save).toHaveBeenCalledWith(mockAdminInfo);
      expect(result).toEqual(mockAdminInfo);
    });

    it('should handle repository errors during creation', async () => {
      const createAdminInfoDto: CreateAdminInfoDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        discipline: DISCIPLINE_VALUES.RN,
      };

      mockRepository.create.mockReturnValue(mockAdminInfo);
      mockRepository.save.mockRejectedValueOnce(new Error('Database error'));

      await expect(service.create(createAdminInfoDto)).rejects.toThrow(
        'Database error',
      );
    });
    it('should pass along any repo errors without information loss during create', async () => {
      const createAdminInfoDto: CreateAdminInfoDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        discipline: DISCIPLINE_VALUES.RN,
      };

      mockRepository.create.mockImplementationOnce(() => {
        throw new Error('There was a problem creating the entry');
      });

      await expect(service.create(createAdminInfoDto)).rejects.toThrow(
        'There was a problem creating the entry',
      );
    });

    it('should pass along any repo errors without information loss during save', async () => {
      const createAdminInfoDto: CreateAdminInfoDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        discipline: DISCIPLINE_VALUES.RN,
      };

      mockRepository.create.mockReturnValue(mockAdminInfo);
      mockRepository.save.mockRejectedValueOnce(
        new Error('There was a problem saving the entry'),
      );

      await expect(service.create(createAdminInfoDto)).rejects.toThrow(
        'There was a problem saving the entry',
      );
    });
  });

  describe('findAll', () => {
    it('should return an array of admins', async () => {
      const mockAdminInfos = [
        mockAdminInfo,
        { ...mockAdminInfo, email: 'jane@example.com' },
      ];
      mockRepository.find.mockResolvedValueOnce(mockAdminInfos);

      const result = await service.findAll();

      expect(mockRepository.find).toHaveBeenCalled();
      expect(result).toEqual(mockAdminInfos);
    });

    it('should return empty array when no admins exist', async () => {
      mockRepository.find.mockResolvedValueOnce([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });

    it('should pass along any repo errors without information loss during retrieval', async () => {
      mockRepository.find.mockRejectedValueOnce(
        new Error('There was a problem retrieving the entries'),
      );

      await expect(service.findAll()).rejects.toThrow(
        'There was a problem retrieving the entries',
      );
    });
  });

  describe('findOne', () => {
    it('should return an admin by email', async () => {
      mockRepository.findOne.mockResolvedValue(mockAdminInfo);

      const result = await service.findOne('john@example.com');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
      });
      expect(result).toEqual(mockAdminInfo);
    });

    it('should throw NotFoundException when admin not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('notfound@example.com')).rejects.toThrow(
        new NotFoundException(
          'AdminInfo with email notfound@example.com not found',
        ),
      );
    });

    it('should pass along any repo errors without information loss during retrieval', async () => {
      mockRepository.findOne.mockRejectedValueOnce(
        new Error('There was a problem retrieving the entry'),
      );

      await expect(service.findOne('john@example.com')).rejects.toThrow(
        'There was a problem retrieving the entry',
      );
    });
  });

  describe('findByEmail', () => {
    it('should return an admin by email', async () => {
      mockRepository.findOne.mockResolvedValue(mockAdminInfo);

      const result = await service.findByEmail('john@example.com');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
      });
      expect(result).toEqual(mockAdminInfo);
    });

    it('should return null when admin not found by email', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });

    it('should pass along any repo errors without information loss during retrieval', async () => {
      mockRepository.findOne.mockImplementationOnce(() => {
        throw new Error('There was a problem retrieving the entries');
      });

      await expect(service.findByEmail('n')).rejects.toThrow(
        'There was a problem retrieving the entries',
      );
    });
  });

  describe('updateEmail', () => {
    it('should update admin email and return the admin', async () => {
      const updateEmailDto: UpdateAdminInfoEmailDto = {
        email: 'newemail@example.com',
      };

      const updatedAdminInfo = {
        ...mockAdminInfo,
        email: 'newemail@example.com',
      };

      mockRepository.findOne.mockResolvedValue(mockAdminInfo);
      mockRepository.save.mockResolvedValue(updatedAdminInfo);

      const result = await service.updateEmail(
        'john@example.com',
        updateEmailDto,
      );

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
      });
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'newemail@example.com' }),
      );
      expect(result.email).toBe('newemail@example.com');
      expect(result.discipline).toBe(mockAdminInfo.discipline);
    });

    it('should throw NotFoundException when admin not found for email update', async () => {
      const updateEmailDto: UpdateAdminInfoEmailDto = {
        email: 'newemail@example.com',
      };

      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateEmail('notfound@example.com', updateEmailDto),
      ).rejects.toThrow(
        new NotFoundException(
          'AdminInfo with email notfound@example.com not found',
        ),
      );
    });

    it('should handle email validation', async () => {
      const updateEmailDto: UpdateAdminInfoEmailDto = {
        email: 'valid@example.com',
      };

      const updatedAdminInfo = { ...mockAdminInfo, email: 'valid@example.com' };

      mockRepository.findOne.mockResolvedValue(mockAdminInfo);
      mockRepository.save.mockResolvedValue(updatedAdminInfo);

      const result = await service.updateEmail(
        'john@example.com',
        updateEmailDto,
      );

      expect(result.email).toBe('valid@example.com');
    });

    it('should pass along any repo errors without information loss during retrieval', async () => {
      const updateEmailDto: UpdateAdminInfoEmailDto = {
        email: 'valid@example.com',
      };

      mockRepository.findOne.mockRejectedValueOnce(
        new Error('There was a problem retrieving the entry'),
      );

      await expect(
        service.updateEmail('john@example.com', updateEmailDto),
      ).rejects.toThrow('There was a problem retrieving the entry');
    });

    it('should pass along any repo errors without information loss during saving', async () => {
      const updateEmailDto: UpdateAdminInfoEmailDto = {
        email: 'valid@example.com',
      };
      mockRepository.findOne.mockResolvedValue(mockAdminInfo);
      mockRepository.save.mockRejectedValueOnce(
        new Error('There was a problem saving the entry'),
      );
      await expect(
        service.updateEmail('john@example.com', updateEmailDto),
      ).rejects.toThrow('There was a problem saving the entry');
    });
  });

  describe('remove', () => {
    it('should remove an admin', async () => {
      mockRepository.findOne.mockResolvedValue(mockAdminInfo);
      mockRepository.remove.mockResolvedValue(mockAdminInfo);

      await service.remove('john@example.com');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
      });
      expect(mockRepository.remove).toHaveBeenCalledWith(mockAdminInfo);
    });

    it('should throw NotFoundException when admin not found for removal', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('notfound@example.com')).rejects.toThrow(
        new NotFoundException(
          'AdminInfo with email notfound@example.com not found',
        ),
      );
    });

    it('should pass along any repo errors without information loss during retrieval', async () => {
      mockRepository.findOne.mockRejectedValueOnce(
        new Error('There was a problem retrieving the entry'),
      );

      await expect(service.remove('john@example.com')).rejects.toThrow(
        'There was a problem retrieving the entry',
      );
    });

    it('should pass along any repo errors without information loss during removal', async () => {
      mockRepository.findOne.mockResolvedValue(mockAdminInfo);
      mockRepository.remove.mockRejectedValueOnce(
        new Error('There was a problem saving the entry'),
      );
      await expect(service.remove('john@example.com')).rejects.toThrow(
        'There was a problem saving the entry',
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
      const updateEmailDto: UpdateAdminInfoEmailDto = {
        email: 'john@example.com',
      };

      mockRepository.findOne.mockResolvedValue(mockAdminInfo);
      mockRepository.save.mockResolvedValue(mockAdminInfo);

      const result = await service.updateEmail(
        'john@example.com',
        updateEmailDto,
      );

      expect(result.email).toBe('john@example.com');
    });
  });
});
