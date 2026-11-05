// tools/tombeau-gardes.mjs — les deux salles des moines du Tombeau du Roi Sans Nom (le -2 et le -1), et leurs rondes.
//   node tools/tombeau-gardes.mjs [graine]  →  testodyssee/js/donjons/tombeau-gardes-plans.js (ne pas le modifier à la main)
//
// -2, Galeries des Moines : presque un labyrinthe (couloirs de deux cases, quelques boucles), des moines qui font
//     leur ronde dans les longs couloirs. On arrive au calme, à l'abri de leur regard.
// -1, Crypte du Sceptre : une crypte agencée comme un vrai lieu (antichambre, grande salle à colonnes, chapelle,
//     couloir de service), deux moines qui tournent dans la grande salle ; le gardien du sceptre, immobile, surveille
//     l'entrée de la chambre : on passe par le couloir de service pour se glisser derrière lui.
// Le générateur vérifie (tombeau-gardes.js, sansEtreVu) qu'on traverse sans être vu, quelle que soit l'heure d'arrivée.
import { writeFileSync } from 'node:fs';
import { ronde, vueGarde, sansEtreVu, auPas } from '../testodyssee/js/donjons/tombeau-gardes.js';

const graine0 = +(process.argv[2] || 7);
const hasard = (g) => { let s = g >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };
const grille = (w, h) => Array.from({ length: h }, () => Array(w).fill('#'));
const creuser = (g, x0, y0, x1, y1, c = '.') => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = c; };

/** ce qui bloque le pas et le regard (dans le plan) */
const SOL = new Set(['.', 'S', 'γ', 'δ', 'β', 'h', 'r', 'u', 'e']);
function outils(g) {
  const at = (x, y) => (g[y] || [])[x] ?? '#';
  return { libre: (x, y) => SOL.has(at(x, y)) && !'hrue'.includes(at(x, y)), solide: (x, y) => !SOL.has(at(x, y)), at };
}
const gardesDe = (G) => G.map((q) => ({ frames: ronde(q.ronde), decal: q.decal || 0, portee: q.portee || 5 }));
/** toutes les cases vues un jour par un moine */
function jamaisVues(g, G) {
  const { solide } = outils(g), s = new Set();
  for (const q of gardesDe(G)) for (const f of q.frames) { s.add(`${f.x},${f.y}`); for (const [a, b] of vueGarde(solide, f.x, f.y, f.dir, q.portee)) s.add(`${a},${b}`); }
  return s;
}
function verifier(nom, g, G, dep, but, departs = [0, 7, 19, 31, 46, 58]) {
  const { libre, solide } = outils(g), gardes = gardesDe(G);
  for (const q of gardes) for (const f of q.frames) if (!libre(f.x, f.y)) throw new Error(`${nom} : une ronde passe dans un mur (${f.x}, ${f.y})`);
  let pire = 0;
  for (const t0 of departs) {
    const r = sansEtreVu({ libre, solide, gardes, dep, but, t0 });
    if (!r) return null;
    pire = Math.max(pire, r.t - t0);
  }
  return pire;
}

/* ---------------- -2 : les Galeries des Moines ---------------- */
function galeries(graine) {
  const R = hasard(graine), CW = 13, CH = 6, W = 3 * CW + 1, H0 = 5, H = H0 + 3 * CH + 5;
  const g = grille(W, H);
  const cx0 = (c) => 1 + 3 * c, cy0 = (c) => H0 + 1 + 3 * c;
  // le labyrinthe : chaque case de 2 × 2, des murs d'une case ; parcours en profondeur, puis on rouvre des culs-de-sac
  const ouvert = new Set(), voisins = (a, b) => [[a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]].filter(([x, y]) => x >= 0 && y >= 0 && x < CW && y < CH);
  const lien = (a, b, c, d) => ouvert.add([Math.min(a, c), Math.min(b, d), Math.max(a, c), Math.max(b, d)].join());
  const estOuvert = (a, b, c, d) => ouvert.has([Math.min(a, c), Math.min(b, d), Math.max(a, c), Math.max(b, d)].join());
  const vus = new Set(['3,5']), pile = [[3, 5]];
  while (pile.length) {
    const [a, b] = pile[pile.length - 1], l = voisins(a, b).filter(([x, y]) => !vus.has(`${x},${y}`));
    if (!l.length) { pile.pop(); continue; }
    // des couloirs plutôt droits : on garde la même direction quand on peut
    const [c, d] = l[Math.floor(R() * l.length)];
    lien(a, b, c, d); vus.add(`${c},${d}`); pile.push([c, d]);
  }
  for (let a = 0; a < CW; a++) for (let b = 0; b < CH; b++) {
    const v = voisins(a, b), n = v.filter(([c, d]) => estOuvert(a, b, c, d)).length;
    if ((n === 1 && R() < 0.55) || R() < 0.07) { const f = v.filter(([c, d]) => !estOuvert(a, b, c, d)); if (f.length) { const [c, d] = f[Math.floor(R() * f.length)]; lien(a, b, c, d); } }
  }
  for (let a = 0; a < CW; a++) for (let b = 0; b < CH; b++) {
    creuser(g, cx0(a), cy0(b), cx0(a) + 1, cy0(b) + 1);
    if (a + 1 < CW && estOuvert(a, b, a + 1, b)) creuser(g, cx0(a) + 2, cy0(b), cx0(a) + 2, cy0(b) + 1);
    if (b + 1 < CH && estOuvert(a, b, a, b + 1)) creuser(g, cx0(a), cy0(b) + 2, cx0(a) + 1, cy0(b) + 2);
  }
  // en haut, la sortie vers le -1 (au-dessus de la case 9) ; en bas, la salle d'arrivée, qui s'ouvre sur le côté (case 3)
  creuser(g, 22, 1, 32, 3); creuser(g, cx0(9), 4, cx0(9) + 1, H0); g[0][27] = 'γ';
  const yb = H0 + 3 * CH + 1;
  creuser(g, 10, yb, 23, yb + 2); creuser(g, cx0(3), yb - 1, cx0(3) + 1, yb - 1); g[yb + 3][20] = 'β'; g[yb + 2][19] = 'S';
  // les rondes : les plus longs couloirs droits du labyrinthe (au moins quatre cases), loin de la salle d'arrivée
  const runs = [];
  for (let b = 0; b < CH; b++) for (let a = 0; a < CW; a++) {
    if (a === 0 || !estOuvert(a - 1, b, a, b)) { let e = a; while (e + 1 < CW && estOuvert(e, b, e + 1, b)) e++; if (e - a >= 3) runs.push({ h: true, a, b, e }); }
  }
  for (let a = 0; a < CW; a++) for (let b = 0; b < CH; b++) {
    if (b === 0 || !estOuvert(a, b - 1, a, b)) { let e = b; while (e + 1 < CH && estOuvert(a, e, a, e + 1)) e++; if (e - b >= 3) runs.push({ h: false, a, b, e }); }
  }
  runs.sort((p, q) => (q.e - (q.h ? q.a : q.b)) - (p.e - (p.h ? p.a : p.b)) || R() - 0.5);
  const pris = new Set(), G = [];
  for (const r of runs) {
    const cases = []; for (let k = r.h ? r.a : r.b; k <= r.e; k++) cases.push(r.h ? [k, r.b] : [r.a, k]);
    if (cases.some(([a, b]) => pris.has(`${a},${b}`) || (Math.abs(a - 3) <= 1 && b >= 4))) continue;
    for (const [a, b] of cases) for (const [x, y] of [[a, b], ...voisins(a, b)]) pris.add(`${x},${y}`);
    const lane = Math.floor(R() * 2), [a0, b0] = cases[0], [a1, b1] = cases[cases.length - 1];
    const p0 = r.h ? [cx0(a0), cy0(b0) + lane] : [cx0(a0) + lane, cy0(b0)], p1 = r.h ? [cx0(a1) + 1, cy0(b1) + lane] : [cx0(a1) + lane, cy0(b1) + 1];
    // au bout du couloir, le moine jette un œil dans un passage de côté, s'il y en a un
    const cote = (a, b) => (r.h ? [[a, b - 1, 'up'], [a, b + 1, 'down']] : [[a - 1, b, 'left'], [a + 1, b, 'right']]).filter(([c, d]) => c >= 0 && d >= 0 && c < CW && d < CH && estOuvert(a, b, c, d)).map((q) => q[2]);
    const ronde_ = [[...p0, ...cote(a0, b0).slice(0, 1)], [...p1, ...cote(a1, b1).slice(0, 1)]];
    G.push({ ronde: ronde_, decal: Math.floor(R() * 40) });
    if (G.length >= 7) break;
  }
  return { g, G, dep: [19, yb + 2], sortie: [27, 1] };
}

/* ---------------- -1 : la Crypte du Sceptre ---------------- */
function crypte() {
  const W = 36, H = 27, g = grille(W, H);
  creuser(g, 2, 2, 13, 2); creuser(g, 2, 2, 2, 9);                     // couloir de service
  creuser(g, 14, 2, 22, 7);                                            // la chambre du sceptre
  g[2][18] = 'L'; g[2][16] = 'b'; g[2][20] = 'b'; g[5][15] = '|'; g[5][21] = '|'; g[7][14] = 'v'; g[7][22] = 'v';
  creuser(g, 17, 8, 19, 8);                                            // son entrée
  creuser(g, 2, 10, 5, 17); g[11][4] = 'k'; g[14][4] = 'k'; g[17][5] = 'h'; // la chapelle
  creuser(g, 6, 16, 6, 17);
  creuser(g, 7, 9, 33, 18);                                            // la grande salle
  for (const x of [10, 13, 23, 26, 30]) for (const y of [12, 15]) g[y][x] = '|';
  for (const [x, y] of [[11, 12], [12, 12], [24, 15], [25, 15]]) g[y][x] = 'k';
  g[9][33] = 'r';
  creuser(g, 17, 19, 19, 19); creuser(g, 15, 20, 21, 24);              // l'antichambre
  g[20][15] = 'b'; g[20][21] = 'b'; g[24][16] = 'S'; g[25][18] = 'δ';
  const G = [
    { ronde: [[8, 10, 'down'], [16, 10], [16, 17, 'left'], [8, 17]], decal: 0 },
    { ronde: [[32, 10], [20, 10, 'down'], [20, 17], [32, 17, 'up']], decal: 23 },
  ];
  // le gardien du sceptre : immobile devant le socle, il surveille l'entrée de la chambre
  const gardien = { ronde: [[18, 4, 'down']], portee: 6, relique: true };
  return { g, G, gardien, dep: [16, 24], derriere: [[17, 4], [19, 4], [18, 3]], socle: [18, 2] };
}

/* ---------------- vérifications, et écriture ---------------- */
const voisin = ([x0, y0]) => (x, y) => Math.abs(x - x0) + Math.abs(y - y0) === 1;
let s2 = null, graine = graine0;
for (; graine < graine0 + 400; graine++) {
  const c = galeries(graine), { libre } = outils(c.g);
  if (c.G.length < 6) continue;
  const aller = verifier('-2', c.g, c.G, c.dep, voisin([27, 0])), retour = aller && verifier('-2', c.g, c.G, c.sortie, voisin([20, c.g.length - 1]));
  // l'arrivée et le haut de son couloir de sortie restent toujours à l'abri
  const vues = jamaisVues(c.g, c.G), abri = c.g.flatMap((r, y) => r.map((ch, x) => [x, y, ch])).filter(([x, y]) => (y >= c.dep[1] - 3 || (x >= 10 && x <= 11 && y >= c.dep[1] - 5)) && libre(x, y));
  if (aller == null || retour == null || abri.some(([x, y]) => vues.has(`${x},${y}`))) continue;
  // pas trop facile : sans moines, le chemin le plus court croise leurs regards
  const court = sansEtreVu({ libre, solide: outils(c.g).solide, gardes: [], dep: c.dep, but: voisin([27, 0]) });
  if (aller < court.t + 8) continue;
  s2 = { ...c, aller, retour, graine }; break;
}
if (!s2) throw new Error('aucune graine ne donne des Galeries traversables');
const s1 = crypte();
{
  const { g, G, gardien } = s1, tous = [...G, gardien];
  // jusqu'au gardien, sans être vu ; avec le gardien endormi, jusqu'au socle ; puis le retour à l'entrée
  const pret = verifier('-1', g, tous, s1.dep, (x, y) => s1.derriere.some(([a, b]) => a === x && b === y));
  const socle = verifier('-1', g, G, [17, 4], voisin(s1.socle)), dehors = verifier('-1', g, G, [17, 4], voisin([18, 25]));
  const vues = jamaisVues(g, [gardien]);
  if (pret == null || socle == null || dehors == null) throw new Error(`-1 : la crypte ne se traverse pas sans être vu (${pret}, ${socle}, ${dehors})`);
  if (!['17,8', '18,8', '19,8'].every((c) => vues.has(c))) throw new Error('-1 : le gardien ne surveille pas l\'entrée de la chambre');
  s1.pret = pret;
}
const txt = (g) => g.map((r) => r.join(''));
const out = `// testodyssee/js/donjons/tombeau-gardes-plans.js — généré par tools/tombeau-gardes.mjs (graine ${s2.graine}) : ne pas le modifier à la main.
// Les salles des moines du Tombeau du Roi Sans Nom : plans et rondes (coordonnées du plan).
export const GALERIES = ${JSON.stringify({ plan: txt(s2.g), gardes: s2.G }, null, 1)};
export const CRYPTE = ${JSON.stringify({ plan: txt(s1.g), gardes: s1.G, gardien: s1.gardien }, null, 1)};
`;
writeFileSync(new URL('../testodyssee/js/donjons/tombeau-gardes-plans.js', import.meta.url), out);
console.log(txt(s2.g).join('\n')); console.log(`-2 : graine ${s2.graine}, ${s2.G.length} moines, traversée en ${s2.aller} pas au pire (retour ${s2.retour})`);
console.log(txt(s1.g).join('\n')); console.log(`-1 : derrière le gardien en ${s1.pret} pas au pire`);
