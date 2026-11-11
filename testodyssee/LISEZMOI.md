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

### Le site du fork

Sur le fork de Lucas, chaque push sur `feat/testodyssee` publie un site léger (le Hub, Odyssée et le labo, sans les
autres jeux) : `.github/workflows/site-labo.yml`, qui assemble le site avec `tools/site-labo.sh`. Réglage du fork :
Settings → Pages → Source : « GitHub Actions ». Ce fichier d'action ne tourne que sur le fork : à ne pas envoyer
dans le dépôt d'Amiel.

## Faire un donjon

Dans les donjons (toute carte qui a un `donjon`), l'ambiance des grottes d'Odyssée (chauves-souris, cristaux qui scintillent,
poussière, gouttes : `AmbianceGrotte` de `odyssee/js/vie.js`) est coupée par `TestGame` (`js/jeu.js`).

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
`mur: true` : l'objet est accroché au mur (sa lettre prend la place d'un `#`, la case reste un mur) ; il se lit en
faisant face au mur, et une affiche encadrée est dessinée sur la face du mur (`affiche` : son texte, pour mémoire).

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

`cle` du donjon : un objet du Sac qui ouvre la porte de l'extérieur. En y entrant, on propose de l'ouvrir avec la clé
(`textes.porteCle`) ; sans la clé, `textes.porteFermee`. Une fois ouverte, elle le reste. `sol` d'une
salle : la tuile de son sol, si elle doit différer de celle du style (`sol_reflet`, tuiles du labo dans `js/rendu.js`).

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

Seul, niveau 35, six salles séparées. La porte s'ouvre avec la Clé des Miroirs (`cle-miroirs`, dans le Sac
de toutes les équipes du labo) :

0. **Salle du Secret** (`s0`, même taille que l'Énigme) : un seul miroir (`miroirSecret`), qui pose une devinette
   (« Je n'existe que si tu me gardes, et je disparais dès que tu me dis. Qui suis-je ? »). On tape la réponse au
   clavier ; « secret » et « silence » sont acceptés (`reponses`), sans tenir compte des majuscules, des accents, d'un
   article au début ni d'un « s » final, et à une faute de frappe près pour les mots de 6 lettres ou plus
   (`reponseJuste` de `casse-tetes.js`, vérifié par les tests). Mauvaise réponse : pas de pénalité, le miroir reste.
1. **Énigme** : le panneau au centre montre une horloge vue dans un miroir (3 h 40) et les trois réponses, avec une
   flèche vers leur miroir (`<-` gauche, `↑` milieu, `->` droite). Le bon miroir (gauche, 8 h 20) s'efface et
   découvre le passage ; les deux autres se brisent (« Le miroir se brise. ») et font tomber l'équipe à la moitié de ses PV.
1 bis. **Salle des Cinq Miroirs** (`s1b`, au moins deux fois la surface de l'Énigme) : cinq miroirs au cadre de
   couleur, de gauche à droite jaune, rouge, bleu, noir, vert (`miroir_mur_<couleur>`, le miroir d'origine recoloré).
   Le panneau (`enigmes.couleurs`) donne trois indices : pas au bord, aucun voisin rouge, pas la couleur du feu. Seul
   le noir convient (vérifié par les tests) et découvre le passage. Un mauvais miroir se brise (« Le miroir se brise. »,
   sans autre message) et chaque Pokémon perd un quart de ses PV, jamais K.O. (`penalite: 'quart'` de la salle). La salle
   est assez courte pour voir les cinq miroirs depuis le panneau.
2. **Galerie de Glace** (40 × 27 de glace) : à l'entrée, un plateau de 7 × 4 cases et trois rangées sans glace sous la
   zone glissante ; un PC d'aide sur le plateau, qui ne propose que de simplifier la salle. Cinq petits miroirs sur la glace. Trois sont des miroirs de poche (dans le
   journal), deux sont piégés et envoient une copie du premier Pokémon encore debout de l'équipe. Les copies (miroirs
   piégés, Copycat) gardent l'objet de l'original : pas de gemme ajoutée, Méga seulement si l'original tient la sienne
   (`copie: true` du combat).
4. **Salle du Brasier** (huit rangées vides à l'entrée : le brasier est au centre) : pas de rencontres au hasard ; tant
   que le brasier est éteint, cinq Funécire et deux Sorbébé se promènent dans la salle (`errants`, images de face
   dessinées dans le décor), toujours ce nombre : s'approcher de l'un d'eux lance le combat, et il revient ailleurs
   quelques secondes plus tard, loin du joueur. Chaque Funécire battu laisse un Feu Follet ; on les jette un par un (un
   texte par stade du brasier), 5 l'allument et les Pokémon disparaissent. Un Pokémon Glace battu donne une Eau Fraîche, et éteint le brasier s'il n'a pas ses
   5 feux. Puis on tourne les miroirs sur pied et on pose les 3 miroirs de poche sur les bons socles (une seule
   solution, 5 miroirs à tourner) jusqu'à éclairer les deux soleils : la grande porte s'ouvre.
5. **Salle du Reflet** (vue de plus haut, sol bleu pâle sous les murs blancs) : le grand miroir est une vitre blanche debout, deux fois plus haute
   que les murs, d'un seul tenant, sans cadre, sur la ligne du milieu (`dessinerMiroir`), purement visuelle ; collé à lui, le joueur y voit son reflet (son personnage, retourné, à
   demi transparent). Copycat refait chaque pas en miroir (gauche et droite pareil, haut et bas
   inversés), chacun de son côté de la ligne du milieu, dans un grand labyrinthe (65 pas au mieux). Arrivé à côté de
   lui, on affronte sans un mot une copie soignée de toute sa propre équipe. Le menu (ou l'affiche encadrée sur le mur juste en face de
   l'entrée) ramène au début de la salle.

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
   - Sagesse : cinq statues, certaines mentent toujours ; on désigne chacune (vraie, menteuse, ou pas encore), sans
     punition ; la porte s'ouvre quand toutes sont bien désignées (une seule solution, vérifiée par les tests).
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
   Pokémon sauvages rares (`rencontres`, `taux`) qu'on ne peut pas fuir. Les trois plans (56 × 40 cases,
   `js/donjons/pyramide-grottes.js`) sont dessinés par `python3 tools/pyramide-grottes.py [graine]` (ne pas les
   modifier à la main) : cavités reliées par des galeries qui tournent, boucles, culs-de-sac et tunnels avec un objet
   au fond, un rebord `v` qu'on ne passe qu'en descendant (raccourci vers le bas), `1` et `2` les deux dresseurs.
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
  portes ; derrière le Gardien, trois CT à usage unique, dont on ne prend qu'une (`cts`, `ctsChoix` : `fin` pour
  Éruption, Giclédo et Jaillissève ; `tot`, si le donjon arrive plus tôt dans le jeu, pour Surchauffe, Lame de Fond et
  Tempête Verte). Chacune ne s'apprend qu'à un starter du même type que l'attaque (`STARTERS` de `contenu.js` : ceux
  des jeux officiels, des formes du Temple avec leur nouveau type, et d'Odyssée, avec toute leur lignée), même s'il ne
  l'apprend pas d'habitude. Ces attaques, un Pokémon qui ne les apprend pas par niveau ne les apprend qu'avec cette CT
  (`refusCt` : toute autre CT les lui refuse).
- En solo, les chemins ne sont pour l'instant que des couloirs à leur élément (lave, eau, herbes hautes : objets `tuile`).

À trois, chaque chemin a trois grandes salles (60 × 44 cases, `F1`… `P3` dans `js/donjons/temple-chemins.js`), dessinées
par `python3 tools/temple-chemins.py [graine]` (ne pas modifier le fichier à la main) : des cavités reliées par des
galeries qui tournent, des boucles et des culs-de-sac avec un objet au fond, la sortie loin de l'arrivée. Le chemin
principal est coupé par des obstacles, et le générateur vérifie que la sortie n'est pas atteignable sans eux :
- Feu : un bouton (`*` ou `^`) sur lequel pousser un rocher `B` avec Force, qui abaisse les barrières `+` ou `-`
  (`rocherTemple`), et un rocher fissuré `m` (Éclate-Roc). Lacs de lave traversés par des ponts `=`, coulées, roches.
- Eau : des cascades `|` à remonter en surfant (Cascade) vers les cavités du haut, et des boutons.
- Plante : de petits arbres `C` à couper, dans une jungle d'arbres `Y`, de broussailles `u`, d'herbes `h` et `"`, de
  fleurs `f` et de lianes `w`.
Objets : `I` Rappel Max, `J` Guérison, `O` Super Bonbon, `P` PP Plus, `V` trois Hyper Balls ; `K` la clé (troisième salle).
En revenant dans une salle, rochers, pierres et arbres reprennent leur place (`remiseTemple`) : rien n'y reste coincé ;
les barrières déjà abaissées le restent. Chaque salle a sa roche (`biome` : `magma`, `mer`, `terre`) et ses Pokémon
sauvages (`SAUVAGES_TEMPLE`, niveaux 20 à 28). La capacité Cascade du labo (`js/cascade.js`) remonte les cascades en surfant.

### Les formes du Temple

`js/formes.js` (sans DOM) : des versions alternatives de Pokémon connus, d'un autre type : les lignées des starters de
Kanto (numéros 2010 à 2018 : l'eau devient feu, le feu plante, la plante eau ; évolutions aux mêmes niveaux) et
l'Arceus du Gardien (2023). Les attaques du type d'origine deviennent des attaques du nouveau type, de même catégorie
et de puissance voisine (`forme`). Leurs images (`img/temple/temple-<nom>-f.png`, `-b`, `-i`) viennent des dessins de
l'auteur, réduits en sprites de 80 × 80 (fond retiré, palette limitée, trait sombre ; un dessin déjà en pixel art est
repris case par case). Pas encore de dos dessiné : le dos est la face retournée. Les évolutions finales ne se montrent
pas en dehors du jeu : l'auteur veut les découvrir en jouant.

### Attaques du labo

Dans `contenu.js` (`ATTAQUES`) : Jaillissève (Plante, le pendant d'Éruption et de Giclédo) et Lame de Fond (Eau, le
pendant de Surchauffe et de Tempête Verte). Dans le labo, Éruption, Giclédo et Jaillissève perdent de la force avec les
PV du lanceur (150 × PV / PV max), comme dans les jeux.

### Règles de combat du labo

`js/combat/regles.js`, branché par `installerContenu` : le moteur de combat d'Odyssée n'est pas modifié, le labo
enveloppe ses méthodes (seule la page du labo charge ce fichier). Ce qui s'ajoute :

- attaques : Piège de Roc, Provoc, Sabotage (fait tomber l'objet, rendu après le combat), Demi-Tour (et Change Éclair :
  le joueur choisit qui entre, puis le tour continue ; l'adversaire change tout seul), Cradovague, Clonage, Tacle Lourd,
  Tour Rapide, Nœud Herbe, Malédiction, Vœu, Aromathérapie, Coup Bas, Atterrissage, Éclat Magique, Gyroballe,
  Vent Arrière, Bouclier Royal, Draco Météore, Surf, Poursuite, Prélèvem. Destin, et les effets d'Acrobatie, Choc Psy
  et Lame Sainte ;
- talents : Peau Féérique, Protéen, Déclic Tactique (Forme Assaut d'Exagide), Délestage, Griffe Dure, Corps Maudit,
  Infiltration, Cœur Noble, Miroir Magik ; une Méga prend le talent de sa forme Méga même si la forme de base en a un donné ;
- objets : Veste de Combat, Bouton Fuite, Vulné-Assurance, Lumargile, Orbe Toxique, Roche Humide, Ceinture Pro, et le
  verrou des objets Choix ;
- Puissance Cachée fixée : `m.pc = { t: 'electric', p: 60 }` donne le type et la puissance sans tenir compte des IV.

Les formes de combat (Protéen, Forme Assaut) sont des espèces cachées (`forme` de `regles.js`, n° 40000 et plus), comme les
Méga : l'image reste celle de l'espèce (`visuel`). Les changements de Pokémon en plein tour ne jouent que dans le combat
ordinaire (pas dans les duels entre joueurs ni les combats à plusieurs). Tests : `tools/test-testodyssee.mjs`.

### La Place des Champions

`js/donjons/champions.js`, équipes dans `js/champions.js`. Les 23 champions alignés dans l'ordre : les 18 champions
d'arène (Insecte, Poison, Normal, Plante, Roche, Glace, Électrik, Psy, Combat, Ténèbres, Vol, Spectre, Feu, Sol, Fée,
Acier, Dragon, Eau), le Conseil 4 et le Maître. On parle à un champion pour l'affronter : tout le monde au niveau 100,
IV à 31, soin complet sans message après le combat (objets tenus compris). Un champion sans équipe (`equipe: null`)
dit que son équipe n'est pas prête. L'organisatrice prête l'équipe « fin de jeu » au niveau 100 (`fin100` de
`equipes.js`) ou celle d'un champion. Une équipe : `P(espèce, objet, talent, nature, EV, attaques, { pc, shiny })`.

### Les arènes (prototypes)

Arènes solo, sans transition entre les salles : `js/donjons/arene-insecte.js` et `js/donjons/arene-poison.js`. Règles
sans écran dans `js/donjon/arene-regles.js`, partie dans `js/donjon/arenes.js`. Les cases spéciales sont des objets du
plan (`type`) ; l'état de chaque salle est dans `state.arenes[carte]`, les cases changées dans `state.tiles` ; en
entrant dans l'arène depuis ailleurs, tout reprend comme au début. Le sol de chaque case est dessiné par `m.solArene`
(tuiles de `rendu.js`, ou une tuile d'Odyssée comme `dec_fosse`).

- Arène Insecte, « La Canopée » : la Fourmilière (colonnes de fourmis : flèches d'Odyssée, sens normal depuis le bout
  le plus haut, `inverses` de la salle ; pots de phéromones qui inversent deux colonnes ; cocon à pousser dans un puits ;
  galerie qui s'effondre derrière soi ; PC de remise), la Grande Toile (fils au-dessus du vide, rosée qui glisse, nœuds
  collants, deux leviers, fils de traction, l'araignée qui avance d'une case à chaque pas et ramène au bord de la toile ;
  une chute renvoie dans la Fourmilière, `chute`), la Mue (le soleil le jour, les lucioles la nuit, fleurs-miroirs,
  papillons posés le jour, trois chrysalides, puis la haie de Hector s'ouvre).
- Arène Poison : le Sas de décontamination (quatre douches dans l'ordre de `sas`, trois indices sur le panneau), le
  Marais toxique (jauge de souffle de 12 en haut de l'écran ; vase 1, vase profonde 2 et plus lente, bulles qui crachent 3,
  traînée de Grotadmorv +2, lys qui remplissent ; trois vannes qui vident une zone et en remplissent une autre ; jauge
  vide : retour au dernier lys).

Les tests résolvent chaque salle (recherche en largeur sur tout l'état : position, pots, cocon, galerie ; leviers ;
jour, fleurs et chrysalides ; souffle et vannes) et vérifient qu'on ne passe pas sans la mécanique de la salle. Les
champions et leurs équipes d'arène sont ceux d'Odyssée en attendant les vraies.

### Fonderie aux Plaques

De 2 à 4 joueurs, niveau 60, équipe « fin ». Des plaques de pression (`type: 'plaque'`, `groupes`) lèvent les grilles
(`type: 'grille'`, `groupe`) de leur couleur tant qu'un joueur est dessus ; les groupes sont dans `plaques` du donjon
(`couleur`, `requis` : plaques à tenir en même temps, `garde` : reste levé une fois enclenché). L'hôte regarde quatre fois
par seconde où sont les joueurs et range les groupes ouverts dans les données de la salle (`ouvertes`, `gardes`) ; une
grille ne se referme jamais sur un joueur. Règles sans écran : `js/donjon/plaques.js` ; les tests vérifient que chaque
salle à plaques se traverse à deux et pas seul (`traversable`).
1. **Vestiaire** : dalles (au moins 2 joueurs).
2. **Le Relais** : chacun tient la grille de l'autre, à tour de rôle.
3. **La Balance** : la plaque jaune demande deux joueurs à la fois et son treuil reste levé ; deux dresseurs, puis un relais.
4. **La Chaîne** : les plaques du milieu lèvent deux grilles, on avance à saute-mouton.
5. **Le Creuset** : le chemin se sépare, chaque côté tient la grille de l'autre ; deux dresseurs.
6. **Salle des Moules** : dalles dans quatre recoins, chacun dans un moule.
7. **Haut-Fourneau** : Vulcain, Maître de Forge, et son Heatran, en combat à blocs.

Mode test : une plaque suffit et tout ce qui s'ouvre reste ouvert, pour traverser seul.

### Bastion du Cristal

De 2 à 4 joueurs, niveau 60. Deux salles `defense` : on touche le cristal (`type: 'cristal'`), et les pillards
(`ennemis` du donjon : éclaireurs rapides, rôdeurs, colosses lents qui frappent fort) arrivent par vagues (`vagues` de la
salle, nombres par joueur présent) par les entrées (`type: 'entree'`) et marchent vers le cristal par le plus court
chemin. Un pillard qui passe à côté d'un joueur libre l'engage : il s'arrête et le combat se joue chez ce joueur ; battu,
il disparaît, sinon il repart et le joueur revient à l'entrée de la cour, soigné. Arrivé au cristal, il le frappe
(`degats`). Le cristal à zéro : tout recommence à la première vague. L'hôte fait avancer la défense toutes les
demi-secondes et l'envoie à tous (`djDef`), les issues des combats lui reviennent (`djDefA`). Règles sans écran :
`js/donjon/defense.js`, vérifiées par les tests (sans défenseur le cristal tombe, bien gardé il tient). Une infirmière
(`type: 'soin'`) soigne, entre deux vagues seulement dans les cours.
1. **Poste de garde** : dalles. 2. **Les Remparts** : deux pillards. 3. **La Cour du Cristal** : trois vagues, six entrées.
4. **L'Infirmerie**. 5. **La Tour de Guet** : trois guetteurs. 6. **Le Grand Siège** : trois vagues, huit entrées, des
colosses. 7. **Salle du Trône** : le capitaine Grenat et son Tyranocif, en combat à blocs.

Seul en mode test, les vagues sont à la taille d'un joueur.

### Le mode test

Options du menu, gardées dans le navigateur, partout dans le labo : SAUVAGES : NON coupe les Pokémon sauvages (herbes,
grottes, eau, et les rencontres des donjons : Pokémon qui se promènent au brasier, grottes de la Pyramide, galeries de la Mine) ; TRAVERSER LES MURS
laisse marcher sur toute case de la carte.

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

### Les Routes Victoire

`tools/routes-victoire.py` recopie les Routes Victoire de Vert Feuille, d'Émeraude et de Platine case par case depuis
les décompilations pret (`python3 tools/routes-victoire.py chemin/pokefirered chemin/pokeemerald chemin/pokeplatinum chemin/pokeheartgold` ;
pour Platine, les cases et leurs permissions viennent de `res/field/maps/data`) et écrit
`js/rv/donnees.js` (ne pas le modifier à la main) : sol, murs, hauteurs, rebords, eau, cascades, échelles, dresseurs
(équipes, attaques, objets tenus, valeurs cachées), objets, objets cachés, rochers, rochers fissurés, boutons et
barrières, trous, rencontres. Les textes des dresseurs sont traduits à la main dans `js/rv/textes.js`.
`js/rv/routes.js` bâtit les cartes (chaque route seule, puis la fusion où la sortie d'une route mène à l'entrée de la
suivante, dans l'ordre de `ROUTES`), `js/rv/jeu.js` ajoute les règles de la troisième génération : hauteurs (on change
de niveau par une case de passage, hauteur 0, ou un pont, hauteur 15), cases fermées au nord, rocher qui tombe dans un
trou, bouton qui ouvre une barrière, cascade qu'on descend seulement ; et de la quatrième (Platine) : on monte sur un
pont par ses bouts (`p`), on ne le quitte que par eux, on passe dessous ; la paroi d'Escalade (`e`) se gravit tout droit.
Au 2F de Platine, deux objets restent dans des recoins qu'on ne rejoint pas encore. HeartGold n'a pas de plan dans sa
décompilation : ses étages sont recopiés à la main dans `tools/rv-heartgold.txt` (d'après des images prises en
perspective, donc à une case ou deux près), et ses événements (échelles, objets, rochers, Silver) viennent de
pokeheartgold. La fusion suit l'ordre des jeux : Vert Feuille, HeartGold, Émeraude, Platine.

### Le Tombeau du Roi Sans Nom

Un donjon solo d'infiltration (`js/donjons/tombeau.js`, mécaniques `js/donjon/tombeau.js`), en style `egypte` (sol de
sable, murs de grès orangé dessinés par `js/rendu.js` et ajoutés à l'atlas d'Odyssée). Les salles sont sombres : une
toile multipliée par-dessus l'image (`eclairerTombeau`) donne une pénombre brun-orangé, éclaircie autour des torches
(`Ϯ`, posées le long des murs du haut par `torches()`), des braseros, des lanternes, du joueur et des moines. `lumiere`
d'une salle : `vive` (la Caverne d'Ali Baba) ou `noire` (le -4).

Dehors, la Vallée des Rois Oubliés : la façade (`entree_tombeau`) et sa porte officielle sont fermées, derrière un
cordon et trois gardiens ; des touristes (`TOURISTES`), des passants (`PASSANTS`). Le ruinemaniac indique l'entrée des
pilleurs, explique qu'il faut le sceptre du roi pour ouvrir sa sépulture, demande qu'on lui rapporte le trésor contre une
récompense, et donne la Clé de Fer (`cle-ruinemaniac`) et la Carte du Tombeau (`carte-tombeau`, du -1 au -4 : liste
`CARTE`). La roche fissurée du bord droit (`porte`, parmi `roches`) se pousse avec Force et laisse place à une échelle
(`trou` dans la salle s1). `devant` : où les moines jettent ceux qu'ils attrapent.

Étages (les salles se relient par des passages `lien` : `vers` la salle, `cible` la marque d'en face ; `porte` : la
porte de fer, ouverte par la Clé de Fer dans les deux sens) :
- -3, Repaire des Brigands (`b3`, la première salle) et ses salles : la Caverne d'Ali Baba (`b4a`), le tripot
  (`b4b`), le dortoir (`b4c`). Les brigands (`brigand`) n'attaquent jamais ; ceux qui ont un `combat` le proposent,
  autant de fois qu'on veut, et soignent après. Ali Baba (`boutique`) vend la liste `boutique` (alibis `desc` et
  répliques `replique` dans `contenu.js`) ; seule la Seringue Somnifère sert.
- Le passage du -4 (`N` du repaire) est bouché par deux brigands (`portier`) : sans le sceptre, ils ne laissent pas
  passer ; avec, il faut les battre l'un après l'autre (`duel` de b3), puis ils remarquent le sceptre, ameutent tout le
  repaire, et on file au -4 (`passe` de b3 : ils ne sont plus là).
- -2, Galeries des Moines (`s2`) et -1, Crypte du Sceptre (`s1`) : plans et rondes générés par
  `node tools/tombeau-gardes.mjs [graine]` (`js/donjons/tombeau-gardes-plans.js`, ne pas le modifier à la main).
  Une ronde (`gardes` de la salle) est une liste de points `[x, y, ...regards]` ; le moine marche de l'un à l'autre
  au rythme de l'horloge (`PAS`, `js/donjons/tombeau-gardes.js`) et regarde devant lui avec sa lanterne
  (`vueGarde` : droit devant, puis une case de chaque côté à partir de la troisième). Qui y passe se fait courir
  dessus et jeter dehors, et le sceptre retourne sur son socle. On endort un moine en lui parlant sans être vu, une
  seringue en poche ; ils se réveillent tous quand on quitte la salle (`dorment`). Le gardien du sceptre (`relique`)
  ne bouge pas et surveille l'entrée de sa chambre : on passe par le couloir de service pour se glisser derrière lui.
  Le générateur et `test-testodyssee.mjs` vérifient (`sansEtreVu`) qu'on traverse sans être vu, à toute heure.
- Le passage (scène des portiers) : ton premier Pokémon force le passage, la voûte s'effondre (`passe` de b3 :
  le passage est muré au -3, un éboulement bouche la sortie du -4).
- -4 à -7 (`p4` à `p7`, `lumiere: 'noire'`) : longues salles des pilleurs de Sable-Noir. Ils n'attaquent que si l'on a le
  sceptre (ils s'en étonnent), sinon ils se moquent. Au -7 (`piege`), passé le milieu de la salle avec le sceptre, le sable
  mouvant : le sous-chef Vipère prend le sceptre et remonte (`vol` de p7 : 1) ; on se débat aux flèches. La sortie du -7
  est fermée par une grille (`¤`). Au -4, devant l'éboulement, le sous-chef se sait pris au piège et défie le joueur ;
  battu, il rend le sceptre et donne la Clé de Sable-Noir (`vol` : 2).
- À partir de là (`apres` des PNJ, des corps et des mourants), au -6 et au -7 les pilleurs se battent contre les
  morts-vivants (`lutteur` contre `lutte`). -8 et -9 (`m8`, `m9`) : l'hécatombe. Les morts-vivants (`mortvivant`, sprite
  `spectrel`) sont des abominations du labo (`ABOMINATIONS` de `contenu.js`, sans capture possible) : ils regardent
  autour d'eux, marchent lentement sur qui passe devant eux, et se combattent comme des Pokémon sauvages. Corps (`ɠ`)
  et mourants (`ɑ`, quelques mots chacun) : des brigands couchés (`gisant_*`).
- -10 (`g10`) : la grande salle, la porte scellée (`Ж`) et le chef Khamsin. Il se lamente, voit le second sceptre,
  attaque ; battu, il laisse le Sceptre Jumeau ; les deux sceptres ouvrent la porte (`ouverte` de g10). La sépulture viendra.

Les salles du -4 au -9 viennent de `python3 tools/tombeau.py [graine]` (`js/donjons/tombeau-salles.js`, ne pas le
modifier à la main). Images :
`python3 tools/tombeau-images.py` (`img/tombeau/`). Le Pendentif Maudit et le Monocle de Vérité (objets de
`contenu.js`, action `artefact` d'`etat.js`) sont gardés pour un autre donjon.

### Le Mont Givrécime

Une montagne enneigée pour l'aventure solo, pas un donjon : ni groupe, ni boss, ni état partagé. Dix grandes salles
(`js/mont/plans.js`, dessinées par `python3 tools/mont.py [graine]`, ne pas modifier à la main), tantôt dehors (pentes,
corniches, sommet : neige, sapins, rochers, herbes enneigées, falaises en plateaux de roche), tantôt dedans (grottes de
glace : stalagmites, lacs à surfer, rochers fissurés, rochers à pousser). Dans chaque salle, des replats ou des cavités
reliés par des sentiers et des galeries qui tournent, des boucles, des culs-de-sac et des tunnels avec un objet au fond,
des rebords qu'on ne passe qu'en descendant (dehors), deux ou trois dresseurs.

Les salles se relient par `LIENS` (`[salle basse, salle haute, sorte, marque]`) : `bord` (sentier qui sort par le bord
de la carte), `bouche` (entrée de grotte dans une falaise, sortie au bord de la grotte), `echelle` (d'une grotte à
l'autre). La même marque (0 à 9, puis a à d) est posée dans les deux salles. Plusieurs chemins mènent au sommet :
`test-testodyssee.mjs` vérifie qu'en retirant n'importe quel lien, il reste atteignable, et que depuis chaque arrivée
on atteint toutes les sorties, les objets et les dresseurs. Pokémon sauvages, objets et dresseurs de chaque salle :
`js/mont/mont.js`. On y entre par la liste du labo, ou `?lieu=mont:0`.

## Passer un lieu dans Odyssée

La carte construite par `plan.js` est une carte d'Odyssée ordinaire (`GameMap`). Pour l'intégrer : l'ajouter dans
`odyssee/js/world/` (comme les lieux de `quetes.js`), poser une entrée sur la grande carte, et brancher les règles du
groupe dans `odyssee/js/net/`.
