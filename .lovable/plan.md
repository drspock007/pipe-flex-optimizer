

# Corriger le mode "Find L" et ameliorer le feedback utilisateur

## Probleme identifie

L'algorithme de recherche binaire pour trouver la longueur maximale L ne fonctionne pas car la contrainte sigma(L) n'est **pas monotone**. Elle a une forme en U :
- Pour les petits L : le moment de tassement (6EIh/L^2) domine --> contrainte elevee
- Pour les grands L : le moment de poids propre (qL^2/12) domine --> contrainte elevee
- Il existe un L optimal ou la contrainte est minimale

La recherche binaire actuelle suppose que la contrainte augmente avec L, ce qui est faux.

## Solution technique

### 1. Corriger `calculateMaxL` dans `src/lib/calculations.ts`

Remplacer la recherche binaire simple par une approche en deux etapes :

1. **Trouver le L optimal** (contrainte minimale) par recherche ternaire ou Golden Section sur l'intervalle [0.1, 1000] m
2. **Verifier** que la contrainte minimale est inferieure a la contrainte admissible. Si non, aucune solution n'existe (retourner `undefined`)
3. **Recherche binaire** de L_max depuis le L optimal vers la borne superieure (la ou la contrainte redevient trop elevee)

L'algorithme :
```
1. Golden section search pour trouver L_min_stress (le L ou sigma est minimal)
2. Si sigma(L_min_stress) > allowable --> pas de solution, computedL = undefined
3. Sinon, binary search entre L_min_stress et 1000m pour trouver le max L ou sigma <= allowable
```

### 2. Modifier le type `CalculationResults`

Changer `computedL` et `computedH` en `number | undefined` pour gerer le cas "pas de solution"

### 3. Ameliorer le feedback dans `GeometryCard.tsx`

- Quand `computedL` est `undefined` : afficher "Aucune solution" en rouge dans le champ L (au lieu de 0.1)
- Quand une valeur est trouvee : afficher clairement la valeur avec le style orange actuel

### 4. Ameliorer le feedback dans `ResultsPanel.tsx`

- Quand `computedL` ou `computedH` est `undefined` : afficher un message d'avertissement "Aucune longueur/settlement admissible pour ces parametres"
- Utiliser un style rouge/destructif pour le message d'erreur

## Fichiers modifies

- `src/lib/calculations.ts` : corriger `calculateMaxL` avec golden section + binary search, gerer `undefined`
- `src/components/GeometryCard.tsx` : afficher "N/A" ou "Aucune solution" quand pas de resultat
- `src/components/ResultsPanel.tsx` : afficher un avertissement quand pas de solution

