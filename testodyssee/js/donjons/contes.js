// testodyssee/js/donjons/contes.js — le Bois des Contes : un grand labyrinthe de haies et, au bout de ses cinq sorties,
// cinq contes. Hansel et Gretel (la maison de la sorcière : salon, cuisine, jardin, trois étages, grenier fermé ;
// des missions par vagues, `vagues`), le Petit Chaperon rouge (la forêt sombre et la maison de
// Mère-Grand), Jack et le haricot magique (la tige, les nuages, le château du géant), Pinocchio (le ventre de la baleine)
// et Boucle d'or (la maison des trois ours, pas encore ouverte). Seul ou à plusieurs, sans mécanique de groupe.
// Mécaniques dans donjon/contes.js. Les salles se relient par des passages (`lien` : vers la salle, cible la marque
// d'en face) ; une `maison` est un bâtiment posé sur la marque, sa porte mène à la salle `vers`.
import { GameMap } from '../../../odyssee/js/world/mapgen.js';
import { T } from '../../../odyssee/js/world/tiles.js';

/** un tirage reproductible */
const graine = (s) => () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const grille = (w, h, c = '#') => Array.from({ length: h }, () => Array(w).fill(c));
const texte = (g) => g.map((r) => r.join(''));
const melanger = (l, r) => { for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l; };

/* ---------------- le labyrinthe de haies ---------------- */
// 97 × 97 cases, des couloirs d'une case entre des haies ; une clairière au centre ; l'entrée en bas, cinq sorties
// sur les bords (en haut à gauche, en haut, en haut à droite, à gauche, à droite). On y est dans la pénombre (`nuit`) :
// à l'entrée, cinq sacs de cailloux de couleur (un par joueur), qu'on sème derrière soi pour se repérer
import { maison } from './contes-maison.js';
const MAISON = maison();
export const LABYRINTHE = { w: 97, h: 97, centre: [48, 48] };
export const CAILLOUX = [['rouges', '#e24a4a'], ['bleus', '#4a8ae2'], ['jaunes', '#f2d23c'], ['blancs', '#f4f4f4'], ['violets', '#c05ae0']];
function labyrinthe() {
  const { w, h } = LABYRINTHE, g = grille(w, h), r = graine(1704);
  const cw = (w - 1) / 2, ch = (h - 1) / 2, vu = new Set(), pile = [[cw >> 1, ch - 1]];
  g[2 * (ch - 1) + 1][2 * (cw >> 1) + 1] = '.'; vu.add((cw >> 1) + ',' + (ch - 1));
  while (pile.length) {
    const [cx, cy] = pile[pile.length - 1];
    const v = melanger([[1, 0], [-1, 0], [0, 1], [0, -1]], r).map(([dx, dy]) => [cx + dx, cy + dy, dx, dy]).filter(([x, y]) => x >= 0 && y >= 0 && x < cw && y < ch && !vu.has(x + ',' + y));
    if (!v.length) { pile.pop(); continue; }
    const [x, y, dx, dy] = v[0];
    vu.add(x + ',' + y); g[2 * cy + 1 + dy][2 * cx + 1 + dx] = '.'; g[2 * y + 1][2 * x + 1] = '.'; pile.push([x, y]);
  }
  // quelques raccourcis : un labyrinthe à boucles, où l'on peut se perdre sans être coincé
  for (let k = 0; k < 110; k++) {
    const x = 1 + Math.floor(r() * (w - 2)), y = 1 + Math.floor(r() * (h - 2));
    if (g[y][x] !== '#' || (x % 2) === (y % 2)) continue;
    if ((g[y][x - 1] === '.' && g[y][x + 1] === '.') || (g[y - 1][x] === '.' && g[y + 1][x] === '.')) g[y][x] = '.';
  }
  // la clairière du centre (vide pour l'instant)
  const [cx, cy] = LABYRINTHE.centre;
  for (let y = cy - 4; y <= cy + 4; y++) for (let x = cx - 4; x <= cx + 4; x++) g[y][x] = '.';
  for (const [x, y] of [[cx - 4, cy - 4], [cx + 4, cy - 4], [cx - 4, cy + 4], [cx + 4, cy + 4]]) g[y][x] = 'f';
  // les sorties : une case de bord, ouverte sur le couloir d'à côté ; une pancarte devant
  const sorties = { 'α': [17, 0], 'γ': [49, 0], 'δ': [79, 0], 'β': [0, 49], 'ε': [w - 1, 47] };
  for (const [c, [x, y]] of Object.entries(sorties)) {
    g[y][x] = c;
    const [ix, iy] = x === 0 ? [1, y] : x === w - 1 ? [w - 2, y] : [x, 1];
    g[iy][ix] = '.';
  }
  // l'entrée, en bas
  const ex = 2 * (cw >> 1) + 1;
  for (let x = ex - 6; x <= ex + 6; x++) g[h - 2][x] = '.';
  g[h - 1][ex] = 'D'; g[h - 2][ex] = 'S';
  return texte(g);
}

/* ---------------- la forêt sombre du Petit Chaperon rouge ---------------- */
// 60 × 45 : un labyrinthe à larges allées sur une grille de 4 cases, des boucles, des clairières, des hautes herbes
// sombres (Pokémon sauvages), des fleurs ; l'arrivée en bas, la suite en haut
function foret(seed, haut, bas, places) {
  // haut : la marque de la sortie (en haut) ; bas : la marque de l'arrivée (en bas, sous S)
  const W = 60, H = 45, g = grille(W, H), r = graine(seed), P = 4, cw = 14, ch = 10;
  const ox = 2, oy = 2, cell = (cx, cy) => [ox + cx * P, oy + cy * P];
  const ouvrir = (x0, y0, x1, y1) => { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) if (x > 0 && y > 0 && x < W - 1 && y < H - 1) g[y][x] = '.'; };
  const vu = new Set(['7,9']), pile = [[7, 9]];
  const lier = (a, b) => { const [x0, y0] = cell(...a), [x1, y1] = cell(...b); ouvrir(x0, y0, x1 + 1, y1 + 1); };
  for (let cy = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++) { const [x, y] = cell(cx, cy); ouvrir(x, y, x + 1, y + 1); }
  while (pile.length) {
    const [cx, cy] = pile[pile.length - 1];
    const v = melanger([[1, 0], [-1, 0], [0, 1], [0, -1]], r).map(([dx, dy]) => [cx + dx, cy + dy]).filter(([x, y]) => x >= 0 && y >= 0 && x < cw && y < ch && !vu.has(x + ',' + y));
    if (!v.length) { pile.pop(); continue; }
    vu.add(v[0].join()); lier([cx, cy], v[0]); pile.push(v[0]);
  }
  for (let k = 0; k < 28; k++) { const cx = Math.floor(r() * (cw - 1)), cy = Math.floor(r() * (ch - 1)); if (r() < 0.5) lier([cx, cy], [cx + 1, cy]); else lier([cx, cy], [cx, cy + 1]); }
  // clairières
  for (let k = 0; k < 7; k++) { const x = 6 + Math.floor(r() * (W - 12)), y = 6 + Math.floor(r() * (H - 12)), a = 2 + Math.floor(r() * 3); for (let j = -a; j <= a; j++) for (let i = -a; i <= a; i++) if (i * i + j * j <= a * a + 1) ouvrir(x + i, y + j, x + i, y + j); }
  // herbes sombres, fleurs, quelques arbres isolés dans les clairières
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (g[y][x] !== '.') continue;
    const u = r();
    if (u < 0.3) g[y][x] = 'h'; else if (u < 0.33) g[y][x] = 'f';
  }
  // entrée en bas (sous S), sortie en haut : un couloir droit jusqu'aux allées
  const [ex, ey] = cell(7, 9), [sx] = cell(Math.floor(r() * cw), 0);
  for (let y = H - 2; y >= ey; y--) { g[y][ex] = '.'; g[y][ex + 1] = '.'; }
  g[H - 2][ex] = 'S'; g[H - 1][ex] = bas;
  for (let y = 1; y <= oy; y++) { g[y][sx] = '.'; g[y][sx + 1] = '.'; }
  g[0][sx] = haut;
  // les PNJ : sur des cases d'allée, une par place demandée
  for (const [c, cx, cy] of places) { const [x, y] = cell(cx, cy); g[y][x] = c; }
  return texte(g);
}

/* ---------------- le ventre de la baleine ---------------- */
// la gorge : un long couloir en lacets (trois allées de 34 cases) ; de loin en loin, un creux dans la paroi (ᴀ) où
// s'abriter du souffle
function gorge() {
  const W = 40, H = 13, g = grille(W, H), rows = [10, 6, 2];
  rows.forEach((y, i) => {
    for (let x = 2; x <= 36; x++) g[y][x] = '.';
    for (let x = i % 2 ? 33 : 5; i % 2 ? x >= 5 : x <= 33; x += i % 2 ? -7 : 7) g[y - 1][x] = 'ᴀ';
    if (i < rows.length - 1) { const cx = i % 2 ? 2 : 36; for (let yy = rows[i + 1]; yy <= y; yy++) g[yy][cx] = '.'; }
  });
  g[11][2] = 'S'; g[12][2] = 'Ν'; g[1][36] = 'ξ'; g[2][36] = '.';
  return texte(g);
}
// l'estomac : un lac de suc (L) ; des îlots de chair (.) reliés par des épaves (ᴇ) qui s'enfoncent si l'on s'y arrête
function estomac() {
  const W = 38, H = 18, g = grille(W, H, 'L'), r = graine(6262);
  for (let x = 0; x < W; x++) { g[0][x] = '#'; g[H - 1][x] = '#'; } for (let y = 0; y < H; y++) { g[y][0] = '#'; g[y][W - 1] = '#'; }
  const ilot = (x, y) => { for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) g[y + j][x + i] = '.'; };
  const epave = (x0, y0, x1, y1) => { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) if (g[y0][x] === 'L') g[y0][x] = 'ᴇ'; for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) if (g[y][x1] === 'L') g[y][x1] = 'ᴇ'; };
  const ilots = [[4, 14], [11, 10], [7, 5], [17, 4], [22, 9], [29, 13], [33, 7], [33, 3]];
  ilots.forEach(([x, y]) => ilot(x, y));
  for (let k = 1; k < ilots.length; k++) { const [a, b] = ilots[k - 1], [c, d] = ilots[k]; epave(a, b, c, d); }
  // un îlot à l'écart, avec un objet
  ilot(17, 14); epave(11, 10, 17, 14); g[14][17] = 'r';
  g[15][3] = 'S'; g[16][3] = 'Ξ'; g[2][33] = '.'; g[1][33] = 'ο'; g[0][33] = '#';
  if (r() < 0) g[1][1] = '#';
  return texte(g);
}

/* ---------------- la tige du haricot magique ---------------- */
// 23 × 64, de bas en haut : des feuilles (sol), le vide (_), des feuilles fragiles (h) qui tombent une fois quittées,
// des paliers (ᴘ) où l'on reprend après une chute
function tige() {
  // de bas en haut : une montée en lacets, des paliers (ᴘ), des passages de feuilles fragiles (ᶠ) au-dessus du vide (_),
  // quelques feuilles à l'écart avec un objet
  const W = 23, H = 60, g = grille(W, H, '_'), r = graine(5150);
  for (let y = 0; y < H; y++) { g[y][0] = '#'; g[y][W - 1] = '#'; }
  let x = 11, y = H - 2; g[y][x] = 'Λ'; y--; g[y][x] = 'S';
  const pose = (a, b, c) => { if (g[b][a] === '_' || c === 'ᴘ') g[b][a] = c; };
  let n = 0, objets = ['u', 'e', 'r'];
  while (y > 6) {
    // un palier 3 × 3 de temps en temps
    if (n % 2 === 0) { for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) pose(x + i, y - 1 + j, '.'); pose(x, y - 1, 'ᴘ'); y -= 3; }
    // une montée droite
    const up = 2 + Math.floor(r() * 3), fragile = n % 3 === 1;
    for (let k = 0; k < up; k++) { pose(x, y, fragile ? 'ᶠ' : '.'); y--; }
    // un passage de côté
    const dir = x < W / 2 ? 1 : -1, len = 3 + Math.floor(r() * 6), fr2 = n % 3 === 2;
    for (let k = 0; k < len; k++) { pose(x, y, fr2 ? 'ᶠ' : '.'); x = Math.max(2, Math.min(W - 3, x + dir)); }
    pose(x, y, '.');
    // une feuille à l'écart, avec un objet au bout
    if (n % 3 === 0 && objets.length) { const d = -dir, ox = Math.max(2, Math.min(W - 3, x + d * 3)); for (let a = Math.min(x, ox); a <= Math.max(x, ox); a++) pose(a, y + 1, 'ᶠ'); pose(ox, y + 1, objets.shift()); }
    y--; n++;
  }
  for (; y >= 1; y--) pose(x, y, '.');
  g[0][x] = 'μ';
  return texte(g);
}

export const SACS_PLACE = [[10, 4], [12, 4], [14, 4], [18, 4], [20, 4]];
function exterieur() {
  const m = new GameMap('labo:contes:dehors', 32, 26, { outdoor: true, fill: T.TREE, name: 'Orée des Contes', music: 'forest' });
  m.rect(4, 2, 27, 23, T.GRASS, [T.TREE]);
  // l'allée vers l'entrée du labyrinthe, au milieu du mur de haies
  for (let x = 4; x <= 27; x++) m.set(x, 2, T.BUSH);
  for (let y = 1; y <= 22; y++) m.set(16, y, T.PATH);
  m.set(16, 0, T.PATH); m.set(16, 1, T.PATH); m.set(16, 2, T.PATH);
  for (let y = 6; y <= 20; y += 4) for (const x of [12, 20]) m.prop('lanterne', x, y);
  m.rect(6, 8, 10, 12, T.FLOWER, [T.GRASS]); m.rect(22, 8, 26, 12, T.FLOWER, [T.GRASS]);
  m.prop('fontaine', 16, 15); m.set(16, 15, T.BLOCK);
  for (let y = 14; y <= 16; y++) { m.set(15, y, T.PATH); m.set(17, y, T.PATH); }
  // les sacs de cailloux, sur la place devant l'entrée du labyrinthe (un par joueur, état partagé du donjon)
  SACS_PLACE.forEach(([x, y], n) => {
    m.prop('sac' + n, x, y, true);
    m.object(x, y, { use: (api) => { const D = api.game.donjons; return D.sacCailloux(D.defs.get('contes'), { n }); } });
  });
  m.zone(0, 0, 31, 25, { name: 'Orée des Contes', music: 'forest' });
  return { carte: m, porte: [16, 1], arrivee: [16, 21] };
}

// équipes des dresseurs : [espèce, niveau] (niveaux 40 à 45)
const dres = (cls, nom, sprite, dir, defi, equipe, o = {}) => ({ cls, nom, sprite, dir, vue: 4, prix: 1200, defi, equipe, ...o });

const pnj = {
  // Hansel et Gretel : la sorcière au salon, les enfants enfermés au grenier
  'ŝ': { id: 'sorciere-hall', cls: 'Vieille dame', nom: 'Grisemine', sprite: 'medium', dir: 'down', toujours: true, sorciere: 'hall' },
  'ĥ': { id: 'hansel', cls: '', nom: 'Hansel', sprite: 'gamin', dir: 'down', toujours: true, enfant: 'hansel' },
  'ĝ': { id: 'gretel', cls: '', nom: 'Gretel', sprite: 'fillette', dir: 'down', toujours: true, enfant: 'gretel' },
  // le Petit Chaperon rouge, Mère-Grand (le loup), les dresseurs de la forêt
  'ĉ': { id: 'chaperon', cls: '', nom: 'Chaperon rouge', sprite: 'fillette2', dir: 'up', toujours: true, chaperon: true },
  'ƥ': { id: 'mere-grand', cls: '', nom: 'Mère-Grand', sprite: 'dame', dir: 'down', toujours: true, mereGrand: true },
  'ł': { id: 'loup', cls: 'Grand méchant loup', nom: 'Mère-Grand', sprite: 'dame', dir: 'down', toujours: true, loup: true, boss: true, prix: 4000, equipe: [[262, 45], [229, 44], [359, 45]] },
  'ā': dres('Bûcheron', 'Firmin', 'montagnard', 'down', 'Ce bois n\'aime pas les promeneurs. Moi non plus.', [[73, 40], [272, 41]]),
  'ē': dres('Cueilleuse', 'Mirabelle', 'randonneuse', 'left', 'Tu marches sur mes champignons !', [[47, 41], [286, 41]]),
  'ī': dres('Insectomane', 'Basile', 'insectomane', 'right', 'Chut ! Les Insectes sortent quand il fait sombre.', [[49, 40], [168, 41], [214, 42]]),
  'ō': dres('Chasseur', 'Gontran', 'garde', 'up', 'Je traque un loup énorme. Tu ne l\'aurais pas vu ?', [[59, 42], [262, 41]]),
  'ū': dres('Médium', 'Ombeline', 'medium', 'down', 'Les arbres murmurent ton nom...', [[94, 41], [429, 42]]),
  'ǎ': dres('Bûcheron', 'Anatole', 'montagnard', 'right', 'Le bois est plus noir par ici. Fais demi-tour.', [[68, 42], [210, 43]]),
  'ě': dres('Cueilleuse', 'Prune', 'randonneuse', 'down', 'Des fleurs pour Mère-Grand ? Elles sont à moi !', [[182, 42], [407, 43]]),
  'ǐ': dres('Insectomane', 'Lucien', 'insectomane', 'left', 'Ma collection n\'est pas complète sans toi.', [[123, 42], [291, 43], [212, 43]]),
  'ǒ': dres('Chasseur', 'Barnabé', 'garde', 'down', 'Le loup rôde près de la maison de la vieille. Méfie-toi.', [[229, 43], [59, 43]]),
  'ǔ': dres('Médium', 'Séraphine', 'medium', 'up', 'Le loup a déjà mangé ce soir. Il a encore faim.', [[477, 43], [354, 44]]),
  // Jack et le haricot magique
  'ĵ': { id: 'jack', cls: '', nom: 'Jack', sprite: 'gamin', dir: 'down', toujours: true, jack: true },
  'Ǵ': { id: 'geant', cls: 'Géant', nom: 'Ronflonflon', sprite: 'brutus', dir: 'down', toujours: true, geant: true, boss: true, prix: 5000, equipe: [[143, 47], [76, 45], [464, 45]] },
  // Pinocchio
  'ṗ': { id: 'pecheur', cls: 'Pêcheur', nom: 'Gédéon', sprite: 'pecheur', dir: 'up', toujours: true, pecheur: true },
  'ṁ': { id: 'matelot-1', cls: 'Matelot', nom: 'Barbouille', sprite: 'marin', dir: 'down', toujours: true, matelot: 0 },
  'ṅ': { id: 'matelot-2', cls: 'Matelot', nom: 'Sardine', sprite: 'marin', dir: 'down', toujours: true, matelot: 1 },
  'ṙ': { id: 'matelot-3', cls: 'Mousse', nom: 'Petit-Louis', sprite: 'gamin', dir: 'down', toujours: true, matelot: 2 },
  'ṡ': { id: 'matelot-4', cls: 'Capitaine', nom: 'Barbe-Grise', sprite: 'capitaine', dir: 'down', toujours: true, matelot: 3 },
  'ḃ': { id: 'marionnette', cls: 'Marionnette', nom: 'Fil-de-Fer', sprite: 'spectrel', dir: 'down', toujours: true, marionnette: true, boss: true, prix: 4000, equipe: [[354, 45], [609, 44], [94, 44]] },
  'ǧ': { id: 'geppetto', cls: '', nom: 'Geppetto', sprite: 'vieil_homme', dir: 'down', toujours: true, geppetto: true },
  'ṕ': { id: 'pinocchio', cls: '', nom: 'Pinocchio', sprite: 'gamin', dir: 'down', toujours: true, pinocchio: true },
};

// le Bois des Contes : la salle 0 est le labyrinthe (relié à l'Orée des Contes)
const CONTES = {
  id: 'contes',
  carte: 'labo:contes',
  nom: 'Bois des Contes',
  niveau: 'niv. 40 à 45',
  entree: 'Un labyrinthe de haies, et à chacune de ses sorties, un conte qu\'on croyait connaître. On y entre seul ou à plusieurs.',
  joueurs: { mode: 'groupe', n: 1 },
  musique: 'forest',
  equipe: 'milieu',
  style: 'bois',
  contes: true,
  exterieur,
  textes: { perdu: 'Tes Pokémon n\'en peuvent plus... Tu te réveilles un peu plus loin, ton équipe soignée.' },
  decor: { '|': 'colonne', p: 'table', n: 'tonneau', c: 'caisse', y: 'coffre', w: 'caisses', 'ʙ': 'bed', 'Ŗ': 'counter', k: 'books', 'ş': 'shelf', 'ḱ': 'kitchen', 'ƒ': 'fireplace', 'ą': 'armoire', 'ç': 'chair', 'ɓ': 'boxes', 'ṽ': 'vase', 'ŀ': 'lanterne', 'ḅ': 'bateau', 'ḟ': 'fontaine', 'ʗ': 'cheval', 'ʘ': 'cubes', 'ʚ': 'peluche', 'ʞ': 'poupee', 'Ɵ': 'clock', 'Ƨ': 'sofa', 'Ƥ': 'plant', 'ɰ': 'miroir_pied_g', 'ŧ': 'painting', 'ȃ': 'armure', 'ȓ': 'ratelier', 'ȇ': 'enclume' },
  objets: {
    // le décor en plein air
    Y: { type: 'tuile', sol: true, t: 'TREE' },
    h: { type: 'tuile', sol: true, t: 'DARKTALL' },
    f: { type: 'tuile', sol: true, t: 'FLOWER' },
    '~': { type: 'tuile', sol: true, t: 'WATER' },
    ':': { type: 'tuile', sol: true, t: 'SAND' },
    L: { type: 'tuile', sol: true, t: 'LAVA' },
    '%': { type: 'tuile', sol: true, t: 'BUSH' },
    // objets à ramasser
    u: { type: 'ramasser', objet: 'max-potion' },
    e: { type: 'ramasser', objet: 'full-restore' },
    r: { type: 'ramasser', objet: 'revive' },
    // les sorties du labyrinthe et leurs retours
    'α': { type: 'lien', sol: true, vers: 'hg0', cible: 'Α', conte: 'Hansel et Gretel' }, 'Α': { type: 'lien', sol: true, vers: 'lab', cible: 'α' },
    'β': { type: 'lien', sol: true, vers: 'cr1', cible: 'Β', conte: 'Le Petit Chaperon rouge' }, 'Β': { type: 'lien', sol: true, vers: 'lab', cible: 'β' },
    'γ': { type: 'lien', sol: true, vers: 'pn0', cible: 'Γ', conte: 'Pinocchio' }, 'Γ': { type: 'lien', sol: true, vers: 'lab', cible: 'γ' },
    'δ': { type: 'lien', sol: true, vers: 'jk0', cible: 'Δ', conte: 'Jack et le haricot magique' }, 'Δ': { type: 'lien', sol: true, vers: 'lab', cible: 'δ' },
    'ε': { type: 'lien', sol: true, vers: 'bo0', cible: 'Ε', conte: 'Boucle d\'or' }, 'Ε': { type: 'lien', sol: true, vers: 'lab', cible: 'ε' },
    // Hansel et Gretel : la maison (salon et cuisine, jardin, trois étages, grenier fermé à clé), le débarras
    'ħ': { type: 'maison', sol: true, batiment: 'bighouse', modele: 'painEpice', w: 15, d: 8, door: 7, nom: 'Manoir en pain d\'épice', vers: 'hg1', cible: 'ƕ' },
    'ƕ': { type: 'lien', sol: true, vers: 'hg0', cible: 'ħ' },
    'ρ': { type: 'lien', sol: true, vers: 'hgj', cible: 'Ρ' }, 'Ρ': { type: 'lien', sol: true, vers: 'hg1', cible: 'ρ' },
    'ζ': { type: 'lien', sol: true, vers: 'hg2', cible: 'Ζ', escalier: true }, 'Ζ': { type: 'lien', sol: true, vers: 'hg1', cible: 'ζ', escalier: true },
    'η': { type: 'lien', sol: true, vers: 'hg3', cible: 'Η', escalier: true }, 'Η': { type: 'lien', sol: true, vers: 'hg2', cible: 'η', escalier: true },
    'θ': { type: 'lien', sol: true, vers: 'hg4', cible: 'Θ', escalier: true }, 'Θ': { type: 'lien', sol: true, vers: 'hg3', cible: 'θ', escalier: true },
    'σ': { type: 'lien', sol: true, vers: 'hg5', cible: 'Σ', bloque: 'grenier' }, 'Σ': { type: 'lien', sol: true, vers: 'hg4', cible: 'σ' },
    ...MAISON.objets,   // les portes des couloirs et des pièces
    // le manoir : tapisseries et portraits accrochés aux murs (rendu.js)
    'Ƭ': { type: 'tenture', mur: true, tenture: 'tapisserie' }, 'Ʊ': { type: 'tenture', mur: true, tenture: 'portrait' }, 'Ʋ': { type: 'tenture', mur: true, tenture: 'dessin' }, 'Ʌ': { type: 'tenture', mur: true, tenture: 'panoplie' },
    // les sacs de cailloux du labyrinthe
    '❍': { type: 'sac', decor: 'sac0', n: 0 }, '❎': { type: 'sac', decor: 'sac1', n: 1 }, '❏': { type: 'sac', decor: 'sac2', n: 2 }, '❐': { type: 'sac', decor: 'sac3', n: 3 }, '❑': { type: 'sac', decor: 'sac4', n: 4 },
    // le potager
    '⁚': { type: 'terre', sol: true },
    'ⓒ': { type: 'legume', sol: true, legume: 'carotte' }, 'ⓘ': { type: 'legume', sol: true, legume: 'citrouille' },
    'ⓟ': { type: 'legume', sol: true, legume: 'patate' }, 'ⓞ': { type: 'legume', sol: true, legume: 'oignon' },
    // les meubles lourds : ils se poussent avec Force (donjon/meubles.js)
    'Ⓐ': { type: 'meuble', sol: true, sprite: 'armoire' }, 'Ⓛ': { type: 'meuble', sol: true, sprite: 'bed' }, 'Ⓣ': { type: 'meuble', sol: true, sprite: 'table' },
    'Ⓧ': { type: 'meuble', sol: true, sprite: 'boxes' }, 'Ⓢ': { type: 'meuble', sol: true, sprite: 'chair' },
    'Ⓚ': { type: 'meuble', sol: true, sprite: 'caisse' }, 'Ⓡ': { type: 'meuble', sol: true, sprite: 'tonneau' }, 'Ⓜ': { type: 'meuble', sol: true, sprite: 'miroir_pied_d' },
    // les missions de la sorcière
    'Ⓑ': { type: 'bois', decor: 'buches' },
    'Ⓦ': { type: 'puits', decor: 'porte_vide' },   // le puits lui-même est un volume (batiments de la salle hgj)
    'Ⓗ': { type: 'chaudron', decor: 'chaudron' },
    'Ⓞ': { type: 'four', decor: 'fireplace' },
    '❶': { type: 'soufflet', decor: 'soufflet', n: 0 }, '❷': { type: 'soufflet', decor: 'soufflet', n: 1 }, '❸': { type: 'soufflet', decor: 'soufflet', n: 2 },
    'Ⓝ': { type: 'note', decor: 'livres' },
    // le Petit Chaperon rouge
    'ι': { type: 'lien', sol: true, vers: 'cr2', cible: 'Ι' }, 'Ι': { type: 'lien', sol: true, vers: 'cr1', cible: 'ι' },
    'κ': { type: 'lien', sol: true, vers: 'cr3', cible: 'Κ' }, 'Κ': { type: 'lien', sol: true, vers: 'cr2', cible: 'κ' },
    'ŋ': { type: 'maison', sol: true, batiment: 'house', toit: 'red', nom: 'Maison de Mère-Grand', vers: 'cr4', cible: 'Ŋ' },
    'Ŋ': { type: 'lien', sol: true, vers: 'cr3', cible: 'ŋ' },
    // Jack et le haricot magique
    'λ': { type: 'lien', sol: true, vers: 'jk1', cible: 'Λ', liane: true }, 'Λ': { type: 'lien', sol: true, vers: 'jk0', cible: 'λ' },
    'μ': { type: 'lien', sol: true, vers: 'jk2', cible: 'Μ' }, 'Μ': { type: 'lien', sol: true, vers: 'jk1', cible: 'μ' },
    'ɱ': { type: 'maison', sol: true, batiment: 'gym', toit: 'gray', nom: 'Château du Géant', vers: 'jk3', cible: 'Ɱ' },
    'Ɱ': { type: 'lien', sol: true, vers: 'jk2', cible: 'ɱ' },
    _: { type: 'vide', sol: true, decor: 'gouffre' },
    'ᶠ': { type: 'fragile', sol: true },
    'ᴘ': { type: 'palier', sol: true },
    'ᴄ': { type: 'grince', sol: true, decor: 'traverse' },
    '❦': { type: 'poule', decor: 'coffre' },
    // Pinocchio
    'ν': { type: 'lien', sol: true, vers: 'pn1', cible: 'Ν', gueule: true }, 'Ν': { type: 'lien', sol: true, vers: 'pn0', cible: 'ν' },
    'ξ': { type: 'lien', sol: true, vers: 'pn2', cible: 'Ξ' }, 'Ξ': { type: 'lien', sol: true, vers: 'pn1', cible: 'ξ' },
    'ο': { type: 'lien', sol: true, vers: 'pn3', cible: 'Ο' }, 'Ο': { type: 'lien', sol: true, vers: 'pn2', cible: 'ο' },
    'π': { type: 'lien', sol: true, vers: 'pn4', cible: 'Π', bloque: 'marionnette' }, 'Π': { type: 'lien', sol: true, vers: 'pn3', cible: 'π' },
    'ᴀ': { type: 'abri', sol: true },
    'ᴇ': { type: 'epave', sol: true, decor: 'traverse' },
    '⑤': { type: 'coffrePn', decor: 'coffre', n: 0 }, '⑥': { type: 'coffrePn', decor: 'coffre', n: 1 },
    '⑦': { type: 'coffrePn', decor: 'coffre', n: 2 }, '⑧': { type: 'coffrePn', decor: 'coffre', n: 3 },
    '♨': { type: 'bucher', decor: 'brasier' },
    // Boucle d'or : la maison des trois ours, fermée pour l'instant
    'ƀ': { type: 'maison', sol: true, batiment: 'house2', toit: 'brown', nom: 'Maison des Trois Ours', ferme: true },
  },
  // les missions de la sorcière, par vagues (les vagues 2 et 3 viendront)
  vagues: [
    { nom: 'Préparer le feu', missions: [
      { id: 'bois', nom: 'Du bois du bûcher', ou: 'jardin' },
      { id: 'eau', nom: 'De l\'eau du puits', ou: 'jardin' },
      { id: 'chaudron', nom: 'Le grand chaudron', ou: 'débarras, 1er étage' },
      { id: 'four', nom: 'Allumer le four', ou: 'cuisine' },
    ] },
  ],
  pnj,
  salles: [
    // le labyrinthe de haies (plein air) : l'entrée en bas, cinq sorties
    { id: 'lab', nom: 'Labyrinthe des Haies', type: 'libre', dehors: true, mur: 'BUSH', haies: true, nuit: true, style: null, musique: 'neyla', plan: labyrinthe() },
    // Hansel et Gretel : la clairière, puis la maison (salon et cuisine, jardin, trois étages de dix pièces, grenier)
    { id: 'hg0', nom: 'Clairière du Manoir en Pain d\'Épice', type: 'libre', dehors: true, style: null, musique: 'alley', conte: 'hg', plan: [
      "#############################",
      "##....f.hh.........fhh.....##",
      "##.Y.......f.............Y.##",
      "##.....................f...##",
      "##.........................##",
      "##.........................##",
      "##.........................##",
      "##.........................##",
      "##Y.......................Y##",
      "##.........................##",
      "##.........................##",
      "##..f...................f..##",
      "##............ħ............##",
      "##.........................##",
      "##..hh.................hh..##",
      "##.Y.....f.........f.....Y.##",
      "##....Y...............Y....##",
      "##.........f..S..f.........##",
      "##############Α##############",
    ] },
    // le hall : manoir sombre, tapisseries et portraits, tapis rouge de l'entrée au grand escalier ; le salon à gauche, la cuisine à droite
    { id: 'hg1', nom: 'Maison de la vieille dame — Hall', type: 'libre', conte: 'hg', style: 'manoir', tapis: [[13, 2, 15, 11], [4, 4, 8, 8], [20, 6, 24, 8]], plan: [
      "##########################################",
      "####Ʊ##Ʊ##Ƭ#######Ƭ####Ʊ##################",
      "##kk.ƒ..ş...ṽ.ζ.ṽ....Ɵ..kkş.#ḱḱ..Ⓞ..❶❷❸.##",
      "##..........................#...........##",
      "##..........................#...........##",
      "##Ƥ..ç.ç...................Ƥ#..p.p...Ⓝ..##",
      "##....p..Ƨ..............................##",
      "##...ç.ç..............Ƨ.................##",
      "##........ŝ.................#...........##",
      "##ą.........................#...........##",
      "##.........................Ƥ########ρ#####",
      "##Ƥ......ŀ....S....ŀ........##############",
      "##############ƕ###########################",
    ] },
    { id: 'hgj', nom: 'Jardin de la vieille dame', type: 'libre', batiments: [
      { modele: 'puitsJardin', x: 5, y: 11, w: 2, d: 2 },
      { modele: 'cabaneOutils', x: 13, y: 16, w: 3, d: 3, nom: 'Cabane à outils', texte: ['Une cabane à outils. La porte bâille.', 'Des râteaux, des pelles, des pots... et une drôle d\'odeur de pain d\'épice.'] },
    ],  dehors: true, style: null, musique: 'alley', conte: 'hg', zoneOpts: { theme: 'forest' }, plan: MAISON.jardin },
    // les trois étages (un couloir, dix pièces chacun) : donjons/contes-maison.js
    ...MAISON.salles,
    { id: 'hg5', nom: 'Maison de la vieille dame — Grenier', type: 'libre', conte: 'hg', plan: [
      "############################",
      "############################",
      "##ɓɓ..n..c.....w...ɓ......##",
      "##..........|.......|.....##",
      "##.ɓ..w.....ĥ.ĝ.........c.##",
      "##........................##",
      "##......................SΣ##",
      "############################",
    ] },
    // le Petit Chaperon rouge : deux salles de forêt sombre, puis la clairière et la maison de Mère-Grand
    { id: 'cr1', musique: 'prague', nom: 'Forêt Sombre', type: 'libre', dehors: true, style: null, conte: 'cr', zoneOpts: { theme: 'forest', ombre: 0.85, enc: ENC_FORET() },
      plan: foret(3101, 'ι', 'Β', [['ĉ', 7, 8], ['ā', 2, 6], ['ē', 11, 7], ['ī', 4, 2], ['ō', 9, 3], ['ū', 13, 1]]) },
    { id: 'cr2', musique: 'prague', nom: 'Cœur de la Forêt', type: 'libre', dehors: true, style: null, conte: 'cr', zoneOpts: { theme: 'forest', ombre: 0.9, enc: ENC_FORET() },
      plan: foret(3202, 'κ', 'Ι', [['ǎ', 1, 7], ['ě', 12, 6], ['ǐ', 5, 3], ['ǒ', 10, 2], ['ǔ', 3, 0]]) },
    { id: 'cr3', musique: 'prague', nom: 'Clairière de Mère-Grand', type: 'libre', dehors: true, style: null, conte: 'cr', zoneOpts: { theme: 'forest', ombre: 0.6 },
      plan: [
        "##########################",
        "##YY..f.....f......f..YY##",
        "##Y...................f.Y##",
        "##..f.......ŋ.........hh##",
        "##....................hh##",
        "##..hh......:.......f...##",
        "##..hh......:...........##",
        "##Y.........:.........Y.##",
        "##YY.f......S.....f..YYY##",
        "############Κ#############",
      ] },
    { id: 'cr4', nom: 'Chez Mère-Grand', type: 'libre', conte: 'cr', plan: [
      "################",
      "################",
      "##ƒ..ʙł...ąƥ.ş##",
      "##............##",
      "##..ç.p.ç.....##",
      "##.........ṽ..##",
      "##.....S......##",
      "#######Ŋ########",
    ] },
    // Jack et le haricot magique : le potager, la tige, les nuages, le château du géant
    { id: 'jk0', nom: 'Potager de Jack', type: 'libre', dehors: true, style: null, conte: 'jk', plan: [
      "############################",
      "##..........λ.............##",
      "##..f..hh..............f..##",
      "##.....hh.....ĵ...........##",
      "##..........:.............##",
      "##..Y.......:.......hh....##",
      "##..........:.......hh..Y.##",
      "##.f........S.........f...##",
      "############Δ###############",
    ] },
    { id: 'jk1', nom: 'La Tige du Haricot', type: 'libre', dehors: true, style: null, conte: 'jk', plan: tige() },
    { id: 'jk2', nom: 'Au-dessus des Nuages', type: 'libre', dehors: true, style: null, conte: 'jk', solDehors: 'SNOW', plan: [
      "##############################",
      "##..........................##",
      "##..........................##",
      "##..........................##",
      "##..........................##",
      "##.............ɱ............##",
      "##..........................##",
      "##..........................##",
      "##..........................##",
      "##.............S............##",
      "###############Μ##############",
    ] },
    { id: 'jk3', nom: 'Château du Géant', type: 'libre', conte: 'jk', style: 'clair', plan: [
      "################################",
      "################################",
      "##|....|....|.Ǵ..|....|....❦.##",
      "##.ᴄ......ᴄᴄ.....ᴄ.....ᴄ......##",
      "##..ᴄ.ᴄ.....ᴄ......ᴄᴄ....ᴄ..ᴄ.##",
      "##ᴄ.....ᴄ.....ᴄ.ᴄ.......ᴄ.....##",
      "##..ᴄᴄ.....ᴄ.........ᴄ...ᴄ.ᴄ..##",
      "##.....ᴄ.....ᴄᴄ....ᴄ.......ᴄ..##",
      "##.ᴄ.....ᴄ.......ᴄ....ᴄᴄ......##",
      "##|....|....|.S..|....|....|..##",
      "##############Ɱ#################",
    ] },
    // Pinocchio : la plage, la gorge, l'estomac, l'épave, la cabine de Geppetto
    { id: 'pn0', nom: 'Plage de la Baleine', type: 'libre', dehors: true, style: null, conte: 'pn', solDehors: 'SAND', plan: [
      "##############################",
      "##~~~~~~~~~~~~~~~~~~~~~~~~~~##",
      "##~~~~~~~~~~~~~~~~~~~~~~~~~~##",
      "##~~~~~~~~~~~ν~~~~~~~~~~~~~~##",
      "##~~~~~~~~~~...~~~~~~~~~~~~~##",
      "##..........................##",
      "##.ḅ.......ṗ..............ḅ.##",
      "##..........................##",
      "##....n.............c.......##",
      "##.............S............##",
      "###############Γ##############",
    ] },
    { id: 'pn1', nom: 'Gorge de la Baleine', type: 'libre', conte: 'pn', style: 'poison', plan: gorge() },
    { id: 'pn2', nom: 'Estomac de la Baleine', type: 'libre', conte: 'pn', style: 'poison', plan: estomac() },
    { id: 'pn3', nom: 'Épave du Navire', type: 'libre', conte: 'pn', plan: [
      "####################################",
      "####################################",
      "##⑤..n.##⑥..c.##⑦..w.##⑧..n..###π###",
      "##.....##.....##.....##......##.ḃ.##",
      "##..ṁ..##..ṅ..##..ṙ..##..ṡ...##...##",
      "###.######.######.######.######.####",
      "##................................##",
      "##.ŀ..........ŀ..........ŀ......u.##",
      "##.S..............................##",
      "##Ο#################################",
    ] },
    { id: 'pn4', nom: 'Cabine de Geppetto', type: 'libre', conte: 'pn', plan: [
      "##################",
      "##################",
      "##ʙ..p.ç...♨..ş.##",
      "##..............##",
      "##..ǧ.ṕ.........##",
      "##......S.......##",
      "########Π#########",
    ] },
    // Boucle d'or : la maison des trois ours, fermée pour l'instant
    { id: 'bo0', nom: 'Clairière des Trois Ours', type: 'libre', dehors: true, style: null, conte: 'bo', plan: [
      "########################",
      "##..f.....hh.......f..##",
      "##....................##",
      "##..Y.....ƀ.......Y...##",
      "##....................##",
      "##..hh.............f..##",
      "##.........S..........##",
      "###########Ε############",
    ] },
  ],
  journal: [
    { id: 'labyrinthe', nom: 'Le labyrinthe', salle: 'lab', but: 'Cinq sorties, cinq contes. Une pancarte devant chacune dit lequel.' },
  ],
};

/** les Pokémon sauvages de la forêt sombre ([espèce, niveau min, max, poids]) */
function ENC_FORET() { return [[164, 40, 43, 15], [217, 41, 44, 8], [262, 40, 43, 12], [47, 40, 43, 10], [49, 40, 43, 10], [168, 40, 43, 10], [198, 40, 42, 10], [357, 41, 43, 6], [286, 41, 43, 6]]; }

export default CONTES;
