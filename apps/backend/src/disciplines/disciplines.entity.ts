import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Represents the desired columns for the database table
 * in the repository for the system's medical disciplines
 * (BHCHP medical discipline) and their admin emails.
 *
 * e.g.: Volunteers, Nursing, Public Health, MD, PA, NP,.
 * Research, Social work, Psychiatry, Pharmacy, IT.
 */
@Entity('discipline')
export class Discipline {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true, nullable: false })
  key!: string;

  @Column({ type: 'varchar', unique: true, nullable: false })
  label!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt?: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt?: Date;
}
