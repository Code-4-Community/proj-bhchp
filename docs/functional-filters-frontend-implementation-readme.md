# Functional Filters (Frontend) Implementation Plan

## Motivation

The Admin Landing page already includes a filter drawer UI, but filters are not functionally connected to the application table data.

This implementation will make filters fully functional so admins can reliably narrow down applications by:

- status,
- discipline,
- discipline admin,
- proposed start date,
- actual start date,
- and free-text search.

## Current State (From Existing Code)

- [apps/frontend/src/containers/AdminLanding.tsx](../apps/frontend/src/containers/AdminLanding.tsx) manages:
  - `searchQuery`,
  - filter panel open state,
  - data loading via `useApplications()`.
- [apps/frontend/src/components/FilterPopUp.tsx](../apps/frontend/src/components/FilterPopUp.tsx):
  - holds filter values in local component state,
  - does not emit selected filters to parent,
  - has a search input that is not connected to filter categories or result data.
- [apps/frontend/src/components/ApplicationTable.tsx](../apps/frontend/src/components/ApplicationTable.tsx):
  - currently filters only by `searchQuery`,
  - does not receive structured filter criteria.
- [apps/frontend/src/hooks/useApplications.ts](../apps/frontend/src/hooks/useApplications.ts):
  - fetches all applications for the signed-in admin discipline,
  - returns normalized rows,
  - does not support server-side filter parameters.

## Scope

In scope:

- connect filter UI to table results,
- support multi-select status and discipline filtering,
- support optional date filtering for proposed/actual start date,
- support discipline admin name filtering,
- preserve current text-search behavior and combine it with filters,
- add frontend tests for filtering behavior.

Out of scope (for this ticket):

- backend API changes for server-side filter querying,
- pagination backed by filtered server responses,
- saved filters across sessions.

## Proposed Filter Model

Create a shared frontend type:

```ts
export type ApplicationFilters = {
  statuses: string[];
  disciplines: string[];
  disciplineAdminNames: string[];
  proposedStartDate?: string;
  actualStartDate?: string;
};
```

Conventions:

- Empty arrays mean "no constraint".
- Empty/undefined dates mean "no constraint".
- Date comparison should be normalized to day precision.

## Proposed Architecture

### 1. Lift Filter State To AdminLanding

Move filter state ownership into [apps/frontend/src/containers/AdminLanding.tsx](../apps/frontend/src/containers/AdminLanding.tsx).

`AdminLanding` becomes source of truth for:

- `searchQuery`,
- `applicationFilters`,
- clear/reset behavior.

It will pass:

- current filters into `FilterPopUp`,
- callbacks (`onFiltersChange`, `onResetFilters`) into `FilterPopUp`,
- `searchQuery` + `applicationFilters` into `ApplicationTable`.

### 2. Make FilterPopUp Controlled

Update [apps/frontend/src/components/FilterPopUp.tsx](../apps/frontend/src/components/FilterPopUp.tsx) to be a controlled component.

Recommended props:

```ts
interface FilterPopUpProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  filters: ApplicationFilters;
  onFiltersChange: (next: ApplicationFilters) => void;
  onResetFilters: () => void;
  disciplineAdminOptions: string[];
}
```

Behavior changes:

- replace internal selected-value state with prop-driven values,
- update filters through `onFiltersChange`,
- keep collapse/open section state local (UI-only state),
- wire "Reset" action to `onResetFilters`,
- keep `totalFilters` badge based on non-empty filter fields.

### 3. Apply Structured Filters In ApplicationTable

Update [apps/frontend/src/components/ApplicationTable.tsx](../apps/frontend/src/components/ApplicationTable.tsx):

- add `filters: ApplicationFilters` prop,
- create deterministic `matchesFilters(application, filters)` logic,
- combine with existing text search using AND semantics:
  - record must match text query,
  - and record must match all active filter groups.

Matching rules:

- `statuses`: include if record status is in selected statuses.
- `disciplines`: include if record discipline is in selected disciplines.
- `disciplineAdminNames`: include if normalized full name matches one selected value.
- dates: compare normalized date strings (`YYYY-MM-DD`) from row values.

### 4. Derive Discipline Admin Options

In [apps/frontend/src/containers/AdminLanding.tsx](../apps/frontend/src/containers/AdminLanding.tsx):

- derive unique `disciplineAdminName` values from loaded `applications`,
- sort alphabetically,
- pass to `FilterPopUp` as `disciplineAdminOptions`.

### 5. Preserve Existing UX

- keep current drawer open/close interactions,
- keep search bar placement and behavior,
- preserve current table layout and row links,
- show same loading and error states from `useApplications`.

## Data Flow (After Implementation)

1. `useApplications()` fetches and normalizes rows.
2. `AdminLanding` holds `searchQuery` and `applicationFilters`.
3. `FilterPopUp` edits controlled filter state via callbacks.
4. `ApplicationTable` receives all rows + query + filters.
5. Table renders only rows that satisfy combined predicate.

## Edge Cases

- Empty data set: table renders no rows without throwing.
- Filter values selected but no matching rows: show empty result set (no error).
- Partial/invalid date input: ignore date filter until valid day format is entered.
- Unknown status label in data: safely exclude from status label assumptions.

## Testing Plan

### Component Tests

Update/add tests for:

- [apps/frontend/src/components/ApplicationTable.test.tsx](../apps/frontend/src/components/ApplicationTable.test.tsx)
- [apps/frontend/src/containers/AdminLanding.test.tsx](../apps/frontend/src/containers/AdminLanding.test.tsx) (create if missing)
- [apps/frontend/src/components/FilterPopUp.test.tsx](../apps/frontend/src/components/FilterPopUp.test.tsx) (create if missing)

Critical test cases:

1. No filters + no search returns all rows.
2. Status filter returns matching statuses only.
3. Discipline filter returns matching disciplines only.
4. Discipline admin filter returns matching admin names only.
5. Proposed date filter returns exact date matches.
6. Actual date filter returns exact date matches.
7. Combined filters use AND semantics.
8. Search and structured filters combine correctly.
9. Reset clears all filter constraints and returns full result set.

### Manual QA Checklist

1. Open Admin Landing.
2. Apply one status filter and verify row count decreases correctly.
3. Add discipline filter and verify intersection behavior.
4. Apply discipline admin filter and verify expected names only.
5. Set proposed/actual dates and verify date matches.
6. Type a search query while filters are active and verify combined narrowing.
7. Reset filters and confirm table returns to search-only behavior.
8. Close and reopen filter drawer to confirm selected values persist while on page.

## Delivery Sequence

1. Add `ApplicationFilters` type.
2. Refactor `FilterPopUp` to controlled props.
3. Lift filter state and handlers into `AdminLanding`.
4. Extend `ApplicationTable` filtering predicate.
5. Add/update component tests.
6. Run frontend tests and manual QA checklist.

## Definition Of Done

- Filter selections change visible rows immediately.
- Filters are combined predictably with search.
- Reset behavior clears all active filters.
- Existing admin landing UX remains intact.
- Automated tests cover core filtering and combination scenarios.