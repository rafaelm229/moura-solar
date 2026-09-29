import { plainToInstance, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsString,
  IsUrl,
  IsOptional,
  IsIn,
  MinLength,
  Max,
  Min,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65_535)
  API_PORT = 3001;

  @IsUrl({ require_tld: false })
  WEB_ORIGIN = 'http://localhost:3000';

  @IsIn(['true', 'false'])
  COOKIE_SECURE = 'false';

  @IsOptional()
  @IsString()
  @MinLength(32)
  BOOTSTRAP_TOKEN?: string;

  @IsString()
  @MinLength(32)
  IDENTITY_LINK_SECRET!: string;

  @IsString()
  DATABASE_URL!: string;

  @IsUrl({ require_tld: false })
  S3_ENDPOINT!: string;

  @IsString()
  S3_ACCESS_KEY!: string;

  @IsString()
  S3_SECRET_KEY!: string;

  @IsString()
  S3_BUCKET!: string;
}

export function validateEnvironment(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(`Invalid environment: ${errors.map((e) => e.property).join(', ')}`);
  }

  if (validated.WEB_ORIGIN.startsWith('https://') && validated.COOKIE_SECURE !== 'true')
    throw new Error('COOKIE_SECURE must be true for HTTPS origins');
  return validated;
}
