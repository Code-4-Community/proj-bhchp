# Admin Landing: Discipline Admin Column Implementation Plan

## Objective
Add a new column to the admin landing applications table that shows the discipline admin name for each application row, resolved by the candidate's discipline.

This is not tied to the signed-in admin identity and is not a banner/header feature.

## Requirement Clarification
- For each application row:
  - candidate discipline -> resolve discipline admin name -> render in new table column.
- Resolve/admin map once (preferably at sign-in or first admin page load).
- Cache this mapping with a long TTL (30 days) to minimize latency and network load.
- Frontend stores only one admin per discipline (no full admin roster in cache).
- Backend provides one admin per discipline, selected as the oldest admin record for that discipline.

## Current State (from codebase)
- Admin landing container: `apps/frontend/src/containers/AdminLanding.tsx`
- Table data hook: `apps/frontend/src/hooks/useApplications.ts`
- Table component: `apps/frontend/src/components/ApplicationTable.tsx`
- Existing admin-info endpoint: `GET /api/admin-info/by-email/:email`
- Existing users endpoint(s): includes user profile with `firstName`, `lastName`, `email`, `userType`
- Existing admin-info includes `email`, `discipline`

## Lowest-Latency Architecture

### Core idea
Create and cache a `discipline -> admin display value` map, then enrich table rows in-memory at render/hook level.

### Data shape
Recommended normalized shape in frontend cache:

```ts
type DisciplineAdmin = {
   firstName: string;
   lastName: string;
};

type DisciplineAdminMap = Record<string, DisciplineAdmin>;
```

### Fetch strategy (fast path)
1. On admin sign-in success (or first admin route mount), fetch discipline-admin mapping once.
2. Store in:
   - in-memory singleton for immediate use during the session
   - localStorage/sessionStorage with TTL metadata for cross-refresh reuse
3. On admin landing load:
   - render applications immediately
   - enrich each row with `disciplineAdminName` from map in O(1)
   - do not block table on network if valid cache exists

### TTL strategy
- Default TTL: 28 days
- Configurable range: 14-28 days
- Cache key example: `bhchp.disciplineAdminMap.v1`
- Cache metadata:

```ts
{
  value: DisciplineAdminMap,
  fetchedAt: number,
  ttlMs: number,
  schemaVersion: 1
}
```

### Invalidation strategy
Invalidate cache when any of these occur:
- admin provisioning succeeds
- admin discipline changes
- admin removal occurs
- schemaVersion changes
- user signs out

## Backend API Options

### Required endpoint: dedicated aggregated endpoint
Add one backend endpoint that returns exactly one admin per discipline (the oldest admin by created time).

Example:
- `GET /api/admin-info/discipline-admin-map`

Response example:

```json
{
   "RN": { "firstName": "Alex", "lastName": "Kim" },
   "Social Work": { "firstName": "Jo", "lastName": "Rivera" }
}
```

Backend selection rule:
- For each discipline, choose the admin with the earliest `createdAt` in `admin_info`.
- If `createdAt` ties, break ties deterministically by email ascending.

Why this endpoint is best:
- single request
- no client-side N+1 lookups
- frontend only stores exactly one admin per discipline

## Frontend Implementation Steps
1. Add a new cache utility:
   - `apps/frontend/src/utils/disciplineAdminCache.ts`
2. Add a hook/service to load and cache discipline-admin map:
   - `apps/frontend/src/hooks/useDisciplineAdminMap.ts`
3. Extend application row model in `useApplications.ts`:
   - add `disciplineAdminName: string`
4. Update table column definitions in `ApplicationTable.tsx`:
   - add `Discipline Admin` column
5. Integrate prefetch at sign-in success path:
   - prime map cache so admin landing can render with near-zero additional latency
6. Add fallback rendering:
   - stale cache allowed while background refresh runs

## Performance Notes
- Row enrichment with map lookup is O(n) over applications with O(1) per row lookup.
- Cached map avoids repeated requests and prevents table-render blocking.
- Background refresh can update map without re-fetching applications.

## Testing Plan
1. Unit tests for cache utility:
   - hit/miss/expiry/version invalidation
2. Hook tests:
   - returns cached map without network
   - refreshes when TTL expired
3. Table tests:
   - single admin discipline renders one name
   - missing mapping renders `Unassigned`
4. Integration test:
   - sign-in prefetch populates cache and landing page uses it
5. Backend test for selection policy:
   - when multiple admins share a discipline, endpoint returns the oldest by `createdAt`
   - tie on `createdAt` resolves by email ascending

## Risks and Mitigations
- Risk: stale admin assignments due to long TTL.
  - Mitigation: event-driven invalidation on admin CRUD + background refresh on landing load.
- Risk: race between applications load and map load.
  - Mitigation: render placeholder (`Loading...` or `Unassigned`) then rehydrate cell values.

## Acceptance Criteria
- Admin landing applications table includes a `Discipline Admin` column.
- Column value is derived from application discipline, not signed-in user.
- Mapping fetch is cached with TTL (configurable 14-28 days).
- For disciplines with multiple admins, backend consistently returns oldest admin only.
- No measurable regression in initial table render latency.
