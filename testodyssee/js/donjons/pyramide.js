// testodyssee/js/donjons/pyramide.js — la Pyramide de l'Ascension : un donjon à 3 ou 4 joueurs, salles séparées.
// On y entre avec ses Pokémon tels qu'ils sont, et rien ne les soigne en montant (sauf la fontaine) : les forces s'usent.
// Les objets de soin du Sac sont mis de côté à l'entrée et rendus à la sortie ; dedans, on n'a que ce qu'on trouve.
//
// Salle 1 : les dalles (une par joueur, 3 ou 4) ; le nombre de joueurs est compté ici.
// Salles 2 et 3 : deux étages de dresseurs, seuls ou en duo (un duo se combat à deux joueurs : on appelle un partenaire).
//            Pas de Pokémon sauvages. Les objets de soin au sol sont partagés : qui le prend le premier l'a.
//            Quand tous les dresseurs sont battus, l'escalier apparaît, à un endroit différent à chaque ascension.
//            À 3 joueurs : 2 duos (4 Pokémon) et 2 dresseurs seuls (4), puis 3 duos (6) et 5 dresseurs seuls (5).
//            À 4 joueurs : 4 duos (4), puis 6 duos (6).
// Salle 4 : la fontaine (soigne l'équipe, mais efface les objets de soin), et quatre portes, une par joueur.
// Salles 5 à 7 : une grotte par porte, chacun la sienne : dresseurs, beaucoup d'objets, Pokémon sauvages rares
//            qu'on ne peut pas fuir.
// Salle 8 : deux arènes (portes I et II, portes III et IV). Duel sans soin entre les deux joueurs de l'arène :
//            le perdant est ramené dehors, le gagnant est soigné et monte. Seul dans son arène : on affronte le reflet
//            de l'équipe d'un joueur de l'autre arène, à PV pleins.
// Salle 9 : le sommet. Duel entre les deux gagnants ; le vainqueur reçoit le Symbole d'Or. Tous deux redescendent.
//
// Perdre un combat, n'importe où dans la pyramide : on est ramené dehors, sans récompense.
import { GameMap, rng } from '../../../odyssee/js/world/mapgen.js';
import { T } from '../../../odyssee/js/world/tiles.js';

/** l'extérieur : la pyramide au milieu des dunes */
function exterieur() {
  const m = new GameMap('labo:pyramide:dehors', 36, 30, { outdoor: true, fill: T.ROCK, name: 'Dunes de l\'Ascension', music: 'route' });
  m.blob(18, 15, 15, 12.5, T.SAND, rng(4141));
  m.rect(4, 3, 31, 26, T.SAND, [T.ROCK]);
  // la pyramide : 11 cases de large, porte au milieu de la rangée du bas ; tout son pied est bloqué
  const x0 = 12, yb = 12, porte = [x0 + 5, yb];
  for (let y = yb - 6; y <= yb; y++) for (let x = x0; x <= x0 + 10; x++) { if (x === porte[0] && y === yb) continue; m.under.set(x + ',' + y, T.SAND); m.set(x, y, T.BLOCK); }
  m.prop('pyramide', x0, yb, false, { w: 11, dz: 0.95 });
  m.set(...porte, T.DOOR);
  for (let y = yb + 1; y <= 26; y++) m.set(porte[0], y, T.PATH);
  for (const [x, y] of [[porte[0] - 3, yb + 3], [porte[0] + 3, yb + 3], [porte[0] - 3, yb + 8], [porte[0] + 3, yb + 8]]) m.prop('obelisque', x, y);
  for (const [x, y] of [[6, 6], [29, 7], [7, 20], [28, 21], [9, 25], [26, 25]]) m.prop('palm', x, y);
  for (const [x, y] of [[8, 13], [27, 15], [11, 22]]) m.prop('rocher_grand', x, y);
  m.zone(0, 0, 35, 29, { name: 'Dunes de l\'Ascension', music: 'route' });
  return { carte: m, porte };
}

// grottes des salles 5 à 7 : une par porte (a, b, c, d), mêmes plans, dresseurs et lettres propres à chaque chemin
const GROTTES = [
  [
    '###########################',
    '############N##############',
    '#########.......####...h###',
    '###...........%.....#....##',
    '##..&...%............%...##',
    '##.......####....1.......##',
    '#..r....######...........##',
    '#.......####......%.......#',
    '##..%..........&......#...#',
    '###.......2.......####...##',
    '####........%.....##.....##',
    '###...&..........f.......##',
    '##.......###.........%...##',
    '##..u....###...&.........##',
    '###......................##',
    '#####.....#####.....#######',
    '#######....S....###########',
    '###########################',
  ],
  [
    '#############################',
    '#####N#######################',
    '####...####......#####...m###',
    '###.....##...%.......#.....##',
    '##...1......####..&........##',
    '##.%.......######......%...##',
    '##.........#####....2......##',
    '###..&...h........##.......##',
    '####..........%...##...&...##',
    '###....%%............e.....##',
    '##.....%%....&.........%%..##',
    '##..r..........####....%%..##',
    '###...........######.......##',
    '####...&.......####....u...##',
    '######.....................##',
    '###########.....S....########',
    '#################D###########',
    '#############################',
  ],
  [
    '###############################',
    '###############N###############',
    '##########.........############',
    '#####....%....2....%....####..#',
    '####..............&.......m...#',
    '###...&...####.......####.....#',
    '##.......######.....######..&.#',
    '##..h....######..1..######....#',
    '##........####.......####.....#',
    '###..%...........%.........%..#',
    '####.......&.........&........#',
    '###..f..........r.........%...#',
    '##......%%%...........%%%.....#',
    '##......%%%.....&.....%%%..u..#',
    '###...........................#',
    '#####.......#####......########',
    '########......S....############',
    '##############D################',
    '###############################',
  ],
];
const CHEMINS = ['a', 'b', 'c', 'd'];
const NOMS_CHEMINS = { a: 'I', b: 'II', c: 'III', d: 'IV' };
// deux dresseurs par grotte, une lettre chacun (24 lettres : 4 chemins × 3 grottes × 2)
const LETTRES_GROTTES = 'ÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝ';
const lettreGrotte = (v, n, k) => LETTRES_GROTTES[CHEMINS.indexOf(v) * 6 + n * 2 + k];
const DRESSEURS_GROTTES = [
  [
    { cls: 'Archéologue', nom: 'Basile', sprite: 'savant', equipe: [[104, 32], [27, 32], [50, 33]] },
    { cls: 'Randonneuse', nom: 'Inès', sprite: 'randonneuse', equipe: [[231, 32], [74, 33], [207, 33]] },
  ],
  [
    { cls: 'Montagnard', nom: 'Gaston', sprite: 'montagnard', equipe: [[75, 33], [95, 33], [111, 34]] },
    { cls: 'Médium', nom: 'Sélène', sprite: 'medium', equipe: [[92, 33], [562, 34], [353, 33]] },
  ],
  [
    { cls: 'Explorateur', nom: 'Nils', sprite: 'topdresseur', equipe: [[28, 34], [105, 34], [449, 34], [328, 35]] },
    { cls: 'Exploratrice', nom: 'Maëlle', sprite: 'topdresseuse', equipe: [[551, 34], [451, 34], [232, 35]] },
  ],
];
const RENCONTRES_GROTTES = [
  [[27, 30, 32, 30], [104, 30, 32, 25], [74, 31, 33, 25], [207, 31, 33, 20]],
  [[28, 32, 34, 25], [92, 32, 34, 25], [562, 32, 33, 25], [449, 32, 34, 25]],
  [[105, 33, 35, 25], [93, 33, 35, 20], [328, 33, 35, 20], [451, 33, 35, 20], [246, 33, 34, 15]],
];
const NOMS_GROTTES = ['Grotte des Sables', 'Grotte des Murmures', 'Grotte des Tombeaux'];

function grottes() {
  const salles = [], pnj = {};
  for (const v of CHEMINS) {
    GROTTES.forEach((plan, n) => {
      const id = `s${5 + n}${v}`, l = [lettreGrotte(v, n, 0), lettreGrotte(v, n, 1)];
      l.forEach((k, i) => { pnj[k] = { ...DRESSEURS_GROTTES[n][i], id: `${v}${5 + n}-${i}`, dir: 'down', perd: 'Bonne ascension...' }; });
      salles.push({
        id, nom: `${NOMS_GROTTES[n]} (${NOMS_CHEMINS[v]})`, type: 'combat', voie: v, pnj: l, style: null,
        apres: n ? [`s${4 + n}${v}`] : ['s4'], suivante: n < 2 ? `s${6 + n}${v}` : (v === 'a' || v === 'b' ? 's8a' : 's8b'),
        rencontres: RENCONTRES_GROTTES[n], taux: 0.035,
        plan: plan.map((r) => r.replace('1', l[0]).replace('2', l[1])),
      });
    });
  }
  return { salles, pnj };
}
const G = grottes();

/** ce que l'hôte tire à chaque ascension : où apparaît l'escalier de chaque étage */
function preparer(r) {
  return { escaliers: { s2: Math.floor(r() * 3), s3: Math.floor(r() * 4) } };
}

const duo = (o) => ({ dir: 'down', duo: true, perd: 'On a perdu... ensemble.', ...o });
const seul = (o) => ({ dir: 'down', perd: 'La montée continue pour toi.', ...o });

export default {
  id: 'pyramide',
  carte: 'labo:pyramide',
  nom: 'Pyramide de l\'Ascension',
  niveau: 'niv. 35',
  entree: 'Ici, les forces s\'usent marche après marche. Arriverez-vous au sommet encore debout ?',
  joueurs: { mode: 'entre', min: 3, max: 4 },
  musique: 'tower',
  equipe: 'milieu',
  style: 'sable',
  pyramide: true,
  exterieur,
  preparer,
  voies: { a: 'Porte I', b: 'Porte II', c: 'Porte III', d: 'Porte IV' },
  portesDecor: { 1: 'porte_grille' },
  decor: { b: 'brasero', '%': 'caverock', '&': 'stalag', '|': 'colonne', l: 'stele' },
  objets: {
    // objets de soin partagés des étages (le premier qui le prend l'a)
    '$': { type: 'soin', objet: 'super-potion' },
    '+': { type: 'soin', objet: 'hyper-potion' },
    '*': { type: 'soin', objet: 'revive' },
    '?': { type: 'soin', objet: 'full-heal' },
    // emplacements possibles de l'escalier (un seul apparaît)
    E: { type: 'escalier', sol: true },
    '~': { type: 'fontaine', decor: 'fontaine' },
    P: { type: 'panneau', texte: 'Quatre portes, quatre grottes.\nDeux portes mènent à chaque arène. Au sommet, il n\'y aura de place que pour un.' },
    Q: { type: 'panneau', texte: 'L\'eau de la fontaine rend leurs forces aux Pokémon.\nMais elle ne supporte rien de ce qui vient d\'en bas.' },
    w: { type: 'porteP', decor: 'porte_1', voie: 'a' },
    x: { type: 'porteP', decor: 'porte_2', voie: 'b' },
    y: { type: 'porteP', decor: 'porte_3', voie: 'c' },
    z: { type: 'porteP', decor: 'porte_4', voie: 'd' },
    // objets des grottes : chacun les siens
    h: { type: 'ramasser', objet: 'hyper-potion' },
    r: { type: 'ramasser', objet: 'revive' },
    f: { type: 'ramasser', objet: 'full-heal' },
    u: { type: 'ramasser', objet: 'super-potion', n: 2 },
    e: { type: 'ramasser', objet: 'ether' },
    m: { type: 'ramasser', objet: 'max-potion' },
  },
  pnj: {
    // premier étage
    A: duo({ id: 'e2-a', cls: 'Jumelles', nom: 'Lou et Mia', sprite: 'fillette2', equipe: [[27, 30], [231, 30], [74, 31], [207, 31]] }),
    B: duo({ id: 'e2-b', cls: 'Frères', nom: 'Hugo et Léo', sprite: 'gamin', equipe: [[104, 30], [111, 31], [50, 30], [95, 31]] }),
    C: seul({ id: 'e2-c', cls: 'Archéologue', nom: 'Edmond', sprite: 'savant', pour: 3, equipe: [[27, 30], [104, 31], [74, 30], [50, 31]] }),
    F: seul({ id: 'e2-f', cls: 'Randonneuse', nom: 'Clara', sprite: 'randonneuse', pour: 3, equipe: [[231, 30], [207, 31], [111, 30], [22, 31]] }),
    G: duo({ id: 'e2-g', cls: 'Pèlerins', nom: 'Anna et Paul', sprite: 'pretre', pour: 4, equipe: [[92, 30], [562, 30], [42, 31], [24, 31]] }),
    H: duo({ id: 'e2-h', cls: 'Cousins', nom: 'Tom et Noé', sprite: 'enfant', pour: 4, equipe: [[449, 30], [328, 30], [551, 31], [451, 31]] }),
    // deuxième étage
    I: duo({ id: 'e3-i', cls: 'Gardiens', nom: 'Iris et Yann', sprite: 'garde', equipe: [[28, 32], [105, 32], [75, 33], [207, 32], [232, 33], [95, 33]] }),
    J: duo({ id: 'e3-j', cls: 'Médiums', nom: 'Nina et Zoé', sprite: 'medium', equipe: [[93, 32], [562, 33], [353, 32], [200, 33], [42, 32], [563, 33]] }),
    K: duo({ id: 'e3-k', cls: 'Explorateurs', nom: 'Max et Eva', sprite: 'topdresseur', equipe: [[449, 32], [551, 32], [328, 33], [451, 33], [111, 32], [28, 33]] }),
    L: duo({ id: 'e3-l', cls: 'Karatékas', nom: 'Ken et Rui', sprite: 'karateka', pour: 4, equipe: [[67, 32], [57, 32], [106, 33], [107, 33], [237, 32], [66, 32]] }),
    M: duo({ id: 'e3-m', cls: 'Dresseurs', nom: 'Lisa et Marc', sprite: 'topdresseuse', pour: 4, equipe: [[22, 32], [24, 32], [53, 33], [20, 32], [203, 33], [210, 33]] }),
    O: duo({ id: 'e3-o', cls: 'Montagnards', nom: 'Jean et Rémi', sprite: 'montagnard', pour: 4, equipe: [[75, 32], [95, 33], [232, 32], [74, 32], [213, 33], [227, 33]] }),
    W: seul({ id: 'e3-w', cls: 'Archéologue', nom: 'Hector', sprite: 'savant', pour: 3, equipe: [[105, 32], [28, 32], [562, 33], [50, 32], [207, 33]] }),
    R: seul({ id: 'e3-r', cls: 'Médium', nom: 'Morgane', sprite: 'medium', pour: 3, equipe: [[93, 32], [353, 32], [200, 33], [92, 32], [42, 33]] }),
    T: seul({ id: 'e3-t', cls: 'Karatéka', nom: 'Bruno', sprite: 'karateka', pour: 3, equipe: [[67, 32], [57, 33], [106, 32], [237, 32], [66, 33]] }),
    U: seul({ id: 'e3-u', cls: 'Exploratrice', nom: 'Léna', sprite: 'topdresseuse', pour: 3, equipe: [[449, 32], [328, 32], [551, 33], [451, 32], [231, 33]] }),
    V: seul({ id: 'e3-v', cls: 'Montagnard', nom: 'Fernand', sprite: 'montagnard', pour: 3, equipe: [[75, 32], [95, 32], [111, 33], [74, 33], [232, 33]] }),
    // arbitres des arènes et du sommet
    X: { id: 'arbitre-a', cls: 'Juge', nom: 'de l\'Arène du Levant', sprite: 'vieil_homme', dir: 'down', arbitre: true, toujours: true },
    Y: { id: 'arbitre-b', cls: 'Juge', nom: 'de l\'Arène du Couchant', sprite: 'vieil_homme', dir: 'down', arbitre: true, toujours: true },
    Z: { id: 'arbitre-sommet', cls: 'Gardienne', nom: 'du Sommet', sprite: 'dame', dir: 'down', arbitre: true, toujours: true },
    ...G.pnj,
  },
  salles: [
    { id: 's1', nom: 'Salle des Dalles', type: 'dalles', porte: '1', plan: [
      '#############',
      '######N######',
      '#####111#####',
      '##.........##',
      '##.b.....b.##',
      '##.........##',
      '##.o.o.o.o.##',
      '##.........##',
      '##.b.....b.##',
      '##.........##',
      '######S######',
      '######D######',
    ] },
    { id: 's2', nom: 'Premier étage', type: 'etage', pnj: ['A', 'B', 'C', 'F', 'G', 'H'], plan: [
      '#############################',
      '#E..........b.....b.........#',
      '#...........................#',
      '#...||.......A.......||.....#',
      '#...||...............||..$..#',
      '#.........%.......%.........#',
      '#..G...................H....#',
      '#...........................#',
      '#.....%.....##.##.....%.....#',
      '#.......C...##.##...F.....E.#',
      '#.....................+.....#',
      '#..$..%..............%......#',
      '#...........................#',
      '#...||.......B.......||..*..#',
      '#...||...............||.....#',
      '#........?..................#',
      '#..E.........b.....b........#',
      '#.............S.............#',
      '##############D##############',
    ] },
    { id: 's3', nom: 'Deuxième étage', type: 'etage', pnj: ['I', 'J', 'K', 'L', 'M', 'O', 'W', 'R', 'T', 'U', 'V'], plan: [
      '###################################',
      '#E.......b.......###.......b.....E#',
      '#.................#...............#',
      '#...||.....I..........J.....||....#',
      '#...||......................||..$.#',
      '#.......%.......W.......%.........#',
      '#..L..........................M...#',
      '#.........##...........##.........#',
      '#....$....##....|.|....##....+....#',
      '#..............................R..#',
      '#.T......%.......K.......%........#',
      '#.................................#',
      '#....||....##.........##....||....#',
      '#....||....##....O....##....||.?..#',
      '#.................................#',
      '#..*.....U...............V......*.#',
      '#.......%.......|.|.......%.......#',
      '#.................................#',
      '#E........b.............b........E#',
      '################.S.################',
      '###################################',
    ] },
    { id: 's4', nom: 'Salle de la Fontaine', type: 'voies', voies: { w: 's5a', x: 's5b', y: 's5c', z: 's5d' }, plan: [
      '#######################',
      '###w####x#####y####z###',
      '#.....................#',
      '#..b...............b..#',
      '#.....................#',
      '#.........~...........#',
      '#.....................#',
      '#..b......Q........b..#',
      '#.........P...........#',
      '#.....................#',
      '###########S###########',
      '#######################',
    ] },
    ...G.salles,
    { id: 's8a', nom: 'Arène du Levant', type: 'arene', portes: ['w', 'x'], pourVoies: ['a', 'b'], suivante: null, plan: [
      '#############',
      '#...........#',
      '#.b.......b.#',
      '#.....X.....#',
      '#...........#',
      '#...........#',
      '#.b.......b.#',
      '#...........#',
      '######S######',
    ] },
    { id: 's8b', nom: 'Arène du Couchant', type: 'arene', portes: ['y', 'z'], pourVoies: ['c', 'd'], suivante: null, plan: [
      '#############',
      '#...........#',
      '#.b.......b.#',
      '#.....Y.....#',
      '#...........#',
      '#...........#',
      '#.b.......b.#',
      '#...........#',
      '######S######',
    ] },
    { id: 's9', nom: 'Sommet de la Pyramide', type: 'sommet', couchant: true, plan: [
      '###############',
      '#.............#',
      '#.b.........b.#',
      '#......Z......#',
      '#.............#',
      '#.............#',
      '#.............#',
      '#.b.........b.#',
      '#######S#######',
    ] },
  ],
  journal: [
    { id: 'dalles', nom: 'Les dalles', salle: 's1', but: 'Il faut un joueur sur chaque dalle en même temps (3 ou 4 dalles : autant que de joueurs).' },
    { id: 'etage1', nom: 'Premier étage', salle: 's2', but: 'Battez tous les dresseurs : l\'escalier apparaîtra quelque part dans la salle. Les duos se battent à deux.' },
    { id: 'etage2', nom: 'Deuxième étage', salle: 's3', but: 'Battez tous les dresseurs : l\'escalier apparaîtra quelque part dans la salle.' },
    { id: 'grotte', nom: 'Ta grotte', salle: 's4', but: 'Prends une porte (une par joueur), puis traverse les trois grottes de ton chemin.' },
    { id: 'sommet', nom: 'Le sommet', salle: 's9', but: 'Gagne ton duel dans l\'arène, puis celui du sommet.' },
  ],
  textes: {
    masque: 'L\'air est lourd et brûlant.',
    perdu: ['Tes Pokémon n\'en peuvent plus...', 'Une force mystérieuse te ramène au pied de la pyramide.'],
    victoire: 'Le sommet est à toi.',
    duo: 'Ce duo ne se bat qu\'à deux contre deux.',
    sansFuite: 'Une force mystérieuse empêche de fuir !',
    escalier: 'Un escalier est apparu quelque part dans la salle !',
    fontaine: ['L\'eau de la fontaine brille doucement.', 'Boire à la fontaine ? Ton équipe sera soignée, mais les objets de soin que tu portes disparaîtront.'],
    fontaineBue: ['Tes Pokémon retrouvent toutes leurs forces !', 'Les objets de soin de ton Sac se sont dissous dans l\'eau.'],
    miseDeCote: 'Tes objets de soin sont mis de côté : tu les retrouveras en sortant de la pyramide.',
    rendus: 'Tes objets de soin te sont rendus.',
    arene: ['Deux portes mènent à cette arène, et deux aventuriers s\'y affrontent.', 'Le perdant redescend. Le gagnant est soigné et monte au sommet.'],
    reflet: 'Personne d\'autre n\'est venu par ces portes. Tu vas affronter le reflet d\'un autre aventurier.',
    sommet: ['Bienvenue au sommet.', 'Il n\'y a de place ici que pour un seul.'],
    gagneArene: 'Ta victoire est reconnue. Tes Pokémon sont soignés : monte au sommet !',
    perduArene: 'Le duel est perdu. Tu redescends au pied de la pyramide.',
    seulSommet: 'Personne d\'autre n\'a atteint le sommet. Il est à toi.',
    gagneSommet: 'Tu as atteint le sommet, et tu y es resté debout.',
  },
  recompense: { objets: { 'symbole-or-pyramide': 1 } },
};
