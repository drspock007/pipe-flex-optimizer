import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface NumericInputProps {
  value: number;
  onValueChange: (value: number) => void;
  className?: string;
  readOnly?: boolean;
  decimals?: number;
}

// Modifié par Giovanni malagnino, 2026-09-25 01:21 CEST (Europe/Rome, UTC+2)
// Missing or non-finite values (e.g. state from an older input shape) render empty instead of crashing.
const formatValue = (v: number | undefined, decimals: number): string => {
  if (typeof v !== "number" || !Number.isFinite(v)) return "";
  const rounded = parseFloat(v.toFixed(decimals));
  return String(rounded);
};

const NumericInput = ({ value, onValueChange, className, readOnly, decimals = 4 }: NumericInputProps) => {
  const [display, setDisplay] = useState(formatValue(value, decimals));
  const isFocused = useRef(false);

  // Sync display when value changes externally (e.g. reset, computed)
  useEffect(() => {
    if (!isFocused.current) {
      setDisplay(formatValue(value, decimals));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(",", ".");
    // Allow partial decimal input like "114." or empty or "-"
    if (/^-?\d*\.?\d*$/.test(raw)) {
      setDisplay(raw);
      const num = parseFloat(raw);
      if (!isNaN(num)) onValueChange(num);
    }
  };

  const handleFocus = () => {
    isFocused.current = true;
  };

  const handleBlur = () => {
    isFocused.current = false;
    // Clean up display on blur (remove trailing dot, sync)
    const num = parseFloat(display);
    setDisplay(isNaN(num) ? String(value) : String(num));
  };

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={display}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      readOnly={readOnly}
      className={cn(className)}
    />
  );
};

export default NumericInput;
