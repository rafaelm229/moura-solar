import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AutomationsController } from './automations.controller';
import { AutomationsService } from './automations.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AutomationsController],
  providers: [AutomationsService],
  exports: [AutomationsService],
})
export class AutomationsModule {}
