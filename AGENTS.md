# Consignes pour les assistants de code (Claude, Codex, Copilot, Cursor, Gemini…) et les contributeurs

Ce dépôt est **Arcadia** (anciennement « Game Hub »), le salon de jeux d'Amiel : un site statique (GitHub Pages, sans étape de build) qui réunit plusieurs
jeux multijoueurs dans le navigateur — Duo Drift, DavidSimulator, Tête de Calcul, Bastion Clash, Outbreak, Fil Rouge, Cyber Kart GP, Convoy Storm, Birdie Party, Mini-Golf Party, Island Rush, Odyssée, TestOdyssée, Mollo !, Site Noir, Mystère Mystère, Dogfight 3D et The Backrooms.

## À chaque modification poussée sur `main` : journal + version

Les joueurs voient les nouveautés dans le Hub (bouton « ✨ Nouveautés »), qui lit `CHANGELOG.md`.
**Toute modification visible par les joueurs doit donc :**

1. **Monter la version** dans `hub/hub.js` : `const VERSION = '3.0';` → `'3.1'` (le Hub est en 3.x depuis le 27 octobre 2026,
   +1 sur le second nombre).
2. **Ajouter une entrée en haut de `CHANGELOG.md`**, juste sous le titre, au format :

   ```markdown
   ## 3.1 — 28 octobre 2026
   - **Nom du jeu** — ce qui change, écrit pour les joueurs (pas pour les développeurs).
     - détail éventuel (sous-liste indentée de deux espaces)
   ```

   - En français, phrases courtes, du point de vue du joueur (« Les échanges se proposent pendant son tour »),
     pas de noms de fichiers ni de fonctions.
   - Une ligne par nouveauté ou correction ; regrouper ce qui concerne le même jeu.
   - La date est celle du jour, en toutes lettres (`28 octobre 2026`).
3. **Mettre le même numéro dans les `?v=` de `index.html` et `apropos.html`** (liens vers `hub/` et `shared/`) : sinon les navigateurs gardent l'ancienne version en cache.
4. **Faire tout ça dans le même commit** que le changement (ou le même push).

Filet de sécurité : si un push sur `main` ne touche pas `CHANGELOG.md`, l'action GitHub
`.github/workflows/changelog.yml` rédige elle-même une entrée à partir des messages de commit
(`tools/changelog-auto.mjs`) et monte la version. Elle est moins bien écrite qu'une entrée faite à la main :
préférer l'écrire soi-même. Pour qu'elle soit lisible, écrire des messages de commit clairs, par exemple
`feat(calcul): mode Éclair` ou `fix(david): la caméra qui suit ne se désactive plus`
(portées reconnues : `drift`, `david`, `calcul`, `bastion`, `outbreak`, `filrouge`, `kart`, `convoy`, `golf`, `minigolf`, `royale`, `odyssee`, `testodyssee`, `mollo`, `sitenoir`, `mystery`, `dogfight`, `hub`, `server`).
Ajouter `[skip changelog]` dans le message d'un commit purement technique pour qu'il n'apparaisse pas.

## Repères

- Chaque jeu vit dans son dossier (`drift/`, `david/`, `calcul/`, `bastion/`, `outbreak/`, `filrouge/`, `kart/`, `convoy/`, `golf/`, `minigolf/`, `royale/`, `odyssee/`, `testodyssee/`, `mollo/`, `sitenoir/`, `mystery/`, `dogfight/`, `backrooms/`) et tourne dans une iframe du Hub ;
  le Hub (`index.html`, `hub/`) gère le salon, le classement entre potes et le pont `shared/bridge.js`.
- Multijoueur : relais WebSocket (`shared/net.js`, serveur dans `server/`). `?local` dans l'adresse simule le réseau
  entre onglets du même navigateur pour tester à plusieurs.
- Registre des jeux et de leurs réglages : `hub/games.js` ; fiche de chaque jeu (catégorie, durée, commandes, astuces) dans `HUB_GAME_INFO`, au même endroit : à remplir pour tout nouveau jeu.
- Accueil : `hub/home.js` (vitrine, filtres, étiquettes tirées du journal). Autour du jeu : `hub/ingame.js` (écran de chargement commun, menu Arcadia).
  L'écran de chargement s'en va quand le pont envoie « shown » : automatique dès que le jeu est prêt et que `#loading`, `#app.loading` ou `#load`
  ont disparu ; un jeu peut l'annoncer lui-même avec `HubBridge.shown()`. Sons d'interface : `shared/uisfx.js` (Kenney, CC0, `assets/sfx/`). Ajouter un jeu : `docs/NOUVEAU-JEU.md`.
- Tests à lancer avant de pousser quand on touche à DavidSimulator, Tête de Calcul, Fil Rouge, Outbreak, Convoy Storm ou Birdie Party :
  `node tools/test-rules.mjs`, `node tools/check-board.mjs`, `node tools/test-calcul.mjs`, `node tools/test-filrouge.mjs`,
  `node tools/test-outbreak.mjs`, `node tools/test-convoy.mjs`, `node tools/test-golf.mjs`.
- Poké Duel, tournoi (`pokemon/engine/tournament.js`, `pokemon/net/`) : `node tools/test-pokemon-tournament.mjs` (draft, tableau, exemptions,
  forfaits, finale en 2 manches) et `node tools/test-pokemon-net.mjs` (tournoi joué en réseau simulé, départ d'un joueur, départ de l'hôte).
  Objets tenus (`pokemon/engine/items.js`) et Méga-Évolutions (`pokemon/engine/megas.js`) : `node tools/test-pokemon-items.mjs`.
  Roster : 61 Pokémon faits main (`pokemon/engine/data.js`) + toutes les évolutions finales des Gens 1 à 6, leurs attaques, talents et Méga-Évolutions
  générés depuis PokeAPI dans `pokemon/engine/roster-gen.js` par `node tools/pokemon-roster.mjs` (ne pas modifier ce fichier à la main).
  Format VGC (combat en double) : moteur commun dans `battle.js` (emplacements A et C contre B et D, `resolveActions`, attaques de zone, Abri),
  bots `chooseDoublesAction`, écran `pokemon/view/doubles.js` : `node tools/test-pokemon-vgc.mjs` (le tournoi VGC en réseau est dans `test-pokemon-net.mjs`).
  Format « 2 joueurs contre 2 » (`format: 'multi'`) : même moteur en double, un emplacement par joueur (`battle.owners`) avec ses propres Pokémon (`battle.pools`), équipes tirées au sort (`match.aIds` / `bIds`).
  Talents (`pokemon/engine/abilities.js` : un talent par Pokémon, le meilleur que le moteur sait jouer ; météo dans `battle.js`) : `node tools/test-pokemon-abilities.mjs`. Le mode aventure Kalos-Sud a été retiré
  (l'aventure Pokémon du Hub, c'est Odyssée).
- Odyssée (`odyssee/`) : jeu à plusieurs par le Hub (`odyssee/js/net/` : positions, invitations, échanges, combats entre joueurs calculés
  à l'identique des deux côtés avec une graine commune, `odyssee/js/core/pvp.js`) et code de sauvegarde (`odyssee/js/core/savecode.js`) :
  `node tools/test-odyssee-link.mjs`, à lancer quand on touche au moteur de combat d'Odyssée (`odyssee/js/core/battle.js`).
- Mini-Golf Party, robustesse : `node tools/fuzz-minigolf.mjs [coups par trou]` tire au hasard sur chaque trou et compte les balles qui traversent un mur ou restent suspendues (doit afficher 0 et 0).
  Textures photo : celles de `kart/tex/` (Poly Haven, CC0), chargées par `dressPhoto` dans `minigolf/js/textures.js`.
- Site Noir (`sitenoir/`, moteur sans DOM dans `sitenoir/engine/`) : horreur asymétrique à la première personne, l'hôte fait autorité. `node tools/test-sitenoir.mjs` teste la carte, le déplacement, les clés, les fusibles, le générateur, l'ascenseur, les coups, l'extraction, les copies des invités et le relais d'hôte, et des parties entières entre bots ; `node tools/bench-sitenoir.mjs [parties] [niveau|all] [enquêteurs]` mesure la durée des parties, les victoires et le coût d'un pas. `sitenoir/plan.html` montre une partie de bots vue de dessus. L'image passe par `sitenoir/view/post.js` (grain VHS côté enquêteurs seulement).
- Mollo ! (`mollo/`, moteur sans DOM dans `mollo/engine/`) : pantins physiques à sept points (Verlet et contraintes), muscles qui mollissent sous les coups. `node tools/test-mollo.mjs` teste les six arènes et leurs pièges, les objets (tirage à chaque manche, poêle, pétard, parapluie, banane), les collisions, le combat (visée, série de poings, garde, saisie, coup de tête), tenir debout, la marche, le saut,
  les coups, le KO, saisir / soulever / jeter, s'accrocher et se hisser, la fatigue des bras, la chute, des parties entières entre bots, l'instantané et la reprise par un nouvel hôte : à lancer quand on touche au moteur. Personnages et décors dessinés dans le code, aucun modèle externe.
- Mystère Mystère (`mystery/`, moteur sans DOM dans `mystery/engine/`) : murder mystery façon Murder Mystery 2, à la première personne, l'hôte fait autorité.
  Le manoir (`map.js`) tient sur une grille de cases de 1 m et trois niveaux (cave y = -4, rez-de-chaussée, étage y = 4) ; un escalier appartient à deux niveaux,
  on n'y entre que par le haut ou le bas. Règles, armes et réseau dans `sim.js` (les rôles ne partent jamais dans l'état public : chacun reçoit sa fiche,
  `sheet`), chemins des bots dans `nav.js` (A* entre niveaux, passages secrets compris), bots dans `bots.js`. `node tools/test-mystery.mjs`, `node tools/test-backrooms.mjs` teste le manoir,
  le déplacement, les escaliers, les passages secrets, le couteau, le lancer, le revolver, la bavure, le héros, les pièces, la coupure, le secret des rôles,
  la prédiction des invités et des manches entières entre bots (à lancer quand on touche au moteur). Modèles CC0 (Quaternius, Kenney, KayKit) : `mystery/models/LICENSE.txt`.
  `?debug` expose `__mystery` (`ff(sec)` avance le moteur sans dessiner, `to(x, z, niveau)`, `start()`) ; `?autostart`, `?seed`, `?role=m|s|i`, `?mode=explore`, `?bots=4`, `?lag=150`, `?q=bas`.
- The Backrooms (`backrooms/`, moteur sans DOM dans `backrooms/engine/`) : Level 0 sur deux étages (`createLevel0` dans `map.js` : on tombe par les trous
  du couloir piégé, des puits de 6,40 m (`FLOOR_DY`), on remonte par 2 escaliers coudés : deux volées et un palier, repère `u`/`v` de `stairAt` ; 5 cassettes réparties ; un ascenseur par étage, un seul vrai, `realFloor`) puis Level 1 (`level1.js`, entrepôt,
  étagères, 3 fusibles, coupures de courant, embuscades), reliés par un ascenseur qui part quand tous les joueurs encore en vie sont dedans.
  À plusieurs, l'hôte fait autorité (`snapshot` / `applySnapshot`), l'invité se déplace chez lui (`predict`). `node --experimental-detect-module tools/test-backrooms.mjs`.
  `backrooms/?parkour` (seul) fait commencer devant le couloir piégé, `backrooms/?level1` (seul) directement au Level 1.
  Habillage du Level 1 (rayonnages, marchandises, tuyaux, marquages, piliers, panneaux) : `backrooms/view/warehouse.js`.
- Sauvegardes en ligne (`server/saves.js`, client `odyssee/js/net/cloud.js`) : le relais range les parties dans le dépôt GitHub,
  branche `saves`, sous le code ami du compte Hub. Mise en route sur Render : `docs/SAUVEGARDES.md`. Test : `node tools/test-saves.mjs`.
  Comptes Arcadia (identifiant + mot de passe, profil chiffré dans le navigateur avant de partir) : client `hub/account.js`, serveur `server/accounts.js`
  (même branche, dossier `accounts/`). Test : `node tools/test-accounts.mjs`. Le relais doit être redéployé sur Render pour qu'ils marchent.
  Comptes VIP (`hub/vip.js`) : jeux, réglages ou options réservés avec `vip: true` dans `hub/games.js` (option : `['val', 'Libellé', { vip: true }]`),
  retirés de la liste des autres joueurs ; dans un jeu, `HubBridge.info.vip`. Donner le grade à un compte en ligne : `node tools/vip-add.mjs <identifiant>`
  (`--retirer` pour l'enlever). Test : `node tools/test-vip.mjs`.
- Mini-Golf Party : `node tools/test-minigolf.mjs` construit les 72 trous (dont les 18 du Marathon, ~2 min) et vérifie qu'un bot expert les termine (à lancer quand on touche aux trous ou à la physique).
- Odyssée (aventure solo façon DS, `odyssee/`) : `node tools/test-odyssee.mjs` joue 600 combats aléatoires et vérifie que toute la région
  (portes, grottes, PNJ, objets, arènes) est accessible depuis Bourg-Aube sans qu'un PNJ ne bloque le passage, et que la progression
  tient (avec k badges et les capacités de terrain qu'ils débloquent, l'arène k+1 est ouverte mais pas la suivante ; Ligue à 8 badges ;
  depuis chaque quai du bateau, les légendaires de l'île sont accessibles avec les bons badges et leurs quêtes) :
  à lancer quand on touche au moteur (`odyssee/js/core/`) ou à la carte (`odyssee/js/world/`). Les données des Pokémon (`odyssee/js/data/`)
  sont générées par `tools/odyssee-donnees.mjs` à partir des tables de PokeAPI (leurs sprites viennent de PokeAPI : des remplaçants) ;
  les créatures originales sont dans `odyssee/js/data/creatures.js`. Les dessins d'origine (1024 px) sont dans `assets/graphics/`
  (portraits : `portrait_nom.png`) ; `python3 tools/odyssee-sprites.py [chars portraits crea items nature mobilier sol facades title]`
  les découpe et les réduit dans `odyssee/img/` et met à jour `odyssee/js/data/sprites.js`. Les planches « version 2 » (pixel art agrandi ×4
  ou ×8, personnages en 3 × 4 cases carrées, `nature_arbres.png`, `nature_petits.png`) sont ramenées à leur vraie résolution
  (grille retrouvée automatiquement, même au pas fractionnaire ; profils des personnages triés gauche / droite). Une case du décor
  fait 32 pixels à l'écran : tuiles (16 px) agrandies ×2, sprites « version 2 » à densité 2 (personnages en cases de 64 × 64).
  Le tileset global assemblé à la main (`assets/graphics/tileset.png` : sols, eau, rebords, hautes herbes en 4 × 4 pièces,
  kits de façade) est découpé par `python3 tools/odyssee-tileset.py [sol herbes kits]` en tuiles de 32 px (`odyssee/img/sol32/`,
  `odyssee/img/herbes/`, `odyssee/img/facades/`) ; chaque tuile y est repérée par un point de son dessin (tables `SOL`, `HERBES`, `KITS`).
  Personnages provisoires de HeartGold / SoulSilver : `python3 tools/odyssee-hgss.py [clone pret/pokeheartgold] [clone smogon/sprites]`
  (images brutes gardées dans `assets/graphics/hgss/`). Les créatures originales sont remplacées par des Pokémon
  (`odyssee/js/data/remplacants.js`, `ORIGINALES = true` pour les remettre).
  Histoire principale (la Team Éclipse, Lugia Obscur au Sanctuaire des Marées, l'Éclipse, le Conseil 4 avant Célestine, les CS Flash et Force
  et leurs recoins cachés, les quêtes annexes) : `odyssee/js/world/story.js` (PNJ et lieux) et `odyssee/js/story.js` (scènes) ;
  `node tools/test-odyssee-story.mjs` rejoue toute l'aventure dans l'ordre et vérifie que chaque étape est atteignable au bon moment.
  Histoire secondaire (la Brume) et nouveaux lieux (Lac Miroir, Grotte des Marées, Jardin des Songes, Forêt des Torii et Temple Kagura,
  Île du Magma) : `odyssee/js/world/quetes.js`. Une quête = des étapes dans `flags['Q:id']`, des PNJ qui apparaissent selon l'étape
  (`when`), des scripts (`talk`, `use`, `onWin`, `after`) qui reçoivent les outils de `game.api()`. `node tools/test-odyssee-quetes.mjs`
  joue toutes les quêtes de bout en bout (à lancer quand on touche aux quêtes). Animations de terrain HGSS (mer, rivages, fleurs) :
  `odyssee/img/hgss/`, extraites par `tools/odyssee-hgss.py`, qui découpe aussi les icônes de la carte de la région (style Pokégear,
  `assets/graphics/hgss/carte_guide.png` → `odyssee/img/carte/`).
  Les outils de dessin (atelier graphique, vitrine, sources PixelLab, scripts de découpe des sols, kits, personnages
  et créatures à 16 px) vivent sur la branche `atelier` du fork ; `main` ne garde que le jeu.
  Sprites des Pokémon (face, dos, chromatiques, icônes, générations 1 à 6) : copiés de PokeAPI dans `odyssee/img/pokeapi/`
  par `node tools/odyssee-sprites-pokeapi.mjs` ; cris dans `odyssee/snd/cris/` (le jeu ne charge plus rien en ligne pour les Pokémon).
  Méga-Évolution : `node tools/odyssee-megas.mjs` écrit `odyssee/js/data/megas.js` (81 Méga de PokeAPI, dont celles de Légendes Z-A,
  pour les Pokémon des générations 1 à 6) et copie leurs sprites et les cris ; `odyssee/js/core/mega.js` enregistre les formes
  (espèces invisibles des listes, n° 10033 et plus), les Méga-Gemmes et le Méga-Anneau ; le moteur (`battle.js`) : `canMega`, `doMega`,
  une par dresseur et par combat, retour à la forme de base dans `end()`. Méga-Anneau remis par le Pr Orme à Port-Granit (5 badges),
  qui vend aussi les gemmes ; 12 gemmes cachées sur les routes de la fin. Dresseurs : `trainer.megaSp` (n° d'espèce ou 'ace').
  Méga imaginées par des fans (24, n° 20001 et plus) : `odyssee/js/data/megasFans.js` et `odyssee/img/megas/` (origine dans `LISEZMOI.txt`) ;
  quand l'espèce a déjà une Méga officielle, la version des fans porte le signe Δ et sa propre gemme. Toutes les gemmes se vendent chez le Pr Orme.
  Interface : un écran plein cadre par fichier dans `odyssee/js/ui/screens/` (`map.js`, `card.js`, `pc.js`, `friends.js`…),
  outils communs et fermeture d'écran (`closer`) dans `screens/common.js` ; `ui/screens.js` ne fait que tout réexporter (importer depuis lui).
  Styles découpés de même dans `odyssee/css/NN-ecran.css`, chargés dans l'ordre par `index.html` (l'ordre compte : un fichier
  plus loin peut surcharger un plus tôt) ; `odyssee.css` les réunit par `@import` pour les pages d'aperçu.
  `node tools/test-odyssee-ecrans.mjs` ouvre le jeu dans un vrai Chrome (Playwright, sauté s'il manque) : chaque écran au clavier
  (Espace ne ferme pas, Échap ferme et rend la main), carte, Carte de Dresseur, saisie du code ami, météo (brume, cendres) — à lancer quand on touche à l'interface.
  Météo du monde : `getMapWeather()` dans `game.js` ; seules pluie, soleil, sable et grêle comptent en combat (`BATTLE_WEATHERS`), brume et cendres sont du décor (`render/weather3d.js`, `css/22-meteo.css`).
  Touches reçues par les écrans : celles de `odyssee/js/input.js` uniquement (`a`, `b`, flèches, `map`, `menu`…), jamais `space` ni `enter`.
  Rendu : les sprites sont dessinés à l'écran pixel pour pixel, ancrés à leurs pieds
  (shader `screenSprite` de `odyssee/js/render/world3d.js`), les bâtiments prennent la profondeur de leur façade.
- TestOdyssée (`testodyssee/`, mode d'emploi dans `testodyssee/LISEZMOI.md`) : le labo d'Odyssée. On choisit un lieu (donjon du labo,
  ville, route ou grotte d'Odyssée) et une équipe prête, et on y apparaît directement ; rien n'est sauvegardé. Menu du labo : mode test, Pokémon sauvages coupés (`noEnc`), traverser les murs (`traverseMurs`). Il réutilise le moteur et
  les images d'Odyssée sans les copier (`odyssee/js/art.js` charge les images pour les deux jeux). Les donjons se dessinent en texte
  (`testodyssee/js/donjons/`) ; l'état d'un donjon est partagé par le groupe et tenu par l'hôte du salon (`testodyssee/js/donjon/etat.js`,
  sans DOM). `node tools/test-testodyssee.mjs` vérifie les plans (tout est accessible portes ouvertes, rien portes fermées), les règles
  du groupe et les lieux d'apparition : à lancer quand on touche aux donjons, et quand on touche aux cartes d'Odyssée.
  `tools/salon-test.html?jeu=testodyssee&n=3` ouvre plusieurs joueurs dans une seule page en jouant le rôle du Hub (marche pour tout jeu du site).
  Donjon de Didier : questions, clés et ascenseur à serrures, journal du donjon (`testodyssee/js/donjon/mecaniques.js`), et combat à plusieurs
  contre un boss calculé par l'hôte (`testodyssee/js/combat/raid.js`, barre de vie à blocs façon PokéRogue) que chaque écran rejoue
  dans l'écran de combat d'Odyssée par `runPvp` (`testodyssee/js/combat/vue.js`). Pokémon et objets exclusifs du labo : `testodyssee/js/contenu.js`.
  Donjon des Miroirs (solo, une carte par salle, ouvert par la Clé des Miroirs (`cle` du donjon, dans le Sac des équipes du labo), `testodyssee/js/donjons/miroirs.js`, mécaniques dans `testodyssee/js/donjon/miroirs.js`) : énigmes (miroir qui parle, réponse tapée au clavier ; cinq cadres de couleur), glace, lumière et reflet
  résolus sans écran dans `testodyssee/js/donjon/casse-tetes.js`, vérifiés par `node tools/test-testodyssee.mjs`. Un panneau demandé se pose au centre de la première salle.
  Standard de tous les donjons : panneau d'entrée dehors (nom, `entree`, `joueurs` : solo, groupe ou exact) et « Quitter le donjon » ; un PC d'aide
  (`type: 'pc'`, `aide` de la salle) seulement dans les salles où l'auteur du donjon le demande.
  Sanctuaire des Trois Voies (à trois, `testodyssee/js/donjons/voies.js`, mécaniques `testodyssee/js/donjon/voies.js`) : chemins séparés (`apres`, `suivante`,
  salle `voies`), codes tirés par l'hôte (`preparer`), plusieurs combats à blocs dans un donjon (un par salle `raid`), combats de groupe
  contre un dresseur (salle `groupe`, moteur `testodyssee/js/combat/groupe.js`, n joueurs contre n Pokémon en jeu, cible choisie par chacun).
  Pyramide de l'Ascension (3 ou 4 joueurs, `testodyssee/js/donjons/pyramide.js`, mécaniques `testodyssee/js/donjon/pyramide.js`) : étages (`etage`) à dresseurs
  seuls et duos (à deux joueurs), objets partagés, escalier tiré par l'hôte, fontaine, grottes par porte, arènes (`arene`) et sommet (`sommet`) en duel entre joueurs.
  Mine Effondrée (2 à 4, `donjons/mine.js`, `donjon/mine.js`) : poste de contrôle à un joueur (plan en direct, barrières, cages), plafonds fissurés.
  Train Fantôme (`donjons/train.js`, `donjon/train.js`) : horloge tenue par l'hôte, voitures qui se décrochent, voie ferrée de rattrapage.
  Temple des Éléments (`donjons/temple.js`, `donjon/temple.js`) : salle des dalles commune, temple à trois (une porte par joueur, table de trois Poké Balls départagée en duel) ou en solo (dalle d'or au niveau 40) ; formes du Temple (Pokémon connus d'un autre type, `testodyssee/js/formes.js`, images retouchées dans `testodyssee/img/temple/`). Ne jamais montrer les évolutions finales des Pokémon créés pour l'auteur, hors du jeu.
  Tombeau du Roi Sans Nom (solo, `donjons/tombeau.js`, `donjon/tombeau.js`) : place de l'entrée (ruinemaniac, sa clé et sa carte, roche à pousser avec Force), repaire des brigands (-3, Caverne d'Ali Baba, deux portiers qui gardent le -4), salles sombres éclairées de torches, moines qui font leur ronde (-2, -1 : `donjons/tombeau-gardes.js`, plans par `node tools/tombeau-gardes.mjs` dans `tombeau-gardes-plans.js`, ne pas le modifier à la main), Sceptre du Roi Sans Nom au -1 ; éboulement derrière soi, puis du -4 au -9 (pilleurs de Sable-Noir, piège et vol du sceptre au -7, morts-vivants : abominations de `contenu.js`) par `python3 tools/tombeau.py` (`tombeau-salles.js`, ne pas le modifier à la main), -10 : le chef et la porte scellée.
  Fonderie aux Plaques (2 à 4, `donjons/fonderie.js`, `donjon/fonderie.js`) : plaques de pression qui lèvent les grilles de leur couleur tant qu'on est dessus (règles et traversée à plusieurs dans `donjon/plaques.js`, vérifiée à deux et pas seul par les tests).
  Bastion du Cristal (2 à 4, `donjons/cristal.js`, `donjon/cristal.js`) : défense du cristal en temps réel, pillards déplacés par l'hôte (`djDef`), combat chez le joueur engagé (règles dans `donjon/defense.js`).
  Mont Givrécime (aventure solo, pas un donjon : `testodyssee/js/mont/`) : dix grandes salles dedans et dehors, plans générés par `python3 tools/mont.py` dans `mont/plans.js` (ne pas le modifier à la main), vérifiées par `test-testodyssee.mjs`.
  Routes Victoire du labo (`testodyssee/js/rv/`) : plans d'origine de Vert Feuille, d'Émeraude et de Platine (et HeartGold, recopié à la main dans `tools/rv-heartgold.txt`) générés par `python3 tools/routes-victoire.py chemin/pokefirered chemin/pokeemerald chemin/pokeplatinum chemin/pokeheartgold` dans `rv/donnees.js` (ne pas le modifier à la main), seules ou à la suite (fusion) ; hauteurs et ponts de la génération 3, ponts et Escalade de la génération 4 dans `rv/jeu.js` et `rv/routes.js` ; vérifiées par `test-testodyssee.mjs` (tout est atteignable de l'entrée).
  Île privée du labo (`testodyssee/js/ile/` : `modele.js` sans DOM, `jeu.js`) : une île par joueur gardée dans le navigateur, mode construction case par case, dispositions gardées, mairie à étages (base secrète : coffre-fort et drapeau),
  Borne d'arcade (casse-briques, points d'usine), usine à pièges, caserne et salles d'entraînement (essai en intrus, salle collée sur l'île) : `testodyssee/js/ile/usine.js` (sans DOM), `casse-briques.js` ; vérifiés par `test-testodyssee.mjs`.
  mairie, musée, trophées des badges et des donjons ; vérifiée par `test-testodyssee.mjs`.
- Island Rush (battle royale, `royale/`) : l'île vient d'une graine (`royale/engine/map.js`, île officielle `ILE`), `royale/carte.html`
  la montre en 2D. `node tools/test-royale.mjs` vérifie l'île sur plusieurs graines, le déplacement (portes, escaliers, murs, nage),
  une partie (butin, combat, construction), les copies des invités et le relais d'hôte, la prédiction : à lancer quand on touche
  au moteur (`royale/engine/`). `node tools/bench-royale.mjs [joueurs] [niveau] [graine] [minutes]` fait jouer une partie entière
  entre bots (`WATCH=bot3` suit un bot) : coût d'un pas, éliminations, bots coincés, durée de la partie.
  Parties jouées : l'hôte tient un journal local (`royale/journal.js`), lu par `royale/stats.html` ; guide des soirées de
  test dans `docs/ISLAND-RUSH-TESTS.md`.
- Dogfight 3D (`dogfight/`) : le moteur (`dogfight/engine/`, sans DOM) survole la vraie île d'Island Rush. `node tools/test-dogfight.mjs` vérifie le vol, les armes, l'IA, les règles et le réseau : à lancer quand on touche au moteur.
  `node tools/bench-dogfight.mjs [joueurs] [niveau] [éliminations] [parties]` fait jouer des bots hors navigateur. `python3 tools/glb-webp.py modele.glb` allège un modèle. Licences des modèles : `dogfight/LICENSE.txt` (F-22 à confirmer).
- Réseau (`shared/net.js`, `shared/room.js`, `server/`) : `node tools/test-relay.mjs` et `node tools/test-net.mjs`
  (prérequis : `cd server && npm install`). Le serveur relais doit être redéployé quand `server/server.js` change.
- Bastion Clash : le moteur (`bastion/engine/`, sans DOM) est testé par `node tools/test-bastion.mjs` ;
  `node tools/bench-bastion.mjs [minutes] [graine] [mode] [carte]` fait jouer 4 bots hors navigateur et mesure
  le coût d'un pas de simulation (doit rester sous 33 ms), les éliminations, les cibles des bots et les unités bloquées.
- Commits : auteur et messages en français, un message qui décrit ce que le joueur gagne.
