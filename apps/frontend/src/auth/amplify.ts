import { Amplify } from 'aws-amplify';

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
