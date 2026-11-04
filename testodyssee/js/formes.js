// testodyssee/js/formes.js — les formes du Temple (sans DOM) : des versions alternatives de Pokémon connus, comme les
// formes régionales. Même silhouette, mêmes statistiques, autre type : les attaques du type d'origine sont remplacées
// par des attaques du nouveau type, de même catégorie et de puissance voisine.
//
// Starters de Kanto : l'eau devient feu, le feu devient plante, la plante devient eau. Évoli du Temple évolue avec
// trois pierres qui ne servent qu'à lui. Les images (recolorées) sont dans testodyssee/img/temple/.
import { SPECIES } from '../../odyssee/js/data/species.js';
import { MOVES } from '../../odyssee/js/data/moves.js';

const id = (key) => Object.values(MOVES).find((m) => m.key === key)?.id;
/** attaques par type, de la plus faible à la plus forte (pas d'attaques propres à un Pokémon) */
const POOL = {
  fire: ['ember', 'flame-charge', 'flame-wheel', 'incinerate', 'fire-fang', 'flame-burst', 'fire-punch', 'lava-plume', 'blaze-kick', 'flamethrower', 'heat-wave', 'fire-blast', 'flare-blitz', 'overheat'],
  water: ['water-gun', 'aqua-jet', 'water-pulse', 'bubble-beam', 'razor-shell', 'waterfall', 'scald', 'muddy-water', 'aqua-tail', 'crabhammer', 'hydro-pump'],
  grass: ['mega-drain', 'vine-whip', 'razor-leaf', 'magical-leaf', 'giga-drain', 'seed-bomb', 'leaf-blade', 'energy-ball', 'solar-beam', 'wood-hammer', 'leaf-storm'],
};
/** une attaque de soutien du type, pour remplacer celles du type d'origine */
const SOUTIEN = { fire: 'will-o-wisp', water: 'withdraw', grass: 'leech-seed' };

/** l'attaque du type `t` qui ressemble le plus à l'attaque n° mid, sans reprendre une attaque déjà apprise (null : rien) */
function equivalent(mid, t, deja) {
  const m = MOVES[mid];
  if (!m.p) { const q = id(SOUTIEN[t]); return q && !deja.has(q) ? q : null; }
  const l = POOL[t].map(id).filter((q) => MOVES[q] && !deja.has(q));
  const meme = l.filter((q) => MOVES[q].c === m.c), c = meme.length ? meme : l;
  if (!c.length) return null;
  return c.reduce((a, q) => (Math.abs(MOVES[q].p - m.p) < Math.abs(MOVES[a].p - m.p) ? q : a));
}
/** une forme du Temple : copie de SPECIES[base], au type `types` ; le premier type d'origine change d'élément */
export function forme(base, o) {
  const S = SPECIES[base], vieux = S.t[0], neuf = o.t[0];
  const ls = [], deja = new Set();
  for (const [lvl, mid] of [...S.ls].sort((a, b) => a[0] - b[0])) {
    const n = vieux !== neuf && POOL[neuf] && MOVES[mid]?.t === vieux ? equivalent(mid, neuf, deja) : mid;
    if (n == null || (deja.has(n) && n !== mid)) continue;
    if (!ls.some(([l, q]) => l === lvl && q === n)) { ls.push([lvl, n]); deja.add(n); }
  }
  for (const [lvl, key] of o.plus || []) { const q = id(key); if (q && !ls.some(([, x]) => x === q)) ls.push([lvl, q]); }
  ls.sort((a, b) => a[0] - b[0]);
  const out = { ...S, n: o.n, k: o.k, t: o.t, ls, dex: o.dex, genus: o.genus || S.genus, ev: o.ev, base, img: o.img };
  if (!o.ev) delete out.ev;
  return out;
}

export const TEMPLE = {
  carapuce: 2010, carabaffe: 2011, tortank: 2012,
  salameche: 2013, reptincel: 2014, dracaufeu: 2015,
  bulbizarre: 2016, herbizarre: 2017, florizarre: 2018,
  evoli: 2019, pyroli: 2020, aquali: 2021, voltali: 2022,
  arceus: 2023,
};
const T = TEMPLE, du = (n) => `${n} du Temple`;
/** les espèces, construites à la demande (les tables d'Odyssée doivent être chargées) */
export function especesTemple() {
  const f = (base, k, o) => [T[k], forme(base, { k: 'temple-' + k, img: 'temple/temple-' + k, ...o })];
  return Object.fromEntries([
    f(7, 'carapuce', { n: du('Carapuce'), t: ['fire'], ev: [{ to: T.carabaffe, lvl: 16 }], dex: 'Né près des sources chaudes du Temple. Sa carapace, noire comme le charbon, garde la chaleur pendant des jours.' }),
    f(8, 'carabaffe', { n: du('Carabaffe'), t: ['fire'], ev: [{ to: T.tortank, lvl: 36 }], dex: 'Sa queue fume quand il est en colère. On dit qu\'elle porte bonheur aux forgerons.' }),
    f(9, 'tortank', { n: du('Tortank'), t: ['fire', 'steel'], plus: [[1, 'flash-cannon'], [1, 'iron-defense']], dex: 'Des canons de métal brûlant sortent de sa carapace. Il ne s\'en sert que pour protéger le Temple.' }),
    f(4, 'salameche', { n: du('Salamèche'), t: ['grass'], ev: [{ to: T.reptincel, lvl: 16 }], dex: 'La feuille au bout de sa queue pousse avec lui. Si elle fane, c\'est qu\'il est malade.' }),
    f(5, 'reptincel', { n: du('Reptincel'), t: ['grass'], ev: [{ to: T.dracaufeu, lvl: 36 }], dex: 'Il fait claquer sa queue comme un fouet de lianes. Il ne supporte pas qu\'on le prenne pour un simple lézard.' }),
    f(6, 'dracaufeu', { n: du('Dracaufeu'), t: ['grass', 'flying'], dex: 'Il plane au-dessus des forêts. Là où il se pose, l\'herbe repousse.' }),
    f(1, 'bulbizarre', { n: du('Bulbizarre'), t: ['water'], ev: [{ to: T.herbizarre, lvl: 16 }], dex: 'Le bulbe sur son dos est une poche d\'eau claire. Il s\'y abrite du soleil.' }),
    f(2, 'herbizarre', { n: du('Herbizarre'), t: ['water'], ev: [{ to: T.florizarre, lvl: 32 }], dex: 'Sa poche d\'eau gonfle avant d\'éclore. Il cherche alors les rivières les plus fraîches.' }),
    f(3, 'florizarre', { n: du('Florizarre'), t: ['water', 'poison'], dex: 'La fleur sur son dos boit la pluie. Son parfum calme les eaux agitées.' }),
    f(133, 'evoli', { n: du('Évoli'), t: ['normal'], ev: [{ to: T.pyroli, item: 'pierre-feu-temple' }, { to: T.aquali, item: 'pierre-eau-temple' }, { to: T.voltali, item: 'pierre-plante-temple' }], dex: 'Un Évoli né au cœur du Temple. Les pierres ordinaires ne lui font rien : seules celles du Temple le changent.' }),
    f(136, 'pyroli', { n: du('Pyroli'), t: ['grass'], dex: 'Une forme d\'Évoli que l\'on ne voit qu\'au Temple des Éléments.' }),
    f(134, 'aquali', { n: du('Aquali'), t: ['fire'], dex: 'Une forme d\'Évoli que l\'on ne voit qu\'au Temple des Éléments.' }),
    f(135, 'voltali', { n: du('Voltali'), t: ['water'], dex: 'Une forme d\'Évoli que l\'on ne voit qu\'au Temple des Éléments.' }),
    f(493, 'arceus', { n: du('Arceus'), t: ['fire', 'water', 'grass'], plus: [[1, 'flamethrower'], [1, 'muddy-water'], [1, 'energy-ball']], dex: 'Le gardien du Temple des Éléments. Il porte en lui le feu, l\'eau et la plante.' }),
  ]);
}
/** les trois starters de la table, dans l'ordre des Poké Balls */
export const STARTERS_TEMPLE = [T.carapuce, T.salameche, T.bulbizarre];
