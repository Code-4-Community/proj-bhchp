import { Controller, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUserInterceptor } from '../interceptors/current-user.interceptor';
import { DisciplinesService } from './disciplines.service';

@Controller('disciplines')
@UseInterceptors(CurrentUserInterceptor)
@UseGuards(AuthGuard('jwt'))
export class DisciplinesController {
  constructor(private disciplinesService: DisciplinesService) {}
  // TODO: fill out with actual API endpoints
}
