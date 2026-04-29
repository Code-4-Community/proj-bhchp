import { CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('admin_discipline_map')
export class AdminDisciplineMap {
  @PrimaryColumn({ type: 'varchar' })
  adminEmail!: string;

  @PrimaryColumn({ type: 'varchar' })
  disciplineKey!: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt?: Date;
}
