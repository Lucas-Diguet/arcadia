// testodyssee/js/horloge-n2.js — la Tour de l'Horloge, étage 2 (logique sans DOM), derrière la grande porte en haut de
// l'escalier de l'étage 1. Plus une horloge, mais cinq, plus petites, au-dessus du vide ; chacune n'a qu'une aiguille, sur
// laquelle on marche, et qui tourne d'une heure à chaque coup de levier en emportant ceux qui sont dessus. Quand le bout
// d'une aiguille touche le bout d'une aiguille d'une autre horloge, on passe de l'une à l'autre.
// Trois plateformes : l'entrée (au sud, la grande porte), la plateforme de l'est, et l'arrivée (au nord-ouest). Les leviers
// sont reliés aux horloges par des chaînes : sur l'entrée, ceux des horloges 1, 3 et 5 ; sur la plateforme de l'est, ceux
// des horloges 2 et 4. On va de l'entrée à l'arrivée en passant par les cinq horloges dans l'ordre, et à chaque fois, il
// faut que quelqu'un tire le levier de l'horloge sur laquelle on se tient : un joueur reste à l'entrée, un autre doit
// gagner la plateforme de l'est (par l'horloge 1), et le troisième fait le voyage. À deux, on n'y arrive pas : la
// recherche de `resoudre` le vérifie. À l'arrivée, un levier met en marche les monte-charges de l'entrée et de l'est, qui
// y mènent les autres.
import { room } from '../../odyssee/js/world/interiors.js';
import { T } from '../../odyssee/js/world/tiles.js';
import { HORLOGE, sens } from './horloge.js';
import { ESCALIER, boutsEscalier } from './horloge-n1.js';

const cle = (x, y) => x + ',' + y;
const DIR4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
export const HORLOGE2 = HORLOGE + ':2';
export const W2 = 46, H2 = 47;
/** longueur d'une aiguille (jusqu'à son bout, en cases depuis le centre du pivot) */
export const L_AIG = 5.4;
/** les cinq horloges : pivot (case), heure de départ, heures entre lesquelles l'aiguille va (de, a, dans le sens des aiguilles) */
export const HORLOGES2 = [
  { id: 1, c: [31, 34], h: 6, de: 3, a: 9 },
  { id: 2, c: [20, 34], h: 0, de: 0, a: 3 },
  { id: 3, c: [20, 23], h: 9, de: 6, a: 9 },
  { id: 4, c: [9, 23], h: 0, de: 0, a: 3 },
  { id: 5, c: [9, 12], h: 9, de: 6, a: 12 },
];
/** les plateformes : rectangles [x0, y0, x1, y1] */
export const PLATEFORMES2 = {
  entree: { nom: 'L\'entrée', r: [26, 40, 36, 44] },
  est: { nom: 'La plateforme de l\'est', r: [37, 29, 41, 38] },
  arrivee: { nom: 'L\'arrivée', r: [4, 1, 14, 6] },
};
/** les leviers : sur quelle plateforme, quelle horloge */
export const LEVIERS2 = [
  { pf: 'entree', k: 1, place: [27, 41] }, { pf: 'entree', k: 3, place: [27, 43] }, { pf: 'entree', k: 5, place: [35, 41] },
  { pf: 'est', k: 2, place: [40, 30] }, { pf: 'est', k: 4, place: [40, 37] },
];
/** la porte (retour à l'escalier), le levier des monte-charges, les monte-charges, le coffre */
export const PORTE2 = [31, 45], LEVIER_PONT = [5, 2], MONTE = { entree: [35, 43], est: [39, 38] }, COFFRE2 = [13, 2];
export const depart2 = () => HORLOGES2.map((q) => q.h);

const heureN = (h) => ((h % 12) + 12) % 12;
/** les cases d'une aiguille de l'horloge q à l'heure h (du bord du pivot jusqu'au bout), du centre vers le bout */
const CACHE = new Map();
export function casesAig2(q, h) {
  const id = q.id + ':' + heureN(h); if (CACHE.has(id)) return CACHE.get(id);
  const [dx, dy] = sens(heureN(h)), [px, py] = [-dy, dx], cx = q.c[0] + 0.5, cy = q.c[1] + 0.5, vu = new Set(), out = [];
  for (let r = 1.6; r <= L_AIG + 1e-6; r += 0.1) for (let t = -0.45; t <= 0.45 + 1e-6; t += 0.15) {
    const x = Math.floor(cx + dx * r + px * t), y = Math.floor(cy + dy * r + py * t);
    if (Math.max(Math.abs(x - q.c[0]), Math.abs(y - q.c[1])) <= 1 || vu.has(cle(x, y))) continue;
    vu.add(cle(x, y)); out.push([x, y]);
  }
  CACHE.set(id, out);
  return out;
}
const casesPf = (id) => { const [x0, y0, x1, y1] = PLATEFORMES2[id].r, out = []; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push([x, y]); return out; };
export const surPf = (id, x, y) => { const [x0, y0, x1, y1] = PLATEFORMES2[id].r; return x >= x0 && x <= x1 && y >= y0 && y <= y1; };
/** les heures où peut aller l'aiguille de q (de `de` à `a` dans le sens des aiguilles) */
export const heures2 = (q) => { const out = []; for (let h = q.de; ; h++) { out.push(heureN(h)); if (heureN(h) === heureN(q.a)) break; } return out; };
/** ce qu'il y a en (x, y) pour les heures H : { quoi: 'pf', id } ou { quoi: 'aig', k } (k : numéro de l'horloge) ou null */
export function case2(H, x, y) {
  for (const id in PLATEFORMES2) if (surPf(id, x, y)) return { quoi: 'pf', id };
  for (let i = 0; i < HORLOGES2.length; i++) if (casesAig2(HORLOGES2[i], H[i]).some(([a, b]) => a === x && b === y)) return { quoi: 'aig', k: i };
  return null;
}
/** une aiguille peut-elle tourner (dans ses heures, sans passer sur une plateforme ni sur une autre aiguille) ? */
const TOURNE = new Map();
export function tourner2(H, i, s) {
  const k = H.join('.') + ':' + i + ':' + s; if (TOURNE.has(k)) return TOURNE.get(k);
  const r = tournerCalc(H, i, s); TOURNE.set(k, r); return r;
}
function tournerCalc(H, i, s) {
  const q = HORLOGES2[i], h = heureN(H[i] + s);
  if (!heures2(q).includes(h)) return null;
  const C = new Set(casesAig2(q, h).map((c) => cle(...c)));
  for (const id in PLATEFORMES2) if (casesPf(id).some((c) => C.has(cle(...c)))) return null;
  for (let j = 0; j < HORLOGES2.length; j++) if (j !== i && casesAig2(HORLOGES2[j], H[j]).some((c) => C.has(cle(...c)))) return null;
  const H2 = H.slice(); H2[i] = h; return H2;
}
/** où se retrouve, quand l'aiguille i passe de H à H2, celui qui se tient en (x, y) sur elle : à la même distance du pivot */
export function emporter2(H, H2, i, x, y) {
  const q = HORLOGES2[i], A = casesAig2(q, H[i]); if (!A.some(([a, b]) => a === x && b === y)) return [x, y];
  const r = Math.hypot(x + 0.5 - q.c[0] - 0.5, y + 0.5 - q.c[1] - 0.5), B = casesAig2(q, H2[i]);
  return B.slice().sort((p, s) => Math.abs(Math.hypot(p[0] + 0.5 - q.c[0] - 0.5, p[1] + 0.5 - q.c[1] - 0.5) - r) - Math.abs(Math.hypot(s[0] + 0.5 - q.c[0] - 0.5, s[1] + 0.5 - q.c[1] - 0.5) - r))[0];
}

/* ---------------- la recherche : avec n joueurs, atteint-on l'arrivée ? ---------------- */
// Les lieux : les plateformes et les aiguilles. On passe d'un lieu à un autre quand leurs cases se touchent ; ceux qui
// sont sur une aiguille tournent avec elle ; un levier se tire depuis sa plateforme.
const LIEUX = ['entree', 'est', 'arrivee', 0, 1, 2, 3, 4];
function cases(H, l) { return typeof l === 'number' ? casesAig2(HORLOGES2[l], H[l]) : casesPf(l); }
const TOUCHE = new Map();
function touche(H, a, b) {
  const k = a + ':' + (typeof a === 'number' ? H[a] : '') + '|' + b + ':' + (typeof b === 'number' ? H[b] : '');
  if (!TOUCHE.has(k)) { const B = new Set(cases(H, b).map((c) => cle(...c))); TOUCHE.set(k, cases(H, a).some(([x, y]) => DIR4.some(([dx, dy]) => B.has(cle(x + dx, y + dy))))); }
  return TOUCHE.get(k);
}
export function resoudre(n, limite = 3e6) {
  const code = (H, P) => H.join('.') + '|' + P.slice().sort().join('.');
  const depart = { H: depart2(), P: Array(n).fill(0) };   // tous à l'entrée (indice 0 des lieux)
  const vu = new Set([code(depart.H, depart.P)]), f = [depart];
  for (let k = 0; k < f.length; k++) {
    if (vu.size > limite) return { ok: false, trop: true };
    const { H, P } = f[k];
    if (P.includes(2)) return { ok: true, etats: vu.size, coups: k };
    const suivants = [];
    // marcher d'un lieu à un lieu voisin
    P.forEach((l, j) => { for (let m = 0; m < LIEUX.length; m++) if (m !== l && touche(H, LIEUX[l], LIEUX[m])) { const P2 = P.slice(); P2[j] = m; suivants.push({ H, P: P2 }); } });
    // tirer un levier (depuis sa plateforme)
    for (const L of LEVIERS2) if (P.some((l) => LIEUX[l] === L.pf)) for (const s of [1, -1]) { const H2 = tourner2(H, L.k - 1, s); if (H2) suivants.push({ H: H2, P }); }
    for (const e of suivants) { const c = code(e.H, e.P); if (!vu.has(c)) { vu.add(c); f.push(e); } }
  }
  return { ok: false, etats: vu.size };
}

/* ---------------- la construction ---------------- */
export function construireNiveau2(world, E) {
  const m = room(HORLOGE2, W2, H2, { floor: 'cave', music: 'dmhh', wall: 'wall_cendre', name: 'Tour de l\'Horloge, étage 2' });
  m.zone(0, 0, W2 - 1, H2 - 1, { name: 'Tour de l\'Horloge, étage 2', music: 'dmhh' });
  m.horloge2 = true;
  for (const [x, y] of [...LEVIERS2.map((L) => L.place), LEVIER_PONT, ...Object.values(MONTE)]) m.object(x, y, { use: (api) => api.game.horloge?.utiliser2(x, y) });
  m.prop('coffre', ...COFFRE2);
  m.object(...COFFRE2, { use: (api) => api.game.horloge?.coffre2() });
  const B = boutsEscalier();
  m.warp(...PORTE2, { map: ESCALIER, x: B.haut[0], y: B.haut[1], dir: 'down', step: true });
  m.sign(33, 40, 'ÉTAGE DES CINQ HORLOGES\nUne aiguille ne tourne que si l\'on tire son levier.\nIl faudra être trois.');
  world.maps[HORLOGE2] = m;
  appliquer2(m, E);
}
/** les cases praticables selon l'heure des cinq aiguilles (le vide ailleurs) */
export function appliquer2(m, E) {
  const H = E.h2 || depart2(), ch = [], obs = new Set([...LEVIERS2.map((L) => cle(...L.place)), cle(...LEVIER_PONT), ...Object.values(MONTE).map((c) => cle(...c)), cle(...COFFRE2), cle(33, 40)]);
  for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
    const porte = x === PORTE2[0] && y === PORTE2[1], c = !porte && case2(H, x, y);
    const t = porte ? T.MAT : c && !obs.has(cle(x, y)) ? T.FLOOR : T.BLOCK;
    if (m.get(x, y) !== t) { m.set(x, y, t); ch.push([x, y]); }
  }
  return ch;
}
