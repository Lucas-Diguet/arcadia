// testodyssee/js/horloge-m1.js — la Tour de l'Horloge, étage -1 (logique sans DOM). Les aiguilles y sont posées sur un
// sol de pierre : ce sont de longues poutres qu'on ne franchit pas. La grande et la fine vont du pivot jusqu'au pied du
// mur et coupent la salle en deux ; la petite, plus courte, n'est qu'un obstacle. On marche sur leur dessus (on y arrive
// en descendant avec l'horloge, et on n'en remonte qu'en s'y tenant) ; on en descend et l'on y remonte par une échelle,
// accrochée à chaque aiguille du côté où elle tourne (sens des aiguilles d'une montre) : l'échelle de la grande mène
// au secteur qui suit la grande, celle de la fine au secteur qui suit la fine.
// Dans chaque secteur, un levier fait tourner l'aiguille qui borde l'autre secteur : la grande va de 1 h à 5 h, la fine
// de 7 h à 11 h. En arrivant, la grande est sur 3 h et la fine sur 9 h : elles barrent les deux portes des salles du mur,
// et il faut que l'autre joueur tourne l'aiguille pour qu'on y entre. Seul, on n'atteint jamais le levier de l'autre
// secteur.
// Salles du mur : la salle des contrepoids (porte à 3 h ; des fosses en travers, des chaînes qui font descendre un poids
// dans une fosse pendant qu'un autre remonte) mène à la pièce qui manque au mécanisme central (sans elle, l'horloge ne
// monte pas à l'étage 1) ; la salle des balanciers (porte à 9 h ; des murs en travers, percés d'une ouverture que balaie
// un balancier, au même rythme pour tout le monde) mène à la clé de la grande porte, en haut de l'escalier de l'étage 1.
import { room } from '../../odyssee/js/world/interiors.js';
import { T } from '../../odyssee/js/world/tiles.js';
import {
  HORLOGE, W, H, C, R_PIVOT, NIVEAUX, SALLE_N, SC, SR0, SR1, sens, heureDe, pointSalle, dansSalle, alea, heure,
  appliquer, casesAiguille, casesMecanisme, caseSurAiguille, depart,
} from './horloge.js';

const cle = (x, y) => x + ',' + y;
const DIR4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
export const HORLOGE_M1 = HORLOGE + ':-1';
/** rayon du sol (au-delà, le pied du mur, plus épais qu'aux autres étages) ; abaissement de qui marche sur le sol */
export const R_SOL = 17.4, BAS_SOL = 0.45;
const O = [C[0] + 0.5, C[1] + 0.5];
/** la case au rayon r, à l'heure h, dans la salle des aiguilles */
export const caseRH = (r, h) => { const [dx, dy] = sens(h); return [Math.floor(O[0] + dx * r), Math.floor(O[1] + dy * r)]; };
const rayon = (x, y) => Math.hypot(x + 0.5 - O[0], y + 0.5 - O[1]);
/** les leviers du sol : dans le secteur du sud (celui de la grande), celui de la fine ; dans celui du nord, celui de la grande */
export const LEVIERS_M1 = [
  { rh: [15, 6], quoi: 'fine', nom: 'Le levier bleu (l\'aiguille fine)' },
  { rh: [15, 0.5], quoi: 'grande', nom: 'Le levier rouge (la grande aiguille)' },
];
/** les salles du mur : de, a (heures), la porte au bout 'de' ou 'a', le coffre à l'autre bout */
export const SALLES_M1 = [
  { id: 'contrepoids', nom: 'La salle des contrepoids', de: 3, a: 5.7, porteH: 3, porte: 'de', objet: 'piece' },
  { id: 'balanciers', nom: 'La salle des balanciers', de: 6.3, a: 9, porteH: 9, porte: 'a', objet: 'cle2' },
];
export const salleM1Id = (s) => `${HORLOGE_M1}:salle:${s.id}`;
/** la porte d'une salle dans le pied du mur, et la case du sol devant */
export const porteM1 = (s) => caseRH(R_SOL + 0.7, s.porteH);
export const devantPorteM1 = (s) => caseRH(R_SOL - 0.6, s.porteH);

NIVEAUX[-1] = {
  carte: HORLOGE_M1, plateformes: [], leviers: LEVIERS_M1, arrivee: { grande: 3, fine: 9, petite: 0 },
  bornes: { grande: [1, 5], fine: [7, 11], petite: [0, 0] }, butee: 0.35, rSol: R_SOL,
};

/** sur le sol de l'étage -1 : 'aiguille' (le dessus d'une aiguille, sur : lesquelles), 'sol', ou null */
export function caseM1(E, x, y) {
  const r = rayon(x, y);
  if (r > R_SOL || r < R_PIVOT) return null;
  if ((E.niv || 0) === -1) { const sur = ['grande', 'fine', 'petite'].filter((a) => casesAiguille(a, E[a]).has(cle(x, y))); if (sur.length) return { quoi: 'aiguille', sur }; }
  return { quoi: 'sol' };
}
/** l'échelle d'une aiguille à l'heure h : la case de l'aiguille (main) et celle du sol (pied), du côté où elle tourne */
export function echelle(quoi, h, r = 8) {
  const [ex, ey] = sens(h), T = [-ey, ex], A = casesAiguille(quoi, h), d = DIR4.slice().sort((a, b) => (b[0] * T[0] + b[1] * T[1]) - (a[0] * T[0] + a[1] * T[1]))[0];
  // du milieu de l'aiguille, on va de côté (dans le sens où elle tourne) jusqu'à son bord
  let main = caseSurAiguille(quoi, h, r, 0);
  while (A.has(cle(main[0] + d[0], main[1] + d[1]))) main = [main[0] + d[0], main[1] + d[1]];
  return { main, pied: [main[0] + d[0], main[1] + d[1]] };
}
/** un pas de (x, y) à (tx, ty) sur le sol de l'étage -1 est-il permis ? on ne passe du dessus d'une aiguille au sol (ou
 *  l'inverse) que par son échelle */
export function pasM1(E, x, y, tx, ty) {
  const a = caseM1(E, x, y), b = caseM1(E, tx, ty), surA = a?.quoi === 'aiguille', surB = b?.quoi === 'aiguille';
  if (surA === surB) return true;
  const q = (surA ? a : b).sur[0], { main, pied } = echelle(q, E[q]);
  const [m, s] = surA ? [[x, y], [tx, ty]] : [[tx, ty], [x, y]];
  return m[0] === main[0] && m[1] === main[1] && s[0] === pied[0] && s[1] === pied[1];
}
/** l'aiguille peut-elle aller à l'heure h (ses bornes à l'étage -1) ? */
export const dansBornes = (n, quoi, h) => { const B = NIVEAUX[n]?.bornes?.[quoi]; return !B || (h >= B[0] && h <= B[1]); };

/* ---------------- les secteurs (pour les tests et le mode test) ---------------- */
/** les cases du sol qu'on atteint à pied depuis (x, y), sans monter sur une aiguille */
export function secteur(E, x, y) {
  const vu = new Set([cle(x, y)]), f = [[x, y]];
  const libre = (a, b) => caseM1(E, a, b)?.quoi === 'sol' && !LEVIERS_M1.some((L) => { const [lx, ly] = caseRH(...L.rh); return lx === a && ly === b; });
  while (f.length) { const [cx, cy] = f.pop(); for (const [dx, dy] of DIR4) { const a = cx + dx, b = cy + dy; if (!vu.has(cle(a, b)) && libre(a, b)) { vu.add(cle(a, b)); f.push([a, b]); } } }
  return vu;
}
/** depuis le pied d'une échelle, atteint-on (à côté de) la case c ? */
export const atteint = (S, [x, y]) => S.has(cle(x, y)) || DIR4.some(([dx, dy]) => S.has(cle(x + dx, y + dy)));

/* ---------------- les salles du mur ---------------- */
/** l'arc (en cases) d'une case depuis le début de la salle */
const position = (s, x, y) => ((heureDe(x + 0.5 - (SC + 0.5), y + 0.5 - (SC + 0.5)) - s.de) % 12 + 12) % 12;
const arcDe = (s, x, y) => position(s, x, y) * (Math.PI / 6) * Math.hypot(x + 0.5 - (SC + 0.5), y + 0.5 - (SC + 0.5));
const rS = (x, y) => Math.hypot(x + 0.5 - (SC + 0.5), y + 0.5 - (SC + 0.5));
/** la case du plancher au bout q ('de' ou 'a') d'une salle, contre le mur d'extrémité, au rayon r, et la case du mur */
function boutSalle(s, q, P, r = (SR0 + SR1) / 2) {
  const [px, py] = pointSalle(r, q === 'de' ? s.de : s.a), long = ((s.a - s.de) % 12 + 12) % 12;
  let best = null;
  for (let y = 0; y < SALLE_N; y++) for (let x = 0; x < SALLE_N; x++) if (P[y][x] === '.') for (const [dx, dy] of DIR4) {
    const nx = x + dx, ny = y + dy, rr = rS(nx, ny);
    if (dansSalle(s, nx, ny) || rr < SR0 + 0.5 || rr > SR1 - 0.5) continue;
    const pn = position(s, nx, ny);
    if (q === 'de' ? pn < 6 : (pn < long || pn > long + 3)) continue;
    const d = Math.hypot(x + 0.5 - px, y + 0.5 - py);
    if (!best || d < best.d) best = { d, case: [x, y], mur: [nx, ny] };
  }
  return best;
}
/** les cases d'une ligne en travers de la salle, à l'arc a (épaisseur e) */
const ligne = (s, a, e) => { const out = []; for (let y = 0; y < SALLE_N; y++) for (let x = 0; x < SALLE_N; x++) if (dansSalle(s, x, y) && Math.abs(arcDe(s, x, y) - a) < e) out.push([x, y]); return out.sort((p, q) => rS(...p) - rS(...q)); };

/** la salle des balanciers : à travers la salle, des murs percés d'une ouverture de trois cases ; un balancier passe et
 *  repasse sur toute la ligne (deux cases), chacun à son rythme. Celui qu'il touche revient au début de la salle. */
export function planBalanciers(s = SALLES_M1[1], graine = 7) {
  const r = alea(graine), G = Array.from({ length: SALLE_N }, (_, y) => Array.from({ length: SALLE_N }, (_, x) => (dansSalle(s, x, y) ? '.' : ' ')));
  const arcs = []; G.forEach((l, y) => l.forEach((c, x) => { if (c === '.') arcs.push(arcDe(s, x, y)); }));
  const a0 = Math.min(...arcs), a1 = Math.max(...arcs), lignes = [];
  // depuis la porte (au bout 'a') jusqu'au coffre (au bout 'de') : une ligne toutes les cinq cases
  for (let a = a1 - 5; a > a0 + 4; a -= 5) {
    const L = ligne(s, a, 0.75), rs = [...new Set(L.map(([x, y]) => Math.floor(rS(x, y))))].sort((p, q) => p - q);
    const r0 = rs[1 + Math.floor(r() * Math.max(1, rs.length - 4))], ouverture = L.filter(([x, y]) => { const q = Math.floor(rS(x, y)); return q >= r0 && q < r0 + 3; });
    for (const [x, y] of L) G[y][x] = '#';
    for (const [x, y] of ouverture) G[y][x] = '.';
    lignes.push({ cases: L, rMin: rs[0], rMax: rs[rs.length - 1], periode: 1.6 + r() * 1.2, phase: r() });
  }
  const P = G.map((l) => l.join(''));
  const porte = boutSalle(s, 'a', P), coffre = boutSalle(s, 'de', P);
  return { plan: P, lignes, porte, coffre, dresseur: pointSalle((SR0 + SR1) / 2, s.de + (s.a - s.de) * 0.5) };
}
/** où est le balancier d'une ligne au temps t (secondes) : les cases qu'il couvre (deux rangs du rayon, aller-retour) */
export function balancier(L, t) {
  const u = ((t / L.periode + L.phase) % 1 + 1) % 1, tri = u < 0.5 ? u * 2 : 2 - u * 2;
  const rb = L.rMin + Math.round(tri * (L.rMax - L.rMin - 1));
  return L.cases.filter(([x, y]) => { const q = Math.floor(rS(x, y)); return q === rb || q === rb + 1; });
}

/** la salle des contrepoids : trois fosses en travers (deux cases d'épaisseur), quatre paliers entre elles ; dans chaque
 *  palier, une chaîne au mur. Chaque chaîne tient deux poids au-dessus de deux fosses : l'un est en bas (il comble sa
 *  fosse, on passe dessus), l'autre en haut ; la tirer les échange. Une fosse est comblée si un poids y est descendu. */
// (choisies parmi toutes les possibilités : au moins trois chaînes à tirer, et l'on ne s'y coince jamais)
export const CHAINES = [[1, 2], [1, 3], [3, 1], [2, 3]];
export const CHAINES_DEPART = [1, 1, 0, 1];
/** les fosses comblées pour l'état des chaînes (bits : 0 → premier poids en bas, 1 → second) */
export const comblees = (bits) => new Set(CHAINES.map((p, i) => p[bits[i] ? 1 : 0]));
export function planContrepoids(s = SALLES_M1[0]) {
  const G = Array.from({ length: SALLE_N }, (_, y) => Array.from({ length: SALLE_N }, (_, x) => (dansSalle(s, x, y) ? '.' : ' ')));
  const arcs = []; G.forEach((l, y) => l.forEach((c, x) => { if (c === '.') arcs.push(arcDe(s, x, y)); }));
  const a0 = Math.min(...arcs), a1 = Math.max(...arcs), pas = (a1 - a0) / 4;
  const fosses = [1, 2, 3].map((k) => ligne(s, a0 + pas * k, 1.0));
  fosses.forEach((F) => { for (const [x, y] of F) G[y][x] = 'f'; });
  // les chaînes : au mur intérieur, au milieu de chaque palier
  const chaines = [0, 1, 2, 3].map((k) => {
    const a = a0 + pas * (k + 0.5); let best = null;
    G.forEach((l, y) => l.forEach((c, x) => { if (c === '.' && rS(x, y) < SR0 + 1.2) { const d = Math.abs(arcDe(s, x, y) - a); if (!best || d < best.d) best = { d, c: [x, y] }; } }));
    return best.c;
  });
  const P = G.map((l) => l.join(''));
  return { plan: P, fosses, chaines, porte: boutSalle(s, 'de', P), coffre: boutSalle(s, 'a', P) };
}
/** le casse-tête des contrepoids, résolu sans carte : depuis le palier 0 et les chaînes au départ, on atteint le palier 3 ;
 *  de partout, on revient au palier 0 et l'on atteint le palier 3 ; il faut tirer au moins `min` chaînes */
export function resoudreContrepoids() {
  const code = (p, b) => p * 16 + b.reduce((a, v, i) => a + (v << i), 0), bitsDe = (c) => [0, 1, 2, 3].map((i) => (c >> i) & 1);
  const succ = (c) => {
    const p = Math.floor(c / 16), b = bitsDe(c % 16), F = comblees(b), out = [];
    const b2 = b.slice(); b2[p] ^= 1; out.push([code(p, b2), 1]);
    if (p < 3 && F.has(p + 1)) out.push([code(p + 1, b), 0]);
    if (p > 0 && F.has(p)) out.push([code(p - 1, b), 0]);
    return out;
  };
  const dep = code(0, CHAINES_DEPART), D = new Map([[dep, 0]]), f = [dep];
  for (let i = 0; i < f.length; i++) for (const [c, w] of succ(f[i])) if (!D.has(c) || D.get(c) > D.get(f[i]) + w) { D.set(c, D.get(f[i]) + w); f.push(c); }
  const min = Math.min(...[...D].filter(([c]) => Math.floor(c / 16) === 3).map(([, d]) => d));
  const vers = (p) => { const ok = new Set(); let ch = true; for (const c of D.keys()) if (Math.floor(c / 16) === p) ok.add(c); while (ch) { ch = false; for (const c of D.keys()) if (!ok.has(c) && succ(c).some(([d]) => ok.has(d))) { ok.add(c); ch = true; } } return ok; };
  const A = vers(0), B = vers(3);
  return { min, jamaisCoince: [...D.keys()].every((c) => A.has(c) && B.has(c)) };
}

/* ---------------- la construction ---------------- */
export function construireNiveauM1(world) {
  const E = world.maps[HORLOGE]?.horloge || depart();
  const m = room(HORLOGE_M1, W, H, { floor: 'cave', music: 'dmhh', wall: 'wall_cendre', name: 'Tour de l\'Horloge, étage -1' });
  m.zone(0, 0, W - 1, H - 1, { name: 'Tour de l\'Horloge, étage -1', music: 'dmhh' });
  m.horlogeNiv = -1;
  m.portesHorloge = new Set();
  const cartes = {};
  for (const s of SALLES_M1) {
    const L = s.id === 'balanciers' ? planBalanciers(s) : planContrepoids(s), id = salleM1Id(s);
    const [dx, dy] = porteM1(s), [fx, fy] = devantPorteM1(s);
    m.portesHorloge.add(cle(dx, dy));
    m.warp(dx, dy, { map: id, x: L.porte.case[0], y: L.porte.case[1], dir: 'up', step: true });
    const r = room(id, SALLE_N, SALLE_N, { floor: 'wood', music: 'dmhh', wall: 'wall_cendre', name: s.nom });
    r.zone(0, 0, SALLE_N - 1, SALLE_N - 1, { name: s.nom, music: 'dmhh' });
    const sol = new Map(), dedans = (x, y) => L.plan[y]?.[x] !== undefined && L.plan[y][x] !== ' ';
    const muraille = (x, y) => { for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) if (dedans(x + a, y + b)) return true; return false; };
    L.plan.forEach((l, y) => [...l].forEach((c, x) => {
      if (c === ' ') { r.set(x, y, T.BLOCK); sol.set(cle(x, y), muraille(x, y) ? 'muraille_' + ((x * 7 + y * 13) % 3) : 'void'); }
      else if (c === '#') { r.set(x, y, T.BLOCK); sol.set(cle(x, y), 'sol_carillon_bas'); }
      else if (c === 'f') { r.set(x, y, T.BLOCK); sol.set(cle(x, y), 'fosse'); }
      else { r.set(x, y, T.FLOOR); sol.set(cle(x, y), 'sol_sous'); }
    }));
    r.solArene = sol; r.style = 'carillon'; r.horlogeM1 = s.id; r.planM1 = L;
    // la sortie : au bout, vers le sol de l'étage -1
    const [tx, ty] = L.porte.mur;
    r.set(tx, ty, T.MAT); r.warp(tx, ty, { map: HORLOGE_M1, x: fx, y: fy, dir: 'down', step: true });
    r.porte = [tx, ty];
    // le coffre, à l'autre bout
    const [ox, oy] = L.coffre.case;
    r.set(ox, oy, T.BLOCK); r.prop('coffre', ox, oy); sol.set(cle(ox, oy), 'sol_sous');
    r.object(ox, oy, { use: (api) => api.game.horloge?.prendre(s.objet) });
    if (L.chaines) L.chaines.forEach(([x, y], i) => { r.set(x, y, T.BLOCK); r.object(x, y, { use: (api) => api.game.horloge?.chaine(i) }); });
    world.maps[id] = cartes[s.id] = r;
  }
  // des dresseurs : trois sur le sol (entre les heures où passent les aiguilles), un dans chaque salle du mur
  const dresseurs = [
    { rh: [12, 1.5], dir: 'down', cls: 'Mécanicien', nom: 'Gaspard', equipe: [[208, 68], [82, 68], [227, 70]] },
    { rh: [10, 10.5], dir: 'right', cls: 'Horlogère', nom: 'Clémence', equipe: [[437, 68], [375, 69], [462, 70]] },
    { rh: [12, 6.5], dir: 'up', cls: 'Mécanicien', nom: 'Anselme', equipe: [[530, 69], [601, 70]] },
  ];
  for (const d of dresseurs) { const [x, y] = caseRH(...d.rh); m.npc({ id: `${HORLOGE_M1}:${d.nom}`, x, y, dir: d.dir, sprite: d.cls === 'Horlogère' ? 'scientifique' : 'montagnard', move: 'static', trainer: dresseur(d, 3) }); }
  const bal = cartes.balanciers.planM1, [bx, by] = bal.dresseur.map(Math.floor);
  cartes.balanciers.npc({ id: `${salleM1Id(SALLES_M1[1])}:Rouage`, x: bx, y: by, dir: 'down', sprite: 'scientifique', move: 'static', trainer: dresseur({ cls: 'Horlogère', nom: 'Pendule', equipe: [[303, 70], [707, 70], [681, 71]] }, 2) });
  const cp = cartes.contrepoids.planM1, pal = cp.chaines[2];
  cartes.contrepoids.npc({ id: `${salleM1Id(SALLES_M1[0])}:Plomb`, x: pal[0] + 1, y: pal[1] + 1, dir: 'left', sprite: 'montagnard', move: 'static', trainer: dresseur({ cls: 'Mécanicien', nom: 'Plomb', equipe: [[208, 70], [376, 71]] }, 2) });
  // les leviers et le mécanisme central
  for (const [x, y] of [...LEVIERS_M1.map((L) => caseRH(...L.rh)), ...casesMecanisme()]) m.object(x, y, { use: (api) => api.game.horloge?.utiliser(x, y) });
  appliquer(m, E);
  world.maps[HORLOGE_M1] = m;
  appliquerSallesM1(world, E);
}
const dresseur = (d, vue) => ({
  cls: d.cls, name: d.nom, team: d.equipe, prize: 60, sight: vue, bs: 'scientifique', ai: 'smart',
  intro: 'Ici, sous l\'horloge, tout tourne au même rythme. Voyons si tu tiens la cadence !', lose: 'Tu es en avance sur le temps...', after: 'Les aiguilles ne mentent jamais.',
});
/** pose l'état des chaînes (fosses comblées ou non) dans la salle des contrepoids ; renvoie les cases changées par carte */
export function appliquerSallesM1(world, E) {
  const r = world.maps[salleM1Id(SALLES_M1[0])], changees = {};
  if (!r) return changees;
  const bits = E.poids || CHAINES_DEPART, F = comblees(bits), L = r.planM1, ch = [];
  L.fosses.forEach((cases, k) => {
    const plein = F.has(k + 1);
    for (const [x, y] of cases) { const avant = r.get(x, y) === T.FLOOR; if (avant !== plein) { r.set(x, y, plein ? T.FLOOR : T.BLOCK); ch.push([x, y]); } r.solArene.set(cle(x, y), plein ? 'poids' : 'fosse'); }
  });
  L.chaines.forEach(([x, y], i) => { const k = bits[i] ? 'chaine_b' : 'chaine_a'; if (r.solArene.get(cle(x, y)) !== k) { r.solArene.set(cle(x, y), k); ch.push([x, y]); } });
  changees[r.id] = ch;
  return changees;
}
