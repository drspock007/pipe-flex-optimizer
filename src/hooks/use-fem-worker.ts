import { useState, useEffect, useRef } from "react";
import { PipeInputs, CalculationResults, calculate } from "@/lib/calculations";

export function useFEMWorker(inputs: PipeInputs, debounceMs: number = 300) {
  const [results, setResults] = useState<CalculationResults>(() => calculate(inputs));
  const [isComputing, setIsComputing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setIsComputing(true);
      try {
        const r = calculate(inputs);
        setResults(r);
      } catch (err) {
        console.error("[FEM] Calculation error:", err);
      }
      setIsComputing(false);
    }, debounceMs);

    return () => clearTimeout(debounceRef.current);
  }, [inputs, debounceMs]);

  return { results, isComputing };
}
