import type { Locale } from "@/lib/locale";

/** All notice strings, externalized per locale so adding a language is a data change only. */
export interface NoticeTexts {
  title: string;
  description: string;
  acceptAll: string;
  rejectAll: string;
  customize: string;
  cancel: string;
  save: string;
  close: string;
  settingsTitle: string;
  settingsDescription: string;
  necessary: string;
  necessaryDesc: string;
  measurement: string;
  measurementDesc: string;
  marketing: string;
  marketingDesc: string;
}

export const NOTICE_TEXTS: Record<Locale, NoticeTexts> = {
  en: {
    title: "We value your privacy",
    description:
      "We use storage and measurement tools to improve your experience and understand how the tool is used. You choose what to allow.",
    acceptAll: "Accept all",
    rejectAll: "Reject all",
    customize: "Customize",
    cancel: "Cancel",
    save: "Save",
    close: "Close",
    settingsTitle: "Privacy preferences",
    settingsDescription:
      "Manage your preferences. Essential storage is always enabled.",
    necessary: "Essential",
    necessaryDesc: "Required for the calculator to work correctly.",
    measurement: "Usage measurement",
    measurementDesc: "Helps us understand how the tool is used (Google Analytics).",
    marketing: "Marketing",
    marketingDesc: "Used for advertising attribution. Currently not active.",
  },
  fr: {
    title: "Votre vie privée compte",
    description:
      "Nous utilisons du stockage et des outils de mesure pour améliorer votre expérience et comprendre l'usage de l'outil. Vous choisissez ce que vous autorisez.",
    acceptAll: "Tout accepter",
    rejectAll: "Tout refuser",
    customize: "Personnaliser",
    cancel: "Annuler",
    save: "Enregistrer",
    close: "Fermer",
    settingsTitle: "Préférences de confidentialité",
    settingsDescription:
      "Gérez vos préférences. Le stockage essentiel est toujours activé.",
    necessary: "Essentiel",
    necessaryDesc: "Nécessaire au bon fonctionnement du calculateur.",
    measurement: "Mesure d'audience",
    measurementDesc: "Nous aide à comprendre l'usage de l'outil (Google Analytics).",
    marketing: "Marketing",
    marketingDesc: "Utilisé pour l'attribution publicitaire. Actuellement inactif.",
  },
};
