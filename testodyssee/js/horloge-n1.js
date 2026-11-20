// testodyssee/js/horloge-n1.js — la Tour de l'Horloge, étage 1 (logique sans DOM). La salle des aiguilles a deux îlots
// de la petite aiguille (3 h et 9 h) qui arrêtent les grandes, et quatre plateformes contre le mur (horloge.js). Dans
// l'épaisseur du mur, les salles relient deux plateformes : salle sud (5 h - 7 h), salle est (1 h - 5 h), salle ouest
// (7 h - 11 h), coupées de murs percés, avec des tourniquets façon Cimetronelle ; une grille au milieu des salles est et
// ouest s'ouvre depuis l'îlot qui est devant. Au nord (11 h - 1 h), l'escalier : un palier, puis un escalier de pierre
// qui fait tout le tour de la tour au-dessus des autres salles, jusqu'à la grande porte de l'étage 2.
//
// Tourniquets : un pivot et un à quatre bras de une ou deux cases. Marcher dans un bras par le côté fait tourner tout le
// tourniquet d'un quart de tour dans le sens de la poussée, et l'on avance ; jamais par le bout d'un bras. Il ne tourne
// que si chaque bras a la place de balayer son quart de cercle et d'arriver sur des cases libres (pas un mur, pas un
// autre tourniquet, pas celui qui pousse). Ils restent comme on les laisse ; on les remet en les poussant dans l'autre sens.
import { room } from '../../odyssee/js/world/interiors.js';
import { T } from '../../odyssee/js/world/tiles.js';
import {
  HORLOGE, HORLOGE1, W, H, SALLE_N, SC, SR0, SR1, PLATEFORMES1, LEVIERS1, sens, heureDe, dansSalle, pointSalle, alea,
  caseSur, placeLevier, casesMecanisme, casesPlateforme, appliquer, depart,
} from './horloge.js';

const cle = (x, y) => x + ',' + y;
const DIR4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/* ---------------- les tourniquets ---------------- */
/** un quart de tour d'une direction : s = 1 dans le sens des aiguilles d'une montre (sur la carte, y vers le bas) */
export const quart = ([dx, dy], s) => (s > 0 ? [-dy, dx] : [dy, -dx]);
const quarts = (d, n) => { let v = d; for (let i = 0; i < ((n % 4) + 4) % 4; i++) v = quart(v, 1); return v; };
/** les cases d'un tourniquet { x, y, bras: [[dx, dy, longueur]] } tourné de rot quarts de tour : [x, y, 'p' | 'h' | 'v'] */
export function casesTourniquet(Q, rot) {
  const out = [[Q.x, Q.y, 'p']];
  for (const [dx, dy, L] of Q.bras) { const [a, b] = quarts([dx, dy], rot); for (let k = 1; k <= L; k++) out.push([Q.x + a * k, Q.y + b * k, a ? 'h' : 'v', k === L]); }
  return out;
}
/** les pièces à dessiner d'un tourniquet (tools/pixelforge/tourniquets.py) : clé « x,y » → tq_pivot_<NESO> (avec l'amorce
 *  des bras présents), tq_h / tq_v (bras du milieu), tq_h_e / tq_h_o / tq_v_n / tq_v_s (bout arrondi du côté indiqué) */
export function piecesTourniquet(Q, rot) {
  const M = new Map(), dirs = new Set();
  for (const [dx, dy, L] of Q.bras) {
    const [a, b] = quarts([dx, dy], rot);
    dirs.add(b < 0 ? 'N' : a > 0 ? 'E' : b > 0 ? 'S' : 'O');
    for (let k = 1; k <= L; k++) M.set(cle(Q.x + a * k, Q.y + b * k), k < L ? (a ? 'tq_h' : 'tq_v') : a ? (a > 0 ? 'tq_h_e' : 'tq_h_o') : b > 0 ? 'tq_v_s' : 'tq_v_n');
  }
  M.set(cle(Q.x, Q.y), 'tq_pivot_' + [...'NESO'].map((c) => (dirs.has(c) ? c : '-')).join(''));
  return M;
}
/** case → numéro du tourniquet qui l'occupe */
export function occupation(TS, rots) {
  const M = new Map();
  TS.forEach((Q, i) => { for (const [x, y] of casesTourniquet(Q, rots[i] || 0)) M.set(cle(x, y), i); });
  return M;
}
/** dans un plan : on marche sur '.', ':' et 'G' (grille ouverte) ; un tourniquet ne balaie que '.' */
export const balayable = (P, x, y) => P[y]?.[x] === '.';
export const marchable = (P, x, y, ouverte = true) => { const c = P[y]?.[x]; return c === '.' || c === ':' || (c === 'G' && ouverte); };
/** celui qui est en (px, py) fait un pas d (direction) dans le bras d'un tourniquet : les nouvelles rotations (copie), ou
 *  null si rien ne tourne (pas un bras, poussé par le bout, ou un bras qui heurte quelque chose) ; autres : cases occupées
 *  par d'autres joueurs (clés « x,y ») */
export function pousser(P, TS, rots, px, py, [dx, dy], autres = null) {
  const occ = occupation(TS, rots), qx = px + dx, qy = py + dy, i = occ.get(cle(qx, qy));
  if (i === undefined) return null;
  const Q = TS[i];
  if (qx === Q.x && qy === Q.y) return null;
  const bx = Math.sign(qx - Q.x), by = Math.sign(qy - Q.y);
  if (bx * dx + by * dy !== 0) return null;   // par le bout du bras
  const cw = quart([bx, by], 1), s = cw[0] === dx && cw[1] === dy ? 1 : -1;
  const bloque = (x, y) => (x === px && y === py) || !balayable(P, x, y) || (occ.has(cle(x, y)) && occ.get(cle(x, y)) !== i) || autres?.has(cle(x, y));
  for (const [ax, ay, L] of Q.bras) {
    const b = quarts([ax, ay], rots[i] || 0), b2 = quart(b, s);
    for (let k = 1; k <= L; k++) if (bloque(Q.x + b2[0] * k, Q.y + b2[1] * k)) return null;
    for (let u = 1; u <= L; u++) for (let v = 1; v <= L; v++) if (u + v < 4 && bloque(Q.x + b[0] * u + b2[0] * v, Q.y + b[1] * u + b2[1] * v)) return null;
  }
  const r2 = rots.slice(); r2[i] = (((rots[i] || 0) + s) % 4 + 4) % 4;
  if (casesTourniquet(Q, r2[i]).some(([x, y]) => x === qx && y === qy)) return null;
  return r2;
}
/** un tourniquet ou une rangée de tourniquets est-il « jouable » entre deux cases (entrée, sortie) d'un plan ? On part de
 *  l'entrée et de la sortie, tourniquets dans leur position de départ, puis de toutes les positions qu'on leur donne
 *  (un autre joueur peut les avoir laissés ainsi) : de partout, on doit pouvoir rejoindre l'entrée et la sortie. Renvoie
 *  { ok, poussees (au moins, pour traverser), etats, figes (on traverse sans rien pousser) } */
export function analyser(P, TS, entree, sortie, limite = 400000, mode = 2) {
  const cells = [], idx = new Map();
  P.forEach((l, y) => [...l].forEach((c, x) => { if (marchable(P, x, y)) { idx.set(cle(x, y), cells.length); cells.push([x, y]); } }));
  const NC = cells.length, n = TS.length, rotsDe = (c) => Array.from({ length: n }, (_, i) => Math.floor(c / 4 ** i) % 4);
  const codeDe = (r) => r.reduce((a, v, i) => a + v * 4 ** i, 0), occs = new Map();
  const occDe = (c) => { if (!occs.has(c)) occs.set(c, occupation(TS, rotsDe(c))); return occs.get(c); };
  const ie = idx.get(cle(...entree)), is = idx.get(cle(...sortie));
  // en marchant, sans rien pousser : la sortie ne doit pas être atteinte
  const figes = (() => { const o = occDe(0), vu = new Set([ie]), f = [ie]; for (let k = 0; k < f.length; k++) { const [x, y] = cells[f[k]]; for (const [a, b] of DIR4) { const j = idx.get(cle(x + a, y + b)); if (j !== undefined && !vu.has(j) && !o.has(cle(x + a, y + b))) { vu.add(j); f.push(j); } } } return vu.has(is); })();
  const vus = new Map(), succ = [], liste = [], configs = new Set();
  const ajouter = (c, p) => { const k = c * NC + p; if (vus.has(k)) return vus.get(k); if (occDe(c).has(cle(...cells[p]))) return -1; const id = liste.length; vus.set(k, id); liste.push(k); succ.push(null); return id; };
  const file = [];
  // mode 0 : on part de l'entrée seulement ; 1 : de l'entrée, quelle que soit la position laissée aux tourniquets ;
  // 2 : de l'entrée et de la sortie, quelle que soit cette position
  const graine = (c) => { if (configs.has(c)) return; configs.add(c); if (mode === 0 && c) return; for (const p of mode === 2 ? [ie, is] : [ie]) { const id = ajouter(c, p); if (id >= 0) file.push(id); } };
  graine(0);
  for (let k = 0; k < file.length; k++) {
    if (liste.length > limite) return { ok: false, trop: true };
    const id = file[k], key = liste[id], c = Math.floor(key / NC), p = key % NC, [x, y] = cells[p], o = occDe(c), out = [];
    for (const d of DIR4) {
      const tx = x + d[0], ty = y + d[1], j = idx.get(cle(tx, ty));
      if (j === undefined) continue;
      let c2 = c;
      if (o.has(cle(tx, ty))) { const r2 = pousser(P, TS, rotsDe(c), x, y, d); if (!r2) continue; c2 = codeDe(r2); }
      const n0 = liste.length, id2 = ajouter(c2, j); if (id2 < 0) continue;
      out.push([id2, c2 !== c ? 1 : 0]);
      if (liste.length > n0) file.push(id2);
      if (c2 !== c) graine(c2);
    }
    succ[id] = out;
  }
  // on remonte : de chaque état, rejoint-on l'entrée et la sortie ?
  const pred = liste.map(() => []);
  succ.forEach((l, i) => { for (const [j] of l || []) pred[j].push(i); });
  const atteint = (p) => { const vu = new Uint8Array(liste.length), f = []; liste.forEach((k, i) => { if (k % NC === p) { vu[i] = 1; f.push(i); } }); for (let k = 0; k < f.length; k++) for (const i of pred[f[k]]) if (!vu[i]) { vu[i] = 1; f.push(i); } return vu; };
  const A = atteint(ie), B = atteint(is);
  let ok = true; for (let i = 0; i < liste.length; i++) if (!A[i] || !B[i]) { ok = false; break; }
  // le moins de poussées pour traverser (depuis l'entrée, tourniquets au départ)
  const D = new Map(), dq = [vus.get(ie)];
  D.set(dq[0], 0);
  let poussees = Infinity;
  for (let k = 0; k < dq.length; k++) {
    const i = dq[k], d = D.get(i); if (liste[i] % NC === is) { poussees = Math.min(poussees, d); continue; }
    for (const [j, w] of succ[i] || []) if (!D.has(j) || D.get(j) > d + w) { D.set(j, d + w); w ? dq.push(j) : dq.splice(k + 1, 0, j); }
  }
  return { ok: ok && !figes && poussees < Infinity, poussees, etats: liste.length, configs: configs.size, figes };
}

/* ---------------- les salles du mur de l'étage 1 ---------------- */
/** de, a : heures de début et de fin (sens des aiguilles) ; pfDe, pfA : les plateformes aux deux bouts ; coupes : les murs
 *  percés qui la découpent (grille : celle qui ne s'ouvre que par le levier de l'îlot) ; rBout : rayon des sorties ;
 *  depuis : le bout par lequel on y entre en venant du bas (« a » pour la salle est : on y arrive par la plateforme de
 *  5 h), c'est dans ce sens que les tourniquets sont pensés */
export const SALLES1 = [
  { id: 'sud', nom: 'La salle sud (étage 1)', de: 5.14, a: 6.86, pfDe: 'p5', pfA: 'p7', coupes: [{ h: 6 }], rBout: 25 },
  { id: 'est', nom: 'La salle est (étage 1)', de: 1.14, a: 4.86, pfDe: 'p1', pfA: 'p5', coupes: [{ h: 2.05 }, { h: 3, grille: 'grilleE' }, { h: 3.95 }], rBout: 27, depuis: 'a' },
  { id: 'ouest', nom: 'La salle ouest (étage 1)', de: 7.14, a: 10.86, pfDe: 'p7', pfA: 'p11', coupes: [{ h: 8.05 }, { h: 9, grille: 'grilleO' }, { h: 9.95 }], rBout: 27 },
];
export const salle1Id = (s) => `${HORLOGE1}:salle:${s.id}`;
/** la porte d'une plateforme vers la salle qui part d'elle (sens des aiguilles, côté +) ou qui y finit (côté -) : une case
 *  du mur, juste à côté d'une case de la plateforme */
export function portePf(id, cote) {
  const pf = casesPlateforme(id);
  for (const r of [22.1, 21.8, 22.5]) { const c = caseSur(id, r, cote * 1.5); if (!pf.has(cle(...c)) && DIR4.some(([dx, dy]) => pf.has(cle(c[0] + dx, c[1] + dy)))) return c; }
  return caseSur(id, 22.1, cote * 1.5);
}
/** la case d'où l'on entre dans la porte (sur la plateforme, à côté d'elle) */
export function devantPortePf(id, cote) {
  const [x, y] = portePf(id, cote), pf = casesPlateforme(id), [cx, cy] = caseSur(id, 20.9, cote * 1.5);
  return DIR4.map(([dx, dy]) => [x + dx, y + dy]).filter((c) => pf.has(cle(...c))).sort((a, b) => Math.hypot(a[0] - cx, a[1] - cy) - Math.hypot(b[0] - cx, b[1] - cy))[0];
}
/** l'heure d'une case, comptée depuis le début de la salle */
const position = (s, x, y) => ((heureDe(x + 0.5 - (SC + 0.5), y + 0.5 - (SC + 0.5)) - s.de) % 12 + 12) % 12;
/** l'arc (en cases, au rayon de la case) d'une case depuis le début de la salle */
const arcDe = (s, x, y) => (position(s, x, y) * Math.PI / 6) * Math.hypot(x + 0.5 - (SC + 0.5), y + 0.5 - (SC + 0.5));
/** le plan d'une salle, sans ses barrières : tout le plancher de l'anneau, coupé en tronçons par des murs (les coupes),
 *  chacun percé d'un seul passage (une grille pour celle de l'îlot), et une case à chaque bout, contre le mur d'extrémité.
 *  Dans le plan : '.' plancher, ':' plancher où rien ne tourne (passages, bouts), '#' pierre, 'G' grille, ' ' hors de
 *  la salle. Renvoie le plan, les tronçons ({ plan à lui, entree, sortie, cases }), les bouts et les trous (passages) */
export function planSalle1(s, graine) {
  const r = alea(graine), N = SALLE_N;
  const dedans = (x, y) => dansSalle(s, x, y);
  const hcoupes = s.coupes.map((c) => ((c.h - s.de) % 12 + 12) % 12);
  const troncon = (x, y) => { const p = position(s, x, y); let k = 0; while (k < hcoupes.length && p > hcoupes[k]) k++; return k; };
  // distance (en cases, le long de l'anneau) à la coupe la plus proche
  const aCoupe = (x, y) => { const p = position(s, x, y), rr = Math.hypot(x + 0.5 - (SC + 0.5), y + 0.5 - (SC + 0.5)); let m = Infinity, k = -1; hcoupes.forEach((h, n) => { const d = Math.abs(p - h) * Math.PI / 6 * rr; if (d < m) { m = d; k = n; } }); return [m, k]; };
  const G = Array.from({ length: N }, (_, y) => Array.from({ length: N }, (_, x) => (dedans(x, y) ? (aCoupe(x, y)[0] < 0.8 ? '#' : '.') : ' ')));
  // les passages : au rayon tiré, on traverse le mur de la coupe dans l'axe de l'anneau, d'un tronçon au suivant
  const trous = [];
  hcoupes.forEach((h, k) => {
    for (let essai = 0; essai < 40; essai++) {
      const rr = SR0 + 1.5 + r() * (SR1 - SR0 - 3), [px, py] = pointSalle(rr, s.de + h), [vx, vy] = [px - (SC + 0.5), py - (SC + 0.5)];
      const d = Math.abs(vx) >= Math.abs(vy) ? [0, Math.sign(vx) * (s.de + h > 6 ? 1 : -1) || 1] : [Math.sign(vy) * (s.de + h > 6 ? -1 : 1) || 1, 0];
      // d : l'axe de l'anneau à cet endroit ; on part d'une case du tronçon k et l'on avance jusqu'au tronçon k + 1
      for (const sg of [1, -1]) {
        const dd = [d[0] * sg, d[1] * sg];
        let x = Math.floor(px), y = Math.floor(py);
        while (G[y]?.[x] === '#') { x -= dd[0]; y -= dd[1]; }
        if (G[y]?.[x] !== '.' || troncon(x, y) !== k) continue;
        const cases = []; let ok = true;
        for (let n = 0; n < 4; n++) { x += dd[0]; y += dd[1]; if (G[y]?.[x] === '#') cases.push([x, y]); else break; }
        if (!cases.length || G[y]?.[x] !== '.' || troncon(x, y) !== k + 1) ok = false;
        // le passage ne longe pas le bord de l'anneau
        if (ok && cases.some(([a, b]) => DIR4.some(([u, v]) => (u * dd[0] + v * dd[1] === 0) && !dedans(a + u, b + v)))) ok = false;
        if (!ok) continue;
        for (const [a, b] of cases) G[b][a] = s.coupes[k].grille ? 'G' : ':';
        trous.push({ coupe: s.coupes[k], cases, milieu: cases[Math.floor(cases.length / 2)], avant: [[x - dd[0] * (cases.length + 1), y - dd[1] * (cases.length + 1)]], apres: [[x, y]] });
        essai = 99; break;
      }
    }
    if (trous.length !== k + 1) throw new Error(`salle ${s.id} : pas de passage dans la coupe ${k}`);
  });
  // les bouts : la case du plancher la plus proche du point de sortie, contre le mur d'extrémité
  const long = ((s.a - s.de) % 12 + 12) % 12;
  const bout = (q) => {
    const [px, py] = pointSalle(s.rBout, q === 'de' ? s.de : s.a); let best = null;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (G[y][x] === '.') for (const d of DIR4) {
      const nx = x + d[0], ny = y + d[1], rr = Math.hypot(nx + 0.5 - (SC + 0.5), ny + 0.5 - (SC + 0.5));
      if (dedans(nx, ny) || rr < SR0 + 0.5 || rr > SR1 - 0.5) continue;
      const pn = position(s, nx, ny);
      if (q === 'de' ? pn < 6 : (pn < long || pn > long + 3)) continue;
      const dist = Math.hypot(x + 0.5 - px, y + 0.5 - py);
      if (!best || dist < best.dist) best = { dist, case: [x, y], sortie: [nx, ny], d };
    }
    if (!best) throw new Error(`salle ${s.id} : pas de bout ${q}`);
    G[best.case[1]][best.case[0]] = ':';
    return { case: best.case, sortie: best.sortie, d: best.d };
  };
  const bouts = { de: bout('de'), a: bout('a') };
  const P = G.map((l) => l.join(''));
  const nT = hcoupes.length + 1, troncons = [];
  for (let k = 0; k < nT; k++) {
    const entree = k === 0 ? bouts.de.case : trous[k - 1].cases[trous[k - 1].cases.length - 1];
    const sortie = k === nT - 1 ? bouts.a.case : trous[k].cases[0];
    const garde = new Set([...(trous[k - 1]?.cases || []), ...(trous[k]?.cases || [])].map((c) => cle(...c)));
    const plan = P.map((l, y) => [...l].map((c, x) => ((c === '.' || c === ':') && troncon(x, y) === k) || garde.has(cle(x, y)) ? (c === 'G' ? ':' : c) : ' ').join(''));
    troncons.push({ entree, sortie, plan, long: Math.max(...[...plan.join('')].map((c, n) => (c === '.' ? arcDe(s, n % N, Math.floor(n / N)) : 0))) - Math.min(...[...plan.join('')].map((c, n) => (c === '.' ? arcDe(s, n % N, Math.floor(n / N)) : Infinity))) });
  }
  return { plan: P, troncons, bouts, trous };
}
/** l'entrée et la sortie d'un tronçon dans le sens où l'on traverse la salle */
export const sensTroncon = (s, t) => (s.depuis === 'a' ? [t.sortie, t.entree] : [t.entree, t.sortie]);
/** un tronçon convient : on le traverse en poussant au moins un tourniquet, et l'on ne s'y coince jamais : de partout,
 *  on rejoint ses deux bouts, quelle que soit la position où un autre joueur a laissé les tourniquets, qu'on y entre par
 *  un bout ou par l'autre */
export function tronconValide(s, t, TS = t.tourniquets, plan = t.plan) {
  const [e, f] = sensTroncon(s, t), A = analyser(plan, TS, e, f, 600000, 2);
  return TS.length ? A : { ...A, ok: A.figes, poussees: 0 };
}
/** les barrières d'un tronçon, tirées d'une graine, façon Cimetronelle : tous les 5 ou 6 cases le long de l'anneau, un
 *  mur en travers de tout le tronçon, percé d'une ou deux ouvertures de trois cases ; au milieu de chaque ouverture, un
 *  tourniquet dont deux bras la ferment (et parfois d'autres bras, ou un bras de deux cases). Renvoie { murs, tourniquets } */
export function barrieresTroncon(s, t, graine) {
  if (!graine) return { murs: [], tourniquets: [] };
  const r = alea(graine), N = t.plan.length, sol = (x, y) => t.plan[y]?.[x] === '.';
  const arcs = []; t.plan.forEach((l, y) => [...l].forEach((c, x) => { if (c === '.') arcs.push(arcDe(s, x, y)); }));
  const a0 = Math.min(...arcs), a1 = Math.max(...arcs), L = a1 - a0, nb = Math.max(1, Math.round(L / 5.5));
  const murs = new Map(), TS = [], pris = new Set();
  for (let b = 0; b < nb; b++) {
    const a = a0 + L * (b + 0.35 + r() * 0.3) / nb, RM = SR0 + 1 + r() * (SR1 - SR0 - 2);
    const h = s.de + (a / RM) / (Math.PI / 6), [px, py] = pointSalle(RM, h), vx = px - (SC + 0.5), vy = py - (SC + 0.5);
    // le mur suit le rayon : une ligne de la grille, celle qui est la plus proche du rayon
    const hz = Math.abs(vx) >= Math.abs(vy), x0 = Math.floor(px), y0 = Math.floor(py);
    if (!sol(x0, y0)) continue;
    const pas = hz ? [1, 0] : [0, 1], run = [[x0, y0]];
    for (const sg of [-1, 1]) { let x = x0 + pas[0] * sg, y = y0 + pas[1] * sg; while (sol(x, y)) { if (sg < 0) run.unshift([x, y]); else run.push([x, y]); x += pas[0] * sg; y += pas[1] * sg; } }
    if (run.length < 4) continue;
    // un mur qui touche une autre barrière, une case gardée ou un bout : on n'en met pas
    if (run.some(([x, y]) => pris.has(cle(x, y)) || DIR4.some(([u, v]) => t.plan[y + v]?.[x + u] === ':'))) continue;
    const ouvertures = run.length >= 8 && r() < 0.4 ? 2 : 1, libres = new Set();
    const places = []; for (let j = 1; j < run.length - 1; j++) places.push(j);
    places.sort(() => r() - 0.5);
    let n = 0;
    for (const j of places) {
      if (n >= ouvertures) break;
      if ([j - 2, j - 1, j, j + 1, j + 2].some((q) => libres.has(q))) continue;
      const [x, y] = run[j], perp = hz ? [0, 1] : [1, 0];
      // le tourniquet tourne : ses huit voisins sont du plancher
      let ok = true; for (let v = -1; v <= 1 && ok; v++) for (let u = -1; u <= 1; u++) if (!sol(x + u, y + v)) { ok = false; break; }
      if (!ok) continue;
      const bras = [[pas[0], pas[1], 1], [-pas[0], -pas[1], 1]];
      // parfois un bras de deux cases le long du mur (l'ouverture s'élargit d'autant)
      if (r() < 0.3) { const k = r() < 0.5 ? 0 : 1, sg = k ? -1 : 1, q = j + 2 * sg; if (q > 0 && q < run.length - 1 || q === 0 || q === run.length - 1) { bras[k][2] = 2; libres.add(q); } }
      for (const sg of [1, -1]) if (r() < 0.35) bras.push([perp[0] * sg, perp[1] * sg, r() < 0.3 ? 2 : 1]);
      [j - 1, j, j + 1].forEach((q) => libres.add(q));
      TS.push({ x, y, bras }); n++;
    }
    if (!n) continue;
    run.forEach(([x, y], q) => { pris.add(cle(x, y)); if (!libres.has(q)) murs.set(cle(x, y), hz ? 'h' : 'v'); });
  }
  // murs : [x, y, sens de la cloison ('h' : est-ouest, 'v' : nord-sud)]
  return { murs: [...murs].map(([k, o]) => [...k.split(',').map(Number), o]), tourniquets: TS };
}
/** le plan d'un tronçon avec des murs en plus */
export const avecMurs = (plan, murs) => { const G = plan.map((l) => [...l]); for (const [x, y] of murs) G[y][x] = '#'; return G.map((l) => l.join('')); };
/** un tronçon et ses barrières : valide, et chaque tourniquet sert (sans lui, on passe en poussant moins) */
export function noterTroncon(s, t, graine) {
  const B = barrieresTroncon(s, t, graine);
  if (!B.tourniquets.length) return null;
  const plan = avecMurs(t.plan, B.murs), A = tronconValide(s, t, B.tourniquets, plan);
  if (!A.ok || A.poussees < 2) return null;
  for (let i = 0; i < B.tourniquets.length; i++) {
    const S = tronconValide(s, t, B.tourniquets.filter((_, q) => q !== i), plan);
    if (!(S.figes || S.poussees < A.poussees)) return null;
  }
  return { ...B, poussees: A.poussees, configs: A.configs };
}
/** les graines retenues (cherchées par tools/horloge-tourniquets.mjs ; tools/test-testodyssee.mjs vérifie qu'elles
 *  conviennent toujours) : celle du plan, puis une par tronçon */
export const GRAINES_N1 = { sud: [1, 88, 958], est: [1, 259, 254, 554, 757], ouest: [1, 259, 842, 554, 1406] };
let SALLES_N1 = null;
/** les salles de l'étage 1, une fois : plan, tronçons, tourniquets (tous, dans l'ordre des tronçons) */
export function salles1() {
  if (SALLES_N1) return SALLES_N1;
  SALLES_N1 = {};
  for (const s of SALLES1) {
    const [g, ...gs] = GRAINES_N1[s.id], L = planSalle1(s, g), G = L.plan.map((l) => [...l]);
    L.cloisons = new Map();
    L.troncons.forEach((t, k) => {
      const B = barrieresTroncon(s, t, gs[k] ?? 0);
      t.tourniquets = B.tourniquets; t.plan = avecMurs(t.plan, B.murs);
      for (const [x, y, o] of B.murs) { G[y][x] = '#'; L.cloisons.set(cle(x, y), o); }
    });
    L.plan = G.map((l) => l.join(''));
    L.tourniquets = L.troncons.flatMap((t) => t.tourniquets);
    SALLES_N1[s.id] = L;
  }
  return SALLES_N1;
}

/* ---------------- l'escalier ---------------- */
// La salle nord : un palier entre la porte de 11 h et le pied de l'escalier ; l'escalier part vers l'est au ras du mur
// intérieur et fait un tour entier en s'écartant vers l'extérieur, au-dessus des salles est, sud et ouest ; tout en haut,
// au-dessus du palier, la grande porte de l'étage 2. Près de la porte de 1 h, un petit palier contre le mur extérieur,
// au bord des premières marches.
export const ESCALIER = `${HORLOGE1}:escalier`;
/** pied de l'escalier (heure), hauteur totale, bord intérieur au départ et à l'arrivée, largeur, nombre de marches */
export const ESC = { hs: 11.85, haut: 7, rIn0: 23.2, rIn1: 27.4, larg: 3.4, marches: 96, palier: [11.12, 26.8], pallierEst: [0.25, 0.86], palierHaut: 0.3 };
export const SALLE_ESC = { id: 'escalier', nom: 'L\'escalier (étage 1)', de: 11.14, a: 0.86, pfDe: 'p11', pfA: 'p1', rBout: 25 };
/** t (de 0 au pied à 12 en haut), et le bord intérieur de l'escalier à ce t */
export const rInt = (t) => ESC.rIn0 + ((ESC.rIn1 - ESC.rIn0) * t) / 12;
/** la marche n (0 en bas) : hauteur */
export const hMarche = (k) => (ESC.haut * Math.max(0, Math.min(ESC.marches - 1, k))) / (ESC.marches - 1);
/** ce qu'il y a dans une case de la carte de l'escalier : { quoi: 'palier' | 'marche' | 'palierEst', h, k } ou null */
export function caseEscalier(x, y) {
  const vx = x + 0.5 - (SC + 0.5), vy = y + 0.5 - (SC + 0.5), r = Math.hypot(vx, vy), h = heureDe(vx, vy);
  const t = ((h - ESC.hs) % 12 + 12) % 12;
  if (r >= rInt(t) && r <= rInt(t) + ESC.larg) { const k = Math.floor((t / 12) * ESC.marches); return { quoi: 'marche', k, h: hMarche(k) }; }
  const dans = (a, b) => ((h - a) % 12 + 12) % 12 <= ((b - a) % 12 + 12) % 12;
  if (dans(ESC.palier[0], ESC.hs) && r >= SR0 && r <= ESC.palier[1]) return { quoi: 'palier', h: 0, k: -1 };
  // tout en haut, le palier de la grande porte : il prolonge la dernière marche, contre le mur extérieur
  if (t <= ESC.palierHaut && r >= ESC.rIn1 - 0.2 && r <= SR1) return { quoi: 'palierHaut', h: ESC.haut, k: ESC.marches };
  if (dans(...ESC.pallierEst) && r > rInt(t) + ESC.larg && r <= SR1) { const k = Math.floor((t / 12) * ESC.marches); return { quoi: 'palierEst', k, h: hMarche(k) }; }
  return null;
}
/** hauteur d'une case de l'escalier (null : on n'y marche pas) */
export const hauteurEscalier = (x, y) => caseEscalier(x, y)?.h ?? null;
/** sur une marche, le pas de la grille qui va le mieux dans le sens voulu : d = up (monter), down (descendre), left (vers
 *  le mur extérieur), right (vers le vide) ; en montant ou en descendant, on garde son côté de l'escalier */
export function pasEscalier(x, y, d) {
  const O = SC + 0.5, ox = x + 0.5 - O, oy = y + 0.5 - O, r = Math.hypot(ox, oy), T = [-oy / r, ox / r];
  const w = { up: T, down: [-T[0], -T[1]], left: [T[1], -T[0]], right: [-T[1], T[0]] }[d];
  const cote = (cx, cy) => { const rr = Math.hypot(cx + 0.5 - O, cy + 0.5 - O), t = ((Math.atan2(cx + 0.5 - O, -(cy + 0.5 - O)) / (Math.PI / 6) - ESC.hs) % 12 + 12) % 12; return rr - rInt(t); };
  const ici = cote(x, y), h0 = hauteurEscalier(x, y);
  let best = null;
  for (const [n, [dx, dy]] of Object.entries({ up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] })) {
    const h = hauteurEscalier(x + dx, y + dy), dot = dx * w[0] + dy * w[1];
    if (h == null || Math.abs(h - h0) > 1 || dot < 0.05) continue;
    // en montant ou en descendant, on reste sur les marches (jusqu'au palier du haut ou du bas) : on ne passe sur le petit
    // palier de 1 h que de côté
    const q = caseEscalier(x + dx, y + dy).quoi;
    if ((d === 'up' && q !== 'marche' && q !== 'palierHaut') || (d === 'down' && q !== 'marche' && q !== 'palier')) continue;
    const score = dot - (d === 'up' || d === 'down' ? 0.5 * Math.abs(cote(x + dx, y + dy) - ici) : 0);
    if (!best || score > best.score) best = { n, score };
  }
  return best?.n || null;
}
/** les sorties de l'escalier, toutes dans un mur long (on les voit de face ou on y marche vers le bas) : vers la plateforme
 *  de 11 h, dans le mur intérieur au bord du palier ; vers celle de 1 h, dans le mur extérieur au fond du petit palier ;
 *  la grande porte de l'étage 2, dans le mur extérieur, tout en haut */
export function boutsEscalier() {
  const pres = (r, h, f) => { const [px, py] = pointSalle(r, h); let best = null, bd = 1e9; for (let y = 0; y < SALLE_N; y++) for (let x = 0; x < SALLE_N; x++) if (f(caseEscalier(x, y))) { const d = Math.hypot(x + 0.5 - px, y + 0.5 - py); if (d < bd) { bd = d; best = [x, y]; } } return best; };
  // la case voisine qui va le plus vers le centre (sens -1) ou vers le dehors (sens 1), hors de l'escalier
  const vers = ([x, y], sens) => {
    const vx = x + 0.5 - (SC + 0.5), vy = y + 0.5 - (SC + 0.5), d = DIR4.filter(([a, b]) => !caseEscalier(x + a, y + b)).sort(([a, b], [c, e]) => sens * ((c * vx + e * vy) - (a * vx + b * vy)))[0];
    return d && { case: [x, y], sortie: [x + d[0], y + d[1]] };
  };
  const ouest = vers(pres(SR0 - 1, 11.35, (c) => c?.quoi === 'palier'), -1);
  const est = vers(pres(SR1 + 1, 0.6, (c) => c?.quoi === 'palierEst'), 1);
  // la grande porte : dans le mur extérieur (au nord), au milieu du palier du haut, face à la caméra
  const hautes = []; for (let y = 0; y < SALLE_N; y++) for (let x = 0; x < SALLE_N; x++) if (caseEscalier(x, y)?.quoi === 'palierHaut' && !caseEscalier(x, y - 1)) hautes.push([x, y]);
  hautes.sort((a, b) => a[0] - b[0]);
  const haut = hautes[Math.floor(hautes.length / 2)];
  return { ouest, est, haut, porte: [haut[0], haut[1] - 1], palierHaut: hautes };
}

/* ---------------- la construction ---------------- */
/** les portes de l'étage 1 : chaque salle part d'une plateforme (côté +) et finit à une autre (côté -) */
export const sallesEtage1 = () => [...SALLES1.map((s) => ({ s, map: salle1Id(s) })), { s: SALLE_ESC, map: ESCALIER }];

export function construireNiveau1(world) {
  const E = world.maps[HORLOGE]?.horloge || depart();
  // la salle des aiguilles de l'étage 1
  const m = room(HORLOGE1, W, H, { floor: 'cave', music: 'dmhh', wall: 'wall_cendre', name: 'Tour de l\'Horloge, étage 1' });
  m.zone(0, 0, W - 1, H - 1, { name: 'Tour de l\'Horloge, étage 1', music: 'dmhh' });
  m.horlogeNiv = 1;
  m.portesHorloge = new Set();
  const L1 = salles1(), BE = boutsEscalier();
  for (const { s, map } of sallesEtage1()) {
    const L = s.id === 'escalier' ? null : L1[s.id];
    const entreeDe = L ? L.bouts.de.case : BE.ouest.case, entreeA = L ? L.bouts.a.case : BE.est.case;
    for (const [pid, cote, e] of [[s.pfDe, 1, entreeDe], [s.pfA, -1, entreeA]]) {
      const [dx, dy] = portePf(pid, cote);
      m.portesHorloge.add(cle(dx, dy));
      m.warp(dx, dy, { map, x: e[0], y: e[1], dir: 'up', step: true });
    }
  }
  appliquer(m, E);
  for (const [x, y] of [...LEVIERS1.map(placeLevier), ...casesMecanisme()]) m.object(x, y, { use: (api) => api.game.horloge?.utiliser(x, y) });
  world.maps[HORLOGE1] = m;
  // les salles du mur
  const sol = { '.': T.FLOOR, ':': T.FLOOR, G: T.BLOCK, '#': T.BLOCK, ' ': T.BLOCK };
  for (const s of SALLES1) {
    const L = L1[s.id], r = room(salle1Id(s), SALLE_N, SALLE_N, { floor: 'wood', music: 'dmhh', wall: 'wall_cendre', name: s.nom });
    r.zone(0, 0, SALLE_N - 1, SALLE_N - 1, { name: s.nom, music: 'dmhh' });
    const solA = new Map(), dedans = (x, y) => L.plan[y]?.[x] !== undefined && L.plan[y][x] !== ' ';
    const muraille = (x, y) => { for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) if (dedans(x + a, y + b)) return true; return false; };
    L.plan.forEach((l, y) => [...l].forEach((c, x) => {
      r.set(x, y, sol[c]);
      if (c === ' ') solA.set(cle(x, y), muraille(x, y) ? 'muraille_' + ((x * 7 + y * 13) % 3) : 'void');
      else if (c === '#' && L.cloisons.has(cle(x, y))) solA.set(cle(x, y), cloison(L.cloisons, x, y));   // une cloison de bois
      else if (c === '#') solA.set(cle(x, y), 'sol_carillon_bas');   // le plancher du dessous, comme à l'étage 0
      else if (c === 'G') solA.set(cle(x, y), 'grille_tour');
      else solA.set(cle(x, y), 'sol_carillon');
    }));
    r.solArene = solA; r.style = 'carillon';
    r.horlogeSalle = s.id; r.planTq = L.plan; r.tourniquets = L.tourniquets;
    for (const [q, pid, cote] of [['de', s.pfDe, 1], ['a', s.pfA, -1]]) {
      const [tx, ty] = L.bouts[q].sortie, [px, py] = devantPortePf(pid, cote);
      r.set(tx, ty, T.MAT); solA.delete(cle(tx, ty));
      r.warp(tx, ty, { map: HORLOGE1, x: px, y: py, dir: 'down', step: true });
    }
    world.maps[salle1Id(s)] = r;
  }
  // l'escalier (dessiné en volumes : horloge-escalier.js)
  const e = room(ESCALIER, SALLE_N, SALLE_N, { floor: 'wood', music: 'dmhh', wall: 'wall_cendre', name: SALLE_ESC.nom });
  e.zone(0, 0, SALLE_N - 1, SALLE_N - 1, { name: SALLE_ESC.nom, music: 'dmhh' });
  for (let y = 0; y < SALLE_N; y++) for (let x = 0; x < SALLE_N; x++) e.set(x, y, caseEscalier(x, y) ? T.FLOOR : T.BLOCK);
  e.escalier = true;
  for (const [b, pid, cote] of [[BE.ouest, 'p11', 1], [BE.est, 'p1', -1]]) {
    const [tx, ty] = b.sortie, [px, py] = devantPortePf(pid, cote);
    e.set(tx, ty, T.MAT); e.warp(tx, ty, { map: HORLOGE1, x: px, y: py, dir: 'down', step: true });
  }
  e.set(...BE.porte, T.BLOCK);
  e.object(...BE.porte, { use: (api) => api.game.horloge?.grandePorte() });
  world.maps[ESCALIER] = e;
  // tout l'étage dans l'état commun
  appliquerSalles1(world, E);
}
/** la pièce d'une cloison (tools/pixelforge/tourniquets.py) : cl_h / cl_v, bout arrondi du côté où elle s'arrête */
function cloison(C, x, y) {
  const o = C.get(cle(x, y)), [a, b] = o === 'h' ? [C.get(cle(x - 1, y)) === 'h', C.get(cle(x + 1, y)) === 'h'] : [C.get(cle(x, y - 1)) === 'v', C.get(cle(x, y + 1)) === 'v'];
  return 'cl_' + o + (a && b ? '' : !a && !b ? '_x' : o === 'h' ? (a ? '_e' : '_o') : (a ? '_s' : '_n'));
}
/** pose les tourniquets et les grilles des salles de l'étage 1 selon l'état ; renvoie les cases changées par carte */
export function appliquerSalles1(world, E) {
  const L1 = salles1(), changees = {};
  for (const s of SALLES1) {
    const r = world.maps[salle1Id(s)]; if (!r) continue;
    const L = L1[s.id], rots = E.tq?.[s.id] || [], ch = [];
    const voulu = new Map();
    L.tourniquets.forEach((Q, i) => { for (const [k, v] of piecesTourniquet(Q, rots[i] || 0)) voulu.set(k, v); });
    const avant = r._tq || new Map();
    for (const k of new Set([...avant.keys(), ...voulu.keys()])) {
      if (avant.get(k) === voulu.get(k)) continue;
      const [x, y] = k.split(',').map(Number);
      if (voulu.has(k)) { r.set(x, y, T.BLOCK); r.solArene.set(k, voulu.get(k)); }
      else { r.set(x, y, T.FLOOR); r.solArene.set(k, 'sol_carillon'); }
      ch.push([x, y]);
    }
    r._tq = voulu;
    for (const t of L.trous) if (t.coupe.grille) {
      const ouverte = !!E.grilles?.[t.coupe.grille];
      for (const [x, y] of t.cases) { const avantG = r.get(x, y) === T.FLOOR; if (avantG !== ouverte) { r.set(x, y, ouverte ? T.FLOOR : T.BLOCK); r.solArene.set(cle(x, y), ouverte ? 'grille_ouverte' : 'grille_tour'); ch.push([x, y]); } }
    }
    changees[r.id] = ch;
  }
  return changees;
}
