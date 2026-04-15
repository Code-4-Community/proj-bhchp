import {
  CognitoIdentityProviderClient,
  CognitoIdentityProviderClientConfig,
} from '@aws-sdk/client-cognito-identity-provider';

export const COGNITO_IDENTITY_PROVIDER = 'COGNITO_IDENTITY_PROVIDER';

export const cognitoIdentityProviderFactory = {
  provide: COGNITO_IDENTITY_PROVIDER,
  useFactory: (): CognitoIdentityProviderClient => {
    const config: CognitoIdentityProviderClientConfig = {
      region: process.env.COGNITO_REGION || process.env.VITE_COGNITO_REGION,
    };

    return new CognitoIdentityProviderClient(config);
  },
};
