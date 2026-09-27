# Pipe Lowering

Application React/TypeScript de calcul de descente de conduite : Vite, Vitest,
Tailwind/shadcn, Recharts, jsPDF et jsPDF-autotable. Le développement local
conserve la connexion Lovable et l'hébergement existant.

## Démarrer

Prérequis : Git, Node.js 24 LTS et Bun 1.3.11 (validation avec Node 24.19.0).
`bun.lock` est le verrou de référence : il correspond à `package.json`, contrairement
au `package-lock.json` historique (notamment jsPDF, Recharts et React Router).
Aucune configuration CI n'est présente dans cette version. Ne pas lancer `npm install`
ou régénérer les deux verrous pour une modification de code.

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
SI/imperial PDF reports. An explicit custom allowable percentage or safety factor
is required before calculation. No normative compliance verdict is implemented.

Read [the model and conventions](docs/in-service-model.md) and
[validation evidence](docs/in-service-validation.md). Steel only, temporary movement;
HDPE, permanent realignment and soil interaction are outside this version. Restore
support after the reverse movement to recover the original straight configuration.

```sh
bun run test -- src/lib/in-service/__tests__ src/hooks/__tests__/useServiceEngine.test.ts
bun run scripts/check-service-report.ts
# With Node and existing dependencies, the same report script can run as:
./node_modules/.bin/vite-node scripts/check-service-report.ts
```

Reference PDFs and the full calculation snapshot are generated under `output/pdf/`
(ignored). The previous lowering module and its numerical budgets are unchanged.
