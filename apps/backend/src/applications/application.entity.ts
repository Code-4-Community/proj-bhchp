import { Entity, Column } from 'typeorm';

import type { AppStatus, ExperienceType, Interest, School } from './types';

@Entity()
export class Application {
  @Column({ primary: true })
  appId: number;

  @Column()
  appStatus: AppStatus;

  @Column()
  daysAvailable: string;

  @Column()
  experienceType: ExperienceType;

  // Array of S3 file URLs
  @Column()
  fileUploads: string[];

  @Column()
  interest: Interest;

  @Column()
  license: string;

  @Column()
  isInternational: boolean;

  @Column()
  isLearner: boolean;

  @Column()
  phone: string;

  @Column()
  school: School;

  @Column()
  referred: boolean;

  @Column()
  referredEmail: string;

  @Column()
  weeklyHours: number;
}
