// testodyssee/js/horloge.js — la Tour de l'Horloge, niveau 0 (futur donjon, au moins deux joueurs). Une horloge
// gigantesque au creux de la tour, tout est à la même hauteur. Au centre, la barre du pivot (on n'y marche pas) ; autour,
// trois aiguilles : la grande et large, la grande et fine (la plus longue) et la petite (qui servira aux étages -1 et 1).
// Contre le mur, des plateformes : les grandes touchent la pointe des deux grandes aiguilles, les corniches seulement
// celle de l'aiguille fine. Sur chaque plateforme, deux leviers font tourner une aiguille d'une heure ; celui qui se tient
// sur l'aiguille est emporté avec elle, mais il ne peut pas tirer le levier lui-même : seul, on ne quitte pas le quai.
// Trois petites salles dans le mur, et la clé du mécanisme central (qui fera monter ou descendre l'horloge vers les
// étages 1 et -1). Logique sans DOM ici ; le dessin est dans horloge-vue.js, les règles du jeu dans horloge-jeu.js.
import { room } from '../../odyssee/js/world/interiors.js';
import { GameMap, rng } from '../../odyssee/js/world/mapgen.js';
import { T } from '../../odyssee/js/world/tiles.js';

export const HORLOGE = 'labo:horloge';
export const DEHORS = 'labo:horloge:dehors';
export const W = 50, H = 48;
/** centre du cadran (le milieu de cette case), rayon de la barre du pivot, rayon du mur de la tour */
export const C = [25, 24], R_PIVOT = 3, R_MUR = 22;
/** les aiguilles : jusqu'où on y marche (en cases), demi-largeur de leurs cases */
export const AIG = { grande: { r: 17.6, l: 0.75 }, fine: { r: 19.6, l: 0.45 }, petite: { r: 11.6, l: 0.75 } };
export const NOMS = { grande: 'la grande aiguille', fine: 'l\'aiguille fine', petite: 'la petite aiguille' };
/** direction d'une heure (0 = midi, dans le sens des aiguilles d'une montre) : [dx, dy] sur la carte */
export const sens = (k) => { const a = (k * Math.PI) / 6; return [Math.sin(a), -Math.cos(a)]; };
const cle = (x, y) => x + ',' + y;
const centre = () => [C[0] + 0.5, C[1] + 0.5];
export const heure = (k) => ((Math.round(k) % 12) + 12) % 12;

/** les plateformes : à l'heure k, du rayon r0 au rayon r1, demi-largeur l ; les corniches ne touchent que l'aiguille fine */
export const PLATEFORMES = [
  { id: 'quai', k: 6, r0: 18.3, r1: 21.4, l: 5.5, nom: 'Le quai' },
  { id: 'dix', k: 10, r0: 18.3, r1: 21.4, l: 3.5, nom: 'La plateforme de dix heures' },
  { id: 'deux', k: 2, r0: 18.3, r1: 21.4, l: 3.5, nom: 'La plateforme de deux heures' },
  { id: 'midi', k: 0, r0: 20, r1: 21.6, l: 2.5, nom: 'La corniche de midi', corniche: true },
];
/** une place sur une plateforme : r (rayon), t (de côté, dans le sens des aiguilles) */
export function caseSur(pf, r, t) {
  const p = PLATEFORMES.find((q) => q.id === pf), [dx, dy] = sens(p.k), [cx, cy] = centre();
  return [Math.floor(cx + dx * r - dy * t), Math.floor(cy + dy * r + dx * t)];
}
const exterieur = (p) => p.r1 - 0.5;
/** les leviers : deux par plateforme, la grande aiguille à gauche, la fine à droite (vus depuis le centre) */
export const LEVIERS = PLATEFORMES.flatMap((p) => [
  { pf: p.id, quoi: 'grande', t: -(p.l - 0.5), nom: 'Le levier rouge (la grande aiguille)' },
  { pf: p.id, quoi: 'fine', t: p.l - 0.5, nom: 'Le levier bleu (l\'aiguille fine)' },
]);
export const placeLevier = (L) => { const p = PLATEFORMES.find((q) => q.id === L.pf); return caseSur(p.id, exterieur(p), L.t); };
/** les trois salles du mur : une porte au fond de leur plateforme */
export const SALLES = [
  { id: 'dix', pf: 'dix', nom: 'La salle de dix heures' },
  { id: 'deux', pf: 'deux', nom: 'La salle de deux heures' },
  { id: 'midi', pf: 'midi', nom: 'La salle de midi' },
];
export const salleId = (s) => `${HORLOGE}:salle:${s.id}`;
export const placePorte = (s) => { const p = PLATEFORMES.find((q) => q.id === s.pf); return caseSur(p.id, p.r1 + 0.7, 0); };
/** la clé du mécanisme central (sur la corniche de midi) et le mécanisme (sur le quai) */
export const CLE = { pf: 'midi', t: -1 };
export const placeCle = () => { const p = PLATEFORMES.find((q) => q.id === CLE.pf); return caseSur(p.id, exterieur(p), CLE.t); };
export const MECANISME = { pf: 'quai', t: 2.5 };
export const placeMecanisme = () => caseSur('quai', exterieur(PLATEFORMES[0]), MECANISME.t);
/** la sortie de la tour, derrière le quai ; l'arrivée, au bord du quai */
export const placeSortie = () => caseSur('quai', PLATEFORMES[0].r1 + 0.7, 0);
export const placeArrivee = () => caseSur('quai', exterieur(PLATEFORMES[0]), 0);

/** les cases d'une bande qui part du centre dans la direction de l'heure k, du rayon r0 au rayon r1, de demi-largeur l */
export function bande(k, r0, r1, l) {
  const [dx, dy] = sens(k), [px, py] = [-dy, dx], [cx, cy] = centre(), out = new Set();
  for (let r = r0; r <= r1 + 1e-6; r += 0.2) for (let t = -l; t <= l + 1e-6; t += 0.15) out.add(cle(Math.floor(cx + dx * r + px * t), Math.floor(cy + dy * r + py * t)));
  return out;
}
const AIG_CASES = new Map();
/** les cases d'une aiguille à l'heure k (hors du pivot) */
export function casesAiguille(quoi, k) {
  const id = quoi + heure(k);
  if (!AIG_CASES.has(id)) { const piv = casesPivot(), s = bande(heure(k), R_PIVOT, AIG[quoi].r, AIG[quoi].l); for (const c of piv) s.delete(c); AIG_CASES.set(id, s); }
  return AIG_CASES.get(id);
}
let PIVOT = null;
/** les cases de la barre du pivot (un disque au centre, infranchissable) */
export function casesPivot() {
  if (PIVOT) return PIVOT;
  const [cx, cy] = centre(); PIVOT = new Set();
  for (let y = C[1] - 4; y <= C[1] + 4; y++) for (let x = C[0] - 4; x <= C[0] + 4; x++) if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < R_PIVOT) PIVOT.add(cle(x, y));
  return PIVOT;
}
const PF_CASES = new Map(PLATEFORMES.map((p) => [p.id, bande(p.k, p.r0, p.r1, p.l)]));
export const casesPlateforme = (id) => PF_CASES.get(id);

/** l'état de départ : les deux grandes aiguilles sur six heures (vers le quai), la petite sur trois heures, pas de clé */
export const depart = () => ({ grande: 6, fine: 6, petite: 3, niv: 0, cle: false });
export const AIGUILLES = ['grande', 'fine', 'petite'];

/** ce qu'il y a dans une case : { quoi: 'pf', id } ou { quoi: <aiguilles qui la couvrent> } ou null (le vide) */
export function caseHorloge(E, x, y) {
  const k = cle(x, y);
  for (const p of PLATEFORMES) if (PF_CASES.get(p.id).has(k)) return { quoi: 'pf', id: p.id };
  const sur = AIGUILLES.filter((a) => casesAiguille(a, E[a]).has(k));
  return sur.length ? { quoi: 'aiguille', sur } : null;
}
/** les cases qu'on ne traverse pas : leviers, clé (tant qu'elle est là), mécanisme */
export function obstacles(E) {
  const s = new Set(LEVIERS.map((L) => cle(...placeLevier(L))));
  if (!E.cle) s.add(cle(...placeCle()));
  s.add(cle(...placeMecanisme()));
  return s;
}
/** pose les cases praticables de la carte selon l'état (le vide est infranchissable) */
export function appliquer(m, E) {
  const obs = obstacles(E);
  for (let y = 2; y < H; y++) for (let x = 1; x < W - 1; x++) m.set(x, y, caseHorloge(E, x, y) && !obs.has(cle(x, y)) ? T.FLOOR : T.BLOCK);
}
/** l'état après un coup de levier (quoi : l'aiguille, s : +1 dans le sens des aiguilles, -1 à l'envers) */
export const tourner = (E, quoi, s) => ({ ...E, [quoi]: heure(E[quoi] + s) });
/** où se retrouve, après le passage de E à E2, celui qui était sur la case (x, y) : emporté par l'aiguille qui tourne
 *  sous ses pieds (même distance au centre, même côté), sinon il ne bouge pas */
export function emporter(E, E2, x, y) {
  const c = caseHorloge(E, x, y);
  const a = c?.quoi === 'aiguille' && c.sur.find((q) => heure(E2[q]) !== heure(E[q])); if (!a) return [x, y];
  const [cx, cy] = centre(), [dx, dy] = sens(E[a]), vx = x + 0.5 - cx, vy = y + 0.5 - cy;
  const r = vx * dx + vy * dy, t = -vx * dy + vy * dx, [ex, ey] = sens(E2[a]);
  const vise = [cx + ex * r - ey * t, cy + ey * r + ex * t];
  const cases = [...casesAiguille(a, E2[a])].map((k) => k.split(',').map(Number));
  return cases.sort((p, q) => Math.hypot(p[0] + 0.5 - vise[0], p[1] + 0.5 - vise[1]) - Math.hypot(q[0] + 0.5 - vise[0], q[1] + 0.5 - vise[1]))[0];
}

/* ---------------- les salles du mur : des labyrinthes à rambardes, comme la Tour Carillon ---------------- */
// Un labyrinthe de passerelles de bois ; certaines rambardes ne se franchissent que dans un sens (on saute par-dessus,
// vers le bas, la gauche ou la droite, jamais vers le haut). Un mauvais saut ramène en arrière ; l'objet est au fond.
// Plan : '#' mur ou vide, '.' plancher, 'v' '>' '<' rambardes, 'O' l'objet, 'S' l'escalier de service.
export const SALLE_W = 19, SALLE_H = 18, SALLE_ENTREE = [10, 16];
const MI = 8, MJ = 7;   // cases du labyrinthe : (2 + 2i, 3 + 2j)
function alea(g) { let a = g >>> 0 || 1; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const DIR4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
/** les pas possibles depuis (x, y) dans un plan : on marche sur '.', 'O' n'est pas franchissable, une rambarde se saute dans son sens */
export function pasPlan(P, x, y) {
  const out = [];
  for (const [dx, dy] of DIR4) {
    const c = P[y + dy]?.[x + dx];
    if (c === '.' || c === 'S') out.push([x + dx, y + dy]);
    else if ((c === 'v' && dy === 1) || (c === '>' && dx === 1) || (c === '<' && dx === -1)) { const d = P[y + 2 * dy]?.[x + 2 * dx]; if (d === '.' || d === 'S') out.push([x + 2 * dx, y + 2 * dy]); }
  }
  return out;
}
/** distances (en pas) depuis une case, ou vers elle (inverse) */
export function distancesPlan(P, x0, y0, inverse = false) {
  const cases = []; P.forEach((l, y) => [...l].forEach((c, x) => { if (c === '.' || c === 'S') cases.push([x, y]); }));
  const succ = new Map(cases.map(([x, y]) => [x + ',' + y, pasPlan(P, x, y)]));
  const pred = new Map(cases.map(([x, y]) => [x + ',' + y, []]));
  for (const [k, l] of succ) for (const [a, b] of l) pred.get(a + ',' + b)?.push(k.split(',').map(Number));
  const vois = inverse ? pred : succ, D = new Map([[x0 + ',' + y0, 0]]), f = [[x0, y0]];
  for (let i = 0; i < f.length; i++) { const [x, y] = f[i], d = D.get(x + ',' + y); for (const [a, b] of vois.get(x + ',' + y) || []) if (!D.has(a + ',' + b)) { D.set(a + ',' + b, d + 1); f.push([a, b]); } }
  return D;
}
/** le labyrinthe d'une graine (tableau de lignes) et la case de l'objet */
export function labyrinthe(graine) {
  const r = alea(graine), G = Array.from({ length: SALLE_H }, (_, y) => Array.from({ length: SALLE_W }, () => '#'));
  const X = (i) => 2 + 2 * i, Y = (j) => 3 + 2 * j;
  for (let j = 0; j < MJ; j++) for (let i = 0; i < MI; i++) G[Y(j)][X(i)] = '.';
  // un labyrinthe parfait (en profondeur), depuis l'entrée, puis quelques murs ouverts en plus (des boucles)
  const vu = new Set(), pile = [[4, MJ - 1]]; vu.add('4,' + (MJ - 1));
  while (pile.length) {
    const [i, j] = pile[pile.length - 1], v = DIR4.map(([a, b]) => [i + a, j + b]).filter(([a, b]) => a >= 0 && b >= 0 && a < MI && b < MJ && !vu.has(a + ',' + b));
    if (!v.length) { pile.pop(); continue; }
    const [a, b] = v[Math.floor(r() * v.length)]; G[(Y(j) + Y(b)) / 2][(X(i) + X(a)) / 2] = '.'; vu.add(a + ',' + b); pile.push([a, b]);
  }
  for (let j = 0; j < MJ; j++) for (let i = 0; i < MI; i++) for (const [a, b] of [[1, 0], [0, 1]]) if (i + a < MI && j + b < MJ && r() < 0.22) G[Y(j) + b][X(i) + a] = '.';
  // des passages deviennent des rambardes à sens unique
  for (let j = 0; j < MJ; j++) for (let i = 0; i < MI; i++) for (const [a, b] of [[1, 0], [0, 1]]) {
    if (i + a >= MI || j + b >= MJ) continue;
    const y = Y(j) + b, x = X(i) + a; if (G[y][x] !== '.' || r() > 0.38) continue;
    G[y][x] = b ? 'v' : r() < 0.5 ? '>' : '<';
  }
  // l'entrée, l'escalier de service
  G[SALLE_ENTREE[1]][SALLE_ENTREE[0]] = '.'; G[16][2] = 'S';
  const P = G.map((l) => l.join(''));
  // l'objet : sur la rangée du haut, la case la plus loin de l'entrée
  const D = distancesPlan(P, ...SALLE_ENTREE);
  let obj = null; for (let i = 0; i < MI; i++) { const k = X(i) + ',' + Y(0); if (D.has(k) && (!obj || D.get(k) > D.get(obj))) obj = k; }
  return { plan: P, objet: obj?.split(',').map(Number) || null };
}
/** un labyrinthe convient : objet et escalier atteints, jamais coincé (on revient toujours à l'entrée), assez de faux pas */
export function labyrintheValide(L) {
  if (!L.objet) return false;
  const P = L.plan, D = distancesPlan(P, ...SALLE_ENTREE), R = distancesPlan(P, ...SALLE_ENTREE, true);
  const [ox, oy] = L.objet, V = distancesPlan(P, ox, oy, true);
  if (!D.has('2,16') || [...D.keys()].some((k) => !R.has(k))) return false;
  // les rambardes qui éloignent de l'objet : des pièges
  let pieges = 0, ramb = 0;
  P.forEach((l, y) => [...l].forEach((c, x) => {
    if (!'v<>'.includes(c)) return;
    const [dx, dy] = c === 'v' ? [0, 1] : c === '>' ? [1, 0] : [-1, 0], a = (x - dx) + ',' + (y - dy), b = (x + dx) + ',' + (y + dy);
    if (!D.has(a)) return; ramb++;
    if ((V.get(b) ?? 99) - (V.get(a) ?? 99) >= 8) pieges++;
  }));
  return V.get(SALLE_ENTREE.join(',')) >= 34 && pieges >= 4 && ramb >= 10;
}
/** les graines retenues (cherchées par tools/test-testodyssee.mjs, qui vérifie qu'elles conviennent toujours) */
export const GRAINES_SALLES = { dix: 390, deux: 1087, midi: 1192 };
export const OBJETS_SALLES = { dix: 'pp-up', deux: 'max-elixir', midi: 'rare-candy' };
/** pose un labyrinthe dans la carte d'une salle */
function poserLabyrinthe(r, L, id) {
  const tuile = { '.': T.FLOOR, v: T.LEDGE, '>': T.LEDGE_E, '<': T.LEDGE_W, '#': T.BLOCK, S: T.STAIRS };
  L.plan.forEach((l, y) => { if (y < 2 || y >= SALLE_H - 1) return; [...l].forEach((c, x) => { if (x > 0 && x < SALLE_W - 1) r.set(x, y, tuile[c] ?? T.BLOCK); }); });
  for (let x = 1; x < SALLE_W - 1; x++) if (x !== SALLE_ENTREE[0]) r.set(x, SALLE_H - 1, T.BLOCK);   // le bas de la salle, sauf la porte
  r.item(L.objet[0], L.objet[1], OBJETS_SALLES[id], 1, `${HORLOGE}:${id}:objet`);
  // les passerelles en planches ; entre elles, le plancher du dessous (posé de biais), où l'on ne descend pas
  const sol = new Map();
  L.plan.forEach((l, y) => [...l].forEach((c, x) => { if (c === '#' && y >= 2 && !(y === SALLE_H - 1 && x === SALLE_ENTREE[0]) && x > 0 && x < SALLE_W - 1) sol.set(x + ',' + y, 'sol_carillon_bas'); }));
  r.solArene = sol; r.style = 'carillon';
}

export function construireHorloge(world) {
  const m = room(HORLOGE, W, H, { floor: 'cave', music: 'dmhh', wall: 'wall_cendre', name: 'Tour de l\'Horloge' });
  m.zone(0, 0, W - 1, H - 1, { name: 'Tour de l\'Horloge', music: 'dmhh' });
  m.horloge = depart();
  appliquer(m, m.horloge);
  // leviers, clé et mécanisme : on s'en sert de face (horloge-jeu.js)
  for (const [x, y] of [...LEVIERS.map(placeLevier), placeCle(), placeMecanisme()]) m.object(x, y, { use: (api) => api.game.horloge?.utiliser(x, y) });
  world.maps[HORLOGE] = m;
  // les trois salles du mur, vides pour l'instant ; un escalier de service y redescend vers le quai
  const [ax, ay] = placeArrivee();
  for (const s of SALLES) {
    const r = room(salleId(s), SALLE_W, SALLE_H, { floor: 'wood', music: 'dmhh', wall: 'wall_cendre', name: s.nom, exitX: SALLE_ENTREE[0] });
    r.zone(0, 0, SALLE_W - 1, SALLE_H - 1, { name: s.nom, music: 'dmhh' });
    poserLabyrinthe(r, labyrinthe(GRAINES_SALLES[s.id]), s.id);
    const p = PLATEFORMES.find((q) => q.id === s.pf), [px, py] = caseSur(p.id, exterieur(p), 0);
    r.warp(r.exitX, r.exitY, { map: HORLOGE, x: px, y: py, dir: 'down' });
    r.warp(2, 16, { map: HORLOGE, x: ax, y: ay, dir: 'up' });
    world.maps[salleId(s)] = r;
    const [dx, dy] = placePorte(s);
    m.object(dx, dy, { use: async (api) => { await api.game.warp({ map: salleId(s), x: r.exitX, y: r.exitY - 1, dir: 'up' }); } });
  }
  // dehors : la Tour de l'Horloge (la tour qui se défait, labo3d.js) ; on entre sur le quai
  const d = new GameMap(DEHORS, 41, 34, { outdoor: true, fill: T.TREE, name: 'Tour de l\'Horloge', music: 'route' });
  d.blob(20, 17, 18, 15, T.GRASS, rng(777));
  d.rect(4, 2, 36, 31, T.GRASS, [T.TREE]);
  const b = d.building('gym', 10, 3, { modele: 'tourDefaite', w: 21, d: 17, door: 10, name: 'Tour de l\'Horloge' });
  for (let y = b.doorY + 1; y <= 31; y++) d.set(b.doorX, y, T.PATH);
  d.rect(b.doorX - 1, b.doorY + 1, b.doorX + 1, b.doorY + 2, T.PATH);
  for (const [x, y] of [[b.doorX - 3, b.doorY + 2], [b.doorX + 3, b.doorY + 2]]) d.prop('lanterne', x, y);
  d.sign(b.doorX + 2, b.doorY + 4, 'TOUR DE L\'HORLOGE\nLe temps s\'y est brisé.\nAu moins deux explorateurs.');
  d.warp(b.doorX, b.doorY, { map: HORLOGE, x: ax, y: ay, dir: 'up' });
  d.zone(0, 0, 40, 33, { name: 'Tour de l\'Horloge', music: 'route' });
  world.maps[DEHORS] = d;
  // la sortie : derrière le quai
  const [sx, sy] = placeSortie();
  m.object(sx, sy, { use: async (api) => { if (await api.game.ui.yesNo('Sortir de la tour ?')) await api.game.warp({ map: DEHORS, x: b.doorX, y: b.doorY + 1, dir: 'down' }); } });
  return { nom: 'Tour de l\'Horloge (prototype)', note: 'niveau 0 : les aiguilles, à deux ou plus', map: DEHORS, x: b.doorX, y: b.doorY + 2, dir: 'up', equipe: 'fin100' };
}
