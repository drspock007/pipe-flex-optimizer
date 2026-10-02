# Contrat technique V2

Les unités du moteur sont mm, N, MPa. Les saisies stockées dans l'application sont
notamment L en mètres et E en GPa ; `bridge.ts` assure la conversion.
x va de 0 à L, z est positif vers le haut, q vers le bas. Les extrémités imposent
z(0)=y(0)=0, z(L)=hv, y(L)=hl et des rotations nulles. Les 0 à 20 supports verticaux
unilatéraux sont régulièrement espacés. Le sol est horizontal, rigide et sans
frottement : son niveau est l'altitude minimale de l'axe, rayon déjà pris en compte.

Le modèle free est linéaire sans effort axial ; conserver ses chemins analytiques.
Le modèle restrained suppose une conduite initialement droite sans précontrainte,
une séparation axiale fixée et une cinématique de von Kármán (petites déformations,
rotations modérées). N = EA/(2L) × intégrale de (z′² + y′²). N, déformées et contacts
sont résolus ensemble. La contrainte gouvernante est N/A + flexion.

Le critère reste strict. Une incertitude numérique précède tout verdict met/not met.
La validité physique est toujours « not assessed » : pente, déformation axiale et
dépassement de limite élastique sont des indicateurs, pas une certification physique.
À hv=hl=groundZ=0 exactement, la solution est analytique : z=y=N=contrainte=0,
réaction linéique du sol p=q. Elle ne revendique aucune convergence de maillage.

Les recherches avec sol et restrained sont exploratoires : couverture non certifiée,
échecs et incertitudes conservés comme zones non résolues. Les bornes axiales
nécessaires ne sont pas les bornes free. Min. supports parcourt les nombres dans
l'ordre sous un budget global. Zéro support vérifié est minimal ; n>0 demanderait
une preuve excluant tous les nombres inférieurs, pas une absence dans l'échantillonnage.

Les valeurs représentées sont recalculées sans relancer la recherche. Les workers
obsolètes sont annulés ; les exports sont invalidés tant que les entrées et les
résultats ne sont pas cohérents. Ne pas relâcher budgets, tolérances ou concurrence
pour faire passer un test. L'ancienne erreur intermittente « 1 error » sans test
échoué reste de cause inconnue ; une exécution propre ne démontre pas sa correction.

Référence free : L=30000, hv=2500, E=210000, A=2047.8333482348326,
I=3010519.4980650246, c=57.15, q=0.1577005743975421, sigmaAllow=287.2.
Contraintes MPa pour (hl,n) : (0,0)=424.5523905204 ; (0,1)=256.1568476301 ;
(1000,0)=432.0258469081 ; (1000,1)=268.3615670840.

## Module distinct : déviation temporaire en service

`src/lib/in-service/` et la route `/in-service` ajoutent un modèle indépendant pour
l'acier sous pression. Le contrat détaillé est dans [in-service-model.md](in-service-model.md).
Ses entrées sont directement en mm/N/MPa/°C (contrairement à AppInputs ci-dessus).
Le PEHD n'est pas pris en charge. Les modes existants et leurs seuils ne changent pas.

### Shared PDF presentation

All report modules use `src/lib/pdf/theme.ts` for app-token colors, A4 backgrounds,
two 3 mm orange side bars, and consistent header/footer placement. Pipe lowering
uses the same 16 mm horizontal margins and alternating card rows as in-service.
`finishPdfPages` writes the calculation's captured app version and format/page
number; it does not substitute the current release for a legacy snapshot.
Signature and content pagination remain separate shared concerns.
