import { Controller, Get } from '@nestjs/common';

import { AppService } from './app.service';

/**
 * Higher-level controller that exposes all sub-controller endpoints.
 */
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  @Get('health')
  getHealth() {
    return { status: 'ok' };
  }
}
