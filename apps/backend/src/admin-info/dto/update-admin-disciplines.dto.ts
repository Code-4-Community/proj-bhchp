import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class UpdateAdminDisciplinesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  disciplines: string[];
}
