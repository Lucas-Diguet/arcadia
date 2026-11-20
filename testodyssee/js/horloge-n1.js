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
/** le plan d'une salle (sans tourniquets), façon Cimetronelle : des carrefours de 3 × 3 cases (un tourniquet peut tourner
 *  au centre) tous les 4 cases, reliés par des couloirs d'une case, de la pierre ailleurs. Les coupes partagent la salle
 *  en tronçons ; un seul couloir passe d'un tronçon au suivant (une grille pour celle de l'îlot). Dans le plan : '.'
 *  plancher, ':' plancher où rien ne tourne (les passages, les bouts), '#' pierre, 'G' grille, ' ' hors de la salle.
 *  Renvoie aussi les tronçons (plan à lui, entrée, sortie, carrefours), les bouts et les passages */
export function planSalle1(s, graine) {
  const r = alea(graine), N = SALLE_N;
  const dedans = (x, y) => dansSalle(s, x, y);
  const hcoupes = s.coupes.map((c) => ((c.h - s.de) % 12 + 12) % 12);
  const troncon = (x, y) => { const p = position(s, x, y); let k = 0; while (k < hcoupes.length && p > hcoupes[k]) k++; return k; };
  // le quadrillage qui donne le plus de carrefours entiers dans la salle
  let meilleur = null;
  for (let oy = 0; oy < 4; oy++) for (let ox = 0; ox < 4; ox++) {
    const hubs = [];
    for (let y = oy; y < N; y += 4) for (let x = ox; x < N; x += 4) {
      let ok = true; for (let b = -1; b <= 1 && ok; b++) for (let a = -1; a <= 1; a++) if (!dedans(x + a, y + b)) { ok = false; break; }
      // un carrefour ne chevauche pas une coupe
      if (ok && [-1, 0, 1].some((b) => [-1, 0, 1].some((a) => troncon(x + a, y + b) !== troncon(x, y)))) ok = false;
      if (ok) hubs.push([x, y]);
    }
    if (!meilleur || hubs.length > meilleur.length) meilleur = hubs;
  }
  const hubs = meilleur.map(([x, y]) => ({ x, y, k: troncon(x, y) })), hubAt = new Map(hubs.map((h, i) => [cle(h.x, h.y), i]));
  const aretes = [];
  hubs.forEach((h, i) => { for (const [dx, dy] of [[4, 0], [0, 4]]) { const j = hubAt.get(cle(h.x + dx, h.y + dy)); if (j !== undefined && dedans(h.x + dx / 2, h.y + dy / 2)) aretes.push({ i, j, c: [h.x + dx / 2, h.y + dy / 2] }); } });
  const vois = hubs.map(() => []); aretes.forEach((e, n) => { vois[e.i].push([e.j, n]); vois[e.j].push([e.i, n]); });
  const G = Array.from({ length: N }, (_, y) => Array.from({ length: N }, (_, x) => (dedans(x, y) ? '#' : ' ')));
  const ouvrir = (h) => { for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) G[h.y + b][h.x + a] = '.'; };
  const plusPres = (ids, [px, py]) => ids.slice().sort((a, b) => Math.hypot(hubs[a].x - px, hubs[a].y - py) - Math.hypot(hubs[b].x - px, hubs[b].y - py))[0];
  // un bout de la salle : du carrefour le plus proche, un couloir droit jusqu'au mur d'extrémité
  const bout = (ids, q) => {
    const h = q === 'de' ? s.de - 0.3 : s.a + 0.3, P = pointSalle(s.rBout, h), i = plusPres(ids, P), H0 = hubs[i];
    const d = DIR4.slice().sort(([a, b], [c, e]) => (c * (P[0] - H0.x) + e * (P[1] - H0.y)) - (a * (P[0] - H0.x) + b * (P[1] - H0.y)))[0];
    let x = H0.x + d[0], y = H0.y + d[1];
    while (dedans(x + d[0], y + d[1])) { x += d[0]; y += d[1]; G[y][x] = '.'; }
    return { hub: i, case: [x, y], sortie: [x + d[0], y + d[1]], d };
  };
  const nT = hcoupes.length + 1, troncons = [], trous = [], gardes = [];
  let entreeHub = null, bouts = {};
  for (let k = 0; k < nT; k++) {
    const ids = hubs.map((h, i) => i).filter((i) => hubs[i].k === k);
    if (k === 0) { bouts.de = bout(ids, 'de'); entreeHub = bouts.de.hub; }
    // les carrefours qu'on atteint depuis l'entrée du tronçon, et un labyrinthe parfait entre eux, plus quelques boucles
    const comp = new Set([entreeHub]), f = [entreeHub];
    for (let n = 0; n < f.length; n++) for (const [j] of vois[f[n]]) if (hubs[j].k === k && !comp.has(j)) { comp.add(j); f.push(j); }
    const vu = new Set([entreeHub]), pile = [entreeHub], pris = new Set();
    while (pile.length) {
      const i = pile[pile.length - 1], v = vois[i].filter(([j]) => comp.has(j) && !vu.has(j));
      if (!v.length) { pile.pop(); continue; }
      const [j, n] = v[Math.floor(r() * v.length)]; pris.add(n); vu.add(j); pile.push(j);
    }
    aretes.forEach((e, n) => { if (comp.has(e.i) && comp.has(e.j) && !pris.has(n) && r() < 0.15) pris.add(n); });
    for (const i of comp) ouvrir(hubs[i]);
    // un couloir de trois cases de large entre deux carrefours : on peut y passer de côté et pousser un bras
    for (const n of pris) { const { c: [x, y], i, j } = aretes[n], hz = hubs[i].y === hubs[j].y; for (let u = -1; u <= 1; u++) { const [a, b] = hz ? [x, y + u] : [x + u, y]; if (G[b][a] === '#') G[b][a] = '.'; } }
    // la sortie du tronçon : un seul couloir vers le suivant (le plus éloigné possible de l'entrée), ou le bout de la salle
    let sortie, sortieHub;
    if (k < nT - 1) {
      const passages = aretes.filter((e) => (comp.has(e.i) && hubs[e.j].k === k + 1) || (comp.has(e.j) && hubs[e.i].k === k + 1));
      const loin = (e) => { const i = comp.has(e.i) ? e.i : e.j; return Math.hypot(hubs[i].x - hubs[entreeHub].x, hubs[i].y - hubs[entreeHub].y); };
      passages.sort((a, b) => loin(b) - loin(a));
      if (passages.length) {
        const e = passages[Math.floor(r() * Math.min(2, passages.length))];
        const [x, y] = e.c; G[y][x] = s.coupes[k].grille ? 'G' : ':';
        trous.push({ coupe: s.coupes[k], cases: [[x, y]], milieu: [x, y], avant: [], apres: [] });
        sortie = [x, y]; sortieHub = comp.has(e.i) ? e.j : e.i;
      } else {
        // pas de carrefours voisins de part et d'autre de la coupe : un couloir coudé entre les deux plus proches
        let best = null;
        for (const i of comp) for (let j = 0; j < hubs.length; j++) if (hubs[j].k === k + 1) {
          const a = hubs[i], b = hubs[j], d = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
          if (best && d >= best.d) continue;
          for (const coude of [[b.x, a.y], [a.x, b.y]]) {
            const ch = []; let [x, y] = [a.x, a.y], ok = true;
            for (const [tx, ty] of [coude, [b.x, b.y]]) while (x !== tx || y !== ty) { x += Math.sign(tx - x); y += Math.sign(ty - y); if (!dedans(x, y)) ok = false; ch.push([x, y]); }
            if (ok) { best = { d, i, j, ch }; break; }
          }
        }
        if (!best) throw new Error(`salle ${s.id} : pas de passage après le tronçon ${k}`);
        const hors = (x, y, h) => Math.abs(x - h.x) > 1 || Math.abs(y - h.y) > 1;
        const ch = best.ch.filter(([x, y]) => hors(x, y, hubs[best.i]) && hors(x, y, hubs[best.j]));
        const n0 = ch.findIndex(([x, y]) => troncon(x, y) > k), n = n0 < 0 ? ch.length - 1 : n0;
        ch.forEach(([x, y]) => { G[y][x] = '.'; });
        const [x, y] = ch[n]; G[y][x] = s.coupes[k].grille ? 'G' : ':';
        trous.push({ coupe: s.coupes[k], cases: [[x, y]], milieu: [x, y], avant: ch.slice(0, n), apres: ch.slice(n + 1) });
        sortie = [x, y]; sortieHub = best.j;
      }
    } else { bouts.a = bout([...comp], 'a'); sortie = bouts.a.case; }
    const entree = k === 0 ? bouts.de.case : trous[k - 1].milieu;
    troncons.push({ entree, sortie, comp: [...comp], hubs: [...comp].map((i) => [hubs[i].x, hubs[i].y]) });
    entreeHub = sortieHub;
  }
  for (const b of [bouts.de, bouts.a]) G[b.case[1]][b.case[0]] = ':';
  const P = G.map((l) => l.join(''));
  // le plan de chaque tronçon : ses carrefours, ses couloirs, et les passages à ses deux bouts
  troncons.forEach((t, k) => {
    const garde = new Set();
    for (const i of t.comp) for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) garde.add(cle(hubs[i].x + a, hubs[i].y + b));
    aretes.forEach((e) => { if (t.comp.includes(e.i) && t.comp.includes(e.j)) { const hz = hubs[e.i].y === hubs[e.j].y; for (let u = -1; u <= 1; u++) garde.add(hz ? cle(e.c[0], e.c[1] + u) : cle(e.c[0] + u, e.c[1])); } });
    const bord = (c) => { garde.add(cle(...c)); };
    bord(t.entree); bord(t.sortie);
    for (const c of [...(trous[k - 1]?.apres || []), ...(trous[k]?.avant || [])]) bord(c);
    if (k === 0) { let [x, y] = hubs[bouts.de.hub] ? [hubs[bouts.de.hub].x, hubs[bouts.de.hub].y] : t.entree; while (x !== bouts.de.case[0] || y !== bouts.de.case[1]) { x += bouts.de.d[0]; y += bouts.de.d[1]; garde.add(cle(x, y)); } }
    if (k === nT - 1) { let [x, y] = [hubs[bouts.a.hub].x, hubs[bouts.a.hub].y]; while (x !== bouts.a.case[0] || y !== bouts.a.case[1]) { x += bouts.a.d[0]; y += bouts.a.d[1]; garde.add(cle(x, y)); } }
    t.plan = P.map((l, y) => [...l].map((c, x) => (garde.has(cle(x, y)) && c !== '#' && c !== ' ' ? (c === 'G' ? ':' : c) : ' ')).join(''));
  });
  return { plan: P, troncons, bouts, trous };
}
/** l'entrée et la sortie d'un tronçon dans le sens où l'on traverse la salle */
export const sensTroncon = (s, t) => (s.depuis === 'a' ? [t.sortie, t.entree] : [t.entree, t.sortie]);
/** un tronçon convient : on le traverse dans son sens, en poussant au moins un tourniquet, et l'on ne s'y coince jamais
 *  (de partout, on revient à l'entrée et l'on atteint la sortie, même quand un autre joueur a laissé les tourniquets) */
export function tronconValide(s, t, TS = t.tourniquets) {
  const [e, f] = sensTroncon(s, t), A = analyser(t.plan, TS, e, f, 400000, 1);
  // un tronçon sans tourniquet (trop étroit pour qu'ils y servent) : il suffit de le traverser
  return TS.length ? A : { ...A, ok: A.figes, poussees: 0 };
}
/** des tourniquets dans un tronçon, tirés d'une graine : au centre de 3 à 5 de ses carrefours, de un à quatre bras d'une case */
export function tourniquetsTroncon(t, graine) {
  if (!graine) return [];
  const r = alea(graine), hubs = t.hubs.slice().sort(() => r() - 0.5), n = Math.min(hubs.length, 3 + Math.floor(r() * 3));
  // (pas de bras sur une case où rien ne doit tourner : devant un passage ou une sortie)
  return hubs.slice(0, n).map(([x, y]) => {
    const nb = [1, 1, 2, 2, 2, 3, 3, 4][Math.floor(r() * 8)];
    return { x, y, bras: DIR4.slice().sort(() => r() - 0.5).slice(0, nb).filter(([a, b]) => t.plan[y + b][x + a] === '.').map(([a, b]) => [a, b, 1]) };
  }).filter((Q) => Q.bras.length);
}
/** les graines retenues (cherchées par tools/horloge-tourniquets.mjs ; tools/test-testodyssee.mjs vérifie qu'elles
 *  conviennent toujours) : celle du plan, puis une par tronçon */
export const GRAINES_N1 = { sud: [1, 21, 144], est: [2, 0, 18, 96, 1], ouest: [1, 2, 152, 53, 29] };
let SALLES_N1 = null;
/** les salles de l'étage 1, une fois : plan, tronçons, tourniquets (tous, dans l'ordre des tronçons) */
export function salles1() {
  if (SALLES_N1) return SALLES_N1;
  SALLES_N1 = {};
  for (const s of SALLES1) {
    const [g, ...gs] = GRAINES_N1[s.id], L = planSalle1(s, g);
    L.troncons.forEach((t, k) => { t.tourniquets = tourniquetsTroncon(t, gs[k] ?? 0); });
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
export const ESC = { hs: 11.85, haut: 7, rIn0: 23.2, rIn1: 27.4, larg: 3.4, marches: 96, palier: [11.12, 26.8], pallierEst: [0.25, 0.86] };
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
  if (dans(...ESC.pallierEst) && r > rInt(t) + ESC.larg && r <= SR1) { const k = Math.floor((t / 12) * ESC.marches); return { quoi: 'palierEst', k, h: hMarche(k) }; }
  return null;
}
/** hauteur d'une case de l'escalier (null : on n'y marche pas) */
export const hauteurEscalier = (x, y) => caseEscalier(x, y)?.h ?? null;
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
  const h = vers(pres(SR1 + 1, ESC.hs - 0.2, (c) => c?.quoi === 'marche' && c.k >= ESC.marches - 3), 1);
  return { ouest, est, haut: h.case, porte: h.sortie };
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
/** pose les tourniquets et les grilles des salles de l'étage 1 selon l'état ; renvoie les cases changées par carte */
export function appliquerSalles1(world, E) {
  const L1 = salles1(), changees = {};
  for (const s of SALLES1) {
    const r = world.maps[salle1Id(s)]; if (!r) continue;
    const L = L1[s.id], rots = E.tq?.[s.id] || [], ch = [];
    const voulu = new Map();
    L.tourniquets.forEach((Q, i) => { for (const [x, y, f, finBras] of casesTourniquet(Q, rots[i] || 0)) voulu.set(cle(x, y), f === 'p' ? 'tq_pivot' : 'tq_' + f + (finBras ? '' : '')); });
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
