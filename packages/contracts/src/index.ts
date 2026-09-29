export type HealthStatus = 'ok' | 'degraded';

export interface HealthResponse {
  status: HealthStatus;
  service: string;
  version: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  code: string;
  message: string;
  details: Record<string, unknown>;
  traceId: string;
}
