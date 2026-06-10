import {
  Column,
  Entity,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Represents the desired columns for the database table
 * in the repository for the system's admins.
 */
@Entity('admin_info')
export class AdminInfo {
  /**
   * Email of the admin.
   *
   * Example: 'jane.doe@northeastern.edu'.
   */
  @PrimaryColumn()
  email!: string;

  /**
   * The disciplines of the admin.
   *
   * Example: ["Nursing"]
   */
  @Column({ type: 'text', array: true, default: [] })
  disciplines?: string[];

  /**
   * When the admin was created stored in YYYY-MM-DD format.
   *
   * Example: new Date('2025-01-30').
   */
  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  /**
   * When the admin was last updated stored in YYYY-MM-DD format.
   *
   * Example: new Date('2025-01-30').
   */
  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
