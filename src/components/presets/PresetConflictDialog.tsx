// src/components/presets/PresetConflictDialog.tsx
// Asks the user what to do when saving under an existing preset name.

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface Props {
  name: string | null;
  onCancel: () => void;
  onOverwrite: () => void;
  onSaveCopy: () => void;
}

export const PresetConflictDialog = ({ name, onCancel, onOverwrite, onSaveCopy }: Props) => (
  <AlertDialog open={!!name} onOpenChange={(o) => !o && onCancel()}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>A preset named "{name}" already exists</AlertDialogTitle>
        <AlertDialogDescription>
          Choose whether to replace it with the current values or keep both.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <Button variant="outline" onClick={onSaveCopy}>Save a copy</Button>
        <AlertDialogAction onClick={onOverwrite}>Overwrite</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
