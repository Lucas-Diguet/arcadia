// testodyssee/js/donjons/cristal.js — le Bastion du Cristal : un donjon de 2 à 4 joueurs, où l'on défend ensemble.
//
// Deux cours gardent chacune un cristal. Quand on le touche, les pillards arrivent par vagues, par toutes les
// entrées à la fois, et marchent vers lui. Chacun se place pour leur barrer la route : un pillard qui passe à côté
// d'un joueur l'engage (combat chez ce joueur), un pillard qui atteint le cristal le frappe. Les éclaireurs courent,
// les pillards marchent, les colosses avancent lentement mais frappent fort. Plus il y a de défenseurs, plus il y a
// de pillards : il faut se répartir les entrées. Si le cristal tombe, la défense est à recommencer.
// Au sommet, le capitaine des pillards et son Tyranocif, en combat à plusieurs.
// Règles de la défense : js/donjon/defense.js ; dans la partie : js/donjon/cristal.js.
import { GameMap, rng } from '../../../odyssee/js/world/mapgen.js';
import { T } from '../../../odyssee/js/world/tiles.js';

/** l'extérieur : le bastion sur sa colline, au bout d'un chemin de garde */
function exterieur() {
  const m = new GameMap('labo:cristal:dehors', 32, 24, { outdoor: true, fill: T.TREE, name: 'Colline du Bastion', music: 'route' });
  m.blob(16, 13, 13, 9, T.GRASS, rng(6262));
  m.rect(4, 6, 27, 21, T.GRASS, [T.TREE]);
  const b = m.building('tower', 14, 3, { name: 'Bastion du Cristal', roof: 'brown' });
  for (let y = b.doorY + 1; y <= 20; y++) m.set(b.doorX, y, T.PATH);
  for (const [x, y] of [[11, 9], [19, 9], [11, 14], [19, 14]]) m.prop('lanterne', x, y);
  for (const [x, y] of [[7, 11], [24, 12], [8, 18], [23, 18]]) m.prop('caisses', x, y);
  m.zone(0, 0, 31, 23, { name: 'Colline du Bastion', music: 'route' });
  return { carte: m, porte: [b.doorX, b.doorY] };
}

export default {
  id: 'cristal',
  carte: 'labo:cristal',
  nom: 'Bastion du Cristal',
  niveau: 'niv. 60',
  entree: 'Les pillards veulent les cristaux du bastion. Défendez-les ensemble, chacun à son entrée.',
  joueurs: { mode: 'entre', min: 2, max: 4 },
  musique: 'tower',
  equipe: 'fin',
  style: 'bois',
  exterieur,
  // les pillards de la défense : pas (une case tous les n pas de la défense), dégâts au cristal, équipes possibles
  ennemis: {
    eclaireur: { cls: 'Pillard', nom: 'éclaireur', sprite: 'voleur', pas: 1, degats: 1, cri: 'Hé ! Pousse-toi de mon chemin !', perd: 'Je... je file !',
      equipes: [[[229, 55]], [[571, 55]], [[452, 55]], [[553, 55]], [[635, 54]]] },
    pillard: { cls: 'Pillard', nom: 'rôdeur', sprite: 'eclipse_m', pas: 2, degats: 2, cri: 'Ce cristal vaut une fortune. Écarte-toi !', perd: 'Tu ne les arrêteras pas tous.',
      equipes: [[[560, 56], [229, 56]], [[248, 55], [452, 56]], [[571, 56], [553, 56]], [[530, 56], [635, 55]]] },
    colosse: { cls: 'Pillard', nom: 'colosse', sprite: 'brutus', pas: 3, degats: 4, cri: 'Rien ne m\'arrête. Surtout pas toi.', perd: 'Impossible...',
      equipes: [[[248, 57], [473, 56], [534, 56]], [[445, 56], [208, 57], [560, 56]]] },
  },
  decor: { '|': 'colonne', '*': 'brasero', '%': 'caisses', '&': 'tonneau' },
  objets: {
    K: { type: 'cristal', decor: 'cristal' },
    e: { type: 'entree', sol: true },
    I: { type: 'soin', sol: true, sprite: 'nurse' },
    P: { type: 'panneau', texte: 'Poste de garde du bastion.\nToute la garnison sur les dalles pour ouvrir les remparts.' },
    Q: { type: 'panneau', texte: 'La Cour du Cristal.\nTouchez le cristal pour lancer la défense. Les pillards entrent de partout : répartissez-vous les entrées.\nUn pillard qui passe à côté de vous vous engage. S\'il atteint le cristal, il le frappe.' },
    R: { type: 'panneau', texte: 'Le Grand Siège.\nCette fois, des colosses : lents, mais un seul coup de leur part en vaut quatre.' },
    f: { type: 'ramasser', objet: 'full-restore' },
    r: { type: 'ramasser', objet: 'revive', n: 2 },
    s: { type: 'ramasser', objet: 'hyper-potion', n: 2 },
  },
  pnj: {
    a: { id: 'c2-a', cls: 'Pillard', nom: 'Fargo', sprite: 'voleur', dir: 'down', equipe: [[553, 56], [229, 56], [452, 55]] },
    b: { id: 'c2-b', cls: 'Pillarde', nom: 'Nina', sprite: 'eclipse_f', dir: 'down', equipe: [[571, 56], [635, 56], [530, 55]] },
    h: { id: 'c5-h', cls: 'Guetteur', nom: 'Ralf', sprite: 'eclipse_m', dir: 'down', equipe: [[248, 57], [530, 57], [229, 56]] },
    i: { id: 'c5-i', cls: 'Guetteuse', nom: 'Lise', sprite: 'eclipse_f', dir: 'down', equipe: [[635, 57], [473, 57], [571, 56]] },
    j: { id: 'c5-j', cls: 'Guetteur', nom: 'Hugo', sprite: 'voleur', dir: 'down', equipe: [[560, 57], [445, 56], [452, 56]] },
    X: {
      id: 'capitaine', cls: 'Capitaine', nom: 'Grenat', sprite: 'nox', dir: 'down', raid: true, espece: 248, niveau: 63, blocs: 4, boost: 0,
      moves: [444, 242, 89, 349], effets: { 3: ['boostTout'], 2: ['piegeRoc'], 1: ['ko'] },
      avant: ['Vous avez tenu deux sièges. Mes pillards n\'en reviennent pas.', 'Moi, je ne fais pas de siège. Je prends.'],
      cri: 'Tyranocif, réduis-les en poussière !', apres: 'Le capitaine Grenat lâche son arme. Les pillards s\'enfuient dans la nuit.',
    },
  },
  salles: [
    { id: 'c1', nom: 'Poste de garde', type: 'dalles', plan: [
      '#################',
      '########N########',
      '#...............#',
      '#..o.........o..#',
      '#...............#',
      '#&......P......&#',
      '#...............#',
      '#..o.........o..#',
      '#...............#',
      '########S########',
      '########D########',
    ] },
    { id: 'c2', nom: 'Les Remparts', type: 'combat', pnj: ['a', 'b'], plan: [
      '#################',
      '########N########',
      '#...............#',
      '#....a.....b....#',
      '#...............#',
      '#%.............%#',
      '#...............#',
      '#.....s.........#',
      '#...............#',
      '########S########',
      '########D########',
    ] },
    // première défense : six entrées, deux paires de colonnes
    { id: 'c3', nom: 'La Cour du Cristal', type: 'defense', cristal: 10, cadence: 4, pause: 12, repit: 6,
      vagues: [{ eclaireur: 2 }, { eclaireur: 2, pillard: 1 }, { eclaireur: 1, pillard: 2 }], plan: [
        '#####################',
        '##########N##########',
        '#e.................e#',
        '#...................#',
        '#...|...........|...#',
        '#...................#',
        'e...................e',
        '#.........K.........#',
        '#...................#',
        'e...................e',
        '#...|...........|...#',
        '#...................#',
        '#....I.........Q....#',
        '#...................#',
        '##########S##########',
        '##########D##########',
      ] },
    { id: 'c4', nom: 'L\'Infirmerie', type: 'libre', plan: [
      '#############',
      '######N######',
      '#...........#',
      '#.&...I...&.#',
      '#...........#',
      '#.r.......f.#',
      '#...........#',
      '######S######',
      '######D######',
    ] },
    { id: 'c5', nom: 'La Tour de Guet', type: 'combat', pnj: ['h', 'i', 'j'], plan: [
      '#################',
      '########N########',
      '#.......i.......#',
      '#...............#',
      '#..|.........|..#',
      '#.h...........j.#',
      '#...............#',
      '#..|.........|..#',
      '#.......s.......#',
      '#...............#',
      '########S########',
      '########D########',
    ] },
    // seconde défense : plus grande, huit entrées, des colosses
    { id: 'c6', nom: 'Le Grand Siège', type: 'defense', cristal: 12, cadence: 3, pause: 12, repit: 6,
      vagues: [{ eclaireur: 2, pillard: 1 }, { pillard: 2, colosse: 1 }, { eclaireur: 2, pillard: 1, colosse: 1 }], plan: [
        '#########################',
        '############N############',
        '#e.........#.#.........e#',
        '#.......................#',
        '#...|...............|...#',
        '#.......................#',
        'e.......*.......*.......e',
        '#.......................#',
        '#...........K...........#',
        '#.......................#',
        'e.......*.......*.......e',
        '#.......................#',
        '#...|...............|...#',
        '#.......................#',
        '#e.....I.........R.....e#',
        '#.......................#',
        '############S############',
        '############D############',
      ] },
    { id: 'c7', nom: 'Salle du Trône', type: 'raid', pnj: ['X'], plan: [
      '#################',
      '#*.............*#',
      '#.......X.......#',
      '#...............#',
      '#...|.......|...#',
      '#...............#',
      '#*.............*#',
      '#...............#',
      '########S########',
      '########D########',
    ] },
  ],
  journal: [
    { id: 'garde', nom: 'La garnison', salle: 'c1', but: 'Toute l\'équipe sur les dalles du poste de garde.' },
    { id: 'cour', nom: 'La Cour du Cristal', salle: 'c3', but: 'Touchez le cristal et repoussez trois vagues de pillards.' },
    { id: 'siege', nom: 'Le Grand Siège', salle: 'c6', but: 'Trois vagues de plus, avec des colosses. Le cristal ne doit pas tomber.' },
    { id: 'capitaine', nom: 'Le capitaine', salle: 'c7', but: 'Battez le capitaine Grenat et son Tyranocif, tous ensemble.' },
  ],
  textes: {
    perdu: ['Tes Pokémon n\'en peuvent plus...', 'Tu reprends tes esprits à l\'entrée de la salle. Ton équipe a été soignée.'],
    repousse: ['Le pillard te repousse et file vers le cristal !', 'Tu te relèves à l\'entrée de la cour. Ton équipe a été soignée.'],
    cristalTombe: ['Le cristal se brise en mille éclats... Les pillards repartent avec leur butin.', 'Les éclats se rassemblent lentement. Touchez le cristal pour recommencer la défense.'],
    cristalSauve: 'Le cristal brille paisiblement. Les pillards ont renoncé.',
    victoire: 'Le bastion est sauvé.',
  },
};
