import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { ProposalModule } from '../proposal/proposal.module';
import { FinancialModule } from '../financial/financial.module';
import { ContractController } from './contract.controller';
import { ContractService } from './contract.service';
import { ContractGeneratorService } from './contract-generator.service';

@Module({
  imports: [DatabaseModule, ConfigModule, ProposalModule, FinancialModule],
  controllers: [ContractController],
  providers: [ContractService, ContractGeneratorService],
  exports: [ContractService, ContractGeneratorService],
})
export class ContractModule {}
