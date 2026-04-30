import { Test, TestingModule } from '@nestjs/testing';
import { DisciplinesController } from './disciplines.controller';
import { DisciplinesService } from './disciplines.service';
import { Discipline } from './disciplines.entity';
import { UsersService } from '../users/users.service';
import { RolesGuard } from '../auth/roles.guard';

jest.mock('../util/aws-exports', () => ({
  __esModule: true,
  default: {
    AWSConfig: {
      accessKeyId: 'test-access-key',
      secretAccessKey: 'test-secret-key',
      region: 'us-east-2',
      bucketName: 'bucket',
    },
    CognitoAuthConfig: {
      userPoolId: 'test-user-pool-id',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    },
  },
}));

const mockDisciplinesService = {
  findAll: jest.fn(),
  findAllIncludingInactive: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  remove: jest.fn(),
};

const mockRolesGuard = {
  canActivate: jest.fn(() => true),
};

const mockUsersService = {
  findOne: jest.fn(),
};

describe('DisciplinesController', () => {
  let controller: DisciplinesController;

  const discipline: Discipline = {
    id: 1,
    key: 'rn',
    label: 'RN',
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DisciplinesController],
      providers: [
        {
          provide: DisciplinesService,
          useValue: mockDisciplinesService,
        },
        {
          provide: RolesGuard,
          useValue: mockRolesGuard,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
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

  it('should return all disciplines', async () => {
    mockDisciplinesService.findAll.mockResolvedValue([discipline]);

    const result = await controller.getAll(undefined);

    expect(result).toEqual([discipline]);
    expect(mockDisciplinesService.findAll).toHaveBeenCalled();
    expect(
      mockDisciplinesService.findAllIncludingInactive,
    ).not.toHaveBeenCalled();
  });

  it('getAll should include inactive when query flag is true', async () => {
    mockDisciplinesService.findAllIncludingInactive.mockResolvedValue([
      discipline,
      { ...discipline, id: 2, key: 'other', label: 'Other', isActive: false },
    ]);

    const result = await controller.getAll('true');

    expect(result).toHaveLength(2);
    expect(mockDisciplinesService.findAllIncludingInactive).toHaveBeenCalled();
  });

  it('should convert string id to number correctly', async () => {
    mockDisciplinesService.findOne.mockResolvedValue(discipline);

    const result = await controller.getOne(1);

    expect(result).toEqual(discipline);
    expect(mockDisciplinesService.findOne).toHaveBeenCalledWith(1);
  });

  it('should create a new discipline', async () => {
    const dto = { key: 'rn', label: 'RN' };
    mockDisciplinesService.create.mockResolvedValue(discipline);

    const result = await controller.create(dto);

    expect(result).toEqual(discipline);
    expect(mockDisciplinesService.create).toHaveBeenCalledWith(dto);
  });

  it('should delete and return a discipline', async () => {
    mockDisciplinesService.remove.mockResolvedValue(discipline);

    const result = await controller.remove(1);

    expect(result).toEqual(discipline);
    expect(mockDisciplinesService.remove).toHaveBeenCalledWith(1);
  });
});
