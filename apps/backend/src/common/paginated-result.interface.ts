/**
 * Generic envelope for a single page of results returned by a paginated endpoint.
 *
 * @template T the type of each row in the page.
 */
export interface PaginatedResult<T> {
  /** The rows for the requested page. */
  data: T[];
  /** Total number of rows across all pages (ignoring page/limit). */
  total: number;
  /** 1-based page number that was returned. */
  page: number;
  /** Maximum number of rows per page that was applied. */
  limit: number;
}
