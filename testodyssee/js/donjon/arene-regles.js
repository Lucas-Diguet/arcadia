// testodyssee/js/donjon/arene-regles.js — règles des arènes du labo (Insecte, Poison), sans écran : lues par la partie
// (arenes.js) et par les tests (tools/test-testodyssee.mjs), qui résolvent chaque salle.
//
// Chaque case spéciale du plan est un objet de def.objets (presque tous `sol: true`) dont le type dit ce qu'elle fait :
//   fourmis   colonne de fourmis (lettre = colonne) : on y avance tout seul ; les pots de phéromones inversent son sens
//   pot       pot de phéromones (inverse : colonnes)            puits / cocon : un cocon poussé avec Force bouche le puits
//   eboulis   galerie qui s'effondre derrière soi               vide : le vide sous la toile (on y tombe en glissant)
//   fil       fil tendu tant que le levier `levier` vaut `quand` (sinon : du vide)
//   rosee     fil couvert de rosée : on glisse                  noeud : nœud collant (arrête la glissade) ;
//             (rosee et noeud peuvent dépendre d'un levier : `levier`, `quand` ; sinon, l'autre)
//   traction  fil de traction : tire vers la case `vers`        araignee : repaire de l'araignée
//   levier    levier (deux positions)                           jour : levier du jour et de la nuit
//   source    lumière du jour (dir) ; luciole : lumière de nuit ; fleur : fleur-miroir (base « / » ou « \ »), on la tourne
//   chrysalide  éclot quand la lumière la touche               papillons : posés le jour (bloquent tout), envolés la nuit
//   haie      s'ouvre quand toutes les chrysalides ont éclos   remise : remet la salle comme au début
//   douche    douche du sas (couleur)                           sas : porte du sas, ouverte par la bonne suite de douches
//   vase / profonde / lys / bulles / zone / vanne : le marais toxique (voir cout)
export const cle = (x, y) => x + ',' + y;
export const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export const OPPOSE = { up: 'down', down: 'up', left: 'right', right: 'left' };
const versDir = (dx, dy) => (dx === 1 ? 'right' : dx === -1 ? 'left' : dy === 1 ? 'down' : 'up');

/** cases du plan par type d'objet : { type: [{ c, x, y, o }] } */
export function casesParType(def, P) {
  const out = {};
  for (const [c, l] of Object.entries(P.objets)) {
    const o = def.objets[c]; if (!o?.type) continue;
    for (const [x, y] of l) (out[o.type] ||= []).push({ c, x, y, o });
  }
  return out;
}

/**
 * une colonne de fourmis : ses cases mises bout à bout. Sens normal depuis le bout qui vient en premier à la lecture
 * (en haut, puis à gauche). Renvoie { chemin, normal: Map cle → dir, inverse: Map cle → dir }.
 */
export function colonne(cases) {
  const S = new Set(cases.map(([x, y]) => cle(x, y)));
  const voisins = ([x, y]) => Object.values(DIRS).map(([dx, dy]) => [x + dx, y + dy]).filter(([a, b]) => S.has(cle(a, b)));
  const bouts = cases.filter((p) => voisins(p).length <= 1).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  const chemin = [bouts[0] || cases[0]], vus = new Set([cle(...chemin[0])]);
  for (;;) { const n = voisins(chemin[chemin.length - 1]).find(([a, b]) => !vus.has(cle(a, b))); if (!n) break; chemin.push(n); vus.add(cle(...n)); }
  if (chemin.length !== cases.length) throw new Error('colonne de fourmis en fourche');
  const normal = new Map(), inverse = new Map(), n = chemin.length;
  const pas = (a, b) => versDir(b[0] - a[0], b[1] - a[1]);
  chemin.forEach((p, k) => {
    normal.set(cle(...p), k < n - 1 ? pas(p, chemin[k + 1]) : n > 1 ? pas(chemin[k - 1], p) : 'down');
    inverse.set(cle(...p), k > 0 ? pas(p, chemin[k - 1]) : n > 1 ? pas(chemin[1], p) : 'up');
  });
  return { chemin, normal, inverse };
}
/** les colonnes de la salle : { lettre: colonne } */
export function colonnes(def, P) {
  const out = {};
  for (const q of casesParType(def, P).fourmis || []) (out[q.c] ||= []).push([q.x, q.y]);
  return Object.fromEntries(Object.entries(out).map(([k, l]) => [k, colonne(l)]));
}

/** état de départ d'une salle */
export function etatInitial(salle) {
  return { inverses: [...(salle.inverses || [])], leviers: {}, jour: true, fleurs: {}, eclos: [], combles: [], effondre: [], vannes: {}, suite: [] };
}
/** pot de phéromones : chaque colonne qu'il touche change de sens */
export function presserPot(etat, o) {
  const s = new Set(etat.inverses);
  for (const k of o.inverse) if (s.has(k)) s.delete(k); else s.add(k);
  etat.inverses = [...s].sort();
}
/** sens d'une case de fourmis */
export const sensFourmi = (cols, etat, c, x, y) => (etat.inverses.includes(c) ? cols[c].inverse : cols[c].normal).get(cle(x, y));

/** un fil, une rosée ou un nœud lié à un levier : présent, ou de l'autre sorte ? */
export const actif = (o, etat) => o.levier == null || (etat.leviers[o.levier] || 0) === (o.quand || 0);
/** sorte de la case sous la toile : 'fil' | 'rosee' | 'noeud' | 'vide' | 'traction' | null (case ordinaire) */
export function sorteToile(o, etat) {
  if (!o) return null;
  if (o.type === 'vide') return 'vide';
  if (o.type === 'fil') return actif(o, etat) ? 'fil' : 'vide';
  if (o.type === 'rosee') return actif(o, etat) ? 'rosee' : 'noeud';
  if (o.type === 'noeud') return actif(o, etat) ? 'noeud' : 'rosee';
  if (o.type === 'traction' || o.type === 'araignee') return o.type === 'araignee' ? 'fil' : 'traction';
  return null;
}

/** sens d'une fleur-miroir : sa base, tournée d'un quart de tour à chaque fois qu'on la touche */
export const sensFleur = (o, etat, k) => ((etat.fleurs[k] || 0) % 2 ? (o.base === '/' ? '\\' : '/') : o.base);
const renvoyer = (s, dx, dy) => (s === '/' ? [-dy, -dx] : [dy, dx]);
/**
 * la lumière de la salle : chaque source active (le soleil le jour, les lucioles la nuit) envoie un rayon qui
 * rebondit sur les fleurs-miroirs. bloque(x, y) : obstacle. Renvoie { traits: [[[x, y]…]…], touchees: Set de cles }.
 */
export function lumiere(def, P, etat, bloque) {
  const T = casesParType(def, P), fleurs = new Map(), chrys = new Set();
  for (const q of T.fleur || []) fleurs.set(cle(q.x, q.y), sensFleur(q.o, etat, cle(q.x, q.y)));
  for (const q of T.chrysalide || []) if (!etat.eclos.includes(cle(q.x, q.y))) chrys.add(cle(q.x, q.y));
  const traits = [], touchees = new Set();
  for (const q of [...(T.source || []), ...(T.luciole || [])]) {
    if ((q.o.type === 'source') !== !!etat.jour) continue;
    let [dx, dy] = DIRS[q.o.dir], x = q.x, y = q.y; const pts = [[x, y]], vus = new Set();
    for (let k = 0; k < 300; k++) {
      x += dx; y += dy;
      const c = cle(x, y), e = c + dx + dy; if (vus.has(e)) break; vus.add(e);
      if (chrys.has(c)) { touchees.add(c); pts.push([x, y]); break; }
      const f = fleurs.get(c);
      if (f) { pts.push([x, y]); [dx, dy] = renvoyer(f, dx, dy); continue; }
      if (bloque(x, y)) { pts.push([x - dx * 0.5, y - dy * 0.5]); break; }
    }
    traits.push(pts);
  }
  return { traits, touchees };
}

/* ---------------- le marais ---------------- */
export const SOUFFLE = 12;
/** sorte d'une case du marais (une zone change avec sa vanne) : 'pierre' | 'vase' | 'profonde' | 'lys' | 'bulles' | null */
export function sorteMarais(o, etat) {
  if (!o) return null;
  if (o.type === 'zone') return etat.vannes[o.vanne] ? o.ouverte : o.fermee;
  return { vase: 'vase', profonde: 'profonde', lys: 'lys', bulles: 'bulles', pierre: 'pierre' }[o.type] || null;
}
/** souffle perdu en entrant sur la case (les bulles qui crachent coûtent 3, la traînée toxique 2 de plus) */
export function cout(sorte, { crache = false, toxique = false } = {}) {
  const base = sorte === 'vase' ? 1 : sorte === 'profonde' ? 2 : sorte === 'bulles' ? (crache ? 3 : 1) : 0;
  return base + (toxique ? 2 : 0);
}

/* ---------------- le sas ---------------- */
/** une douche de plus ; renvoie 'bon' (la suite est complète et juste), 'faux' (remise à zéro) ou 'suite' */
export function douche(etat, couleur, solution) {
  if (etat.suite[etat.suite.length - 1] === couleur) return 'suite';
  etat.suite.push(couleur);
  if (etat.suite.length < solution.length) return 'suite';
  const ok = etat.suite.join() === solution.join();
  etat.suite = [];
  return ok ? 'bon' : 'faux';
}
