// testodyssee/js/donjons/fonderie.js — la Fonderie aux Plaques : un donjon de 2 à 4 joueurs, où l'on avance en se répartissant.
//
// Des plaques de pression lèvent des grilles tant que quelqu'un se tient dessus (même couleur : même grille).
// Seul, on reste bloqué : il faut qu'un joueur tienne la grille pendant qu'un autre passe, puis que celui qui est
// passé trouve une plaque de l'autre côté pour faire passer le premier. La balance demande deux joueurs à la fois
// (son treuil reste enclenché), la chaîne se franchit à saute-mouton, le creuset sépare le groupe en deux.
// Au fond, le Maître de Forge et son Heatran, en combat à plusieurs.
// Règles des plaques : js/donjon/plaques.js ; dans la partie : js/donjon/fonderie.js.
import { GameMap, rng } from '../../../odyssee/js/world/mapgen.js';
import { T } from '../../../odyssee/js/world/tiles.js';

/** l'extérieur : la fonderie au bout d'une cour pavée, entre les tas de minerai */
function exterieur() {
  const m = new GameMap('labo:fonderie:dehors', 32, 24, { outdoor: true, fill: T.ROCK, name: 'Cour de la Fonderie', music: 'route' });
  m.blob(16, 13, 13, 9, T.PATH, rng(5151));
  m.rect(4, 6, 27, 21, T.PATH, [T.ROCK]);
  const b = m.building('gym', 12, 3, { name: 'Fonderie aux Plaques', roof: 'gray' });
  for (let y = b.doorY + 1; y <= 20; y++) m.set(b.doorX, y, T.PAVE);
  m.rect(13, 9, 17, 10, T.PAVE);
  for (const [x, y] of [[7, 10], [24, 10], [8, 17], [23, 17]]) m.prop('wagonnet', x, y);
  for (const [x, y] of [[6, 13], [25, 14], [10, 19], [21, 19]]) m.prop('caisses', x, y);
  for (const [x, y] of [[13, 12], [17, 12]]) m.prop('brasero', x, y);
  m.zone(0, 0, 31, 23, { name: 'Cour de la Fonderie', music: 'route' });
  return { carte: m, porte: [b.doorX, b.doorY] };
}

// couleurs des groupes de plaques (une grille s'ouvre avec les plaques de sa couleur)
const ROUGE = 0xe04848, BLEU = 0x4a7ee8, JAUNE = 0xf0c838, VERT = 0x46c25e, ORANGE = 0xf08a2c, VIOLET = 0xa45ae6, CYAN = 0x3cd2d8, ROSE = 0xf06aa8, BLANC = 0xf4f4f4;

export default {
  id: 'fonderie',
  carte: 'labo:fonderie',
  nom: 'Fonderie aux Plaques',
  niveau: 'niv. 60',
  entree: 'Les grilles de la fonderie ne se lèvent que si quelqu\'un tient la plaque. Personne n\'y passe seul.',
  joueurs: { mode: 'entre', min: 2, max: 4 },
  musique: 'tower',
  equipe: 'fin',
  exterieur,
  // groupes de plaques : couleur, plaques à tenir en même temps (requis), treuil qui reste enclenché (garde)
  plaques: {
    rouge: { couleur: ROUGE }, bleu: { couleur: BLEU },
    jaune: { couleur: JAUNE, requis: 2, garde: true }, vert: { couleur: VERT },
    orange: { couleur: ORANGE }, violet: { couleur: VIOLET }, cyan: { couleur: CYAN },
    rose: { couleur: ROSE }, blanc: { couleur: BLANC },
  },
  decor: { '%': 'caisses', '&': 'tonneau', '*': 'brasero', w: 'wagonnet' },
  objets: {
    Q: { type: 'panneau', texte: 'Vestiaire de la fonderie.\nToute l\'équipe sur les dalles pour mettre les machines en route.\nUne plaque lève les grilles de sa couleur, tant que quelqu\'un se tient dessus.' },
    R: { type: 'panneau', texte: 'Le Relais.\nTiens la plaque pendant que ton coéquipier passe. Une fois de l\'autre côté, c\'est lui qui te tient la grille.' },
    T: { type: 'panneau', texte: 'La Balance.\nLa grande plaque jaune ne bouge que sous deux personnes à la fois. Son treuil reste ensuite enclenché.' },
    U: { type: 'panneau', texte: 'La Chaîne.\nCertaines plaques lèvent deux grilles. Avancez à saute-mouton.' },
    V: { type: 'panneau', texte: 'Le Creuset.\nLe chemin se sépare. Chaque côté tient la grille de l\'autre.' },
    P: { type: 'panneau', texte: 'Salle des Moules.\nChacun dans un moule, en même temps, pour ouvrir le haut-fourneau.' },
    // le Relais
    a: { type: 'plaque', sol: true, groupes: ['rouge'] }, A: { type: 'grille', sol: true, groupe: 'rouge' },
    c: { type: 'plaque', sol: true, groupes: ['bleu'] }, C: { type: 'grille', sol: true, groupe: 'bleu' },
    // la Balance
    b: { type: 'plaque', sol: true, groupes: ['jaune'] }, B: { type: 'grille', sol: true, groupe: 'jaune' },
    e: { type: 'plaque', sol: true, groupes: ['vert'] }, E: { type: 'grille', sol: true, groupe: 'vert' },
    // la Chaîne
    x: { type: 'plaque', sol: true, groupes: ['orange'] }, H: { type: 'grille', sol: true, groupe: 'orange' },
    y: { type: 'plaque', sol: true, groupes: ['orange', 'violet'] }, J: { type: 'grille', sol: true, groupe: 'violet' },
    z: { type: 'plaque', sol: true, groupes: ['violet', 'cyan'] }, K: { type: 'grille', sol: true, groupe: 'cyan' },
    q: { type: 'plaque', sol: true, groupes: ['cyan'] },
    // le Creuset
    h: { type: 'plaque', sol: true, groupes: ['rose'] }, L: { type: 'grille', sol: true, groupe: 'rose' },
    g: { type: 'plaque', sol: true, groupes: ['blanc'] }, M: { type: 'grille', sol: true, groupe: 'blanc' },
    // soins
    f: { type: 'ramasser', objet: 'full-restore' },
    r: { type: 'ramasser', objet: 'revive', n: 2 },
    s: { type: 'ramasser', objet: 'hyper-potion', n: 2 },
  },
  pnj: {
    u: { id: 'f3-u', cls: 'Ouvrier', nom: 'Marcel', sprite: 'montagnard', dir: 'down', equipe: [[208, 57], [467, 57], [68, 56]] },
    v: { id: 'f3-v', cls: 'Fondeuse', nom: 'Irène', sprite: 'randonneuse', dir: 'down', equipe: [[462, 57], [59, 57], [306, 56]] },
    k: { id: 'f5-k', cls: 'Contremaître', nom: 'Bastien', sprite: 'karateka', dir: 'down', equipe: [[534, 57], [376, 57], [229, 56]] },
    l: { id: 'f5-l', cls: 'Ingénieure', nom: 'Coralie', sprite: 'scientifique', dir: 'down', equipe: [[437, 57], [227, 57], [500, 57]] },
    X: {
      id: 'forge', cls: 'Maître de Forge', nom: 'Vulcain', sprite: 'brutus', dir: 'down', raid: true, espece: 485, niveau: 62, blocs: 4, boost: 0,
      moves: [436, 414, 430, 442], effets: { 3: ['boostTout'], 2: ['piegeRoc'], 1: ['ko'] },
      avant: ['Vous avez traversé ma fonderie à plusieurs... Bien joué.', 'Mais le haut-fourneau ne s\'éteint pas comme ça.'],
      cri: 'Heatran, fais fondre leurs grilles et leurs espoirs !', apres: 'Le haut-fourneau s\'éteint dans un long soupir de vapeur.',
    },
  },
  salles: [
    { id: 'f1', nom: 'Vestiaire', type: 'dalles', plan: [
      '#################',
      '########N########',
      '#...............#',
      '#..o.........o..#',
      '#...............#',
      '#&......Q......&#',
      '#...............#',
      '#..o.........o..#',
      '#...............#',
      '########S########',
      '########D########',
    ] },
    // relais : on se tient la grille à tour de rôle (les plaques sont loin des grilles)
    { id: 'f2', nom: 'Le Relais', type: 'libre', plan: [
      '#################',
      '########N########',
      '#c.....#.#......#',
      '#......#.#..%...#',
      '#...............#',
      '########C########',
      '#.............c.#',
      '#.a.....%.......#',
      '#...............#',
      '########A########',
      '#...............#',
      '#.....R.......a.#',
      '#...............#',
      '########S########',
      '########D########',
    ] },
    // balance : deux joueurs sur la plaque jaune (le treuil reste levé), deux dresseurs, puis un relais
    { id: 'f3', nom: 'La Balance', type: 'combat', pnj: ['u', 'v'], plan: [
      '#################',
      '########N########',
      '#e.....#.#......#',
      '#......#.#..u...#',
      '#...............#',
      '########E########',
      '#..............e#',
      '#..v............#',
      '#...........s...#',
      '########B########',
      '#...............#',
      '#.bb.....T......#',
      '#...............#',
      '########S########',
      '########D########',
    ] },
    // chaîne : chaque plaque du milieu lève la grille d'avant et celle d'après
    { id: 'f4', nom: 'La Chaîne', type: 'libre', plan: [
      '#################',
      '########N########',
      '#...........q...#',
      '#...............#',
      '###K#############',
      '#.z.............#',
      '#.........w.....#',
      '#############J###',
      '#.............y.#',
      '#.....w.........#',
      '###H#############',
      '#.............x.#',
      '#......U........#',
      '########S########',
      '########D########',
    ] },
    // creuset : à gauche et à droite, chacun tient la grille de l'autre
    { id: 'f5', nom: 'Le Creuset', type: 'combat', pnj: ['k', 'l'], plan: [
      '#################',
      '########N########',
      '#......#.#......#',
      '#..g............#',
      '#...............#',
      '###M#######L#####',
      '#.......#.......#',
      '#.h.....#...l...#',
      '#...k...#.......#',
      '#.......#....f..#',
      '#.......#.......#',
      '#...............#',
      '#...V...........#',
      '########S########',
      '########D########',
    ] },
    { id: 'f6', nom: 'Salle des Moules', type: 'dalles', plan: [
      '#################',
      '########N########',
      '#o#...........#o#',
      '#.#...........#.#',
      '#.......*.......#',
      '#.......P.......#',
      '#..r............#',
      '#.#...........#.#',
      '#o#...........#o#',
      '########S########',
      '########D########',
    ] },
    { id: 'f7', nom: 'Haut-Fourneau', type: 'raid', pnj: ['X'], plan: [
      '#################',
      '#*.............*#',
      '#.......X.......#',
      '#...............#',
      '#...............#',
      '#*.............*#',
      '#...............#',
      '########S########',
      '########D########',
    ] },
  ],
  journal: [
    { id: 'machines', nom: 'Mettre en route', salle: 'f1', but: 'Toute l\'équipe sur les dalles du vestiaire.' },
    { id: 'grilles', nom: 'Les grilles', salle: 'f5', but: 'Traversez le Relais, la Balance, la Chaîne et le Creuset en vous tenant les grilles.' },
    { id: 'moules', nom: 'Les moules', salle: 'f6', but: 'Chacun dans un moule, en même temps.' },
    { id: 'forge', nom: 'Le Maître de Forge', salle: 'f7', but: 'Battez Vulcain et son Heatran, tous ensemble.' },
  ],
  textes: {
    perdu: ['Tes Pokémon n\'en peuvent plus...', 'Tu reprends tes esprits à l\'entrée de la salle. Ton équipe a été soignée.'],
    victoire: 'Les machines se taisent. La fonderie est à vous.',
  },
};
