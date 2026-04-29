import { DataSource } from 'typeorm';
import { AdminInfo } from './admin-info/admin-info.entity';
import { User } from './users/user.entity';
import { PluralNamingStrategy } from './strategies/plural-naming.strategy';
import * as dotenv from 'dotenv';
import { Application } from './applications/application.entity';
import { Discipline } from './disciplines/disciplines.entity';
import { LearnerInfo } from './learner-info/learner-info.entity';
import { CandidateInfo } from './candidate-info/candidate-info.entity';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.NX_DB_HOST,
  port: parseInt(process.env.NX_DB_PORT as string, 10),
  username: process.env.NX_DB_USERNAME,
  password: process.env.NX_DB_PASSWORD,
  database: process.env.NX_DB_DATABASE,
  entities: [
    Application,
    CandidateInfo,
    AdminInfo,
    Discipline,
    LearnerInfo,
    User,
  ],
  // migrations: ['apps/backend/src/migrations/*.js'], // use this line before pushing to github so that it works on the deployment server
  migrations: ['apps/backend/src/migrations/*.ts'], // use this line when running migrations locally
  // Setting synchronize: true shouldn't be used in production - otherwise you can lose production data
  synchronize: false,
  namingStrategy: new PluralNamingStrategy(),
});

export default AppDataSource;
