// ══════════════════════════════════════════════════════════════
// FEM Web Worker — runs all heavy computation off main thread
// ══════════════════════════════════════════════════════════════

import { calculate, PipeInputs, CalculationResults } from "./calculations";

export type WorkerRequest = {
  id: number;
  inputs: PipeInputs;
};

export type WorkerResponse = {
  id: number;
  results: CalculationResults;
};

// Worker message handler
self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { id, inputs } = e.data;
  const results = calculate(inputs);
  (self as unknown as Worker).postMessage({ id, results } as WorkerResponse);
};
