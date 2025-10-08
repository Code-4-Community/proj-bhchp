import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsString,
  IsArray,
  IsOptional,
} from 'class-validator';
import { AppStatus, ExperienceType, InterestArea, School } from '../types';

export class CreateApplicationDto {
  @IsEnum(AppStatus)
  appStatus: AppStatus;

  @IsString()
  daysAvailable: string;

  @IsEnum(ExperienceType)
  experienceType: ExperienceType;

  @IsArray()
  @IsString({ each: true })
  fileUploads: string[];

  @IsEnum(InterestArea)
  interest: InterestArea;

  @IsString()
  license: string;

  @IsBoolean()
  isInternational: boolean;

  @IsBoolean()
  isLearner: boolean;

  @IsString()
  phone: string;

  @IsEnum(School)
  school: School;

  @IsBoolean()
  @IsOptional()
  referred?: boolean;

  @IsString()
  @IsOptional()
  referredEmail?: string;

  @IsNumber()
  weeklyHours: number;
}
