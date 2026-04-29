import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsString,
  IsOptional,
  IsNotEmpty,
  IsDefined,
  Matches,
  Min,
  Max,
  IsEmail,
  IsArray,
} from 'class-validator';
import {
  AppStatus,
  InterestArea,
  ApplicantType,
  HeardAboutFrom,
  DesiredExperience,
} from '../types';

/**
 * Defines the expected shape of data for creating an application.
 *
 * DTO - data transfer object (defines and validates the structure of data sent over the network).
 */
export class CreateApplicationDto {
  /**
   * Status of the application in the review process.
   *
   * Example: AppStatus.APP_SUBMITTED.
   */
  @IsEnum(AppStatus)
  @IsDefined()
  appStatus: AppStatus;

  /**
   * Applicant's Monday availability as a free text string.
   *
   * Example: 12pm and on every other week
   */
  @IsString()
  mondayAvailability: string;

  /**
   * Applicant's Tuesday availability as a free text string.
   *
   * Example: 12pm and on every other week
   */
  @IsString()
  tuesdayAvailability: string;

  /**
   * Applicant's Wednesday availability as a free text string.
   *
   * Example: 12pm and on every other week
   */
  @IsString()
  wednesdayAvailability: string;

  /**
   * Applicant's Thursday availability as a free text string.
   *
   * Example: 12pm and on every other week
   */
  @IsString()
  thursdayAvailability: string;

  /**
   * Applicant's Friday availability as a free text string.
   *
   * Example: 12pm and on every other week
   */
  @IsString()
  fridayAvailability: string;

  /**
   * Applicant's Saturday availability as a free text string.
   *
   * Example: 12pm and on every other week
   */
  @IsString()
  saturdayAvailability: string;

  /**
   * Type of applicant, currently either a learner or a volunteer.
   *
   * Example: ApplicantType.LEARNER.
   */
  @IsEnum(ApplicantType)
  @IsDefined()
  applicantType: ApplicantType;

  /**
   * Applicant's areas of interest for the commitment (multiple select).
   *
   * Example: [InterestArea.NURSING, InterestArea.HARM_REDUCTION].
   */
  @IsArray()
  @IsEnum(InterestArea, { each: true })
  @IsDefined()
  interest: InterestArea[];

  /**
   * Any licenses that the applicant holds
   *
   * Example:  PHYSICIAN LICENSE
   */
  @IsString()
  @IsNotEmpty()
  license: string;

  /**
   * Phone number of the applicant in ###-###-#### format.
   *
   * Example: "123-456-7890".
   */
  @IsString()
  @IsDefined()
  @Matches(/^\d{3}-\d{3}-\d{4}$/, {
    message: 'Phone number must be in ###-###-#### format',
  })
  phone: string;

  /**
   * Email of the applicant.
   *
   * Example: bob.ross@example.com
   */
  @IsEmail()
  @IsDefined()
  email: string;

  /**
   * The expected start date for the applicant's commitment, stored in YYYY-MM-DD format.
   *
   * Example: '2024-06-30'.
   */
  @IsString()
  @IsDefined()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date must be in YYYY-MM-DD format',
  })
  proposedStartDate: string;

  /**
   * The expected start date for the applicant's commitment, stored in YYYY-MM-DD format.
   *
   * Example: '2024-06-30'.
   */
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date must be in YYYY-MM-DD format',
  })
  actualStartDate?: string;

  /**
   * The expected end date for the applicant's commitment, stored in YYYY-MM-DD format.
   *
   * Example: '2024-06-30'.
   */
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date must be in YYYY-MM-DD format',
  })
  endDate?: string;

  /**
   * Discipline of the applicant.
   *
   * Example: "Nursing"
   */
  @IsString()
  @IsDefined()
  discipline: string;

  /**
   * Discipline or area of interest description of applicant clicked other
   */
  @IsString()
  @IsOptional()
  otherDisciplineDescription?: string;

  /**
   * Whether or not the applicant was referred by someone else.
   *
   * Example: false.
   */
  @IsBoolean()
  @IsOptional()
  referred?: boolean;

  /**
   * The email of the person who referred this applicant, if applicable.
   *
   * Example: jane.doe@example.com.
   */
  @IsString()
  @IsOptional()
  referredEmail?: string;

  /**
   * Applicant's desired commitment in amount of hours per week.
   *
   * Example: 20.
   */
  @IsNumber()
  @IsDefined()
  @Min(1)
  @Max(168) // 168 hours in a week, can change later if there's a business limit
  weeklyHours: number;

  /**
   * Applicant's pronouns
   *
   * Example: they/them
   */
  @IsString()
  @IsDefined()
  pronouns: string;

  /**
   * Languages that the applicant speaks other than English
   *
   * Example: I speak some cantonese
   */
  @IsString()
  @IsOptional()
  nonEnglishLangs?: string;

  /**
   * Description of the type of experience the applicant is looking for
   *
   * Example: I want to give back to the boston community and learn to talk better with patients
   */
  @IsEnum(DesiredExperience)
  @IsDefined()
  desiredExperience: DesiredExperience;

  /**
   * Field for someone to elaborate on their discipline if they chose other for discipline dropdown
   *
   * Example:
   */
  @IsString()
  @IsOptional()
  elaborateOtherDiscipline?: string;

  /**
   * Name of the resume file stored in S3 with its extension
   *
   * Example:  janedoe_resume_2_6_2026.pdf
   *
   * Note: In the code when accessing the files we would prepend the s3 address, e.g.
   * a full link looks like this:
   * https://shelter-link-shelters.s3.us-east-2.amazonaws.com/test_photo.webp
   * But since "https://shelter-link-shelters.s3.us-east-2.amazonaws.com/" would look the same
   * for every single file we can just store the file with its extension e.g. "test_photo.webp"
   */
  @IsString()
  @IsNotEmpty()
  resume: string;

  /**
   * Name of the cover letter file stored in S3 with its extension
   *
   * Example:  janedoe_coverLetter_2_6_2026.pdf
   *
   * Note: In the code when accessing the files we would prepend the s3 address, e.g.
   * a full link looks like this:
   * https://shelter-link-shelters.s3.us-east-2.amazonaws.com/test_photo.webp
   * But since "https://shelter-link-shelters.s3.us-east-2.amazonaws.com/" would look the same
   * for every single file we can just store the file with its extension e.g. "test_photo.webp"
   */
  @IsString()
  @IsNotEmpty()
  coverLetter: string;

  /**
   * Name of the applicant's emergency contact
   *
   * Example: Jane Doe
   */
  @IsString()
  @IsNotEmpty()
  emergencyContactName: string;

  /**
   * Phone number of the applicant's emergency contact
   *
   * Example: Jane Doe
   */
  @IsString()
  @IsDefined()
  @Matches(/^\d{3}-\d{3}-\d{4}$/, {
    message: 'Phone number must be in ###-###-#### format',
  })
  emergencyContactPhone: string;

  /**
   * Relationship between the applicant and their emergency contact
   *
   * Example: Mother
   */
  @IsString()
  @IsNotEmpty()
  emergencyContactRelationship: string;

  /**
   * List of sources that the applicant heard about BHCHP from
   *
   * Example: HeardAboutFrom.OTHER, HeardAboutFrom.SCHOOL
   */
  @IsArray()
  @IsEnum(HeardAboutFrom, { each: true })
  @IsDefined()
  heardAboutFrom: HeardAboutFrom[];
}
