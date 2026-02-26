

## Plan : Élargir le texte explicatif et le schéma SVG

### Constat

Le texte et le SVG sont dans un `<div className="container px-4 pt-4">` avec un `max-w-4xl` sur le texte et un `max-w-2xl` sur le SVG. Le graphe Stress est dans la grille `container` sans limite de largeur — il faut aligner.

### Modifications — `src/pages/Index.tsx`

1. Retirer `max-w-4xl` du `<div>` du texte explicatif (ligne 39)
2. Déplacer le bloc texte + SVG à l'intérieur du `<main>` existant, avant la grille, pour qu'il hérite du même `container px-4`

### Modification — `src/components/PipeSchematicSVG.tsx`

1. Retirer `max-w-2xl` de la classe du SVG pour qu'il occupe toute la largeur disponible

