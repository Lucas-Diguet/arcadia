// testodyssee/js/farwest.js — prototype de la ville du Far West (futur donjon) : une rue de western et, au bout, le
// stand de tir du shérif. On tire droit devant soi (touche choisie par chacun en arrivant) ; pour commencer, sur des
// cibles immobiles, posées entre des caisses et des tonneaux. Logique sans DOM ici (plan, cibles, trajet d'une balle) ;
// le jeu dans farwest-jeu.js.
import { GameMap } from '../../odyssee/js/world/mapgen.js';
import { T, walkable } from '../../odyssee/js/world/tiles.js';

export const FARWEST = 'labo:farwest';
const W = 40, H = 30;
/** le stand : son enclos (bords compris), les cibles, les obstacles */
export const STAND = { x0: 6, y0: 12, x1: 33, y1: 28, porte: [19, 12] };
export const CIBLES = [[8, 15], [14, 14], [25, 14], [31, 16], [10, 22], [19, 20], [28, 21], [16, 26], [23, 26], [31, 26]];
const CAISSES = [[12, 17], [20, 17], [26, 18], [9, 25], [30, 23]], TONNEAUX = [[15, 22], [24, 22], [11, 14]];
export const PORTEE = 12;
const cle = (x, y) => x + ',' + y;

export function construireFarWest(world) {
  const m = new GameMap(FARWEST, W, H, { outdoor: true, fill: T.ROCK, name: 'Poussière-Ville', music: 'route' });
  m.rect(2, 2, W - 3, H - 2, T.SAND, [T.ROCK]);
  // la rue : saloon, banque, prison, magasin général
  m.rect(3, 7, W - 4, 9, T.PATH);
  // bâtiments en volumes (odyssee/js/render/farwest3d.js), sans intérieur pour l'instant
  for (const [modele, x, y, w, d, name] of [['saloonFW', 3, 2, 7, 5, 'Saloon'], ['banqueFW', 12, 3, 5, 4, 'Banque'], ['maisonFW', 18, 4, 4, 3, 'Maison'],
    ['sherifFW', 24, 3, 4, 4, 'Bureau du shérif'], ['magasinFW', 30, 3, 6, 4, 'Magasin général']]) m.building('house', x, y, { modele, w, d, door: -1, name });
  for (const [x, y] of [[3, 11], [36, 11], [36, 20], [3, 24], [37, 27], [35, 14]]) m.prop('cactus', x, y);
  // le stand de tir : un enclos de barrières, une seule entrée en haut
  for (let x = STAND.x0; x <= STAND.x1; x++) for (const y of [STAND.y0, STAND.y1]) if (!(y === STAND.porte[1] && x === STAND.porte[0])) m.prop('barriere', x, y, true);
  for (let y = STAND.y0; y <= STAND.y1; y++) for (const x of [STAND.x0, STAND.x1]) m.prop('barriere', x, y, true);
  for (const [x, y] of CAISSES) m.prop('caisses', x, y, true);
  for (const [x, y] of TONNEAUX) m.prop('tonneau', x, y, true);
  for (const [x, y] of CIBLES) m.prop('cible', x, y, true);
  m.npc({ id: 'farwest:sherif', x: 17, y: 11, dir: 'down', sprite: 'garde', move: 'static', name: 'Shérif', talk: (api) => api.game.farwest?.sherif() });
  m.sign(21, 11, 'STAND DE TIR DU SHÉRIF\nDix cibles. Le plus vite possible.\nOn tire droit devant soi.');
  m.zone(0, 0, W - 1, H - 1, { name: 'Poussière-Ville', music: 'route' });
  world.maps[FARWEST] = m;
  return { nom: 'Poussière-Ville (prototype)', note: 'Far West : le stand de tir', map: FARWEST, x: 19, y: 10, dir: 'down', equipe: 'fin100' };
}

/** une balle tirée de (x, y) vers dir : les cases qu'elle traverse, jusqu'à la première cible encore debout (touche)
 *  ou au premier obstacle (arrêt) ; debout : ensemble des cibles debout ("x,y") */
export function trajet(m, x, y, [dx, dy], debout) {
  const cases = [];
  for (let i = 1; i <= PORTEE; i++) {
    const a = x + dx * i, b = y + dy * i, k = cle(a, b);
    cases.push([a, b]);
    if (debout.has(k)) return { cases, touche: [a, b] };
    if (!m.in(a, b) || !walkable(m.get(a, b))) return { cases, arret: [a, b] };
  }
  return { cases };
}
