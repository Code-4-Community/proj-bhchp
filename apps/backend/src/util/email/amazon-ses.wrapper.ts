import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  SESClient,
  SendRawEmailCommand,
  SendRawEmailCommandInput,
} from '@aws-sdk/client-ses';
import { AMAZON_SES_CLIENT } from './amazon-ses-client.factory';
import MailComposer = require('nodemailer/lib/mail-composer');
import * as dotenv from 'dotenv';
import Mail from 'nodemailer/lib/mailer';
dotenv.config();

/**
 * Defines an email attachment.
 */
export interface EmailAttachment {
  /**
   * Name of the file.
   *
   * TODO: Clarify whether this includes the file extension
   */
  filename: string;

  /**
   * Buffer or in-memory data representation of the file.
   */
  content: Buffer;
}

/**
 * Interfaces with Amazon SES to manage email sending.
 */
@Injectable()
export class AmazonSESWrapper {
  private client: SESClient;
  private readonly logger = new Logger(AmazonSESWrapper.name);

  /**
   * @param client injected from `amazon-ses-client.factory.ts`
   */
  constructor(@Inject(AMAZON_SES_CLIENT) client: SESClient) {
    this.client = client;
  }

  /**
   * Sends an email via Amazon SES.
   *
   * @param recipientEmails the email addresses of the recipients.
   * @param subject the subject of the email.
   * @param bodyHtml the HTML body of the email.
   * @param attachments any base64 encoded attachments to inlude in the email.
   * @resolves if the email was sent successfully.
   * @rejects if the email was not sent successfully.
   */
  async sendEmails(
    recipientEmails: string[],
    subject: string,
    bodyHtml: string,
    attachments?: EmailAttachment[],
  ) {
    const mailOptions: Mail.Options = {
      from: process.env.AWS_SES_SENDER_EMAIL,
      to: recipientEmails,
      subject: subject,
      html: bodyHtml,
    };

    if (attachments) {
      mailOptions.attachments = attachments.map((a) => ({
        filename: a.filename,
        content: a.content,
        encoding: 'base64',
      }));
    }

    const messageData = await new MailComposer(mailOptions).compile().build();

    const params: SendRawEmailCommandInput = {
      Destinations: recipientEmails,
      Source: process.env.AWS_SES_SENDER_EMAIL,
      RawMessage: { Data: messageData },
    };

    // Log minimal diagnostics before sending
    try {
      this.logger.debug(
        `SES send: from=${
          process.env.AWS_SES_SENDER_EMAIL
        }, to=${recipientEmails.join(',')}, subject=${subject}, attachments=${
          attachments?.length ?? 0
        }`,
      );
    } catch (e) {
      // ignore logging errors
    }

    try {
      const response = await this.client.send(new SendRawEmailCommand(params));
      return response;
    } catch (error) {
      this.logger.error(
        'SES send failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
