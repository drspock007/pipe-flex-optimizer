# Validation V2-13 — 26 septembre 2026

Départ : branche `remix`, commit `ba67e2f0384216db1793cd34aa26287adf76e381`
(`Confirmed 11 clean suites`), version `v20260926185429`. Dossier local initialement
vide, sans modifications à conserver. Branche de travail : `codex/v2-13-handoff-fixes`.
Version livrée : `v20260926220640`, calculée par `datetime.now(ZoneInfo('Europe/Rome'))`.

## Corrections

- PDF : l'ancienne prévention de ligne isolée déplaçait tout le résumé, même trop
  grand pour tenir sur une page. Mesure réelle des lignes avec jsPDF-autotable ;
  déplacement complet seulement s'il résout la pagination, sinon séparation des
  deux dernières lignes lorsque celles-ci tiennent sur une page. Aucun diagnostic
  retiré ; marges, taille du texte et pied de page conservés. La construction du
  document est séparée de son téléchargement pour permettre sa validation locale.
- Analytique à plat : calcul des coordonnées par `(i / (n + 1)) * L`, puis contrôle
  de rigidité, charge résultante, coordonnées, longueurs, échelles et tolérances.
  Valeurs non représentables, sous-débordements annulant une grandeur positive ou
  travées de longueur nulle : échec numérique explicite, sans repli vers un maillage.
  Aucun changement de modèle, tolérance ou budget.
- Reprise : README, AGENTS et contrat technique actualisés ; script `typecheck`
  utilisant les deux configurations TypeScript locales ; script reproductible des PDF.
  Aucun verrou ni version de dépendance modifié.

## Commandes et résultats

Environnement : macOS arm64, Node 24.19.0, Bun 1.3.11 téléchargé depuis sa distribution
GitHub officielle. Le Node fourni par Codex a été ajouté au PATH pour les commandes.

| Commande | Résultat |
| --- | --- |
| `bun install --frozen-lockfile` | 521 paquets installés, verrous inchangés |
| `bun run test` avant modification | 34 fichiers, 306 tests réussis |
| `vitest run .../ground-flat-finite.test.ts` avant correction | 6 échecs reproduits, 2 réussites |
| Tests ciblés ground-flat-finite, ground-flat, closed-form, supports | réussis, dont les 4 références free |
| `vitest run src/lib/pdf/__tests__/pagination.test.ts` | 3 tests réussis |
| `bun run test` final | 36 fichiers, 317 tests réussis |
| `bun run typecheck` | application et configuration Vite réussies |
| `bun run build` | réussi ; avertissement de taille de bundle > 500 kB |
| `eslint . -f json` avant/après | mêmes 15 erreurs et 17 avertissements, aucun nouveau diagnostic |
| `bun run scripts/check-report.ts` | candidat attendu, 5 pages SI et 5 impériales |
| `git diff --check` | réussi |

Les tests numériques parcourent directement les objets et leurs nombres (pas de
JSON) dans les deux modes : positions extrêmes, échelle de moment débordante,
rigidité débordante et travées annulées par sous-débordement.

## Contrôles réels

Dans le navigateur local, scénario Min. supports restrained avec sol, domaine
3–120 m, plafond 5, hv=300 mm, hl=50 mm, tube 114,3 × 6,02, E=207 GPa,
X52=359 MPa, admissible 40 %, acier 7850 kg/m³, Yellow Jacket 0,94 mm / 950 kg/m³ :
1 support, minimum non certifié, L=28,780 m et contrainte combinée=99,55 MPa.
Le script retrouve L=28780.410837628307 mm, sigma=99.54848902707107 MPa,
q=0.16087213919341872 N/mm.

Bascule impériale : 94,424 ft, 14,44 ksi, admissible 20,83 ksi. Export désactivé
immédiatement après changement de mode et de géométrie. Tube exactement à plat :
solution analytique vérifiée en restrained/impérial puis free/SI, N et contraintes
nuls, p=q, aucun maillage annoncé ; déformée verticale nulle inspectée visuellement.

Les deux boutons d'export ont affiché « PDF generated ». Le téléchargement du
navigateur intégré n'a pas fourni de chemin récupérable à l'automatisation ; sa
sauvegarde sur disque n'est donc pas attestée. Les PDF livrés ont été écrits par
`scripts/check-report.ts`, avec les mêmes moteurs, formateurs et générateur PDF
que l'interface, pour le même scénario. Les 10 pages ont été rendues avec Poppler
et regardées une à une : résumé dès la page 1, titres accompagnés, dernières lignes
regroupées, aucun chevauchement ou texte coupé, pieds et pagination lisibles.
Poppler a émis des avertissements de cache Fontconfig local, sans empêcher le rendu.

## Points conservés hors lot

- Le lint préexistant reste à traiter séparément.
- Une incohérence d'affichage préexistante a été observée dans la carte Yellow Jacket :
  en impérial, sa densité affiche 950 avec le libellé lb/ft³. Le calcul reste en SI et
  le PDF affiche correctement 59,3 lb/ft³. Aucun changement de cette carte dans ce lot.
- La cause de l'ancienne erreur intermittente « 1 error » demeure inconnue ; aucune
  modification des délais ou de la concurrence, et aucune prétention de correction.
- Aucun déploiement, aucune fusion, aucune validation de synchronisation Lovable
  sur la branche de travail. La connexion Lovable existante n'a pas été modifiée.
