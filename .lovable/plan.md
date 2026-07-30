## Constat

`.env` (généré par le connecteur Google Analytics) contient :

```
VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY="G-506693594"
```

Ce n'est pas un ID de mesure valide : d'après la capture, l'ID de mesure du flux est **G-9R8WYBPDC1** (G-506693594 ressemble à un fragment de l'ID de flux/compte). `src/lib/usageMetrics.ts` lit cette variable et la passe à `gtag('config', ...)` → aucune donnée n'est envoyée sur la bonne propriété.

## Correction proposée

1. **Reconnecter le connecteur Google Analytics** (`standard_connectors--reconnect`, puis `connect` si nécessaire) en saisissant l'ID de mesure correct `G-9R8WYBPDC1`. C'est la source de vérité : `.env` est régénéré par la plateforme, une modification manuelle serait écrasée.
2. **Sécuriser `src/lib/usageMetrics.ts`** : valider le format de l'ID (`/^G-[A-Z0-9]+$/`) avant d'injecter le script ; si l'ID est absent ou invalide, ne rien charger et logger un avertissement explicite nommé `[usageMetrics] invalid-measurement-id` (log permanent, non temporaire).
3. **Vérification** : après consentement analytics accepté dans l'aperçu, contrôler via Playwright que la requête réseau part bien vers `googletagmanager.com/gtag/js?id=G-9R8WYBPDC1`.
4. **Version + sitemap** : mise à jour du numéro de version dans `src/components/Footer.tsx` (format `vAAAAMMDDHHMMSS`, heure de Rome) et du `lastmod` de `public/sitemap.xml`.

## Note

Le flux GA visible sur la capture est rattaché à l'URL `https://giovannimalagninoconsulting.com`. Le trafic de `pipe-lowering.giovannimalagninoconsulting.com` remontera bien dans cette même propriété (le champ « URL de flux » n'est pas un filtre), donc aucune action supplémentaire n'est requise côté Google — sauf si vous préférez un flux dédié à l'app, auquel cas il faudra en créer un et utiliser son propre ID de mesure.