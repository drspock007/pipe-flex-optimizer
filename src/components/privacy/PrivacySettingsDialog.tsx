import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { PrivacyChoices } from "@/lib/privacyChoices";
import type { NoticeTexts } from "./notice-texts";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  texts: NoticeTexts;
  choices: PrivacyChoices;
  onChoicesChange: (choices: PrivacyChoices) => void;
  onSave: () => void;
}

/** Detailed preferences dialog opened from the privacy notice. */
const PrivacySettingsDialog = ({
  open,
  onOpenChange,
  texts,
  choices,
  onChoicesChange,
  onSave,
}: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" aria-hidden="true" />
          {texts.settingsTitle}
        </DialogTitle>
        <DialogDescription>{texts.settingsDescription}</DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label className="font-medium">{texts.necessary}</Label>
            <p className="text-sm text-muted-foreground">{texts.necessaryDesc}</p>
          </div>
          <Switch checked disabled aria-label={texts.necessary} />
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label className="font-medium">{texts.measurement}</Label>
            <p className="text-sm text-muted-foreground">{texts.measurementDesc}</p>
          </div>
          <Switch
            checked={choices.analytics}
            aria-label={texts.measurement}
            onCheckedChange={(checked) => onChoicesChange({ ...choices, analytics: checked })}
          />
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label className="font-medium">{texts.marketing}</Label>
            <p className="text-sm text-muted-foreground">{texts.marketingDesc}</p>
          </div>
          <Switch
            checked={choices.marketing}
            aria-label={texts.marketing}
            onCheckedChange={(checked) => onChoicesChange({ ...choices, marketing: checked })}
          />
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          {texts.cancel}
        </Button>
        <Button onClick={onSave}>{texts.save}</Button>
      </div>
    </DialogContent>
  </Dialog>
);

export default PrivacySettingsDialog;
