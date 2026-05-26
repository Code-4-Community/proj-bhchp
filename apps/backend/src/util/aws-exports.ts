/**
 * Checks if AWS environmental variables exist
 * @throws {Error} If any AWS environmental variables don't exist.
 */
function checkAWSSecrets(): void {
  const missingVars = [];
  if (
    !process.env.BHCHP_AWS_ACCESS_KEY_ID &&
    !process.env.AWS_ACCESS_KEY_ID &&
    !process.env.NX_AWS_ACCESS_KEY
  ) {
    missingVars.push('BHCHP_AWS_ACCESS_KEY_ID');
  }
  if (
    !process.env.BHCHP_AWS_SECRET_ACCESS_KEY &&
    !process.env.AWS_SECRET_ACCESS_KEY &&
    !process.env.NX_AWS_SECRET_ACCESS_KEY
  ) {
    missingVars.push('BHCHP_AWS_SECRET_ACCESS_KEY');
  }
  if (!process.env.BHCHP_AWS_BUCKET_NAME && !process.env.AWS_BUCKET_NAME) {
    missingVars.push('BHCHP_AWS_BUCKET_NAME');
  }
  if (!process.env.COGNITO_REGION && !process.env.VITE_COGNITO_REGION) {
    missingVars.push('COGNITO_REGION');
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
  accessKeyId:
    process.env.BHCHP_AWS_ACCESS_KEY_ID ||
    process.env.AWS_ACCESS_KEY_ID ||
    process.env.NX_AWS_ACCESS_KEY,
  secretAccessKey:
    process.env.BHCHP_AWS_SECRET_ACCESS_KEY ||
    process.env.AWS_SECRET_ACCESS_KEY ||
    process.env.NX_AWS_SECRET_ACCESS_KEY,
  bucketName: process.env.BHCHP_AWS_BUCKET_NAME || process.env.AWS_BUCKET_NAME,
  region:
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
    !process.env.BHCHP_AWS_ACCESS_KEY_ID &&
    !process.env.AWS_ACCESS_KEY_ID &&
    !process.env.NX_AWS_ACCESS_KEY
  ) {
    missingVars.push('BHCHP_AWS_ACCESS_KEY_ID');
  }
  if (
    !process.env.BHCHP_AWS_SECRET_ACCESS_KEY &&
    !process.env.AWS_SECRET_ACCESS_KEY &&
    !process.env.NX_AWS_SECRET_ACCESS_KEY
  ) {
    missingVars.push('BHCHP_AWS_SECRET_ACCESS_KEY');
  }
  if (
    !process.env.COGNITO_APP_CLIENT_ID &&
    !process.env.VITE_COGNITO_APP_CLIENT_ID
  ) {
    missingVars.push('COGNITO_APP_CLIENT_ID');
  }
  if (!process.env.COGNITO_CLIENT_SECRET) {
    missingVars.push('COGNITO_CLIENT_SECRET');
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
  clientSecret: process.env.COGNITO_CLIENT_SECRET,
};

export default { CognitoAuthConfig, AWSConfig };
