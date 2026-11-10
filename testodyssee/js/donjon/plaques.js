// testodyssee/js/donjon/plaques.js — plaques de pression et grilles (Fonderie aux Plaques), sans DOM ni réseau.
//
// Une salle a des plaques (chacune ouvre un ou plusieurs groupes) et des grilles (chacune d'un groupe).
// Un groupe est ouvert tant qu'au moins `requis` de ses plaques portent un joueur (1 par défaut) ; un groupe `garde`
// reste ouvert pour de bon une fois ouvert (le treuil s'enclenche). Une grille ne se referme jamais sur un joueur.
// Mode test (un seul joueur) : une plaque suffit, et tout ce qui s'ouvre reste ouvert.

const cle = (x, y) => x + ',' + y;

/** plaques et grilles d'une salle, d'après les objets de son plan */
export function lirePlaques(def, P) {
  const plaques = [], grilles = [];
  for (const [c, l] of Object.entries(P.objets)) {
    const o = def.objets[c];
    if (o?.type === 'plaque') for (const [x, y] of l) plaques.push({ x, y, groupes: o.groupes });
    else if (o?.type === 'grille') for (const [x, y] of l) grilles.push({ x, y, groupe: o.groupe });
  }
  return { plaques, grilles };
}

/**
 * groupes ouverts pour des cases occupées (Set de « x,y ») ;
 * o.gardes : groupes déjà enclenchés pour de bon, o.avant : groupes ouverts juste avant, o.test : mode test
 */
export function grillesOuvertes(groupes, salle, occ, o = {}) {
  const ouvertes = new Set(), gardes = new Set(o.gardes || []), avant = new Set(o.avant || []);
  for (const [g, G] of Object.entries(groupes)) {
    if (!salle.grilles.some((q) => q.groupe === g)) continue;
    const n = salle.plaques.filter((p) => p.groupes.includes(g) && occ.has(cle(p.x, p.y))).length;
    if (n >= (o.test ? 1 : G.requis || 1)) (G.garde || o.test ? gardes : ouvertes).add(g);
    // quelqu'un est sous la grille : elle reste ouverte
    else if (avant.has(g) && salle.grilles.some((q) => q.groupe === g && occ.has(cle(q.x, q.y)))) ouvertes.add(g);
  }
  for (const g of gardes) ouvertes.delete(g);
  return { ouvertes: [...ouvertes].sort(), gardes: [...gardes].sort() };
}

/**
 * peut-on faire passer k joueurs de l'arrivée au passage suivant ? (recherche sur les positions de tous les joueurs ;
 * libre(x, y) : case où l'on peut marcher, grilles fermées comprises). Sert aux tests : une salle de la Fonderie
 * doit se traverser à 2, pas seul.
 */
export function traversable(groupes, salle, libre, depart, arrivee, k) {
  const fin = cle(...arrivee), grille = new Map(salle.grilles.map((q) => [cle(q.x, q.y), q.groupe]));
  const etat0 = { pos: Array(k).fill(cle(...depart)), gardes: [] };
  const nom = (E) => [...E.pos].sort().join('|') + '/' + E.gardes.join('');
  const vus = new Set([nom(etat0)]), file = [etat0];
  const V = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (file.length) {
    const E = file.shift();
    if (E.pos.every((p) => p === fin)) return true;
    const occ = new Set(E.pos), O = grillesOuvertes(groupes, salle, occ, { gardes: E.gardes });
    const ouv = new Set([...O.ouvertes, ...O.gardes]);
    for (let i = 0; i < k; i++) {
      if (E.pos[i] === fin) continue;   // arrivé : il est passé dans la salle suivante
      const [x, y] = E.pos[i].split(',').map(Number);
      for (const [dx, dy] of V) {
        const nx = x + dx, ny = y + dy, c = cle(nx, ny);
        if (!libre(nx, ny) && c !== fin) continue;
        if (grille.has(c) && !ouv.has(grille.get(c))) continue;
        const pos = E.pos.slice(); pos[i] = c;
        // les plaques gardées s'enclenchent dès qu'on y est
        const N = { pos, gardes: grillesOuvertes(groupes, salle, new Set(pos), { gardes: O.gardes }).gardes };
        const n = nom(N);
        if (!vus.has(n)) { vus.add(n); file.push(N); }
      }
    }
  }
  return false;
}
