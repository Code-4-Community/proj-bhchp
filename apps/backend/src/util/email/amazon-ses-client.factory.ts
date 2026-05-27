import { Provider } from '@nestjs/common';
import { SESClient } from '@aws-sdk/client-ses';
import { assert } from 'console';
import * as dotenv from 'dotenv';
dotenv.config();

export const AMAZON_SES_CLIENT = 'AMAZON_SES_CLIENT';

/**
 * Factory that produces a new instance of the Amazon SES client.
 * Used to send emails via Amazon SES.
 */
export const amazonSESClientFactory: Provider<SESClient> = {
  provide: AMAZON_SES_CLIENT,
  useFactory: () => {
    assert(
      process.env.BHCHP_AWS_REGION !== undefined ||
        process.env.AWS_REGION !== undefined ||
        process.env.COGNITO_REGION !== undefined ||
        process.env.VITE_COGNITO_REGION !== undefined,
      'AWS region is not defined',
    );

    const region =
      process.env.BHCHP_AWS_REGION ||
      process.env.AWS_REGION ||
      process.env.COGNITO_REGION ||
      process.env.VITE_COGNITO_REGION;

    return new SESClient({
      region,
    });
  },
};
