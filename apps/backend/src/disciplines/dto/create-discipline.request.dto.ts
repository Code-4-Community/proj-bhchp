import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDisciplineRequestDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  label: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
