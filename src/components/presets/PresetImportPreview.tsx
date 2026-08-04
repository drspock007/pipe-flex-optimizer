// src/components/presets/PresetImportPreview.tsx
// Review dialog shown before applying an imported preset file.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { MODE_LABELS, PRESET_MODES } from "@/lib/presets/schema";
import { ApplyResult, ConflictStrategy, ParsedImport, applyImport } from "@/lib/presets/transfer";

interface Props {
  data: ParsedImport | null;
  onClose: () => void;
  onDone: () => void;
}

const summaryText = (r: ApplyResult) =>
  [
    `${r.imported} imported`,
    r.replaced ? `${r.replaced} replaced` : "",
    r.skipped ? `${r.skipped} skipped` : "",
    r.overLimit ? `${r.overLimit} over limit` : "",
  ]
    .filter(Boolean)
    .join(", ");

export const PresetImportPreview = ({ data, onClose, onDone }: Props) => {
  const [strategy, setStrategy] = useState<ConflictStrategy>("rename");

  const confirm = () => {
    if (!data) return;
    const result = applyImport(data, strategy);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(summaryText(result));
      onDone();
    }
    onClose();
  };

  return (
    <Dialog open={!!data} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[95vw] max-w-lg">
        <DialogHeader>
          <DialogTitle>Import presets</DialogTitle>
          <DialogDescription>Review the file content before importing.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border p-3 text-sm">
            {PRESET_MODES.filter((m) => data?.[m]?.length).map((m) => (
              <div key={m} className="flex items-center justify-between py-0.5">
                <span>{MODE_LABELS[m]}</span>
                <span className="text-muted-foreground">{data?.[m]?.length} preset(s)</span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>If a name already exists</Label>
            <RadioGroup value={strategy} onValueChange={(v) => setStrategy(v as ConflictStrategy)}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="rename" id="cs-rename" />
                <Label htmlFor="cs-rename" className="font-normal">Keep both (rename the imported one)</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="skip" id="cs-skip" />
                <Label htmlFor="cs-skip" className="font-normal">Skip the imported one</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="replace" id="cs-replace" />
                <Label htmlFor="cs-replace" className="font-normal">Replace the existing one</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={confirm}>Import</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
