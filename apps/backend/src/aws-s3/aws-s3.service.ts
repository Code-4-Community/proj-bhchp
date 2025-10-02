import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../../.env') });

import { Injectable } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

@Injectable()
export class AWSS3Service {
  private client: S3Client;
  private readonly bucketName = process.env.AWS_BUCKET_NAME;
  private readonly region: string;

  constructor() {
    this.region = process.env.AWS_REGION || 'us-east-2';
    this.bucketName = process.env.AWS_BUCKET_NAME;

    if (!this.bucketName) {
      throw new Error(
        'AWS_BUCKET_NAME is not defined in environment variables',
      );
    }

    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error(
        'AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY is not defined in environment variables',
      );
    }

    this.client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  // In the form of "JohnDoe-Resume.pdf"
  createLink(person: string, type: string): string {
    const fileName = `${person}-${type}.pdf`;
    return `https://${this.bucketName}.s3.us-east-2.amazonaws.com/${fileName}`;
  }

  async upload(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
        Body: fileBuffer,
        ContentType: mimeType,
      });

      await this.client.send(command);

      return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${fileName}`;
    } catch (error) {
      throw new Error('File upload to AWS failed: ' + error);
    }
  }
}
