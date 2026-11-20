// tools/horloge-tourniquets.mjs — cherche les graines des salles à tourniquets de l'étage 1 de la Tour de l'Horloge
// (testodyssee/js/horloge-n1.js, GRAINES_N1) : pour chaque salle, plusieurs plans, et pour chaque tronçon la graine dont
// les tourniquets demandent le plus de poussées, sans qu'on puisse s'y coincer (de partout, on revient à l'entrée et à la
// sortie, quelle que soit la position où un autre joueur les a laissés), dans le sens où l'on traverse la salle.
//   node tools/horloge-tourniquets.mjs [plans] [graines par tronçon]
import { SALLES1, planSalle1, tourniquetsTroncon, tronconValide } from '../testodyssee/js/horloge-n1.js';

const P = +process.argv[2] || 3, S = +process.argv[3] || 150, out = {};
for (const s of SALLES1) {
  let best = null;
  for (let g = 1; g <= P; g++) {
    let L; try { L = planSalle1(s, g); } catch { continue; }
    const choix = [];
    for (const t of L.troncons) {
      let b = null;
      for (let k = 1; k <= S; k++) {
        const A = tronconValide(s, t, tourniquetsTroncon(t, k));
        if (A.ok && (!b || A.poussees > b.p || (A.poussees === b.p && A.configs > b.c))) b = { k, p: A.poussees, c: A.configs };
      }
      // aucune graine : un tronçon sans tourniquet (s'il se traverse)
      if (!b && tronconValide(s, t, []).ok) b = { k: 0, p: 0, c: 0 };
      choix.push(b);
    }
    if (choix.some((c) => !c)) { console.error(s.id, 'plan', g, 'un tronçon sans graine'); continue; }
    const score = choix.filter((c) => c.p).length * 100 + choix.reduce((a, c) => a + c.p, 0);
    console.error(s.id, 'plan', g, choix.map((c) => `${c.k}:${c.p}`).join(' '), score);
    if (!best || score > best.score) best = { score, g, choix };
  }
  if (best) out[s.id] = [best.g, ...best.choix.map((c) => c.k)];
}
console.log('export const GRAINES_N1 = ' + JSON.stringify(out).replace(/"/g, '').replace(/,(\w)/g, ', $1').replace(/:/g, ': ') + ';');
