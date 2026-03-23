import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsDefined,
  Min,
  IsString,
  IsOptional,
  Matches,
} from 'class-validator';
import { School } from '../types';

/**
 * Defines the expected shape of data for creating a learner info
 *
 * DTO - data transfer object (defines and validates the structure of data sent over the network).
 */
export class CreateLearnerInfoDto {
  /**
   * The id corresponding to the application this information belongs to
   */
  @IsNumber()
  @Min(0)
  @IsDefined()
  appId!: number;

  /**
   * School of the applicant; includes well-known medical schools or an 'other' option.
   *
   * Example: School.STANFORD_MEDICINE.
   */
  @IsEnum(School)
  @IsDefined()
  school!: School;

  /**
   * Name of school if chose other
   *
   * Example: Northeastern University
   */
  @IsString()
  @IsOptional()
  otherSchool?: string;

  /**
   * Name of the department in the school studied in if relevent
   *
   * Example: Infectious Diseases
   */
  @IsString()
  @IsOptional()
  schoolDepartment?: string;

  /**
   * Applying as themselves or applying as a supervisor
   *
   * Example: true
   */
  @IsBoolean()
  @IsDefined()
  isSupervisorApplying: boolean;

  /**
   * Whether the applicant is over 18 years old
   *
   * Example: true
   */
  @IsBoolean()
  @IsDefined()
  isLegalAdult: boolean;

  /**
   * The birthdate of the applicant, only required if they are under 18
   *
   * Example: '2000-01-01'.
   */
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date must be in YYYY-MM-DD format',
  })
  @IsOptional()
  dateOfBirth?: Date;

  /**
   * Course requirements if volunteering fulfills some course requirement
   *
   * Example: 15 hours of patient facing work per week
   */
  @IsString()
  @IsOptional()
  courseRequirements?: string;

  /**
   * Instructor's information if needed.
   *
   * Example: Jane Doe at khoury college of computer sciences, contact: doe.ja@northeastern.edu
   */
  @IsString()
  @IsOptional()
  instructorInfo?: string;

  /**
   * Name of the syllabus file stored in S3 with its extension
   *
   * Example:  syllabus.pdf
   *
   * Note: In the code when accessing the files we would prepend the s3 address, e.g.
   * a full link looks like this:
   * https://shelter-link-shelters.s3.us-east-2.amazonaws.com/test_photo.webp
   * But since "https://shelter-link-shelters.s3.us-east-2.amazonaws.com/" would look the same
   * for every single file we can just store the file with its extension e.g. "test_photo.webp"
   */
  @IsString()
  @IsOptional()
  syllabus?: string;
}
