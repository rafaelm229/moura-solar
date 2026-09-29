import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateEnvironment } from './config/environment';
import { DatabaseModule } from './database/database.module';
import { IdentityModule } from './identity/identity.module';
import { HealthModule } from './health/health.module';
import { CommercialModule } from './commercial/commercial.module';

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
  ],
})
export class AppModule {}
