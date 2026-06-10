/**
 * Checks if AWS environmental variables exist
 * @throws {Error} If any AWS environmental variables don't exist.
 */
function checkAWSSecrets(): void {
  const missingVars = [];
  if (!process.env.BHCHP_AWS_BUCKET_NAME && !process.env.AWS_BUCKET_NAME) {
    missingVars.push('BHCHP_AWS_BUCKET_NAME');
  }
  if (
    !process.env.BHCHP_AWS_REGION &&
    !process.env.AWS_REGION &&
    !process.env.COGNITO_REGION &&
    !process.env.VITE_COGNITO_REGION
  ) {
    missingVars.push('AWS_REGION');
  }
  if (missingVars.length > 0) {
    throw new Error(
      'The following environmental variables are missing:' +
        missingVars.toString(),
    );
  }
}

checkAWSSecrets();

const AWSConfig = {
  bucketName: process.env.BHCHP_AWS_BUCKET_NAME || process.env.AWS_BUCKET_NAME,
  region:
    process.env.BHCHP_AWS_REGION ||
    process.env.AWS_REGION ||
    process.env.COGNITO_REGION ||
    process.env.VITE_COGNITO_REGION ||
    'us-east-2',
};

/**
 * Checks if authenticator provider environmental variables exist
 * @throws {Error} If any authenticator environmental variables don't exist.
 */
function checkAuthSecrets(): void {
  const missingVars = [];
  if (
    !process.env.COGNITO_APP_CLIENT_ID &&
    !process.env.VITE_COGNITO_APP_CLIENT_ID
  ) {
    missingVars.push('COGNITO_APP_CLIENT_ID');
  }
  if (missingVars.length > 0) {
    throw new Error(
      'The following environmental variables are missing:' +
        missingVars.toString(),
    );
  }
}

checkAuthSecrets();

const CognitoAuthConfig = {
  userPoolId:
    process.env.COGNITO_USER_POOL_ID || process.env.VITE_COGNITO_USER_POOL_ID,
  clientId:
    process.env.COGNITO_APP_CLIENT_ID || process.env.VITE_COGNITO_APP_CLIENT_ID,
};

const PublicFrontendUrl =
  process.env.PUBLIC_FRONTEND_URL || process.env.VITE_PUBLIC_FRONTEND_URL || '';

export default { CognitoAuthConfig, AWSConfig, PublicFrontendUrl };
