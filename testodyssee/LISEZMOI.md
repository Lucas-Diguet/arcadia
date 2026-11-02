# TestOdyssée, le labo d'Odyssée

Un jeu du Hub pour essayer des villes, des routes et des donjons avant de les mettre dans Odyssée. On choisit un lieu et
une équipe prête, et on y apparaît directement, seul ou à plusieurs. Rien n'est sauvegardé : la vraie partie d'Odyssée
n'est jamais touchée.

Le labo réutilise le moteur et les images d'Odyssée (`../odyssee/js/`, `../odyssee/img/`) sans les copier. Ce qui est
propre au labo :

```
testodyssee/
├── js/main.js            démarrage, écran de choix (lieu, équipe, personnage)
├── js/jeu.js             le jeu d'Odyssée sans sauvegarde, avec « Changer de lieu » dans le menu
├── js/lieux.js           lieux proposés : donjons du labo, puis villes, routes et grottes d'Odyssée
├── js/equipes.js         équipes prêtes (niveau, badges, sac, toutes les CS)
├── js/donjons/           un fichier par donjon (crypte.js) et la liste (index.js)
└── js/donjon/
    ├── plan.js           le plan en texte devient une carte d'Odyssée
    ├── etat.js           règles partagées du groupe (sans écran, testées sous Node)
    └── jeu.js            PNJ, portes, combats, dalles, panneau, échanges avec l'hôte du salon
```

## Tester

- Seul : `testodyssee/` (ou `testodyssee/?lieu=crypte&equipe=debut` pour entrer directement).
- À plusieurs sur un seul écran : `tools/salon-test.html?jeu=testodyssee&n=3&params=lieu%3Dcrypte`
  ouvre trois joueurs côte à côte (clique dans un cadre pour le jouer). `&quitte=1` fait partir l'hôte au bout de
  20 secondes, pour voir le donjon continuer chez les autres.
- Pour de vrai : dans le Hub, l'hôte du salon lance TestOdyssée.
- Règles et plans : `node tools/test-testodyssee.mjs` (à lancer après chaque changement de donjon).

Pour lancer le site chez soi : `python3 -m http.server 8000` à la racine du dépôt, puis `http://localhost:8000/testodyssee/`.

## Faire un donjon

Copier `js/donjons/crypte.js`, changer `id`, `carte` (commencer par `labo:`) et `nom`, puis ajouter le fichier à la
liste de `js/donjons/index.js`.

### Le plan

Le donjon se dessine en texte, une lettre par case :

| Lettre | Case |
|---|---|
| `#` | mur |
| `.` | sol |
| `S` | arrivée des joueurs (une seule) |
| `o` | dalle à tenir |
| `0` à `9` | porte scellée ; elle s'ouvre quand la salle qui porte ce numéro est terminée |
| lettres de `pnj` | un PNJ (gardien, adversaire, boss), une seule fois chacun |
| lettres de `decor` | décor qui bloque le passage (`brasero`, `colonne`, `squelette`, `gargouille`, `caverock`…) |

Les décors disponibles sont ceux d'Odyssée : la liste `deco`, `nature` et `mobilier` de `odyssee/js/data/sprites.js`.
Une lettre inconnue arrête le labo avec un message qui donne sa ligne et sa colonne.

### Les salles

`salles` donne l'ordre du donjon. Une salle ne s'ouvre que quand toutes celles d'avant sont terminées.

| Type | Terminée quand… |
|---|---|
| `accueil` | un joueur demande au gardien d'ouvrir. Le groupe présent est compté à ce moment-là |
| `combat` | tous ses adversaires (`pnj: ['a', 'b', 'c']`) sont battus. Un adversaire ne se combat que par un joueur à la fois |
| `dalles` | assez de joueurs se tiennent sur les dalles en même temps : autant que de joueurs présents, au plus le nombre de dalles |
| `boss` | ses PV partagés tombent à zéro. Chaque combat retire au boss les PV qu'on lui a infligés. PV du boss = PV normaux × (joueurs + 1) |

`porte` est le numéro de la porte qui s'ouvre à la fin de la salle. `repere` sert aux salles sans PNJ (`'S'` pour
l'entrée, `'o'` pour les dalles) : c'est par là que le labo trouve les cases de la salle, dont il se sert pour afficher
son nom en y entrant.

### Les PNJ

```js
a: { id: 'ame1', cls: 'Âme', nom: 'errante', sprite: 'medium', dir: 'down', equipe: [[92, 18], [353, 19]] },
```

`cls` et `nom` donnent « Âme errante envoie Fantominus ! ». `sprite` est l'apparence sur la carte (liste `chars` de
`sprites.js`), `bs` le dessin en combat s'il est différent. `equipe` : numéros des Pokémon et niveaux. `gardien: true`
pour le PNJ qui ouvre le donjon, `boss: true` pour le boss.

## Ajouter un nouveau type de salle

1. Une règle dans `appliquer()` de `js/donjon/etat.js`, avec ses tests dans `tools/test-testodyssee.mjs`.
2. Ce que voit le joueur dans `js/donjon/jeu.js` (dialogue d'un PNJ, ou vérification à chaque image comme les dalles,
   décidée par l'hôte).

## Passer un lieu dans Odyssée

La carte construite par `plan.js` est une carte d'Odyssée ordinaire (`GameMap`). Pour l'intégrer : l'ajouter dans
`odyssee/js/world/` (comme les lieux de `quetes.js`), poser une entrée sur la grande carte, et brancher les règles du
groupe dans `odyssee/js/net/`.
