import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DisciplinesService } from './disciplines.service';
import { Discipline } from './disciplines.entity';
import { DISCIPLINE_VALUES } from './disciplines.constants';
import { CreateDisciplineRequestDto } from './dto/create-discipline.request.dto';

describe('DisciplinesService', () => {
  let service: DisciplinesService;
  let repository: Repository<Discipline>;

  const mockRepository = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockDiscipline1: Discipline = {
    id: 1,
    name: DISCIPLINE_VALUES.RN,
    admin_emails: ['nie.sa@northeastern.edu', 'rexjeff@gmail.com'],
  };

  const mockDiscipline2: Discipline = {
    id: 2,
    name: DISCIPLINE_VALUES.MD_MedicalStudent_PreMed,
    admin_emails: ['rexjeff@gmail.com'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisciplinesService,
        {
          provide: getRepositoryToken(Discipline),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<DisciplinesService>(DisciplinesService);
    repository = module.get<Repository<Discipline>>(
      getRepositoryToken(Discipline),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of disciplines', async () => {
      const mockDisciplines = [mockDiscipline1, mockDiscipline2];
      mockRepository.find.mockResolvedValue(mockDisciplines);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalled();
      expect(result).toEqual(mockDisciplines);
    });

    it('should return empty array when no disciplines exist', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should pass along any repo errors without information loss', async () => {
      mockRepository.find.mockRejectedValue(
        new Error('There was a problem retrieving the info'),
      );

      await expect(service.findAll()).rejects.toThrow(
        'There was a problem retrieving the info',
      );
    });
  });

  describe('findOne', () => {
    it('should return a single discipline', async () => {
      mockRepository.findOneBy.mockResolvedValue(mockDiscipline1);

      const result = await service.findOne(1);

      expect(repository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(result).toEqual(mockDiscipline1);
    });

    it('should return null when discipline is not found', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      const result = await service.findOne(999);

      expect(repository.findOneBy).toHaveBeenCalledWith({ id: 999 });
      expect(result).toBeNull();
    });

    it('should pass along any repo errors without information loss', async () => {
      mockRepository.findOneBy.mockRejectedValue(
        new Error('There was a problem retrieving the info'),
      );

      await expect(service.findOne(1)).rejects.toThrow(
        'There was a problem retrieving the info',
      );
    });
  });

  describe('create', () => {
    it('should create and save a new discipline', async () => {
      const createDisciplineDto: CreateDisciplineRequestDto = {
        name: DISCIPLINE_VALUES.RN,
        admin_emails: ['nie.sa@northeastern.edu', 'rexjeff@gmail.com'],
      };

      mockRepository.create.mockReturnValue(mockDiscipline1);
      mockRepository.save.mockResolvedValue(mockDiscipline1);

      const result = await service.create(createDisciplineDto);

      expect(repository.create).toHaveBeenCalledWith(createDisciplineDto);
      expect(repository.save).toHaveBeenCalledWith(mockDiscipline1);
      expect(result).toEqual(mockDiscipline1);
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

      mockRepository.create.mockReturnValue(disciplineWithEmptyAdmins);
      mockRepository.save.mockResolvedValue(disciplineWithEmptyAdmins);

      const result = await service.create(createDisciplineDto);

      expect(repository.create).toHaveBeenCalledWith(createDisciplineDto);
      expect(repository.save).toHaveBeenCalledWith(disciplineWithEmptyAdmins);
      expect(result).toEqual(disciplineWithEmptyAdmins);
    });

    it('should pass along repository errors during create', async () => {
      const createDisciplineDto: CreateDisciplineRequestDto = {
        name: DISCIPLINE_VALUES.RN,
        admin_emails: [],
      };

      mockRepository.create.mockReturnValue(mockDiscipline1);
      mockRepository.save.mockRejectedValue(new Error('Save failed'));

      await expect(service.create(createDisciplineDto)).rejects.toThrow(
        'Save failed',
      );
    });
  });

  describe('remove', () => {
    it('should remove and return the discipline', async () => {
      mockRepository.findOneBy.mockResolvedValue(mockDiscipline1);
      mockRepository.remove.mockResolvedValue(mockDiscipline1);

      const result = await service.remove(1);

      expect(repository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(repository.remove).toHaveBeenCalledWith(mockDiscipline1);
      expect(result).toEqual(mockDiscipline1);
    });

    it('should throw NotFoundException when discipline does not exist', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(
        'Discipline with id 999 not found',
      );
      expect(repository.remove).not.toHaveBeenCalled();
    });

    it('should pass along any repo errors without information loss', async () => {
      mockRepository.findOneBy.mockResolvedValue(mockDiscipline1);
      mockRepository.remove.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(service.remove(1)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('addAdmin', () => {
    it('should add an admin id to the discipline', async () => {
      const disciplineBeforeAdd: Discipline = {
        id: 1,
        name: DISCIPLINE_VALUES.RN,
        admin_emails: ['nie.sa@northeastern.edu', 'rexjeff@gmail.com'],
      };
      const disciplineAfterAdd: Discipline = {
        id: 1,
        name: DISCIPLINE_VALUES.RN,
        admin_emails: [
          'nie.sa@northeastern.edu',
          'rexjeff@gmail.com',
          'rexjeff2@gmail.com',
        ],
      };

      mockRepository.findOneBy.mockResolvedValue({ ...disciplineBeforeAdd });
      mockRepository.save.mockResolvedValue(disciplineAfterAdd);

      const result = await service.addAdmin(1, 'rexjeff2@gmail.com');

      expect(repository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          admin_emails: [
            'nie.sa@northeastern.edu',
            'rexjeff@gmail.com',
            'rexjeff2@gmail.com',
          ],
        }),
      );
      expect(result).toEqual(disciplineAfterAdd);
    });

    it('should not add duplicate admin id', async () => {
      const discipline: Discipline = {
        id: 1,
        name: DISCIPLINE_VALUES.RN,
        admin_emails: ['nie.sa@northeastern.edu', 'rexjeff@gmail.com'],
      };

      mockRepository.findOneBy.mockResolvedValue({ ...discipline });
      mockRepository.save.mockResolvedValue(discipline);

      const result = await service.addAdmin(2, 'rexjeff@gmail.com'); // 2 already exists

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          admin_emails: ['nie.sa@northeastern.edu', 'rexjeff@gmail.com'],
        }),
      );
      expect(result.admin_emails).toEqual([
        'nie.sa@northeastern.edu',
        'rexjeff@gmail.com',
      ]);
    });

    it('should add admin to discipline with empty admin_emails', async () => {
      const disciplineEmpty: Discipline = {
        id: 1,
        name: DISCIPLINE_VALUES.RN,
        admin_emails: [],
      };
      const disciplineAfterAdd: Discipline = {
        id: 1,
        name: DISCIPLINE_VALUES.RN,
        admin_emails: ['nie.sa@northeastern.edu'],
      };

      mockRepository.findOneBy.mockResolvedValue({ ...disciplineEmpty });
      mockRepository.save.mockResolvedValue(disciplineAfterAdd);

      const result = await service.addAdmin(1, 'nie.sa@northeastern.edu');

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ admin_emails: ['nie.sa@northeastern.edu'] }),
      );
      expect(result).toEqual(disciplineAfterAdd);
    });

    it('should throw NotFoundException when discipline does not exist', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(
        service.addAdmin(999, 'nie.sa@northeastern.edu'),
      ).rejects.toThrow('Discipline with id 999 not found');
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should pass along any repo errors without information loss', async () => {
      mockRepository.findOneBy.mockResolvedValue(mockDiscipline1);
      mockRepository.save.mockRejectedValue(new Error('Save failed'));

      await expect(
        service.addAdmin(1, 'nie.sa@northeastern.edu'),
      ).rejects.toThrow('Save failed');
    });
  });

  describe('removeAdmin', () => {
    it('should remove an admin id from the discipline', async () => {
      const disciplineBeforeRemove: Discipline = {
        id: 1,
        name: DISCIPLINE_VALUES.RN,
        admin_emails: ['nie.sa@northeastern.edu', 'rexjeff@gmail.com'],
      };
      const disciplineAfterRemove: Discipline = {
        id: 1,
        name: DISCIPLINE_VALUES.RN,
        admin_emails: ['rexjeff@gmail.com', 'nie.sa@northeastern.edu'],
      };

      mockRepository.findOneBy.mockResolvedValue({ ...disciplineBeforeRemove });
      mockRepository.save.mockResolvedValue(disciplineAfterRemove);

      const result = await service.removeAdmin(1, 'rexjeff@gmail.com');

      expect(repository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ admin_emails: ['nie.sa@northeastern.edu'] }),
      );
      expect(result).toEqual(disciplineAfterRemove);
    });

    it('should handle removing non-existent admin id gracefully', async () => {
      const discipline: Discipline = {
        id: 1,
        name: DISCIPLINE_VALUES.RN,
        admin_emails: ['nie.sa@northeastern.edu', 'rexjeff@gmail.com'],
      };

      mockRepository.findOneBy.mockResolvedValue({ ...discipline });
      mockRepository.save.mockResolvedValue(discipline);

      await service.removeAdmin(1, 'nie.sa2@northeastern.edu'); // doesn't exist

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          admin_emails: ['nie.sa@northeastern.edu', 'rexjeff@gmail.com'],
        }),
      );
    });

    it('should handle removing from empty admin_emails array', async () => {
      const disciplineEmpty: Discipline = {
        id: 1,
        name: DISCIPLINE_VALUES.RN,
        admin_emails: [],
      };

      mockRepository.findOneBy.mockResolvedValue({ ...disciplineEmpty });
      mockRepository.save.mockResolvedValue(disciplineEmpty);

      await service.removeAdmin(1, 'rexjeff@gmail.com');

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ admin_emails: [] }),
      );
    });

    it('should throw NotFoundException when discipline does not exist', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(
        service.removeAdmin(999, 'rexjeff@gmail.com'),
      ).rejects.toThrow('Discipline with id 999 not found');
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should pass along any repo errors without information loss', async () => {
      mockRepository.findOneBy.mockResolvedValue(mockDiscipline1);
      mockRepository.save.mockRejectedValue(new Error('Save failed'));

      await expect(service.removeAdmin(1, 'rexjeff@gmail.com')).rejects.toThrow(
        'Save failed',
      );
    });
  });
});
