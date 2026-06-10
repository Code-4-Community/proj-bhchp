import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminInfo } from './admin-info.entity';
import { CreateAdminInfoDto } from './dto/create-admin.dto';
import { UpdateAdminInfoEmailDto } from './dto/update-admin-email.dto';
import { UsersService } from '../users/users.service';
import { DisciplinesService } from '../disciplines/disciplines.service';

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

  /**
   * Returns a map of discipline key to the oldest admin assigned to that discipline.
   * @returns discipline -> admin name map for landing-page display.
   * @throws {Error} anything that the repository or user service throws.
   */
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
  async create(createAdminInfoDto: CreateAdminInfoDto): Promise<AdminInfo> {
    const email = createAdminInfoDto.email.trim().toLowerCase();
    const disciplines = [
      ...new Set(
        createAdminInfoDto.disciplines
          .map((discipline) => discipline.trim().toLowerCase())
          .filter((discipline) => discipline.length > 0),
      ),
    ];

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
    return saved;
  }

  /**
   * Returns all admins in the system.
   * @returns a list of admin objects.
   * @throws {Error} anything that the repository throws.
   */
  async findAll(): Promise<AdminInfo[]> {
    return this.adminRepository.find();
  }

  /**
   * Returns an admin's information by their email.
   * @param email the email of the desired admin.
   * @returns the admin with the desired email.
   * @throws {NotFoundException} if an admin with the desired email does not exist in the system.
   * @throws {Error} anything that the repository throws.
   */
  async findOne(email: string): Promise<AdminInfo> {
    const admin = await this.adminRepository.findOne({ where: { email } });
    if (!admin) {
      throw new NotFoundException(`AdminInfo with email ${email} not found`);
    }
    return admin;
  }

  /**
   * Returns an admin's information by their email.
   * @param email the email of the desired admin.
   * @returns the admin with the desired email,
   *          or null if an admin with the specified email does not exist in the system.
   * @throws {Error} anything that the repository throws.
   */
  async findByEmail(email: string): Promise<AdminInfo | null> {
    const admin = await this.adminRepository.findOne({ where: { email } });
    if (!admin) {
      return null;
    }
    return admin;
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
  ): Promise<AdminInfo> {
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

  /**
   * Replaces an admin's discipline assignments.
   * @param email the admin email to update.
   * @param disciplines the full list of disciplines that should be assigned.
   * @returns the updated admin object.
   * @throws {NotFoundException} if an admin with the desired email does not exist.
   * @throws {BadRequestException} if any provided discipline is invalid or inactive.
   * @throws {Error} anything that the repository throws.
   */
  async updateDisciplines(
    email: string,
    disciplines: string[],
  ): Promise<AdminInfo> {
    const normalizedDisciplines = disciplines
      .map((discipline) => discipline.trim().toLowerCase())
      .filter((discipline) => discipline.length > 0);
    const uniqueDisciplines = [...new Set(normalizedDisciplines)];
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
