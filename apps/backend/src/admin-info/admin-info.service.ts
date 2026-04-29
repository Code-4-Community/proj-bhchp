import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AdminInfo } from './admin-info.entity';
import { AdminDisciplineMap } from './admin-discipline-map.entity';
import { CreateAdminInfoDto } from './dto/create-admin.dto';
import { UpdateAdminInfoEmailDto } from './dto/update-admin-email.dto';
import { UsersService } from '../users/users.service';
import { DisciplinesService } from '../disciplines/disciplines.service';

export type AdminInfoWithDisciplines = AdminInfo & {
  disciplines: string[];
};

export type DisciplineAdminMap = Record<
  string,
  {
    firstName: string;
    lastName: string;
  }
>;

/**
 * Service to interface with the admin repository.
 */
@Injectable()
export class AdminInfoService {
  constructor(
    @InjectRepository(AdminInfo)
    private readonly adminRepository: Repository<AdminInfo>,
    @InjectRepository(AdminDisciplineMap)
    private readonly adminDisciplineMapRepository: Repository<AdminDisciplineMap>,
    private readonly usersService: UsersService,
    private readonly disciplinesService: DisciplinesService,
  ) {}

  async getOldestDisciplineAdminMap(): Promise<DisciplineAdminMap> {
    const oldestAdmins = await this.adminDisciplineMapRepository
      .createQueryBuilder('map')
      .distinctOn(['map.disciplineKey'])
      .orderBy('map.disciplineKey', 'ASC')
      .addOrderBy('map.createdAt', 'ASC')
      .addOrderBy('map.adminEmail', 'ASC')
      .getMany();

    const mappedEntries = await Promise.all(
      oldestAdmins.map(async (map) => {
        const user = await this.usersService.findOne(map.adminEmail);
        const firstName = user?.firstName ?? map.adminEmail;
        const lastName = user?.lastName ?? '';
        return [map.disciplineKey, { firstName, lastName }] as const;
      }),
    );

    return Object.fromEntries(mappedEntries);
  }

  private async hydrateDisciplines(
    admins: AdminInfo[],
  ): Promise<AdminInfoWithDisciplines[]> {
    if (!admins.length) {
      return [];
    }

    const mappings = await this.adminDisciplineMapRepository.find({
      where: {
        adminEmail: In(admins.map((admin) => admin.email)),
      },
      order: { disciplineKey: 'ASC' },
    });

    const mapByEmail = mappings.reduce<Record<string, string[]>>(
      (acc, mapping) => {
        if (!acc[mapping.adminEmail]) {
          acc[mapping.adminEmail] = [];
        }
        acc[mapping.adminEmail].push(mapping.disciplineKey);
        return acc;
      },
      {},
    );

    return admins.map((admin) => ({
      ...admin,
      disciplines: mapByEmail[admin.email] ?? [],
    }));
  }

  /**
   * Creates an admin in the system.
   * @param createAdminInfoDto object containing all of the necessary fields to create an admin.
   * @returns the new admin object.
   * @throws {Error} anything that the repository throws.
   */
  async create(
    createAdminInfoDto: CreateAdminInfoDto,
  ): Promise<AdminInfoWithDisciplines> {
    const email = createAdminInfoDto.email.trim().toLowerCase();
    const disciplines = [...new Set(createAdminInfoDto.disciplines)];

    await this.disciplinesService.ensureActiveDisciplineKeys(disciplines);

    const saved = await this.adminRepository.manager.transaction(
      async (transactionManager) => {
        const transactionalAdminRepo =
          transactionManager.getRepository(AdminInfo);
        const transactionalMapRepo =
          transactionManager.getRepository(AdminDisciplineMap);

        const admin = transactionalAdminRepo.create({ email });
        const savedAdmin = await transactionalAdminRepo.save(admin);

        await transactionalMapRepo.save(
          disciplines.map((disciplineKey) =>
            transactionalMapRepo.create({
              adminEmail: email,
              disciplineKey,
            }),
          ),
        );

        return savedAdmin;
      },
    );

    return {
      ...saved,
      disciplines,
    };
  }

  /**
   * Returns all admins in the system.
   * @returns a list of admin objects.
   * @throws {Error} anything that the repository throws.
   */
  async findAll(): Promise<AdminInfoWithDisciplines[]> {
    const admins = await this.adminRepository.find();
    return this.hydrateDisciplines(admins);
  }

  /**
   * Returns an admin's information by their email.
   * @param email the email of the desired admin.
   * @returns the admin with the desired email.
   * @throws {NotFoundException} if an admin with the desired email does not exist in the system.
   * @throws {Error} anything that the repository throws.
   */
  async findOne(email: string): Promise<AdminInfoWithDisciplines> {
    const admin = await this.adminRepository.findOne({ where: { email } });
    if (!admin) {
      throw new NotFoundException(`AdminInfo with email ${email} not found`);
    }
    const [hydrated] = await this.hydrateDisciplines([admin]);
    return hydrated;
  }

  /**
   * Returns an admin's information by their email.
   * @param email the email of the desired admin.
   * @returns the admin with the desired email,
   *          or null if an admin with the specified email does not exist in the system.
   * @throws {Error} anything that the repository throws.
   */
  async findByEmail(email: string): Promise<AdminInfoWithDisciplines | null> {
    const admin = await this.adminRepository.findOne({ where: { email } });
    if (!admin) {
      return null;
    }

    const [hydrated] = await this.hydrateDisciplines([admin]);
    return hydrated;
  }

  /**
   * Updates admin's email.
   * @param email the email of the desired admin to update.
   * @param updateEmailDto object containing the new email to update to.
   * @returns the updated admin object.
   * @throws {Error} anything that the repository throws.
   */
  async updateEmail(
    email: string,
    updateEmailDto: UpdateAdminInfoEmailDto,
  ): Promise<AdminInfoWithDisciplines> {
    const newEmail = updateEmailDto.email.trim().toLowerCase();

    await this.adminRepository.manager.transaction(
      async (transactionManager) => {
        const transactionalAdminRepo =
          transactionManager.getRepository(AdminInfo);
        const transactionalMapRepo =
          transactionManager.getRepository(AdminDisciplineMap);

        const admin = await transactionalAdminRepo.findOne({
          where: { email },
        });
        if (!admin) {
          throw new NotFoundException(
            `AdminInfo with email ${email} not found`,
          );
        }

        admin.email = newEmail;
        await transactionalAdminRepo.save(admin);

        await transactionalMapRepo
          .createQueryBuilder()
          .update(AdminDisciplineMap)
          .set({ adminEmail: newEmail })
          .where('adminEmail = :email', { email })
          .execute();
      },
    );

    return this.findOne(newEmail);
  }

  async updateDisciplines(
    email: string,
    disciplines: string[],
  ): Promise<AdminInfoWithDisciplines> {
    const uniqueDisciplines = [...new Set(disciplines)];
    await this.disciplinesService.ensureActiveDisciplineKeys(uniqueDisciplines);

    await this.adminRepository.manager.transaction(
      async (transactionManager) => {
        const transactionalAdminRepo =
          transactionManager.getRepository(AdminInfo);
        const transactionalMapRepo =
          transactionManager.getRepository(AdminDisciplineMap);

        const admin = await transactionalAdminRepo.findOne({
          where: { email },
        });
        if (!admin) {
          throw new NotFoundException(
            `AdminInfo with email ${email} not found`,
          );
        }

        await transactionalMapRepo.delete({ adminEmail: email });
        await transactionalMapRepo.save(
          uniqueDisciplines.map((disciplineKey) =>
            transactionalMapRepo.create({ adminEmail: email, disciplineKey }),
          ),
        );
      },
    );

    return this.findOne(email);
  }

  /**
   * Deletes an admin by email.
   * @param email the email of the admin to be deleted.
   * @throws {Error} anything that the repository throws.
   */
  async remove(email: string): Promise<void> {
    await this.adminRepository.manager.transaction(
      async (transactionManager) => {
        const transactionalAdminRepo =
          transactionManager.getRepository(AdminInfo);
        const transactionalMapRepo =
          transactionManager.getRepository(AdminDisciplineMap);

        const admin = await transactionalAdminRepo.findOne({
          where: { email },
        });
        if (!admin) {
          throw new NotFoundException(
            `AdminInfo with email ${email} not found`,
          );
        }

        await transactionalMapRepo.delete({ adminEmail: email });
        await transactionalAdminRepo.remove(admin);
      },
    );
  }
}
