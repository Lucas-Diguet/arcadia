// testodyssee/js/contenu.js — ce que le labo ajoute aux données d'Odyssée : Pokémon exclusifs des donjons, objets
// de récompense, et leurs images (rangées dans testodyssee/img/ plutôt que dans le dossier d'Odyssée).
import { SPECIES } from '../../odyssee/js/data/species.js';
import { ITEMS } from '../../odyssee/js/core/items.js';
import { MOVES } from '../../odyssee/js/data/moves.js';

const IMG = new URL('../img/', import.meta.url).href;
// (les images ne servent qu'au navigateur)
const mv = (key) => Object.values(MOVES).find((m) => m.key === key).id;

export const SPECTRE_PIERRE = 2001;

export const ESPECES = {
  [SPECTRE_PIERRE]: {
    n: 'Spectre de Pierre Chartier', k: 'spectre-pierre', t: ['ghost'], b: [110, 70, 80, 125, 95, 90],
    cr: 3, xp: 250, g: 1, gr: -1, h: 18, w: 0, genus: 'Pokémon Trading Vol',
    ls: [[1, mv('shadow-ball')], [1, mv('dark-pulse')], [1, mv('will-o-wisp')], [1, mv('nasty-plot')]],
    dex: 'On dit qu\'il hante encore la salle des marchés, un casque sur les oreilles, à surveiller la volatilité.',
    img: 'spectre-pierre.png',
  },
};

export const OBJETS = {
  'panini-chateauroux': { pocket: 'objets', price: 0, name: 'Panini de Châteauroux', img: 'panini.png', desc: 'Un panini encore tiède, jambon et fromage. Un souvenir du donjon de Didier.' },
};

let fait = false;
/** ajoute espèces et objets aux tables d'Odyssée ; avec ASSETS (navigateur), branche aussi leurs images */
export function installerContenu(ASSETS) {
  if (fait) return; fait = true;
  for (const [id, s] of Object.entries(ESPECES)) SPECIES[id] = s;
  for (const [k, o] of Object.entries(OBJETS)) ITEMS[k] = o;
  if (!ASSETS) return;
  const front = ASSETS.front, item = ASSETS.item, cry = ASSETS.cry;
  ASSETS.front = (id, shiny) => (ESPECES[id] ? IMG + ESPECES[id].img : front(id, shiny));
  ASSETS.back = ((back) => (id, shiny) => (ESPECES[id] ? IMG + ESPECES[id].img : back(id, shiny)))(ASSETS.back);
  ASSETS.icon = ((icon) => (id) => (ESPECES[id] ? IMG + ESPECES[id].img : icon(id)))(ASSETS.icon);
  ASSETS.item = (k) => (OBJETS[k] ? IMG + OBJETS[k].img : item(k));
  ASSETS.cry = (id) => (ESPECES[id] ? 'synth:' + id : cry(id));
}
