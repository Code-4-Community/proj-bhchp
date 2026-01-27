import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsString,
  IsArray,
  IsOptional,
  IsNotEmpty,
  IsDefined,
  Matches,
  Min,
  Max,
} from 'class-validator';
import {
  AppStatus,
  ExperienceType,
  InterestArea,
  School,
  DaysOfTheWeek,
  ApplicantType,
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
   * Availability of the applicant in terms of days of the week.
   *
   * Example: 'Monday, Tuesday'.
   */
  @IsEnum(DaysOfTheWeek)
  @IsNotEmpty()
  daysAvailable: DaysOfTheWeek[];

  /**
   * Type of applicant, currently either a learner or a volunteer.
   *
   * Example: ApplicantType.LEARNER.
   */
  @IsEnum(ApplicantType)
  @IsDefined()
  applicantType: ApplicantType;

  /**
   * Experience type/ level of the applicant, generally in terms of medical experience/ degree.
   *
   * Example: ExperienceType.BS.
   */
  @IsEnum(ExperienceType)
  @IsDefined()
  experienceType: ExperienceType;

  // TODO: clarify what format these strings are in and an example of what type of file.
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @IsDefined()
  fileUploads: string[];

  /**
   * Applicant's area of interest for the commitment.
   *
   * Example: InterestArea.NURSING.
   */
  @IsEnum(InterestArea)
  @IsDefined()
  interest: InterestArea;

  // TODO: clarify what format this string is in, and why it's not an array
  // if people can hold multiple licenses in real life.
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
   * School of the applicant, includes well-known medical schools, or an other option.
   *
   * Example: School.STANFORD_MEDICINE.
   */
  @IsEnum(School)
  @IsDefined()
  school: School;

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
}
