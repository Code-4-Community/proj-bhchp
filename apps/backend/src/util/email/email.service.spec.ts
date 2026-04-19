import { Test, TestingModule } from '@nestjs/testing';
import { AmazonSESWrapper } from './amazon-ses.wrapper';
import { EmailService } from './email.service';
import { mock } from 'jest-mock-extended';

const mockAmazonSESWrapper = mock<AmazonSESWrapper>();

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: AmazonSESWrapper,
          useValue: mockAmazonSESWrapper,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should send an email by calling SES', async () => {
    mockAmazonSESWrapper.sendEmails.mockResolvedValue({
      MessageId: 'test',
      $metadata: {},
    });
    await service.queueEmail('recipient@email.com', 'Subject', '<h1>body</h1>');
    expect(mockAmazonSESWrapper.sendEmails).toHaveBeenCalled();
  });

  it('should throw an error and pass on information with no loss if the SESWrapper throws', async () => {
    mockAmazonSESWrapper.sendEmails.mockRejectedValueOnce(
      new Error('Error in sending email.'),
    );
    await expect(
      service.queueEmail('recipient@email.com', 'Subject', '<h1>body</h1>'),
    ).rejects.toThrow('Error in sending email.');
  });

  it('should call the private sendEmail helper with attachments', async () => {
    mockAmazonSESWrapper.sendEmails.mockResolvedValue({
      MessageId: 'test',
      $metadata: {},
    });

    const attachments = [
      {
        filename: 'resume.pdf',
        content: Buffer.from('test'),
        contentType: 'application/pdf',
      },
    ];

    await expect(
      (
        service as unknown as {
          sendEmail: (
            recipientEmail: string,
            subject: string,
            bodyHTML: string,
            attachments?: unknown[],
          ) => Promise<unknown>;
        }
      ).sendEmail(
        'recipient@email.com',
        'Subject',
        '<h1>body</h1>',
        attachments,
      ),
    ).resolves.toEqual({
      MessageId: 'test',
      $metadata: {},
    });

    expect(mockAmazonSESWrapper.sendEmails).toHaveBeenCalledWith(
      ['recipient@email.com'],
      'Subject',
      '<h1>body</h1>',
      attachments,
    );
  });
});
