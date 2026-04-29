import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminInfo } from './admin-info.entity';
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
    private readonly usersService: UsersService,
    private readonly disciplinesService: DisciplinesService,
  ) {}

  async getOldestDisciplineAdminMap(): Promise<DisciplineAdminMap> {
    const admins = await this.adminRepository.find({
      order: { createdAt: 'ASC', email: 'ASC' },
    });

    const oldestByDiscipline = new Map<string, string>();
    for (const admin of admins) {
      for (const discipline of admin.disciplines ?? []) {
        if (!oldestByDiscipline.has(discipline)) {
          oldestByDiscipline.set(discipline, admin.email);
        }
      }
    }

    const mappedEntries = await Promise.all(
      [...oldestByDiscipline.entries()].map(async ([discipline, email]) => {
        const user = await this.usersService.findOne(email);
        const firstName = user?.firstName ?? email;
        const lastName = user?.lastName ?? '';
        return [discipline, { firstName, lastName }] as const;
      }),
    );

    return Object.fromEntries(mappedEntries);
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

        const admin = transactionalAdminRepo.create({ email, disciplines });
        const savedAdmin = await transactionalAdminRepo.save(admin);

        return savedAdmin;
      },
    );
    return saved as AdminInfoWithDisciplines;
  }

  /**
   * Returns all admins in the system.
   * @returns a list of admin objects.
   * @throws {Error} anything that the repository throws.
   */
  async findAll(): Promise<AdminInfoWithDisciplines[]> {
    return (await this.adminRepository.find()) as AdminInfoWithDisciplines[];
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
    return admin as AdminInfoWithDisciplines;
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
    return admin as AdminInfoWithDisciplines;
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

        const admin = await transactionalAdminRepo.findOne({
          where: { email },
        });
        if (!admin) {
          throw new NotFoundException(
            `AdminInfo with email ${email} not found`,
          );
        }

        admin.disciplines = uniqueDisciplines;
        await transactionalAdminRepo.save(admin);
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

        const admin = await transactionalAdminRepo.findOne({
          where: { email },
        });
        if (!admin) {
          throw new NotFoundException(
            `AdminInfo with email ${email} not found`,
          );
        }
        await transactionalAdminRepo.remove(admin);
      },
    );
  }
}
