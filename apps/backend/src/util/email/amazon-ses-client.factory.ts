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
      process.env.BHCHP_AWS_ACCESS_KEY_ID !== undefined ||
        process.env.AWS_ACCESS_KEY_ID !== undefined,
      'BHCHP_AWS_ACCESS_KEY_ID is not defined',
    );
    assert(
      process.env.BHCHP_AWS_SECRET_ACCESS_KEY !== undefined ||
        process.env.AWS_SECRET_ACCESS_KEY !== undefined,
      'BHCHP_AWS_SECRET_ACCESS_KEY is not defined',
    );
    assert(
      process.env.BHCHP_AWS_REGION !== undefined ||
        process.env.AWS_REGION !== undefined,
      'BHCHP_AWS_REGION is not defined',
    );

    return new SESClient({
      region: process.env.BHCHP_AWS_REGION || process.env.AWS_REGION,
      credentials: {
        accessKeyId:
          process.env.BHCHP_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey:
          process.env.BHCHP_AWS_SECRET_ACCESS_KEY ||
          process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  },
};
