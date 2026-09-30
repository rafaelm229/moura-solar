import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { ProposalController } from './proposal.controller';
import { ProposalService } from './proposal.service';
import { PdfService } from './pdf.service';
import { StorageService } from './storage.service';

@Module({
  imports: [DatabaseModule, ConfigModule],
  controllers: [ProposalController],
  providers: [ProposalService, PdfService, StorageService],
  exports: [ProposalService, PdfService, StorageService],
})
export class ProposalModule {}
