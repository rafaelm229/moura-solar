import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ProposalModule } from '../proposal/proposal.module';
import { DossierController } from './dossier.controller';
import { DossierService } from './dossier.service';

@Module({
  imports: [DatabaseModule, ProposalModule],
  controllers: [DossierController],
  providers: [DossierService],
  exports: [DossierService],
})
export class DossierModule {}
