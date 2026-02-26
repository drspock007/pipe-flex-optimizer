

## Plan : Ajout du logo comme favicon et dans le Header

### Modifications

**1. Copier l'image dans le projet**
- Copier `user-uploads://ChatGPT_Image_26_févr._2026_17_25_48.png` → `public/logo.png` (pour le favicon)
- Copier aussi → `src/assets/logo.png` (pour l'import dans le Header)

**2. `index.html`**
- Remplacer le favicon `public/favicon.ico` par `<link rel="icon" type="image/png" href="/logo.png" />`
- Mettre à jour le `<title>` → "Pipe Settlement — Flexibility Optimizer"
- Mettre à jour les balises `og:title` et description

**3. `src/components/Header.tsx`**
- Remplacer le bloc `<div className="rounded-lg bg-primary p-1.5"><Activity ... /></div>` par une balise `<img>` importée depuis `@/assets/logo.png`
- Taille : `h-9` (~36px) avec `rounded-lg`
- Supprimer l'import `Activity` de lucide-react

