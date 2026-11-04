// testodyssee/js/formes.js — les formes du Temple (sans DOM) : des versions alternatives de Pokémon connus, comme les
// formes régionales. Même silhouette, mêmes statistiques, autre type : les attaques du type d'origine sont remplacées
// par des attaques du nouveau type, de même catégorie et de puissance voisine.
//
// Starters de Kanto : l'eau devient feu, le feu devient plante, la plante devient eau ; pas encore d'évolutions.
// Leurs images (testodyssee/img/temple/) sont retouchées à la main : autre matière, autres formes.
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

export const TEMPLE = { carapuce: 2010, salameche: 2013, bulbizarre: 2016, arceus: 2023 };
const T = TEMPLE, du = (n) => `${n} du Temple`;
/** les espèces, construites à la demande (les tables d'Odyssée doivent être chargées) */
export function especesTemple() {
  const f = (base, k, o) => [T[k], forme(base, { k: 'temple-' + k, img: 'temple/temple-' + k, ...o })];
  return Object.fromEntries([
    f(7, 'carapuce', { n: du('Carapuce'), t: ['fire'], dex: 'Né près des sources chaudes du Temple. Sa carapace de basalte est fendue de lave, et sa queue brûle comme une torche.' }),
    f(4, 'salameche', { n: du('Salamèche'), t: ['grass'], dex: 'Une pousse lui sort du crâne. La feuille au bout de sa queue grandit avec lui ; si elle fane, c\'est qu\'il est malade.' }),
    f(1, 'bulbizarre', { n: du('Bulbizarre'), t: ['water'], dex: 'Il porte sur son dos un coquillage couché, couleur sable. Quand il y colle l\'oreille, il entend la mer.' }),
    f(493, 'arceus', { n: du('Arceus'), t: ['fire', 'water', 'grass'], plus: [[1, 'flamethrower'], [1, 'muddy-water'], [1, 'energy-ball']], dex: 'Le gardien du Temple des Éléments. Il porte en lui le feu, l\'eau et la plante.' }),
  ]);
}
/** les trois starters de la table, dans l'ordre des Poké Balls */
export const STARTERS_TEMPLE = [T.carapuce, T.salameche, T.bulbizarre];
