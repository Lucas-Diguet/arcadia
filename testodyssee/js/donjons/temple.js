// testodyssee/js/donjons/temple.js — le Temple des Éléments : deux donjons derrière un même hall.
//
// Le Grand Hall : des dresseurs qui se préparent, un vieil homme qui explique le temple, et deux portes.
//   À gauche, la Salle des Dalles : trois joueurs sur les trois dalles ouvrent la petite porte, le temple à trois
//   (niveaux 20 à 30). À droite, un moine ne laisse passer que les dresseurs à 10 badges : la Salle de la Dalle d'Or
//   et sa grande porte, le temple en solo (niveaux 50 à 65).
// À trois : la Salle des Trois Portes (Feu, Eau, Plante ; chaque porte ne laisse passer qu'un joueur), un chemin par
//   joueur, une clé au bout de chacun ; les chemins se rejoignent dans la Salle des Clés, dont la porte s'ouvre avec
//   les trois clés. Le Gardien des Éléments se bat à trois contre trois (ses trois singes, puis Tauros et ses cinq
//   blocs de vie quand ils sont tous K.O.), et derrière lui, une table et trois Poké Balls.
// En solo : les mêmes neuf salles, mais reliées entre elles. On n'entre que par la Plante (les portes du Feu et de
//   l'Eau sont scellées de l'intérieur) ; des points d'eau, un tunnel de lave et une liane font passer d'un chemin à
//   l'autre (`recoins`), et trois verrous demandent ce qu'on trouve dans un autre chemin (`verrou`) : la Braise du Feu
//   brûle les ronces géantes de la Plante, la Graine de la Plante assèche le torrent de l'Eau, l'eau de la Source
//   éteint le mur de flammes du Feu. Derrière le Gardien, trois CT à usage unique pour un starter, dont on ne prend
//   qu'une.
//
// Chaque chemin a trois grandes salles (temple-chemins.js, dessinées par tools/temple-chemins.py) :
//   Feu : barrières, interrupteurs et rochers à pousser sur un long trajet ; Eau : un labyrinthe de bassins et de
//   rivières qui emportent le surfeur ; Plante : un labyrinthe de haies, des ronces et l'arbuste d'où elles viennent.
import { GameMap, rng } from '../../../odyssee/js/world/mapgen.js';
import { T } from '../../../odyssee/js/world/tiles.js';
import { TEMPLE } from '../formes.js';
import { F1, F2, F3, E1, E2, E3, P1, P2, P3 } from './temple-chemins.js';

const CHEMINS = { f: 'Feu', e: 'Eau', p: 'Plante' };

function exterieur() {
  const m = new GameMap('labo:temple:dehors', 32, 26, { outdoor: true, fill: T.TREE, name: 'Parvis du Temple', music: 'route' });
  m.blob(16, 13, 12.5, 10, T.GRASS, rng(4242));
  m.rect(5, 3, 26, 22, T.GRASS, [T.TREE]);
  const b = m.building('gym', 12, 4, { roof: 'red', name: 'Temple des Éléments' });
  for (let y = b.doorY + 1; y <= 23; y++) m.set(b.doorX, y, T.PATH);
  m.rect(b.doorX - 1, b.doorY + 1, b.doorX + 1, b.doorY + 2, T.PATH);
  // trois bassins : la lave, l'eau, les fleurs
  m.rect(6, 12, 9, 15, T.LAVA); m.rect(22, 12, 25, 15, T.WATER); m.rect(7, 18, 10, 20, T.FLOWER, [T.GRASS]); m.rect(21, 18, 24, 20, T.FLOWER, [T.GRASS]);
  for (const [x, y] of [[11, 10], [20, 10]]) m.prop('lanterne', x, y);
  m.zone(0, 0, 31, 25, { name: 'Parvis du Temple', music: 'route' });
  return { carte: m, porte: [b.doorX, b.doorY] };
}

// chemins : x et z sont deux recoins (rien à trois, des passages et des objets en solo) ; une sortie D sous l'arrivée
// ramène à la salle d'avant
const retour = (plan) => { const i = plan[plan.length - 1].indexOf('S'); return [...plan, '#'.repeat(i) + 'D' + '#'.repeat(plan[0].length - i - 1)]; };
const [F1r, F2r, F3r, E1r, E2r, E3r, P1r, P2r, P3r] = [F1, F2, F3, E1, E2, E3, P1, P2, P3].map(retour);

// le Grand Hall : deux portes en haut (e : la Salle des Dalles, p : le temple en solo, gardé par le moine @),
// le vieil homme ! près de l'entrée, des dresseurs qui se préparent
const HALL = (() => {
  const w = 35, h = 17, g = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => (y === 0 || y >= h - 2 || x === 0 || x === w - 1 || y === 1 ? '#' : '.')));
  const pose = (x, y, c) => { g[y][x] = c; };
  pose(5, 1, 'e'); pose(29, 1, 'p'); pose(29, 2, '@');
  pose(17, h - 2, 'S'); pose(17, h - 1, 'D'); pose(15, h - 4, '!');
  for (const [x, y] of [[3, 4], [31, 4], [3, 11], [31, 11], [11, 4], [23, 4], [11, 11], [23, 11]]) pose(x, y, '&');
  for (const [x, y, c] of [[7, 5, '$'], [13, 7, ':'], [20, 6, ';'], [26, 8, ','], [9, 10, '/'], [22, 12, '_'], [28, 12, '?']]) pose(x, y, c);
  return g.map((r) => r.join(''));
})();
// la Salle des Clés : la porte aux trois gemmes ; en solo, le téléporteur qui ramène aux trois portes
const CLES = (solo) => [
  '###############',
  '#######N#######',
  '######QQQ######',
  '##...........##',
  '#.............#',
  '#.............#',
  solo ? '#......T......#' : '#.............#',
  '#.............#',
  '##...........##',
  '#######S#######',
];
// la salle du Gardien : la table derrière lui
const GARDIEN = (table, boss) => [
  '###############',
  '#.............#',
  table,
  '#.............#',
  `#......${boss}......#`,
  '#.............#',
  '#.............#',
  '#.............#',
  '##...........##',
  '#######S#######',
];
const PORTES = (a, b, c) => [
  '#######################',
  `###${a}#######${b}#######${c}###`,
  '#.....................#',
  '#.....................#',
  '#.....................#',
  '#.....................#',
  '#.....................#',
  '#.....................#',
  '#.....................#',
  '###########S###########',
  '###########D###########',
];

// Pokémon sauvages des chemins : à trois (niveaux 20 à 28), en solo (niveaux 50 à 58)
export const SAUVAGES_TEMPLE = {
  f: [[77, 20, 25, 25], [126, 22, 26, 15], [218, 20, 25, 25], [322, 20, 25, 25], [324, 24, 28, 10]],
  e: [[170, 20, 25, 30], [118, 20, 25, 25], [61, 22, 26, 20], [116, 20, 25, 20], [171, 26, 28, 5]],
  p: [[114, 20, 25, 25], [44, 21, 25, 20], [70, 21, 25, 20], [274, 20, 25, 20], [357, 24, 28, 15]],
  fs: [[78, 50, 55, 25], [126, 52, 56, 15], [219, 50, 55, 25], [323, 52, 56, 25], [324, 54, 58, 10]],
  es: [[171, 50, 55, 30], [119, 50, 55, 25], [62, 52, 56, 20], [117, 50, 55, 20], [130, 54, 58, 5]],
  ps: [[465, 50, 55, 25], [45, 51, 55, 20], [71, 51, 55, 20], [275, 50, 55, 20], [357, 54, 58, 15]],
};
const SINGES = [[512, 30], [514, 30], [516, 30]];
const NIDO = ['ice-beam', 'thunderbolt', 'sludge-wave', 'earth-power'];

// dresseurs du hall : ils parlent, on ne les combat pas
const H = (id, sprite, dir, cls, nom, dit) => ({ id, sprite, dir, cls, nom, dit, toujours: true });

export default {
  id: 'temple',
  carte: 'labo:temple',
  nom: 'Temple des Éléments',
  niveau: 'niv. 20 à 30 à trois, 50 à 65 en solo',
  entree: 'Le feu, l\'eau, la plante. À trois, chacun suit un élément. Seul, il faut les maîtriser tous.',
  joueurs: { mode: 'groupe', n: 3 },
  musique: 'tower',
  equipe: 'debut',
  exterieur,
  voies: CHEMINS,
  voiesDe: { f: 'du ', e: 'de l\'', p: 'de la ' },
  portesDecor: { 1: 'porte_grille' },
  decor: { '%': 'caverock', '&': 'stalag', '[': 'counter', ']': 'counter' },
  /** badges demandés par le moine pour le temple en solo */
  badgesSolo: 10,
  objets: {
    // le hall : la porte de la Salle des Dalles, celle du temple en solo (derrière le moine)
    e: { type: 'porteHall', decor: 'porte_hall', vers: 'e1' },
    p: { type: 'porteHall', decor: 'porte_hall', vers: 'eo', moine: true },
    G: { type: 'grandePorte', decor: 'porte_vide' },
    X: { type: 'dalleOr', sol: true, decor: 'dalle_or' },
    // à trois : une porte par joueur
    F: { type: 'voie', decor: 'porte_feu', voie: 'f' },
    A: { type: 'voie', decor: 'porte_eau', voie: 'e' },
    H: { type: 'voie', decor: 'porte_plante', voie: 'p' },
    // en solo : les mêmes portes ; celles du Feu et de l'Eau sont scellées tant qu'on n'est pas arrivé derrière
    R: { type: 'porteSolo', decor: 'porte_feu', chemin: 'f' },
    U: { type: 'porteSolo', decor: 'porte_eau', chemin: 'e' },
    W: { type: 'porteSolo', decor: 'porte_plante', chemin: 'p' },
    // le décor des chemins
    L: { type: 'tuile', sol: true, t: 'LAVA' },
    '~': { type: 'tuile', sol: true, t: 'WATER' },
    '"': { type: 'tuile', sol: true, t: 'TALL' },
    // Feu : rochers fissurés (Éclate-Roc), rochers à pousser (Force), ponts ; un rocher poussé sur * ouvre les
    // barrières +, sur ^ les barrières -
    m: { type: 'tuile', sol: true, t: 'SMASH' },
    B: { type: 'tuile', sol: true, t: 'BOULDER' },
    '=': { type: 'tuile', sol: true, t: 'BRIDGE' },
    '*': { type: 'bouton', sol: true, decor: 'interrupteur', ouvre: '+' },
    '^': { type: 'bouton', sol: true, decor: 'interrupteur', ouvre: '-' },
    '+': { type: 'tuile', sol: true, t: 'BARRIER_R' },
    '-': { type: 'tuile', sol: true, t: 'BARRIER_R' },
    // Eau : les rivières emportent le surfeur dans leur sens
    '<': { type: 'courant', sol: true, dir: 'left' },
    '>': { type: 'courant', sol: true, dir: 'right' },
    '(': { type: 'courant', sol: true, dir: 'up' },
    ')': { type: 'courant', sol: true, dir: 'down' },
    // Plante : arbres, broussailles, herbes, fleurs, lianes ; un arbuste coupé fait tomber les ronces de sa couleur
    Y: { type: 'tuile', sol: true, t: 'TREE' },
    u: { type: 'tuile', sol: true, t: 'BUSH' },
    h: { type: 'tuile', sol: true, t: 'DARKTALL' },
    f: { type: 'tuile', sol: true, t: 'FLOWER' },
    w: { type: 'liane', sol: true, decor: 'liane' },
    r: { type: 'arbuste', decor: 'arbuste_rouge', couleur: 'rouges', ouvre: 't' },
    y: { type: 'arbuste', decor: 'arbuste_jaune', couleur: 'jaunes', ouvre: 'd' },
    q: { type: 'arbuste', decor: 'arbuste_violet', couleur: 'violettes', ouvre: 'g' },
    t: { type: 'ronces', decor: 'ronces_rouge', couleur: 'rouges' },
    d: { type: 'ronces', decor: 'ronces_jaune', couleur: 'jaunes' },
    g: { type: 'ronces', decor: 'ronces_violet', couleur: 'violettes' },
    // deux recoins par salle : rien à trois ; en solo, ce que dit `recoins` de la salle
    x: { type: 'recoin', sol: true },
    z: { type: 'recoin', sol: true },
    // des objets au fond des culs-de-sac
    I: { type: 'ramasser', objet: 'max-revive' },
    J: { type: 'ramasser', objet: 'full-restore' },
    O: { type: 'ramasser', objet: 'rare-candy' },
    P: { type: 'ramasser', objet: 'pp-up' },
    V: { type: 'ramasser', objet: 'ultra-ball', n: 3 },
    K: { type: 'cle', sol: true },
    Q: { type: 'porteCles', decor: 'porte_vide' },
    T: { type: 'teleporteur', sol: true, decor: 'teleporteur' },
    // la table : trois Poké Balls (à trois) ; en solo, trois CT
    a: { type: 'starter', decor: 'counter', n: 0 },
    b: { type: 'starter', decor: 'counter', n: 1 },
    c: { type: 'starter', decor: 'counter', n: 2 },
    j: { type: 'ct', decor: 'counter', n: 0 },
    k: { type: 'ct', decor: 'counter', n: 1 },
    l: { type: 'ct', decor: 'counter', n: 2 },
  },
  pnj: {
    '!': {
      id: 'ancien', sprite: 'vieil_homme', dir: 'down', cls: '', nom: 'Vieil homme', toujours: true,
      dit: ['Bienvenue au Temple des Éléments, jeune dresseur.', 'Ce temple abrite deux épreuves.',
        'La première, par la porte de gauche, est faite pour les dresseurs novices. On l\'affronte à trois : trois dalles, trois portes, trois chemins. Chacun suit son élément, et vous vous retrouvez devant le Gardien.',
        'La seconde, par la porte de droite, est bien plus dangereuse. On y entre seul, et les trois chemins s\'y mêlent. Le moine n\'y laisse passer que les dresseurs confirmés : dix badges, pas un de moins.',
        'Prépare-toi bien. Le feu, l\'eau et la plante ne pardonnent rien.'],
    },
    '@': { id: 'moine', sprite: 'pretre', dir: 'down', cls: '', nom: 'Moine', toujours: true, moine: true },
    $: H('hall-1', 'gamin', 'right', 'Gamin', 'Tom', ['On attend notre troisième équipier. Il est toujours en retard !', 'Moi, je prends la porte du Feu. J\'ai un Pokémon Eau, ça va être du gâteau.']),
    ':': H('hall-2', 'fillette', 'left', 'Fillette', 'Zoé', ['Il paraît qu\'au bout du chemin de l\'Eau, les rivières te ramènent au départ si tu te trompes.', 'Il faut bien regarder dans quel sens va le courant avant de se lancer.']),
    ';': H('hall-3', 'montagnard', 'down', 'Montagnard', 'Hervé', ['Dans le chemin du Feu, les barrières ne s\'ouvrent qu\'avec un rocher posé sur leur interrupteur.', 'Et le rocher n\'est jamais à côté ! J\'ai poussé pendant une heure.']),
    ',': H('hall-4', 'topdresseuse', 'left', 'Topdresseuse', 'Inès', ['Le temple en solo ? J\'y suis entrée une fois. Les trois chemins communiquent, on passe de l\'un à l\'autre sans arrêt.', 'Ce qu\'on trouve dans le feu sert dans la plante, ce qu\'on trouve dans la plante sert dans l\'eau... Je n\'en dis pas plus.']),
    '/': H('hall-5', 'jardinier', 'up', 'Jardinier', 'Basile', ['Les ronces du chemin de la Plante viennent toujours d\'un arbuste tout proche, aux fleurs de la même couleur.', 'Coupe l\'arbuste, les ronces tombent. Encore faut-il trouver par où l\'atteindre !']),
    _: H('hall-6', 'karateka', 'up', 'Karatéka', 'Kenji', ['Le Gardien garde son Pokémon le plus fort pour la fin.', 'Tant qu\'un seul de ses trois singes tient debout, il ne l\'envoie pas.']),
    '?': H('hall-7', 'scientifique', 'left', 'Scientifique', 'Odile', ['J\'étudie la table du Gardien. Trois Poké Balls pour ceux qui viennent à trois, trois CT pour celui qui vient seul.', 'Dans les deux cas, on n\'en prend qu\'une.']),
    M: {
      id: 'gardien-trois', cls: 'Gardien', nom: 'des Éléments', sprite: 'pretre', dir: 'down', groupe: true,
      avant: ['Le feu, l\'eau et la plante vous ont menés jusqu\'ici.', 'Montrez-moi que vous savez les vaincre ensemble !'],
      apres: 'Vous avez dompté les trois éléments. La table est à vous : que chacun choisisse son compagnon.',
      reste: 'Félicitations pour avoir triomphé de cette épreuve. Vous pouvez à présent choisir une récompense sur la table derrière moi.',
      // les trois singes ensemble ; Tauros n'arrive que quand ils sont tous K.O., avec cinq blocs de vie
      equipe: [...SINGES, [128, 45, { blocs: 5, attend: true }]],
    },
    Z: {
      id: 'gardien-solo', cls: 'Gardien', nom: 'des Éléments', sprite: 'pretre', dir: 'down',
      defi: 'Seul, tu as traversé les trois éléments. Voyons si tu peux les vaincre tous à la fois !',
      perd: 'Tu les maîtrises tous. Ce qui est sur la table t\'appartient.',
      reste: 'Félicitations pour avoir triomphé de cette épreuve. Tu peux à présent choisir une récompense sur la table derrière moi.',
      // [espèce, niveau, objet, attaques, talent, { blocs }]
      equipe: [
        [31, 60, null, NIDO, 'sheer-force'],
        [34, 60, null, NIDO, 'sheer-force'],
        [143, 63, null, ['body-slam', 'fire-punch', 'ice-punch', 'thunder-punch'], 'thick-fat'],
        [392, 65, 'charcoal', ['flare-blitz', 'close-combat', 'u-turn', 'mach-punch'], 'blaze', { blocs: 3 }],
        [389, 65, 'miracle-seed', ['wood-hammer', 'earthquake', 'stone-edge', 'synthesis'], 'overgrow', { blocs: 3 }],
        [395, 65, 'mystic-water', ['surf', 'ice-beam', 'flash-cannon', 'aqua-jet'], 'torrent', { blocs: 3 }],
      ],
    },
  },
  salles: [
    { id: 'h0', nom: 'Grand Hall', type: 'libre', suivante: null, repere: 'S', plan: HALL },
    { id: 'e1', nom: 'Salle des Dalles', type: 'dalles', porte: '1', requis: 3, suivante: 'g2', retour: ['h0', 'e'], plan: [
      '###############',
      '#######N#######',
      '######111######',
      '#.............#',
      '#.............#',
      '#...o..o..o...#',
      '#.............#',
      '#.............#',
      '#######S#######',
      '#######D#######',
    ] },
    // à trois
    { id: 'g2', nom: 'Salle des Trois Portes', type: 'voies', branche: 'groupe', voies: { F: 'gf1', A: 'ge1', H: 'gp1' }, plan: PORTES('F', 'A', 'H') },
    { id: 'gf1', nom: 'Pentes du Volcan', type: 'libre', branche: 'groupe', voie: 'f', biome: 'magma', sauvages: 'f', apres: ['g2'], plan: F1r },
    { id: 'gf2', nom: 'Gradins de Lave', type: 'libre', branche: 'groupe', voie: 'f', biome: 'magma', sauvages: 'f', apres: ['gf1'], plan: F2r },
    { id: 'gf3', nom: 'Cratère', type: 'libre', branche: 'groupe', voie: 'f', biome: 'magma', sauvages: 'f', cle: 'f', apres: ['gf2'], suivante: 'g4', plan: F3r },
    { id: 'ge1', nom: 'Bassin Profond', type: 'libre', branche: 'groupe', voie: 'e', biome: 'mer', sauvages: 'e', apres: ['g2'], plan: E1r },
    { id: 'ge2', nom: 'Grotte des Courants', type: 'libre', branche: 'groupe', voie: 'e', biome: 'mer', sauvages: 'e', apres: ['ge1'], plan: E2r },
    { id: 'ge3', nom: 'Source', type: 'libre', branche: 'groupe', voie: 'e', biome: 'mer', sauvages: 'e', cle: 'e', apres: ['ge2'], suivante: 'g4', plan: E3r },
    { id: 'gp1', nom: 'Jardin Abandonné', type: 'libre', branche: 'groupe', voie: 'p', biome: 'terre', sauvages: 'p', apres: ['g2'], plan: P1r },
    { id: 'gp2', nom: 'Jungle Profonde', type: 'libre', branche: 'groupe', voie: 'p', biome: 'terre', sauvages: 'p', apres: ['gp1'], plan: P2r },
    { id: 'gp3', nom: 'Cœur de la Jungle', type: 'libre', branche: 'groupe', voie: 'p', biome: 'terre', sauvages: 'p', cle: 'p', apres: ['gp2'], suivante: 'g4', plan: P3r },
    { id: 'g4', nom: 'Salle des Clés', type: 'libre', branche: 'groupe', ouvertPar: 'porte', apres: ['gf3', 'ge3', 'gp3'], plan: CLES(false) },
    { id: 'g5', nom: 'Salle du Gardien', type: 'groupe', branche: 'groupe', pnj: ['M'], apres: ['g4'], suivante: null, table: 'starters', plan: GARDIEN('#....[abc]....#', 'M') },
    // en solo : la dalle d'or, puis les mêmes salles reliées entre elles
    { id: 'eo', nom: 'Salle de la Dalle d\'Or', type: 'libre', suivante: null, retour: ['h0', 'p'], plan: [
      '###############',
      '######GGG######',
      '#.............#',
      '#.............#',
      '#......X......#',
      '#.............#',
      '#.............#',
      '#######S#######',
      '#######D#######',
    ] },
    { id: 's2', nom: 'Salle des Trois Portes', type: 'libre', branche: 'solo', suivante: null, plan: PORTES('R', 'U', 'W').map((r) => r.replace('D', '#')) },
    { id: 'sp1', nom: 'Jardin Abandonné', type: 'libre', branche: 'solo', chemin: 'p', biome: 'terre', sauvages: 'ps', suivante: 'sp2', retour: ['s2', 'W'], plan: P1r,
      verrou: { type: 'ronces', objet: 'braise' },
      recoins: { z: { type: 'passage', genre: 'eau', vers: ['se1', 'x'] } } },
    { id: 'sp2', nom: 'Jungle Profonde', type: 'libre', branche: 'solo', chemin: 'p', biome: 'terre', sauvages: 'ps', suivante: 'sp3', plan: P2r,
      recoins: { z: { type: 'objet', objet: 'graine' } } },
    { id: 'sp3', nom: 'Cœur de la Jungle', type: 'libre', branche: 'solo', chemin: 'p', biome: 'terre', sauvages: 'ps', cle: 'p', suivante: 's4', plan: P3r,
      recoins: { z: { type: 'passage', genre: 'liane', lien: 'liane', maitre: true, vers: ['sf2', 'z'] }, x: { type: 'passage', genre: 'eau', lien: 'bassin', vers: ['se3', 'x'] } } },
    { id: 'se1', nom: 'Bassin Profond', type: 'libre', branche: 'solo', chemin: 'e', biome: 'mer', sauvages: 'es', suivante: 'se2', retour: ['s2', 'U'], plan: E1r,
      recoins: { x: { type: 'passage', genre: 'eau', vers: ['sp1', 'z'] } } },
    { id: 'se2', nom: 'Grotte des Courants', type: 'libre', branche: 'solo', chemin: 'e', biome: 'mer', sauvages: 'es', suivante: 'se3', plan: E2r,
      verrou: { type: 'torrent', objet: 'graine' },
      recoins: { z: { type: 'passage', genre: 'lave', vers: ['sf1', 'x'] } } },
    { id: 'se3', nom: 'Source', type: 'libre', branche: 'solo', chemin: 'e', biome: 'mer', sauvages: 'es', cle: 'e', suivante: 's4', plan: E3r,
      recoins: { x: { type: 'passage', genre: 'eau', lien: 'bassin', maitre: true, vers: ['sp3', 'x'] }, z: { type: 'source' } } },
    { id: 'sf1', nom: 'Pentes du Volcan', type: 'libre', branche: 'solo', chemin: 'f', biome: 'magma', sauvages: 'fs', suivante: 'sf2', retour: ['s2', 'R'], plan: F1r,
      recoins: { x: { type: 'passage', genre: 'lave', vers: ['se2', 'z'] }, z: { type: 'objet', objet: 'braise' } } },
    { id: 'sf2', nom: 'Gradins de Lave', type: 'libre', branche: 'solo', chemin: 'f', biome: 'magma', sauvages: 'fs', suivante: 'sf3', plan: F2r,
      verrou: { type: 'flammes', objet: 'eau' },
      recoins: { x: { type: 'objet', objet: 'jarre' }, z: { type: 'passage', genre: 'liane', lien: 'liane', vers: ['sp3', 'z'] } } },
    { id: 'sf3', nom: 'Cratère', type: 'libre', branche: 'solo', chemin: 'f', biome: 'magma', sauvages: 'fs', cle: 'f', suivante: 's4', plan: F3r },
    { id: 's4', nom: 'Salle des Clés', type: 'libre', branche: 'solo', ouvertPar: 'porte', plan: CLES(true) },
    { id: 's5', nom: 'Salle du Gardien', type: 'combat', branche: 'solo', pnj: ['Z'], apres: ['s4'], suivante: null, table: 'solo', plan: GARDIEN('#....[jkl]....#', 'Z') },
  ],
  // ce qu'on trouve dans un chemin du solo et qui sert dans un autre (objets du Sac, contenu.js)
  tresors: {
    braise: { objet: 'braise-eternelle', decor: 'tresor_braise', vu: 'Une braise qui ne s\'éteint pas, posée sur une pierre noire.' },
    graine: { objet: 'graine-geante', decor: 'tresor_graine', vu: 'Une graine grosse comme le poing, qui palpite doucement.' },
    jarre: { objet: 'jarre-vide', decor: 'tresor_jarre', vu: 'Une vieille jarre de terre cuite. Elle est vide.' },
  },
  // les CT du solo : `fin` si le donjon arrive tard dans le jeu, `tot` s'il arrive plus tôt
  cts: { fin: ['ct-eruption-temple', 'ct-gicledo-temple', 'ct-jaillisseve-temple'], tot: ['ct-surchauffe-temple', 'ct-lame-de-fond-temple', 'ct-tempete-verte-temple'] },
  ctsChoix: 'fin',
  inscriptions: {
    f: ['Porte du Feu.', 'Au bout du chemin, la Clé du Feu.'],
    e: ['Porte de l\'Eau.', 'Au bout du chemin, la Clé de l\'Eau.'],
    p: ['Porte de la Plante.', 'Au bout du chemin, la Clé de la Plante.'],
  },
  journal: [
    { id: 'dalles', nom: 'Les deux portes', salle: 'h0', but: 'À trois, un joueur sur chaque dalle ouvre la petite porte. Seul, avec dix badges, le moine laisse passer vers la dalle d\'or.' },
    { id: 'cles', nom: 'Les trois clés', salle: 'h0', but: 'Au bout de chaque chemin, une clé. La porte de la Salle des Clés s\'ouvre avec les trois.' },
    { id: 'gardien', nom: 'Le Gardien des Éléments', salle: 'h0', but: 'Bats le Gardien. Derrière lui, une table t\'attend.' },
  ],
  textes: {
    masque: 'Le Gardien des Éléments vous attend.',
    perdu: ['Tes Pokémon n\'en peuvent plus...', 'Tu te réveilles à l\'entrée de la salle. Ton équipe a été soignée.'],
    victoire: 'Le Temple vous reconnaît.',
  },
};
