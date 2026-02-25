

## Plan : Input numérique acceptant le point comme séparateur décimal

### Problème
Sur certains navigateurs/locales francophones, `<input type="number">` rejette le point (`.`) comme séparateur décimal. Les champs D₀, t (et aussi L, h) ne sont pas tolérants aux deux séparateurs.

### Approche
Créer un petit composant réutilisable `NumericInput` (fichier `src/components/NumericInput.tsx`, ~50 lignes) qui :

1. Utilise `type="text"` + `inputMode="decimal"` (pour afficher le clavier numérique sur mobile)
2. Gère un **état local `string`** pour la saisie en cours
3. À chaque frappe, remplace les virgules `,` par des points `.` en interne pour le parsing
4. Appelle `onChange(parsedNumber)` uniquement quand la valeur est un nombre valide
5. Synchronise l'affichage quand la prop `value` change depuis l'extérieur (ex: reset)
6. Accepte les mêmes props de style (`className`, `readOnly`, etc.) que `<Input>`

### Fichiers impactés

| Fichier | Modification |
|---|---|
| `src/components/NumericInput.tsx` | **Nouveau** — composant ~50 lignes |
| `src/components/GeometryCard.tsx` | Remplacer les 4 `<Input type="number">` éditables (Do, t, L, h) par `<NumericInput>` |

### Détails techniques

**NumericInput.tsx** — logique clé :
```tsx
// State local string pour garder la saisie partielle (ex: "114.")
const [display, setDisplay] = useState(String(value));

const handleChange = (e) => {
  let raw = e.target.value;
  // Accept comma as decimal separator
  raw = raw.replace(",", ".");
  // Allow partial input like "114." or "-"
  if (/^-?\d*\.?\d*$/.test(raw)) {
    setDisplay(raw);
    const num = parseFloat(raw);
    if (!isNaN(num)) onValueChange(num);
  }
};

// Sync when prop changes externally
useEffect(() => {
  if (!isFocused) setDisplay(String(value));
}, [value, isFocused]);
```

### Ce qui ne change PAS
- Aucune modification à `calculations.ts`, `fem-solver.ts`, `fem-worker.ts`
- Aucune modification au comportement des modes Standard / Find L / Find H
- Les champs read-only (Lmin, Lmax, computedH) restent des `<Input>` classiques
- Les autres cards (Material, Load, Allowable) ne sont pas touchées (extensible plus tard)

### Risques
- **Zéro** : le composant est un wrapper pur UI, la valeur numérique transmise au parent est identique à avant. Les calculs ne sont pas affectés.

