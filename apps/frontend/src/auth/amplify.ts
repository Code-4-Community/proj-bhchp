import { Amplify } from 'aws-amplify';

// Amplify is configured once at app startup so every auth call shares the same
// Cognito user pool and app client settings.
const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;
const region = import.meta.env.VITE_COGNITO_REGION;
const userPoolClientId = import.meta.env.VITE_COGNITO_APP_CLIENT_ID;

let isConfigured = false;

const assertAmplifyEnv = (): void => {
  const missingVars: string[] = [];

  if (!userPoolId) missingVars.push('VITE_COGNITO_USER_POOL_ID');
  if (!region) missingVars.push('VITE_COGNITO_REGION');
  if (!userPoolClientId) missingVars.push('VITE_COGNITO_APP_CLIENT_ID');

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required Cognito env vars: ${missingVars.join(', ')}`,
    );
  }
};

export const configureAmplify = (): void => {
  if (isConfigured) {
    return;
  }

  // Fail fast here so developers see a clear error if the frontend env file is
  // missing Cognito settings instead of getting a vague auth failure later.
  assertAmplifyEnv();

  const resolvedUserPoolId = userPoolId as string;
  const resolvedUserPoolClientId = userPoolClientId as string;

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: resolvedUserPoolId,
        userPoolClientId: resolvedUserPoolClientId,
      },
    },
  });

  isConfigured = true;
};
