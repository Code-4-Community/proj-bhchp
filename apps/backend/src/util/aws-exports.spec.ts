type AwsExports = {
  AWSConfig: {
    bucketName?: string;
    region?: string;
  };
  CognitoAuthConfig: {
    userPoolId?: string;
    clientId?: string;
  };
};

const ORIGINAL_ENV = { ...process.env };

const ENV_KEYS = [
  'BHCHP_AWS_BUCKET_NAME',
  'AWS_BUCKET_NAME',
  'BHCHP_AWS_REGION',
  'AWS_REGION',
  'BHCHP_AWS_SES_SENDER_EMAIL',
  'AWS_SES_SENDER_EMAIL',
  'COGNITO_APP_CLIENT_ID',
  'VITE_COGNITO_APP_CLIENT_ID',
  'COGNITO_USER_POOL_ID',
  'VITE_COGNITO_USER_POOL_ID',
  'COGNITO_REGION',
  'VITE_COGNITO_REGION',
] as const;

function resetRelevantEnv(): void {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
}

async function loadAwsExports(): Promise<AwsExports> {
  jest.resetModules();
  const module = await import('./aws-exports');
  return module.default as AwsExports;
}

describe('aws-exports', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    resetRelevantEnv();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('loads config when required primary env vars are present', async () => {
    process.env.BHCHP_AWS_BUCKET_NAME = 'app-bucket';
    process.env.BHCHP_AWS_REGION = 'us-west-2';
    process.env.COGNITO_APP_CLIENT_ID = 'cognito-client';
    process.env.COGNITO_USER_POOL_ID = 'pool-id';

    const config = await loadAwsExports();

    expect(config.AWSConfig).toEqual({
      region: 'us-west-2',
      bucketName: 'app-bucket',
    });
    expect(config.CognitoAuthConfig).toEqual({
      userPoolId: 'pool-id',
      clientId: 'cognito-client',
    });
  });

  it('uses NX and VITE fallback env vars when primary vars are absent', async () => {
    process.env.BHCHP_AWS_BUCKET_NAME = 'fallback-bucket';
    process.env.VITE_COGNITO_APP_CLIENT_ID = 'vite-client';
    process.env.VITE_COGNITO_USER_POOL_ID = 'vite-pool';
    process.env.VITE_COGNITO_REGION = 'eu-west-1';

    const config = await loadAwsExports();

    expect(config.AWSConfig).toEqual({
      region: 'eu-west-1',
      bucketName: 'fallback-bucket',
    });
    expect(config.CognitoAuthConfig).toEqual({
      userPoolId: 'vite-pool',
      clientId: 'vite-client',
    });
  });

  it('throws when required AWS env vars are missing', async () => {
    await expect(loadAwsExports()).rejects.toThrow(
      'The following environmental variables are missing:BHCHP_AWS_BUCKET_NAME,AWS_REGION',
    );
  });

  it('throws when AWS and Cognito region vars are missing', async () => {
    process.env.BHCHP_AWS_BUCKET_NAME = 'app-bucket';
    process.env.COGNITO_APP_CLIENT_ID = 'cognito-client';
    process.env.COGNITO_USER_POOL_ID = 'pool-id';

    await expect(loadAwsExports()).rejects.toThrow(
      'The following environmental variables are missing:AWS_REGION',
    );
  });

  it('throws when Cognito app client is missing', async () => {
    process.env.BHCHP_AWS_BUCKET_NAME = 'app-bucket';
    process.env.AWS_REGION = 'us-west-2';

    await expect(loadAwsExports()).rejects.toThrow(
      'The following environmental variables are missing:COGNITO_APP_CLIENT_ID',
    );
  });
});
