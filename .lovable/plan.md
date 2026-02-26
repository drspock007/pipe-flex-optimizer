

## Plan : Ajout du revêtement anti-corrosion

### Contexte

Le projet [Subsea Ballast Calc](/projects/88ab1881-9bac-495f-bad1-6bf611be5a4f) gère 4 types de coating : Yellow Jacket (PE), SP-2888, FBE-ARO, Custom. Chacun a une densité propre et une épaisseur (auto par NPS ou manuelle). Le poids du coating s'ajoute au poids linéaire du tube dans le calcul de la charge `q`.

### Fichiers à modifier / créer

#### 1. Créer `src/lib/coating-presets.ts` (~60 lignes)

Données extraites du projet Subsea Ballast Calc :
- `CoatingType = "none" | "yellowJacket" | "sp2888" | "fbeAro" | "custom"`
- Table `YELLOW_JACKET_THICKNESSES` (épaisseurs par NPS)
- Constantes de densité : Yellow Jacket 950, SP-2888 1250, FBE-ARO 1350 kg/m³
- Fonction `getCoatingThickness(type, nps, customThickness)` → mm
- Fonction `getCoatingDensity(type, customDensity)` → kg/m³
- Fonction `calcCoatingWeight(Do_mm, coatingThickness_mm, coatingDensity)` → kg/m
  - Formule : `Wc = π × (Do + t_coat) × t_coat × ρ_coat × 1e-6`

#### 2. Modifier `src/lib/calculations.ts`

- Ajouter à `PipeInputs` : `coatingType`, `coatingThickness` (mm), `coatingDensity` (kg/m³)
- Ajouter à `SectionProperties` : `coatingWeightPerMeter` (kg/m)
- Dans `calculate()` : calculer le poids du coating et l'ajouter à `q` quand `includeSelfWeight` est actif
  - `q_total = q_steel + q_coating`

#### 3. Créer `src/components/CoatingCard.tsx` (~130 lignes)

Card avec :
- Select pour le type de coating (None / Yellow Jacket / SP-2888 / FBE-ARO / Custom)
- Si Yellow Jacket : épaisseur auto par NPS (lecture seule) ou mode custom
- Si SP-2888, FBE-ARO : champ épaisseur (mm)
- Si Custom : champs épaisseur + densité
- Bloc résumé (muted) affichant : épaisseur effective, densité, poids coating (kg/m)
- Unit-aware via `useUnits()`

#### 4. Modifier `src/components/LoadCard.tsx`

- Ajouter prop `coatingWeightPerMeter`
- Afficher une ligne supplémentaire dans le résumé : "Coating weight" (kg/m)
- Afficher le poids total (steel + coating)

#### 5. Modifier `src/pages/Index.tsx`

- Ajouter les champs coating aux `inputs` initiaux (défaut : `coatingType: "none"`, `coatingThickness: 0`, `coatingDensity: 950`)
- Importer et placer `<CoatingCard />` entre `AllowableStressCard` et `LoadCard`
- Passer `coatingWeightPerMeter` au `LoadCard`

### Impact sur le calcul

Le coating n'affecte **pas** la rigidité (E×I) ni la contrainte admissible — il ajoute uniquement du poids linéaire à la charge distribuée `q`. C'est physiquement correct : le revêtement est souple et ne contribue pas à la résistance structurelle du tube.

