import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface NumericInputProps {
  value: number;
  onValueChange: (value: number) => void;
  className?: string;
  readOnly?: boolean;
}

const NumericInput = ({ value, onValueChange, className, readOnly }: NumericInputProps) => {
  const [display, setDisplay] = useState(String(value));
  const isFocused = useRef(false);

  // Sync display when value changes externally (e.g. reset, computed)
  useEffect(() => {
    if (!isFocused.current) {
      setDisplay(String(value));
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
