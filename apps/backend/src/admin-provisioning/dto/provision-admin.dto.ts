import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { DISCIPLINE_VALUES } from '../../disciplines/disciplines.constants';

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

  @IsEnum(DISCIPLINE_VALUES)
  @IsNotEmpty()
  discipline: DISCIPLINE_VALUES;
}
