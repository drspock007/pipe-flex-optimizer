# Pipe Lowering

Application React/TypeScript de calcul de descente de conduite : Vite, Vitest,
Tailwind/shadcn, Recharts, jsPDF et jsPDF-autotable. Le développement local
conserve la connexion Lovable et l'hébergement existant.

## Démarrer

Prérequis : Node.js 24 LTS. Bun 1.3.11 reste utilisable pour le développement
Lovable/local. `bun.lock` et `package-lock.json` sont synchronisés avec le manifeste :
utiliser `bun install --frozen-lockfile` avec Bun ou `npm ci --include=dev` avec npm.
Ne pas mettre à jour les dépendances pour une simple modification de code.
La compilation et le prérendu fonctionnent avec Node.js sans exiger Bun.

```sh
git clone https://github.com/drspock007/pipe-flex-optimizer.git
cd pipe-flex-optimizer
git switch codex/v2-13-handoff-fixes
bun install --frozen-lockfile
bun run dev --host 127.0.0.1
```

Ouvrir l'adresse indiquée par Vite (par défaut http://127.0.0.1:8080).
Les calculs et les exports locaux n'exigent pas de connexion à Lovable.

## Vérifier une modification

```sh
bun run test                          # Vitest, suite complète (pas « bun test »)
bun run test -- src/lib/pdf/__tests__/pagination.test.ts
bun run typecheck                     # TypeScript local, application ET configuration Vite
bun run build
bun run lint
```

Le build prérend les trois routes publiques et génère le sitemap depuis le
registre SEO commun. Après publication, suivre la [liste de contrôle SEO](docs/seo-deployment.md)
pour vérifier les réponses du CDN, la vraie 404 et les consoles Google/Bing.

`bun run test:watch` lance Vitest en mode interactif ; `bun run preview` sert le build.
Le lint historique n'est pas entièrement propre : comparer avec la branche de départ
et ne pas confondre ces diagnostics avec de nouvelles régressions.

## Poursuivre dans Codex

Lire [AGENTS.md](AGENTS.md) et le [contrat technique](docs/technical-context.md),
vérifier `git status`, puis travailler sur une branche dédiée à partir de la branche
convenue (`remix` pour cette reprise). Exécuter les tests ciblés puis les commandes
ci-dessus. Pour un changement PDF, exporter SI et impérial et regarder toutes les pages.
Ne pas fusionner ni déployer sans demande explicite. La visibilité dans Lovable dépend
de la branche effectivement connectée ; publier une branche de travail ne modifie pas `remix`.

La version affichée est `vYYYYMMDDHHmmss`, calculée avec `Europe/Rome` (par exemple
`Intl.DateTimeFormat` avec `timeZone: "Europe/Rome"`), jamais avec un décalage UTC fixe.

Repères : `src/lib/mechanics-v2/` pour le moteur, `src/lib/v2-app/` pour l'adaptation
et les workers, `src/hooks/useV2Engine.ts` pour l'orchestration, `src/components/v2/`
pour l'interface et `src/lib/pdf/` pour les rapports.

Pour reproduire les deux rapports de contrôle : `bun run scripts/check-report.ts`.
Les PDF sont écrits dans `output/pdf/` (non versionné).

## Temporary in-service steel deflection

The dedicated module is available at `/in-service` (navigation: **In-service
 deflection**) on `codex/in-service-pipe-deflection`. It supports direct calculation,
exploratory length/displacement searches, multiple initial-state hypotheses and
SI/imperial PDF reports. The custom allowable defaults to 50% of yield (safety factor 2) and remains editable. No normative compliance verdict is implemented.

Read [the model and conventions](docs/in-service-model.md) and
[validation evidence](docs/in-service-validation.md) for the temporary branch.
HDPE and plastic steel are outside the module. The separate permanent direct branch
adds staged supports and reversible soil interaction (see below). In temporary mode,
restore support after the reverse movement to recover the original straight configuration.

```sh
bun run test -- src/lib/in-service/__tests__ src/hooks/__tests__/useServiceEngine.test.ts
bun run scripts/check-service-report.ts
# With Node and existing dependencies, the same report script can run as:
./node_modules/.bin/vite-node scripts/check-service-report.ts
```

Reference PDFs and the full calculation snapshot are generated under `output/pdf/`
(ignored). The previous lowering module and its numerical budgets are unchanged.

### Temporary supports (in-service model 2)

Choose **Temporary supports**: none, equidistant pairs (2–20), or custom positions.
Supports act upward only and allow lift-off and free horizontal/axial sliding.
**Find support count** checks 0, 2, 4… with a single global budget. Custom positions
scale with total length during length searches. The middle is reserved for the actuator.
Use **Displayed intervention stage** to inspect contact, reaction and gap through
the path; the PDF includes that selection, support maxima and path diagnostics.
Support capacity and local bearing are not verified; lateral instability remains checked.

Reproduce the 40 m excavation / 150 mm lift support-search example and both PDFs:
`./node_modules/.bin/vite-node scripts/check-service-support-report.ts` (or
`bun run scripts/check-service-support-report.ts`).

### In-service presets

The **Presets** section saves the complete In-service input set locally on the
current browser/device, in a separate library from Pipe lowering. **Manage**
provides search, sorting, rename, duplicate, overwrite, delete and JSON file
export/import. The input payload is versioned; unsupported or malformed presets
are rejected on load without replacing current inputs. Cleared numeric fields
remain invalid until completed. Units are display preferences: stored inputs use
the model's canonical units. Loading cancels obsolete work and clears results;
review the inputs and calculate again. Presets contain inputs, not PDF reports or
computed results. Storage is not synchronized automatically between devices or
site addresses; use JSON export/import to transfer it.

### Targeted CSA evaluation (in-service only)

Optional, separate CSA Z662:2023 checks now cover plain pipeline minimum nominal
wall (4.3.11.2), the temperature factor (4.3.9), and the anchored design-state
pressure/temperature criterion (4.7.1). Explicit design inputs and applicability
confirmations are required. Lifting, 4.7.2 and Annex C remain unassessed; no overall
CSA compliance is claimed. Custom criteria alone govern searches. See
[applicability contract](docs/csa-targeted-checks.md). In-service presets now write
version 3; versions 1 and 2 remain temporary, and version 1 loads with CSA disabled.

### Permanent maintained deviation (elastic steel)

Select the dedicated permanent intervention type for direct calculation through
support adjustment, equipment release, staged backfill, pair removal and explicit
future operating cases. Soil curves, sources, loads and final centre tolerances are
required for assessed verdicts. Guided entry offers illustrative defaults and
backfill layouts; examples remain unreviewed until checked against project data. Stress, retained position and
soil-limit results remain separate. This is not a permanent-installation approval.
See [formulation and independent numerical evidence](docs/permanent-elastic-model.md).
Run `vite-node scripts/check-permanent-reference.ts` followed by the independent
NumPy check `python3 scripts/check-permanent-reference.py`; PDF checks use
`vite-node scripts/check-permanent-report.ts` (executables under node_modules/.bin).

## Déploiement Infomaniak (Node.js 24)

Après fusion de la demande validée dans `main`, utiliser la racine du dépôt
(dossier contenant `package.json`) et ces paramètres :

- Construction : `git pull --ff-only origin main && npm ci --include=dev && npm run build`
- Lancement : `npm start`
- Port : `3000`, ou le port fourni par Infomaniak via la variable `PORT`.

Le dépôt sur le serveur doit déjà être positionné sur `main` : `git pull` ne change
pas la branche active. Lancer Build puis redémarrer le site après une mise à jour.
Cette commande ne déclenche pas un déploiement automatique à chaque commit GitHub.

Le serveur ne sert que `dist`, avec les pages prérendues propres à `/`, `/help`
et `/in-service`. Il n'utilise pas de repli global vers l'accueil : les chemins
inconnus doivent conserver une vraie réponse 404. Vérifier ces routes et les
fichiers JavaScript après publication, ainsi que les contrôles de
[référencement](docs/seo-deployment.md). Les calculs restent dans le navigateur.

Contrôle local de production : `npm ci --include=dev`, `npm run build`, puis
`npm start`. `npm run preview` reste destiné à la vérification locale.
