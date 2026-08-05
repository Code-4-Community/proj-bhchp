/**
 * PandaDoc field map and small transform helpers.
 *
 * This module declares the canonical mapping from PandaDoc field IDs
 * (the `pandaDocKey` values) to backend properties, plus lightweight
 * helpers used during mapping (date parsing and boolean normalization).
 */
import { HeardAboutFrom, InterestArea } from '../applications/types';
import { School } from '../learner-info/types';

/**
 * Parse a user-supplied date string into a Date normalized to EST midnight
 * (UTC-05:00) for the intended calendar date.
 *
 * Expected input format is `MM-DD-YYYY`.
 *
 * This is converted with `Date.UTC(...)` plus a fixed EST offset so
 * persistence/serialization keeps calendar dates consistent in EST.
 *
 * Non-matching values fall back to the native Date parser as a defensive
 * guard for unexpected payloads.
 *
 * @param value - date string from PandaDoc in MM-DD-YYYY format
 * @returns Date instance representing the parsed date
 */
function parseDate(value: string): Date {
  if (!value || typeof value !== 'string') return new Date(String(value));

  // MM-DD-YYYY -> EST midnight (UTC-05:00) for that calendar date.
  const mmdd = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
  const m = value.match(mmdd);
  if (m) {
    const mm = parseInt(m[1], 10);
    const dd = parseInt(m[2], 10);
    const yyyy = parseInt(m[3], 10);
    return new Date(Date.UTC(yyyy, mm - 1, dd, 5, 0, 0, 0));
  }

  // For non-date-like values, defer to native parser.
  return new Date(value);
}

/**
 * Convert common user-visible truthy values into a boolean.
 *
 * Accepts values commonly produced by web forms or PandaDoc fields such as
 * "Yes", "on", "checked", and "true" (case-insensitive). Any other
 * input is considered false.
 *
 * @param value - raw field value from PandaDoc
 * @returns normalized boolean
 */
function parseBooleanish(value: string): boolean {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  return (
    normalized === 'yes' ||
    normalized === 'true' ||
    normalized === 'on' ||
    normalized === 'checked'
  );
}

/**
 * Normalize a school label for strict comparisons.
 *
 * This keeps alphanumeric content and removes whitespace/punctuation so
 * equivalent labels match even if formatting differs (case, separators,
 * or special characters).
 */
function normalizeSchoolLabel(value: string): string {
  return String(value ?? '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Convert a PandaDoc discipline label to the kebab-case key stored in the
 * discipline catalog table (e.g. "Psychiatry or Psychiatric NP/PA" →
 * "psychiatry-or-psychiatric-np-pa").
 */
function normalizeDisciplineKey(value: string): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const LEGACY_SCHOOL_ALIASES: Array<[string, School]> = [
  [
    'BMC School of Medicine - Center for Multicultural Training in Psychology',
    School.BMC_CENTER_FOR_MULTICULTURAL_TRAINING_IN_PSYCHOLOGY,
  ],
  [
    'Boston College - Lynch School of Education and Human Development',
    School.BOSTON_COLLEGE_LYNCH_SCHOOL,
  ],
  [
    'Boston University School of Medicine Division of Graduate Medical Sciences physician assistant program',
    School.BOSTON_UNIVERSITY_SCHOOL_OF_MEDICINE_PA,
  ],
];

const SCHOOL_LOOKUP = new Map<string, School>();

for (const candidate of Object.values(School) as string[]) {
  SCHOOL_LOOKUP.set(normalizeSchoolLabel(candidate), candidate as School);
}

for (const [legacyValue, school] of LEGACY_SCHOOL_ALIASES) {
  SCHOOL_LOOKUP.set(normalizeSchoolLabel(legacyValue), school);
}

/**
 * The backend target tables which panda-doc fields map into.
 * Each field entry in `PANDADOC_FIELD_MAP` declares which of these
 * tables the value should be written to.
 */
export type TargetTable = 'application' | 'candidateInfo' | 'learnerInfo';

/**
 * Describes a single PandaDoc -> backend mapping.
 *
 * - `pandaDocKey` is the field id used in the PandaDoc form.
 * - `backendField` is the destination property name on the target table.
 * - `required` indicates the field must be present (non-empty) or mapping
 *    will throw a missing-field error.
 * - `targetTable` selects which of the backend buckets the value lands in.
 * - `aggregate` opts this mapping into array aggregation. Use
 *    `aggregate: 'array'` when multiple PandaDoc keys should collect into one
 *    backend array field (for example checkbox groups).
 * - `transform` is an optional function that converts the raw string value
 *    into the appropriate runtime type (dates, enums, numbers, etc.).
 * - `defaultValue` will be used when the input is blank (only when the
 *    value is optional).
 */
export interface ValidPayload {
  pandaDocKey: string;
  backendField: string;
  required: boolean;
  targetTable: TargetTable;
  aggregate?: 'array';
  transform?: (value: string) => unknown;
  defaultValue?: unknown;
}

/**
 * The authoritative mapping from PandaDoc field IDs to backend fields.
 *
 * The mapper consumes the PandaDoc webhook payload (a simple record of
 * field_id -> value) and uses this table to populate backend insert/update
 * objects.
 *
 * Aggregation is explicit: only entries with `aggregate: 'array'` will be
 * collected into array outputs. Duplicate `(targetTable, backendField)`
 * mappings without explicit aggregation are treated as a map configuration
 * error by the mapper.
 */
export const PANDADOC_FIELD_MAP: ValidPayload[] = [
  // ── candidateInfo table ──
  {
    pandaDocKey: 'email',
    backendField: 'email',
    required: true,
    targetTable: 'candidateInfo',
  },

  // ── application table ──
  {
    pandaDocKey: 'email',
    backendField: 'email',
    required: true,
    targetTable: 'application',
  },
  {
    pandaDocKey: 'Volunteer_StartDate',
    backendField: 'proposedStartDate',
    transform: (value: string) => parseDate(value),
    required: true,
    targetTable: 'application',
  },
  {
    pandaDocKey: 'Volunteer_EndDate',
    backendField: 'endDate',
    transform: (value: string) => parseDate(value),
    required: false,
    targetTable: 'application',
  },
  {
    pandaDocKey: 'Volunteer_Pronouns',
    backendField: 'pronouns',
    required: true,
    targetTable: 'application',
  },
  {
    pandaDocKey: 'Volunteer_Phone',
    backendField: 'phone',
    required: false,
    defaultValue: '',
    targetTable: 'application',
  },
  {
    pandaDocKey: 'Volunteer_Languages',
    backendField: 'nonEnglishLangs',
    required: false,
    targetTable: 'application',
  },
  {
    pandaDocKey: 'Volunteer_Experience',
    backendField: 'desiredExperience',
    required: true,
    targetTable: 'application',
  },
  {
    pandaDocKey: 'Volunteer_Discipline',
    backendField: 'discipline',
    transform: (value: string) => normalizeDisciplineKey(value),
    required: true,
    targetTable: 'application',
  },
  {
    pandaDocKey: 'Volunteer_Discipline_Other',
    backendField: 'otherDisciplineDescription',
    required: false,
    targetTable: 'application',
  },
  {
    pandaDocKey: 'Volunteer_Discipline_Other',
    backendField: 'elaborateOtherDiscipline',
    required: false,
    targetTable: 'application',
  },
  {
    pandaDocKey: 'Volunteer_License',
    backendField: 'license',
    required: false,
    targetTable: 'application',
    defaultValue: '',
  },
  {
    pandaDocKey: 'Volunteer_Referred',
    backendField: 'referred',
    transform: (value: string) => parseBooleanish(value),
    required: false,
    targetTable: 'application',
    defaultValue: false,
  },
  {
    pandaDocKey: 'Volunteer_ReferredEmail',
    backendField: 'referredEmail',
    required: false,
    targetTable: 'application',
  },
  {
    pandaDocKey: 'Volunteer_TotalHours',
    backendField: 'weeklyHours',
    transform: (value: string) => {
      const s = String(value ?? '');
      const m = s.match(/(\d+)/);
      const parsed = m ? parseInt(m[1], 10) : parseInt(s, 10);
      return Number.isNaN(parsed) ? 0 : parsed;
    },
    required: false,
    targetTable: 'application',
    defaultValue: 0,
  },
  {
    pandaDocKey: 'Volunteer_AvailabilityMonday',
    backendField: 'mondayAvailability',
    required: false,
    targetTable: 'application',
    defaultValue: '',
  },
  {
    pandaDocKey: 'Volunteer_AvailabilityTuesday',
    backendField: 'tuesdayAvailability',
    required: false,
    targetTable: 'application',
    defaultValue: '',
  },
  {
    pandaDocKey: 'Volunteer_AvailabilityWednesday',
    backendField: 'wednesdayAvailability',
    required: false,
    targetTable: 'application',
    defaultValue: '',
  },
  {
    pandaDocKey: 'Volunteer_AvailabilityThursday',
    backendField: 'thursdayAvailability',
    required: false,
    targetTable: 'application',
    defaultValue: '',
  },
  {
    pandaDocKey: 'Volunteer_AvailabilityFriday',
    backendField: 'fridayAvailability',
    required: false,
    targetTable: 'application',
    defaultValue: '',
  },
  {
    pandaDocKey: 'Volunteer_AvailabilitySaturday',
    backendField: 'saturdayAvailability',
    required: false,
    targetTable: 'application',
    defaultValue: '',
  },
  {
    pandaDocKey: 'Volunteer_ResumeUpload2',
    backendField: 'resume',
    required: true,
    targetTable: 'application',
  },
  {
    pandaDocKey: 'Volunteer_CoverletterUpload2',
    backendField: 'coverLetter',
    required: true,
    targetTable: 'application',
  },
  {
    pandaDocKey: 'Volunteer_EmergencyContactName',
    backendField: 'emergencyContactName',
    required: true,
    targetTable: 'application',
  },
  {
    pandaDocKey: 'Volunteer_EmergencyContactPhone',
    backendField: 'emergencyContactPhone',
    required: true,
    targetTable: 'application',
  },
  {
    pandaDocKey: 'Volunteer_EmergencyContactRelationship',
    backendField: 'emergencyContactRelationship',
    required: true,
    targetTable: 'application',
  },

  // Interest area checkboxes -> `application.interest[]` (explicit aggregation)
  {
    pandaDocKey: 'Volunteer_Interest_WomensHealth',
    backendField: 'interest',
    aggregate: 'array',
    transform: () => InterestArea.WOMENS_HEALTH,
    required: false,
    targetTable: 'application',
  },
  {
    pandaDocKey: 'Volunteer_Interest_AdditctionServices',
    backendField: 'interest',
    aggregate: 'array',
    transform: () => InterestArea.ADDICTION_MEDICINE,
    required: false,
    targetTable: 'application',
  },
  {
    pandaDocKey: 'Volunteer_Interest_VeteransServices',
    backendField: 'interest',
    aggregate: 'array',
    transform: () => InterestArea.VETERANS_SERVICES,
    required: false,
    targetTable: 'application',
  },
  {
    pandaDocKey: 'Volunteer_Interest_HIV',
    backendField: 'interest',
    aggregate: 'array',
    transform: () => InterestArea.HIV_SERVICES,
    required: false,
    targetTable: 'application',
  },
  {
    pandaDocKey: 'Volunteer_Interest_Respite',
    backendField: 'interest',
    aggregate: 'array',
    transform: () => InterestArea.MEDICAL_RESPITE_INPATIENT,
    required: false,
    targetTable: 'application',
  },
  {
    pandaDocKey: 'Volunteer_Interest_PrimaryCare',
    backendField: 'interest',
    aggregate: 'array',
    transform: () => InterestArea.PRIMARY_CARE,
    required: false,
    targetTable: 'application',
  },
  {
    pandaDocKey: 'Volunteer_Interest_FamilyServices',
    backendField: 'interest',
    aggregate: 'array',
    transform: () => InterestArea.FAMILY_AND_YOUTH_SERVICES,
    required: false,
    targetTable: 'application',
  },
  {
    pandaDocKey: 'Volunteer_Interest_CaseManagement',
    backendField: 'interest',
    aggregate: 'array',
    transform: () => InterestArea.CASE_MANAGEMENT,
    required: false,
    targetTable: 'application',
  },
  {
    pandaDocKey: 'Volunteer_Interest_StreetMedicine',
    backendField: 'interest',
    aggregate: 'array',
    transform: () => InterestArea.STREET_MEDICINE,
    required: false,
    targetTable: 'application',
  },
  {
    pandaDocKey: 'Volunteer_Interest_BehavioralHealth',
    backendField: 'interest',
    aggregate: 'array',
    transform: () => InterestArea.BEHAVIORAL_HEALTH,
    required: false,
    targetTable: 'application',
  },
  {
    pandaDocKey: 'Volunteer_Interest_HepC',
    backendField: 'interest',
    aggregate: 'array',
    transform: () => InterestArea.HEP_C_CARE,
    required: false,
    targetTable: 'application',
  },
  {
    pandaDocKey: 'Volunteer_Interest_Dental',
    backendField: 'interest',
    aggregate: 'array',
    transform: () => InterestArea.DENTAL,
    required: false,
    targetTable: 'application',
  },

  // How-did-you-hear-about-us checkboxes -> `application.heardAboutFrom[]`
  {
    pandaDocKey: 'Volunteer_HearAboutUs_School',
    backendField: 'heardAboutFrom',
    aggregate: 'array',
    transform: () => HeardAboutFrom.SCHOOL,
    required: false,
    targetTable: 'application',
  },
  {
    pandaDocKey: 'Volunteer_HearAboutUs_Website',
    backendField: 'heardAboutFrom',
    aggregate: 'array',
    transform: () => HeardAboutFrom.BHCHP_WEBSITE,
    required: false,
    targetTable: 'application',
  },
  {
    pandaDocKey: 'Volunteer_HearAboutUs_OnlineSearch',
    backendField: 'heardAboutFrom',
    aggregate: 'array',
    transform: () => HeardAboutFrom.ONLINE_SEARCH,
    required: false,
    targetTable: 'application',
  },
  {
    pandaDocKey: 'Volunteer_HearAboutUs_FromStaff',
    backendField: 'heardAboutFrom',
    aggregate: 'array',
    transform: () => HeardAboutFrom.FROM_A_BHCHP_STAFF_MEMBER,
    required: false,
    targetTable: 'application',
  },
  {
    pandaDocKey: 'Volunteer_HearAboutUs_CurrentStaff',
    backendField: 'heardAboutFrom',
    aggregate: 'array',
    transform: () => HeardAboutFrom.CURRENT_OR_FORMER_STAFF,
    required: false,
    targetTable: 'application',
  },
  {
    pandaDocKey: 'Volunteer_HearAboutUs_FriendFamily',
    backendField: 'heardAboutFrom',
    aggregate: 'array',
    transform: () => HeardAboutFrom.FRIEND_FAMILY,
    required: false,
    targetTable: 'application',
  },
  {
    pandaDocKey: 'Volunteer_HearAboutUs_Other',
    backendField: 'heardAboutFrom',
    aggregate: 'array',
    transform: () => HeardAboutFrom.OTHER,
    required: false,
    targetTable: 'application',
  },

  // ── learnerInfo table ──
  {
    pandaDocKey: 'Volunteer_ Affiliation_Other',
    backendField: 'otherSchool',
    required: false,
    targetTable: 'learnerInfo',
  },
  {
    pandaDocKey: 'Volunteer_FormFor',
    backendField: 'isSupervisorApplying',
    transform: (value: string) => value === 'Supervisor/Instructor',
    required: true,
    targetTable: 'learnerInfo',
  },
  {
    pandaDocKey: 'Volunteer_Age',
    backendField: 'isLegalAdult',
    transform: (value: string) => value === 'Yes',
    required: true,
    targetTable: 'learnerInfo',
  },
  {
    pandaDocKey: 'Volunteer_DOB',
    backendField: 'dateOfBirth',
    transform: (value: string) => parseDate(value),
    required: false,
    targetTable: 'learnerInfo',
  },
  {
    // Map known PandaDoc school names to supported School enum values and
    // store the raw value in `otherSchool` so persistence won't violate
    // the enum constraint.
    pandaDocKey: 'Volunteer_Affiliation',
    backendField: 'school',
    transform: (value: string) => {
      const normalized = normalizeSchoolLabel(value);
      return SCHOOL_LOOKUP.get(normalized) ?? School.OTHER;
    },
    required: true,
    targetTable: 'learnerInfo',
  },

  {
    pandaDocKey: 'Volunteer_Department',
    backendField: 'schoolDepartment',
    required: false,
    targetTable: 'learnerInfo',
  },
  {
    pandaDocKey: 'Volunteer_CourseRequirements',
    backendField: 'courseRequirements',
    required: false,
    targetTable: 'learnerInfo',
  },
  {
    pandaDocKey: 'Volunteer_InstructorInfo',
    backendField: 'instructorInfo',
    required: false,
    targetTable: 'learnerInfo',
  },
  {
    pandaDocKey: 'Volunteer_SyllabusUpload',
    backendField: 'syllabus',
    required: false,
    targetTable: 'learnerInfo',
  },
];
