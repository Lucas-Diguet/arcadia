// testodyssee/js/donjons/vallee.js — la Course de la Vallée : une course de 2 ou 3 joueurs, chacun dans son couloir.
//
// Une vallée encaissée, trois couloirs côte à côte : celui du milieu au fond de la vallée, les deux autres sur les
// plateaux de part et d'autre (on voit les autres courir, sans pouvoir les rejoindre). Les trois couloirs sont
// identiques : mêmes rochers à pousser, mêmes rebords à sens unique, mêmes dresseurs. Le premier en haut a gagné.
// L'arbitre de la ligne de départ lance la course et donne un couloir à chacun (gauche, droite, puis le milieu).
// Règles communes avec la Grande Course (js/donjon/course.js) : départ commun, pénalité de dix secondes par défaite,
// arrivées partagées. Dans chaque couloir, un cairn remet les rochers en place si on s'est coincé.

import { GameMap } from '../../../odyssee/js/world/mapgen.js';
import { T } from '../../../odyssee/js/world/tiles.js';

/** l'extérieur : l'entrée de la vallée, entre deux falaises */
function exterieur() {
  const m = new GameMap('labo:vallee:dehors', 30, 22, { outdoor: true, fill: T.TREE, name: 'Entrée de la Vallée', music: 'route' });
  m.rect(3, 2, 26, 19, T.GRASS, [T.TREE]);
  m.rect(5, 9, 24, 18, T.PATH);
  const b = m.building('gym', 11, 2, { name: 'La Course de la Vallée', roof: 'brown' });
  for (let y = b.doorY + 1; y <= 9; y++) m.set(b.doorX, y, T.PATH);
  for (const [x, y] of [[6, 8], [23, 8], [6, 18], [23, 18]]) m.prop('lanterne', x, y);
  m.zone(0, 0, 29, 21, { name: 'Entrée de la Vallée', music: 'route' });
  return { carte: m, porte: [b.doorX, b.doorY], arrivee: [b.doorX, 16] };
}

const dres = (cls, nom, sprite, dir, defi, equipe) => ({ cls, nom, sprite, dir, defi, equipe });

/** un couloir de la vallée (13 cases de large, bords compris) : on part en bas, on arrive en haut. Lettres :
 *  L départ du couloir, G grille du départ, u v w dresseurs, ● rochers à pousser, c cairn (remet les rochers en place),
 *  ▼ ▶ ◀ rebords (on les saute dans ce sens seulement), z ligne d'arrivée, r retour à la ligne de départ */
export const COULOIR = [
  '#############',
  '#...........#',
  '#.....r.....#',
  '#...........#',
  '#zzzzzzzzzzz#',
  '#...........#',
  '#####...#####',
  '######w######',
  '######.######',
  '#...........#',
  '#...........#',
  '#....#.#....#',
  '#....#●#....#',
  '#....#.#....#',
  '#..###.###..#',
  '#..#.....#..#',
  '#..#.●.●.#..#',
  '#..#..c..#..#',
  '#..#.....#..#',
  '#..###.###..#',
  '#.....v.....#',
  '######.######',
  '#...........#',
  '#####.#######',
  '#.▶.▶.◀.◀...#',
  '#####▼#▼#▼#.#',
  '#...◀.#.▶...#',
  '#▼#####▼###.#',
  '#.▶.▶.▶.▶.▶.#',
  '#.###▼#▼#▼#▼#',
  '#...#...#.◀.#',
  '#▼#.#▼#.#▼#.#',
  '#.#.#.#...#.#',
  '#▼#.#▼###.#.#',
  '#...◀.▶.▶.#.#',
  '###########.#',
  '#...........#',
  '#...........#',
  '######u######',
  '#...........#',
  '#.....G.....#',
  '#.....L.....#',
  '#############',
];
export const LARGEUR = COULOIR[0].length;
/** les trois couloirs côte à côte (ils partagent leurs bords) : gauche et droite sur les plateaux, le milieu en bas */
export const VOIES = ['g', 'c', 'd'];
function vallee() {
  const depart = { g: 'L', c: 'M', d: 'R' };
  const voie = (v) => COULOIR.map((r, y) => r.replace('L', depart[v]).replace(v === 'c' && y === 1 ? /^(#\.\.\.\.\.)\./ : /$^/, '$1S'));
  const [g, c, d] = VOIES.map(voie);
  return g.map((r, y) => r + c[y].slice(1) + d[y].slice(1));
}

export default {
  id: 'vallee',
  carte: 'labo:vallee',
  nom: 'La Course de la Vallée',
  niveau: 'niv. 60',
  entree: 'Chacun son couloir, les mêmes obstacles pour tous. Le premier arrivé en haut de la vallée gagne.',
  joueurs: { mode: 'entre', min: 2, max: 3 },
  musique: 'route',
  equipe: 'fin',
  course: true,
  vallee: true,
  exterieur,
  decor: { '*': 'brasero', '&': 'vase' },
  objets: {
    A: { type: 'arbitre', sol: true },
    T: { type: 'tableauCourse', decor: 'panneau_bois' },
    L: { type: 'departVoie', sol: true, voie: 'g' },
    M: { type: 'departVoie', sol: true, voie: 'c' },
    R: { type: 'departVoie', sol: true, voie: 'd' },
    G: { type: 'grilleCourse', sol: true, cle: 'depart' },
    u: { type: 'dresseurCourse', sol: true, cle: 'u', dresseur: dres('Montagnard', 'Roc', 'montagnard', 'down', 'Ce sentier est à moi !', [[76, 58], [208, 58], [68, 59]]) },
    v: { type: 'dresseurCourse', sol: true, cle: 'v', dresseur: dres('Randonneuse', 'Cime', 'randonneuse', 'down', 'Tu ne me doubleras pas ici !', [[227, 59], [214, 59], [229, 59]]) },
    w: { type: 'dresseurCourse', sol: true, cle: 'w', dresseur: dres('Guide', 'Altitude', 'topdresseuse', 'down', 'Dernier col avant l\'arrivée !', [[142, 60], [306, 60], [248, 60], [373, 60]]) },
    '●': { type: 'rocher', sol: true },
    c: { type: 'cairn', decor: 'stele' },
    '▼': { type: 'rebord', sol: true, sens: 'down' },
    '▶': { type: 'rebord', sol: true, sens: 'right' },
    '◀': { type: 'rebord', sol: true, sens: 'left' },
    z: { type: 'arrivee', sol: true, decor: 'carpet' },
    r: { type: 'retourCourse', decor: 'panneau_bois' },
  },
  textes: { perdu: 'Ton équipe est soignée... mais tu as perdu un temps précieux.' },
  salles: [
    { id: 'c0', nom: 'Ligne de départ', type: 'libre', plan: [
      '#################',
      '#...............#',
      '#..*.........*..#',
      '#.......A.......#',
      '#...............#',
      '#..T............#',
      '#...............#',
      '########S########',
      '########D########',
    ] },
    { id: 'v1', nom: 'La Vallée', type: 'libre', dehors: true, mur: 'ROCK', solDehors: 'GRASS', musique: 'route', plan: vallee() },
  ],
};
