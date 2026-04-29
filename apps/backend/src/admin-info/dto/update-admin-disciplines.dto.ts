import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class UpdateAdminDisciplinesDto {
  /**
   * The disciplines of the admin to create.
   *
   * Example: DISCIPLINE_VALUES.Nursing.
   */
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  disciplines: string[];
}
