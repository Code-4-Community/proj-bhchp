import { IsDefined, IsNotEmpty, IsString } from 'class-validator';

/**
 * Defines the expected shape of data for updating an application's discipline.
 *
 * DTO - data transfer object (defines and validates the structure of data sent over the network).
 */
export class UpdateApplicationDisciplineDto {
  /**
   * Application's new discipline.
   *
   * Example: `public-health`.
   */
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  discipline: string;
}
