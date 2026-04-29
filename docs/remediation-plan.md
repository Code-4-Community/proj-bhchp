
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
