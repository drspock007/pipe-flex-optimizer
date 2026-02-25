

## Plan : Ticks entiers sur les axes X et Y des graphiques

### Problème
Les axes du graphe Deflection (et Stress) affichent des valeurs décimales longues, rendant la lecture difficile. L'utilisateur souhaite des nombres entiers sur les deux axes.

### Approche
Ajouter `tickFormatter={(v) => Math.round(v).toString()}` sur les `<XAxis>` et `<YAxis>` des deux graphiques (DeflectionChart et StressChart) pour arrondir les ticks à l'entier le plus proche. Également ajouter `allowDecimals={false}` sur les axes pour que Recharts génère de préférence des graduations entières.

### Fichiers impactés

| Fichier | Modification |
|---|---|
| `src/components/DeflectionChart.tsx` | Ajouter `allowDecimals={false}` et `tickFormatter` sur XAxis (ligne 112-116) et YAxis (ligne 117-122) |
| `src/components/StressChart.tsx` | Idem sur XAxis (ligne 34-38) et YAxis (ligne 39-43) |

### Détails techniques

Sur chaque axe, on ajoute deux props :
```tsx
<XAxis
  ...
  allowDecimals={false}
  tickFormatter={(v: number) => Math.round(v).toString()}
/>
<YAxis
  ...
  allowDecimals={false}
  tickFormatter={(v: number) => Math.round(v).toString()}
/>
```

- `allowDecimals={false}` : demande à Recharts de calculer des graduations entières
- `tickFormatter` : sécurité supplémentaire pour arrondir l'affichage

### Ce qui ne change PAS
- Aucune modification aux calculs, données ou tooltips
- Les tooltips conservent leur précision décimale existante
- Aucun impact sur les modes Elevation/Sag/Raw

