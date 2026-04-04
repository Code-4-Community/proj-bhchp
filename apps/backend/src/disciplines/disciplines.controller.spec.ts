import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DisciplinesController } from './disciplines.controller';
import { DisciplinesService } from './disciplines.service';
import { Discipline } from './disciplines.entity';
import { AuthService } from '../auth/auth.service';
import { UsersService } from '../users/users.service';
import { DISCIPLINE_VALUES } from './disciplines.constants';
import { CreateDisciplineRequestDto } from './dto/create-discipline.request.dto';
import { RolesGuard } from '../auth/roles.guard';

jest.mock('../auth/aws-exports', () => ({
  __esModule: true,
  default: {
    AWSConfig: {
      accessKeyId: 'test-access-key',
      secretAccessKey: 'test-secret-key',
    },
    CognitoAuthConfig: {
      userPoolId: 'test-user-pool-id',
      clientId: 'test-client-id',
      region: 'us-east-2',
      clientSecret: 'test-client-secret',
    },
  },
}));

const mockDisciplinesService: Partial<DisciplinesService> = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  remove: jest.fn(),
  addAdmin: jest.fn(),
  removeAdmin: jest.fn(),
};

const mockAuthService = {
  getUser: jest.fn(),
};

const mockUsersService = {
  find: jest.fn(),
  findOne: jest.fn(),
};

const mockRolesGuard = {
  canActivate: jest.fn().mockReturnValue(true),
};

const defaultDiscipline: Discipline = {
  id: 1,
  name: DISCIPLINE_VALUES.RN,
  admin_emails: ['janedoe@gmail.com', 'rexjeff@gmail.com'],
};

describe('DisciplinesController', () => {
  let controller: DisciplinesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DisciplinesController],
      providers: [
        {
          provide: DisciplinesService,
          useValue: mockDisciplinesService,
        },
        {
          provide: getRepositoryToken(Discipline),
          useValue: {},
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
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

    controller = module.get<DisciplinesController>(DisciplinesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAll', () => {
    it('should return all disciplines', async () => {
      const disciplines = [
        defaultDiscipline,
        {
          id: 2,
          name: DISCIPLINE_VALUES.RN,
          admin_emails: ['janedoe@gmail.com', 'rexjeff@gmail.com'],
        },
      ];
      jest
        .spyOn(mockDisciplinesService, 'findAll')
        .mockResolvedValue(disciplines);

      const result = await controller.getAll();

      expect(result).toEqual(disciplines);
      expect(mockDisciplinesService.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no disciplines exist', async () => {
      jest.spyOn(mockDisciplinesService, 'findAll').mockResolvedValue([]);

      const result = await controller.getAll();

      expect(result).toEqual([]);
      expect(mockDisciplinesService.findAll).toHaveBeenCalledTimes(1);
    });

    it('should error out without information loss if the service throws an error', async () => {
      jest
        .spyOn(mockDisciplinesService, 'findAll')
        .mockRejectedValue(
          new Error('There was a problem retrieving the info'),
        );

      await expect(controller.getAll()).rejects.toThrow(
        'There was a problem retrieving the info',
      );
    });
  });

  describe('getOne', () => {
    it('should return a specific discipline', async () => {
      jest
        .spyOn(mockDisciplinesService, 'findOne')
        .mockResolvedValue(defaultDiscipline);

      const result = await controller.getOne('1');

      expect(result).toEqual(defaultDiscipline);
      expect(mockDisciplinesService.findOne).toHaveBeenCalledWith(1);
    });

    it('should return null if discipline is not found', async () => {
      jest.spyOn(mockDisciplinesService, 'findOne').mockResolvedValue(null);

      const result = await controller.getOne('999');

      expect(result).toBeNull();
      expect(mockDisciplinesService.findOne).toHaveBeenCalledWith(999);
    });

    it('should handle service errors when retrieving discipline', async () => {
      const errorMessage = 'There was a problem retrieving the info';
      jest
        .spyOn(mockDisciplinesService, 'findOne')
        .mockRejectedValue(new Error(errorMessage));

      await expect(controller.getOne('1')).rejects.toThrow(errorMessage);
    });

    it('should convert string id to number correctly', async () => {
      jest
        .spyOn(mockDisciplinesService, 'findOne')
        .mockResolvedValue(defaultDiscipline);

      const result = await controller.getOne('42');

      expect(result).toEqual(defaultDiscipline);
      expect(mockDisciplinesService.findOne).toHaveBeenCalledWith(42);
    });
  });

  describe('create', () => {
    it('should create a new discipline', async () => {
      const createDisciplineDto: CreateDisciplineRequestDto = {
        name: DISCIPLINE_VALUES.RN,
        admin_emails: ['janedoe@gmail.com', 'rexjeff@gmail.com'],
      };

      jest
        .spyOn(mockDisciplinesService, 'create')
        .mockResolvedValue(defaultDiscipline);

      const result = await controller.create(createDisciplineDto);

      expect(result).toEqual(defaultDiscipline);
      expect(mockDisciplinesService.create).toHaveBeenCalledWith(
        createDisciplineDto,
      );
    });

    it('should create a discipline with empty admin_emails array', async () => {
      const createDisciplineDto: CreateDisciplineRequestDto = {
        name: DISCIPLINE_VALUES.RN,
        admin_emails: [],
      };

      const disciplineWithEmptyAdmins: Discipline = {
        id: 3,
        name: DISCIPLINE_VALUES.RN,
        admin_emails: [],
      };

      jest
        .spyOn(mockDisciplinesService, 'create')
        .mockResolvedValue(disciplineWithEmptyAdmins);

      const result = await controller.create(createDisciplineDto);

      expect(result).toEqual(disciplineWithEmptyAdmins);
      expect(mockDisciplinesService.create).toHaveBeenCalledWith(
        createDisciplineDto,
      );
    });

    it('should handle service errors when creating discipline', async () => {
      const createDisciplineDto: CreateDisciplineRequestDto = {
        name: DISCIPLINE_VALUES.RN,
        admin_emails: ['janedoe@gmail.com', 'rexjeff@gmail.com'],
      };

      const errorMessage = 'Failed to create discipline';
      jest
        .spyOn(mockDisciplinesService, 'create')
        .mockRejectedValue(new Error(errorMessage));

      await expect(controller.create(createDisciplineDto)).rejects.toThrow(
        errorMessage,
      );
    });

    it('should create discipline with different discipline values', async () => {
      const createDisciplineDto: CreateDisciplineRequestDto = {
        name: DISCIPLINE_VALUES.RN,
        admin_emails: ['nie.sa@northeastern.edu'],
      };

      const RNDiscipline: Discipline = {
        id: 4,
        name: DISCIPLINE_VALUES.RN,
        admin_emails: ['nie.sa@northeastern.edu'],
      };

      jest
        .spyOn(mockDisciplinesService, 'create')
        .mockResolvedValue(RNDiscipline);

      const result = await controller.create(createDisciplineDto);

      expect(result).toEqual(RNDiscipline);
      expect(mockDisciplinesService.create).toHaveBeenCalledWith(
        createDisciplineDto,
      );
    });
  });

  describe('remove', () => {
    it('should delete and return a discipline', async () => {
      jest
        .spyOn(mockDisciplinesService, 'remove')
        .mockResolvedValue(defaultDiscipline);

      const result = await controller.remove(1);

      expect(result).toEqual(defaultDiscipline);
      expect(mockDisciplinesService.remove).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when discipline does not exist', async () => {
      jest
        .spyOn(mockDisciplinesService, 'remove')
        .mockRejectedValue(new Error('Discipline with ID 999 not found'));

      await expect(controller.remove(999)).rejects.toThrow(
        'Discipline with ID 999 not found',
      );
    });

    it('should handle service errors when deleting discipline', async () => {
      const errorMessage = 'Failed to delete discipline';
      jest
        .spyOn(mockDisciplinesService, 'remove')
        .mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(1)).rejects.toThrow(errorMessage);
    });
  });

  describe('addAdmin', () => {
    it('should add an admin to a discipline', async () => {
      const updatedDiscipline: Discipline = {
        id: 1,
        name: DISCIPLINE_VALUES.RN,
        admin_emails: [
          'janedoe@gmail.com',
          'johndoe@gmail.com',
          'rexjeff@gmail.com',
        ],
      };

      jest
        .spyOn(mockDisciplinesService, 'addAdmin')
        .mockResolvedValue(updatedDiscipline);

      const result = await controller.addAdmin(1, 'johndoe@gmail.com');

      expect(result).toEqual(updatedDiscipline);
      expect(mockDisciplinesService.addAdmin).toHaveBeenCalledWith(
        1,
        'johndoe@gmail.com',
      );
    });

    it('should throw NotFoundException when discipline does not exist', async () => {
      jest
        .spyOn(mockDisciplinesService, 'addAdmin')
        .mockRejectedValue(new Error('Discipline with ID 999 not found'));

      await expect(
        controller.addAdmin(999, 'johndoe@gmail.com'),
      ).rejects.toThrow('Discipline with ID 999 not found');
    });

    it('should handle service errors when adding admin', async () => {
      const errorMessage = 'Failed to add admin';
      jest
        .spyOn(mockDisciplinesService, 'addAdmin')
        .mockRejectedValue(new Error(errorMessage));

      await expect(controller.addAdmin(1, 'johndoe@gmail.com')).rejects.toThrow(
        errorMessage,
      );
    });

    it('should handle adding duplicate admin gracefully', async () => {
      // Service doesn't throw for duplicates, just returns unchanged
      jest
        .spyOn(mockDisciplinesService, 'addAdmin')
        .mockResolvedValue(defaultDiscipline);

      const result = await controller.addAdmin(2, 'rexjeff@gmail.com'); // already in defaultDiscipline

      expect(result).toEqual(defaultDiscipline);
      expect(mockDisciplinesService.addAdmin).toHaveBeenCalledWith(
        2,
        'rexjeff@gmail.com',
      );
    });
  });

  describe('removeAdmin', () => {
    it('should remove an admin from a discipline', async () => {
      const updatedDiscipline: Discipline = {
        id: 1,
        name: DISCIPLINE_VALUES.RN,
        admin_emails: ['janedoe@gmail.com'], // 2 was removed
      };

      jest
        .spyOn(mockDisciplinesService, 'removeAdmin')
        .mockResolvedValue(updatedDiscipline);

      const result = await controller.removeAdmin(1, 'rexjeff@gmail.com');

      expect(result).toEqual(updatedDiscipline);
      expect(mockDisciplinesService.removeAdmin).toHaveBeenCalledWith(
        1,
        'rexjeff@gmail.com',
      );
    });

    it('should throw NotFoundException when discipline does not exist', async () => {
      jest
        .spyOn(mockDisciplinesService, 'removeAdmin')
        .mockRejectedValue(new Error('Discipline with ID 999 not found'));

      await expect(
        controller.removeAdmin(999, 'rexjeff@gmail.com'),
      ).rejects.toThrow('Discipline with ID 999 not found');
    });

    it('should handle service errors when removing admin', async () => {
      const errorMessage = 'Failed to remove admin';
      jest
        .spyOn(mockDisciplinesService, 'removeAdmin')
        .mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.removeAdmin(1, 'rexjeff@gmail.com'),
      ).rejects.toThrow(errorMessage);
    });

    it('should handle removing non-existent admin gracefully', async () => {
      // Service doesn't throw, just returns unchanged array
      jest
        .spyOn(mockDisciplinesService, 'removeAdmin')
        .mockResolvedValue(defaultDiscipline);

      const result = await controller.removeAdmin(1, 'rexjeff@gmail.com');

      expect(result).toEqual(defaultDiscipline);
      expect(mockDisciplinesService.removeAdmin).toHaveBeenCalledWith(
        1,
        'rexjeff@gmail.com',
      );
    });
  });
});
