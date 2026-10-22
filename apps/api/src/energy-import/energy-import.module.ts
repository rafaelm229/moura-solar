import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { IdentityModule } from '../identity/identity.module';
import { EnergyImportController } from './energy-import.controller';
import { EnergyImportService } from './energy-import.service';

@Module({
  imports: [DatabaseModule, IdentityModule],
  controllers: [EnergyImportController],
  providers: [EnergyImportService],
})
export class EnergyImportModule {}
