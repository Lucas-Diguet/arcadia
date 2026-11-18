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

export function construireHorloge(world) {
  const m = room(HORLOGE, W, H, { floor: 'cave', music: 'cave', wall: 'wall_cendre', name: 'Tour de l\'Horloge' });
  m.zone(0, 0, W - 1, H - 1, { name: 'Tour de l\'Horloge', music: 'cave' });
  m.horloge = depart();
  appliquer(m, m.horloge);
  // leviers, clé et mécanisme : on s'en sert de face (horloge-jeu.js)
  for (const [x, y] of [...LEVIERS.map(placeLevier), placeCle(), placeMecanisme()]) m.object(x, y, { use: (api) => api.game.horloge?.utiliser(x, y) });
  world.maps[HORLOGE] = m;
  // les trois salles du mur, vides pour l'instant ; un escalier de service y redescend vers le quai
  const [ax, ay] = placeArrivee();
  for (const s of SALLES) {
    const r = room(salleId(s), 9, 7, { floor: 'cave', music: 'cave', wall: 'wall_cendre', name: s.nom });
    r.zone(0, 0, 8, 6, { name: s.nom, music: 'cave' });
    const p = PLATEFORMES.find((q) => q.id === s.pf), [px, py] = caseSur(p.id, exterieur(p), 0);
    r.warp(r.exitX, r.exitY, { map: HORLOGE, x: px, y: py, dir: 'down' });
    r.set(7, 2, T.STAIRS); r.warp(7, 2, { map: HORLOGE, x: ax, y: ay, dir: 'up' });
    r.sign(1, 2, 'Un escalier de service redescend vers le quai.');
    world.maps[salleId(s)] = r;
    const [dx, dy] = placePorte(s);
    m.object(dx, dy, { use: async (api) => { await api.game.warp({ map: salleId(s), x: r.exitX, y: r.exitY - 1, dir: 'up' }); } });
  }
  // dehors : la Tour de l'Horloge (la tour qui se défait, labo3d.js) ; on entre sur le quai
  const d = new GameMap(DEHORS, 30, 26, { outdoor: true, fill: T.TREE, name: 'Tour de l\'Horloge', music: 'route' });
  d.blob(15, 13, 12, 10, T.GRASS, rng(777));
  d.rect(4, 2, 25, 23, T.GRASS, [T.TREE]);
  const b = d.building('gym', 10, 3, { modele: 'tourDefaite', w: 10, d: 8, door: 4, name: 'Tour de l\'Horloge' });
  for (let y = b.doorY + 1; y <= 23; y++) d.set(b.doorX, y, T.PATH);
  d.rect(b.doorX - 1, b.doorY + 1, b.doorX + 1, b.doorY + 2, T.PATH);
  for (const [x, y] of [[b.doorX - 3, b.doorY + 2], [b.doorX + 3, b.doorY + 2]]) d.prop('lanterne', x, y);
  d.sign(b.doorX + 2, b.doorY + 4, 'TOUR DE L\'HORLOGE\nLe temps s\'y est brisé.\nAu moins deux explorateurs.');
  d.warp(b.doorX, b.doorY, { map: HORLOGE, x: ax, y: ay, dir: 'up' });
  d.zone(0, 0, 29, 25, { name: 'Tour de l\'Horloge', music: 'route' });
  world.maps[DEHORS] = d;
  // la sortie : derrière le quai
  const [sx, sy] = placeSortie();
  m.object(sx, sy, { use: async (api) => { if (await api.game.ui.yesNo('Sortir de la tour ?')) await api.game.warp({ map: DEHORS, x: b.doorX, y: b.doorY + 1, dir: 'down' }); } });
  return { nom: 'Tour de l\'Horloge (prototype)', note: 'niveau 0 : les aiguilles, à deux ou plus', map: DEHORS, x: b.doorX, y: b.doorY + 2, dir: 'up', equipe: 'fin100' };
}
