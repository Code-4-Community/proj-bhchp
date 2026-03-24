import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { EmailService } from './email.service';
import { SendEmailDto } from './dto/send-email.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { UserType } from '../../users/types';

/**
 * Controller to expose callable HTTP endpoints to
 * manage email communications.
 */
@Controller('email')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserType.ADMIN)
export class EmailController {
  constructor(private emailService: EmailService) {}

  /**
   * Exposes an endpoint to send an email to a recipient.
   * @param body object optionally containing information about the
   *             contents of the email, and the recipient.
   * @returns object containing message 'Email queued'
   */
  @Post('send')
  async sendEmail(@Body() sendEmailDTO: SendEmailDto) {
    const { to, subject, body, attachments } = sendEmailDTO;
    await this.emailService.queueEmail(to, subject, body, attachments);
    return { message: 'Email queued' };
  }
}
