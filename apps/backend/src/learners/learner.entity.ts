import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Represents the desired columns for the database table in the repository for the system's learners.
 */
@Entity()
export class Learner {
  /**
   * Auto-generated id of the learner, not the same as their application id.
   */
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Corresponding application id of the learner.
   */
  @Column({ name: 'app_id' })
  appId: number;

  /**
   * The learner's first name.
   *
   * Example: 'Jane'.
   */
  @Column()
  firstName: string;

  /**
   * The learner's last name.
   *
   * Example: 'Doe'.
   */
  @Column()
  lastName: string;

  /**
   * The expected start date for the learner's commitment, stored in YYYY-MM-DD format.
   *
   * Example: new Date('2024-06-30').
   */
  @Column({ type: 'date' })
  startDate: Date;

  /**
   * The expected end date for the learner's commitment, stored in YYYY-MM-DD format.
   *
   * Example: new Date('2024-06-30').
   */
  @Column({ type: 'date' })
  endDate: Date;
}
