

## Plan : Ajuster les décimales dans GeometryCard

### Modifications dans `src/components/GeometryCard.tsx`

| Champ | Décimales actuelles | Décimales souhaitées |
|-------|-------------------|---------------------|
| t | 2 | 3 |
| L | 2 | 0 |
| h | 2 | 0 |

3 lignes à modifier : changer `decimals={2}` → `decimals={3}` pour t, et `decimals={0}` pour L et h.

