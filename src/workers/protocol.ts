import type { MonteWorkerRequest } from '@/engine/monte/workerProtocol';
import type { MonteCarloRequest, Scenario } from '@/engine/types';

export interface MonteRunRequest extends MonteWorkerRequest {
  scenario: Scenario;
}

export interface MonteCancelRequest {
  type: 'monte:cancel';
  requestId: string;
}

export type MonteOutboundMessage = MonteRunRequest | MonteCancelRequest;

export function createMonteRunRequest(
  requestId: string,
  request: MonteCarloRequest,
  scenario: Scenario,
): MonteRunRequest {
  return { type: 'monte:run', requestId, request, scenario };
}

export function isMonteRunMessage(value: unknown): value is MonteRunRequest {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return record['type'] === 'monte:run' && typeof record['requestId'] === 'string'
    && typeof record['request'] === 'object' && record['request'] !== null
    && typeof record['scenario'] === 'object' && record['scenario'] !== null;
}

export function isMonteCancelMessage(value: unknown): value is MonteCancelRequest {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return record['type'] === 'monte:cancel' && typeof record['requestId'] === 'string';
}
