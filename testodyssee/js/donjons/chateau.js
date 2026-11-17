// testodyssee/js/donjons/chateau.js — le Château de Noirval : un château fort de pierre noire, seul ou en groupe.
//
// Dehors, Dame Isaure attend devant le pont-levis : le seigneur Malvoran a enlevé sa fille Élise pour la sacrifier
// et appeler un dragon légendaire, et jeté son mari Gauthier au cachot. Dans la cour, le donjon central et quatre
// tours d'angle. En entrant dans le Grand Hall, on surprend le seigneur, sa garde d'élite et Élise : ils montent dans
// la tour centrale et ferment derrière eux. Sa porte a quatre serrures : un sceau au sommet de chaque tour.
//   Tour du Faucon (avant gauche) : six étages à dresseurs, façon Tour Céleste ; le Sceau du Faucon au sommet, et la
//     porte du chemin de ronde qui mènera à la tour cassée.
//   Tour du Loup (avant droite) : elle s'effondre au deuxième étage (à venir : on y arrive par les remparts).
//   Tour du Corbeau (arrière gauche) : les cachots (à venir : le chef des geôliers, le trousseau, les prisonniers).
//   Tour du Cerf (arrière droite) : à venir.
// Les salles se relient par des passages (`lien`, comme au Bois des Contes) ; les mécaniques dans donjon/chateau.js.
// Noms provisoires : château, seigneur, famille d'Élise.
import { GameMap, rng } from '../../../odyssee/js/world/mapgen.js';
import { T } from '../../../odyssee/js/world/tiles.js';

/* ---------------- dehors : le château, ses douves, le pont-levis ---------------- */
function exterieur() {
  const W = 44, H = 42, m = new GameMap('labo:chateau:dehors', W, H, { outdoor: true, fill: T.TREE, name: 'Lande de Noirval', music: 'route' });
  m.blob(22, 22, 20, 19, T.GRASS, rng(6161));
  m.rect(3, 1, W - 4, H - 3, T.GRASS, [T.TREE]);
  // le château (30 × 28) : le pont-levis abaissé en bas, au milieu
  const b = m.building('gym', 7, 1, { modele: 'chateauFort', w: 30, d: 28, door: 15, name: 'Château de Noirval' });
  for (let y = b.doorY + 1; y <= H - 3; y++) { m.set(b.doorX, y, T.PATH); m.set(b.doorX - 1, y, T.PATH); }
  for (const [x, y] of [[5, 31], [38, 31], [9, 36], [34, 36], [4, 24], [39, 20]]) m.prop('rocher_grand', x, y);
  for (const [x, y] of [[18, 33], [26, 33]]) m.prop('lanterne', x, y);
  m.npc({ id: 'chateau:mere', x: b.doorX + 2, y: b.doorY + 3, dir: 'left', sprite: 'dame', move: 'static', name: 'Dame Isaure', text: [
    'Vous... vous allez entrer ? Je vous en supplie, écoutez-moi.',
    'Le seigneur Malvoran a enlevé ma fille, Élise. Il dit qu\'avec elle, il réveillera un dragon de légende.',
    'Mon mari, Gauthier, a voulu l\'en empêcher. Ils l\'ont traîné dans la tour des cachots.',
    'Le pont-levis est baissé, ils ne craignent personne. Ramenez-les-moi. Tous les deux.',
  ] });
  m.zone(0, 0, W - 1, H - 1, { name: 'Lande de Noirval', music: 'route' });
  return { carte: m, porte: [b.doorX, b.doorY], arrivee: [b.doorX, H - 5] };
}

/* ---------------- la cour d'honneur ---------------- */
// 41 × 30 : le donjon central en haut, une tour à chaque angle, la porte du châtelet en bas
const COUR = { w: 41, h: 30, donjon: [20, 10], tours: { A: [5, 25], B: [35, 25], C: [5, 9], D: [35, 9] } };
function cour() {
  const { w, h } = COUR, g = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => (x === 0 || y === 0 || x === w - 1 || y === h - 1 ? '#' : '.')));
  const pose = (x, y, c) => { g[y][x] = c; };
  pose(...COUR.donjon, 'ж');
  pose(...COUR.tours.A, 'з'); pose(...COUR.tours.B, 'и'); pose(...COUR.tours.C, 'й'); pose(...COUR.tours.D, 'к');
  pose(20, h - 2, 'S'); pose(20, h - 1, 'D');
  // braseros devant le donjon, tonneaux et caisses le long des murs, un puits, des chariots
  for (const [x, y] of [[16, 12], [24, 12], [17, 25], [23, 25]]) pose(x, y, '*');
  for (const [x, y] of [[10, 2], [11, 2], [29, 2], [30, 2], [10, 27], [30, 27]]) pose(x, y, '&');
  for (const [x, y] of [[13, 2], [27, 2], [12, 27], [28, 27], [1, 15], [39, 15]]) pose(x, y, '%');
  pose(29, 17, 'ǫ'); pose(11, 17, 'w');
  pose(18, 22, 'П');
  // deux gardes de la cour
  pose(14, 18, 'Ă'); pose(26, 15, 'Ā');
  return g.map((r) => r.join(''));
}

/* ---------------- le Grand Hall ---------------- */
const HALL = [
  '############################',
  '############ШШШ#############',
  '#.|.....|...........|....|.#',
  '#..........................#',
  '#....+......ⓛⓕ......+......#',
  '#..........ⓖ..ⓗ............#',
  '#.|.....|..ⓘ..ⓙ.....|....|.#',
  '#..........................#',
  '#..........................#',
  '#.|.....|...........|....|.#',
  '#..........................#',
  '#....+..............+......#',
  '#..........................#',
  '#.|.....|...........|....|.#',
  '#............S.............#',
  '#############Ж##############',
];

/* ---------------- la Tour du Faucon (avant gauche), six étages ---------------- */
// U : escalier vers l'étage du dessus, V : celui du dessous (au rez-de-chaussée, la porte de la cour) ;
// X, Y, Z : dresseurs, W : le capitaine, R : un objet ; on monte d'un coin à l'autre, comme à la Tour Céleste
const ETAGES = [
  [
    '###################',
    '#U....#.....#.....#',
    '#.....#..X..#..R..#',
    '#.....#.....#.....#',
    '#..####.....####..#',
    '#.................#',
    '#...|...|.|...|...#',
    '#.................#',
    '#...|...|.|...|...#',
    '#.................#',
    '#..####.....####..#',
    '#.....#.....#.....#',
    '#..Y..#.....#.....#',
    '#........S........#',
    '#########V#########',
  ],
  [
    '###################',
    '#VS.....#........U#',
    '#.......#.........#',
    '#...X...#....R....#',
    '#.......#.........#',
    '#....######.......#',
    '#.................#',
    '#.......|...|.....#',
    '#.................#',
    '#.......######....#',
    '#.........#.......#',
    '#....Y....#...Z...#',
    '#.........#.......#',
    '#.........#.......#',
    '###################',
  ],
  [
    '###################',
    '#...........#...SV#',
    '#..X........#.....#',
    '#.....#######.....#',
    '#.....#.....#.....#',
    '#.....#..R......Y.#',
    '#.....#.....#.....#',
    '#.....###.###.....#',
    '#.................#',
    '#..|....|...|...|.#',
    '#.................#',
    '#....######.......#',
    '#....#....#...Z...#',
    '#.........#......U#',
    '###################',
  ],
  [
    '###################',
    '#.................#',
    '#.|..|..|..|..|...#',
    '#.................#',
    '#.|..|..X..|..|...#',
    '#.................#',
    '#.|..|..|..|..|.R.#',
    '#.................#',
    '#######.###.#######',
    '#.................#',
    '#..Y..........Z...#',
    '#.................#',
    '#..####...####....#',
    '#U.......#......SV#',
    '###################',
  ],
  [
    '###################',
    '#U....#...........#',
    '#.....#...X.......#',
    '#.....#...........#',
    '#..####...#####...#',
    '#.........#...#...#',
    '#.........#.R.#...#',
    '#....Y....#...#...#',
    '#.........##.##...#',
    '#.................#',
    '#..#############..#',
    '#.................#',
    '#.........Z.......#',
    '#VS...............#',
    '###################',
  ],
  [
    '###################',
    '#VS...............#',
    '#.................#',
    '#...|.........|...#',
    '#.................#',
    '#.................#',
    '#.......*.*.......#',
    '#........Щ........Ъ',
    '#.......*.*.......#',
    '#.................#',
    '#........W........#',
    '#...|.........|...#',
    '#.................#',
    '#.................#',
    '###################',
  ],
];
// les passages entre étages : montée du i-ème étage (MONTE[i]) et descente du suivant (DESCEND[i])
const MONTE = ['а', 'б', 'в', 'г', 'д'], DESCEND = ['А', 'Б', 'В', 'Г', 'Д'];
const OBJETS_ETAGES = ['ä', 'ë', 'ï', 'ö', 'ü'];
const DRESSEURS_ETAGES = [['a', 'b'], ['c', 'd', 'e'], ['f', 'g', 'h'], ['j', 'k', 'l'], ['m', 'n', 'p'], ['q']];
function etage(i) {
  return ETAGES[i].map((r) => [...r].map((c) => {
    if (c === 'U') return MONTE[i];
    if (c === 'V') return i ? DESCEND[i - 1] : 'Е';
    if (c === 'R') return OBJETS_ETAGES[i];
    const k = { X: 0, Y: 1, Z: 2, W: 0 }[c];
    return k != null ? DRESSEURS_ETAGES[i][k] : c;
  }).join(''));
}

/* ---------------- dresseurs : la garnison du château (niveaux 50 à 56) ---------------- */
const dres = (cls, nom, sprite, dir, defi, equipe, o = {}) => ({ cls, nom, sprite, dir, vue: 4, prix: 2000, defi, equipe, chateau: true, ...o });
const pnj = {
  // le Grand Hall : le seigneur, Élise et la garde d'élite (ils montent dans la tour centrale à notre arrivée)
  'ⓛ': { id: 'seigneur', cls: 'Seigneur', nom: 'Malvoran', sprite: 'nocturne', dir: 'down', toujours: true, scene: 'hall' },
  'ⓕ': { id: 'elise', cls: '', nom: 'Élise', sprite: 'lilas', dir: 'down', toujours: true, scene: 'hall' },
  'ⓖ': { id: 'elite-1', cls: 'Garde d\'élite', nom: '', sprite: 'eclipse_m', dir: 'down', toujours: true, scene: 'hall' },
  'ⓗ': { id: 'elite-2', cls: 'Garde d\'élite', nom: '', sprite: 'eclipse_f', dir: 'down', toujours: true, scene: 'hall' },
  'ⓘ': { id: 'elite-3', cls: 'Garde d\'élite', nom: '', sprite: 'eclipse_m', dir: 'down', toujours: true, scene: 'hall' },
  'ⓙ': { id: 'elite-4', cls: 'Garde d\'élite', nom: '', sprite: 'eclipse_f', dir: 'down', toujours: true, scene: 'hall' },
  // la cour
  'Ă': dres('Garde', 'Roland', 'garde', 'right', 'Halte ! Le seigneur ne reçoit pas.', [[262, 50], [229, 51]]),
  'Ā': dres('Garde', 'Bertille', 'garde', 'left', 'Tu as traversé le pont-levis ? Tu ne le retraverseras pas.', [[227, 51], [303, 50]]),
  // la Tour du Faucon
  a: dres('Arbalétrier', 'Odon', 'garde', 'down', 'Personne ne monte dans la Tour du Faucon !', [[198, 50], [227, 51]]),
  b: dres('Chevalier', 'Aymeric', 'topdresseur', 'up', 'Un intrus ! Dégaine, si tu l\'oses.', [[212, 51], [208, 50]]),
  c: dres('Arbalétrière', 'Hersende', 'topdresseuse', 'right', 'D\'ici, je vois tout le pont-levis. Et je t\'ai vu.', [[430, 51], [261, 50]]),
  d: dres('Garde', 'Thibaut', 'garde', 'right', 'Encore un pas, et j\'appelle le capitaine.', [[624, 51], [215, 51]]),
  e: dres('Chapelain', 'Anselme', 'pretre', 'left', 'Le seigneur a béni ces murs. Tu n\'y es pas le bienvenu.', [[354, 52], [302, 51]]),
  f: dres('Chevalier', 'Gauvain', 'topdresseur', 'right', 'Mon épée est rouillée, pas mon Pokémon.', [[680, 52], [212, 52]]),
  g: dres('Arbalétrière', 'Mahaut', 'topdresseuse', 'left', 'Les fenêtres de la tour sont étroites. Pas mes flèches.', [[227, 52], [430, 52]]),
  h: dres('Alchimiste', 'Bérenger', 'scientifique', 'up', 'Mes potions ne sont pas pour toi. Mes Pokémon, si.', [[462, 52], [110, 52]]),
  j: dres('Garde', 'Enguerrand', 'garde', 'down', 'La moitié de la tour, déjà. Tu ne verras pas l\'autre.', [[229, 53], [625, 52]]),
  k: dres('Chevalière', 'Aliénor', 'topdresseuse', 'right', 'Pour le seigneur, et pour Noirval !', [[448, 53], [208, 53]]),
  l: dres('Sergent', 'Foulques', 'karateka', 'left', 'Les recrues n\'ont pas tenu ? Moi, je tiendrai.', [[553, 53], [461, 53]]),
  m: dres('Chevalier', 'Hugues', 'topdresseur', 'down', 'Le capitaine est juste au-dessus. Tu n\'iras pas plus haut.', [[681, 54], [475, 54]]),
  n: dres('Chapelaine', 'Ermengarde', 'pretre', 'right', 'J\'entends déjà les ailes du dragon. Et toi ?', [[477, 54], [429, 54]]),
  p: dres('Alchimiste', 'Ysambard', 'scientifique', 'left', 'Une goutte de plus, et le chaudron déborde. Comme ma patience.', [[609, 54], [452, 54]]),
  q: dres('Capitaine', 'Hardouin', 'brutus', 'up', 'Le Sceau du Faucon ne quittera pas cette tour. Ni toi.', [[571, 55], [530, 55], [625, 56]], { prix: 4000, sceau: 'A', battu: 'Prends le sceau. Le seigneur s\'occupera de toi lui-même.' }),
};

const CHATEAU = {
  id: 'chateau',
  carte: 'labo:chateau',
  nom: 'Château de Noirval',
  niveau: 'niv. 50 à 60',
  entree: 'Un château de pierre noire, quatre tours et un donjon. Le seigneur y garde une prisonnière. On y entre seul ou à plusieurs.',
  joueurs: { mode: 'groupe', n: 1 },
  musique: 'tower',
  equipe: 'fin',
  style: 'chateau',
  liens: true,
  exterieur,
  textes: { perdu: 'Tes Pokémon n\'en peuvent plus... Tu te réveilles plus bas, ton équipe soignée.' },
  decor: { '|': 'colonne', '&': 'tonneau', '%': 'caisses', '*': 'brasero', '+': 'statue', w: 'wagonnet', 'ǫ': 'puits' },
  objets: {
    // la cour : le donjon et les quatre tours (bâtiments en volumes, odyssee/js/render/labo3d.js)
    'ж': { type: 'maison', sol: true, batiment: 'gym', modele: 'donjonCour', w: 11, d: 8, door: 5, nom: 'Donjon de Noirval', vers: 'gh', cible: 'Ж' },
    'з': { type: 'maison', sol: true, batiment: 'house', modele: 'tourCour', w: 5, d: 6, door: 2, nom: 'Tour du Faucon', vers: 'a1', cible: 'Е' },
    'и': { type: 'maison', sol: true, batiment: 'house', modele: 'tourCour', w: 5, d: 6, door: 2, opts: { casse: true }, nom: 'Tour du Loup', ferme: true,
      texteFerme: ['Une tour à moitié effondrée. Derrière la porte, on entend encore des pierres rouler.', 'On ne passera pas par là pour l\'instant.'] },
    'й': { type: 'maison', sol: true, batiment: 'house', modele: 'tourCour', w: 5, d: 6, door: 2, opts: { prison: true }, nom: 'Tour du Corbeau', ferme: true,
      texteFerme: ['La tour des cachots. Des chaînes cliquettent derrière la porte.', 'Elle est fermée de l\'intérieur pour l\'instant.'] },
    'к': { type: 'maison', sol: true, batiment: 'house', modele: 'tourCour', w: 5, d: 6, door: 2, nom: 'Tour du Cerf', ferme: true,
      texteFerme: ['La Tour du Cerf. La porte ne bouge pas.', 'Elle s\'ouvrira plus tard.'] },
    'П': { type: 'panneau', texte: 'COUR D\'HONNEUR DE NOIRVAL\nAu nord, le donjon et son Grand Hall.\nAux angles, les tours du Faucon, du Loup, du Corbeau et du Cerf.' },
    // le Grand Hall : la sortie vers la cour, la porte de la tour centrale (quatre serrures)
    'Ж': { type: 'lien', sol: true, vers: 'c0', cible: 'ж' },
    'Ш': { type: 'porteCentrale', decor: 'porte_vide' },
    // la Tour du Faucon : la porte de la cour, les escaliers, le sceau, la porte du chemin de ronde
    'Е': { type: 'lien', sol: true, vers: 'c0', cible: 'з' },
    ...Object.fromEntries(MONTE.flatMap((c, i) => [[c, { type: 'lien', sol: true, escalier: true, vers: 'a' + (i + 2), cible: DESCEND[i] }],
      [DESCEND[i], { type: 'lien', sol: true, escalier: true, vers: 'a' + (i + 1), cible: c }]])),
    'Щ': { type: 'sceau', tour: 'A', nom: 'Sceau du Faucon', decor: 'socle_statue' },
    'Ъ': { type: 'rempart', mur: true },
    // objets des étages
    'ä': { type: 'ramasser', objet: 'max-potion' },
    'ë': { type: 'ramasser', objet: 'revive', n: 2 },
    'ï': { type: 'ramasser', objet: 'full-restore' },
    'ö': { type: 'ramasser', objet: 'max-revive' },
    'ü': { type: 'ramasser', objet: 'max-elixir' },
  },
  pnj,
  salles: [
    { id: 'c0', nom: 'Cour d\'honneur', type: 'libre', dehors: true, mur: 'ROCK', solDehors: 'PAVE', style: null, musique: 'tower', plan: cour() },
    { id: 'gh', nom: 'Grand Hall', type: 'libre', musique: 'tower', plan: HALL },
    ...ETAGES.map((_, i) => ({ id: 'a' + (i + 1), nom: `Tour du Faucon — ${!i ? 'rez-de-chaussée' : i === 1 ? '1er étage' : `${i}e étage`}`, type: 'libre', musique: 'tower', tour: 'A', plan: etage(i) })),
  ],
  journal: [
    { id: 'sceaux', nom: 'Les quatre sceaux', salle: 'gh', but: 'Un sceau au sommet de chaque tour ouvre la porte de la tour centrale.' },
  ],
};
export default CHATEAU;
