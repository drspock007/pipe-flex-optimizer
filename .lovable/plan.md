

## Plan : Afficher le strain maximal dans les résultats

### Contexte
Le strain (déformation) est critique pour vérifier les limites des revêtements anti-corrosion. La valeur se calcule simplement : **ε = σ / E**.

### Modifications

#### 1. `src/lib/calculations.ts`
- Ajouter `maxStrain: number` (sans unité, en %) à `CalculationResults`
- Calculer `maxStrain = maxStress / E_mpa` juste avant la construction du return (une ligne)

#### 2. `src/components/ResultsPanel.tsx`
- Extraire `maxStrain` depuis `results`
- Ajouter une ligne dans la section "Stress comparison" affichant :
  - Label : "Max Strain"
  - Valeur : `maxStrain` formaté en % (×100, 4 décimales) — ex. `0.1742%`
  - Coloré en rouge si `!isSafeNow`

Aucun nouveau fichier, aucune dépendance supplémentaire.

