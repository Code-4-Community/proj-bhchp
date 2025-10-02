import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { Site } from './types';

@Entity('admins')
export class Admin {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({
    type: 'enum',
    enum: Site,
  })
  site: Site;

  // Automatically sets the timestamp when the record is created.
  // Useful for tracking when an admin was added to the system.
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  // Automatically updates the timestamp whenever the record is modified.
  // Helps in auditing changes or knowing the last time the admin's data was updated.
  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
