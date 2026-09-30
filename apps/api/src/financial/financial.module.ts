import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { FinancialService } from './financial.service';
import { FinancialController } from './financial.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [FinancialController],
  providers: [FinancialService],
  exports: [FinancialService],
})
export class FinancialModule {}
