import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { DISCIPLINE_VALUES } from '../../disciplines/disciplines.constants';

export enum AdminProvisioningMockScenario {
  SUCCESS = 'SUCCESS',
  COGNITO_CREATE_FAILS = 'COGNITO_CREATE_FAILS',
  DATABASE_WRITE_FAILS = 'DATABASE_WRITE_FAILS',
  ROLLBACK_FAILS = 'ROLLBACK_FAILS',
}

/**
 * DTO for the mocked admin provisioning endpoint.
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

  /**
   * Temporary mock switch for exercising the scaffolded failure paths while
   * the real Cognito/DB logic is still TODO.
   */
  @IsOptional()
  @IsEnum(AdminProvisioningMockScenario)
  mockScenario?: AdminProvisioningMockScenario;
}
