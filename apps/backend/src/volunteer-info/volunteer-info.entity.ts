import { Entity, Column, PrimaryColumn } from 'typeorm';

/**
 * Represents the desired columns for the database table in the repository for the system's volunteer info.
 */
@Entity('volunteer_info')
export class VolunteerInfo {
  /**
   * The id corresponding to the application this information belongs to
   */
  @PrimaryColumn()
  appId!: number;

  /**
   * Free text license field
   */
  @Column({ type: 'varchar' })
  license!: string;
}
