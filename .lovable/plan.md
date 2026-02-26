

## Plan : Switch SI / Imperial — Implémentation

### Fichiers à créer

**1. `src/lib/unit-conversions.ts`** (~50 lignes)
- Type `UnitType` : `"mm"`, `"m"`, `"MPa"`, `"GPa"`, `"kg/m3"`, `"kg/m"`, `"mm2"`, `"mm4"`, `"N/mm"`
- Table de facteurs SI→Imperial et labels (`mm→in`, `m→ft`, `MPa→ksi`, etc.)
- Fonctions `toDisplay(value, unitType, system)`, `fromDisplay(value, unitType, system)`, `unitLabel(unitType, system)`

**2. `src/contexts/UnitContext.tsx`** (~35 lignes)
- Context React avec `system: "SI" | "Imperial"`, `toggle()`, `conv()`, `parse()`, `label()`
- Hook `useUnits()`

### Fichiers à modifier

**3. `src/pages/Index.tsx`**
- Envelopper le contenu dans `<UnitProvider>`

**4. `src/components/Header.tsx`**
- Ajouter un `Switch` SI / IMP à côté du lien Help

**5. `src/components/GeometryCard.tsx`**
- Labels dynamiques : `D₀ ({label("mm")})`, `t ({label("mm")})`, `L ({label("m")})`, `h ({label("mm")})`
- `NumericInput value={conv(Do,"mm")}` / `onValueChange={v => onChange("Do", parse(v,"mm"))}`
- Zone computed : `Di`, `A`, `I`, `c` avec unités converties

**6. `src/components/MaterialCard.tsx`**
- `E` : label `{label("GPa")}`, conversion affichage/saisie
- `Rₑ` (customYield) : label `{label("MPa")}`, conversion

**7. `src/components/AllowableStressCard.tsx`**
- `Rₑ` et `Allowable` : affichage converti en `{label("MPa")}`

**8. `src/components/LoadCard.tsx`**
- `density` : label `{label("kg/m3")}`, conversion
- `q` et `Weight` : labels et valeurs converties

**9. `src/components/ResultsPanel.tsx`**
- Stress values : `MPa → ksi`
- Longueurs (`spanLength`, `L_plot`, `Lmin`, `Lmax`, `computedH`) : unités converties
- Section properties : `A`, `I`, `Weight/m` converties

**10. `src/components/StressChart.tsx`**
- Axe X : `Position ({label("m")})` → données converties `m→ft`
- Axe Y : `Stress ({label("MPa")})` → données converties `MPa→ksi`
- `ReferenceLine` allowable converti
- Tooltip avec unités dynamiques

**11. `src/components/DeflectionChart.tsx`**
- Axe X : `Position ({label("m")})` → données converties
- Axe Y : déflexion `mm→in`, labels dynamiques
- Tooltip avec unités dynamiques

### Table de conversion

| Grandeur | SI | Imperial | Facteur (×) |
|---|---|---|---|
| D₀, t, h, déflexion | mm | in | /25.4 |
| L, spans, positions | m | ft | /0.3048 |
| σ, Rₑ, allowable | MPa | ksi | /6.89476 |
| E | GPa | ×10³ ksi | /6.89476 |
| ρ | kg/m³ | lb/ft³ | /16.0185 |
| Weight | kg/m | lb/ft | /1.48816 |
| A | mm² | in² | /645.16 |
| I | mm⁴ | in⁴ | /416231.426 |
| q | N/mm | lbf/in | /0.17513 |

### Principe de sécurité (ne rien casser)

- `PipeInputs` reste 100% SI en interne — jamais modifié
- `CalculationResults` reste 100% SI — jamais modifié
- `calculations.ts`, `fem-solver.ts`, `fem-worker.ts` : **aucune modification**
- La conversion se fait uniquement dans les composants UI via `conv()` et `parse()`
- Toggle SI remet instantanément les valeurs d'origine

### Version
`202602261400` en footer de `HelpPage.tsx`

