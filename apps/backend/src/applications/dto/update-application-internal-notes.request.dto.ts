import { IsOptional, IsString } from 'class-validator';

/**
 * Defines the expected shape of data for updating an application's internal notes.
 *
 * DTO - data transfer object (defines and validates the structure of data sent over the network).
 */
export class UpdateApplicationInternalNotesDto {
  /**
   * Internal notes about the application, only visible to admins.
   *
   * Example: "Applicant is potentially a good fit."
   */
  @IsString()
  @IsOptional()
  internalNotes?: string;
}
