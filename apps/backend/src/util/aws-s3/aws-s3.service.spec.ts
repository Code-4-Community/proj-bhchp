import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../../.env') });

import {
  DeleteObjectsCommand,
  S3Client,
  S3ServiceException,
  waitUntilObjectNotExists,
  PutObjectCommand,
  PutObjectCommandInput,
  GetObjectCommand,
  NoSuchKey,
} from '@aws-sdk/client-s3';
import { AWSS3Service } from './aws-s3.service';
import { mockClient } from 'aws-sdk-client-mock';
import axios from 'axios';

const s3Mock = mockClient(S3Client);
jest.mock('../aws-exports', () => ({
  __esModule: true,
  default: {
    AWSConfig: {
      accessKeyId: 'test-access-key',
      secretAccessKey: 'test-secret-key',
      region: 'us-east-2',
      bucketName: 'bucket',
    },
    CognitoAuthConfig: {
      userPoolId: 'test-user-pool-id',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    },
  },
}));

describe('AWSS3Service', () => {
  const bucketName = 'bucket';
  const bucketRegion = 'us-east-2';

  let service: AWSS3Service;
  beforeEach(() => {
    s3Mock.reset();
    service = new AWSS3Service();
  });

  it('should create correct S3 link', () => {
    const link = service.createLink('JohnDoe', 'Resume');
    expect(link).toBe(
      `https://${bucketName}.s3.${bucketRegion}.amazonaws.com/JohnDoe-Resume.pdf`,
    );
  });

  it('should upload file and return correct URL', async () => {
    s3Mock.on(PutObjectCommand).resolves({});

    const buffer = Buffer.from('test');
    const fileName = 'file.pdf';
    const mimeType = 'application/pdf';

    const url = await service.upload(buffer, fileName, mimeType);
    const commandCall = s3Mock.call(0);
    const putObjectCommand = commandCall.args[0] as PutObjectCommand;
    const uploadedKey = putObjectCommand.input.Key;

    expect(s3Mock.calls()).toHaveLength(1);
    expect(uploadedKey).toMatch(/^file-\d{13}-[a-z0-9]{6}\.pdf$/);
    expect(url).toBe(
      `https://${bucketName}.s3.${bucketRegion}.amazonaws.com/${uploadedKey}`,
    );
  });

  it('should throw error on upload failure', async () => {
    s3Mock.on(PutObjectCommand).rejects(new Error('fail'));

    const buffer = Buffer.from('test');
    await expect(
      service.upload(buffer, 'file.pdf', 'application/pdf'),
    ).rejects.toThrow('File upload to AWS failed: Error: fail');
  });

  // take off ".skip" to run this test. It does cleanup automatically but READ/WRITES can still pile up
  it.skip('should actually upload a file to S3 (integration)', async () => {
    s3Mock.restore();
    const fileContent = `integration-test-content-${Date.now()}`;
    const buffer = Buffer.from(fileContent);
    const fileName = `integration-test-${Date.now()}.txt`;
    const mimeType = 'text/plain';
    const integrationService = new AWSS3Service();

    const url = await integrationService.upload(buffer, fileName, mimeType);
    const uploadedFileName = new URL(url).pathname.replace(/^\//, '');
    console.log('Uploaded file URL:', url);
    expect(uploadedFileName).toMatch(
      /^integration-test-\d+-\d{13}-[a-z0-9]{6}\.txt$/,
    );

    try {
      const response = await axios.get(url);
      expect(response.status).toBe(200);
      expect(response.data).toBe(fileContent);
    } catch (error) {
      throw new Error(
        `Failed to fetch the uploaded file from S3. Error: ${error.message}.`,
      );
    } finally {
      // cleanup uploaded object(s) from S3 using helper
      try {
        await deleteObjects({
          bucketName: process.env.AWS_BUCKET_NAME,
          keys: [uploadedFileName],
        });
      } catch (cleanupErr) {
        // don't mask test failure — log cleanup issues
        // eslint-disable-next-line no-unsafe-finally
        throw new Error(
          'Failed to clean up S3 objects after integration test:' + cleanupErr,
        );
      }

      try {
        await getObjectFromS3({
          bucketName: process.env.AWS_BUCKET_NAME,
          key: uploadedFileName,
        });
      } catch (err) {
        if (err instanceof NoSuchKey) {
          console.log(
            'object with filename ' +
              uploadedFileName +
              ' is successfully no longer in the bucket. No manual steps required',
          );
        } else {
          // eslint-disable-next-line no-unsafe-finally
          throw new Error(
            'There was an error trying to check if the object is no longer in the bucket. Please check the bucket manually to ensure proper cleanup.',
          );
        }
      }
    }
  }, 15000);

  // MAKE SURE TO CLEAN UP THE FILES FROM OUR S3 BUCKET AFTER RUNNING THE INTEGRATION TEST
});

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved. SPDX-License-Identifier: Apache-2.0
// For the following code to the end of the file, which has been modified:
/**
 * Delete multiple objects from an S3 bucket.
 * @param {{ bucketName: string, keys: string[] }}
 */
const deleteObjects = async ({ bucketName, keys }) => {
  const client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  try {
    const { Deleted } = await client.send(
      new DeleteObjectsCommand({
        Bucket: bucketName,
        Delete: {
          Objects: keys.map((k) => ({ Key: k })),
        },
      }),
    );
    for (const k of keys) {
      await waitUntilObjectNotExists(
        { client, maxWaitTime: 30 },
        { Bucket: bucketName, Key: k },
      );
    }
    console.log(
      `Successfully deleted ${Deleted.length} objects from S3 bucket. Deleted objects:`,
    );
    console.log(Deleted.map((d) => ` • ${d.Key}`).join('\n'));
  } catch (caught) {
    if (
      caught instanceof S3ServiceException &&
      caught.name === 'NoSuchBucket'
    ) {
      throw new Error(
        `Error from S3 while deleting objects from ${bucketName}. The bucket doesn't exist.`,
      );
    } else if (caught instanceof S3ServiceException) {
      throw new Error(
        `Error from S3 while deleting objects from ${bucketName}.  ${caught.name}: ${caught.message}`,
      );
    } else {
      throw caught;
    }
  }
};

/**
 * Get a single object from a specified S3 bucket.
 * @param {{ bucketName: string, key: string }}
 */
const getObjectFromS3 = async ({ bucketName, key }) => {
  const client = new S3Client({});
  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    }),
  );
  // The Body object also has 'transformToByteArray' and 'transformToWebStream' methods.
  const str = await response.Body.transformToString();
  console.log(str);
};
