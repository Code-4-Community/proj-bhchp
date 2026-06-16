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
 * Type of experience the applicant is seeking.
 */
export enum DesiredExperience {
  PRE_LICENSURE_PLACEMENT = 'Pre-Licensure Placement (NP/PA, Nursing, Behavioral Health, Psychiatry)',
  PRACTICUM = 'Practicum',
  PUBLIC_HEALTH_PROJECT = 'Public Health Project',
  SHADOWING = 'Shadowing',
  VOLUNTEER_INTERN = 'Volunteer/Intern',
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
  createdAt: string;
  updatedAt: string;
  discipline: string;
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
  desiredExperience: DesiredExperience;
  elaborateOtherDiscipline?: string;
  resume: string;
  coverLetter: string;
  confidentialityForm?: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  heardAboutFrom: HeardAboutFrom[];
  endDate?: string;
}

/**
 * Generic envelope for a single page of results from a paginated endpoint.
 * Mirrors the backend `PaginatedResult<T>`.
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/** Direction for a date filter: `before` (on or before) or `after` (on or after). */
export type ListDateFilterDirection = 'before' | 'after';

/**
 * Query parameters accepted by the paginated applications list endpoints.
 * Mirrors the backend `ApplicationQueryDto`. Discipline/admin filtering is folded
 * into the `disciplines` argument by the caller, not carried here.
 */
export interface ApplicationListParams {
  page?: number;
  limit?: number;
  /** Free-text search across all searchable columns (not applicant name). */
  search?: string;
  /** `appStatus` values to include. */
  statuses?: string[];
  proposedStartDate?: string;
  proposedStartDateDirection?: ListDateFilterDirection;
  actualStartDate?: string;
  actualStartDateDirection?: ListDateFilterDirection;
  createdAt?: string;
  createdAtDirection?: ListDateFilterDirection;
  updatedAt?: string;
  updatedAtDirection?: ListDateFilterDirection;
}

/**
 * School of the applicant — kept in sync with apps/backend/src/learner-info/types.ts
 * TODO: add this to a shared package
 */
export enum School {
  BIDMC_RESIDENTS = 'BIDMC - Residents',
  BMC_ADDICTION_MEDICINE = 'BMC Addiction Medicine',
  BMC_FAMILY_MEDICINE = 'BMC - Family Medicine',
  BMC_CENTER_FOR_MULTICULTURAL_TRAINING_IN_PSYCHOLOGY = 'BMC SOM - Center for Multicultural Training in Psychology',
  BOSTON_COLLEGE_LYNCH_SCHOOL = 'Boston College - Lynch School of Ed and Human Development',
  BOSTON_GRADUATE_SCHOOL_OF_PSYCHOANALYSIS = 'Boston Graduate School of Psychoanalysis',
  BOSTON_UNIVERSITY = 'Boston University',
  BOSTON_MEDICAL_CENTER_GRAYKEN_CENTER = 'Boston Medical Center Grayken Center',
  BOSTON_UNIVERSITY_SCHOOL_OF_MEDICINE_PA = 'Boston University SOM DGMS physician assistant program',
  BU_MENTAL_HEALTH_COUNSELING_AND_BEHAVIORAL_MEDICINE = 'BU Mental Health Counseling and Behavioral Medicine Program',
  BWH_ADDICTION_MEDICINE = 'BWH Addiction Medicine',
  CAPELLA_UNIVERSITY = 'Capella University',
  FISHER_COLLEGE = 'Fisher College',
  GEORGETOWN_UNIVERSITY_SCHOOL_OF_MEDICINE = 'Georgetown University School of Medicine',
  JOHNS_HOPKINS = 'Johns Hopkins',
  LABOURE_COLLEGE = 'Laboure College',
  MEDEX_NORTHWEST_PA = 'Medex Northwest PA',
  MGH_ADDICTION_MEDICINE = 'MGH Addiction Medicine',
  MGH_PEDIATRIC_RESIDENCY_PROGRAM = 'MGH Pediatric Residency Program',
  MICHIGAN_STATE_UNIVERSITY = 'Michigan State University',
  NORTHEASTERN = 'Northeastern',
  NORTHEASTERN_BOUVE_COLLEGE_OF_HEALTH_SCIENCES = 'Northeastern Bouve College of Health Sciences',
  NORWICH_UNIVERSITY = 'Norwich University',
  SALEM_STATE = 'Salem State',
  STATE_UNIVERSITY_OF_NEW_YORK = 'State University of New York',
  UMASS_BOSTON_NP_PA = 'UMass Boston - NP/PA',
  UMASS_BOSTON_NURSING = 'UMass Boston - Nursing',
  UNIVERSITY_OF_WASHINGTON_SCHOOL_OF_MEDICINE = 'University of Washington School of Medicine',
  WESTERN_GOVERNORS_UNIVERSITY = 'Western Governors University',
  WORCESTER_STATE_UNIVERSITY = 'Worcester State University',
  OTHER = 'Other',
  DOES_NOT_APPLY = 'Does not apply',
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
  appIds: number[];
}

export interface AdminInfo {
  email: string;
  disciplines: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DisciplineCatalogItem {
  key: string;
  label: string;
  isActive: boolean;
}

export interface DisciplineAdmin {
  firstName: string;
  lastName: string;
}

export type DisciplineAdminMap = Record<string, DisciplineAdmin>;

export interface ProvisionAdminRequest {
  email: string;
  firstName: string;
  lastName: string;
  disciplines: string[];
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
      disciplines: string[];
      createdAt: string;
      updatedAt: string;
    };
  } | null;
  notes: string[];
}

export interface ConfidentialityTemplateResponse {
  templateUrl: string;
}

export interface ConfidentialityFormResponse {
  fileName: string | null;
  fileUrl: string | null;
}

export interface UploadConfidentialityFormResponse {
  fileName: string;
  fileUrl: string;
  appStatus: AppStatus;
}
