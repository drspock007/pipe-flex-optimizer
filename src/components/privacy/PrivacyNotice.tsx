import { useEffect, useState } from "react";
import { ShieldCheck, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DEFAULT_CHOICES,
  readChoices,
  saveChoices,
  type PrivacyChoices,
} from "@/lib/privacyChoices";
import { enableUsageMetrics } from "@/lib/usageMetrics";
import { NOTICE_TEXTS } from "./notice-texts";
import PrivacySettingsDialog from "./PrivacySettingsDialog";

/** Bottom notice asking the visitor to allow or refuse optional measurement. */
const PrivacyNotice = () => {
  const [visible, setVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [choices, setChoices] = useState<PrivacyChoices>(DEFAULT_CHOICES);

  // The application UI is English. Keep the consent notice in the same
  // language instead of deriving it from the visitor's browser locale.
  const texts = NOTICE_TEXTS.en;

  useEffect(() => {
    const stored = readChoices();
    if (stored) {
      setChoices(stored);
    } else {
      setVisible(true);
    }
  }, []);

  const commit = (next: PrivacyChoices) => {
    setChoices(next);
    saveChoices(next);
    setSettingsOpen(false);
    setVisible(false);
    if (next.analytics) enableUsageMetrics();
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4">
      <Card className="relative mx-auto max-w-4xl border-primary/30 bg-background/95 backdrop-blur-sm shadow-lg">
        <div className="flex items-start gap-3 sm:gap-4 p-4 sm:p-6">
          <ShieldCheck className="h-6 w-6 text-primary mt-1 flex-shrink-0" aria-hidden="true" />
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-base sm:text-lg font-semibold mb-1">{texts.title}</h2>
              <p className="text-sm text-muted-foreground">{texts.description}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button onClick={() => commit({ necessary: true, analytics: true, marketing: true })}>
                {texts.acceptAll}
              </Button>
              <Button
                variant="outline"
                onClick={() => commit({ necessary: true, analytics: false, marketing: false })}
              >
                {texts.rejectAll}
              </Button>
              <Button variant="ghost" onClick={() => setSettingsOpen(true)}>
                <Settings className="w-4 h-4 mr-2" aria-hidden="true" />
                {texts.customize}
              </Button>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={texts.close}
            className="absolute top-2 right-2 h-8 w-8"
            onClick={() => commit({ necessary: true, analytics: false, marketing: false })}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </Card>

      <PrivacySettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        texts={texts}
        choices={choices}
        onChoicesChange={setChoices}
        onSave={() => commit(choices)}
      />
    </div>
  );
};

export default PrivacyNotice;
