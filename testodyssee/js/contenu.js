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

const PARCHEMIN = 'Un vieux parchemin trouvé dans le Donjon des Miroirs. Son texte parle d\'un autre lieu, encore inconnu.';
export const OBJETS = {
  'eau-fraiche': { pocket: 'soin', price: 0, heal: 50, name: 'Eau Fraîche', icon: 'fresh-water', desc: 'Une eau limpide et glacée. Restaure 50 PV. Elle ne se garde pas hors du Donjon des Miroirs.' },
  'parchemin-miroirs-1': { pocket: 'cles', price: 0, key: true, name: 'Parchemin des Miroirs I', img: 'miroirs/objet_parchemin.png', desc: PARCHEMIN, lire: ['« Là où la lumière se brise, une porte attend. »', 'Le reste du texte est effacé.'] },
  'parchemin-miroirs-2': { pocket: 'cles', price: 0, key: true, name: 'Parchemin des Miroirs II', img: 'miroirs/objet_parchemin.png', desc: PARCHEMIN, lire: ['« Trois reflets, trois clés, un seul chemin. »', 'Une carte à moitié déchirée accompagne le texte.'] },
  'parchemin-miroirs-3': { pocket: 'cles', price: 0, key: true, name: 'Parchemin des Miroirs III', img: 'miroirs/objet_parchemin.png', desc: PARCHEMIN, lire: ['« Celui qui porte l\'éclat verra ce qui est caché. »', 'L\'encre a bavé sur le bas du parchemin.'] },
  'ct-voile-miroir': { pocket: 'cles', price: 0, key: true, name: 'CT Voile Miroir', img: 'miroirs/objet_ct.png', ct: 'mirror-coat', desc: 'Apprend Voile Miroir à un Pokémon : il renvoie le double des dégâts spéciaux reçus. Elle sert autant de fois qu\'on veut.' },
  'ct-abri': { pocket: 'cles', price: 0, key: true, name: 'CT Abri', img: 'miroirs/objet_ct.png', ct: 'protect', desc: 'Apprend Abri à un Pokémon : il se protège de presque toutes les attaques pendant un tour. Elle sert autant de fois qu\'on veut.' },
  'relique-triforce': { pocket: 'cles', price: 0, key: true, name: 'Relique de Triforce', img: 'voies/objet_relique.png', desc: 'Trois pierres serties dans un disque ancien : bleue, rouge et verte. Elle ouvrira peut-être un autre donjon.' },
  'symbole-or-pyramide': { pocket: 'cles', price: 0, key: true, name: 'Symbole d\'Or de la Pyramide', img: 'pyramide/objet_symbole.png', desc: 'Remis à qui atteint le sommet de la Pyramide de l\'Ascension encore debout, et y bat le dernier adversaire.' },
  'bouchon-or': { pocket: 'objets', price: 0, name: 'Bouchon d\'Or', img: 'miroirs/objet_bouchon.png', iv: true, desc: 'Un bouchon doré et brillant. Il porte au maximum toutes les valeurs cachées (IV) d\'un Pokémon.' },
  'eclat-miroir': { pocket: 'cles', price: 0, key: true, name: 'Éclat de Miroir', img: 'miroirs/objet_eclat.png', desc: 'Un éclat qui reflète un lieu que tu n\'as jamais vu. Il ouvrira peut-être un autre donjon.' },
  'panini-chateauroux': { pocket: 'objets', price: 0, name: 'Panini de Châteauroux', img: 'panini.png', desc: 'Un panini encore tiède, jambon et fromage. Un souvenir du donjon de Didier.' },
};

// dessins en combat des adversaires du labo
export const DRESSEURS = { robot_combat: 'miroirs/robot_combat.png', copycat_combat: 'miroirs/copycat_combat.png', miroir_piege: 'miroirs/miroir_piege.png' };
// décor du labo ajouté aux images d'Odyssée (dessiné à 16 pixels par case)
export const DECOR = [
  ...['miroir_mur', 'miroir_brise', 'miroir_d', 'miroir_g', 'miroir_poche', 'socle', 'brasier', 'brasier_on', 'soleil', 'soleil_on', 'porte_miroirs', 'robot'].map((k) => [k, IMG + 'miroirs/' + k + '.png']),
  ...['pyramide', 'obelisque', 'porte_1', 'porte_2', 'porte_3', 'porte_4', 'porte_1_f', 'porte_2_f', 'porte_3_f', 'porte_4_f'].map((k) => [k, IMG + 'pyramide/' + k + '.png']),
  ...['porte_sagesse', 'porte_force', 'porte_courage', 'porte_sagesse_f', 'porte_force_f', 'porte_courage_f', 'porte_code', 'porte_grille', 'coffre', 'coffre_ouvert', 'interrupteur', 'interrupteur_on', 'socle_statue'].map((k) => [k, IMG + 'voies/' + k + '.png']),
];
export const IMAGES = { copycat: IMG + 'miroirs/copycat.png', horloge: IMG + 'miroirs/horloge.png' };

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
  ASSETS.item = (k) => (OBJETS[k]?.img ? IMG + OBJETS[k].img : item(k));
  const trainer = ASSETS.trainer;
  ASSETS.trainer = (k) => (DRESSEURS[k] ? IMG + DRESSEURS[k] : trainer(k));
  ASSETS.cry = (id) => (ESPECES[id] ? 'synth:' + id : cry(id));
}
