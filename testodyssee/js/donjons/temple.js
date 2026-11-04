// testodyssee/js/donjons/temple.js — le Temple des Éléments : un donjon à faire deux fois, avec les mêmes salles.
//
// Salle 1 (commune) : trois dalles et deux portes. Trois joueurs sur les trois dalles ouvrent la petite porte : le
//   temple à trois (niveaux 20 à 30). Un joueur qui a un Pokémon au niveau 40 sur la dalle d'or ouvre la grande porte,
//   pour lui seul : le temple en solo (niveaux 50 à 60).
// À trois : la Salle des Trois Portes (Feu, Eau, Plante ; chaque porte ne laisse passer qu'un joueur), un chemin par
//   joueur, une clé au bout de chacun ; les chemins se rejoignent dans la Salle des Clés, dont la porte s'ouvre avec
//   les trois clés. Le Gardien des Éléments se bat à trois contre trois, et derrière lui, une table et trois Poké Balls.
// En solo : les mêmes salles, mais on fait les trois chemins l'un après l'autre (un téléporteur ramène à la salle des
//   portes) ; derrière le Gardien, trois CT à usage unique pour un starter, dont on ne prend qu'une.
//
// À trois, chaque chemin a trois grandes salles (temple-chemins.js, dessinées par tools/temple-chemins.py) ; en solo,
// les chemins ne sont pour l'instant que des couloirs à leur élément (lave, eau, herbes hautes).
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

// les trois couloirs (provisoires) : larges et longs, le décor de leur élément sur les côtés
const COULOIR = [
  '#############',
  '######N######',
  '#####...#####',
  '###.......###',
  '##....K....##',
  '##.........##',
  '#xx.......xx#',
  '#xxx.....xxx#',
  '#xx.......xx#',
  '##...xxx...##',
  '##..xxxxx..##',
  '#x...xxx...x#',
  '#xx.......xx#',
  '#xxx.....xxx#',
  '#xx.......xx#',
  '##.........##',
  '##...xxx...##',
  '#xx.xxxxx.xx#',
  '#x...xxx...x#',
  '#...........#',
  '#xx.......xx#',
  '#xxx.....xxx#',
  '##xx.....xx##',
  '##.........##',
  '###.......###',
  '#####...#####',
  '######S######',
];
const couloir = (lettre) => COULOIR.map((r) => r.replace(/x/g, lettre));
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

// Pokémon sauvages des chemins à trois (niveaux 20 à 28)
export const SAUVAGES_TEMPLE = {
  f: [[77, 20, 25, 25], [126, 22, 26, 15], [218, 20, 25, 25], [322, 20, 25, 25], [324, 24, 28, 10]],
  e: [[170, 20, 25, 30], [118, 20, 25, 25], [61, 22, 26, 20], [116, 20, 25, 20], [171, 26, 28, 5]],
  p: [[114, 20, 25, 25], [44, 21, 25, 20], [70, 21, 25, 20], [274, 20, 25, 20], [357, 24, 28, 15]],
};
const SINGES = (n, boss) => [[512, n], [514, n], [516, n], [TEMPLE.arceus, boss]];

export default {
  id: 'temple',
  carte: 'labo:temple',
  nom: 'Temple des Éléments',
  niveau: 'niv. 20 à 30 à trois, 50 à 60 en solo',
  entree: 'Le feu, l\'eau, la plante. À trois, chacun suit un élément. Seul, il faut les maîtriser tous.',
  joueurs: { mode: 'groupe', n: 3 },
  musique: 'tower',
  equipe: 'debut',
  exterieur,
  voies: CHEMINS,
  voiesDe: { f: 'du ', e: 'de l\'', p: 'de la ' },
  portesDecor: { 1: 'porte_grille' },
  decor: { '%': 'caverock', '&': 'stalag', '[': 'counter', ']': 'counter' },
  objets: {
    G: { type: 'grandePorte', decor: 'porte_vide' },
    X: { type: 'dalleOr', sol: true, decor: 'dalle_or' },
    // à trois : une porte par joueur
    F: { type: 'voie', decor: 'porte_feu', voie: 'f' },
    A: { type: 'voie', decor: 'porte_eau', voie: 'e' },
    H: { type: 'voie', decor: 'porte_plante', voie: 'p' },
    // en solo : les mêmes portes, qu'on reprend autant qu'on veut
    R: { type: 'porteSolo', decor: 'porte_feu', chemin: 'f' },
    U: { type: 'porteSolo', decor: 'porte_eau', chemin: 'e' },
    W: { type: 'porteSolo', decor: 'porte_plante', chemin: 'p' },
    // le décor des chemins
    L: { type: 'tuile', sol: true, t: 'LAVA' },
    '~': { type: 'tuile', sol: true, t: 'WATER' },
    '"': { type: 'tuile', sol: true, t: 'TALL' },
    // les chemins à trois : rochers fissurés (Éclate-Roc), rochers à pousser (Force), escaliers et rebords, cascades,
    // arbres, broussailles, petits arbres à couper (Coupe), herbes sombres, fleurs et lianes qui pendent
    m: { type: 'tuile', sol: true, t: 'SMASH' },
    B: { type: 'tuile', sol: true, t: 'BOULDER' },
    E: { type: 'tuile', sol: true, t: 'STAIRS' },
    v: { type: 'tuile', sol: true, t: 'LEDGE' },
    '|': { type: 'tuile', sol: true, t: 'WATER', cascade: true },
    Y: { type: 'tuile', sol: true, t: 'TREE' },
    u: { type: 'tuile', sol: true, t: 'BUSH' },
    C: { type: 'tuile', sol: true, t: 'CUT' },
    h: { type: 'tuile', sol: true, t: 'DARKTALL' },
    f: { type: 'tuile', sol: true, t: 'FLOWER' },
    w: { type: 'liane', sol: true, decor: 'liane' },
    '=': { type: 'tuile', sol: true, t: 'BRIDGE' },
    // un rocher poussé sur * ouvre les barrières +, sur ^ les barrières -
    '*': { type: 'bouton', sol: true, decor: 'interrupteur', ouvre: '+' },
    '^': { type: 'bouton', sol: true, decor: 'interrupteur', ouvre: '-' },
    '+': { type: 'tuile', sol: true, t: 'BARRIER_R' },
    '-': { type: 'tuile', sol: true, t: 'BARRIER_R' },
    // des objets au fond des culs-de-sac
    I: { type: 'ramasser', objet: 'max-revive' },
    J: { type: 'ramasser', objet: 'full-restore' },
    O: { type: 'ramasser', objet: 'rare-candy' },
    P: { type: 'ramasser', objet: 'pp-up' },
    V: { type: 'ramasser', objet: 'ultra-ball', n: 3 },
    K: { type: 'cle', sol: true },
    Q: { type: 'porteCles', decor: 'porte_vide' },
    T: { type: 'teleporteur', sol: true, decor: 'teleporteur' },
    // la table : trois Poké Balls (à trois) ; en solo, elle attend sa récompense
    a: { type: 'starter', decor: 'counter', n: 0 },
    b: { type: 'starter', decor: 'counter', n: 1 },
    c: { type: 'starter', decor: 'counter', n: 2 },
    // en solo : trois CT, une seule à prendre (jeu avancé : Éruption, Giclédo, Jaillissève ; plus tôt : ctsTot)
    j: { type: 'ct', decor: 'counter', n: 0 },
    k: { type: 'ct', decor: 'counter', n: 1 },
    l: { type: 'ct', decor: 'counter', n: 2 },
  },
  pnj: {
    M: {
      id: 'gardien-trois', cls: 'Gardien', nom: 'des Éléments', sprite: 'pretre', dir: 'down', groupe: true,
      avant: ['Le feu, l\'eau et la plante vous ont menés jusqu\'ici.', 'Montrez-moi que vous savez les vaincre ensemble !'],
      apres: 'Vous avez dompté les trois éléments. La table est à vous : que chacun choisisse son compagnon.',
      equipe: SINGES(26, 30),
    },
    Z: {
      id: 'gardien-solo', cls: 'Gardien', nom: 'des Éléments', sprite: 'pretre', dir: 'down',
      defi: 'Seul, tu as traversé les trois éléments. Voyons si tu peux les vaincre tous à la fois !',
      perd: 'Tu les maîtrises tous. Ce qui est sur la table t\'appartient.',
      equipe: SINGES(56, 60),
    },
  },
  salles: [
    { id: 'e1', nom: 'Salle des Dalles', type: 'dalles', porte: '1', requis: 3, suivante: 'g2', plan: [
      '#################',
      '###N#############',
      '##111#####GGG####',
      '#...............#',
      '#...............#',
      '#...........X...#',
      '#...............#',
      '#...............#',
      '#....o..o..o....#',
      '#...............#',
      '#...............#',
      '########S########',
      '########D########',
    ] },
    // à trois
    { id: 'g2', nom: 'Salle des Trois Portes', type: 'voies', branche: 'groupe', voies: { F: 'gf1', A: 'ge1', H: 'gp1' }, plan: PORTES('F', 'A', 'H') },
    { id: 'gf1', nom: 'Pentes du Volcan', type: 'libre', branche: 'groupe', voie: 'f', biome: 'magma', sauvages: 'f', apres: ['g2'], plan: F1 },
    { id: 'gf2', nom: 'Gradins de Lave', type: 'libre', branche: 'groupe', voie: 'f', biome: 'magma', sauvages: 'f', apres: ['gf1'], plan: F2 },
    { id: 'gf3', nom: 'Cratère', type: 'libre', branche: 'groupe', voie: 'f', biome: 'magma', sauvages: 'f', cle: 'f', apres: ['gf2'], suivante: 'g4', plan: F3 },
    { id: 'ge1', nom: 'Bassin Profond', type: 'libre', branche: 'groupe', voie: 'e', biome: 'mer', sauvages: 'e', apres: ['g2'], plan: E1 },
    { id: 'ge2', nom: 'Grotte des Cascades', type: 'libre', branche: 'groupe', voie: 'e', biome: 'mer', sauvages: 'e', apres: ['ge1'], plan: E2 },
    { id: 'ge3', nom: 'Source', type: 'libre', branche: 'groupe', voie: 'e', biome: 'mer', sauvages: 'e', cle: 'e', apres: ['ge2'], suivante: 'g4', plan: E3 },
    { id: 'gp1', nom: 'Jardin Abandonné', type: 'libre', branche: 'groupe', voie: 'p', biome: 'terre', sauvages: 'p', apres: ['g2'], plan: P1 },
    { id: 'gp2', nom: 'Jungle Profonde', type: 'libre', branche: 'groupe', voie: 'p', biome: 'terre', sauvages: 'p', apres: ['gp1'], plan: P2 },
    { id: 'gp3', nom: 'Cœur de la Jungle', type: 'libre', branche: 'groupe', voie: 'p', biome: 'terre', sauvages: 'p', cle: 'p', apres: ['gp2'], suivante: 'g4', plan: P3 },
    { id: 'g4', nom: 'Salle des Clés', type: 'libre', branche: 'groupe', ouvertPar: 'porte', apres: ['gf3', 'ge3', 'gp3'], plan: CLES(false) },
    { id: 'g5', nom: 'Salle du Gardien', type: 'groupe', branche: 'groupe', pnj: ['M'], apres: ['g4'], suivante: null, table: 'starters', plan: GARDIEN('#....[abc]....#', 'M') },
    // en solo
    { id: 's2', nom: 'Salle des Trois Portes', type: 'libre', branche: 'solo', suivante: null, plan: PORTES('R', 'U', 'W').map((r) => r.replace('D', '#')) },
    { id: 'sf', nom: 'Chemin du Feu', type: 'libre', branche: 'solo', chemin: 'f', cle: 'f', suivante: 's4', plan: couloir('L') },
    { id: 'se', nom: 'Chemin de l\'Eau', type: 'libre', branche: 'solo', chemin: 'e', cle: 'e', suivante: 's4', plan: couloir('~') },
    { id: 'sp', nom: 'Chemin de la Plante', type: 'libre', branche: 'solo', chemin: 'p', cle: 'p', suivante: 's4', plan: couloir('"') },
    { id: 's4', nom: 'Salle des Clés', type: 'libre', branche: 'solo', ouvertPar: 'porte', plan: CLES(true) },
    { id: 's5', nom: 'Salle du Gardien', type: 'combat', branche: 'solo', pnj: ['Z'], apres: ['s4'], suivante: null, table: 'solo', plan: GARDIEN('#....[jkl]....#', 'Z') },
  ],
  // les CT du solo : `fin` si le donjon arrive tard dans le jeu, `tot` s'il arrive plus tôt
  cts: { fin: ['ct-eruption-temple', 'ct-gicledo-temple', 'ct-jaillisseve-temple'], tot: ['ct-surchauffe-temple', 'ct-lame-de-fond-temple', 'ct-tempete-verte-temple'] },
  ctsChoix: 'fin',
  inscriptions: {
    f: ['Porte du Feu.', 'Au bout du chemin, la Clé du Feu.'],
    e: ['Porte de l\'Eau.', 'Au bout du chemin, la Clé de l\'Eau.'],
    p: ['Porte de la Plante.', 'Au bout du chemin, la Clé de la Plante.'],
  },
  journal: [
    { id: 'dalles', nom: 'Les dalles', salle: 'e1', but: 'À trois, un joueur sur chaque dalle ouvre la petite porte. Seul, avec un Pokémon au niveau 40, la dalle d\'or ouvre la grande.' },
    { id: 'cles', nom: 'Les trois clés', salle: 'e1', but: 'Au bout de chaque chemin, une clé. La porte de la Salle des Clés s\'ouvre avec les trois.' },
    { id: 'gardien', nom: 'Le Gardien des Éléments', salle: 'e1', but: 'Bats le Gardien. Derrière lui, une table t\'attend.' },
  ],
  textes: {
    masque: 'Le Gardien des Éléments vous attend.',
    perdu: ['Tes Pokémon n\'en peuvent plus...', 'Tu te réveilles à l\'entrée de la salle. Ton équipe a été soignée.'],
    victoire: 'Le Temple vous reconnaît.',
  },
};
