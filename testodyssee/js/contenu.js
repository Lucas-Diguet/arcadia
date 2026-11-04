// testodyssee/js/contenu.js — ce que le labo ajoute aux données d'Odyssée : Pokémon exclusifs des donjons, objets
// de récompense, et leurs images (rangées dans testodyssee/img/ plutôt que dans le dossier d'Odyssée).
import { SPECIES } from '../../odyssee/js/data/species.js';
import { ITEMS } from '../../odyssee/js/core/items.js';
import { MOVES } from '../../odyssee/js/data/moves.js';
import { especesTemple } from './formes.js';
import { Battle } from '../../odyssee/js/core/battle.js';

const IMG = new URL('../img/', import.meta.url).href;
// (les images ne servent qu'au navigateur)
const mv = (key) => Object.values(MOVES).find((m) => m.key === key).id;

export const SPECTRE_PIERRE = 2001;

// attaques créées pour le labo ; Éruption et Giclédo (et leur pendant Plante) perdent de la force avec les PV du lanceur
export const ATTAQUES = {
  2101: { id: 2101, key: 'jaillisseve', n: 'Jaillissève', t: 'grass', c: 'special', p: 150, a: 100, pp: 5, pr: 0, tg: 11, m: { cat: 0, u: 'pv' } },
  2102: { id: 2102, key: 'lame-de-fond', n: 'Lame de Fond', t: 'water', c: 'special', p: 130, a: 90, pp: 5, pr: 0, tg: 10, m: { cat: 7, st: [[4, -2]], stc: 100 } },
};
const PLUS_FORTES_A_PV_PLEINS = ['eruption', 'water-spout'];
/** les starters : ceux des jeux officiels, les formes du Temple, ceux d'Odyssée, et toute leur lignée */
const LIGNEES = [1, 4, 7, 152, 155, 158, 252, 255, 258, 387, 390, 393, 495, 498, 501, 650, 653, 656, 722, 725, 728, 810, 813, 816, 906, 909, 912, 1001, 1004, 1007, 2010, 2013, 2016];
export const STARTERS = new Set(LIGNEES.flatMap((a) => [a, a + 1, a + 2]));

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
  // le Temple des Éléments, en solo : une CT au choix, à usage unique, pour un starter
  'ct-eruption-temple': { pocket: 'objets', price: 0, name: 'CT Éruption', img: 'miroirs/objet_ct.png', ct: 'eruption', unique: true, starters: true, desc: 'Apprend Éruption à un starter : plus ses PV sont hauts, plus elle frappe fort. Elle ne sert qu\'une fois.' },
  'ct-gicledo-temple': { pocket: 'objets', price: 0, name: 'CT Giclédo', img: 'miroirs/objet_ct.png', ct: 'water-spout', unique: true, starters: true, desc: 'Apprend Giclédo à un starter : plus ses PV sont hauts, plus elle frappe fort. Elle ne sert qu\'une fois.' },
  'ct-jaillisseve-temple': { pocket: 'objets', price: 0, name: 'CT Jaillissève', img: 'miroirs/objet_ct.png', ct: 'jaillisseve', unique: true, starters: true, desc: 'Apprend Jaillissève à un starter : la sève jaillit, plus fort tant que ses PV sont hauts. Elle ne sert qu\'une fois.' },
  'ct-surchauffe-temple': { pocket: 'objets', price: 0, name: 'CT Surchauffe', img: 'miroirs/objet_ct.png', ct: 'overheat', unique: true, starters: true, desc: 'Apprend Surchauffe à un starter. Elle ne sert qu\'une fois.' },
  'ct-tempete-verte-temple': { pocket: 'objets', price: 0, name: 'CT Tempête Verte', img: 'miroirs/objet_ct.png', ct: 'leaf-storm', unique: true, starters: true, desc: 'Apprend Tempête Verte à un starter. Elle ne sert qu\'une fois.' },
  'ct-lame-de-fond-temple': { pocket: 'objets', price: 0, name: 'CT Lame de Fond', img: 'miroirs/objet_ct.png', ct: 'lame-de-fond', unique: true, starters: true, desc: 'Apprend Lame de Fond à un starter : une vague énorme, qui épuise son lanceur. Elle ne sert qu\'une fois.' },
  'panini-chateauroux': { pocket: 'objets', price: 0, name: 'Panini de Châteauroux', img: 'panini.png', desc: 'Un panini encore tiède, jambon et fromage. Un souvenir du donjon de Didier.' },
};

// dessins en combat des adversaires du labo
export const DRESSEURS = { robot_combat: 'miroirs/robot_combat.png', copycat_combat: 'miroirs/copycat_combat.png', miroir_piege: 'miroirs/miroir_piege.png' };
// décor du labo ajouté aux images d'Odyssée (dessiné à 16 pixels par case)
export const DECOR = [
  ...['miroir_mur', 'miroir_brise', 'miroir_d', 'miroir_g', 'miroir_poche', 'socle', 'brasier', 'brasier_on', 'soleil', 'soleil_on', 'porte_miroirs', 'robot'].map((k) => [k, IMG + 'miroirs/' + k + '.png']),
  ...['train_quai', 'marchepied', 'traverse', 'comptoir'].map((k) => [k, IMG + 'train/' + k + '.png']),
  ...['barriere', 'cage', 'fissure', 'wagonnet', 'poste', 'entree_mine'].map((k) => [k, IMG + 'mine/' + k + '.png']),
  ...['pyramide', 'obelisque', 'porte_1', 'porte_2', 'porte_3', 'porte_4', 'porte_1_f', 'porte_2_f', 'porte_3_f', 'porte_4_f'].map((k) => [k, IMG + 'pyramide/' + k + '.png']),
  ...['porte_feu', 'porte_feu_f', 'porte_eau', 'porte_eau_f', 'porte_plante', 'porte_plante_f', 'porte_grande', 'porte_grande_o', 'dalle_or', 'teleporteur', 'cle_feu', 'cle_eau', 'cle_plante'].map((k) => [k, IMG + 'temple/' + k + '.png']),
  ...['borne', 'coffre_fort', 'drapeau', 'piege_trou', 'piege_roche', 'piege_brume', 'piege_colle', 'piege_alarme', 'piege_renvoi', 'piege_degats1', 'piege_degats2', 'piege_degats3', 'piege_combat'].map((k) => [k, IMG + 'ile/' + k + '.png']),
  ...['porte_sagesse', 'porte_force', 'porte_courage', 'porte_sagesse_f', 'porte_force_f', 'porte_courage_f', 'porte_code', 'porte_grille', 'coffre', 'coffre_ouvert', 'interrupteur', 'interrupteur_on', 'socle_statue'].map((k) => [k, IMG + 'voies/' + k + '.png']),
];
export const IMAGES = { copycat: IMG + 'miroirs/copycat.png', horloge: IMG + 'miroirs/horloge.png' };

let fait = false;
/** ajoute espèces et objets aux tables d'Odyssée ; avec ASSETS (navigateur), branche aussi leurs images */
export function installerContenu(ASSETS) {
  if (fait) return; fait = true;
  Object.assign(ESPECES, especesTemple());
  for (const [id, s] of Object.entries(ESPECES)) SPECIES[id] = s;
  for (const [k, o] of Object.entries(OBJETS)) ITEMS[k] = o;
  for (const [id, m] of Object.entries(ATTAQUES)) MOVES[id] = m;
  for (const m of Object.values(MOVES)) if (PLUS_FORTES_A_PV_PLEINS.includes(m.key)) m.m = { ...m.m, u: 'pv' };
  // puissance selon les PV du lanceur : 150 × PV / PV max (au moins 1)
  const puissance = Battle.prototype.movePower;
  Battle.prototype.movePower = function (i, d, mv) {
    if (mv.m?.u === 'pv') { const m = this.act(i); return Math.max(1, Math.floor((mv.p * m.hp) / m.stats[0])); }
    return puissance.call(this, i, d, mv);
  };
  if (!ASSETS) return;
  const front = ASSETS.front, item = ASSETS.item, cry = ASSETS.cry;
  // une image pour tout (img en .png), ou trois : face, dos, icône (img-f, img-b, img-i)
  const image = (id, c) => (ESPECES[id].img.endsWith('.png') ? IMG + ESPECES[id].img : `${IMG}${ESPECES[id].img}-${c}.png`);
  ASSETS.front = (id, shiny) => (ESPECES[id] ? image(id, 'f') : front(id, shiny));
  ASSETS.back = ((back) => (id, shiny) => (ESPECES[id] ? image(id, 'b') : back(id, shiny)))(ASSETS.back);
  ASSETS.icon = ((icon) => (id) => (ESPECES[id] ? image(id, 'i') : icon(id)))(ASSETS.icon);
  ASSETS.item = (k) => (OBJETS[k]?.img ? IMG + OBJETS[k].img : item(k));
  const trainer = ASSETS.trainer;
  ASSETS.trainer = (k) => (DRESSEURS[k] ? IMG + DRESSEURS[k] : trainer(k));
  // une forme du Temple crie comme le Pokémon dont elle vient
  ASSETS.cry = (id) => (ESPECES[id]?.base ? cry(ESPECES[id].base) : ESPECES[id] ? 'synth:' + id : cry(id));
}
