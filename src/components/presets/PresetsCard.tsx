// src/components/presets/PresetsCard.tsx
// Bottom-of-page presets section, mirroring the Surface Load Calc layout.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PresetManager } from "./PresetManager";
import { PipeInputs } from "@/lib/calculations";

interface Props {
  inputs: PipeInputs;
  onLoad: (values: Partial<PipeInputs>) => void;
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
        onLoad={(values) => onLoad(values as Partial<PipeInputs>)}
      />
    </CardContent>
  </Card>
);

export default PresetsCard;
