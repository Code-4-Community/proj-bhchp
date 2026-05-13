import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Represents the desired columns for the database table in the repository for the system's candidates.
 */
@Entity('candidate_info')
export class CandidateInfo {
  /**
   * The candidate's email.
   *
   * Example: 'jane.doe@northeastern.edu'.
   */
  @PrimaryColumn({ name: 'email' })
  email: string;

  /**
   * Corresponding application ids of the candidate, oldest to newest.
   */
  @Column({ type: 'int', array: true, default: [] })
  appIds: number[];
}
