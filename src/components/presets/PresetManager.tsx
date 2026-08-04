// src/components/presets/PresetManager.tsx
// Load / save / manage bar for locally stored presets.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FolderOpen, Library, Save } from "lucide-react";
import { toast } from "sonner";
import { usePresets } from "@/hooks/usePresets";
import { PresetMode } from "@/lib/presets/schema";
import { createPreset, findByName, overwritePreset, uniqueName } from "@/lib/presets/crud";
import { PresetLibraryDialog } from "./PresetLibraryDialog";
import { PresetConflictDialog } from "./PresetConflictDialog";

interface Props {
  mode: PresetMode;
  getCurrentValues: () => Record<string, unknown>;
  onLoad: (values: Record<string, unknown>) => void;
}

export const PresetManager = ({ mode, getCurrentValues, onLoad }: Props) => {
  const { presets, refresh } = usePresets(mode);
  const [saveOpen, setSaveOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [conflictName, setConflictName] = useState<string | null>(null);

  const valuesToSave = () => ({ ...getCurrentValues() });

  const report = (result: { ok: boolean; error?: string }, success: string) => {
    if (result.ok) {
      toast.success(success);
      refresh();
      setSaveOpen(false);
      setPresetName("");
    } else {
      toast.error(result.error ?? "Save failed");
    }
  };

  const handleSave = () => {
    const trimmed = presetName.trim();
    if (!trimmed) return;
    if (findByName(mode, trimmed)) {
      setConflictName(trimmed);
      return;
    }
    report(createPreset(mode, trimmed, valuesToSave()), `Preset "${trimmed}" saved`);
  };

  const handleLoadByName = (name: string) => {
    const preset = presets.find((p) => p.name === name);
    if (!preset) return;
    onLoad(preset.values);
    toast.success(`Preset "${name}" loaded`);
  };

  return (
    <>
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5 text-xs">
          <FolderOpen className="h-4 w-4" />
          Load preset
        </Label>
        <Select value="" onValueChange={handleLoadByName} onOpenChange={(o) => o && refresh()}>
          <SelectTrigger>
            <SelectValue placeholder={presets.length === 0 ? "No saved presets" : "Select a preset..."} />
          </SelectTrigger>
          <SelectContent>
            {presets.map((p) => (
              <SelectItem key={p.id} value={p.name}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="outline" className="flex-1" onClick={() => setSaveOpen(true)}>
          <Save className="mr-2 h-4 w-4" />
          Save preset
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => {
            refresh();
            setLibraryOpen(true);
          }}
        >
          <Library className="mr-2 h-4 w-4" />
          Manage ({presets.length})
        </Button>
      </div>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Save preset</DialogTitle>
            <DialogDescription>
              Save the current parameters on this device for quick reuse.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="preset-name">Preset name</Label>
            <Input
              id="preset-name"
              placeholder="e.g., NPS 12 river crossing"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              maxLength={100}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!presetName.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PresetConflictDialog
        name={conflictName}
        onCancel={() => setConflictName(null)}
        onOverwrite={() => {
          const existing = conflictName ? findByName(mode, conflictName) : undefined;
          setConflictName(null);
          if (existing) {
            report(overwritePreset(mode, existing.id, valuesToSave()), `Preset "${existing.name}" updated`);
          }
        }}
        onSaveCopy={() => {
          const base = conflictName ?? "Preset";
          setConflictName(null);
          const name = uniqueName(mode, base);
          report(createPreset(mode, name, valuesToSave()), `Preset "${name}" saved`);
        }}
      />

      <PresetLibraryDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        mode={mode}
        presets={presets}
        refresh={refresh}
        getCurrentValues={valuesToSave}
        onLoad={onLoad}
      />
    </>
  );
};
