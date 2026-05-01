import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UserType } from './types';

/**
 * Service to interface with the user repository.
 */
@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}

  /**
   * Creates a user in the repository.
   * @param email Email of the user (primary key).
   * @param firstName First name of the user.
   * @param lastName Last name of the user.
   * @param userType Type of the user (default STANDARD).
   * @returns The created user.
   */
  async create(
    email: string,
    firstName: string,
    lastName: string,
    userType: UserType = UserType.STANDARD,
  ): Promise<User> {
    const user = this.repo.create({
      email,
      firstName,
      lastName,
      userType,
    });
    return this.repo.save(user);
  }

  /**
   * Returns all users.
   * @returns All users in the repository.
   */
  findAll(): Promise<User[]> {
    return this.repo.find();
  }

  /**
   * Returns a user by email.
   * @param email The email of the user to find.
   * @returns The user if they exist, otherwise null.
   */
  findOne(email: string): Promise<User | null> {
    if (!email) {
      return Promise.resolve(null);
    }
    return this.repo.findOneBy({ email });
  }

  /**
   * Returns all users with the given email (at most one when email is unique).
   * @param email The email to search for.
   * @returns Array of users (length 0 or 1).
   */
  find(email: string): Promise<User[]> {
    return this.repo.find({ where: { email } });
  }

  /**
   * Returns all users of type standard
   * @returns Array of users with userType = standard
   */
  findStandard(): Promise<User[]> {
    return this.repo.find({ where: { userType: UserType.STANDARD } });
  }

  /**
   * Updates a user by email.
   * @param email The email of the user to update.
   * @param attrs Partial attributes to apply.
   * @returns The updated user.
   * @throws {NotFoundException} if the user does not exist.
   */
  async update(
    email: string,
    attrs: Partial<Omit<User, 'email'>>,
  ): Promise<User> {
    const user = await this.findOne(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    Object.assign(user, attrs);
    return this.repo.save(user);
  }

  /**
   * Removes a user by email.
   * @param email The email of the user to delete.
   * @throws {NotFoundException} if the user does not exist.
   */
  async remove(email: string): Promise<void> {
    const user = await this.findOne(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.repo.remove(user);
  }
}
