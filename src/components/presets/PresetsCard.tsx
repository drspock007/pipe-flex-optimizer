// src/components/presets/PresetsCard.tsx
// Modifié par Giovanni malagnino, 2026-09-25 01:21 CEST (Europe/Rome, UTC+2)
// Bottom-of-page presets section, mirroring the Surface Load Calc layout.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PresetManager } from "./PresetManager";
import { AppInputs, normalizeAppInputs } from "@/lib/v2-app/inputs";

interface Props {
  inputs: AppInputs;
  /** Receives complete inputs: legacy presets get explicit defaults (hl = 0, free axial mode). */
  onLoad: (values: AppInputs) => void;
}

const PresetsCard = ({ inputs, onLoad }: Props) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">Presets</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Save the complete input set (geometry, material, coating, load and calculation mode) on this
        device, and reload it in one click. Presets can be exported to a file to move them to another
        device.
      </p>
      <PresetManager
        mode="lowering"
        getCurrentValues={() => ({ ...inputs })}
        onLoad={(values) => onLoad(normalizeAppInputs(values as Record<string, unknown>, inputs))}
      />
    </CardContent>
  </Card>
);

export default PresetsCard;
