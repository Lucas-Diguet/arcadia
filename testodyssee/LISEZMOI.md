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
├── js/contenu.js         Pokémon, objets, dresseurs et décor exclusifs du labo
├── js/objets.js          ce que font ces objets quand on les utilise (parchemins, CT, Bouchon d'Or)
├── js/rendu.js           donjons clairs, sol glacé, faisceaux de lumière
├── js/donjons/           un fichier par donjon (crypte.js, didier.js, miroirs.js) et la liste (index.js)
├── js/combat/
│   ├── raid.js           combat à plusieurs contre un boss, barre de vie à blocs (sans écran, testé sous Node)
│   └── vue.js            ce combat dans l'écran de combat d'Odyssée, encadré des équipiers
└── js/donjon/
    ├── plan.js           le plan en texte devient une carte d'Odyssée
    ├── etat.js           règles partagées du groupe (sans écran, testées sous Node)
    ├── jeu.js            PNJ, portes, combats, dalles, panneau, échanges avec l'hôte du salon
    ├── mecaniques.js     questions, clés et serrures, ascenseur, journal, organisation du combat contre le boss
    ├── casse-tetes.js    glace, lumière et reflet, sans écran (résolus sous Node par les tests)
    └── miroirs.js        le donjon des miroirs : énigme, miroirs de poche, robot, brasier, lumière, Copycat
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
| `D` | sortie vers l'extérieur (sous l'arrivée), ou vers la salle d'avant |
| `N` | passage vers la salle suivante (salles séparées) ; muré tant que la salle n'est pas terminée, sauf salle `libre` ou fermée par une porte |
| `o` | dalle à tenir (sauf si `objets` définit `o`) |
| `i` | sol glacé : on glisse jusqu'au prochain obstacle |
| `0` à `9` | porte scellée ; elle s'ouvre quand la salle qui porte ce numéro est terminée |
| lettres de `pnj` | un PNJ (gardien, adversaire, boss), une seule fois chacun |
| lettres de `decor` | décor qui bloque le passage (`brasero`, `colonne`, `squelette`, `gargouille`, `caverock`…) |
| lettres de `objets` | objet qu'on utilise : panneau (`type: 'panneau'`, plusieurs cases côte à côte font un grand panneau) ou ascenseur |

Autres objets : `ramasser` (`objet`, `n` : un objet du Sac posé au sol, gardé en sortant) et ceux du donjon des
miroirs (`enigme`, `miroirMural`, `miroirPoche`, `robot`, `brasier`, `soleil`, `miroirFixe`, `socle`, `plaque`,
`copycat`). Un panneau demandé se pose au centre de la première salle, pas juste à l'entrée.

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

| `libre` | rien à faire : la salle est ouverte dès le départ |
| `enigme` | on touche le bon miroir (`porteObjet` : la lettre du miroir qui s'efface). Mauvais miroir : même pénalité qu'une mauvaise réponse |
| `lumiere` | les deux faisceaux du brasier éclairent tous les soleils |
| `reflet` | on rejoint Copycat et on bat la copie de sa propre équipe |

Un donjon `solo: true` n'est pas partagé : chaque joueur a le sien, et il se remet à zéro quand on en sort (les objets
de `objetsDuDonjon` quittent alors le Sac). `style: 'clair'` dessine le donjon en blanc.

**Salles séparées** : au lieu d'un `plan` pour tout le donjon, chaque salle a son propre `plan`. Chaque salle est alors
une carte à part, et on passe de l'une à l'autre avec un fondu, comme en entrant dans un bâtiment : `N` (en haut) mène
à l'arrivée `S` de la salle suivante, `D` (en bas) ramène devant le `N` de la salle d'avant (celui de la première salle
mène dehors). Une défaite ramène à l'entrée de la salle où l'on est. `vue: 2` montre la salle de plus haut.

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

### Le donjon des miroirs

Seul, niveau 35, cinq salles séparées :

1. **Énigme** : le panneau au centre montre une horloge vue dans un miroir (3 h 40) et les trois réponses, avec une
   flèche vers leur miroir (`<-` gauche, `↑` milieu, `->` droite). Le bon miroir (gauche, 8 h 20) s'efface et
   découvre le passage ; les deux autres se brisent et font tomber l'équipe à la moitié de ses PV.
2. **Galerie de Glace** (40 × 27) : cinq petits miroirs sur la glace. Trois sont des miroirs de poche (dans le
   journal), deux sont piégés et envoient une copie du premier Pokémon en forme de l'équipe.
3. **Grand Miroir Gelé** (40 × 27) : objets et parchemins à garder, et le robot Réflecteur (M. Mime, Qulbutoké,
   Milobellus, tous avec Voile Miroir), le plus loin à atteindre, qui donne la CT Voile Miroir.
4. **Salle du Brasier** : rencontres à 60 % Funécire, 10 % Mélancolux, 15 % Sorbébé, 10 % Sorboul, 5 % Hexagel.
   Chaque Pokémon Feu battu laisse un Feu Follet ; on les jette un par un (un texte par stade du brasier), 5 l'allument
   et les rencontres s'arrêtent. Un Pokémon Glace battu donne une Eau Fraîche, et éteint le brasier s'il n'a pas ses
   5 feux. Puis on tourne les miroirs sur pied et on pose les 3 miroirs de poche sur les bons socles (une seule
   solution, 5 miroirs à tourner) jusqu'à éclairer les deux soleils : la grande porte s'ouvre.
5. **Salle du Reflet** (vue de plus haut) : Copycat refait chaque pas en miroir (gauche et droite pareil, haut et bas
   inversés), chacun de son côté de la ligne du milieu, dans un grand labyrinthe (65 pas au mieux). Arrivé à côté de
   lui, on affronte une copie soignée de toute sa propre équipe. Le menu (ou la plaque près de l'entrée) ramène au
   début de la salle.

Récompenses : un Bouchon d'Or (IV au maximum, pour renforcer l'équipe) et un Éclat de Miroir (pour un futur donjon).
`tools/test-testodyssee.mjs` vérifie l'enchaînement des salles, qu'on ne reste jamais coincé sur la glace (quels que
soient les objets déjà pris) et que c'est assez long, que la lumière n'a qu'une solution, et que Copycat est rejoignable.

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
