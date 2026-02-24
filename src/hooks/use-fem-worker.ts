import { useState, useEffect, useRef, useCallback } from "react";
import { PipeInputs, CalculationResults, calculate } from "@/lib/calculations";
import type { WorkerRequest, WorkerResponse } from "@/lib/fem-worker";

export function useFEMWorker(inputs: PipeInputs, debounceMs: number = 500) {
  const [results, setResults] = useState<CalculationResults>(() => calculate(inputs));
  const [isComputing, setIsComputing] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Initialize worker
  useEffect(() => {
    try {
      workerRef.current = new Worker(
        new URL("../lib/fem-worker.ts", import.meta.url),
        { type: "module" }
      );

      workerRef.current.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const { id, results: newResults } = e.data;
        // Only accept the latest request
        if (id === requestIdRef.current) {
          setResults(newResults);
          setIsComputing(false);
        }
      };

      workerRef.current.onerror = (err) => {
        console.error("[FEM Worker] Error:", err);
        setIsComputing(false);
        // Fallback to main thread
        setResults(calculate(inputs));
      };
    } catch {
      console.warn("[FEM Worker] Web Worker not supported, using main thread");
      workerRef.current = null;
    }

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  // Debounced computation
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const id = ++requestIdRef.current;
      setIsComputing(true);

      if (workerRef.current) {
        const msg: WorkerRequest = { id, inputs };
        workerRef.current.postMessage(msg);
      } else {
        // Fallback: main thread
        try {
          const r = calculate(inputs);
          if (id === requestIdRef.current) {
            setResults(r);
            setIsComputing(false);
          }
        } catch {
          setIsComputing(false);
        }
      }
    }, debounceMs);

    return () => clearTimeout(debounceRef.current);
  }, [inputs, debounceMs]);

  return { results, isComputing };
}
