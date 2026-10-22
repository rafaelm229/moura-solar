import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ProposalModule } from '../proposal/proposal.module';
import { DossierController } from './dossier.controller';
import { DossierUploadsService } from './dossier-uploads.service';
import { ContentValidatorService } from './content-validator.service';
import { ScannerService } from './scanner.service';
import { DossierService } from './dossier.service';

@Module({
  imports: [DatabaseModule, ProposalModule],
  controllers: [DossierController],
  providers: [DossierService, DossierUploadsService, ScannerService, ContentValidatorService],
  exports: [DossierService],
})
export class DossierModule {}
