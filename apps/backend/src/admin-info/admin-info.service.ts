import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminInfo } from './admin-info.entity';
import { CreateAdminInfoDto } from './dto/create-admin.dto';
import { UpdateAdminInfoEmailDto } from './dto/update-admin-email.dto';
import { UsersService } from '../users/users.service';

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
  ) {}

  async getOldestDisciplineAdminMap(): Promise<DisciplineAdminMap> {
    const oldestAdmins = await this.adminRepository
      .createQueryBuilder('admin')
      .distinctOn(['admin.discipline'])
      .orderBy('admin.discipline', 'ASC')
      .addOrderBy('admin.createdAt', 'ASC')
      .addOrderBy('admin.email', 'ASC')
      .getMany();

    const mappedEntries = await Promise.all(
      oldestAdmins.map(async (admin) => {
        const user = await this.usersService.findOne(admin.email);
        const firstName = user?.firstName ?? admin.email;
        const lastName = user?.lastName ?? '';
        return [admin.discipline, { firstName, lastName }] as const;
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
    const admin = this.adminRepository.create({
      email: createAdminInfoDto.email,
      discipline: createAdminInfoDto.discipline,
    });
    return await this.adminRepository.save(admin);
  }

  /**
   * Returns all admins in the system.
   * @returns a list of admin objects.
   * @throws {Error} anything that the repository throws.
   */
  async findAll(): Promise<AdminInfo[]> {
    return await this.adminRepository.find();
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
    return await this.adminRepository.findOne({ where: { email } });
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
    const admin = await this.findOne(email);
    admin.email = updateEmailDto.email;
    return await this.adminRepository.save(admin);
  }

  /**
   * Deletes an admin by email.
   * @param email the email of the admin to be deleted.
   * @throws {Error} anything that the repository throws.
   */
  async remove(email: string): Promise<void> {
    const admin = await this.findOne(email);
    await this.adminRepository.remove(admin);
  }
}
