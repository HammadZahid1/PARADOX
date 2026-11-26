import type { MonteWorkerMessage, MonteWorkerProgress, MonteWorkerResponse } from '@/engine/monte/workerProtocol';
import type { MonteCarloResult } from '@/engine/types';
import { SimulationEngine } from '@/engine/simulation/engine';
import { runMonteCarlo } from '@/engine/monte/runner';
import { createId } from '@/utils/id';
import { isMonteCancelMessage, isMonteRunMessage, type MonteOutboundMessage } from './protocol';

const cancelled = new Set<string>();
const post = (message: MonteWorkerMessage): void => {
  (self as unknown as { postMessage: (value: MonteWorkerMessage) => void }).postMessage(message);
};

self.addEventListener('message', (event: MessageEvent<MonteOutboundMessage>) => {
  const message: unknown = event.data;
  if (isMonteCancelMessage(message)) {
    cancelled.add(message.requestId);
    return;
  }
  if (!isMonteRunMessage(message)) return;
  const { requestId, request, scenario } = message;
  cancelled.delete(requestId);
  try {
    const result: MonteCarloResult = runMonteCarlo(
      request,
      (seed) => {
        const trial = new SimulationEngine({
          ...scenario,
          id: createId('trial'),
          configuration: { ...scenario.configuration, seed },
        });
        trial.run(request.maxSteps);
        return { finalState: trial.activeBranch.currentState, timeline: trial.activeBranch.timeline };
      },
      {
        shouldCancel: () => cancelled.has(requestId),
        onProgress: (progress): void => {
          const update: MonteWorkerProgress = {
            type: 'monte:progress', requestId,
            completed: progress.completed, total: progress.total, runIndex: progress.runIndex,
            seed: progress.seed, value: progress.value, cancelled: progress.cancelled,
          };
          post(update);
        },
      },
    );
    cancelled.delete(requestId);
    const response: MonteWorkerResponse = { type: 'monte:result', requestId, result };
    post(response);
  } catch (error) {
    const response: MonteWorkerResponse = {
      type: 'monte:error', requestId,
      error: error instanceof Error ? error.message : 'Monte Carlo worker failed',
      cancelled: cancelled.has(requestId),
    };
    post(response);
  }
});
