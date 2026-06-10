import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class UpdateAdminDisciplinesDto {
  /**
   * The disciplines of the admin to update.
   *
   * Example: ['rn', 'nursing']
   */
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  disciplines: string[];
}
