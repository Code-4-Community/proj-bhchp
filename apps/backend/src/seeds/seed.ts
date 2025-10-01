import dataSource from '../data-source';
import { Discipline } from '../disciplines/disciplines.entity';
import { DISCIPLINE_VALUES } from '../disciplines/discplines.constants';

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
