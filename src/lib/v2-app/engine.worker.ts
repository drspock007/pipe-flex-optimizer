// créé par Giovanni Malagnino, 2026-09-25 01:21 CEST (Europe/Rome, UTC+2)
// Web Worker running the V2 engine off the main thread.

import { runEngine, WorkerRequestMsg, WorkerResponseMsg } from "./protocol";

self.onmessage = (e: MessageEvent<WorkerRequestMsg>) => {
  const { id, channel, request } = e.data;
  let msg: WorkerResponseMsg;
  try {
    msg = { id, channel, ok: true, outcome: runEngine(request) };
  } catch (err) {
    msg = { id, channel, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  (self as unknown as Worker).postMessage(msg);
};
