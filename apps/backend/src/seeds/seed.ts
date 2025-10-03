import dataSource from '../data-source';
import { Discipline } from '../disciplines/disciplines.entity';
import { DISCIPLINE_VALUES } from '../disciplines/discplines.constants';
import { User } from '../users/user.entity';
import { Status } from '../users/types';

async function seed() {
  try {
    console.log('🌱 Starting database seed...');

    // Initialize the data source
    await dataSource.initialize();
    console.log('✅ Database connection established');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await dataSource.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');

    // Recreate tables
    await dataSource.synchronize();
    console.log('✅ Database schema synchronized');

    // Create disciplines using enum values
    console.log('📚 Creating disciplines...');
    const disciplines = await dataSource.getRepository(Discipline).save(
      Object.values(DISCIPLINE_VALUES).map((name) => ({
        name,
        admin_ids: [],
      })),
    );
    console.log(`✅ Created ${disciplines.length} disciplines`);

    // Create users
    console.log('📝 Creating users...');
    const users = await dataSource.getRepository(User).save([
      {
        status: Status.ADMIN,
        email: 'yumi.chow@example.com',
        firstName: 'Yumi',
        lastName: 'Chow',
      },
      {
        status: Status.ADMIN,
        email: 'eric.son@example.com',
        firstName: 'Eric',
        lastName: 'Son',
      },
      {
        status: Status.STANDARD,
        email: 'hannah.piersol@example.com',
        firstName: 'Hannah',
        lastName: 'Piersol',
      },
    ]);
    console.log(`✅ Created ${users.length} users`);

    // Assign specific admins to specific disciplines
    disciplines[0].admin_ids = [users[0].id]; // first discipline → first admin
    await dataSource.getRepository(Discipline).save(disciplines[0]);

    disciplines[1].admin_ids = [users[1].id]; // second discipline → second admin
    await dataSource.getRepository(Discipline).save(disciplines[1]);

    // Assign both admins to third discipline
    disciplines[2].admin_ids = [users[0].id, users[1].id];
    await dataSource.getRepository(Discipline).save(disciplines[2]);

    // Leave remaining disciplines without admins or assign as needed
    disciplines[3].admin_ids = [];
    await dataSource.getRepository(Discipline).save(disciplines[3]);

    console.log('✅ Admin users assigned to disciplines');

    console.log('🎉 Database seed completed successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('✅ Database connection closed');
    }
  }
}

// Run the seed
seed().catch((error) => {
  console.error('❌ Fatal error during seed:', error);
  process.exit(1);
});
