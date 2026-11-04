// testodyssee/js/donjons/temple.js — le Temple des Éléments : un donjon à faire deux fois, avec les mêmes salles.
//
// Salle 1 (commune) : trois dalles et deux portes. Trois joueurs sur les trois dalles ouvrent la petite porte : le
//   temple à trois (niveaux 20 à 30). Un joueur qui a un Pokémon au niveau 40 sur la dalle d'or ouvre la grande porte,
//   pour lui seul : le temple en solo (niveaux 50 à 60).
// À trois : la Salle des Trois Portes (Feu, Eau, Plante ; chaque porte ne laisse passer qu'un joueur), un chemin par
//   joueur, une clé au bout de chacun ; les chemins se rejoignent dans la Salle des Clés, dont la porte s'ouvre avec
//   les trois clés. Le Gardien des Éléments se bat à trois contre trois, et derrière lui, une table et trois Poké Balls.
// En solo : les mêmes salles, mais on fait les trois chemins l'un après l'autre (un téléporteur ramène à la salle des
//   portes) ; derrière le Gardien, une table encore vide (sa récompense viendra plus tard).
//
// Les chemins ne sont pour l'instant que des couloirs à leur élément (lave, eau, herbes hautes).
import { GameMap, rng } from '../../../odyssee/js/world/mapgen.js';
import { T } from '../../../odyssee/js/world/tiles.js';
import { TEMPLE } from '../formes.js';

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
    K: { type: 'cle', sol: true },
    Q: { type: 'porteCles', decor: 'porte_vide' },
    T: { type: 'teleporteur', sol: true, decor: 'teleporteur' },
    // la table : trois Poké Balls (à trois) ; en solo, elle attend sa récompense
    a: { type: 'starter', decor: 'counter', n: 0 },
    b: { type: 'starter', decor: 'counter', n: 1 },
    c: { type: 'starter', decor: 'counter', n: 2 },
    v: { type: 'tableSolo', decor: 'counter' },
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
    { id: 'g2', nom: 'Salle des Trois Portes', type: 'voies', branche: 'groupe', voies: { F: 'gf', A: 'ge', H: 'gp' }, plan: PORTES('F', 'A', 'H') },
    { id: 'gf', nom: 'Chemin du Feu', type: 'libre', branche: 'groupe', voie: 'f', cle: 'f', apres: ['g2'], suivante: 'g4', plan: couloir('L') },
    { id: 'ge', nom: 'Chemin de l\'Eau', type: 'libre', branche: 'groupe', voie: 'e', cle: 'e', apres: ['g2'], suivante: 'g4', plan: couloir('~') },
    { id: 'gp', nom: 'Chemin de la Plante', type: 'libre', branche: 'groupe', voie: 'p', cle: 'p', apres: ['g2'], suivante: 'g4', plan: couloir('"') },
    { id: 'g4', nom: 'Salle des Clés', type: 'libre', branche: 'groupe', ouvertPar: 'porte', apres: ['gf', 'ge', 'gp'], plan: CLES(false) },
    { id: 'g5', nom: 'Salle du Gardien', type: 'groupe', branche: 'groupe', pnj: ['M'], apres: ['g4'], suivante: null, table: 'starters', plan: GARDIEN('#....[abc]....#', 'M') },
    // en solo
    { id: 's2', nom: 'Salle des Trois Portes', type: 'libre', branche: 'solo', suivante: null, plan: PORTES('R', 'U', 'W').map((r) => r.replace('D', '#')) },
    { id: 'sf', nom: 'Chemin du Feu', type: 'libre', branche: 'solo', chemin: 'f', cle: 'f', suivante: 's4', plan: couloir('L') },
    { id: 'se', nom: 'Chemin de l\'Eau', type: 'libre', branche: 'solo', chemin: 'e', cle: 'e', suivante: 's4', plan: couloir('~') },
    { id: 'sp', nom: 'Chemin de la Plante', type: 'libre', branche: 'solo', chemin: 'p', cle: 'p', suivante: 's4', plan: couloir('"') },
    { id: 's4', nom: 'Salle des Clés', type: 'libre', branche: 'solo', ouvertPar: 'porte', plan: CLES(true) },
    { id: 's5', nom: 'Salle du Gardien', type: 'combat', branche: 'solo', pnj: ['Z'], apres: ['s4'], suivante: null, table: 'solo', plan: GARDIEN('#....[[v[]....#', 'Z') },
  ],
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
