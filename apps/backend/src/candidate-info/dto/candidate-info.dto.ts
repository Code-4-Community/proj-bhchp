import {
  IsNotEmpty,
  IsDefined,
  IsInt,
  IsPositive,
  IsEmail,
} from 'class-validator';

/**
 * Defines the expected shape of data for creating an CandidateInfo
 *
 * DTO - data transfer object (defines and validates the structure of data sent over the network).
 */
export class CreateCandidateInfoDto {
  /**
   * Corresponding application id number.
   */
  @IsInt()
  @IsPositive()
  @IsDefined()
  appId: number;

  /**
   * The CandidateInfo's email (primary key for CandidateInfo info).
   *
   * Example: 'jane.doe@example.com'.
   */
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
