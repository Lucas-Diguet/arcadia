// testodyssee/js/donjon/plan.js — un donjon dessiné en texte devient une carte d'Odyssée (sans DOM).
// Une lettre = une case. Légende commune ci-dessous ; chaque donjon ajoute ses PNJ et son décor (def.pnj, def.decor).
import { T } from '../../../odyssee/js/world/tiles.js';
import { GameMap } from '../../../odyssee/js/world/mapgen.js';

export const LEGENDE = {
  '#': 'mur',
  '.': 'sol',
  'S': 'arrivée des joueurs',
  'o': 'dalle à tenir',
  '0-9': 'porte scellée (s\'ouvre quand la salle qui la porte est terminée)',
};
// décor par défaut des objets du plan (def.objets)
const DECOR_OBJET = { ascenseur: 'console' };

const PORTE = 'caverock';

/** lit le plan : grille, portes, dalles, PNJ, salles (régions séparées par les portes) */
export function lirePlan(def) {
  const rows = def.plan.map((r) => r.replace(/\s+$/, ''));
  const w = Math.max(...rows.map((r) => r.length)) + 2, h = rows.length + 2;
  const at = (x, y) => (y >= 1 && y <= rows.length ? rows[y - 1][x - 1] ?? '#' : '#') || '#';
  const out = { w, h, depart: null, portes: {}, dalles: [], pnj: {}, decor: [], sol: [], objets: {} };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = x === 0 || x === w - 1 ? '#' : at(x, y);
    if (c === '#' || c === ' ') continue;
    out.sol.push([x, y]);
    if (c === 'S') out.depart = [x, y];
    else if (c === 'o') out.dalles.push([x, y]);
    else if (/[0-9]/.test(c)) (out.portes[c] ||= []).push([x, y]);
    else if (def.pnj?.[c]) (out.pnj[c] ||= []).push([x, y]);
    else if (def.objets?.[c]) (out.objets[c] ||= []).push([x, y]);
    else if (def.decor?.[c]) out.decor.push([def.decor[c], x, y]);
    else if (c !== '.') throw new Error(`Plan de ${def.id} : lettre inconnue « ${c} » (ligne ${y}, colonne ${x})`);
  }
  if (!out.depart) throw new Error(`Plan de ${def.id} : il manque l'arrivée S`);
  for (const [k, l] of Object.entries(out.pnj)) if (l.length > 1) throw new Error(`Plan de ${def.id} : le PNJ « ${k} » apparaît ${l.length} fois`);
  return out;
}

/** construit la carte du donjon ; les portes sont posées fermées */
export function construireCarte(def) {
  const P = lirePlan(def);
  const m = new GameMap(def.carte, P.w, P.h, { outdoor: false, fill: T.CAVEWALL, floor: 'cave', music: def.musique || 'cave', name: def.nom, battleBg: 'cave' });
  m.edge = T.CAVEWALL;
  for (const [x, y] of P.sol) m.set(x, y, T.CAVE);
  for (const [k, x, y] of P.decor) m.prop(k, x, y);
  for (const [c, l] of Object.entries(P.objets)) {
    const o = def.objets[c];
    for (const [x, y] of l) {
      if (o.type === 'panneau') m.sign(x, y, o.texte || '...');
      else m.prop(o.decor || DECOR_OBJET[o.type] || 'statue', x, y);
    }
  }
  for (const [x, y] of P.dalles) m.deco.push({ k: 'carpet', x, y });
  for (const l of Object.values(P.portes)) for (const [x, y] of l) fermer(m, x, y);
  m.donjon = { def, plan: P };
  // une zone par salle : le bandeau affiche son nom en y entrant
  for (const s of def.salles) {
    const r = regionDe(m, P, s);
    if (!r.length) continue;
    const xs = r.map((p) => p[0]), ys = r.map((p) => p[1]);
    m.zone(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), { name: s.nom, music: s.musique || def.musique || 'cave' });
  }
  return m;
}

/** cases d'une salle : tout ce qu'on atteint depuis son repère sans passer une porte */
export function regionDe(m, P, salle) {
  const rep = repere(P, salle);
  if (!rep) return [];
  const portes = new Set(Object.values(P.portes).flat().map(([x, y]) => x + ',' + y));
  const sol = new Set(P.sol.map(([x, y]) => x + ',' + y));
  const seen = new Set([rep.join(',')]), q = [rep], out = [];
  while (q.length) {
    const [x, y] = q.pop(); out.push([x, y]);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = (x + dx) + ',' + (y + dy);
      if (seen.has(k) || portes.has(k) || !sol.has(k)) continue;
      seen.add(k); q.push([x + dx, y + dy]);
    }
  }
  return out;
}
function repere(P, salle) {
  if (salle.repere === 'S') return P.depart;
  const k = salle.repere || salle.pnj?.[0];
  if (k === 'o') return P.dalles[0];
  return k ? P.pnj[k]?.[0] : null;
}

export function fermer(m, x, y) {
  if (m.get(x, y) !== T.BLOCK) { m.set(x, y, T.CAVE); m.prop(PORTE, x, y); }
}
export function ouvrir(m, x, y) {
  if (m.get(x, y) !== T.BLOCK) return false;
  m.set(x, y, T.CAVE);
  m.under.delete(x + ',' + y);
  m.deco = m.deco.filter((d) => !(d.x === x && d.y === y));
  return true;
}

/** case libre à côté d'un objet (sous lui de préférence) : là où l'on arrive en prenant l'ascenseur */
export function aCote(m, P, c) {
  const [x, y] = P.objets[c][0];
  const sol = new Set(P.sol.map(([a, b]) => a + ',' + b));
  for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) if (sol.has((x + dx) + ',' + (y + dy)) && !P.decor.some(([, a, b]) => a === x + dx && b === y + dy)) return [x + dx, y + dy];
  return P.depart;
}
