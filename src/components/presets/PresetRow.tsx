// src/components/presets/PresetRow.tsx
// One preset line: name, summary, dates and per-preset actions.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Copy, Download, Pencil, Save, Trash2, X } from "lucide-react";
import { PresetEntry, PresetMode } from "@/lib/presets/schema";

interface Props {
  preset: PresetEntry;
  onLoad: () => void;
  onRename: (name: string) => void;
  onDuplicate: () => void;
  onOverwrite: () => void;
  onDelete: () => void;
}

// Short human preview of the key pipe parameters stored in a preset (always SI)
function summarize(values: Record<string, unknown>, mode: PresetMode): string {
  if (mode === "in-service") {
    const parts = [`D₀ ${values.od} mm`, `t ${values.thickness} mm`, `Total ${Number(values.halfLength)*2/1000} m`, `Target ${values.displacement} mm`, `${values.allowablePercent}% of yield`];
    if (Array.isArray(values.scenarios)) parts.push(`${values.scenarios.length} scenario(s)`);
    return parts.join(" · ");
  }
  const num = (k: string) => (typeof values[k] === "number" ? (values[k] as number) : undefined);
  const parts: string[] = [];
  const Do = num("Do");
  const t = num("t");
  const L = num("L");
  const h = num("h");
  if (Do !== undefined) parts.push(`D₀ ${Do} mm`);
  if (t !== undefined) parts.push(`t ${t} mm`);
  if (L !== undefined) parts.push(`L ${L} m`);
  if (h !== undefined) parts.push(`h ${h} mm`);
  if (typeof values.grade === "string") parts.push(values.grade);
  return parts.join(" · ");
}

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
};

export const PresetRow = ({ preset, onLoad, onRename, onDuplicate, onOverwrite, onDelete }: Props) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(preset.name);

  const commit = () => {
    onRename(draft);
    setEditing(false);
  };

  return (
    <div className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="flex items-center gap-1">
            <Input
              value={draft}
              maxLength={100}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && commit()}
              className="h-8"
            />
            <Button size="icon" variant="ghost" aria-label="Confirm rename" onClick={commit}>
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Cancel rename"
              onClick={() => {
                setDraft(preset.name);
                setEditing(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <p className="truncate font-medium">{preset.name}</p>
            <p className="text-xs text-muted-foreground">{summarize(preset.values, preset.mode)}</p>
            <p className="text-xs text-muted-foreground">
              Created {fmtDate(preset.createdAt)} · Updated {fmtDate(preset.updatedAt)}
            </p>
          </>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-1">
        <Button size="sm" variant="secondary" onClick={onLoad}>
          <Download className="mr-1 h-3.5 w-3.5" />
          Load
        </Button>
        <Button size="icon" variant="ghost" aria-label="Rename preset" onClick={() => setEditing(true)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" aria-label="Duplicate preset" onClick={onDuplicate}>
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Overwrite with current values"
          title="Overwrite with current input values"
          onClick={onOverwrite}
        >
          <Save className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Delete preset"
          className="text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
