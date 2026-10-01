import { Module } from '@nestjs/common';
import { EngineeringService } from './engineering.service';
import { EngineeringController } from './engineering.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [EngineeringController],
  providers: [EngineeringService],
  exports: [EngineeringService],
})
export class EngineeringModule {}
