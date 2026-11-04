# TestOdyssée, le labo d'Odyssée

Un jeu du Hub pour essayer des villes, des routes et des donjons avant de les mettre dans Odyssée. On choisit un lieu et
une équipe prête, et on y apparaît directement, seul ou à plusieurs. Rien n'est sauvegardé : la vraie partie d'Odyssée
n'est jamais touchée.

Le labo réutilise le moteur et les images d'Odyssée (`../odyssee/js/`, `../odyssee/img/`) sans les copier. La page déclare
`<base href="../odyssee/">` : les adresses relatives des écrans d'Odyssée (`img/hud/…`, `img/battle/…`) marchent
telles quelles, et les fichiers du labo sont appelés en `../testodyssee/…`. Ce qui est
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
├── js/donjons/           un fichier par donjon (crypte.js, didier.js, miroirs.js, voies.js) et la liste (index.js)
├── js/combat/
│   ├── raid.js           combat à plusieurs contre un boss, barre de vie à blocs (sans écran, testé sous Node)
│   └── vue.js            ce combat dans l'écran de combat d'Odyssée, encadré des équipiers
└── js/donjon/
    ├── plan.js           le plan en texte devient une carte d'Odyssée
    ├── etat.js           règles partagées du groupe (sans écran, testées sous Node)
    ├── jeu.js            PNJ, portes, combats, dalles, panneau, échanges avec l'hôte du salon
    ├── mecaniques.js     questions, clés et serrures, ascenseur, journal, organisation du combat contre le boss
    ├── casse-tetes.js    glace, lumière et reflet, sans écran (résolus sous Node par les tests)
    ├── miroirs.js        le donjon des miroirs : énigme, miroirs de poche, robot, brasier, lumière, Copycat
    └── voies.js          le Sanctuaire des Trois Voies : portes à une personne, menteurs, parchemins, coffre et porte à code, caisses, grille
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

### Le panneau d'entrée (tous les donjons)

Dehors, à côté de la porte, un panneau se lit en trois pages : le nom du donjon, une phrase (`entree`) et le nombre de
joueurs (`joueurs`). `exterieur()` renvoie sa place (`panneau: [x, y]`) ; le labo le pose.

| `joueurs` | Dernière page | Le donjon |
|---|---|---|
| `{ mode: 'solo' }` | Donjon solo | fait pour être seul : chacun a le sien (`solo: true`) |
| `{ mode: 'groupe', n: 3 }` | Donjon solo ou en groupe (3 joueurs recommandés) | une seule partie pour le groupe, rien ne bloque |
| `{ mode: 'exact', n: 4 }` | Donjon à 4 joueurs | des mécaniques demandent tout le monde ; la salle de dalles de l'entrée demande alors 4 joueurs sur les dalles (`requis` d'une salle pour un autre nombre) |
| `{ mode: 'entre', min: 3, max: 4 }` | Donjon à 3 ou 4 joueurs | les dalles demandent autant de joueurs que présents (entre 3 et 4) et notent ce nombre (`e.nb`) : des dresseurs peuvent n'être là qu'à 3 ou qu'à 4 (`pour`) |

La même indication s'affiche dans la liste des lieux, après le niveau (`niveau`).

Le menu (QUITTER LE DONJON) et le bouton de l'encadré du donjon ramènent dehors, devant la porte. Un donjon solo se
remet à zéro ; dans un donjon de groupe, seul le joueur qui part s'en va et ses clés pas encore posées retournent à
leur PNJ.

### Le PC d'aide (seulement dans les salles où on le décide)

Lettre d'objet `{ type: 'pc', decor: 'pc', salle: 's2' }`, et dans la salle `aide: { indice, simplifier, resoudre }`.
Pour une salle de glace : l'indice trace au sol le chemin vers le prochain miroir de poche (ou la sortie) ; `simplifier`
est une liste de cases `[x, y, '.' ou 'X']` (sol où l'on s'arrête, ou cristal) calculée à l'avance et vérifiée par les
tests (jamais coincé, plus court) ; « Résoudre » donne les miroirs qui manquent et passe à la salle suivante. L'aide
utilisée est notée dans le journal.

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

`vue: 6` : le dresseur guette droit devant lui (`dir`) sur 6 cases ; s'il voit le joueur, il vient à lui et le défie
(`defi` : sa phrase). `duoAvec: 'q'` : les deux dresseurs viennent ensemble et se battent à deux contre le joueur seul,
qui envoie alors ses deux premiers Pokémon (combat de groupe joué sur place).

Boss à blocs (`raid: true`) : `blocs`, `boost` (stat qui monte à chaque bloc, 0 : aucune), `moves`, `immunite`, et
`effets` : ce qui arrive quand un bloc se brise, indexé par le nombre de blocs restants (`boostTout`, `piegeRoc`,
`baisseAttaques`, `ko` : un Pokémon d'un joueur pas encore visé est mis K.O.). Chaque effet ne joue qu'une fois par
combat, même si le boss se soigne ; `soinBlocs: 2` : son attaque de soin rend deux blocs.

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
2. **Galerie de Glace** (40 × 27) : un PC d'aide à l'entrée (indice, salle simplifiée, solution). Cinq petits miroirs sur la glace. Trois sont des miroirs de poche (dans le
   journal), deux sont piégés et envoient une copie du premier Pokémon encore debout de l'équipe.
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

### Le Sanctuaire des Trois Voies

À trois, salles séparées. Les chemins se séparent après la salle 2 : `apres` d'une salle dit quelles salles doivent
être terminées avant elle (au lieu de l'ordre de la liste), `suivante` où mène son passage N. Une salle `voies`
(`voies: { lettre: salle }`) a des portes qui ne laissent passer qu'un joueur chacune (action `voie` d'etat.js), sans
retour possible.

1. **Salle des Dalles** : trois dalles, la porte s'ouvre quand chacune est tenue (donjon « à 3 joueurs »).
2. **Salle des Trois Voies** : le trio des lacs en statues, le panneau, trois portes avec leur inscription.
3. **Épreuves** (un joueur chacune), avec un parchemin à deux chiffres au bout :
   - Sagesse : cinq statues, certaines mentent toujours ; on touche celles qui disent vrai (une seule solution,
     vérifiée par les tests ; toucher un menteur coûte des PV comme chez Didier).
   - Force : deux Karatékas face à face sur les flancs, qui viennent ensemble au joueur (combat à deux contre un, ses
     deux premiers Pokémon en jeu), puis le Gardien de la Force (combat à blocs en solo) : les attaques spéciales ne
     l'affectent pas tant que son premier bloc tient (`immunite: 'speciale'` ; `'physique'` pour l'inverse), Attaque
     en hausse à chaque bloc cassé (`boost: 2`).
   - Courage : une grande salle en croix, couloirs de cinq cases. L'interrupteur du bas ouvre la grille de gauche
     5 secondes ; avant elle, côté centre, une dresseuse attaque au passage (`embuscade`) ; l'interrupteur du bout
     rouvre la gauche et ouvre la droite 4 secondes ; avant la droite, des caisses à pousser (au moins 8 poussées,
     un PC dans le mur du couloir d'entrée les remet en place) ; l'interrupteur de droite ouvre la grille du haut.
     Chaque grille ferme tout le couloir. Coincé derrière une grille refermée, sans interrupteur ni sortie à portée :
     retour à l'entrée de la salle, tout est à refaire (la dernière grille passée, on est passé). Chaque interrupteur
     dit quelles grilles il ouvre (`ouvre`) et combien de temps (`duree`).
4. **Salles des Codes**, la même grande salle pour chacun, dans le noir (`sombre: true`, Flash n'y fait rien),
   le coffre qui brille au centre : cinq gardiens (un deuxième parchemin), un coffre qui s'ouvre avec ses
   deux nombres (dans un sens ou dans l'autre) et donne l'ordre du code, par exemple « Force, Force, Courage,
   Courage » : le code à huit chiffres de la grande porte est fait des nombres des deux autres chemins, à se dire
   à l'oral. Codes et ordres sont tirés au sort à chaque descente par l'hôte (`preparer` du donjon) ; des quatre
   combinaisons, une seule ouvre. Les gardiens guettent (`vue`) et viennent défier qui passe devant eux ; la sortie
   s'ouvre avec la grande porte (`ouvertPar: 'porte'`).
5. **Couloir des Sentinelles** : trois sentinelles sur les flancs, à affronter l'une après l'autre, chacune à trois contre trois
   (salle `type: 'groupe'`, `pnj` dans l'ordre). Le dresseur garde trois Pokémon en jeu et remplace ceux qui tombent
   par ceux de sa réserve (neuf chacune) ; chaque joueur choisit le Pokémon qu'il vise après son attaque, les autres
   adversaires et les équipiers sont dans les encadrés. Pas de soin entre deux sentinelles. En mode test, seul, on
   envoie ses trois premiers Pokémon (un joueur peut tenir plusieurs places : `places` dans `Groupe`).
6. **Cœur du Sanctuaire** : le Gardien des Trois Voies (Mew), à trois contre un, cinq blocs. Premier bloc brisé :
   toutes ses stats montent et des pièges de roc blessent chaque Pokémon qui entre ; deuxième : Attaque et Attaque
   Spéciale des Pokémon en jeu baissées de deux crans et un Pokémon K.O. ; troisième et quatrième : un autre K.O.,
   jamais deux fois le même joueur. Son Soin rend deux blocs. Récompenses : la CT Abri et la Relique de Triforce.

Un combat à plusieurs (`raid`, ou `groupe` : moteur `js/combat/groupe.js`, autant de Pokémon adverses en jeu que de
joueurs, `places` pour en fixer le nombre) se lance quand tous les joueurs présents sur la carte de sa salle sont prêts : il peut
y en avoir plusieurs dans un donjon, et seul celui de la dernière salle termine le donjon.

### La Pyramide de l'Ascension

`js/donjons/pyramide.js` (salles), `js/donjon/pyramide.js` (mécaniques), à 3 ou 4 joueurs, équipe de niveau 35. Rien
ne soigne en montant sauf la fontaine ; perdre un combat, n'importe où, ramène dehors (`elimine`). Les objets de soin
du Sac (poches Soins et Baies) sont mis de côté en entrant et rendus en sortant ; ce qu'on trouve dedans y reste.

1. **Salle des Dalles** : quatre dalles, autant de joueurs que présents (3 ou 4).
2. et 3. **Étages** (`type: 'etage'`) : dresseurs seuls et duos (`duo: true`), certains seulement à 3 ou à 4 joueurs
   (`pour: 3` / `pour: 4`). Un duo se combat à deux joueurs (moteur `js/combat/groupe.js`, deux Pokémon adverses en
   jeu) : le premier appelle, les autres joueurs de la salle sont prévenus, le premier qui répond fait équipe.
   Objets de soin au sol partagés (`type: 'soin'` : le premier qui le prend l'a). Tous les dresseurs battus, l'escalier
   apparaît sur un des emplacements `E` (3 puis 4), tiré par l'hôte à chaque ascension (`preparer`).
4. **Salle de la Fontaine** : la fontaine soigne l'équipe et efface les objets de soin du Sac ; quatre portes, une par
   joueur (`porteP`, actions `voie` comme les Trois Voies).
5. à 7. **Grottes** : trois par porte, chacun les siennes : deux dresseurs par grotte, objets (chacun les siens),
   Pokémon sauvages rares (`rencontres`, `taux`) qu'on ne peut pas fuir.
8. **Arènes** (`type: 'arene'`, `portes` : les lettres des portes qui y mènent) : les portes I et II mènent au Levant,
   III et IV au Couchant. Quand les joueurs attendus parlent au juge, l'hôte lance le duel : combat entre joueurs
   d'Odyssée, équipes telles quelles. Le perdant redescend, le gagnant est soigné et monte. Seul dans son arène (à 3,
   ou si personne d'autre n'est venu par ses portes) : le reflet de l'équipe d'un joueur de l'autre arène, à PV
   pleins. L'adversaire prévu a perdu en route : c'est son reflet qui le remplace (l'hôte garde son équipe).
9. **Sommet** (`type: 'sommet'`, `couchant: true` : soleil couchant) : quand les deux arènes ont rendu leur verdict,
   duel entre les gagnants. Le vainqueur reçoit le Symbole d'Or ; tous deux redescendent. Seul gagnant : le sommet
   est à lui.

Les déconnexions en cours d'ascension ne sont pas encore gérées (un joueur parti compte comme éliminé).

### La Mine Effondrée

`js/donjons/mine.js` (plans), `js/donjon/mine.js` (mécaniques), de 2 à 4 joueurs, équipe de niveau 35. Au carreau,
un joueur prend le poste de contrôle (`type: 'poste'`, un seul à la fois, action `poste`) : il voit le plan du niveau
en direct (galeries, barrières, cages, ses coéquipiers), ouvre et ferme les barrières (`type: 'barriere'`, `lien` :
aiguillage qui referme l'autre), et envoie la cage d'un niveau au suivant (`cageVers`). Il ne voit ni les dresseurs
ni les plafonds fissurés (`~`) : passer dessous coûte un cinquième des PV de chaque Pokémon, fait reculer d'un pas et
bouche la galerie pour tout le monde. Les niveaux sont générés par `niveau()` (grille de salles reliées par des
galeries : libre, barrée ou fissurée) ; les tests vérifient qu'il existe toujours un réglage de barrières qui mène à la
cage sans passer sous une fissure. Au fond, le joueur du poste descend et tout le monde affronte Galeking.

### Le Train Fantôme

`js/donjons/train.js` (voitures), `js/donjon/train.js` (mécaniques), en groupe, équipe de niveau 35. Les dalles de la
voiture de queue font partir le train ; l'hôte tient l'horloge (`horloge` : une gare toutes les 3 minutes, terminus à
16), affichée en haut de l'écran. À chaque gare, les voitures de `decroche` se décrochent : qui y est encore saute
sur la voie ferrée (Pokémon sauvages) et remonte par le marchepied dans la dernière voiture accrochée ; la porte
arrière de celle-ci est condamnée. En route : dresseurs qui guettent, voiture-restaurant (soin complet contre
30 secondes d'attente), voiture verrouillée (`requisMax: 2` : deux joueurs sur les dalles, un seul s'il est seul),
fourgon à bagages (caisses à pousser, `caisses: true`, un PC les remet en place). Le Contrôleur Fantôme attend dans
la locomotive ; au terminus sans victoire, tout le monde se retrouve sur le quai.

### Le Temple des Éléments

`js/donjons/temple.js` (salles), `js/donjon/temple.js` (mécaniques), à faire deux fois avec les mêmes salles. Salle des
Dalles commune : trois joueurs sur les trois dalles ouvrent la petite porte (le temple à trois, niveaux 20 à 30) ; un
joueur qui a un Pokémon au niveau 40 sur la dalle d'or ouvre la grande porte pour lui seul (`grandePorte`, refermée
dès qu'il l'a passée : le temple en solo, niveaux 50 à 60). Chaque salle a sa `branche` (`groupe` ou `solo`) ; l'encadré
ne montre que celles de la branche où l'on est.

- À trois : Salle des Trois Portes (`voies`, une personne par porte), un chemin par joueur, une clé au bout
  (`cle:<joueur>` dans la salle du chemin), Salle des Clés (porte aux trois gemmes, `ins:f`, `ins:e`, `ins:p`, puis
  `porte`), Gardien à trois contre trois (salle `groupe`), et la table : trois Poké Balls. Chacun choisit
  (`choixStarter`) ; quand tous les présents ont choisi, l'hôte attribue les choix uniques et départage deux joueurs
  qui veulent la même par un duel entre joueurs, Pokémon soignés (`resoudreStarters`, `starterDuelFin` : le perdant
  repose sa Poké Ball et ne peut plus la reprendre). À trois sur la même, le gagnant affronte le troisième.
- En solo : mêmes salles, portes sans limite (`porteSolo`), un téléporteur dans la Salle des Clés ramène aux trois
  portes ; derrière le Gardien, une table encore vide (sa récompense viendra plus tard).
- Les chemins ne sont pour l'instant que des couloirs à leur élément (lave, eau, herbes hautes : objets `tuile`).

### Les formes du Temple

`js/formes.js` (sans DOM) : des versions alternatives de Pokémon connus, d'un autre type. Pour l'instant, les trois
petits starters de Kanto (numéros 2010, 2013, 2016 : l'eau devient feu, le feu plante, la plante eau ; pas encore
d'évolutions) et l'Arceus du Gardien (2023). Les attaques du type d'origine deviennent des attaques du nouveau type, de
même catégorie et de puissance voisine (`forme`). Leurs images (face, dos, icône, dans `img/temple/`) partent des
sprites HeartGold / SoulSilver, retouchés pour changer la matière et la forme (carapace de basalte et queue de feu,
feuille et pousse, coquillage à la place du bulbe). Les évolutions finales ne se montrent pas en dehors du jeu :
l'auteur veut les découvrir en jouant.

### Le mode test

Menu MODE TEST (ou `?test` dans l'adresse) : les dalles s'ouvrent avec un seul joueur, toutes les portes des voies
s'ouvrent, ALLER À UNE SALLE mène dans n'importe quelle salle du donjon, chaque combat propose d'être passé (compté
comme gagné), et le journal du Sanctuaire donne tous les nombres et le code de la grande porte.

### Pokémon et objets exclusifs

Dans `js/contenu.js` : une espèce (numéro à partir de 2001, son image dans `img/`) ou un objet (son icône dans `img/`).

## L'île privée

`js/ile/modele.js` (sans DOM : forme de l'île, catalogue, trophées, règles de pose, construction de la carte) et
`js/ile/jeu.js` (dans le jeu). Chaque joueur a son île, la même forme pour tout le monde (plaine et plage). Dans le
labo, elle est gardée dans ce navigateur, sous le nom du joueur (`testodyssee-ile:<nom>`) : on la retrouve d'une
session à l'autre. On y va par « Mon île » dans la liste des lieux ; le capitaine du ponton ramène au choix des lieux.

- La donnée : `{ nom, biome, fixes: { maison, mairie, musee }, travaux: [{ a, x, y }], donjons, musee }`. La carte est
  reconstruite à partir d'elle à chaque visite et après chaque changement (format des retouches d'Odyssée, comme le
  Domaine).
- Mode construction (menu CONSTRUIRE sur l'île, ou l'adjointe de la mairie) : on survole l'île, on pose case par case
  ce qu'on a choisi dans le catalogue (Nature, Mobilier, Bâtiments, Sols, Trophées), on déplace (la maison, la mairie
  et le musée aussi) ou on range. Tout est gratuit pendant les tests. Règles (`posable`) : seulement sur l'herbe,
  pas sur un autre objet, le débarcadère libre, et toujours un chemin du ponton aux portes de la maison, de la mairie
  et du musée.
- Trophées : une statue par badge de la partie et par donjon du labo fini (`trophee` du donjon, à la remise des
  récompenses), chacune avec son `origine` (« En récompense pour avoir… »), lue en s'approchant de la statue ou dans la
  liste de la mairie. Un seul exemplaire : posée sur l'île, au musée, ou en attente.
- Musée : une deuxième zone de construction (`zone: 'musee'`, `ile.musee.travaux`), des salles en enfilade qui
  s'ouvrent au fil des trophées (`sallesMusee` : une de plus tous les quatre, quatre au plus). Chaque article dit où il
  se pose (`zones`) ; les passages entre salles et l'entrée restent libres.
- Décors de plusieurs cases : `couvre` (cases prises autour de la case posée) et `passe` (celles où l'on marche quand
  même : le portique torii, deux poteaux et un passage).
- Mairie : l'adjointe ouvre le mode construction, liste les trophées, renomme l'île, la remet à zéro (les trophées,
  les points, le stock et les salles d'entraînement restent ; ce qui était posé retourne au stock).

- Dispositions (l'adjointe) : jusqu'à six arrangements gardés (`enregistrerDisposition` : bâtiments, objets posés,
  musée). En remettre un (`chargerDisposition`) range d'abord ce qui est posé (les pièges, statues et gardes reviennent
  au stock), puis pose la disposition ; ce qui manque au stock, ou un trophée verrouillé, reste de côté. Avant une
  remise à zéro, l'adjointe propose de garder l'île actuelle.
- Mairie à étages (`etagesMairie`) : l'escalier du rez-de-chaussée monte aux archives, puis au dernier étage, la base
  secrète, avec le coffre-fort (points d'usine et objets du Sac mis à l'abri, `ile.coffre`) et le drapeau de l'île. Ce
  qu'on pourra y voler viendra avec les visites.

### Borne d'arcade, usine à pièges, caserne

`js/ile/usine.js` (sans DOM : pièges, statues piégées, gardes, prix, stock), `js/ile/casse-briques.js` (la borne).
Dans la donnée de l'île : `points`, `stock { article: nombre }`, `statues { 'st:dialga': niveau }`, `plans`, `voirPieges`.

- La borne d'arcade (Loisirs) : un casse-briques. Une brique = 1 point d'usine, un mur fini = 15 de plus
  (`pointsPartie`). En mode test, elle donne aussi 500 points d'un coup. Plus tard, elle ira au casino.
- L'usine à pièges et la caserne (Bâtiments, un exemplaire chacune, `lieu`) : leur porte compte dans la règle du chemin.
  À l'usine, la contremaîtresse vend les pièges et les statues piégées (et les fait monter de 5 niveaux, de 20 à 70) ;
  à la caserne, le recruteur engage les gardes (une spécialité de plus par badge, niveau d'après les badges :
  `typesOuverts`, `niveauGarde`, `equipeGarde`).
- Pièges (`PIEGES`) : trou, éboulement, brume, colle, alarme, renvoi, dégâts I à III (10, 30, 50 % des PV du premier
  Pokémon, jamais K.O.), piège de combat. On marche dessus ; ils ne se dessinent que pendant la construction ou si le
  propriétaire les montre (bouton « 👁 Pièges » en bas à droite, cachés par défaut).
- Défenses : statues de Dialga et de Palkia (boss à trois blocs, joué sur place) et gardes. Les deux regardent dans une
  direction (`dir`, bouton « ↻ Regard » ou touche R pendant la construction) et voient `VUE` cases droit devant. Le garde
  de combat ne guette pas : il vient quand un piège de combat (ou une alarme) de sa salle se déclenche.
- Sur l'île, un piège, une statue ou un garde sort du stock quand on le pose et y revient quand on le range. Rien ne
  se déclenche jamais sur le propriétaire.
- Salles d'entraînement (le technicien de l'usine) : des parcours de une à cinq salles de 15 × 10 cases
  (`construireSalle`, carte `labo:ile:salle`), entrée en bas, escalier en haut (`salleRelie` garde le chemin). On y pose
  tout ce qui est débloqué sans rien dépenser (zone `salle:<parcours>:<salle>`). « Essayer en intrus » : là seulement,
  pièges, statues et gardes se déclenchent sur le propriétaire (`essai`, Pokémon soignés avant et après, un combat
  perdu arrête l'essai). Une salle se colle d'un bloc sur l'île depuis le catalogue du mode construction (`collable`,
  `coller`) : il faut son stock, et les chemins restent libres.

## Ajouter un nouveau type de salle

1. Une règle dans `appliquer()` de `js/donjon/etat.js`, avec ses tests dans `tools/test-testodyssee.mjs`.
2. Ce que voit le joueur dans `js/donjon/jeu.js` (dialogue d'un PNJ, ou vérification à chaque image comme les dalles,
   décidée par l'hôte).

## Passer un lieu dans Odyssée

La carte construite par `plan.js` est une carte d'Odyssée ordinaire (`GameMap`). Pour l'intégrer : l'ajouter dans
`odyssee/js/world/` (comme les lieux de `quetes.js`), poser une entrée sur la grande carte, et brancher les règles du
groupe dans `odyssee/js/net/`.
