import type { HealthResponse } from '@moura-solar/contracts';

export function healthLabel(health: HealthResponse | null): string {
  return health ? `API operacional · ${health.version}` : 'API indisponível neste momento';
}
