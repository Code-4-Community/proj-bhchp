/**
 * Status of the application in the system/ review process
 */
export enum AppStatus {
  APP_SUBMITTED = 'App Submitted',
  IN_REVIEW = 'In Review',
  FORMS_SIGNED = 'Forms Signed',
  ACCEPTED = 'Accepted',
  NO_AVAILABILITY = 'No Availability',
  DECLINED = 'Declined',
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
}

/**
 * Applicant's area of interest for the commitment
 */
export enum InterestArea {
  WOMENS_HEALTH = "Women's Health",
  MEDICAL_RESPITE_INPATIENT = 'Medical Respite/Inpatient',
  STREET_MEDICINE = 'Street Medicine',
  ADDICTION_MEDICINE = 'Addiction Medicine',
  PRIMARY_CARE = 'Primary Care',
  BEHAVIORAL_HEALTH = 'Behavioral Health',
  VETERANS_SERVICES = 'Veterans Services',
  FAMILY_AND_YOUTH_SERVICES = 'Family and Youth Services',
  HEP_C_CARE = 'Hep C Care',
  HIV_SERVICES = 'HIV Services',
  CASE_MANAGEMENT = 'Case Management',
  DENTAL = 'Dental',
}

/**
 * Type of the applicant, either learner (currently enrolled in school)
 * or volunteer (graduated)
 */
export enum ApplicantType {
  LEARNER = 'Learner',
  VOLUNTEER = 'Volunteer',
}

/**
 * Phone number regex pattern for ###-###-#### format validation
 * @see https://stackoverflow.com/questions/16699007/regular-expression-to-match-standard-10-digit-phone-number
 */
export const PHONE_REGEX = /^(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}$/;

/**
 * How the applicant heard about BHCHP
 */
export enum HeardAboutFrom {
  ONLINE_SEARCH = 'Online Search',
  BHCHP_WEBSITE = 'BHCHP Website',
  SCHOOL = 'School',
  FROM_A_BHCHP_STAFF_MEMBER = 'From a BHCHP Staff Member',
  OTHER = 'Other',
  FRIEND_FAMILY = 'Friend/Family',
  CURRENT_OR_FORMER_STAFF = 'I am a current/former BHCHP staff member',
}

/**
 * The applicant's discipline of expertise.
 */
export enum DISCIPLINE_VALUES {
  MD_MedicalStudent_PreMed = 'MD/Medical Student/Pre-Med',
  Medical_NP_PA = 'Medical NP/PA',
  Psychiatry_or_Psychiatric_NP_PA = 'Psychiatry or Psychiatric NP/PA',
  PublicHealth = 'Public Health',
  RN = 'RN',
  SocialWork = 'Social Work',
  Other = 'Other',
}

export interface AvailabilityFields {
  mondayAvailability: string;
  tuesdayAvailability: string;
  wednesdayAvailability: string;
  thursdayAvailability: string;
  fridayAvailability: string;
  saturdayAvailability: string;
}

export interface Application extends AvailabilityFields {
  appId: number;
  email: string;
  proposedStartDate: string;
  actualStartDate?: string;
  discipline: DISCIPLINE_VALUES;
  otherDisciplineDescription?: string;
  appStatus: AppStatus;
  mondayAvailability: string;
  tuesdayAvailability: string;
  wednesdayAvailability: string;
  thursdayAvailability: string;
  fridayAvailability: string;
  saturdayAvailability: string;
  interest: InterestArea[];
  license: string;
  phone: string;
  applicantType: ApplicantType;
  referred?: boolean;
  referredEmail?: string;
  weeklyHours: number;
  pronouns: string;
  nonEnglishLangs?: string;
  desiredExperience: string;
  elaborateOtherDiscipline?: string;
  resume: string;
  coverLetter: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  heardAboutFrom: HeardAboutFrom[];
  endDate?: Date;
}

/**
 * School of the applicant, includes well-known medical schools, or an other option
 */
export enum School {
  HARVARD_MEDICAL_SCHOOL = 'Harvard Medical School',
  JOHNS_HOPKINS = 'Johns Hopkins',
  STANFORD_MEDICINE = 'Stanford Medicine',
  MAYO_CLINIC = 'Mayo Clinic',
  OTHER = 'Other',
}

export interface LearnerInfo {
  appId: number;
  school: School;
  otherSchool?: string;
  schoolDepartment?: string;
  isSupervisorApplying: boolean;
  isLegalAdult: boolean;
  dateOfBirth?: Date;
  courseRequirements?: string;
  instructorInfo?: string;
  syllabus?: string;
}

export enum UserType {
  ADMIN = 'ADMIN',
  STANDARD = 'STANDARD',
}

export interface User {
  email: string;
  firstName: string;
  lastName: string;
  userType: UserType;
}

export interface CandidateInfo {
  email: string;
  appId: number;
}

export interface ProvisionAdminRequest {
  email: string;
  firstName: string;
  lastName: string;
  discipline: DISCIPLINE_VALUES;
}

export interface ProvisionAdminResponse {
  mode: 'live';
  status:
    | 'SUCCESS'
    | 'COGNITO_CREATE_FAILED'
    | 'DATABASE_WRITE_FAILED_ROLLED_BACK'
    | 'DATABASE_WRITE_FAILED_ROLLBACK_FAILED';
  cognito: {
    attemptedCreate: boolean;
    attemptedRollback: boolean;
    cognitoUsername?: string;
    userStatus?: string;
    rollbackSucceeded?: boolean;
  };
  database: {
    attemptedTransaction: boolean;
    committed: boolean;
  };
  records: {
    user: User;
    adminInfo: {
      email: string;
      discipline: DISCIPLINE_VALUES;
      createdAt: string;
      updatedAt: string;
    };
  } | null;
  notes: string[];
}
