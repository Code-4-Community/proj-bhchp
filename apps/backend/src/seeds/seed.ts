import { DeepPartial, Repository } from 'typeorm';
import dataSource from '../data-source';
import { Discipline } from '../disciplines/disciplines.entity';
import { DISCIPLINE_VALUES } from '../disciplines/disciplines.constants';
import { Application } from '../applications/application.entity';
import {
  AppStatus,
  ExperienceType,
  InterestArea,
  ApplicantType,
  HeardAboutFrom,
} from '../applications/types';
import { LearnerInfo } from '../learner-info/learner-info.entity';
import { School } from '../learner-info/types';
import { VolunteerInfo } from '../volunteer-info/volunteer-info.entity';
import { CandidateInfo } from '../candidate-info/candidate-info.entity';
import { AdminInfo } from '../admin-info/admin-info.entity';
import { User } from '../users/user.entity';
import { UserType } from '../users/types';

const ADMIN_INFO_SEED = [
  {
    email: 'superadmin@c4cneu.com',
    discipline: DISCIPLINE_VALUES.RN,
  },
  {
    email: 'linda.johnson@northeastern.edu',
    discipline: DISCIPLINE_VALUES.PublicHealth,
  },
  {
    email: 'lucine.armen@northeastern.edu',
    discipline: DISCIPLINE_VALUES.SocialWork,
  },
];

const CANDIDATE_INFO_SEED: CandidateInfo[] = [
  {
    appId: 1,
    email: 'janedoe@gmail.com',
  },
  {
    appId: 2,
    email: 'johndoe@gmail.com',
  },
  {
    appId: 3,
    email: 'sam@example.com',
  },
];

const USER_SEED: User[] = [
  {
    email: 'superadmin@c4cneu.com',
    firstName: 'indie',
    lastName: 'kitt',
    userType: UserType.ADMIN,
  },
  {
    email: 'linda.johnson@northeastern.edu',
    firstName: 'linda',
    lastName: 'johnson',
    userType: UserType.ADMIN,
  },
  {
    email: 'lucine.armen@northeastern.edu',
    firstName: 'lucine',
    lastName: 'armen',
    userType: UserType.ADMIN,
  },
  {
    email: 'janedoe@gmail.com',
    firstName: 'jane',
    lastName: 'doe',
    userType: UserType.STANDARD,
  },
  {
    email: 'johndoe@gmail.com',
    firstName: 'john',
    lastName: 'doe',
    userType: UserType.STANDARD,
  },
  {
    email: 'sam@example.com',
    firstName: 'sam',
    lastName: 'nie',
    userType: UserType.STANDARD,
  },
];

const APPLICATION_SEED: Application[] = [
  {
    appId: 1,
    appStatus: AppStatus.APP_SUBMITTED,
    mondayAvailability: '12pm and on every other week',
    tuesdayAvailability: 'approximately 10am-3pm',
    wednesdayAvailability: 'no availability',
    thursdayAvailability: 'maybe before 10am',
    fridayAvailability: 'Sometime between 4-6',
    saturdayAvailability: 'no availability',
    experienceType: ExperienceType.BS,
    interest: [
      InterestArea.MEDICAL_RESPITE_INPATIENT,
      InterestArea.FAMILY_AND_YOUTH_SERVICES,
    ],
    license: 'nursing license',
    applicantType: ApplicantType.VOLUNTEER,
    phone: '123-456-7890',
    email: 'janedoe@gmail.com',
    discipline: DISCIPLINE_VALUES.Psychiatry_or_Psychiatric_NP_PA,
    referred: false,
    weeklyHours: 20,
    pronouns: 'she/her',
    nonEnglishLangs: 'spoken chinese only',
    desiredExperience:
      'I want to give back to the boston community and learn to talk better with patients',
    resume: 'janedoe_resume_2_6_2026.pdf',
    coverLetter: 'janedoe_coverLetter_2_6_2026.pdf',
    emergencyContactName: 'Bob Doe',
    emergencyContactPhone: '111-111-1111',
    emergencyContactRelationship: 'Mother',
    proposedStartDate: new Date('2024-01-01'),
    endDate: new Date('2024-06-30'),
    heardAboutFrom: [],
  },
  {
    appId: 2,
    appStatus: AppStatus.IN_REVIEW,
    mondayAvailability: '12pm and on every other week',
    tuesdayAvailability: 'approximately 10am-3pm',
    wednesdayAvailability: 'no availability',
    thursdayAvailability: 'maybe before 10am',
    fridayAvailability: 'Sometime between 4-6',
    saturdayAvailability: 'no availability',
    experienceType: ExperienceType.BS,
    interest: [InterestArea.HEP_C_CARE],
    license: 'n/a',
    applicantType: ApplicantType.LEARNER,
    phone: '123-456-7890',
    email: 'johndoe@gmail.com',
    discipline: DISCIPLINE_VALUES.RN,
    referred: false,
    weeklyHours: 20,
    pronouns: 'he/him',
    nonEnglishLangs: 'spoken chinese only',
    desiredExperience:
      'I want to give back to the boston community and learn to talk better with patients',
    resume: 'johndoe_resume_2_6_2026.pdf',
    coverLetter: 'johndoe_coverLetter_2_6_2026.pdf',
    emergencyContactName: 'Bob Doe',
    emergencyContactPhone: '111-111-1111',
    emergencyContactRelationship: 'Mother',
    proposedStartDate: new Date('2026-01-01'),
    endDate: new Date('2026-06-30'),
    heardAboutFrom: [HeardAboutFrom.OTHER, HeardAboutFrom.SCHOOL],
  },
  {
    appId: 3,
    appStatus: AppStatus.INACTIVE,
    mondayAvailability: '12pm and on every other week',
    tuesdayAvailability: 'approximately 10am-3pm',
    wednesdayAvailability: 'no availability',
    thursdayAvailability: 'maybe before 10am',
    fridayAvailability: 'Sometime between 4-6',
    saturdayAvailability: 'no availability',
    experienceType: ExperienceType.BS,
    interest: [InterestArea.WOMENS_HEALTH],
    license: 'n/a',
    applicantType: ApplicantType.VOLUNTEER,
    phone: '123-456-7890',
    email: 'sam@example.com',
    discipline: DISCIPLINE_VALUES.SocialWork,
    referred: false,
    weeklyHours: 20,
    pronouns: 'they/them',
    nonEnglishLangs: 'spoken chinese only',
    desiredExperience:
      'I want to give back to the boston community and learn to talk better with patients',
    resume: 'sam_resume_2_6_2026.pdf',
    coverLetter: 'sam_coverLetter_2_6_2026.pdf',
    emergencyContactName: 'sam senior',
    emergencyContactPhone: '111-111-1111',
    emergencyContactRelationship: 'Mother',
    proposedStartDate: new Date('2024-01-01'),
    endDate: new Date('2024-06-30'),
    heardAboutFrom: [HeardAboutFrom.ONLINE_SEARCH],
  },
];

const LEARNER_INFO_SEED: LearnerInfo[] = [
  {
    appId: 2,
    school: School.HARVARD_MEDICAL_SCHOOL,
    isSupervisorApplying: false,
    isLegalAdult: true,
  },
];
const VOLUNTEER_INFO_SEED: VolunteerInfo[] = [
  {
    appId: 1,
    license: '1234567890',
  },
  {
    appId: 3,
    license: '1234567890',
  },
];

async function seed() {
  try {
    console.log('🌱 Starting database seed...');

    // Initialize the data source
    await dataSource.initialize();
    console.log('✅ Database connection established');

    // Create disciplines
    console.log('📚 Creating disciplines...');
    await dataSource.getRepository(Discipline).save(
      Object.values(DISCIPLINE_VALUES).map((name) => ({
        name,
        admin_emails: [],
      })),
    );
    console.log('✅ Disciplines created');

    // Create user test data
    console.log('📋 Creating users...');
    const userRepo: Repository<User> = dataSource.getRepository(User);
    const users = await userRepo.save(USER_SEED as DeepPartial<User>[]);
    console.log(`✅ Created ${users.length} users`);

    // Create admin info test data
    console.log('📋 Creating applicants...');
    const adminRepo: Repository<AdminInfo> =
      dataSource.getRepository(AdminInfo);
    const admins = await adminRepo.save(
      ADMIN_INFO_SEED as DeepPartial<AdminInfo>[],
    );
    console.log(`✅ Created ${admins.length} admin infos`);

    // Create candidate info test data
    console.log('📋 Creating applicants...');
    const candidateRepo: Repository<CandidateInfo> =
      dataSource.getRepository(CandidateInfo);
    const candidates = await candidateRepo.save(
      CANDIDATE_INFO_SEED as DeepPartial<CandidateInfo>[],
    );
    console.log(`✅ Created ${candidates.length} candidate infos`);

    // Create application test data
    console.log('📋 Creating applications...');
    const applicationRepo: Repository<Application> =
      dataSource.getRepository(Application);
    const applications = await applicationRepo.save(
      APPLICATION_SEED as DeepPartial<Application>[],
    );
    console.log(`✅ Created ${applications.length} applications`);

    // Create learner info test data
    console.log('📋 Creating applicants...');
    const learnerInfoRepo: Repository<LearnerInfo> =
      dataSource.getRepository(LearnerInfo);
    const learnerInfos = await learnerInfoRepo.save(
      LEARNER_INFO_SEED as DeepPartial<LearnerInfo>[],
    );
    console.log(`✅ Created ${learnerInfos.length} learner infos`);

    // Create volunteer info test data
    console.log('📋 Creating applicants...');
    const volunteerInfoRepo: Repository<VolunteerInfo> =
      dataSource.getRepository(VolunteerInfo);
    const volunteerInfos = await volunteerInfoRepo.save(
      VOLUNTEER_INFO_SEED as DeepPartial<VolunteerInfo>[],
    );
    console.log(`✅ Created ${volunteerInfos.length} volunteer infos`);

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
