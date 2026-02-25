

## Plan : Remplacement des formules HTML par KaTeX

### Objectif
Remplacer le rendu des formules fait en HTML/CSS brut par **KaTeX**, la bibliothèque de rendu LaTeX côté client, pour un rendu scientifique professionnel avec de vraies fractions, exposants, indices et symboles grecs.

### Dépendance à ajouter
- `katex` (package npm) — rendu LaTeX rapide côté client (~28 kB gzipped)

### Approche
1. Transformer `FormulaBlock` pour qu'il accepte une string LaTeX via une prop `tex` et utilise `katex.renderToString()` pour produire le HTML
2. Importer le CSS de KaTeX dans `FormulaBlock.tsx`
3. Réécrire toutes les formules en LaTeX dans les sections help
4. Supprimer les anciennes formules HTML (balises `<sub>`, `<sup>`, texte brut)

### Fichiers impactés

| Fichier | Modification |
|---|---|
| `src/pages/help/FormulaBlock.tsx` | Refonte complète : accept `tex` string, rendu via `katex.renderToString()`, import CSS KaTeX |
| `src/pages/help/HelpSectionProperties.tsx` | 5 formules → LaTeX (`D_i`, `A`, `I`, `c`, `w_{lin}`) |
| `src/pages/help/HelpLoading.tsx` | 2 formules → LaTeX (`q`, vecteur de charge élémentaire) |
| `src/pages/help/HelpSettlement.tsx` | 2 formules → LaTeX (`w_{ref}`, `M_{settlement}`) |
| `src/pages/help/HelpFEM.tsx` | 2 formules → LaTeX (matrice de rigidité 4×4, `\sigma(x)`) |
| `src/pages/help/HelpValidation.tsx` | 3 formules → LaTeX (`M_{end}`, `M_{settlement}`, `M_{span}`) |
| `src/pages/help/HelpSafetyCriteria.tsx` | 1 formule → LaTeX (critère de sécurité) |

Les fichiers sans formules (`HelpIntroduction`, `HelpInputs`, `HelpMechanicalModel`, `HelpSupports`, `HelpCalcModes`, `HelpLimitations`) ne changent **pas**.

### Détails techniques

**FormulaBlock refait** (~25 lignes) :
```tsx
import katex from "katex";
import "katex/dist/katex.min.css";

interface FormulaBlockProps {
  tex: string;
  label?: string;
}

const FormulaBlock = ({ tex, label }: FormulaBlockProps) => (
  <div className="my-3 px-4 py-3 bg-muted/50 rounded-md border-l-4 border-primary/30 overflow-x-auto">
    <div
      className="text-center"
      dangerouslySetInnerHTML={{ __html: katex.renderToString(tex, { displayMode: true, throwOnError: false }) }}
    />
    {label && <p className="text-[10px] text-muted-foreground mt-1 text-center">{label}</p>}
  </div>
);

export default FormulaBlock;
```

**Exemples de formules LaTeX** :

| Section | Avant (HTML) | Après (LaTeX) |
|---|---|---|
| Section Properties | `A = (π / 4) · (D₀² − Dᵢ²)` | `A = \frac{\pi}{4} \left( D_0^2 - D_i^2 \right)` |
| Section Properties | `I = (π / 64) · (D₀⁴ − Dᵢ⁴)` | `I = \frac{\pi}{64} \left( D_0^4 - D_i^4 \right)` |
| Loading | `q = ρ · g · A` | `q = \rho \cdot g \cdot A` |
| Loading (vecteur) | `f = [ qL/2, qL²/12, ... ]` | `\mathbf{f}_e = \begin{bmatrix} \frac{qL}{2} & \frac{qL^2}{12} & \frac{qL}{2} & -\frac{qL^2}{12} \end{bmatrix}^T` |
| Settlement | `w_ref(x) = h·x / L` | `w_{\text{ref}}(x) = \frac{h_{\text{fem}} \cdot x}{L}` |
| FEM (matrice) | Texte brut 4 lignes | `\mathbf{k}_e = \frac{EI}{L_e^3} \begin{bmatrix} 12 & 6L_e & -12 & 6L_e \\ ... \end{bmatrix}` |
| FEM (stress) | `σ(x) = \|M(x)\| · c / I` | `\sigma(x) = \frac{|M(x)| \cdot c}{I}` |
| Safety | `σ_max ≤ σ_allow + 0.5` | `\sigma_{\max} \leq \sigma_{\text{allow}} + 0.5 \text{ MPa}` |

**Style amélioré** : le `FormulaBlock` aura une bordure gauche accent (`border-l-4 border-primary/30`), un fond subtil (`bg-muted/50`), et `overflow-x-auto` pour le scroll horizontal sur mobile si la formule est large.

### Ce qui ne change PAS
- Aucune modification aux calculs, solver, ou composants de la page principale
- Le contenu textuel des sections help reste identique
- Aucun impact sur les performances de la page de calcul (KaTeX n'est chargé que sur `/help`)

### Risques
- **Zéro fonctionnel** : changement purement visuel sur une page statique
- Le CSS de KaTeX (~28 kB) est chargé uniquement sur la page help via l'import dans `FormulaBlock`

