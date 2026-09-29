import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { IdentityModule } from '../identity/identity.module';
import { CommercialController } from './commercial.controller';
import { CommercialService } from './commercial.service';

@Module({
  imports: [DatabaseModule, IdentityModule],
  controllers: [CommercialController],
  providers: [CommercialService],
  exports: [CommercialService],
})
export class CommercialModule {}
