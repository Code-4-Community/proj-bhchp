import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsString,
} from 'class-validator';

/**
 * DTO for the admin provisioning endpoint.
 *
 * Note: the temporary password is intentionally not accepted from the
 * frontend. The backend is responsible for generating it and sending it only
 * to Cognito.
 */
export class ProvisionAdminDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  disciplines: string[];
}
