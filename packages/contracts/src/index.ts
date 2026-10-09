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

export { parseIntegrationEvent } from './integration-event.js';
export type { IntegrationEvent } from './integration-event.js';
export type {
  EnergyBillImportAppliedEventV1,
  EnergyBillImportEventV1,
  EnergyBillImportQueuedEventV1,
} from './energy-import-events.js';
export { parseEnergyBillImportEventV1 } from './energy-import-events.js';
export type { ProposalAcceptedEventV1 } from './proposal-events.js';
export { parseProposalAcceptedEventV1 } from './proposal-events.js';
export type { CustomerCreatedEventV1 } from './customer-events.js';
export { parseCustomerCreatedEventV1 } from './customer-events.js';
export type { OpportunityCreatedEventV1 } from './opportunity-events.js';
export { parseOpportunityCreatedEventV1 } from './opportunity-events.js';
export type { UtilityUnitCreatedEventV1 } from './utility-unit-events.js';
export { parseUtilityUnitCreatedEventV1 } from './utility-unit-events.js';
