import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsString,
} from 'class-validator';

// TODO: Add class validators

/**
 * Defines the expected shape of data for creating a new admin.
 */
export class CreateAdminInfoDto {
  /**
   * The first name of the admin to create.
   *
   * Example: 'Jane Doe'.
   */
  @IsString()
  @IsNotEmpty()
  firstName: string;

  /**
   * The last name of the admin to create.
   *
   * Example: 'Doe'.
   */
  @IsString()
  @IsNotEmpty()
  lastName: string;

  /**
   * The email of the admin to create.
   *
   * Example: 'jane.doe@northeastern.edu'.
   */
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  disciplines: string[];
}
