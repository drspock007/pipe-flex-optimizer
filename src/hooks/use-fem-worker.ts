import { useState, useEffect, useRef } from "react";
import { PipeInputs, CalculationResults, calculate } from "@/lib/calculations";
import type { WorkerRequest, WorkerResponse } from "@/lib/fem-worker";

export function useFEMWorker(inputs: PipeInputs, debounceMs: number = 300) {
  const [results, setResults] = useState<CalculationResults>(() => calculate(inputs));
  const [isComputing, setIsComputing] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Initialize worker
  useEffect(() => {
    try {
      workerRef.current = new Worker(
        new URL("../lib/fem-worker.ts", import.meta.url),
        { type: "module" }
      );

      workerRef.current.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const { id, results: newResults } = e.data;
        if (id === requestIdRef.current) {
          clearTimeout(timeoutRef.current);
          setResults(newResults);
          setIsComputing(false);
        }
      };

      workerRef.current.onerror = (err) => {
        console.error("[FEM Worker] Error:", err);
        clearTimeout(timeoutRef.current);
        setIsComputing(false);
      };
    } catch {
      console.warn("[FEM Worker] Web Worker not supported, using main thread");
      workerRef.current = null;
    }

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
      clearTimeout(timeoutRef.current);
    };
  }, []);

  // Debounced computation
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const id = ++requestIdRef.current;
      setIsComputing(true);

      // Always run on main thread for reliability
      // Worker can silently hang on complex searches
      try {
        const r = calculate(inputs);
        if (id === requestIdRef.current) {
          setResults(r);
          setIsComputing(false);
        }
      } catch (err) {
        console.error("[FEM] Calculation error:", err);
        setIsComputing(false);
      }
    }, debounceMs);

    return () => clearTimeout(debounceRef.current);
  }, [inputs, debounceMs]);

  return { results, isComputing };
}
