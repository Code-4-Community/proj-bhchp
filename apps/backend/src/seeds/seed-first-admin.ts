import dataSource from '../data-source';
import { AdminInfo } from '../admin-info/admin-info.entity';
import { User } from '../users/user.entity';
import { UserType } from '../users/types';

const FIRST_ADMIN_EMAIL = 'nie.sa@northeastern.edu';

async function seedFirstAdmin(): Promise<void> {
  await dataSource.initialize();

  try {
    const adminInfoRepository = dataSource.getRepository(AdminInfo);
    const userRepository = dataSource.getRepository(User);

    const existingUser = await userRepository.findOne({
      where: { email: FIRST_ADMIN_EMAIL },
    });

    if (existingUser) {
      console.log(`ℹ️ Admin ${FIRST_ADMIN_EMAIL} already exists.`);
      return;
    }

    const adminInfo = adminInfoRepository.create({
      email: FIRST_ADMIN_EMAIL,
      disciplines: [],
    });
    await adminInfoRepository.save(adminInfo);

    const user = userRepository.create({
      email: FIRST_ADMIN_EMAIL,
      firstName: 'Sam',
      lastName: 'Nie',
      userType: UserType.ADMIN,
    });
    await userRepository.save(user);

    console.log(`✅ Created first admin ${FIRST_ADMIN_EMAIL}`);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

seedFirstAdmin().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
