// testodyssee/js/donjons/mine.js — la Mine Effondrée : un donjon de 2 à 4 joueurs, à rôles différents.
//
// Au carreau de la mine, un joueur prend le poste de contrôle : il voit le plan de chaque niveau, où sont ses
// coéquipiers, l'état des barrières, et il envoie la cage d'un niveau au suivant. Il ne voit pas les dangers.
// Les autres descendent : les niveaux sont dans le noir, des barrières de bois barrent les galeries, et certaines
// galeries ont un plafond fissuré qui s'effondre quand on passe (dégâts, et la galerie est bouchée pour tous).
// Les mineurs voient les fissures, pas le plan : il faut se parler pour trouver un chemin.
// Certaines barrières sont reliées par un aiguillage : en ouvrir une ferme l'autre.
// Au fond, tout le monde se retrouve (le joueur du poste descend) pour affronter le gardien de la mine.
import { GameMap, rng } from '../../../odyssee/js/world/mapgen.js';
import { T } from '../../../odyssee/js/world/tiles.js';

/** l'extérieur : l'entrée de la mine au pied de la montagne */
function exterieur() {
  const m = new GameMap('labo:mine:dehors', 32, 26, { outdoor: true, fill: T.ROCK, name: 'Carrière abandonnée', music: 'route' });
  m.blob(16, 14, 12.5, 10, T.PATH, rng(2727));
  m.rect(5, 8, 26, 23, T.PATH, [T.ROCK]);
  const porte = [16, 7];
  for (let x = 13; x <= 19; x++) for (let y = 4; y <= 7; y++) { if (x === porte[0] && y === porte[1]) continue; m.under.set(x + ',' + y, T.PATH); m.set(x, y, T.BLOCK); }
  m.prop('entree_mine', 14, 7, false, { w: 3.5, dz: 0.95 });
  m.set(...porte, T.DOOR);
  for (const [x, y] of [[9, 11], [11, 18], [22, 12], [24, 19]]) m.prop('wagonnet', x, y);
  for (const [x, y] of [[7, 15], [26, 16], [20, 21]]) m.prop('rocher_grand', x, y);
  for (const [x, y] of [[13, 10], [19, 10]]) m.prop('lanterne', x, y);
  m.zone(0, 0, 31, 25, { name: 'Carrière abandonnée', music: 'route' });
  return { carte: m, porte };
}

/*
 * Un niveau : une grille de salles (r, c), reliées par des galeries de trois cases de large.
 * Chaque galerie est libre (.), barrée (une lettre de barrière), ou fissurée (~ : s'effondre au passage).
 * dep : salle d'arrivée de la cage (S sur son mur du bas), cage : salle de départ de la cage suivante.
 */
const SW = 9, SH = 7, GAL = 3;
function niveau(o) {
  const W = o.cols * SW + (o.cols - 1) * GAL + 2, H = o.rows * SH + (o.rows - 1) * GAL + 3;
  const g = Array.from({ length: H }, () => Array(W).fill('#'));
  const x0 = (c) => 1 + c * (SW + GAL), y0 = (r) => 1 + r * (SH + GAL);
  for (let r = 0; r < o.rows; r++) for (let c = 0; c < o.cols; c++) {
    if (o.vides?.includes(`${r},${c}`)) continue;
    for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) g[y0(r) + y][x0(c) + x] = '.';
  }
  for (const [a, b, t] of o.galeries) {
    const [r1, c1] = a.split(',').map(Number), [r2, c2] = b.split(',').map(Number);
    if (r1 === r2) {   // galerie horizontale
      const c = Math.min(c1, c2), xs = x0(c) + SW, ys = y0(r1) + 2;
      for (let dx = 0; dx < GAL; dx++) for (let dy = 0; dy < 3; dy++) g[ys + dy][xs + dx] = t !== '.' && dx === 1 ? t : '.';
    } else {           // galerie verticale
      const r = Math.min(r1, r2), xs = x0(c1) + 3, ys = y0(r) + SH;
      for (let dy = 0; dy < GAL; dy++) for (let dx = 0; dx < 3; dx++) g[ys + dy][xs + dx] = t !== '.' && dy === 1 ? t : '.';
    }
  }
  const [dr, dc] = o.dep; g[y0(dr) + SH][x0(dc) + 4] = 'S';
  const [cr, cc] = o.cage; for (let dy = 0; dy < 2; dy++) for (let dx = 3; dx <= 5; dx++) g[y0(cr) + dy][x0(cc) + dx] = 'c';
  for (const [ch, r, c, dx, dy] of o.choses || []) g[y0(r) + dy][x0(c) + dx] = ch;
  return g.map((l) => l.join(''));
}

const N1 = niveau({
  rows: 3, cols: 3, dep: [2, 0], cage: [0, 2],
  galeries: [
    ['2,0', '2,1', '.'], ['2,1', '2,2', 'A'], ['2,0', '1,0', 'B'], ['1,0', '1,1', '~'], ['1,1', '2,1', '.'],
    ['1,1', '1,2', 'C'], ['2,2', '1,2', '.'], ['1,0', '0,0', '.'], ['0,0', '0,1', 'E'], ['0,1', '1,1', '~'], ['0,1', '0,2', '.'], ['1,2', '0,2', 'F'],
  ],
  choses: [['à', 2, 1, 4, 3], ['á', 0, 0, 4, 2], ['h', 2, 2, 7, 5], ['u', 1, 0, 1, 1], ['%', 2, 0, 1, 1], ['%', 1, 2, 7, 1], ['&', 0, 1, 1, 5], ['%', 1, 1, 6, 4]],
});
const N2 = niveau({
  rows: 3, cols: 4, dep: [2, 0], cage: [0, 3],
  galeries: [
    ['2,0', '2,1', 'G'], ['2,1', '2,2', '~'], ['2,2', '2,3', '.'], ['2,0', '1,0', 'H'], ['2,1', '1,1', '.'], ['2,2', '1,2', 'I'], ['2,3', '1,3', 'J'],
    ['1,0', '1,1', '.'], ['1,1', '1,2', '~'], ['1,2', '1,3', 'K'], ['1,0', '0,0', '~'], ['1,1', '0,1', 'L'], ['1,3', '0,3', 'M'],
    ['0,0', '0,1', '.'], ['0,1', '0,2', 'O'], ['0,2', '0,3', '~'], ['0,2', '1,2', '.'],
  ],
  choses: [['â', 1, 1, 4, 3], ['ã', 2, 3, 4, 3], ['ä', 0, 2, 4, 3], ['r', 0, 0, 1, 1], ['h', 2, 2, 7, 1], ['f', 1, 3, 7, 5], ['%', 2, 0, 6, 2], ['&', 1, 0, 2, 5], ['%', 0, 1, 7, 2], ['&', 2, 1, 1, 1]],
});
const N3 = niveau({
  rows: 3, cols: 4, dep: [2, 3], cage: [0, 0],
  galeries: [
    ['2,3', '2,2', 'P'], ['2,2', '2,1', '.'], ['2,1', '2,0', '~'], ['2,3', '1,3', '~'], ['2,2', '1,2', 'Q'], ['2,1', '1,1', 'R'], ['2,0', '1,0', '.'],
    ['1,3', '1,2', 'T'], ['1,2', '1,1', '~'], ['1,1', '1,0', 'U'], ['1,3', '0,3', '.'], ['1,1', '0,1', '.'], ['1,0', '0,0', 'V'],
    ['0,3', '0,2', 'W'], ['0,2', '0,1', '~'], ['0,1', '0,0', 'X'], ['0,2', '1,2', 'Y'],
  ],
  choses: [['å', 1, 2, 4, 3], ['è', 2, 0, 4, 3], ['é', 0, 2, 4, 3], ['m', 0, 3, 7, 1], ['r', 2, 1, 7, 5], ['h', 1, 0, 1, 1], ['e', 2, 2, 1, 5], ['%', 1, 3, 6, 2], ['&', 0, 1, 2, 4], ['%', 2, 3, 1, 1], ['&', 1, 1, 7, 1]],
});

// aiguillages : en ouvrir une ferme l'autre
const LIENS = { A: 'B', B: 'A', G: 'H', H: 'G', K: 'L', L: 'K', P: 'Q', Q: 'P', U: 'V', V: 'U' };
const barriere = (l) => ({ type: 'barriere', decor: 'barriere', lien: LIENS[l] });
const ouvrier = (o) => ({ dir: 'down', vue: 5, perd: 'Fais attention aux plafonds...', ...o });

export default {
  id: 'mine',
  carte: 'labo:mine',
  nom: 'Mine Effondrée',
  niveau: 'niv. 35',
  entree: 'L\'un guide, les autres creusent. Personne ne sort de la mine en ne comptant que sur lui-même.',
  joueurs: { mode: 'entre', min: 2, max: 4 },
  musique: 'cave',
  equipe: 'milieu',
  mine: true,
  exterieur,
  decor: { '%': 'caverock', '&': 'stalag', b: 'brasero' },
  objets: {
    '@': { type: 'poste', decor: 'poste' },
    c: { type: 'cage', sol: true, decor: 'cage' },
    '~': { type: 'fissure', sol: true, decor: 'fissure' },
    Z: { type: 'panneau', texte: 'Poste de contrôle de la mine.\nDe là, on voit le plan des galeries et on ouvre les barrières. Mais on ne voit pas ce qui s\'effondre.' },
    ...Object.fromEntries([...'ABCEFGHIJKLMOPQRTUVWXY'].map((l) => [l, barriere(l)])),
    h: { type: 'ramasser', objet: 'hyper-potion' },
    u: { type: 'ramasser', objet: 'super-potion', n: 2 },
    r: { type: 'ramasser', objet: 'revive' },
    f: { type: 'ramasser', objet: 'full-heal' },
    m: { type: 'ramasser', objet: 'max-potion' },
    e: { type: 'ramasser', objet: 'ether' },
  },
  pnj: {
    'à': ouvrier({ id: 'n1-a', cls: 'Ouvrier', nom: 'Marcel', sprite: 'montagnard', dir: 'left', equipe: [[74, 32], [66, 32], [95, 33]] }),
    'á': ouvrier({ id: 'n1-b', cls: 'Ouvrière', nom: 'Louise', sprite: 'randonneuse', dir: 'down', equipe: [[50, 32], [41, 32], [27, 33]] }),
    'â': ouvrier({ id: 'n2-a', cls: 'Ouvrier', nom: 'Gérard', sprite: 'montagnard', dir: 'right', equipe: [[75, 33], [67, 33], [42, 33]] }),
    'ã': ouvrier({ id: 'n2-b', cls: 'Ouvrière', nom: 'Simone', sprite: 'randonneuse', dir: 'up', equipe: [[51, 33], [104, 33], [111, 34]] }),
    'ä': ouvrier({ id: 'n2-c', cls: 'Contremaître', nom: 'Albert', sprite: 'topdresseur', dir: 'down', equipe: [[95, 34], [208, 33], [76, 34]] }),
    'å': ouvrier({ id: 'n3-a', cls: 'Ouvrier', nom: 'René', sprite: 'montagnard', dir: 'left', equipe: [[68, 34], [232, 34], [76, 35]] }),
    'è': ouvrier({ id: 'n3-b', cls: 'Ouvrière', nom: 'Jeanne', sprite: 'randonneuse', dir: 'right', equipe: [[105, 34], [28, 34], [169, 35]] }),
    'é': ouvrier({ id: 'n3-c', cls: 'Contremaître', nom: 'Émile', sprite: 'topdresseur', dir: 'down', equipe: [[208, 35], [112, 35], [248, 34]] }),
    g: {
      id: 'gardien-mine', cls: '', nom: 'Galeking', sprite: 'montagnard', dir: 'down', raid: true, espece: 306, niveau: 38, blocs: 4, boost: 0,
      effets: { 3: ['piegeRoc'], 2: ['boostTout'] },
      avant: ['La galerie tremble. Quelque chose d\'énorme dort sous la roche.', 'Tout le monde doit être là pour l\'affronter.'],
      cri: 'GROOOAAR !', apres: 'Galeking retourne dans les profondeurs. La mine est calme.',
    },
  },
  salles: [
    { id: 'm0', nom: 'Carreau de la mine', type: 'libre', carreau: true, cageVers: 'm1', plan: [
      '#######################',
      '#.....................#',
      '#..b.......ccc.....b..#',
      '#..........ccc........#',
      '#.....................#',
      '#..@..................#',
      '#..Z...............%..#',
      '#.....................#',
      '#..b...............b..#',
      '#.....................#',
      '###########S###########',
      '###########D###########',
    ] },
    { id: 'm1', nom: 'Niveau 1', type: 'combat', pnj: ['à', 'á'], niveau: 1, sombre: true, cageVers: 'm2', rencontres: [[41, 30, 32, 30], [74, 30, 32, 30], [66, 30, 31, 20], [50, 30, 32, 20]], taux: 0.04, plan: N1 },
    { id: 'm2', nom: 'Niveau 2', type: 'combat', pnj: ['â', 'ã', 'ä'], niveau: 2, sombre: true, cageVers: 'm3', rencontres: [[42, 32, 33, 30], [75, 32, 33, 25], [67, 32, 33, 25], [95, 32, 33, 20]], taux: 0.04, plan: N2 },
    { id: 'm3', nom: 'Niveau 3', type: 'combat', pnj: ['å', 'è', 'é'], niveau: 3, sombre: true, cageVers: 'fond', rencontres: [[42, 33, 35, 25], [75, 33, 35, 25], [208, 33, 34, 15], [112, 34, 35, 15], [246, 33, 34, 20]], taux: 0.04, plan: N3 },
    { id: 'fond', nom: 'Le Fond', type: 'raid', pnj: ['g'], plan: [
      '###################',
      '#.................#',
      '#..%...........&..#',
      '#.................#',
      '#........g........#',
      '#.................#',
      '#..&...........%..#',
      '#.................#',
      '#########S#########',
    ] },
  ],
  journal: [
    { id: 'poste', nom: 'Le poste de contrôle', salle: 'm0', but: 'Un joueur reste au poste du carreau : il ouvre les barrières et envoie la cage. Les autres prennent la cage.' },
    { id: 'n1', nom: 'Niveau 1', salle: 'm1', but: 'Trouvez la cage du niveau. Dites au poste devant quelle barrière vous êtes, et méfiez-vous des plafonds fissurés.' },
    { id: 'n2', nom: 'Niveau 2', salle: 'm2', but: 'Trouvez la cage du niveau. Certaines barrières en ferment d\'autres.' },
    { id: 'n3', nom: 'Niveau 3', salle: 'm3', but: 'Trouvez la cage qui descend au fond.' },
    { id: 'fond', nom: 'Le fond', salle: 'fond', but: 'Retrouvez-vous au fond, le joueur du poste compris, et affrontez ce qui y dort.' },
  ],
  textes: {
    masque: 'La roche gronde.',
    perdu: ['Tes Pokémon n\'en peuvent plus...', 'Des mineurs te ramènent à l\'arrivée de la cage. Ton équipe a été soignée.'],
    eboulement: 'Le plafond s\'effondre ! Des pierres tombent sur ton équipe, et la galerie est bouchée. Il faudra passer ailleurs.',
    barriere: 'Une barrière de bois, marquée « {l} ». Elle ne s\'ouvre que depuis le poste de contrôle.',
    victoire: 'La mine est calme.',
  },
};
