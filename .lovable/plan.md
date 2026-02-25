

## Plan : Page d'aide détaillée (Help & Documentation)

### Objectif
Créer une page `/help` exhaustive décrivant le fonctionnement du SaaS, les méthodes de calcul, les hypothèses et les formules utilisées. Accessible depuis la page principale via un lien dans le Header.

### Structure de la page d'aide

La page sera divisée en sections claires avec navigation interne (ancres) :

1. **Introduction** — Objectif de l'outil, cas d'usage (pipeline flexibility / settlement analysis)
2. **Données d'entrée** — Description de chaque paramètre (D₀, t, L, h, grade, E, ρ, allowable %)
3. **Propriétés de section** — Formules : A, I, c, poids linéique
4. **Modèle mécanique** — Poutre Euler-Bernoulli encastrée-encastrée, convention de signes
5. **Chargement** — Poids propre q = ρ·g·A, convention w positif vers le bas
6. **Tassement différentiel** — Modèle h, ligne de référence w_ref(x) = h·x/L
7. **Supports intermédiaires** — Modèle unilatéral (hoists/sidebooms), algorithme active-set
8. **Méthode des éléments finis** — Matrice de rigidité poutre, solveur LDLT bandé, maillage adaptatif
9. **Modes de calcul** :
   - Standard (auto supports)
   - Find L (fenêtre admissible Lmin–Lmax + Lopt par section dorée)
   - Find H (tassement max par bisection)
10. **Critère de sécurité** — σ = |M|·c / I ≤ allowable + 0.5 MPa (buffer numérique)
11. **Validation** — Comparaisons analytiques (qL²/12, 6EIh/L²)
12. **Limites et hypothèses** — Linéaire élastique, petites déformations, pas de flambement, etc.

### Formules clés à inclure (rendues en HTML/CSS, pas de dépendance externe)

Les formules seront mises en page avec des éléments HTML sémantiques (`<var>`, `<sub>`, `<sup>`, fractions via flexbox) sans dépendre de MathJax/KaTeX pour rester léger :

- A = π/4 · (D₀² − Dᵢ²)
- I = π/64 · (D₀⁴ − Dᵢ⁴)
- c = D₀ / 2
- q = ρ · g · A
- σ = |M| · c / I
- M_theory = q·L² / 12 (encastré-encastré)
- M_settlement = 6·E·I·h / L²
- Matrice de rigidité élémentaire 4×4 Euler-Bernoulli (EI/L³ · [12, 6L, ...])

### Fichiers impactés

| Fichier | Modification |
|---|---|
| `src/pages/HelpPage.tsx` | **Nouveau** — Page d'aide (~150 lignes, composant principal) |
| `src/pages/help/HelpIntroduction.tsx` | **Nouveau** — Section introduction |
| `src/pages/help/HelpInputs.tsx` | **Nouveau** — Section données d'entrée |
| `src/pages/help/HelpSectionProperties.tsx` | **Nouveau** — Section propriétés de section + formules |
| `src/pages/help/HelpMechanicalModel.tsx` | **Nouveau** — Modèle mécanique + conventions |
| `src/pages/help/HelpLoading.tsx` | **Nouveau** — Chargement |
| `src/pages/help/HelpSettlement.tsx` | **Nouveau** — Tassement différentiel |
| `src/pages/help/HelpSupports.tsx` | **Nouveau** — Supports unilatéraux |
| `src/pages/help/HelpFEM.tsx` | **Nouveau** — Méthode FEM détaillée |
| `src/pages/help/HelpCalcModes.tsx` | **Nouveau** — 3 modes de calcul |
| `src/pages/help/HelpSafetyCriteria.tsx` | **Nouveau** — Critère de sécurité |
| `src/pages/help/HelpValidation.tsx` | **Nouveau** — Validation analytique |
| `src/pages/help/HelpLimitations.tsx` | **Nouveau** — Limites et hypothèses |
| `src/pages/help/FormulaBlock.tsx` | **Nouveau** — Composant réutilisable pour afficher les formules |
| `src/components/Header.tsx` | Ajout d'un lien "Help" vers `/help` |
| `src/App.tsx` | Ajout de la route `/help` |

### Détails techniques

**Mise en page des formules** — Un composant `FormulaBlock` simple :
```tsx
// Affiche une formule centrée avec un fond légèrement grisé
const FormulaBlock = ({ children, label }: { children: React.ReactNode; label?: string }) => (
  <div className="my-3 px-4 py-3 bg-muted rounded-md text-center">
    <div className="text-sm font-mono">{children}</div>
    {label && <p className="text-[10px] text-muted-foreground mt-1">{label}</p>}
  </div>
);
```

**Navigation interne** — Table of contents en haut avec des liens `#section-id` pour naviguer rapidement.

**Header** — Ajout d'un lien discret :
```tsx
<Link to="/help" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
  <HelpCircle className="h-4 w-4" />
</Link>
```

**Responsive** — La page utilisera `prose`-like styling avec `max-w-4xl mx-auto` pour une lecture confortable sur tous les devices.

**Scalabilité** — Chaque section est un composant séparé (~60-80 lignes chacun) dans `src/pages/help/`, ce qui permet d'ajouter facilement de nouvelles sections.

### Ce qui ne change PAS
- Aucune modification aux calculs, au FEM solver, ou aux composants existants
- Le DebugPanel, les graphiques, les cards restent identiques
- Aucun impact sur les performances (la page est purement statique)

### Version footer
La version `202602251646` sera affichée en bas de la page d'aide.

