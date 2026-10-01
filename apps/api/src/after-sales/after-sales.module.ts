import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AfterSalesController } from './after-sales.controller';
import { AfterSalesService } from './after-sales.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AfterSalesController],
  providers: [AfterSalesService],
  exports: [AfterSalesService],
})
export class AfterSalesModule {}
