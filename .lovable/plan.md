

## Plan : Ajout d'un schéma SVG du tuyau déformé

### 1. Créer `src/components/PipeSchematicSVG.tsx`

Composant React qui rend un SVG inline représentant le scénario de mise en tranchée :

- **Pipe en forme de S** : courbe de Bézier partant du sideboom (en haut à gauche) jusqu'au fond de tranchée (en bas à droite)
- **Tranchée** : représentée par un profil rectangulaire en bas à droite
- **Sideboom** : triangle/flèche en haut à gauche
- **Annotations** : flèches cotées pour `h` (verticale) et `L` (horizontale)
- **Sol** : ligne horizontale avec hachures
- **Support intermédiaire optionnel** : petit triangle au milieu de la courbe (en pointillés)

Dimensions SVG : `viewBox="0 0 600 250"`, responsive via `w-full max-w-2xl`

Style : traits fins, couleurs `currentColor` / `muted-foreground`, cohérent avec le thème sombre/clair.

### 2. Modifier `src/pages/Index.tsx`

- Importer `PipeSchematicSVG`
- L'insérer juste après le `<div>` du texte explicatif, dans le même conteneur

