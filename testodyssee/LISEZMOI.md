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
├── js/contenu.js         Pokémon et objets exclusifs du labo (Spectre de Pierre Chartier, Panini de Châteauroux)
├── js/donjons/           un fichier par donjon (crypte.js, didier.js) et la liste (index.js)
├── js/combat/
│   ├── raid.js           combat à plusieurs contre un boss, barre de vie à blocs (sans écran, testé sous Node)
│   └── vue.js            ce combat dans l'écran de combat d'Odyssée, encadré des équipiers
└── js/donjon/
    ├── plan.js           le plan en texte devient une carte d'Odyssée
    ├── etat.js           règles partagées du groupe (sans écran, testées sous Node)
    ├── jeu.js            PNJ, portes, combats, dalles, panneau, échanges avec l'hôte du salon
    └── mecaniques.js     questions, clés et serrures, ascenseur, journal, organisation du combat contre le boss
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
| `D` | sortie vers l'extérieur (sous l'arrivée) |
| `o` | dalle à tenir |
| `0` à `9` | porte scellée ; elle s'ouvre quand la salle qui porte ce numéro est terminée |
| lettres de `pnj` | un PNJ (gardien, adversaire, boss), une seule fois chacun |
| lettres de `decor` | décor qui bloque le passage (`brasero`, `colonne`, `squelette`, `gargouille`, `caverock`…) |
| lettres de `objets` | objet qu'on utilise : panneau (`type: 'panneau'`, plusieurs cases côte à côte font un grand panneau) ou ascenseur |

Un ascenseur (`type: 'ascenseur'`) mène à l'ascenseur dont la lettre est `vers` ; on arrive sur la case libre à côté.
Avec `salle` et `serrures`, il reste fermé tant que cette salle n'est pas terminée. Deux parties du plan qui ne se
touchent pas (comme le bureau de Pierre) ne se rejoignent que par un ascenseur.

Les décors disponibles sont ceux d'Odyssée : la liste `deco`, `nature` et `mobilier` de `odyssee/js/data/sprites.js`.
Une lettre inconnue arrête le labo avec un message qui donne sa ligne et sa colonne.

### L'extérieur

`exterieur()` construit l'extérieur du donjon avec les outils d'Odyssée (`GameMap`, `building`, `prop`, `sign`, comme
les lieux annexes de `odyssee/js/world/quetes.js`) et renvoie `{ carte, porte: [x, y] }`. La porte mène à l'arrivée `S`,
la sortie `D` ramène devant la porte, et dans l'écran de choix on apparaît deux cases devant l'entrée
(`?lieu=crypte&dedans` pour entrer directement). Pour passer un extérieur dans Odyssée, il suffit de relier sa
lisière à la grande carte, comme le fait `passage()` dans `quetes.js`.

### Les salles

`salles` donne l'ordre du donjon. Une salle ne s'ouvre que quand toutes celles d'avant sont terminées.

| Type | Terminée quand… |
|---|---|
| `accueil` | un joueur demande au gardien d'ouvrir. Le groupe présent est compté à ce moment-là |
| `combat` | tous ses adversaires (`pnj: ['a', 'b', 'c']`) sont battus. Un adversaire ne se combat que par un joueur à la fois |
| `dalles` | assez de joueurs se tiennent sur les dalles en même temps : autant que de joueurs présents, au plus le nombre de dalles |
| `boss` | ses PV partagés tombent à zéro. Chaque combat retire au boss les PV qu'on lui a infligés. PV du boss = PV normaux × (joueurs + 1) |
| `serrures` | chacun de ses PNJ donne une clé à qui le bat, et toutes les clés sont dans les serrures (de l'ascenseur). Une clé pas encore posée retourne à son PNJ si son porteur quitte le donjon |
| `raid` | le boss est battu dans un combat à plusieurs. Il commence quand tous les joueurs présents dans le donjon lui ont parlé |

`porte` est le numéro de la porte qui s'ouvre à la fin de la salle. `repere` sert aux salles sans PNJ (`'S'` pour
l'entrée, `'o'` pour les dalles) : c'est par là que le labo trouve les cases de la salle, dont il se sert pour afficher
son nom en y entrant.

### Les PNJ

```js
a: { id: 'ame1', cls: 'Âme', nom: 'errante', sprite: 'medium', dir: 'down', equipe: [[92, 18], [353, 19]] },
```

`quiz: 'delta'` fait du PNJ un questionneur : il pose la question `questions.delta` (4 réponses, la bonne en premier,
mélangées à l'affichage). Bonne réponse : combat, puis la clé `cle` s'il est battu. Mauvaise réponse : toute l'équipe
tombe à la moitié de ses PV, puis à 1 PV, puis plus rien. `raid: true, espece, niveau` : boss du combat à plusieurs.

`cls` et `nom` donnent « Âme errante envoie Fantominus ! ». `sprite` est l'apparence sur la carte (liste `chars` de
`sprites.js`), `bs` le dessin en combat s'il est différent. `equipe` : numéros des Pokémon et niveaux. `gardien: true`
pour le PNJ qui ouvre le donjon, `boss: true` pour le boss.

### Le journal

`journal` liste les sous-quêtes du donjon (une par salle à suivre), affichées dans le menu JOURNAL avec les objets de
quête du joueur (les clés). Tout ce qui est dans le journal reste dans le donjon.

### Le combat à plusieurs

Chaque joueur a un Pokémon en jeu ; le boss agit une fois par tour contre un joueur tiré au sort. Ses PV sont
multipliés par le nombre de joueurs et découpés en 3 blocs : un coup ne casse jamais plus d'un bloc, et chaque bloc
cassé donne +1 en Vitesse au boss. Un joueur dont l'équipe est K.O. attend la fin du combat des autres. L'hôte calcule
tout (`js/combat/raid.js`) ; l'écran de chaque joueur rejoue les tours (`js/combat/vue.js`).

### Pokémon et objets exclusifs

Dans `js/contenu.js` : une espèce (numéro à partir de 2001, son image dans `img/`) ou un objet (son icône dans `img/`).

## Ajouter un nouveau type de salle

1. Une règle dans `appliquer()` de `js/donjon/etat.js`, avec ses tests dans `tools/test-testodyssee.mjs`.
2. Ce que voit le joueur dans `js/donjon/jeu.js` (dialogue d'un PNJ, ou vérification à chaque image comme les dalles,
   décidée par l'hôte).

## Passer un lieu dans Odyssée

La carte construite par `plan.js` est une carte d'Odyssée ordinaire (`GameMap`). Pour l'intégrer : l'ajouter dans
`odyssee/js/world/` (comme les lieux de `quetes.js`), poser une entrée sur la grande carte, et brancher les règles du
groupe dans `odyssee/js/net/`.
