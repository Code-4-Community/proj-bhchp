import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * Defines the expected shape of data for confirming a user's new password
 */
export class ConfirmPasswordDto {
  /**
   * Pre-existing user's email in the system
   *
   * Example: 'jane.doe@northeastern.edu'
   */
  @IsEmail()
  email: string;

  /**
   * The user's new password for the system
   *
   * TODO: clarify whether this password is encrypted or in plain format
   */
  @IsString()
  @IsNotEmpty()
  newPassword: string;

  // TODO: clarify where this code comes from
  @IsString()
  @IsNotEmpty()
  confirmationCode: string;
}
