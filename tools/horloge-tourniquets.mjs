// tools/horloge-tourniquets.mjs — cherche les graines des salles à tourniquets de l'étage 1 de la Tour de l'Horloge
// (testodyssee/js/horloge-n1.js, GRAINES_N1) : pour chaque salle, plusieurs plans, et pour chaque tronçon la graine dont
// les barrières demandent le plus de poussées (et qui ont des piliers), où chaque tourniquet sert, sans qu'on puisse s'y coincer (de partout, on
// rejoint les deux bouts, quelle que soit la position où un autre joueur a laissé les tourniquets).
//   node tools/horloge-tourniquets.mjs [plans] [graines par tronçon] [salle]
import { SALLES1, planSalle1, noterTroncon } from '../testodyssee/js/horloge-n1.js';

const P = +process.argv[2] || 3, S = +process.argv[3] || 150, seule = process.argv[4], out = {};
for (const s of SALLES1) {
  if (seule && s.id !== seule) continue;
  let best = null;
  for (let g = 1; g <= P; g++) {
    let L; try { L = planSalle1(s, g); } catch (e) { console.error(s.id, 'plan', g, e.message); continue; }
    const choix = [];
    for (const t of L.troncons) {
      let b = null;
      for (let k = 1; k <= S; k++) {
        const A = noterTroncon(s, t, k);
        if (!A) continue;
        const q = A.murs.filter((m) => m[2] === 'p').length, v = Math.min(A.poussees, 6) + 1.5 * Math.min(q, 2);   // des piliers, comme à Cimetronelle
        if (!b || v > b.v || (v === b.v && A.configs > b.c)) b = { k, p: A.poussees, c: A.configs, n: A.tourniquets.length, q, v };
      }
      choix.push(b);
    }
    if (choix.some((c) => !c)) { console.error(s.id, 'plan', g, 'un tronçon sans graine'); continue; }
    const score = choix.reduce((a, c) => a + c.v, 0);
    console.error(s.id, 'plan', g, choix.map((c) => `${c.k}:${c.p}p/${c.n}t/${c.q}pil`).join(' '), score);
    if (!best || score > best.score) best = { score, g, choix };
  }
  if (best) out[s.id] = [best.g, ...best.choix.map((c) => c.k)];
}
console.log('export const GRAINES_N1 = ' + JSON.stringify(out).replace(/"/g, '').replace(/,(\w)/g, ', $1').replace(/:/g, ': ') + ';');
