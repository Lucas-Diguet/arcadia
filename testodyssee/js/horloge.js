// testodyssee/js/horloge.js — la Tour de l'Horloge, niveau 0 (futur donjon, au moins deux joueurs). Une horloge
// gigantesque au creux de la tour, tout est à la même hauteur. Au centre, la barre du pivot (on n'y marche pas) et le
// mécanisme central ; autour, trois aiguilles : la grande et large, la grande et fine (la plus longue) et la petite (qui
// servira aux étages -1 et 1). Contre le mur, quatre plateformes : sud (le quai), est, ouest, et la corniche nord, que
// seule l'aiguille fine atteint. Deux blocs de pierre, entre est et nord et entre ouest et nord, arrêtent les aiguilles :
// la corniche nord est isolée tant que le mécanisme central ne les a pas brisés.
// Sur chaque plateforme, deux leviers font tourner une aiguille d'une heure ; celui qui se tient sur l'aiguille est emporté
// avec elle, mais ne peut pas tirer le levier lui-même : seul, on ne quitte pas le quai.
// Les salles sont dans l'épaisseur du mur, en secteurs de couronne, labyrinthes à rambardes (façon Tour Carillon) :
// la salle est fait le tour par le bas jusqu'à l'ouest (la clé de la grille au fond) ; la salle ouest monte jusqu'au nord,
// où une grille fermée mène à la salle nord (la clé du mécanisme au fond). Le mécanisme, sur la barre du pivot, brise
// les deux blocs, puis fait monter ou descendre l'horloge (étages 1 et -1 à venir).
// Logique sans DOM ici ; le dessin est dans horloge-vue.js, les règles du jeu dans horloge-jeu.js.
import { room } from '../../odyssee/js/world/interiors.js';
import { GameMap, rng } from '../../odyssee/js/world/mapgen.js';
import { T } from '../../odyssee/js/world/tiles.js';

export const HORLOGE = 'labo:horloge';
export const DEHORS = 'labo:horloge:dehors';
export const W = 50, H = 48;
/** centre du cadran (le milieu de cette case), rayon de la barre du pivot ; le mur de la tour va de R_MUR à R_MUR2 */
export const C = [25, 24], R_PIVOT = 3, R_MUR = 22, R_MUR2 = 32;
/** les aiguilles : jusqu'où on y marche (en cases), demi-largeur de leurs cases */
export const AIG = { grande: { r: 17.6, l: 0.75 }, fine: { r: 19.6, l: 0.45 }, petite: { r: 11.6, l: 0.75 } };
export const NOMS = { grande: 'la grande aiguille', fine: 'l\'aiguille fine', petite: 'la petite aiguille' };
/** direction d'une heure (0 = midi, dans le sens des aiguilles d'une montre) : [dx, dy] sur la carte */
export const sens = (k) => { const a = (k * Math.PI) / 6; return [Math.sin(a), -Math.cos(a)]; };
const cle = (x, y) => x + ',' + y;
const centre = () => [C[0] + 0.5, C[1] + 0.5];
export const heure = (k) => ((Math.round(k) % 12) + 12) % 12;
/** l'heure (à virgule, de 0 à 12) d'un point vu depuis un centre */
const heureDe = (dx, dy) => ((Math.atan2(dx, -dy) / (Math.PI / 6)) % 12 + 12) % 12;

/** les plateformes : à l'heure k, du rayon r0 au rayon r1, demi-largeur l ; la corniche ne touche que l'aiguille fine */
export const PLATEFORMES = [
  { id: 'sud', k: 6, r0: 18.3, r1: 21.4, l: 5.5, nom: 'Le quai (sud)' },
  { id: 'est', k: 2, r0: 18.3, r1: 21.4, l: 3.5, nom: 'La plateforme est' },
  { id: 'ouest', k: 10, r0: 18.3, r1: 21.4, l: 3.5, nom: 'La plateforme ouest' },
  { id: 'nord', k: 0, r0: 20, r1: 21.6, l: 2.5, nom: 'La corniche nord', corniche: true },
];
const pf = (id) => PLATEFORMES.find((q) => q.id === id);
/** une place sur une plateforme : r (rayon), t (de côté, dans le sens des aiguilles) */
export function caseSur(id, r, t) {
  const p = pf(id), [dx, dy] = sens(p.k), [cx, cy] = centre();
  return [Math.floor(cx + dx * r - dy * t), Math.floor(cy + dy * r + dx * t)];
}
const exterieur = (p) => p.r1 - 0.5;
/** les leviers : deux par plateforme, la grande aiguille à gauche, la fine à droite (vus depuis le centre) */
export const LEVIERS = PLATEFORMES.flatMap((p) => [
  { pf: p.id, quoi: 'grande', t: -(p.l - 0.5), nom: 'Le levier rouge (la grande aiguille)' },
  { pf: p.id, quoi: 'fine', t: p.l - 0.5, nom: 'Le levier bleu (l\'aiguille fine)' },
]);
export const placeLevier = (L) => caseSur(L.pf, exterieur(pf(L.pf)), L.t);
/** les blocs de pierre qui arrêtent les aiguilles (heures interdites tant qu'ils sont là), et leur rayon */
export const BLOCS = [1, 11], R_BLOC = 14;
/** la sortie de la tour, derrière le quai ; l'arrivée, au bord du quai */
export const placeSortie = () => caseSur('sud', pf('sud').r1 + 0.7, 0);
export const placeArrivee = () => caseSur('sud', exterieur(pf('sud')), 0);

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
/** les cases du bord de la barre, d'où l'on se sert du mécanisme central (depuis le bout d'une aiguille) */
export function casesMecanisme() {
  const piv = casesPivot();
  return [...piv].map((k) => k.split(',').map(Number)).filter(([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => !piv.has(cle(x + a, y + b))));
}
const PF_CASES = new Map(PLATEFORMES.map((p) => [p.id, bande(p.k, p.r0, p.r1, p.l)]));
export const casesPlateforme = (id) => PF_CASES.get(id);

/** l'état de départ : les deux grandes aiguilles sur six heures (vers le quai), la petite sur trois heures, les blocs en place */
export const depart = () => ({ grande: 6, fine: 6, petite: 3, niv: 0, cle1: false, cle: false, blocs: true });
export const AIGUILLES = ['grande', 'fine', 'petite'];

/** ce qu'il y a dans une case : { quoi: 'pf', id } ou { quoi: 'aiguille', sur: [aiguilles] } ou null (le vide) */
export function caseHorloge(E, x, y) {
  const k = cle(x, y);
  for (const p of PLATEFORMES) if (PF_CASES.get(p.id).has(k)) return { quoi: 'pf', id: p.id };
  const sur = AIGUILLES.filter((a) => casesAiguille(a, E[a]).has(k));
  return sur.length ? { quoi: 'aiguille', sur } : null;
}
/** les cases qu'on ne traverse pas : les leviers */
export const obstacles = () => new Set(LEVIERS.map((L) => cle(...placeLevier(L))));
/** pose les cases praticables de la carte selon l'état (le vide est infranchissable) */
export function appliquer(m, E) {
  const obs = obstacles(), portes = new Set([...SALLES_PF().map((s) => cle(...placePorte(s))), cle(...placeSortie())]);
  for (let y = 2; y < H; y++) for (let x = 1; x < W - 1; x++) m.set(x, y, portes.has(cle(x, y)) || (caseHorloge(E, x, y) && !obs.has(cle(x, y))) ? T.FLOOR : T.BLOCK);
}
/** l'état après un coup de levier (quoi : l'aiguille, s : +1 dans le sens des aiguilles, -1 à l'envers) ; null si un bloc l'arrête */
export function tourner(E, quoi, s) {
  const h = heure(E[quoi] + s);
  if (E.blocs && quoi !== 'petite' && BLOCS.includes(h)) return null;
  return { ...E, [quoi]: h };
}
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

/* ---------------- les salles du mur : secteurs de couronne, labyrinthes à rambardes (Tour Carillon) ---------------- */
// Chaque salle a sa carte, dessinée dans le même repère que la tour (centre au milieu de la carte), entre R_MUR + 1 et
// R_MUR2 - 1. Plan : '#' mur (plancher du dessous), ' ' hors de la salle, '.' passerelle, 'v' '>' '<' rambardes (on saute
// par-dessus vers le bas, la droite ou la gauche, jamais vers le haut).
export const SALLE_N = 2 * R_MUR2 + 3, SC = R_MUR2 + 1, SR0 = R_MUR + 1, SR1 = R_MUR2 - 1;
/** de : heure où la salle commence, a : où elle finit (dans le sens des aiguilles) ; entree : porte de la plateforme ;
 *  objet : la clé (cle1 : celle de la grille, cle : celle du mécanisme) ; grille : la porte fermée vers une autre salle */
export const SALLES = [
  { id: 'est', nom: 'La salle est', pf: 'est', de: 2, a: 5.5, entree: 2.15, tube: { k: 5.25, vers: 'est2' } },
  { id: 'est2', nom: 'La salle est (de l\'autre côté du tube)', de: 6.5, a: 9.6, entree: 6.75, entreeR: (R_MUR + R_MUR2) / 2, tube: { k: 6.75, vers: 'est' }, objet: { quoi: 'cle1', k: 9.35 } },
  { id: 'ouest', nom: 'La salle ouest', pf: 'ouest', de: 10, a: 11.97, entree: 10.15, grille: { vers: 'nord', k: 11.8 } },
  { id: 'nord', nom: 'La salle nord', pf: 'nord', de: 11.97, a: 1.85, entree: 0, objet: { quoi: 'cle', k: 1.6 }, grille: { vers: 'ouest', k: 12.15 } },
];
/** le vestibule de l'entrée (au sud, dans l'épaisseur du mur) : on le traverse de bas en haut, en passant sous le tube
 *  de cuivre qui le barre de droite à gauche (rangée TUBE_Y) et relie les deux moitiés de la salle est ; au fond, la porte
 *  de la salle des aiguilles (V_PORTE, dans le mur du haut : on y entre en marchant dedans, horloge-jeu.js) */
export const VESTIBULE = 'labo:horloge:entree', VW = 23, VH = 12, TUBE_Y = 5, V_PORTE = [11, 1];
/** une case du tube (on n'y monte que par ses deux bouches, et on n'en descend pas ; on passe dessous partout) */
export const dansLeTube = (x, y) => y === TUBE_Y && x >= 1 && x <= VW - 2;
/** les deux bouches du tube, dans le vestibule : où l'on ressort (horloge-jeu.js) */
export const boutsDuTube = () => { const L = labyrinthes(); return { gauche: { map: salleId({ id: 'est2' }), x: L.est2.tube.noeud[0], y: L.est2.tube.noeud[1], dir: 'left' }, droite: { map: salleId({ id: 'est' }), x: L.est.tube.noeud[0], y: L.est.tube.noeud[1], dir: 'right' } }; };
export const salleId = (s) => `${HORLOGE}:salle:${s.id}`;
export const placePorte = (s) => caseSur(s.pf, pf(s.pf).r1 + 0.7, 0);
export const SALLES_PF = () => SALLES.filter((s) => s.pf);
/** le point (rayon r, heure k) dans une carte de salle */
const pointSalle = (r, k) => { const [dx, dy] = sens(k); return [SC + 0.5 + dx * r, SC + 0.5 + dy * r]; };
/** une case d'une carte de salle est-elle dans la salle s (avec une marge en cases) ? */
function dansSalle(s, x, y, marge = 0) {
  const dx = x + 0.5 - (SC + 0.5), dy = y + 0.5 - (SC + 0.5), r = Math.hypot(dx, dy);
  if (r < SR0 + marge || r > SR1 - marge) return false;
  const long = ((s.a - s.de) % 12 + 12) % 12, h = ((heureDe(dx, dy) - s.de) % 12 + 12) % 12, m = (marge / r) * 6 / Math.PI;
  return h >= m && h <= long - m;
}
function alea(g) { let a = g >>> 0 || 1; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const DIR4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
/** les pas possibles depuis (x, y) dans un plan : on marche sur '.', une rambarde se saute dans son sens */
export function pasPlan(P, x, y) {
  const out = [];
  for (const [dx, dy] of DIR4) {
    const c = P[y + dy]?.[x + dx];
    if (c === '.') out.push([x + dx, y + dy]);
    else if ((c === 'v' && dy === 1) || (c === '>' && dx === 1) || (c === '<' && dx === -1)) { if (P[y + 2 * dy]?.[x + 2 * dx] === '.') out.push([x + 2 * dx, y + 2 * dy]); }
  }
  return out;
}
/** distances (en pas) depuis une case, ou vers elle (inverse) */
export function distancesPlan(P, x0, y0, inverse = false) {
  const cases = []; P.forEach((l, y) => [...l].forEach((c, x) => { if (c === '.') cases.push([x, y]); }));
  const succ = new Map(cases.map(([x, y]) => [x + ',' + y, pasPlan(P, x, y)]));
  const pred = new Map(cases.map(([x, y]) => [x + ',' + y, []]));
  for (const [k, l] of succ) for (const [a, b] of l) pred.get(a + ',' + b)?.push(k.split(',').map(Number));
  const vois = inverse ? pred : succ, D = new Map([[x0 + ',' + y0, 0]]), f = [[x0, y0]];
  for (let i = 0; i < f.length; i++) { const [x, y] = f[i], d = D.get(x + ',' + y); for (const [a, b] of vois.get(x + ',' + y) || []) if (!D.has(a + ',' + b)) { D.set(a + ',' + b, d + 1); f.push([a, b]); } }
  return D;
}
/** le nœud du labyrinthe (coordonnées impaires) le plus proche d'un point */
function noeudPres(P, [px, py]) {
  let best = null, bd = 1e9;
  for (let y = 1; y < SALLE_N; y += 2) for (let x = 1; x < SALLE_N; x += 2) if (P[y]?.[x] === '.') { const d = Math.hypot(x + 0.5 - px, y + 0.5 - py); if (d < bd) { bd = d; best = [x, y]; } }
  return best;
}
/** une case de mur voisine d'un nœud, du côté d'un point (pour y poser un objet sans couper le labyrinthe) */
function murVoisin(P, [x, y], [px, py]) {
  return DIR4.map(([a, b]) => [x + a, y + b]).filter(([a, b]) => P[b]?.[a] === '#' || P[b]?.[a] === ' ')
    .sort((u, v) => Math.hypot(u[0] + 0.5 - px, u[1] + 0.5 - py) - Math.hypot(v[0] + 0.5 - px, v[1] + 0.5 - py))[0];
}
/** la bouche du tube : au bout de la salle, dans un mur au-dessus d'un nœud (comme une porte, dessinée sur sa face) */
const placerTube = (G, k) => {
  const P = G.map((l) => l.join('')), [px, py] = pointSalle((SR0 + SR1) / 2, k), noeuds = [];
  for (let y = 1; y < SALLE_N; y += 2) for (let x = 1; x < SALLE_N; x += 2) if (P[y][x] === '.' && '# '.includes(P[y - 1][x])) noeuds.push([x, y]);
  const n = noeuds.sort((a, b) => Math.hypot(a[0] - px, a[1] - py) - Math.hypot(b[0] - px, b[1] - py))[0];
  return { noeud: n, case: [n[0], n[1] - 1] };
};
const placer = (G, k) => { const P = G.map((l) => l.join('')), n = noeudPres(P, pointSalle((SR0 + SR1) / 2, k)); return { noeud: n, case: murVoisin(P, n, pointSalle(SR1 + 2, k)) }; };
/** on n'y est jamais coincé : de partout où l'on va depuis l'entrée, on revient à l'entrée ou à la grille ; l'objet et la grille sont atteints */
function sur(s, L) {
  const P = L.plan, D = distancesPlan(P, ...L.entree);
  // de partout, on doit pouvoir revenir à l'entrée : la grille de la salle ouest est fermée tant qu'on n'a pas la clé, et
  // le tube ne mène qu'à l'autre moitié de la salle est ; seule la grille de la salle nord ramène d'où l'on vient
  const sorties = [L.entree, ...(s.grille?.vers === 'ouest' ? [L.grille.noeud] : [])].map((n) => distancesPlan(P, n[0], n[1], true));
  if ([...D.keys()].some((k) => !sorties.some((R) => R.has(k)))) return false;
  return [L.objet, L.grille, L.tube].filter(Boolean).every((b) => b.case && D.has(cle(...b.noeud)));
}
/** le labyrinthe d'une salle pour une graine : plan, entrée (nœud et paillasson), objet et grille (nœud devant, case du décor) */
export function labyrinthe(s, graine) {
  const r = alea(graine), N = SALLE_N, G = Array.from({ length: N }, (_, y) => Array.from({ length: N }, (_, x) => (dansSalle(s, x, y) ? '#' : ' ')));
  const noeud = (x, y) => x % 2 === 1 && y % 2 === 1 && dansSalle(s, x, y, 0.6);
  for (let y = 1; y < N; y += 2) for (let x = 1; x < N; x += 2) if (noeud(x, y)) G[y][x] = '.';
  const entree = noeudPres(G.map((l) => l.join('')), pointSalle(s.entreeR ?? SR0 + 0.6, s.entree));
  // un labyrinthe parfait (en profondeur) depuis l'entrée, puis quelques murs ouverts en plus (des boucles)
  const vu = new Set([cle(...entree)]), pile = [entree], voisins = (x, y) => DIR4.map(([a, b]) => [x + 2 * a, y + 2 * b]).filter(([a, b]) => noeud(a, b));
  while (pile.length) {
    const [x, y] = pile[pile.length - 1], v = voisins(x, y).filter(([a, b]) => !vu.has(cle(a, b)));
    if (!v.length) { pile.pop(); continue; }
    const [a, b] = v[Math.floor(r() * v.length)]; G[(y + b) / 2][(x + a) / 2] = '.'; vu.add(cle(a, b)); pile.push([a, b]);
  }
  for (let y = 1; y < N; y += 2) for (let x = 1; x < N; x += 2) if (noeud(x, y)) for (const [a, b] of [[2, 0], [0, 2]]) if (noeud(x + a, y + b) && r() < 0.3) G[y + b / 2][x + a / 2] = '.';
  // des passages deviennent des rambardes à sens unique, un par un et seulement si l'on n'est jamais coincé
  // (de partout, on revient à l'entrée ou à la grille) et si l'objet reste atteignable
  const cand = [];
  for (let y = 1; y < N; y += 2) for (let x = 1; x < N; x += 2) if (noeud(x, y)) for (const [a, b] of [[2, 0], [0, 2]]) if (noeud(x + a, y + b) && G[y + b / 2][x + a / 2] === '.') cand.push([x + a / 2, y + b / 2, b ? 'v' : null]);
  for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [cand[i], cand[j]] = [cand[j], cand[i]]; }
  const base = { entree, objet: s.objet ? placer(G, s.objet.k) : null, grille: s.grille ? placer(G, s.grille.k) : null, tube: s.tube ? placerTube(G, s.tube.k) : null };
  let n = 0;
  for (const [x, y, v] of cand) {
    if (n >= 60) break;
    G[y][x] = v || (r() < 0.5 ? '>' : '<');
    if (sur(s, { ...base, plan: G.map((l) => l.join('')) })) n++; else G[y][x] = '.';
  }
  const P = G.map((l) => l.join(''));
  // le paillasson de l'entrée : la case voisine de l'entrée la plus proche du centre de la tour
  const tapis = DIR4.map(([a, b]) => [entree[0] + a, entree[1] + b]).sort((u, v) => Math.hypot(u[0] - SC, u[1] - SC) - Math.hypot(v[0] - SC, v[1] - SC))[0];
  return { plan: P, entree, tapis: s.pf ? tapis : null, objet: base.objet, grille: base.grille, tube: base.tube };
}
/** un labyrinthe convient : objet et grille atteints depuis l'entrée, jamais coincé (on revient toujours à l'entrée ou à
 *  la grille), assez de faux pas (des rambardes qui éloignent du but) */
export function labyrintheValide(s, L) {
  if (!sur(s, L)) return null;
  const P = L.plan, [ex, ey] = L.entree, D = distancesPlan(P, ex, ey);
  const but = (L.objet || L.grille || L.tube).noeud, V = distancesPlan(P, but[0], but[1], true);
  let pieges = 0;
  P.forEach((l, y) => [...l].forEach((c, x) => {
    if (!'v<>'.includes(c)) return;
    const [dx, dy] = c === 'v' ? [0, 1] : c === '>' ? [1, 0] : [-1, 0], a = cle(x - dx, y - dy), b = cle(x + dx, y + dy);
    if (D.has(a) && (V.get(b) ?? 999) - (V.get(a) ?? 999) >= 8) pieges++;
  }));
  const loin = V.get(cle(ex, ey)) ?? 0, taille = ((s.a - s.de) % 12 + 12) % 12;
  return { pieges, loin, taille, ok: pieges >= Math.round(1 + taille / 2) && loin >= 8 * taille };
}
/** les graines retenues (cherchées hors du jeu ; tools/test-testodyssee.mjs vérifie qu'elles conviennent toujours) */
export const GRAINES_SALLES = { est: 171, est2: 291, ouest: 400, nord: 288 };
/** pose le labyrinthe d'une salle dans sa carte */
function poserLabyrinthe(r, L) {
  const tuile = { '.': T.FLOOR, v: T.LEDGE, '>': T.LEDGE_E, '<': T.LEDGE_W }, sol = new Map();
  L.plan.forEach((l, y) => { if (y < 2 || y >= SALLE_N - 1) return; [...l].forEach((c, x) => {
    if (x < 1 || x >= SALLE_N - 1) return;
    r.set(x, y, tuile[c] ?? T.BLOCK);
    if (c === '#') sol.set(cle(x, y), 'sol_carillon_bas'); else if (c === ' ') sol.set(cle(x, y), 'void');
  }); });
  r.solArene = sol; r.style = 'carillon';
}
/** les labyrinthes des trois salles (une fois) */
let LABS = null;
export const labyrinthes = () => (LABS ||= Object.fromEntries(SALLES.map((s) => [s.id, labyrinthe(s, GRAINES_SALLES[s.id])])));

export function construireHorloge(world) {
  const m = room(HORLOGE, W, H, { floor: 'cave', music: 'dmhh', wall: 'wall_cendre', name: 'Tour de l\'Horloge' });
  m.zone(0, 0, W - 1, H - 1, { name: 'Tour de l\'Horloge', music: 'dmhh' });
  m.horloge = depart();
  appliquer(m, m.horloge);
  // leviers et mécanisme central (sur le bord de la barre) : on s'en sert de face (horloge-jeu.js)
  for (const [x, y] of [...LEVIERS.map(placeLevier), ...casesMecanisme()]) m.object(x, y, { use: (api) => api.game.horloge?.utiliser(x, y) });
  world.maps[HORLOGE] = m;
  const [ax, ay] = placeArrivee(), labs = labyrinthes(), cartes = {};
  // les salles du mur
  for (const s of SALLES) {
    const L = labs[s.id];
    const r = room(salleId(s), SALLE_N, SALLE_N, { floor: 'wood', music: 'dmhh', wall: 'wall_cendre', name: s.nom });
    r.zone(0, 0, SALLE_N - 1, SALLE_N - 1, { name: s.nom, music: 'dmhh' });
    poserLabyrinthe(r, L);
    // l'entrée : un paillasson qui ramène à la plateforme
    if (s.pf) {
      const [px, py] = caseSur(s.pf, exterieur(pf(s.pf)), 0);
      r.set(...L.tapis, T.MAT); r.warp(...L.tapis, { map: HORLOGE, x: px, y: py, dir: 'down', step: true });
      r.exitX = L.tapis[0]; r.exitY = L.tapis[1];
    }
    // la bouche du tube de cuivre (salle est) : il traverse le vestibule et mène à l'autre moitié de la salle
    if (L.tube) {
      const [tx, ty] = L.tube.case, versDroite = s.id === 'est2';
      r.set(tx, ty, T.BLOCK); (r.affiches ||= []).push({ x: tx, y: ty, genre: 'tube' });   // dessinée sur la face du mur (rendu.js)
      r.tube = { x: tx, y: ty, vers: versDroite ? [2, 'right'] : [VW - 3, 'left'] };     // on y entre en marchant dedans (horloge-jeu.js)
      r.object(tx, ty, { use: (api) => api.game.horloge?.entrerTube(...r.tube.vers) });
    }
    if (L.objet) {
      const [ox, oy] = L.objet.case, quoi = s.objet.quoi;
      r.set(ox, oy, T.BLOCK); r.prop('coffre', ox, oy);
      r.object(ox, oy, { use: (api) => api.game.horloge?.prendre(quoi) });
    }
    world.maps[salleId(s)] = cartes[s.id] = r;
    if (s.pf) { const [dx, dy] = placePorte(s); m.warp(dx, dy, { map: salleId(s), x: L.entree[0], y: L.entree[1], dir: 'up', step: true }); }   // on entre en marchant dans la porte
  }
  // la grille entre la salle ouest et la salle nord (la clé trouvée dans la salle est l'ouvre)
  for (const s of SALLES) if (s.grille) {
    const L = labs[s.id], r = cartes[s.id], [gx, gy] = L.grille.case, [bx, by] = labs[s.grille.vers].grille.noeud;
    r.set(gx, gy, T.BLOCK); r.prop('porte_grille', gx, gy);
    r.object(gx, gy, { use: (api) => api.game.horloge?.grille(salleId({ id: s.grille.vers }), bx, by) });
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
  d.warp(b.doorX, b.doorY, { map: VESTIBULE, x: V_PORTE[0], y: VH - 2, dir: 'up' });
  d.zone(0, 0, 40, 33, { name: 'Tour de l\'Horloge', music: 'route' });
  world.maps[DEHORS] = d;
  // le vestibule : dans l'épaisseur du mur, entre la porte de la tour et le quai ; le tube de cuivre le traverse
  const v = room(VESTIBULE, VW, VH, { floor: 'cave', music: 'dmhh', wall: 'wall_cendre', name: 'Le vestibule de la tour', exitX: V_PORTE[0] });
  v.zone(0, 0, VW - 1, VH - 1, { name: 'Le vestibule de la tour', music: 'dmhh' });
  v.style = 'chateau';
  v.warp(v.exitX, v.exitY, { map: DEHORS, x: b.doorX, y: b.doorY + 1, dir: 'down' });
  // la porte de la salle des aiguilles, peinte sur le mur du fond (rendu.js) ; on y entre en marchant dedans
  (v.affiches ||= []).push({ x: V_PORTE[0], y: V_PORTE[1], genre: 'porte' });
  v.warp(...V_PORTE, { map: HORLOGE, x: ax, y: ay, dir: 'up' });
  for (const x of [2, 4, VW - 3, VW - 5]) { v.prop('torchere', x, 2); }
  world.maps[VESTIBULE] = v;
  // la sortie du quai : on retourne au vestibule en marchant dans la porte
  const [sx, sy] = placeSortie();
  m.warp(sx, sy, { map: VESTIBULE, x: V_PORTE[0], y: V_PORTE[1] + 1, dir: 'down', step: true });
  return { nom: 'Tour de l\'Horloge (prototype)', note: 'niveau 0 : les aiguilles, à deux ou plus', map: DEHORS, x: b.doorX, y: b.doorY + 2, dir: 'up', equipe: 'fin100' };
}
