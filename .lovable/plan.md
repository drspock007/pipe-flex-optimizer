

# Corriger Find L / Find H : Ajout automatique de supports

## Probleme

Le mode "Find L" et "Find H" utilisent un nombre de supports fixe (`targetSupports`) saisi par l'utilisateur. L'utilisateur veut que le systeme ajoute automatiquement des supports (comme en mode Standard) jusqu'a trouver une solution viable.

Avec les parametres par defaut (Do=114.3, t=6.02, h=2500, X52, 80%), le solveur quadratique avec 0 supports donne un discriminant negatif (pas de solution). Il faut incrementer les supports automatiquement jusqu'a ce que le discriminant devienne positif.

---

## Verification manuelle des calculs

Parametres : Do=114.3, t=6.02, X52 (Re=359), 80%, E=210 GPa, h=2500mm

- A = 2048 mm2, I = 3.01e6 mm4, c = 57.15 mm
- q = 0.1577 N/mm
- M_allowable = 287.2 * 3.01e6 / 57.15 = 15.13e6 N.mm

Solveur quadratique : aX2 + bX + c = 0 avec X = s2
- a = q/12, b = -M_allowable, c = 6*E*I*h_span

Avec 0 supports : h_span=2500, c_coeff=9.48e15, discriminant < 0 -- pas de solution
Avec 1 support : h_span=1250, c_coeff=4.74e15, discriminant < 0 -- pas de solution
Avec 2 supports : h_span=833, c_coeff=3.16e15, discriminant > 0 -- solution existe

Le solveur actuel ne teste que `targetSupports=0` et echoue. Il faut iterer.

---

## Changements

### 1. `src/lib/calculations.ts` -- Refactorer calculateMaxL et calculateMaxH

**calculateMaxL** : iterer automatiquement de 0 a 100 supports

```text
Pour supports = 0, 1, 2, ... 100 :
  numSpans = supports + 1
  h_span = h / numSpans
  Resoudre le quadratique pour le span max
  Si discriminant >= 0 et solution valide :
    L_total = span_max * numSpans
    Retourner { L: L_total, numSupports: supports }
Si aucune solution apres 100 : retourner undefined
```

**calculateMaxH** : iterer automatiquement de 0 a 100 supports

```text
Pour supports = 0, 1, 2, ... 100 :
  numSpans = supports + 1
  span_mm = L_mm / numSpans
  M_self = q * span^2 / 12
  M_available = M_allowable - M_self
  Si M_available > 0 :
    h = M_available * span^2 / (6EI) * numSpans
    Retourner { h: h, numSupports: supports }
Si aucune solution : retourner 0
```

Modifier les types de retour pour inclure le nombre de supports trouve.

Modifier `CalculationResults` pour que `numSupports` reflète le résultat de l'optimisation automatique en modes findL/findH aussi.

### 2. `src/lib/calculations.ts` -- Mise a jour de calculate()

- En mode findL : appeler le nouveau calculateMaxL iteratif, utiliser le numSupports retourne
- En mode findH : appeler le nouveau calculateMaxH iteratif, utiliser le numSupports retourne
- Supprimer la dependance a `targetSupports` dans ces modes

### 3. `src/components/GeometryCard.tsx` -- Retirer "Target Supports"

- Supprimer le champ "Target Supports" (le systeme optimise automatiquement dans tous les modes)
- Simplifier l'interface : les 3 modes se comportent de maniere coherente

### 4. `src/pages/Index.tsx` -- Nettoyage

- Supprimer `targetSupports` du state (ou le garder mais ne plus le passer a GeometryCard)

### 5. `src/components/ResultsPanel.tsx` -- Afficher supports trouves

- En mode findL/findH, afficher le nombre de supports determines automatiquement (deja fait via numSupports)

---

## Resultat attendu

Avec Do=114.3, t=6.02, h=2500, X52, 80% :
- Le systeme teste 0 supports (echec), 1 support (echec), 2 supports (succes)
- Retourne L total et affiche "2 supports intermediaires"

