import { Entity, Column, PrimaryColumn } from 'typeorm';

import { UserType } from './types';

/**
 * Represents the desired columns for the database table
 * in the repository for the system's users.
 */
@Entity()
export class User {
  /**
   * Email of the user (primary key).
   *
   * Example: 'jane.doe@northeastern.edu'.
   */
  @PrimaryColumn({ type: 'varchar' })
  email: string;

  /**
   * First name of the user.
   *
   * Example: 'Jane'.
   */
  @Column({ type: 'varchar' })
  firstName: string;

  /**
   * Last name of the user.
   *
   * Example: 'Doe'.
   */
  @Column({ type: 'varchar' })
  lastName: string;

  /**
   * Type of the user (admin or standard).
   *
   * Example: UserType.STANDARD.
   */
  @Column({ type: 'enum', enum: UserType, default: UserType.STANDARD })
  userType: UserType;

  /**
   * Whether the account is active. Deactivated accounts are blocked from
   * accessing protected routes and have their Cognito user disabled.
   *
   * Example: true.
   */
  @Column({ type: 'boolean', default: true })
  isActive?: boolean;
}
