// src/components/presets/PresetLibraryDialog.tsx
// Full preset management: search, sort, per-preset actions and file transfer.

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { toast } from "sonner";
import { PresetEntry, PresetMode, MODE_LABELS } from "@/lib/presets/schema";
import { deletePreset, duplicatePreset, overwritePreset, renamePreset } from "@/lib/presets/crud";
import { ParsedImport } from "@/lib/presets/transfer";
import { PresetRow } from "./PresetRow";
import { PresetImportPreview } from "./PresetImportPreview";
import { PresetTransferBar } from "./PresetTransferBar";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: PresetMode;
  presets: PresetEntry[];
  refresh: () => void;
  getCurrentValues: () => Record<string, unknown>;
  onLoad: (values: Record<string, unknown>) => void | boolean;
}

type SortKey = "name" | "updated";

export const PresetLibraryDialog = ({
  open,
  onOpenChange,
  mode,
  presets,
  refresh,
  getCurrentValues,
  onLoad,
}: Props) => {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("updated");
  const [pendingImport, setPendingImport] = useState<ParsedImport | null>(null);

  const handle = (result: { ok: boolean; error?: string }, success: string) => {
    if (result.ok) {
      toast.success(success);
      refresh();
    } else {
      toast.error(result.error ?? "Operation failed");
    }
  };

  const visible = presets
    .filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) =>
      sort === "name" ? a.name.localeCompare(b.name) : b.updatedAt.localeCompare(a.updatedAt),
    );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] w-[95vw] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preset library — {MODE_LABELS[mode]}</DialogTitle>
            <DialogDescription>
              Manage the parameter sets saved on this device, and move them between devices with a file.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex-1 space-y-1">
              <Label htmlFor="preset-search">Search</Label>
              <Input
                id="preset-search"
                placeholder="Filter by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="space-y-1 sm:w-44">
              <Label>Sort by</Label>
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated">Last modified</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            {visible.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {presets.length === 0 ? "No preset saved yet." : "No preset matches this search."}
              </p>
            ) : (
              visible.map((p) => (
                <PresetRow
                  key={p.id}
                  preset={p}
                  onLoad={() => {
                    if (onLoad(p.values) === false) return;
                    toast.success(`Preset "${p.name}" loaded`);
                    onOpenChange(false);
                  }}
                  onRename={(name) => handle(renamePreset(mode, p.id, name), "Preset renamed")}
                  onDuplicate={() => handle(duplicatePreset(mode, p.id), "Preset duplicated")}
                  onOverwrite={() =>
                    handle(
                      overwritePreset(mode, p.id, getCurrentValues()),
                      `"${p.name}" updated with current values`,
                    )
                  }
                  onDelete={() => {
                    if (window.confirm(`Delete preset "${p.name}"?`)) {
                      handle(deletePreset(mode, p.id), "Preset deleted");
                    }
                  }}
                />
              ))
            )}
          </div>

          <PresetTransferBar mode={mode} count={presets.length} onFileParsed={setPendingImport} />
        </DialogContent>
      </Dialog>

      <PresetImportPreview
        data={pendingImport}
        onClose={() => setPendingImport(null)}
        onDone={refresh}
      />
    </>
  );
};
