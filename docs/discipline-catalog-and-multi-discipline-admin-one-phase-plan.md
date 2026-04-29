# Discipline Catalog + Multi-Discipline Admins

## Scope
Single-phase cutover with no backward compatibility layer.

Objectives:
- Replace hardcoded discipline enums with a database-backed discipline catalog controlled by admins.
- Enforce discipline validity everywhere disciplines are accepted or persisted.
- Allow each admin to belong to multiple disciplines.

Out of scope:
- Legacy response fields or dual-write/dual-read behavior.
- Temporary enum fallbacks on frontend or backend.

## Architecture Decisions
1. Discipline Source of Truth
- Use table discipline as the only source of valid disciplines.
- Disciplines become data, not code constants.

2. Discipline Representation
- Use a stable string key for all references (example: rn, social-work).
- Keep a human-readable label for UI display.

3. Admin-to-Discipline Modeling
- Use junction table admin_discipline_map(email, discipline_key).
- Remove single discipline column from admin_info.

4. Validation Strategy
- Replace enum-based DTO validation with database-backed validation.
- Enforce again at service layer before writes (defense in depth).

## Data Model Changes

### discipline (replace enum-driven shape)
Target columns:
- id serial primary key
- key varchar unique not null
- label varchar unique not null
- is_active boolean not null default true
- created_at timestamp not null default now()
- updated_at timestamp not null default now()

### admin_info
- Keep email primary key and timestamps.
- Drop discipline column.

### admin_discipline_map (new)
- admin_email varchar not null references users(email) on delete cascade
- discipline_key varchar not null references discipline(key)
- created_at timestamp not null default now()
- primary key (admin_email, discipline_key)

### application
- Change discipline column from enum type to varchar.
- Add foreign key from application.discipline to discipline(key).

## One-Phase Implementation Tickets

### Ticket 1: Replace hardcoded discipline constants with catalog contracts
Files to update:
- apps/backend/src/disciplines/disciplines.constants.ts
- apps/frontend/src/api/types.ts

Tasks:
- Remove legacy discipline enum enum usage from runtime logic.
- Introduce shared API-facing types:
  - DisciplineKey = string
  - DisciplineCatalogItem { key, label, isActive, sortOrder }
- Keep type safety via interfaces and validator constraints, not enums.

Acceptance:
- No backend DTO or service validates discipline with IsEnum(legacy discipline enum).
- Frontend dropdowns do not use Object.values(enum) for disciplines.

### Ticket 2: Refactor discipline entity and API to catalog model
Files to update:
- apps/backend/src/disciplines/disciplines.entity.ts
- apps/backend/src/disciplines/dto/create-discipline.request.dto.ts
- apps/backend/src/disciplines/disciplines.service.ts
- apps/backend/src/disciplines/disciplines.controller.ts

Tasks:
- Entity: replace name enum column with key/label/isActive/sortOrder.
- DTOs:
  - create discipline
  - update discipline (new DTO)
  - optional activate/deactivate endpoint
- Service:
  - normalize key generation if key omitted (slug from label)
  - enforce unique key/label
  - return active catalog sorted by sortOrder then label
- Controller:
  - GET /disciplines -> list active for client consumption
  - admin endpoints for full CRUD

Acceptance:
- Admin can create/update/disable disciplines entirely through API.
- Client-facing list reflects database values only.

### Ticket 3: Implement DB-backed discipline validators
Files to add/update:
- apps/backend/src/disciplines/discipline-catalog.service.ts
- apps/backend/src/disciplines/validators/is-valid-discipline.validator.ts
- apps/backend/src/applications/dto/create-application.request.dto.ts
- apps/backend/src/applications/dto/update-application-discipline.request.dto.ts
- apps/backend/src/admin-info/dto/create-admin.dto.ts
- apps/backend/src/admin-provisioning/dto/provision-admin.dto.ts

Tasks:
- Build DisciplineCatalogService with lookup methods:
  - isValidDisciplineKey(key: string): Promise<boolean>
  - getValidDisciplineKeys(): Promise<string[]>
- Build class-validator constraint IsValidDisciplineKey.
- Replace IsEnum usage in all discipline fields.

Acceptance:
- Invalid key returns 400 with message listing current valid keys.
- Validator uses discipline table, not code constants.

### Ticket 4: Convert applications discipline to FK-backed varchar
Files to update:
- apps/backend/src/applications/application.entity.ts
- apps/backend/src/applications/applications.service.ts
- apps/backend/src/applications/applications.controller.ts
- apps/backend/src/seeds/seed.ts

Tasks:
- Change entity discipline type to string.
- Keep filtering endpoint but validate key against catalog.
- Ensure create/update paths reject unknown or inactive disciplines.
- Update seed data to use discipline keys.

Acceptance:
- Applications persist discipline keys that exist in discipline table.
- findByDiscipline only accepts valid keys.

### Ticket 5: Move admins to multi-discipline model
Files to update:
- apps/backend/src/admin-info/admin-info.entity.ts
- apps/backend/src/admin-info/admin-info.service.ts
- apps/backend/src/admin-info/admin-info.controller.ts
- apps/backend/src/admin-provisioning/admin-provisioning.service.ts
- apps/backend/src/admin-provisioning/types.ts

Files to add:
- apps/backend/src/admin-info/admin-discipline-map.entity.ts
- apps/backend/src/admin-info/dto/update-admin-disciplines.dto.ts

Tasks:
- Remove single discipline field from AdminInfo model.
- Add mapping entity for many-to-many relation.
- Change create/provision DTOs and service logic to disciplines: string[].
- Update getDisciplineAdminMap query to join mapping table and pick oldest admin per discipline.
- Add endpoint to replace an admin's discipline set atomically.

Acceptance:
- One admin can be assigned to multiple discipline keys.
- Admin provisioning persists all discipline assignments in one transaction.

### Ticket 6: Frontend cutover to runtime catalog + multi-discipline admin
Files to update:
- apps/frontend/src/api/types.ts
- apps/frontend/src/api/apiClient.ts
- apps/frontend/src/containers/CreateNewAdmin.tsx
- apps/frontend/src/hooks/useApplications.ts
- apps/frontend/src/containers/login.tsx

Tasks:
- Add API method to fetch discipline catalog.
- Replace enum-based dropdown rendering with fetched catalog data.
- Change admin create/provision forms from single-select to multi-select.
- For admin-scoped app retrieval, call a multi-discipline backend endpoint.

Acceptance:
- UI discipline options are entirely server-driven.
- Admin flows support selecting multiple disciplines.

### Ticket 7: Add/replace tests for new behavior
Files to update:
- apps/backend/src/admin-info/*.spec.ts
- apps/backend/src/admin-provisioning/*.spec.ts
- apps/backend/src/applications/*.spec.ts
- apps/backend/src/disciplines/*.spec.ts
- apps/frontend/src/hooks/*.test.ts
- apps/frontend/src/containers/*.test.tsx

Tasks:
- Remove enum-coupled expectations.
- Add tests for:
  - dynamic discipline validation
  - admin with multiple disciplines
  - application filtering by discipline key
  - discipline activation/deactivation behavior

Acceptance:
- Existing and new specs pass with no enum dependency.

## SQL Migration Skeleton (Single Release)

Create one migration file in apps/backend/src/migrations with an ordered script:

```sql
-- 1) Discipline table reshape
ALTER TABLE discipline
  ADD COLUMN IF NOT EXISTS key varchar,
  ADD COLUMN IF NOT EXISTS label varchar,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at timestamp NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamp NOT NULL DEFAULT now();

-- Backfill key/label from previous name enum text
UPDATE discipline
SET
  label = COALESCE(label, name::text),
  key = COALESCE(
    key,
    lower(regexp_replace(name::text, '[^a-zA-Z0-9]+', '-', 'g'))
  )
WHERE key IS NULL OR label IS NULL;

ALTER TABLE discipline
  ALTER COLUMN key SET NOT NULL,
  ALTER COLUMN label SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_discipline_key ON discipline(key);
CREATE UNIQUE INDEX IF NOT EXISTS uq_discipline_label ON discipline(label);

-- 2) admin_discipline_map
CREATE TABLE admin_discipline_map (
  admin_email varchar NOT NULL,
  discipline_key varchar NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT pk_admin_discipline_map PRIMARY KEY (admin_email, discipline_key),
  CONSTRAINT fk_adm_map_email FOREIGN KEY (admin_email) REFERENCES users(email) ON DELETE CASCADE,
  CONSTRAINT fk_adm_map_discipline FOREIGN KEY (discipline_key) REFERENCES discipline(key)
);

-- Backfill from old admin_info.discipline enum
INSERT INTO admin_discipline_map (admin_email, discipline_key)
SELECT ai.email,
       lower(regexp_replace(ai.discipline::text, '[^a-zA-Z0-9]+', '-', 'g'))
FROM admin_info ai;

-- 3) applications discipline enum -> varchar
ALTER TABLE application
  ALTER COLUMN discipline TYPE varchar USING lower(regexp_replace(discipline::text, '[^a-zA-Z0-9]+', '-', 'g'));

ALTER TABLE application
  ADD CONSTRAINT fk_application_discipline_key
  FOREIGN KEY (discipline) REFERENCES discipline(key);

-- 4) drop old admin_info discipline column
ALTER TABLE admin_info DROP COLUMN discipline;

-- 5) drop obsolete enum types if unused
-- DROP TYPE IF EXISTS public.admin_info_discipline_enum;
-- DROP TYPE IF EXISTS public.application_discipline_enum;
-- DROP TYPE IF EXISTS public.discipline_name_enum;
```

Notes:
- Confirm exact enum type names in your database before dropping.
- For PostgreSQL, dropping a type fails if still referenced.

## Backend API Contract Changes (Breaking)

1. Admin create/provision payload
Before:
- discipline: string

After:
- disciplines: string[]

2. Admin info response
Before:
- discipline: string

After:
- disciplines: string[]

3. Applications by discipline
- Keep existing single-discipline endpoint if desired.
- Add multi-discipline endpoint for admin scope:
  - GET /applications/by-disciplines?disciplines=rn,social-work

4. Discipline catalog endpoint
- GET /disciplines should return active catalog objects (key + label + ordering metadata).

## Cutover Checklist
1. Merge migration + backend code together.
2. Run migration in staging and verify:
- no null discipline keys
- all admin mappings created
- application FK integrity valid
3. Deploy backend.
4. Deploy frontend using new contracts.
5. Execute smoke tests for:
- create application
- create/provision admin with multiple disciplines
- admin landing scoped results

## Risks to Watch
- Slug collisions during key generation from labels.
- Existing data labels that normalize to identical keys.
- Query performance for admin discipline joins without indexes.

Mitigations:
- Enforce unique key and reject conflicting labels.
- Add indexes:
  - admin_discipline_map(admin_email)
  - admin_discipline_map(discipline_key)
  - application(discipline)

## Suggested Execution Order (Same Phase)
1. Migration + entities
2. Validation layer
3. Service/controller refactors
4. Frontend contract updates
5. Test updates and full test pass

## Remediation Plan: Remove Remaining legacy discipline enum Usage

### Goal
Eliminate all enum references while keeping the discipline catalog as the single source of truth.

### Step 0: Inventory and Categorize
- Search for legacy discipline enum references.
- Categorize by location: backend runtime, backend tests, frontend runtime, frontend tests, docs.
- Track each item with file path, purpose (validation, display, seed/test data), and replacement plan.

### Step 1: Backend Runtime Replacements
- Replace enum validations with DisciplineCatalogService checks.
- Replace enum-based DTO decorators with IsValidDisciplineKey / IsValidDisciplineKeys.
- Replace enum-derived lists in services/controllers with catalog queries.
- Update error messages to list keys from the catalog, not enum values.

### Step 2: Backend Tests
- Replace enum imports with plain string keys in fixtures.
- Use discipline key constants defined locally in spec files (rn, public-health) to avoid hidden coupling.
- Where tests assert validation errors, build expected messages from mocked catalog key lists.

### Step 3: Frontend Runtime
- Replace any enum-based dropdowns with catalog fetch results.
- Replace frontend validation that checks enum values with catalog-driven validation (or server-driven validation only).
- Update API types to use string discipline keys and catalog item shapes.

### Step 4: Frontend Tests
- Replace enum usage with string discipline keys in test fixtures.
- Stub catalog responses for UI tests that render discipline options.
- Ensure tests cover inactive discipline behavior (filtered out in client lists).

### Step 5: Docs and Cleanup
- Remove references to legacy discipline enum in docs, comments, and API examples.
- Delete unused enum file(s) once all references are removed.

### Acceptance Criteria
- Global search for legacy discipline enum returns 0 results.
- All discipline validation uses catalog-backed checks.
- Frontend renders only catalog-sourced disciplines.
- Tests pass without enum dependency.

