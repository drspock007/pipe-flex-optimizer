// src/contexts/UnitContext.tsx
// Provides unit system context — all internal values remain SI.

import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { UnitSystem, UnitType, toDisplay, fromDisplay, unitLabel } from "@/lib/unit-conversions";

interface UnitContextValue {
  system: UnitSystem;
  toggle: () => void;
  conv: (value: number, unit: UnitType) => number;
  parse: (displayValue: number, unit: UnitType) => number;
  label: (unit: UnitType) => string;
}

const UnitContext = createContext<UnitContextValue | null>(null);

export const UnitProvider = ({ children }: { children: ReactNode }) => {
  const [system, setSystem] = useState<UnitSystem>("SI");

  const toggle = useCallback(() => setSystem(s => (s === "SI" ? "Imperial" : "SI")), []);
  const conv = useCallback((v: number, u: UnitType) => toDisplay(v, u, system), [system]);
  const parse = useCallback((v: number, u: UnitType) => fromDisplay(v, u, system), [system]);
  const label = useCallback((u: UnitType) => unitLabel(u, system), [system]);

  return (
    <UnitContext.Provider value={{ system, toggle, conv, parse, label }}>
      {children}
    </UnitContext.Provider>
  );
};

export const useUnits = (): UnitContextValue => {
  const ctx = useContext(UnitContext);
  if (!ctx) throw new Error("useUnits must be used within UnitProvider");
  return ctx;
};
