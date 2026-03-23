const CognitoAuthConfig = {
  userPoolId:
    process.env.COGNITO_USER_POOL_ID ??
    process.env.VITE_COGNITO_USER_POOL_ID ??
    '',
  clientId:
    process.env.COGNITO_APP_CLIENT_ID ??
    process.env.VITE_COGNITO_APP_CLIENT_ID ??
    '',
  region:
    process.env.COGNITO_REGION ??
    process.env.VITE_COGNITO_REGION ??
    'us-east-2',
};

export default CognitoAuthConfig;
