import { Amplify } from 'aws-amplify';

// Amplify is configured once at app startup so every auth call shares the same
// Cognito user pool and app client settings.
const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;
// Read region from `AWS_REGION` (no Vite prefix).
const region = import.meta.env.AWS_REGION;
const userPoolClientId = import.meta.env.VITE_COGNITO_APP_CLIENT_ID;

let isConfigured = false;

const assertAmplifyEnv = (): string[] => {
  const missingVars: string[] = [];

  if (!userPoolId) missingVars.push('VITE_COGNITO_USER_POOL_ID');
  if (!region) missingVars.push('AWS_REGION');
  if (!userPoolClientId) missingVars.push('VITE_COGNITO_APP_CLIENT_ID');

  return missingVars;
};

export const configureAmplify = (): void => {
  if (isConfigured) {
    return;
  }

  // Check required env vars. If they're missing, warn and skip configuring
  // Amplify rather than throwing so the app can still load in development
  // environments where auth isn't set up.
  const missing = assertAmplifyEnv();
  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `Skipping Amplify configuration; missing env vars: ${missing.join(', ')}`,
    );
    return;
  }

  const resolvedUserPoolId = userPoolId as string;
  const resolvedUserPoolClientId = userPoolClientId as string;
  const resolvedRegion = region as string;

  // Provide both the nested `Cognito` shape and top-level keys so this
  // configuration works across multiple Amplify versions and satisfies
  // the project's Amplify types which expect an `Auth.Cognito` entry.
  type AmplifyAuthConfig = {
    Cognito: {
      userPoolId: string;
      userPoolClientId: string;
      [key: string]: unknown;
    };
    region?: string;
    userPoolWebClientId?: string;
    [key: string]: unknown;
  };

  const authConfig: AmplifyAuthConfig = {
    Cognito: {
      userPoolId: resolvedUserPoolId,
      userPoolClientId: resolvedUserPoolClientId,
    },
    // Keep top-level keys as well for runtime compatibility.
    region: resolvedRegion,
    userPoolWebClientId: resolvedUserPoolClientId,
  };

  Amplify.configure({ Auth: authConfig });

  isConfigured = true;
};
