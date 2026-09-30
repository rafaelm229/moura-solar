import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { IdentityModule } from '../identity/identity.module';
import { DesignController } from './design.controller';
import { DesignService } from './design.service';

@Module({
  imports: [DatabaseModule, IdentityModule],
  controllers: [DesignController],
  providers: [DesignService],
  exports: [DesignService],
})
export class DesignModule {}
