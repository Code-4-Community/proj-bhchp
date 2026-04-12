import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PandadocWebhookController } from './pandadoc-webhook.controller';
import { PandadocWebhookService } from './pandadoc-webhook.service';
import { ApplicationsModule } from '../applications/applications.module';
import { CandidateInfoModule } from '../candidate-info/candidate-info.module';
import { LearnerInfoModule } from '../learner-info/learner-info.module';
import { UtilModule } from '../util/util.module';

@Module({
  imports: [
    ConfigModule,
    ApplicationsModule,
    CandidateInfoModule,
    LearnerInfoModule,
    UtilModule,
  ],
  controllers: [PandadocWebhookController],
  providers: [PandadocWebhookService],
})
export class PandadocWebhookModule {}
