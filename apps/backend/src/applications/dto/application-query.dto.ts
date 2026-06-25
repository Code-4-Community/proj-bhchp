import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Splits a query value into a non-empty string array. */
function csvToArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return undefined;
}

/**
 * Direction for a date filter: `before` (on or before) or `after` (on or after).
 */
export type DateFilterDirection = 'before' | 'after';

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

  /**
   * Free-text search applied (case-insensitive, substring) across every searchable
   * application column — including fields not shown in the table.
   *
   * Example: 'spanish'.
   */
  @IsOptional()
  @IsString()
  search?: string;

  /**
   * Comma-separated `appStatus` values to include.
   *
   * Example: 'App Submitted,Accepted'.
   */
  @IsOptional()
  @Transform(({ value }) => csvToArray(value))
  @IsString({ each: true })
  statuses?: string[];

  /**
   * Proposed-start-date bound (YYYY-MM-DD), paired with {@link proposedStartDateDirection}.
   */
  @IsOptional()
  @IsString()
  @Matches(DATE_REGEX, { message: 'proposedStartDate must be YYYY-MM-DD' })
  proposedStartDate?: string;

  /** Whether {@link proposedStartDate} is an upper (`before`) or lower (`after`) bound. */
  @IsOptional()
  @IsIn(['before', 'after'])
  proposedStartDateDirection?: DateFilterDirection;

  /**
   * Actual-start-date bound (YYYY-MM-DD), paired with {@link actualStartDateDirection}.
   */
  @IsOptional()
  @IsString()
  @Matches(DATE_REGEX, { message: 'actualStartDate must be YYYY-MM-DD' })
  actualStartDate?: string;

  /** Whether {@link actualStartDate} is an upper (`before`) or lower (`after`) bound. */
  @IsOptional()
  @IsIn(['before', 'after'])
  actualStartDateDirection?: DateFilterDirection;

  /**
   * Created-at bound (YYYY-MM-DD), paired with {@link createdAtDirection}.
   */
  @IsOptional()
  @IsString()
  @Matches(DATE_REGEX, { message: 'createdAt must be YYYY-MM-DD' })
  createdAt?: string;

  /** Whether {@link createdAt} is an upper (`before`) or lower (`after`) bound. */
  @IsOptional()
  @IsIn(['before', 'after'])
  createdAtDirection?: DateFilterDirection;

  /**
   * Updated-at bound (YYYY-MM-DD), paired with {@link updatedAtDirection}.
   */
  @IsOptional()
  @IsString()
  @Matches(DATE_REGEX, { message: 'updatedAt must be YYYY-MM-DD' })
  updatedAt?: string;

  /** Whether {@link updatedAt} is an upper (`before`) or lower (`after`) bound. */
  @IsOptional()
  @IsIn(['before', 'after'])
  updatedAtDirection?: DateFilterDirection;
}
