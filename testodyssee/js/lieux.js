// testodyssee/js/lieux.js — les endroits où l'on peut apparaître : les lieux du labo (donjons en test),
// puis ceux d'Odyssée (villes, routes, grottes et lieux annexes), pour tester comme si on était dans le vrai jeu.
import { T, walkable } from '../../odyssee/js/world/tiles.js';
import { nearestWalkable } from '../../odyssee/js/world/mapgen.js';

const libre = (m, x, y) => walkable(m.get(x, y)) && ![T.DOOR, T.CAVEDOOR, T.MAT, T.STAIRS].includes(m.get(x, y)) && !m.warpAt(x, y) && !m.npcs.some((n) => n.x === x && n.y === y);

/** case libre près de (x, y) */
function pres(m, x, y) {
  for (let r = 0; r < 10; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    if (libre(m, x + dx, y + dy)) return [x + dx, y + dy];
  }
  return nearestWalkable(m, x, y);
}

export function listerLieux(world, donjons) {
  const W = world.maps.monde, out = { labo: [], villes: [], routes: [], grottes: [] };
  for (const d of donjons) {
    const m = world.maps[d.carte], [x, y] = m.donjon.plan.depart;
    out.labo.push({ nom: d.nom, note: d.niveau, map: d.carte, x, y, dir: 'up', equipe: d.equipe });
  }
  for (const t of Object.values(world.towns)) {
    const [x, y] = t.centerDoor ? pres(W, t.centerDoor[0], t.centerDoor[1] + 1) : pres(W, t.x + (t.w >> 1), t.y + (t.h >> 1));
    out.villes.push({ nom: t.name, map: 'monde', x, y, dir: 'down' });
  }
  const vus = new Set();
  for (const r of world.routes) {
    const p = r.pts[Math.floor(r.pts.length / 2)], [x, y] = pres(W, Math.round(p[0]), Math.round(p[1]));
    const nom = vus.has(r.name) ? `${r.name} (${r.id})` : r.name; vus.add(r.name);
    out.routes.push({ nom, map: 'monde', x, y, dir: 'down' });
  }
  for (const m of Object.values(world.maps)) {
    if (m.id === 'monde' || m.donjon || !(m.floor === 'cave' || m.outdoor)) continue;
    const w = [...m.warps.keys()][0];
    const [wx, wy] = w ? w.split(',').map(Number) : [m.w >> 1, m.h >> 1];
    const [x, y] = pres(m, wx, wy);
    out.grottes.push({ nom: m.name, map: m.id, x, y, dir: 'down' });
  }
  return out;
}
