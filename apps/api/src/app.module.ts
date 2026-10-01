import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateEnvironment } from './config/environment';
import { DatabaseModule } from './database/database.module';
import { IdentityModule } from './identity/identity.module';
import { HealthModule } from './health/health.module';
import { CommercialModule } from './commercial/commercial.module';
import { DesignModule } from './design/design.module';
import { ProposalModule } from './proposal/proposal.module';
import { ContractModule } from './contract/contract.module';
import { FinancialModule } from './financial/financial.module';
import { InventoryModule } from './inventory/inventory.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validate: validateEnvironment,
    }),
    DatabaseModule,
    HealthModule,
    IdentityModule,
    CommercialModule,
    DesignModule,
    ProposalModule,
    ContractModule,
    FinancialModule,
    InventoryModule,
  ],
})
export class AppModule {}
