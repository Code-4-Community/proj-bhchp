import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateDisciplineRequestDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'key must be a lowercase slug (a-z, 0-9, hyphen) with no spaces',
  })
  key: string;

  @IsString()
  @IsNotEmpty()
  label: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
