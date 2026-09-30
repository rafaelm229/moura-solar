import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { IdentityController } from './identity.controller';
import { IdentityGuard } from './identity.guard';
import { IdentityStore } from './identity.store';
import { AuthService } from './auth.service';
import { TeamService } from './team.service';
@Module({
  controllers: [IdentityController],
  providers: [
    IdentityStore,
    AuthService,
    TeamService,
    { provide: APP_GUARD, useClass: IdentityGuard },
  ],
  exports: [IdentityStore, AuthService],
})
export class IdentityModule {}
