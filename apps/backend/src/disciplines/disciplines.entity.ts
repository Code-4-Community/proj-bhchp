import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// describes a BHCHP medical discipline
// Current list of disciplines: Volunteers, Nursing, Public Health, MD, PA, NP,
// Research, Social work, Psychiatry, Pharmacy, IT
@Entity()
export class Discipline {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  name: string;

  @Column({ type: 'int', array: true, default: () => "'{}'" })
  admin_ids: number[];
}
