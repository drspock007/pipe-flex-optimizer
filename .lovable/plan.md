## Constat

Aucune bannière de consentement n'existe dans ce projet. Google Analytics est chargé **inconditionnellement** au démarrage (`initAnalytics()` dans `src/main.tsx`) — donc sans consentement préalable.

## Leçons tirées de « PipeTemp Estimator » (intégrées au plan)

1. **Écran gris dans l'aperçu Lovable** : les extensions navigateur (adblock/privacy) bloquent les modules dont l'URL contient `cookie`, `consent`, `banner`, `analytics`, `tracking`, `gtag`. → **noms de fichiers, dossiers et identifiants neutres** dès le départ.
2. **`localStorage` inaccessible en iframe cross-origin** (`SecurityError`) → lecture/écriture protégées avec **fallback en mémoire**, jamais d'exception non capturée.
3. **Une erreur du composant ne doit jamais blanchir l'app** → bannière isolée dans un `ErrorBoundary` avec fallback `null`.
4. **GA peut être bloqué** → `try/catch` autour de l'injection de script et de chaque appel `gtag`.
5. Fichiers ≤ 180 lignes → découpage en plusieurs modules.

## Préparation multilingue (futur)

Pas de dépendance i18n installée maintenant (aucune n'existe dans le projet), mais l'architecture est prête :
- Tous les textes de la bannière sont **externalisés** dans un dictionnaire typé `Record<Locale, NoticeTexts>` (`en` en premier, `fr` fourni d'emblée).
- Un module unique `src/lib/locale.ts` expose `type Locale`, `DEFAULT_LOCALE`, et `getLocale()` (détection : préfixe de chemin `/fr` → sinon `navigator.language` → sinon `en`). Le jour où l'app devient multilingue, il suffira de remplacer l'implémentation de `getLocale()` (ou de la brancher sur un contexte i18n) sans toucher aux composants.
- Aucun texte codé en dur dans le JSX de la bannière.

## Fichiers

**Nouveaux**
1. `src/lib/locale.ts` — type `Locale`, détection de langue, valeur par défaut (réutilisable par toute l'app plus tard).
2. `src/lib/privacyChoices.ts` — type `PrivacyChoices` (`necessary`/`analytics`/`marketing`), `readChoices()` / `saveChoices()` avec try/catch `SecurityError` + fallback mémoire.
3. `src/components/privacy/notice-texts.ts` — dictionnaire de textes `en` + `fr`.
4. `src/components/privacy/PrivacyNotice.tsx` — bandeau bas de page (Card, boutons Accept all / Reject all / Customize / fermer).
5. `src/components/privacy/PrivacySettingsDialog.tsx` — dialogue de personnalisation (3 switches, Annuler / Sauvegarder).
6. `src/components/ErrorBoundary.tsx` — petit boundary réutilisable (fallback `null`, label de log).

**Modifiés**
7. `src/lib/analytics.ts` → renommé `src/lib/usageMetrics.ts` (nom neutre), avec `try/catch` partout ; le script n'est injecté **que si** le choix analytics est accepté. `trackPageView`/`trackEvent` deviennent `recordView`/`recordEvent`.
8. `src/main.tsx` — n'initialise les métriques que si un consentement analytics existe déjà.
9. `src/App.tsx` — imports mis à jour + `<ErrorBoundary><PrivacyNotice /></ErrorBoundary>` sous les routes.
10. `src/components/Footer.tsx` — nouvelle version `vAAAAMMDDHHMMSS` (heure de Rome).
11. `public/sitemap.xml` — `lastmod` mis à jour.

## Détails techniques

- Stockage : clé `privacyChoices` (nom neutre) dans `localStorage`, objet JSON.
- UI : composants shadcn existants (`Card`, `Dialog`, `Switch`, `Label`, `Button`), tokens du design system (orange GMC), responsive — boutons empilés en colonne sur mobile, en ligne sur tablette/desktop.
- Le switch marketing est enregistré mais sans effet tant qu'aucun outil marketing n'est intégré.
- Vérification finale : build + typecheck, et test Playwright simulant une iframe avec `localStorage` bloqué pour confirmer qu'aucune page grise n'apparaît et qu'aucun module au nom sensible n'est chargé.
