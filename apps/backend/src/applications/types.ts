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

/** User-friendly labels for request body fields displayed in the error email. */
export const FIELD_LABELS: Record<string, string> = {
  appStatus: 'Application Status',
  mondayAvailability: 'Monday Availability',
  tuesdayAvailability: 'Tuesday Availability',
  wednesdayAvailability: 'Wednesday Availability',
  thursdayAvailability: 'Thursday Availability',
  fridayAvailability: 'Friday Availability',
  saturdayAvailability: 'Saturday Availability',
  applicantType: 'Applicant Type',

  interest: 'Areas of Interest',
  license: 'License',
  phone: 'Phone Number',
  email: 'Email',
  proposedStartDate: 'Proposed Start Date',
  actualStartDate: 'Actual Start Date',
  endDate: 'End Date',
  discipline: 'Discipline',
  weeklyHours: 'Weekly Hours',
  pronouns: 'Pronouns',
  nonEnglishLangs: 'Non-English Languages',
  desiredExperience: 'Desired Experience',
  resume: 'Resume',
  coverLetter: 'Cover Letter',
  emergencyContactName: 'Emergency Contact Name',
  emergencyContactPhone: 'Emergency Contact Phone',
  emergencyContactRelationship: 'Emergency Contact Relationship',
  heardAboutFrom: 'How Did You Hear About Us',
};
