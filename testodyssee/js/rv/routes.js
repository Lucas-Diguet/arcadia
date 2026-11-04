// testodyssee/js/rv/routes.js — les Routes Victoire des jeux d'origine, recopiées case par case (rv/donnees.js),
// bâties en grottes d'Odyssée : chacune seule, puis toutes à la suite (la fusion). Sans DOM.
import { RV } from './donnees.js';
import { TEXTES, TUTEUR } from './textes.js';
import { GameMap } from '../../../odyssee/js/world/mapgen.js';
import { T } from '../../../odyssee/js/world/tiles.js';
import { trainerNpc } from '../../../odyssee/js/world/region.js';
import { MOVES } from '../../../odyssee/js/data/moves.js';
import { ITEMS } from '../../../odyssee/js/core/items.js';
import { refreshStats } from '../../../odyssee/js/core/mon.js';

// dans l'ordre de la fusion (HeartGold et Platine viendront s'y ajouter)
export const ROUTES = ['vf', 'em'];
// la case par où l'on entre dans chaque route ; les autres sorties mènent à la Ligue
export const ENTREES = { vf: ['VictoryRoad_1F', 11, 20], em: ['VictoryRoad_1F', 15, 40] };
export const FUSION = 'rv:fusion';

const SOL = { '#': T.CAVEWALL, '.': T.CAVE, n: T.CAVE, '=': T.BRIDGE, '~': T.WATER, '|': T.WATER, v: T.LEDGE, '<': T.LEDGE_W, '>': T.LEDGE_E };
const k = (x, y) => `${x},${y}`;
export const nomEtage = (id) => id.replace('VictoryRoad_', '').replace(/^B(\d)F$/, 'SS$1');
export const idCarte = (pre, etage) => `${pre}:${etage}`;
/** hauteur de la case (0 : passage, 15 : pont, sinon le niveau du plateau) */
export const hauteur = (m, x, y) => (m.in(x, y) ? m.elev[y * m.w + x] : 0);
/** la génération 3 : on ne passe d'un niveau à l'autre que par une case de passage (0) ou un pont (15) */
export function changeNiveau(z, h) { return !!z && !!h && h !== 15 && h !== z; }
/** case fermée au nord : on n'en sort pas vers le haut, on n'y entre pas par le haut */
export function fermee(m, x, y, d, tx, ty) { return (d === 'up' && m.nord.has(k(x, y))) || (d === 'down' && m.nord.has(k(tx, ty))); }

/** les cartes de toutes les routes, seules et en fusion ; renvoie les lieux où apparaître */
export function construireRoutes(maps) {
  const lieux = [];
  for (const r of ROUTES) {
    construireRoute(maps, r, `rv:${r}`, null);
    const [e, x, y] = ENTREES[r];
    lieux.push({ nom: `Route Victoire (${RV[r].nom})`, note: 'plan d\'origine', map: idCarte(`rv:${r}`, e), x, y, dir: 'up', equipe: 'fin' });
  }
  ROUTES.forEach((r, i) => construireRoute(maps, r, `${FUSION}:${r}`, ROUTES[i + 1] ? `${FUSION}:${ROUTES[i + 1]}` : null, i));
  const [e, x, y] = ENTREES[ROUTES[0]];
  lieux.push({ nom: 'Route Victoire (fusion)', note: ROUTES.map((r) => RV[r].nom).join(' puis '), map: idCarte(`${FUSION}:${ROUTES[0]}`, e), x, y, dir: 'up', equipe: 'fin' });
  return lieux;
}

function construireRoute(maps, r, pre, suite, rang) {
  const R = RV[r], fusion = pre.startsWith(FUSION);
  for (const E of R.etages) {
    const id = idCarte(pre, E.id);
    const nom = fusion ? `Route Victoire — ${R.nom} ${nomEtage(E.id)}` : `Route Victoire (${R.nom}) ${nomEtage(E.id)}`;
    const m = new GameMap(id, E.w, E.h, { outdoor: false, fill: T.CAVEWALL, floor: 'cave', music: 'cave', name: nom, battleBg: 'cave' });
    m.rv = { route: r, pre, etage: E.id, suite, fusion, rang, boutons: E.boutons, trous: E.trous, cascades: new Set() };
    m.elev = new Uint8Array(E.w * E.h); m.nord = new Set();
    for (let y = 0; y < E.h; y++) for (let x = 0; x < E.w; x++) {
      const c = E.sol[y][x];
      m.set(x, y, SOL[c] ?? T.CAVEWALL);
      m.elev[y * E.w + x] = parseInt(E.haut[y][x], 16);
      if (c === 'n') m.nord.add(k(x, y));
      if (c === '|') m.rv.cascades.add(k(x, y));
    }
    // barrières tant que le bouton n'est pas enfoncé, rochers, rochers fissurés
    for (const b of E.boutons) for (const [x, y] of b.ouvre) m.set(x, y, T.CAVEWALL);
    for (const [x, y, cache] of E.rochers) if (!cache) m.set(x, y, T.BOULDER);
    for (const [x, y] of E.roches) m.set(x, y, T.SMASH);
    // échelles et trous : on arrive là où le jeu d'origine nous pose
    for (const L of [...E.liens, ...E.trous]) m.warp(L.x, L.y, { map: idCarte(pre, L.vers), x: L.vx, y: L.vy, dir: 'down', step: true, z: L.z });
    // sorties : la suivante dans la fusion, sinon la fin de la route
    const [ee, ex, ey] = ENTREES[r];
    for (const S of E.sorties) {
      if (E.id === ee && S.x === ex && S.y === ey) continue;
      m.object(S.x, S.y, { type: 'rv-sortie', onStep: (api) => sortie(api, m) });
    }
    for (const [x, y, item] of E.objets) m.item(x, y, item, 1, `${id}:${x},${y}`);
    for (const [x, y, item] of E.caches) m.object(x, y, { type: 'rv-cache', use: (api) => objetCache(api, `${id}:c${x},${y}`, item) });
    if (E.sauvages) m.encounter = E.sauvages;
    if (E.surf) { m.surfEnc = E.surf; m.surf = true; }
    // dresseurs, avec leurs équipes et leurs attaques d'origine (les duos se battent comme un seul dresseur)
    const duos = {};
    for (const D of E.dresseurs) {
      const tx = TEXTES[r]?.[D.texte] || {}, nid = `${id}:${D.texte}`;
      const o = { id: nid, ow: D.ow, sight: D.vue, items: D.items, intro: tx.intro, lose: tx.perd, after: tx.apres, prize: 60, ai: 'smart' };
      if (D.duo) (duos[D.id] = duos[D.id] || []).push(nid);
      const n = trainerNpc(m, D.x, D.y, D.dir, D.cls, D.nom, D.equipe, o);
      n.trainer.rv = true;
      if (D.duo) n.onWin = (api) => { for (const q of duos[D.id]) api.f['T:' + q] = true; api.game.refreshNpcs(); };
    }
    for (const P of E.pnj) m.npc({ id: `${id}:${P.id}`, x: P.x, y: P.y, dir: P.dir, sprite: P.ow, name: 'Maître des capacités', talk: (api) => tuteur(api, `${id}:${P.id}`, P.tuteur) });
    for (const Dc of E.declencheurs || []) poserDeclencheur(m, id, r, Dc);
    maps[id] = m;
  }
}

async function objetCache(api, id, item) {
  if (api.f['I:' + id]) return;
  api.f['I:' + id] = true;
  await api.give(item);
}

async function sortie(api, m) {
  const g = api.game, R = RV[m.rv.route];
  if (m.rv.suite) {
    const s = m.rv.suite.split(':').pop(), [e, x, y] = ENTREES[s];
    await api.say(`Tu as traversé la Route Victoire de ${R.nom} ! Plus loin, la grotte continue...`);
    await g.warp({ map: idCarte(m.rv.suite, e), x, y, dir: 'up' }, 'exit');
    return true;
  }
  await api.say(m.rv.fusion ? 'Tu as traversé toutes les Routes Victoire ! La Ligue Pokémon n\'est plus très loin.' : `Tu as traversé la Route Victoire de ${R.nom} !`);
  if (await api.yesNo('Revenir à l\'entrée de la route ?')) {
    const pre = m.rv.fusion ? `${FUSION}:${ROUTES[0]}` : m.rv.pre, [e, x, y] = ENTREES[pre.split(':').pop()];
    await g.warp({ map: idCarte(pre, e), x, y, dir: 'up' }, 'exit');
  }
  return true;
}

async function tuteur(api, id, attaque) {
  const g = api.game;
  if (api.f['TU:' + id]) { await api.say(TUTEUR.apres, 'Maître des capacités'); return; }
  await api.say(TUTEUR.avant, 'Maître des capacités');
  if (!(await api.yesNo('Apprendre Damoclès à un Pokémon ?'))) return;
  if (await g.rvApprendre?.(attaque)) api.f['TU:' + id] = true;
}

/** Timmy (Émeraude) : il attend l'entrée du 1F et défie le joueur quand il passe */
function poserDeclencheur(m, id, r, Dc) {
  const D = Dc.dresseur, tx = TEXTES[r]?.[D.texte] || {}, fid = `${id}:${D.texte}`;
  Dc.cases.forEach(([x, y], i) => m.object(x, y, {
    type: 'rv-declencheur',
    onStep: async (api) => {
      if (api.f['T:' + fid]) return false;
      const res = await api.fight({ cls: D.cls, name: D.nom, team: D.equipe, ow: D.ow, bs: D.ow, items: D.items, intro: tx.intro, lose: tx.perd, rv: true, prize: 60 });
      if (res !== 'win') return true;
      api.f['T:' + fid] = true;
      const [ax, ay] = Dc.arrivee[i]; api.f['RVP:' + fid] = `${ax},${ay}`;
      api.game.refreshNpcs();
      await api.say(tx.apres);
      return true;
    },
  }));
  // une fois battu, il reste là où il s'est arrêté
  Dc.arrivee.forEach(([x, y]) => m.npc({ id: `${fid}:${x},${y}`, x, y, dir: 'down', sprite: D.ow, name: D.nom, text: tx.apres, when: (f) => f['RVP:' + fid] === `${x},${y}` }));
}

/** équipes des dresseurs d'origine : attaques, objet tenu et valeurs cachées (le reste vient d'Odyssée) */
export function equipeOrigine(team, party) {
  team.forEach(([, , moves, item, iv], i) => {
    const m = party[i]; if (!m) return;
    if (moves?.length) {
      const ids = moves.map((c) => c && Object.values(MOVES).find((q) => q.key === c)?.id).filter(Boolean);
      // attaque qu'Odyssée n'a pas (null) : remplacée par une de celles qu'il apprend au niveau
      for (const x of m.moves) if (ids.length < moves.length && !ids.includes(x.id)) ids.push(x.id);
      m.moves = ids.slice(0, 4).map((id) => ({ id, pp: MOVES[id].pp }));
    }
    if (item && ITEMS[item]?.hold) m.item = item;
    if (iv != null) { m.iv = Array(6).fill(iv); refreshStats(m, true); }
  });
}
