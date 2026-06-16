import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Query parameters for the paginated applications list endpoints.
 *
 * DTO - data transfer object (defines and validates the structure of data sent over the network).
 *
 * Note: query params arrive as strings, so `@Type(() => Number)` plus the global
 * `ValidationPipe({ transform: true })` coerces them to numbers before validation.
 */
export class ApplicationQueryDto {
  /**
   * 1-based page number to return.
   *
   * Example: 2.
   */
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page: number = 1;

  /**
   * Maximum number of applications to return per page (capped at 100).
   *
   * Example: 25.
   */
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 25;
}
