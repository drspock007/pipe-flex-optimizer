

## Plan : Mise à jour des grades d'acier API 5L

### Modifications

**1. `src/lib/calculations.ts`** (lignes 121-128)

Remplacer le dictionnaire `GRADES` actuel (4 grades) par la liste complète :

| Grade | SMYS (MPa) |
|-------|-----------|
| Grade B | 241 |
| X42 | 290 |
| X46 | 317 |
| X52 | 359 |
| X56 | 386 |
| X60 | 414 |
| X65 | 448 |
| X70 | 483 |
| X80 | 552 |

Note : les valeurs SMYS de X60 (414 vs 415) et X65 (448 vs 450) et X70 (483 vs 485) diffèrent légèrement de l'existant — on adopte les valeurs du fichier fourni (standard API 5L).

**2. `src/components/MaterialCard.tsx`**

Afficher le SMYS dans le label de chaque option du Select, avec conversion d'unité :
`X52 — 359 MPa` ou `X52 — 52.1 ksi`

Utiliser `conv()` et `label()` pour l'affichage dynamique SI/Imperial.

Condition Custom : `grade === "CUSTOM"` (au lieu de `"Custom"`).

**3. `src/pages/Index.tsx`** — valeur initiale de `grade` à vérifier/ajuster si le nom change.

