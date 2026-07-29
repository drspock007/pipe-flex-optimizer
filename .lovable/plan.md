## Objectif
Remplacer le tag Google Analytics écrit en dur dans `index.html` par une intégration propre via le connecteur Lovable `google_analytics`, en lisant la clé côté client depuis `import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY`.

## État actuel confirmé
- `index.html` contient un tag `gtag.js` hardcodé avec l'ID `G-9R8WYBPDC1`.
- Une connexion workspace `google_analytics` existe (`std_01kyqgcasxfaqbm3bybycvc96e`) mais n'est pas liée au projet (`is linked to project: no`).

## Étapes

1. **Lier le connecteur Google Analytics au projet**
   - Appeler `standard_connectors--connect` avec `connector_id: "google_analytics"`.
   - Après liaison, le Measurement ID sera exposé côté client sous `VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY`.

2. **Créer un module d'analytics côté client**
   - Créer `src/lib/analytics.ts`.
   - Lire `import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY`.
   - Injecter (une seule fois) le script `gtag.js` et configurer `gtag('config', measurementId)`.
   - Exporter une fonction `trackPageView(path: string)` pour les changements de route SPA.

3. **Intégrer le module dans l'application**
   - Appeler l'initialisation dans `src/main.tsx` au démarrage.
   - Déclencher `trackPageView` à chaque changement de route (via un effet dans `App.tsx` ou un hook dédié).

4. **Nettoyer `index.html`**
   - Supprimer le bloc `<!-- Google tag (gtag.js) -->` et le script inline.
   - Conserver les autres métadonnées (title, description, JSON-LD, Search Console).

5. **Validation**
   - Vérifier que le build Vite réussit (`bun run build`).
   - Vérifier que la variable d'environnement est bien lue et que le script `gtag.js` est injecté avec le bon ID.

## Résultat attendu
Google Analytics est alimenté par le connecteur Lovable (pas de clé en dur), le script est initialisé dynamiquement, et les changements de route SPA envoient des `page_view`.