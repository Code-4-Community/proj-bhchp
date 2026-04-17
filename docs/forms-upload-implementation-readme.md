# Confidentiality Form Upload Implementation Plan

## Motivation

Accepted applicants must be able to:

- download an empty confidentiality form,
- sign it (digitally or on paper),
- upload a signed PDF,
- and preview the uploaded document from the portal.

This plan is scoped to a single form only: Confidentiality Form.

## Current State (From Existing Code)

- Candidate route already exists at `/candidate/upload-forms` in [apps/frontend/src/app.tsx](../apps/frontend/src/app.tsx).
- Candidate nav item already points to the page in [apps/frontend/src/components/NavBar/NavBar.tsx](../apps/frontend/src/components/NavBar/NavBar.tsx).
- UI layout exists in [apps/frontend/src/containers/FormsPage.tsx](../apps/frontend/src/containers/FormsPage.tsx), but:
  - it still renders two forms,
  - upload is fake (placeholder URL),
  - there is no backend persistence.
- API client in [apps/frontend/src/api/apiClient.ts](../apps/frontend/src/api/apiClient.ts) has no forms endpoints yet.
- Backend already has S3 upload utility in [apps/backend/src/util/aws-s3/aws-s3.service.ts](../apps/backend/src/util/aws-s3/aws-s3.service.ts).
- Application status already includes `FORMS_SIGNED` in [apps/backend/src/applications/types.ts](../apps/backend/src/applications/types.ts).
- Application entity currently has resume/coverLetter fields, but no confidentiality form field in [apps/backend/src/applications/application.entity.ts](../apps/backend/src/applications/application.entity.ts).

## Scope

In scope:

- one form card only: Confidentiality Form,
- functional download button for empty template,
- functional upload button for signed PDF,
- persisted uploaded file reference so preview works after refresh,
- role-safe access for standard users to their own form only.

Out of scope:

- multiple forms support,
- admin-side form management UX,
- document e-sign workflow automation.

## Proposed Architecture

### 1. Data Model Changes

Add one nullable field to `Application`:

- `confidentialityForm?: string` (stored as S3 object key/filename, same pattern as `resume` and `coverLetter`).

Files to update:

- [apps/backend/src/applications/application.entity.ts](../apps/backend/src/applications/application.entity.ts)
- new migration in [apps/backend/src/migrations](../apps/backend/src/migrations)
- [apps/frontend/src/api/types.ts](../apps/frontend/src/api/types.ts) (`Application` interface)

Migration behavior:

- add nullable `confidentialityForm` column to `application` table,
- no backfill required.

### 2. Backend API Contract

Add endpoints under Applications controller because ownership is per application and existing auth model already lives there.

#### 2.1 Get Template URL

- Method: `GET /api/applications/forms/confidentiality/template`
- Auth: `STANDARD` and `ADMIN`
- Response: `{ templateUrl: string }`

Implementation options:

- Option A (fastest): serve a static PDF from frontend `public` and return that path.
- Option B (more controlled): serve from backend assets or S3 and return a backend-managed URL.

Recommended for this ticket: Option A for speed, then move to B if compliance/security requires.

#### 2.2 Upload Signed PDF

- Method: `POST /api/applications/me/forms/confidentiality`
- Auth: `STANDARD` only (or `ADMIN` with explicit appId route if needed later)
- Content-Type: `multipart/form-data`
- Field: `file`
- Validation:
  - required,
  - mime type `application/pdf`,
  - size limit (suggested: 10MB).
- Behavior:
  - resolve current user application via existing `applications/me` pattern,
  - generate deterministic filename (example: `<appId>_confidentiality_<timestamp>.pdf`),
  - upload to S3 via `AWSS3Service.upload`,
  - persist `application.confidentialityForm` with object key,
  - optionally move app status to `FORMS_SIGNED` when upload succeeds.
- Response:
  - `{ fileName: string, fileUrl: string, appStatus?: AppStatus }`

#### 2.3 Get Uploaded Form URL

- Method: `GET /api/applications/me/forms/confidentiality`
- Auth: `STANDARD`
- Response:
  - if uploaded: `{ fileName: string, fileUrl: string }`
  - if not uploaded: `404` or `{ fileName: null, fileUrl: null }` (pick one and keep consistent).

#### 2.4 Delete Uploaded Form (Optional but aligns with existing trash button)

- Method: `DELETE /api/applications/me/forms/confidentiality`
- Auth: `STANDARD`
- Behavior:
  - clear DB field,
  - optional S3 delete (can defer if not available in this ticket).

### 3. Backend Implementation Tasks

1. Add migration + entity field.
2. Extend `ApplicationsService` with helper methods:
   - `getCurrentApplicationByUserEmail(email)` (reuse existing lookup pattern),
   - `uploadConfidentialityForm(email, file)`,
   - `getConfidentialityForm(email)`,
   - `deleteConfidentialityForm(email)` (optional).
3. Add controller methods in [apps/backend/src/applications/applications.controller.ts](../apps/backend/src/applications/applications.controller.ts).
4. Use Nest file upload interceptor and PDF validators.
5. Reuse existing auth guards/interceptor stack.
6. Add unit tests for success and failure paths.

## Frontend Plan

### 1. Simplify FormsPage To Single Form

Update [apps/frontend/src/containers/FormsPage.tsx](../apps/frontend/src/containers/FormsPage.tsx):

- remove second form (`Application Form`),
- keep one card for `Confidentiality Form` only,
- keep existing UI but bind to real API data.

### 2. Add API Client Methods

In [apps/frontend/src/api/apiClient.ts](../apps/frontend/src/api/apiClient.ts), add:

- `getConfidentialityTemplateUrl()`
- `getMyConfidentialityForm()`
- `uploadMyConfidentialityForm(file: File)` using `FormData`
- `deleteMyConfidentialityForm()` (if endpoint implemented)

Implementation details:

- `upload` must send `multipart/form-data`,
- existing auth interceptor should attach JWT automatically,
- normalize response shape for easy `FormsPage` state updates.

### 3. Wire Button Behavior

Download button:

- call template endpoint (or use static public path) and open/download file.

Upload button:

- on file select, call `uploadMyConfidentialityForm`,
- on success, update local submission state with returned URL,
- show error state/message on failure,
- keep accepted file types as PDF only.

Preview button:

- open returned uploaded form URL.

Delete button (if implemented):

- call delete endpoint,
- clear local state and return to incomplete UI state.

### 4. Load Existing Uploaded State On Mount

When page loads:

- call `getMyConfidentialityForm()`,
- if found, render as completed and enable preview,
- if not found, keep incomplete state.

This ensures state is not lost on refresh.

## Security and Validation

- Enforce ownership: standard users can only access their own application/form.
- Reject non-PDF uploads and oversized files server-side.
- Sanitize generated file names (no user-supplied direct object key).
- Keep S3 bucket credentials server-side only.

## Test Plan

### Backend

Add tests to:

- [apps/backend/src/applications/applications.controller.spec.ts](../apps/backend/src/applications/applications.controller.spec.ts)
- [apps/backend/src/applications/application.service.spec.ts](../apps/backend/src/applications/application.service.spec.ts)

Cases:

- upload success stores object key and returns URL,
- upload rejects non-PDF,
- upload rejects unauthorized user,
- get uploaded form returns expected URL,
- not-uploaded behavior is consistent with chosen response contract,
- optional delete clears stored field.

### Frontend

Add tests for [apps/frontend/src/containers/FormsPage.tsx](../apps/frontend/src/containers/FormsPage.tsx):

- initial load shows incomplete when no file,
- download button opens template URL,
- upload success transitions to completed state,
- preview opens uploaded URL,
- upload error displays failure feedback.

Mock strategy:

- follow existing `vi.mock('@api/apiClient', ...)` patterns in the frontend test suite.

## Manual QA Checklist

1. Log in as accepted standard user.
2. Navigate to My Forms.
3. Click Download Template and verify an empty confidentiality form file is downloaded/opened.
4. Upload a signed PDF.
5. Verify UI shows Completed.
6. Refresh page and verify Completed still shows.
7. Click Preview and verify uploaded file opens.
8. Try uploading non-PDF and verify rejection.

## Delivery Sequence

1. Backend migration + entity + service + controller.
2. Backend tests.
3. Frontend API client + FormsPage wiring.
4. Frontend tests.
5. Manual QA using accepted user account.

## Definition Of Done

- Only one form appears on My Forms page: Confidentiality Form.
- Download button returns an empty confidentiality template.
- Upload button persists a signed PDF and is visible after refresh.
- Preview button opens uploaded PDF.
- API is protected and validated.
- Tests for core success/failure scenarios are added and passing.