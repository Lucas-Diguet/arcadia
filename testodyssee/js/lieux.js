// testodyssee/js/lieux.js — les endroits où l'on peut apparaître : les lieux du labo (donjons en test),
// puis ceux d'Odyssée (villes, routes, grottes et lieux annexes), pour tester comme si on était dans le vrai jeu.
import { T, walkable } from '../../odyssee/js/world/tiles.js';
import { nearestWalkable } from '../../odyssee/js/world/mapgen.js';
import { texteJoueurs } from './donjon/plan.js';
import { ILE, ARRIVEE } from './ile/modele.js';
import { construireMont } from './mont/mont.js';
import { construireMusee } from './musee.js';
import { construireHorloge } from './horloge.js';
import { construireNiveau1 } from './horloge-n1.js';
import { construireNiveauM1 } from './horloge-m1.js';
import { construireNiveau2 } from './horloge-n2.js';
import { construireFarWest } from './farwest.js';

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
    // devant l'entrée quand le donjon a un extérieur, sinon directement à l'intérieur
    const m = world.maps[d.carte], E = m.donjon.exterieur;
    const note = [d.niveau, texteJoueurs(d)].filter(Boolean).join(' · ');
    if (E) { const [x, y] = E.arrivee || [E.porte[0], E.porte[1] + 2]; out.labo.push({ nom: d.nom, note, map: E.carte.id, x, y, dir: 'up', equipe: d.equipe }); }
    else { const [x, y] = m.donjon.plan.depart; out.labo.push({ nom: d.nom, note, map: d.carte, x, y, dir: 'up', equipe: d.equipe }); }
  }
  // l'île privée : chacun la sienne, gardée dans ce navigateur
  out.labo.push({ nom: 'Mon île', note: 'île privée, à construire', map: ILE, x: ARRIVEE[0], y: ARRIVEE[1], dir: 'up', equipe: 'milieu', ile: true });
  // le Mont Givrécime : dix salles à gravir, dedans et dehors (aventure solo)
  out.labo.push(world.montLieu ||= construireMont(world.maps));
  // le Musée des Dunes, ajouté aux Dunes d'Ocre : la scène du sceptre (Tombeau du Roi Sans Nom)
  if (world.museeLieu === undefined) world.museeLieu = construireMusee(world);
  if (world.museeLieu) out.labo.push(world.museeLieu);
  // prototype : la Salle de l'Horloge (aiguilles géantes, vis)
  if (!world.horlogeLieu) { world.horlogeLieu = construireHorloge(world); construireNiveau1(world); construireNiveauM1(world); construireNiveau2(world, world.maps['labo:horloge'].horloge); }
  out.labo.push(world.horlogeLieu);
  // prototype : la ville du Far West et son stand de tir
  out.labo.push(world.farwestLieu ||= construireFarWest(world));
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
    if (m.id === 'monde' || m.donjon || m.mont || !(m.floor === 'cave' || m.outdoor)) continue;
    const w = [...m.warps.keys()][0];
    const [wx, wy] = w ? w.split(',').map(Number) : [m.w >> 1, m.h >> 1];
    const [x, y] = pres(m, wx, wy);
    out.grottes.push({ nom: m.name, map: m.id, x, y, dir: 'down' });
  }
  return out;
}
