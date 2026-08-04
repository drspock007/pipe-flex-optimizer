// src/hooks/usePresets.ts
// Single source of truth for presets: re-reads on mount, in-app changes and cross-tab events.

import { useCallback, useEffect, useState } from "react";
import { PRESETS_CHANGED_EVENT, getPresets } from "@/lib/presets/crud";
import { PresetEntry, PresetMode, storageKey } from "@/lib/presets/schema";

export function usePresets(mode: PresetMode) {
  const [presets, setPresets] = useState<PresetEntry[]>(() => getPresets(mode));

  const refresh = useCallback(() => setPresets(getPresets(mode)), [mode]);

  useEffect(() => {
    refresh();
    const onLocalChange = () => refresh();
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === storageKey(mode)) refresh();
    };
    window.addEventListener(PRESETS_CHANGED_EVENT, onLocalChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(PRESETS_CHANGED_EVENT, onLocalChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [mode, refresh]);

  return { presets, refresh };
}
