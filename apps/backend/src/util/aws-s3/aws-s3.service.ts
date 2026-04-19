import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import envVars from '../aws-exports';

/**
 * Service to interface with the external object storage service (AWS S3).
 */
@Injectable()
export class AWSS3Service {
  private client: S3Client;
  private readonly bucketName = envVars.AWSConfig.bucketName;
  private readonly region = envVars.AWSConfig.region;

  private buildUniqueFileName(fileName: string): string {
    const dotIndex = fileName.lastIndexOf('.');
    const hasExtension = dotIndex > 0 && dotIndex < fileName.length - 1;
    const baseName = hasExtension ? fileName.slice(0, dotIndex) : fileName;
    const extension = hasExtension ? fileName.slice(dotIndex) : '';

    const safeBaseName = baseName.trim() || 'upload';
    const uniqueSuffix = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    return `${safeBaseName}-${uniqueSuffix}${extension}`;
  }

  constructor() {
    const accessKeyId = envVars.AWSConfig.accessKeyId ?? '';
    const secretAccessKey = envVars.AWSConfig.secretAccessKey ?? '';

    this.client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  /**
   * Creates an URL within the S3 bucket corresponding to a person and a document type.
   * @param person the person that the S3 object relates to.
   * @param type the document type that the S3 object relates to.
   * @returns the expected URL of the object of specified person and type,
   *          with filename in the form of 'JohnDoe-Resume.pdf'
   *          or 'janedoe-application.pdf'; the file extension is always a pdf.
   *
   * Does not throw beyond TypeScript errors.
   */
  createLink(person: string, type: string): string {
    const fileName = `${person}-${type}.pdf`;
    return this.createObjectLink(fileName);
  }

  createObjectLink(objectKey: string): string {
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${objectKey}`;
  }

  /**
   * Method to upload a file to the S3 bucket specified in the environmental variable.
   * @param fileBuffer in-memory representation of the file's data.
   * @param fileName desired base name of the file in the destination (AWS S3).
   * @param mimeType the desired MIME type to store the file as in S3,
   *                 MIME type indicates how a file should be processed
   *                 by a browser or email client (e.g., text/html, image/jpeg).
   *                 A unique timestamp/random suffix is appended to avoid object overwrites.
   * @throws Error with message 'File upload to AWS failed: ' with
   *         any error message from the S3 client appended to the end.
   *
   * @returns the S3 URL of the new object
   * @throws {Error} containing the error message from the external object storage provider S3
   */
  async upload(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<string> {
    const uploadResult = await this.uploadWithKey(
      fileBuffer,
      fileName,
      mimeType,
    );
    return uploadResult.url;
  }

  async uploadWithKey(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<{ key: string; url: string }> {
    try {
      const uniqueFileName = this.buildUniqueFileName(fileName);
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: uniqueFileName,
        Body: fileBuffer,
        ContentType: mimeType,
      });

      await this.client.send(command);

      return {
        key: uniqueFileName,
        url: this.createObjectLink(uniqueFileName),
      };
    } catch (error) {
      throw new Error('File upload to AWS failed: ' + error);
    }
  }
}
