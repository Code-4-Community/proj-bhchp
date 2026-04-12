# `util/cognito` — Application-driven Cognito user creation

> **Status:** SCAFFOLD / MOCK ONLY. No real AWS calls. See Linear ticket #238.
>
> Every function in `cognito.service.ts` returns realistically-shaped fake
> data so downstream callers can be built in parallel. The real AWS SDK
> wiring will be added in a follow-up ticket.

---

## Why this exists

When an applicant submits a PandaDoc application, we want to automatically
give them a way to log into the portal and track their own application. We
do **not** want to build our own password / account-activation flow — we
let Cognito do it natively:

1. **Applicant submits** a PandaDoc application.
2. **PandaDoc webhook** hits our create-application endpoint in
   `apps/backend/src/applications`. Once the application row is persisted,
   that endpoint will call `CognitoService.createCognitoUser(email, temporaryPassword)`.
3. The real implementation will call Cognito's **`AdminCreateUser`** API on
   our configured User Pool.
4. **Cognito automatically emails** the applicant their temporary password
   using the user pool's invitation message template. The new user is put
   into `FORCE_CHANGE_PASSWORD` state — they cannot access anything yet.
5. **Applicant logs in** with the temp password via the frontend (Amplify /
   Cognito hosted UI). Cognito responds with a `NEW_PASSWORD_REQUIRED`
   challenge.
6. The frontend prompts for a new permanent password and calls
   `CognitoService.handleNewPasswordChallenge(username, tempPassword, newPassword)`,
   which will call **`RespondToAuthChallenge`** with
   `ChallengeName: 'NEW_PASSWORD_REQUIRED'`.
7. Cognito returns real auth tokens (access, id, refresh) and the applicant
   is now fully authenticated with their own password.

If step 4's email is never received, or the temporary password expires
before the applicant completes step 5, an admin (or a support endpoint) can
call `CognitoService.resendTemporaryPassword(email)`, which will call
**`AdminCreateUser`** again with `MessageAction: 'RESEND'` — this does not
create a new user, it just re-sends the invitation email with a fresh
temporary password.

---

## API (current mock surface)

All three functions live on `CognitoService` in `cognito.service.ts`:

| Function                                                          | Cognito API called (in real impl)                  | Purpose                                            |
| ----------------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------- |
| `createCognitoUser(email, temporaryPassword)`                     | `AdminCreateUser`                                  | Create the user and trigger the invitation email.  |
| `handleNewPasswordChallenge(username, tempPassword, newPassword)` | `RespondToAuthChallenge` (`NEW_PASSWORD_REQUIRED`) | Complete first-login and receive real auth tokens. |
| `resendTemporaryPassword(email)`                                  | `AdminCreateUser` with `MessageAction: 'RESEND'`   | Re-send the invitation email to an existing user.  |

Return types are the real SDK types imported from
`@aws-sdk/client-cognito-identity-provider` (`AdminCreateUserResponse` and
`RespondToAuthChallengeResponse`), so the mock values already match what
the real implementation will return. See `cognito.service.ts` JSDoc blocks
for full parameter docs, side effects, and the exceptions each function
will surface once wired to AWS.

---

## Real implementation plan (follow-up ticket)

This is what the follow-up ticket should add. **Nothing below is implemented
yet** — it is spec for the next engineer.

### 1. SDK package

Already in `package.json` — no install needed:

```
@aws-sdk/client-cognito-identity-provider@^3.410.0
```

The follow-up implementation will import:

```ts
import { CognitoIdentityProviderClient, AdminCreateUserCommand, RespondToAuthChallengeCommand } from '@aws-sdk/client-cognito-identity-provider';
```

### 2. Environment variables

All three variables already have placeholders in `example.env`. Values are
left blank / `TODO` for this ticket — they will be populated when the real
implementation lands.

| Env var                                       | Used for                                                                                                | Source of truth                                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `COGNITO_USER_POOL_ID`                        | `UserPoolId` argument to `AdminCreateUser` and `RespondToAuthChallenge`.                                | AWS Console → Cognito → User pool.                                                           |
| `COGNITO_APP_CLIENT_ID`                       | `ClientId` argument to `RespondToAuthChallenge`. Must be the backend app client (with secret).          | AWS Console → Cognito → App integration → App clients.                                       |
| `AWS_REGION` (aliased as `COGNITO_REGION`)    | Region the `CognitoIdentityProviderClient` talks to.                                                    | Same region the user pool lives in.                                                          |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | IAM credentials with `cognito-idp:AdminCreateUser` and `cognito-idp:RespondToAuthChallenge` permission. | Existing backend AWS IAM user — already validated in `apps/backend/src/util/aws-exports.ts`. |
| `COGNITO_CLIENT_SECRET`                       | Used to compute `SECRET_HASH` in `ChallengeResponses` if the backend app client has a secret.           | AWS Console → Cognito → App client secret.                                                   |

The validation function in `apps/backend/src/util/aws-exports.ts` already
throws at boot if any of these are missing, so no extra validation needs
to live in this module.

### 3. Wiring

- Add `CognitoModule` to `AppModule.imports` (or let it stay `@Global()`
  and inject `CognitoService` directly into `ApplicationsService`).
- In the create-application flow, after the DB row is saved, call
  `createCognitoUser(dto.email, generatedTempPassword)` and persist the
  returned `User.Username` / `sub` on the application record.
- Expose a thin controller / endpoint for `resendTemporaryPassword` gated
  behind `RolesGuard` with `UserType.ADMIN`.
- Frontend wires `handleNewPasswordChallenge` into the "set your new
  password" screen that fires when Amplify reports a
  `NEW_PASSWORD_REQUIRED` challenge.

### 4. Security notes

- Temporary passwords must be generated with a CSPRNG and must satisfy the
  user pool's password policy. Never log them. The mock's `logger.debug`
  already redacts the temp password.
- Any failure to create a Cognito user after a successful application
  insert should be surfaced to the admin (not silently swallowed) so the
  application row can either be rolled back or flagged for retry via
  `resendTemporaryPassword`.
- The backend must use the **backend** app client (with secret) for
  `RespondToAuthChallenge`, not the frontend app client. `aws-exports.ts`
  already distinguishes between `COGNITO_APP_CLIENT_ID` (backend) and
  `VITE_COGNITO_APP_CLIENT_ID` (frontend) — reuse that distinction.

---

## Tests

`cognito.service.spec.ts` only verifies that the mocks return the expected
fake shapes and reject on missing arguments. Once the real implementation
lands, those tests should be replaced with `aws-sdk-client-mock`-based
tests that assert the correct commands are sent to the
`CognitoIdentityProviderClient` — see
`apps/backend/src/util/aws-s3/aws-s3.service.spec.ts` for the pattern to
follow.
