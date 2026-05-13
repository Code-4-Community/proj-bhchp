import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * Represents the desired columns for the database table in the repository for the system's candidates.
 */
@Entity('candidate_info')
export class CandidateInfo {
  /**
   * Corresponding application id of the candidate.
   */
  @PrimaryColumn()
  appId: number;

  /**
   * The candidate's email.
   *
   * Example: 'jane.doe@northeastern.edu'.
   */
  @Index()
  @Column()
  email: string;
}
