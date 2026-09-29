import { plainToInstance } from 'class-transformer';
import { IsEnum, IsInt, IsString, IsUrl, Max, Min, validateSync } from 'class-validator';

enum Environment {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsInt()
  @Min(1)
  @Max(65_535)
  API_PORT = 3001;

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
    throw new Error(errors.toString());
  }

  return validated;
}
