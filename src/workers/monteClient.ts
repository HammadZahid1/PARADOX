import { isMonteWorkerMessage, type MonteWorkerProgress } from '@/engine/monte/workerProtocol';
import type { MonteCarloRequest, MonteCarloResult } from '@/engine/types';
import type { Scenario } from '@/engine/types';
import { createId } from '@/utils/id';
import { createMonteRunRequest } from './protocol';

export interface MonteWorkerHandle {
  requestId: string;
  result: Promise<MonteCarloResult>;
  cancel: () => void;
}

/** Runs a bounded Monte Carlo batch in a module Web Worker without blocking the UI. */
export function startMonteWorker(
  request: MonteCarloRequest,
  scenario: Scenario,
  onProgress?: (progress: MonteWorkerProgress) => void,
): MonteWorkerHandle {
  const requestId = createId('monte');
  let worker: Worker;
  try {
    worker = new Worker(new URL('./monte.worker.ts', import.meta.url), { type: 'module' });
  } catch (error) {
    return {
      requestId,
      result: Promise.reject(error instanceof Error ? error : new Error('Worker unavailable')),
      cancel: () => undefined,
    };
  }

  const result = new Promise<MonteCarloResult>((resolve, reject) => {
    const finish = (): void => {
      worker.terminate();
    };
    worker.addEventListener('message', (event: MessageEvent<unknown>) => {
      if (!isMonteWorkerMessage(event.data) || event.data.requestId !== requestId) return;
      const message = event.data;
      if (message.type === 'monte:progress') {
        onProgress?.(message);
        return;
      }
      if (message.type === 'monte:result') {
        finish();
        resolve(message.result);
        return;
      }
      if (message.type === 'monte:error') {
        finish();
        reject(new Error(message.error));
      }
    });
    worker.addEventListener('error', (event) => {
      finish();
      reject(new Error(event.message || 'Monte Carlo worker error'));
    });
    worker.postMessage(createMonteRunRequest(requestId, request, scenario));
  });

  return {
    requestId,
    result,
    cancel: () => {
      worker.postMessage({ type: 'monte:cancel', requestId });
    },
  };
}
