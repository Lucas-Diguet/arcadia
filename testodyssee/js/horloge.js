// testodyssee/js/horloge.js — prototype de la salle de l'Horloge (futur donjon) : une horloge gigantesque, grande comme
// la sépulture du Tombeau, suspendue dans le vide. Ses deux aiguilles sont des passerelles : on marche dessus. Des
// leviers les font tourner d'une heure ; le grand mécanisme du pivot (la « vis ») fait tourner les deux ensemble d'une
// heure et les monte (ou descend) d'un niveau. Autour, des plateformes à différentes hauteurs : on ne passe d'une
// aiguille à une plateforme que s'ils sont à la même hauteur. Logique sans DOM ici (cases, niveaux, cases des
// aiguilles) ; le dessin en 3D est dans horloge-vue.js, les règles du jeu dans horloge-jeu.js.
import { room } from '../../odyssee/js/world/interiors.js';
import { T } from '../../odyssee/js/world/tiles.js';

export const HORLOGE = 'labo:horloge';
export const W = 48, H = 44;
/** centre du cadran (le milieu de cette case), longueur des aiguilles (en cases), rayon du pivot, niveau le plus haut */
export const C = [24, 22], R_GRANDE = 18, R_PETITE = 12, R_PIVOT = 2.6, NIV_MAX = 3;
/** direction d'une heure (0 = midi, dans le sens des aiguilles d'une montre) : [dx, dy] sur la carte */
export const sens = (k) => { const a = (k * Math.PI) / 6; return [Math.sin(a), -Math.cos(a)]; };
const cle = (x, y) => x + ',' + y;
const centre = () => [C[0] + 0.5, C[1] + 0.5];

/** les plateformes : à l'heure k, du rayon r0 au rayon r1, demi-largeur l, au niveau n */
export const PLATEFORMES = [
  { id: 'entree', k: 6, r0: 19, r1: 21.4, l: 5.5, n: 0, nom: 'Le quai' },
  { id: 'midi', k: 0, r0: 19, r1: 21.4, l: 2.5, n: 3, nom: 'Le balcon de midi' },
  { id: 'trois', k: 3, r0: 19, r1: 22, l: 2.5, n: 1, nom: 'Le balcon de trois heures' },
  { id: 'neuf', k: 9, r0: 19, r1: 22, l: 2.5, n: 2, nom: 'Le balcon de neuf heures' },
  { id: 'deux', k: 2, r0: 19, r1: 21, l: 1.5, n: 2, nom: 'Une corniche' },
  { id: 'dix', k: 10, r0: 19, r1: 21, l: 1.5, n: 1, nom: 'Une corniche' },
  // deux îlots à portée de la petite aiguille
  { id: 'ilot4', k: 4, r0: 13, r1: 15.4, l: 1.5, n: 0, nom: 'L\'îlot de quatre heures' },
  { id: 'ilot8', k: 8, r0: 13, r1: 15.4, l: 1.5, n: 1, nom: 'L\'îlot de huit heures' },
];
/** les leviers : sur une plateforme (le pivot pour la vis), ce qu'ils font tourner */
export const LEVIERS = [
  { x: 21, y: 42, quoi: 'petite', nom: 'Le levier de la petite aiguille' },
  { x: 27, y: 42, quoi: 'grande', nom: 'Le levier de la grande aiguille' },
  { pf: 'ilot4', quoi: 'grande', nom: 'Le levier de la grande aiguille' },
  { x: C[0], y: C[1], quoi: 'vis', nom: 'Le grand mécanisme' },
];
export const COFFRE = { pf: 'midi' };

/** les cases d'une bande qui part du centre dans la direction de l'heure k, du rayon r0 au rayon r1, de demi-largeur l */
export function bande(k, r0, r1, l) {
  const [dx, dy] = sens(k), [px, py] = [-dy, dx], [cx, cy] = centre(), out = new Set();
  for (let r = r0; r <= r1 + 1e-6; r += 0.2) for (let t = -l; t <= l + 1e-6; t += 0.2) out.add(cle(Math.floor(cx + dx * r + px * t), Math.floor(cy + dy * r + py * t)));
  return out;
}
/** les cases d'une aiguille (sans le pivot), à l'heure k */
export const casesAiguille = (quoi, k) => bande(k, R_PIVOT, quoi === 'grande' ? R_GRANDE : R_PETITE, 0.75);
/** les cases du pivot (un disque au centre) */
export function casesPivot() {
  const [cx, cy] = centre(), out = new Set();
  for (let y = C[1] - 3; y <= C[1] + 3; y++) for (let x = C[0] - 3; x <= C[0] + 3; x++) if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= R_PIVOT) out.add(cle(x, y));
  return out;
}
const PF_CASES = new Map(PLATEFORMES.map((p) => [p.id, bande(p.k, p.r0, p.r1, p.l)]));
export const casesPlateforme = (id) => PF_CASES.get(id);
/** la case du levier ou du coffre posé sur une plateforme : son milieu */
export function milieu(id) {
  const p = PLATEFORMES.find((q) => q.id === id), [dx, dy] = sens(p.k), [cx, cy] = centre(), r = (p.r0 + p.r1) / 2;
  return [Math.floor(cx + dx * r), Math.floor(cy + dy * r)];
}
export const placeLevier = (L) => (L.pf ? milieu(L.pf) : [L.x, L.y]);

/** l'état de départ : la grande aiguille sur six heures (vers le quai), la petite sur trois heures, tout en bas */
export const depart = () => ({ grande: 6, petite: 3, niv: 0 });

/** ce qu'il y a dans une case : { quoi: 'pf' | 'grande' | 'petite' | 'pivot', niv } ou null (le vide) */
export function caseHorloge(E, x, y) {
  const k = cle(x, y);
  for (const p of PLATEFORMES) if (PF_CASES.get(p.id).has(k)) return { quoi: 'pf', id: p.id, niv: p.n };
  if (casesPivot().has(k)) return { quoi: 'pivot', niv: E.niv };
  for (const a of ['grande', 'petite']) if (casesAiguille(a, E[a]).has(k)) return { quoi: a, niv: E.niv };
  return null;
}
/** les cases qu'on ne traverse pas : les leviers et le coffre */
export function obstacles() {
  const s = new Set(LEVIERS.map((L) => cle(...placeLevier(L))));
  s.add(cle(...milieu(COFFRE.pf)));
  return s;
}
/** pose les cases praticables de la carte selon l'état (le vide est infranchissable) */
export function appliquer(m, E) {
  const obs = obstacles();
  for (let y = 2; y < H; y++) for (let x = 1; x < W - 1; x++) m.set(x, y, caseHorloge(E, x, y) && !obs.has(cle(x, y)) ? T.FLOOR : T.BLOCK);
}
/** peut-on passer de la case a à la case b ? (même hauteur seulement) */
export function passage(E, ax, ay, bx, by) {
  const a = caseHorloge(E, ax, ay), b = caseHorloge(E, bx, by);
  return !!a && !!b && a.niv === b.niv;
}

export function construireHorloge(world) {
  const m = room(HORLOGE, W, H, { floor: 'cave', music: 'cave', wall: 'wall_cendre', name: 'Salle de l\'Horloge' });
  m.zone(0, 0, W - 1, H - 1, { name: 'Salle de l\'Horloge', music: 'cave' });
  m.horloge = depart();
  appliquer(m, m.horloge);
  // les leviers, le grand mécanisme et le coffre : on s'en sert de face (horloge-jeu.js)
  for (const [x, y] of [...LEVIERS.map(placeLevier), milieu(COFFRE.pf)]) m.object(x, y, { use: (api) => api.game.horloge?.utiliser(x, y) });
  world.maps[HORLOGE] = m;
  return { nom: 'Salle de l\'Horloge (prototype)', note: 'les aiguilles géantes et la vis', map: HORLOGE, x: C[0], y: 42, dir: 'up', equipe: 'fin100' };
}
