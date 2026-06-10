import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateUserNameDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;
}
