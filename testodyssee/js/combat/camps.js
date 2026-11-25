// testodyssee/js/combat/camps.js — le moteur d'Odyssée désigne un Pokémon en jeu par { side, slot } (combats en double) ;
// les règles et les combats du labo, écrits pour le combat simple, attendent le numéro du camp (0 le joueur, 1 l'adversaire)

/** une place du moteur, { side, slot } (pas une action ni une attaque) */
export const estPlace = (a) => a !== null && typeof a === 'object' && typeof a.side === 'number' && typeof a.slot === 'number' && !('type' in a) && !('id' in a);

/** pose les méthodes `R` sur `cible` en leur passant le numéro du camp ; hors du premier emplacement, `orig` garde la main */
export function parCamp(cible, R, orig = {}) {
  for (const [k, f] of Object.entries(R)) {
    if (typeof f !== 'function') { cible[k] = f; continue; }
    cible[k] = function (...args) {
      if (!args.some(estPlace)) return f.apply(this, args);
      if (args.some((a) => estPlace(a) && a.slot !== 0) && orig[k]) return orig[k].apply(this, args);
      return f.apply(this, args.map((a) => (estPlace(a) ? a.side : a)));
    };
  }
}

/** même chose pour les méthodes propres d'une classe (les combats à plusieurs du labo) */
export function classeParCamp(C) {
  const P = C.prototype, R = {};
  for (const k of Object.getOwnPropertyNames(P)) if (k !== 'constructor' && typeof Object.getOwnPropertyDescriptor(P, k).value === 'function') R[k] = P[k];
  parCamp(P, R);
}

/** l'adversaire d'un combat à plusieurs ne change pas de Pokémon et n'utilise pas d'objet : il attaque */
export function attaqueSeulement(b, a) {
  if (a && (a.type === 'move' || a.type === 'recharge')) return a;
  const u = b.usableMoves(1), m = b.act(1);
  if (!u.length) return { type: 'move', id: 165 };
  const k = u[Math.floor(b.rng() * u.length)];
  return { type: 'move', id: m.moves[k].id, slot: k };
}
