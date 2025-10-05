import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { AWSS3Service } from './aws-s3.service';
import { mockClient } from 'aws-sdk-client-mock';
import axios from 'axios';

const s3Mock = mockClient(S3Client);

describe('AWSS3Service', () => {
  let service: AWSS3Service;
  const bucketName = process.env.AWS_BUCKET_NAME;
  const bucketRegion = process.env.AWS_REGION;

  beforeEach(() => {
    s3Mock.reset();
    service = new AWSS3Service();
  });

  it('should throw error if AWS_BUCKET_NAME is not defined', () => {
    delete process.env.AWS_BUCKET_NAME;
    expect(() => new AWSS3Service()).toThrow(
      'AWS_BUCKET_NAME is not defined in environment variables',
    );
    process.env.AWS_BUCKET_NAME = bucketName; // restore for other tests
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

    expect(s3Mock.calls()).toHaveLength(1);
    expect(url).toBe(
      `https://${bucketName}.s3.${bucketRegion}.amazonaws.com/${fileName}`,
    );
  });

  it('should throw error on upload failure', async () => {
    s3Mock.on(PutObjectCommand).rejects(new Error('fail'));

    const buffer = Buffer.from('test');
    await expect(
      service.upload(buffer, 'file.pdf', 'application/pdf'),
    ).rejects.toThrow('File upload to AWS failed: Error: fail');
  });

  // take off ".skip" to run this test but do so sparingly
  it.skip('should actually upload a file to S3 (integration)', async () => {
    s3Mock.restore();
    const fileContent = `integration-test-content-${Date.now()}`;
    const buffer = Buffer.from(fileContent);
    const fileName = `integration-test-${Date.now()}.txt`;
    const mimeType = 'text/plain';
    const integrationService = new AWSS3Service();

    const url = await integrationService.upload(buffer, fileName, mimeType);
    console.log('Uploaded file URL:', url);
    expect(url).toContain(fileName);
    try {
      const response = await axios.get(url);
      expect(response.status).toBe(200);
      expect(response.data).toBe(fileContent);
    } catch (error) {
      throw new Error(
        `Failed to fetch the uploaded file from S3. Error: ${error.message}.`,
      );
    }
  }, 15000);
  // MAKE SURE TO CLEAN UP THE FILES FROM OUR S3 BUCKET AFTER RUNNING THE INTEGRATION TEST
});
