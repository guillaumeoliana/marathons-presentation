# 42.195 — Courir ailleurs

Dix week-ends marathon en France et en Europe au printemps 2027, au départ de Paris. Les dix monuments stylisés sont modélisés dans Three.js. La scène se transforme avec le défilement, et les annotations sont positionnées à partir des coordonnées 3D. Un rendu logiciel projette les mêmes maillages lorsque WebGL2 est indisponible.

## Lancer en local

```sh
npm ci
npm run dev
```

`npm run build` produit le site statique dans `dist/`. Utiliser `npm run preview` pour tester ce build.

## GitHub Pages

Dans **Settings → Pages → Build and deployment**, choisir **GitHub Actions** comme source. Le workflow **Publish to GitHub Pages** compile et publie le site après chaque push sur `main`. Une fois Pages activé, on peut aussi lancer manuellement le workflow dans l’onglet Actions.

## Données

Chaque carnet renvoie vers l’organisateur et un service de transport. Les fourchettes sont indicatives et comprennent le dossard, le trajet aller-retour, la part d’une chambre à deux et les repas. Confirmer dates et tarifs avant réservation.
