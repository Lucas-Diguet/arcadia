# PixelForge — pixel art écrit par le code

Outils de l'atelier graphique d'Odyssée : du pixel art exact (1 pixel = 1 vrai pixel, palette fixe, transparence réelle),
sans générateur extérieur.

## Sol généré du jeu

Le sol des routes, villes et grottes est calculé par le jeu lui-même : `odyssee/js/render/solgen.js` (générateur, sans DOM),
`solgen-worker.js` (calcul hors du fil principal) et `sol.js` (pose des blocs de 16 × 16 cases au-dessus du sol d'origine,
eau animée). Herbe, hautes herbes, chemins, pavés, eau, pontons, rebords façon HeartGold / SoulSilver, sols de grotte par biome.
Arbres, barrières, rochers, bâtiments, plateaux de roche des grottes et ombres restent ceux du jeu.
`?sol=0` dans l'adresse (ou `localStorage['odyssee-sol'] = '0'`) remet l'ancien sol pour comparer.

```
node tools/pixelforge/solgen-apercu.mjs monde 1 12 3 2 0 /tmp/route1.png     # carte, bloc x, bloc y, nb x, nb y, image
```

## Prototypes Python (source du générateur)

- `terrain2.py` : version validée (port JS dans solgen.js), `terrain.py` / `terrain3.py` : essais précédents.
- `bake.py`, `essai-jeu.cjs`, `dump-carte.mjs` : cuisson d'une carte en PNG et essai dans le jeu lancé en local.
- `render.py` / `scene.py` / `tiles/*.pf` : tuiles écrites en texte (un caractère = un pixel) et scènes par couches.
- `panneaux.py` : panneaux en bois dessinés au pixel (`panneaux/sign_plat.png`) ; le panneau du jeu en vue 3/4
  (`odyssee/img/nature/sign.png`) en est la retouche PixelLab (`panneaux/sign_pixellab_brut.png`), nettoyée à la main
  (ombre verte retirée : le moteur ajoute la sienne).

Prérequis Python : `pip install pillow numpy scipy`.

## Dans le labo (fork de Lucas)

Copié de `gt124578/multigame` (branche `odyssee-dev`, `tools/pixelforge/`), sans les rendus du dossier `batiments/`
(on les refait avec `batiments.py`). Décors de donjon déjà dessinés : `python3 tools/pixelforge/donjon.py` écrit dans
`donjon/` miroirs (objet, sur pied, à plat), grand brasier animé, pyramide, tombeau, sarcophage (fermé, ouvert) et portes
de salles de boss (égypte, crypte, glace, lave, miroir, sylve ; fermées et ouvertes).
`python3 tools/pixelforge/miroir_poche.py` : le miroir de poche du Donjon des Miroirs (`donjon/miroir_poche.png`).
