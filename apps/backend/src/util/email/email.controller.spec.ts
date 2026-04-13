import { Test, TestingModule } from '@nestjs/testing';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { RolesGuard } from '../../auth/roles.guard';
import { UsersService } from '../../users/users.service';
import { CurrentUserInterceptor } from '../../interceptors/current-user.interceptor';

const mockEmailService = {
  queueEmail: jest.fn(),
};

describe('EmailController', () => {
  let controller: EmailController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailController],
      providers: [
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: RolesGuard,
          useValue: { canActivate: jest.fn(() => true) },
        },
        {
          provide: UsersService,
          useValue: { findOne: jest.fn() },
        },
        {
          provide: CurrentUserInterceptor,
          useValue: { intercept: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<EmailController>(EmailController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should queue an email and return a confirmation message', async () => {
    const dto = {
      to: 'recipient@example.com',
      subject: 'Test subject',
      body: '<p>Hello</p>',
      attachments: [
        {
          filename: 'resume.pdf',
          content: Buffer.from('test'),
          contentType: 'application/pdf',
        },
      ],
    };

    mockEmailService.queueEmail.mockResolvedValue(undefined);

    await expect(controller.sendEmail(dto)).resolves.toEqual({
      message: 'Email queued',
    });
    expect(mockEmailService.queueEmail).toHaveBeenCalledWith(
      dto.to,
      dto.subject,
      dto.body,
      dto.attachments,
    );
  });
});
