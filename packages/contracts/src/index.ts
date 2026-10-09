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
  ActivityCanceledEventV1,
  ActivityCompletedEventV1,
  ActivityCreatedEventV1,
} from './activity-events.js';
export {
  parseActivityCanceledEventV1,
  parseActivityCompletedEventV1,
  parseActivityCreatedEventV1,
} from './activity-events.js';
export type {
  EnergyBillImportAppliedEventV1,
  EnergyBillImportEventV1,
  EnergyBillImportQueuedEventV1,
} from './energy-import-events.js';
export { parseEnergyBillImportEventV1 } from './energy-import-events.js';
export type {
  ProposalAcceptedEventV1,
  ProposalCreatedEventV1,
  ProposalDeliveredEventV1,
  ProposalRejectedEventV1,
  ProposalVersionCreatedEventV1,
} from './proposal-events.js';
export {
  parseProposalAcceptedEventV1,
  parseProposalCreatedEventV1,
  parseProposalDeliveredEventV1,
  parseProposalRejectedEventV1,
  parseProposalVersionCreatedEventV1,
} from './proposal-events.js';
export type {
  CustomerArchivedEventV1,
  CustomerCreatedEventV1,
  CustomerRestoredEventV1,
  CustomerUpdatedEventV1,
} from './customer-events.js';
export {
  parseCustomerArchivedEventV1,
  parseCustomerCreatedEventV1,
  parseCustomerRestoredEventV1,
  parseCustomerUpdatedEventV1,
} from './customer-events.js';
export type {
  OpportunityCreatedEventV1,
  OpportunityLostEventV1,
  OpportunityQualifiedEventV1,
  OpportunityReopenedEventV1,
  OpportunityUpdatedEventV1,
} from './opportunity-events.js';
export {
  parseOpportunityCreatedEventV1,
  parseOpportunityLostEventV1,
  parseOpportunityQualifiedEventV1,
  parseOpportunityReopenedEventV1,
  parseOpportunityUpdatedEventV1,
} from './opportunity-events.js';
export type {
  UtilityUnitCreatedEventV1,
  UtilityUnitUpdatedEventV1,
} from './utility-unit-events.js';
export {
  parseUtilityUnitCreatedEventV1,
  parseUtilityUnitUpdatedEventV1,
} from './utility-unit-events.js';
