import type { MonteCarloRequest, MonteCarloResult } from '@/engine/types';

export interface MonteWorkerRequest {
  type: 'monte:run';
  requestId: string;
  request: MonteCarloRequest;
}

export interface MonteWorkerProgress {
  type: 'monte:progress';
  requestId: string;
  completed: number;
  total: number;
  runIndex: number;
  seed: number;
  value: number | null;
  cancelled: boolean;
}

export interface MonteWorkerSuccessResponse {
  type: 'monte:result';
  requestId: string;
  result: MonteCarloResult;
}

export interface MonteWorkerErrorResponse {
  type: 'monte:error';
  requestId: string;
  error: string;
  cancelled?: boolean;
}

export type MonteWorkerResponse = MonteWorkerSuccessResponse | MonteWorkerErrorResponse;
export type MonteWorkerMessage = MonteWorkerRequest | MonteWorkerProgress | MonteWorkerResponse;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isMonteCarloRequest(value: unknown): value is MonteCarloRequest {
  if (!isRecord(value)) return false;
  if (typeof value['scenarioId'] !== 'string' || typeof value['variableKey'] !== 'string') return false;
  if (!isFiniteNumber(value['runs']) || !isFiniteNumber(value['baseSeed']) || !isFiniteNumber(value['maxSteps'])) return false;
  const sampleEvery = value['sampleEvery'];
  return sampleEvery === undefined || isFiniteNumber(sampleEvery);
}

function isMonteCarloResult(value: unknown): value is MonteCarloResult {
  if (!isRecord(value)) return false;
  if (!isMonteCarloRequest(value['request'])) return false;
  if (!isFiniteNumber(value['elapsedMs']) || typeof value['cancelled'] !== 'boolean') return false;
  if (!Array.isArray(value['values']) || !Array.isArray(value['runs'])) return false;
  const statistics = value['statistics'];
  return isRecord(statistics) && isFiniteNumber(statistics['count']) && Array.isArray(statistics['histogram']);
}

/** Runtime guard for messages exchanged with a Monte Carlo Web Worker. */
export function isMonteWorkerMessage(value: unknown): value is MonteWorkerMessage {
  if (!isRecord(value) || typeof value['requestId'] !== 'string') return false;

  switch (value['type']) {
    case 'monte:run':
      return isMonteCarloRequest(value['request']);
    case 'monte:progress': {
      const sample = value['value'];
      return (
        isFiniteNumber(value['completed']) &&
        isFiniteNumber(value['total']) &&
        isFiniteNumber(value['runIndex']) &&
        isFiniteNumber(value['seed']) &&
        typeof value['cancelled'] === 'boolean' &&
        (sample === null || sample === undefined || isFiniteNumber(sample))
      );
    }
    case 'monte:result':
      return isMonteCarloResult(value['result']);
    case 'monte:error':
      return typeof value['error'] === 'string';
    default:
      return false;
  }
}
