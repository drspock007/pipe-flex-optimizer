

## Plan : Ajout d'un bandeau explicatif en haut de page

### Modification unique — `src/pages/Index.tsx`

Ajouter un bloc informatif entre `<Header />` et `<main>`, sous forme d'un petit encadré discret :

```tsx
<div className="container px-4 pt-4">
  <div className="rounded-lg border bg-muted/50 px-4 py-3 text-xs text-muted-foreground leading-relaxed max-w-4xl">
    <p>
      This calculation applies, for example, to a <strong>trench lowering-in with sidebooms</strong>.
      The height <strong>h</strong> represents the trench depth plus the pipe lifting height from ground level.
      The length <strong>L</strong> is the distance from the last sideboom to the point where the pipe contacts the trench bottom.
      Additional sideboom(s) may be positioned in between if intermediate support(s) are required.
    </p>
  </div>
</div>
```

- Texte en anglais, cohérent avec le reste de l'UI
- Style discret (`muted/50`, `text-xs`) pour ne pas surcharger visuellement
- Responsive par défaut (conteneur fluide, `max-w-4xl`)

