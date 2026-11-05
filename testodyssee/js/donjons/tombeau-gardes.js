// testodyssee/js/donjons/tombeau-gardes.js — les moines gardiens du Tombeau : leurs rondes et leur regard.
// Sans DOM : le jeu (donjon/tombeau.js), le générateur des salles (tools/tombeau-gardes.mjs) et les tests s'en servent.
//
// Une ronde est une liste de points [x, y, ...regards] (coordonnées du plan). Le moine va d'un point au suivant en ligne
// droite, une case par PAS secondes, et revient au premier après le dernier. À un point qui a des regards, il s'arrête
// et regarde dans chaque direction pendant REGARD pas. Un moine qui ne bouge pas a une ronde d'un seul point.
// Tout se calcule à partir de l'heure : chaque écran voit les moines au même endroit.

export const PAS = 0.5, REGARD = 4;
const DV = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
const VERS = (dx, dy) => (dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up');

/** les positions successives d'une ronde, une par pas : { x, y, dir } */
export function ronde(points) {
  const out = [], n = points.length;
  for (let i = 0; i < n; i++) {
    const [x, y, ...regards] = points[i];
    for (const r of regards) for (let k = 0; k < REGARD; k++) out.push({ x, y, dir: r });
    if (n === 1) break;
    const [nx, ny] = points[(i + 1) % n], dx = Math.sign(nx - x), dy = Math.sign(ny - y), dir = VERS(dx, dy);
    if (dx && dy) throw new Error(`ronde : ${x},${y} → ${nx},${ny} n'est pas en ligne droite`);
    for (let a = x + dx, b = y + dy; ; a += dx, b += dy) { out.push({ x: a, y: b, dir }); if (a === nx && b === ny) break; }
  }
  return out;
}

/** où est le moine au pas t (un entier : le nombre de PAS écoulés) */
export function auPas(frames, t, decal = 0) { return frames[(((t + decal) % frames.length) + frames.length) % frames.length]; }

/** le regard d'un moine : devant lui, une lanterne qui éclaire droit devant, puis s'élargit d'une case de chaque côté à partir
 *  de la troisième ; les murs (solide(x, y)) l'arrêtent. Liste de cases [x, y]. */
export function vueGarde(solide, x, y, dir, portee = 5) {
  const [dx, dy] = DV[dir], px = -dy, py = dx, out = [], vu = new Set();
  for (let k = 1; k <= portee; k++) {
    const cx = x + dx * k, cy = y + dy * k;
    if (solide(cx, cy)) break;
    out.push([cx, cy]); vu.add(`0,${k}`);
    if (k < 3) continue;
    for (const l of [-1, 1]) {
      const ax = cx + px * l, ay = cy + py * l;
      if (solide(ax, ay) || (k > 3 && !vu.has(`${l},${k - 1}`))) continue;
      out.push([ax, ay]); vu.add(`${l},${k}`);
    }
  }
  return out;
}

/** BFS dans le temps : peut-on aller de dep à une case qui vérifie but(x, y) sans jamais être vu ?
 *  gardes : [{ frames, decal, portee }] ; pas : pas du joueur par pas de moine (2 : un joueur qui marche).
 *  Le joueur peut attendre sur place. Renvoie { x, y, t } (t en pas de moine) ou null. */
export function sansEtreVu({ libre, solide, gardes, dep, but, t0 = 0, horizon = 900, pas = 2 }) {
  const vus = (t) => {
    const s = new Set();
    for (const g of gardes) { const f = auPas(g.frames, t, g.decal); s.add(`${f.x},${f.y}`); for (const [a, b] of vueGarde(solide, f.x, f.y, f.dir, g.portee)) s.add(`${a},${b}`); }
    return s;
  };
  let couche = new Set([`${dep[0]},${dep[1]}`]);
  for (let t = t0; t < t0 + horizon; t++) {
    const V = vus(t), V2 = vus(t + 1);
    for (const c of couche) if (V.has(c)) couche.delete(c);
    for (const c of couche) { const [x, y] = c.split(',').map(Number); if (but(x, y)) return { x, y, t }; }
    // pas sous-pas : le joueur avance de « pas » cases pendant que les moines restent sur la case t
    for (let i = 0; i < pas; i++) {
      const n = new Set(couche);
      for (const c of couche) {
        const [x, y] = c.split(',').map(Number);
        for (const [ex, ey] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = `${x + ex},${y + ey}`; if (!n.has(k) && libre(x + ex, y + ey) && !V.has(k) && !V2.has(k)) n.add(k); }
      }
      couche = n;
    }
    if (!couche.size) return null;
  }
  return null;
}
