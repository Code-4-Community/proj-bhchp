import { IsString, IsNotEmpty, IsDefined, Matches } from 'class-validator';
import { PrimaryColumn } from 'typeorm';

/**
 * Defines the expected shape of data for creating a learner.
 *
 * DTO - data transfer object (defines and validates the structure of data sent over the network).
 */
export class CreateLearnerDto {
  /**
   * Corresponding application id number.
   */
  @PrimaryColumn()
  appId: number;

  /**
   * The learner's first name.
   *
   * Example: 'Jane'.
   */
  @IsString()
  @IsNotEmpty()
  firstName: string;

  /**
   * The learner's last name.
   *
   * Example: 'Jane'.
   */
  @IsString()
  @IsNotEmpty()
  lastName: string;

  /**
   * The expected start date for the learner's commitment, stored in YYYY-MM-DD format.
   *
   * Example: '2024-06-30'.
   */
  @IsString()
  @IsDefined()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date must be in YYYY-MM-DD format',
  })
  startDate: string;

  /**
   * The expected end date for the learner's commitment, stored in YYYY-MM-DD format.
   *
   * Example: '2024-06-30'.
   */
  @IsString()
  @IsDefined()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date must be in YYYY-MM-DD format',
  })
  endDate: string;
}
