// testodyssee/js/contenu.js — ce que le labo ajoute aux données d'Odyssée : Pokémon exclusifs des donjons, objets
// de récompense, et leurs images (rangées dans testodyssee/img/ plutôt que dans le dossier d'Odyssée).
import { SPECIES } from '../../odyssee/js/data/species.js';
import { ITEMS } from '../../odyssee/js/core/items.js';
import { MOVES } from '../../odyssee/js/data/moves.js';
import { especesTemple } from './formes.js';
import { Battle } from '../../odyssee/js/core/battle.js';
import { installerRegles } from './combat/regles.js';
import { installerIA } from './combat/ia.js';

const IMG = new URL('../img/', import.meta.url).href;
// (les images ne servent qu'au navigateur)
const mv = (key) => Object.values(MOVES).find((m) => m.key === key).id;

export const SPECTRE_PIERRE = 2001;
/** les abominations du Tombeau du Roi Sans Nom : nées du tombeau pour le défendre, on ne les capture pas */
export const ABOMINATIONS = { lambeaumort: 2101, sablegrince: 2102, hurlemort: 2103 };

// attaques créées pour le labo ; Éruption et Giclédo (et leur pendant Plante) perdent de la force avec les PV du lanceur
export const ATTAQUES = {
  2101: { id: 2101, key: 'jaillisseve', n: 'Jaillissève', t: 'grass', c: 'special', p: 150, a: 100, pp: 5, pr: 0, tg: 11, m: { cat: 0, u: 'pv' } },
  // attaques de météo (les CT des Routes Victoire et leurs dresseurs) : Odyssée ne connaît la météo que par les talents
  201: { id: 201, key: 'sandstorm', n: 'Tempête de Sable', t: 'rock', c: 'status', p: 0, a: null, pp: 10, pr: 0, tg: 12, m: { cat: 10, u: 'meteo', meteo: 'sandstorm' } },
  240: { id: 240, key: 'rain-dance', n: 'Danse Pluie', t: 'water', c: 'status', p: 0, a: null, pp: 5, pr: 0, tg: 12, m: { cat: 10, u: 'meteo', meteo: 'rain' } },
  241: { id: 241, key: 'sunny-day', n: 'Zénith', t: 'fire', c: 'status', p: 0, a: null, pp: 5, pr: 0, tg: 12, m: { cat: 10, u: 'meteo', meteo: 'sun' } },
  258: { id: 258, key: 'hail', n: 'Grêle', t: 'ice', c: 'status', p: 0, a: null, pp: 10, pr: 0, tg: 12, m: { cat: 10, u: 'meteo', meteo: 'hail' } },
  2102: { id: 2102, key: 'lame-de-fond', n: 'Lame de Fond', t: 'water', c: 'special', p: 130, a: 90, pp: 5, pr: 0, tg: 10, m: { cat: 7, st: [[4, -2]], stc: 100 } },
};
const PLUS_FORTES_A_PV_PLEINS = ['eruption', 'water-spout'];
/** les starters : ceux des jeux officiels, les formes du Temple, ceux d'Odyssée, et toute leur lignée */
const LIGNEES = [1, 4, 7, 152, 155, 158, 252, 255, 258, 387, 390, 393, 495, 498, 501, 650, 653, 656, 722, 725, 728, 810, 813, 816, 906, 909, 912, 1001, 1004, 1007, 2010, 2013, 2016];
export const STARTERS = new Set(LIGNEES.flatMap((a) => [a, a + 1, a + 2]));
/**
 * qui peut apprendre l'attaque d'une CT ? Une CT de starter ne va qu'à un starter du même type que l'attaque (une forme
 * du Temple compte avec son nouveau type), même s'il ne l'apprend pas d'habitude. Et ces attaques-là, un Pokémon qui ne
 * les apprend pas par niveau ne les apprend qu'avec cette CT, jamais avec une autre. Renvoie null, ou la raison du refus.
 */
export function refusCt(objet, sp) {
  const o = OBJETS[objet] || ITEMS[objet], mv = o && Object.values(MOVES).find((m) => m.key === o.ct), S = SPECIES[sp];
  if (!mv || !S) return 'Impossible';
  if (o.starters) return !STARTERS.has(sp) ? 'Pas un starter' : !S.t.includes(mv.t) ? 'Pas du bon type' : null;
  const reservee = Object.values(OBJETS).some((q) => q.starters && q.ct === mv.key);
  if (reservee && !(S.ls || []).some(([, id]) => id === mv.id)) return 'Ne peut pas l\'apprendre';
  return null;
}

export const ESPECES = {
  [SPECTRE_PIERRE]: {
    n: 'Spectre de Pierre Chartier', k: 'spectre-pierre', t: ['ghost'], b: [110, 70, 80, 125, 95, 90],
    cr: 3, xp: 250, g: 1, gr: -1, h: 18, w: 0, genus: 'Pokémon Trading Vol',
    ls: [[1, mv('shadow-ball')], [1, mv('dark-pulse')], [1, mv('will-o-wisp')], [1, mv('nasty-plot')]],
    dex: 'On dit qu\'il hante encore la salle des marchés, un casque sur les oreilles, à surveiller la volatilité.',
    img: 'spectre-pierre.png',
  },
  [ABOMINATIONS.lambeaumort]: {
    n: 'Lambeaumort', k: 'lambeaumort', t: ['ghost', 'poison'], b: [85, 95, 80, 60, 75, 45], nonCapturable: true,
    cr: 0, xp: 170, g: 1, gr: -1, h: 17, w: 400, genus: 'Abomination',
    ls: [[1, mv('shadow-claw')], [1, mv('poison-jab')], [1, mv('will-o-wisp')], [1, mv('hex')]],
    dex: 'Un corps sans nom, enroulé dans ses bandelettes. Le tombeau l\'a relevé pour chasser les pillards.',
    img: 'tombeau/abom_lambeaumort',
  },
  [ABOMINATIONS.sablegrince]: {
    n: 'Sablegrince', k: 'sablegrince', t: ['ghost', 'ground'], b: [100, 105, 95, 45, 70, 30], nonCapturable: true,
    cr: 0, xp: 180, g: 1, gr: -1, h: 19, w: 800, genus: 'Abomination',
    ls: [[1, mv('bulldoze')], [1, mv('shadow-punch')], [1, mv('mud-shot')], [1, mv('bone-rush')]],
    dex: 'Fait de sable et de vieilles bandelettes. Il avance lentement, mais rien ne l\'arrête.',
    img: 'tombeau/abom_sablegrince',
  },
  [ABOMINATIONS.hurlemort]: {
    n: 'Hurlemort', k: 'hurlemort', t: ['ghost', 'dark'], b: [75, 80, 65, 95, 75, 60], nonCapturable: true,
    cr: 0, xp: 190, g: 1, gr: -1, h: 20, w: 300, genus: 'Abomination',
    ls: [[1, mv('shadow-ball')], [1, mv('dark-pulse')], [1, mv('night-shade')], [1, mv('ominous-wind')]],
    dex: 'Une ombre qui hurle sans bouche. On dit qu\'elle garde la voix des pillards qu\'elle a emportés.',
    img: 'tombeau/abom_hurlemort',
  },
};

const PARCHEMIN = 'Un vieux parchemin trouvé dans le Donjon des Miroirs. Son texte parle d\'un autre lieu, encore inconnu.';
export const OBJETS = {
  // objets des Routes Victoire (rv/) : CT d'origine (à usage unique, comme en troisième génération) et objets absents d'Odyssée
  'ct02-rv': { pocket: 'ct', price: 0, name: 'CT02 Draco-Griffe', img: 'miroirs/objet_ct.png', ct: 'dragon-claw', unique: true, desc: 'Apprend Draco-Griffe : de grandes griffes tranchantes. Comme dans les jeux de l\'époque, elle ne sert qu\'une fois.' },
  'ct07-rv': { pocket: 'ct', price: 0, name: 'CT07 Grêle', img: 'miroirs/objet_ct.png', ct: 'hail', unique: true, desc: 'Apprend Grêle : une averse de grêle pendant cinq tours. Comme dans les jeux de l\'époque, elle ne sert qu\'une fois.' },
  'ct26-rv': { pocket: 'ct', price: 0, name: 'CT26 Séisme', img: 'miroirs/objet_ct.png', ct: 'earthquake', unique: true, desc: 'Apprend Séisme : le sol tremble sous tous les Pokémon. Comme dans les jeux de l\'époque, elle ne sert qu\'une fois.' },
  'ct29-rv': { pocket: 'ct', price: 0, name: 'CT29 Psyko', img: 'miroirs/objet_ct.png', ct: 'psychic', unique: true, desc: 'Apprend Psyko : une puissante attaque psychique. Comme dans les jeux de l\'époque, elle ne sert qu\'une fois.' },
  'ct37-rv': { pocket: 'ct', price: 0, name: 'CT37 Tempête de Sable', img: 'miroirs/objet_ct.png', ct: 'sandstorm', unique: true, desc: 'Apprend Tempête de Sable : une tempête de sable pendant cinq tours. Comme dans les jeux de l\'époque, elle ne sert qu\'une fois.' },
  'ct50-rv': { pocket: 'ct', price: 0, name: 'CT50 Surchauffe', img: 'miroirs/objet_ct.png', ct: 'overheat', unique: true, desc: 'Apprend Surchauffe : une attaque de feu dévastatrice, qui baisse l\'Attaque Spéciale du lanceur. Comme dans les jeux de l\'époque, elle ne sert qu\'une fois.' },
  'ct41-rv': { pocket: 'ct', price: 0, name: 'CT41 Tourmente', img: 'miroirs/objet_ct.png', ct: 'torment', unique: true, desc: 'Apprend Tourmente, qui empêche la cible d\'utiliser deux fois de suite la même attaque. Odyssée ne connaît pas encore cette attaque : la CT se garde dans le sac. Comme dans les jeux de l\'époque, elle ne sert qu\'une fois.' },
  'ct59-rv': { pocket: 'ct', price: 0, name: 'CT59 Draco-Choc', img: 'miroirs/objet_ct.png', ct: 'dragon-pulse', unique: true, desc: 'Apprend Draco-Choc : une onde de choc de type Dragon. Comme dans les jeux de l\'époque, elle ne sert qu\'une fois.' },
  'ct71-rv': { pocket: 'ct', price: 0, name: 'CT71 Lame de Roc', img: 'miroirs/objet_ct.png', ct: 'stone-edge', unique: true, desc: 'Apprend Lame de Roc : des pierres tranchantes, souvent un coup critique. Comme dans les jeux de l\'époque, elle ne sert qu\'une fois.' },
  'ct79-rv': { pocket: 'ct', price: 0, name: 'CT79 Vibrobscur', img: 'miroirs/objet_ct.png', ct: 'dark-pulse', unique: true, desc: 'Apprend Vibrobscur : une onde de pensées noires, qui peut apeurer. Comme dans les jeux de l\'époque, elle ne sert qu\'une fois.' },
  'hp-up': { pocket: 'objets', price: 9800, vitamine: 0, name: 'PV Plus', desc: 'Augmente un peu les PV d\'un Pokémon (points d\'effort).' },
  calcium: { pocket: 'objets', price: 9800, vitamine: 3, name: 'Calcium', desc: 'Augmente un peu l\'Attaque Spéciale d\'un Pokémon (points d\'effort).' },
  zinc: { pocket: 'objets', price: 9800, vitamine: 4, name: 'Zinc', desc: 'Augmente un peu la Défense Spéciale d\'un Pokémon (points d\'effort).' },
  nugget: { pocket: 'objets', price: 10000, name: 'Pépite', desc: 'Une pépite d\'or pur. Elle se vend cher.' },
  'razor-claw': { pocket: 'objets', price: 2100, name: 'Griffe Rasoir', desc: 'Une griffe acérée. Elle fait évoluer certains Pokémon ; Odyssée ne s\'en sert pas encore en combat.' },
  'cs-cascade': { pocket: 'ct', price: 0, key: true, name: 'CS07 Cascade', icon: 'notebook', desc: 'En surfant, remonte les cascades. Place-toi face à la cascade, sur l\'eau, et avance vers elle.' },
  'max-elixir': { pocket: 'soin', price: 4500, ppAll: 99, name: 'Max Élixir', desc: 'Restaure tous les PP de toutes les attaques.' },
  'max-revive': { pocket: 'soin', price: 4000, revive: 1, name: 'Rappel Max', desc: 'Ranime un Pokémon K.O. avec tous ses PV.' },
  'pp-up': { pocket: 'objets', price: 9800, name: 'PP Plus', desc: 'Augmente les PP maximum d\'une attaque. Odyssée ne s\'en sert pas encore : il se garde dans le sac.' },
  'guard-spec': { pocket: 'objets', price: 700, name: 'Défense Spéc.', desc: 'Empêche les stats de baisser pendant cinq tours. Odyssée ne s\'en sert pas encore : il se garde dans le sac.' },
  'eau-fraiche': { pocket: 'soin', price: 0, heal: 50, name: 'Eau Fraîche', icon: 'fresh-water', desc: 'Une eau limpide et glacée. Restaure 50 PV. Elle ne se garde pas hors du Donjon des Miroirs.' },
  'parchemin-miroirs-1': { pocket: 'cles', price: 0, key: true, name: 'Parchemin des Miroirs I', img: 'miroirs/objet_parchemin.png', desc: PARCHEMIN, lire: ['« Là où la lumière se brise, une porte attend. »', 'Le reste du texte est effacé.'] },
  'parchemin-miroirs-2': { pocket: 'cles', price: 0, key: true, name: 'Parchemin des Miroirs II', img: 'miroirs/objet_parchemin.png', desc: PARCHEMIN, lire: ['« Trois reflets, trois clés, un seul chemin. »', 'Une carte à moitié déchirée accompagne le texte.'] },
  'parchemin-miroirs-3': { pocket: 'cles', price: 0, key: true, name: 'Parchemin des Miroirs III', img: 'miroirs/objet_parchemin.png', desc: PARCHEMIN, lire: ['« Celui qui porte l\'éclat verra ce qui est caché. »', 'L\'encre a bavé sur le bas du parchemin.'] },
  'ct-voile-miroir': { pocket: 'cles', price: 0, key: true, name: 'CT Voile Miroir', img: 'miroirs/objet_ct.png', ct: 'mirror-coat', desc: 'Apprend Voile Miroir à un Pokémon : il renvoie le double des dégâts spéciaux reçus. Elle sert autant de fois qu\'on veut.' },
  'ct-abri': { pocket: 'cles', price: 0, key: true, name: 'CT Abri', img: 'miroirs/objet_ct.png', ct: 'protect', desc: 'Apprend Abri à un Pokémon : il se protège de presque toutes les attaques pendant un tour. Elle sert autant de fois qu\'on veut.' },
  'relique-triforce': { pocket: 'cles', price: 0, key: true, name: 'Relique de Triforce', img: 'voies/objet_relique.png', desc: 'Trois pierres serties dans un disque ancien : bleue, rouge et verte. Elle ouvrira peut-être un autre donjon.' },
  'symbole-or-pyramide': { pocket: 'cles', price: 0, key: true, name: 'Symbole d\'Or de la Pyramide', img: 'pyramide/objet_symbole.png', desc: 'Remis à qui atteint le sommet de la Pyramide de l\'Ascension encore debout, et y bat le dernier adversaire.' },
  'bouchon-or': { pocket: 'objets', price: 0, name: 'Bouchon d\'Or', img: 'miroirs/objet_bouchon.png', iv: true, desc: 'Un bouchon doré et brillant. Il porte au maximum toutes les valeurs cachées (IV) d\'un Pokémon.' },
  // le Tombeau du Roi Sans Nom : sa relique (elle ne quitte pas le tombeau), et deux artefacts gardés pour un autre donjon
  'sceptre-jumeau': { pocket: 'cles', price: 0, key: true, name: 'Sceptre Jumeau', img: 'tombeau/objet_sceptre_roi.png', desc: 'Le jumeau du Sceptre du Roi Sans Nom. Le chef de Sable-Noir l\'avait apporté jusqu\'à la porte scellée.' },
  'cle-sable-noir': { pocket: 'cles', price: 0, key: true, name: 'Clé de Sable-Noir', img: 'tombeau/objet_cle_fer.png', desc: 'La clé du sous-chef de Sable-Noir. Elle ouvre la grille du -7 du tombeau.' },
  'sceptre-roi': { pocket: 'cles', price: 0, key: true, name: 'Sceptre du Roi Sans Nom', img: 'tombeau/objet_sceptre_roi.png', desc: 'Le sceptre d\'or et de lapis du Roi Sans Nom. Il ouvre la dernière salle du tombeau, celle de sa sépulture.' },
  'pendentif-maudit': { pocket: 'cles', price: 0, key: true, name: 'Pendentif Maudit', img: 'tombeau/objet_pendentif.png', desc: 'Le pendentif du Roi Sans Nom. Il ronge les Pokémon de qui le porte, un peu à chaque pas. À porter jusqu\'à l\'Autel du Soleil. Utilise-le pour le poser ou le donner à un voisin.' },
  'lunettes-verite': { pocket: 'cles', price: 0, key: true, name: 'Monocle de Vérité', img: 'tombeau/objet_lunettes.png', desc: 'Il montre le regard des gardiens, le chemin invisible au-dessus des gouffres et les pièges cachés. Il repousse le pendentif. Utilise-le pour le poser ou le donner à un voisin.' },
  'cle-ruinemaniac': { pocket: 'cles', price: 0, key: true, name: 'Clé de Fer', img: 'tombeau/objet_cle_fer.png', desc: 'Une lourde clé de fer donnée par le ruinemaniac de la Vallée des Rois Oubliés. Elle ouvre la porte de fer entre le -3 et le -2 du tombeau.' },
  'carte-tombeau': { pocket: 'cles', price: 0, key: true, name: 'Carte du Tombeau', img: 'tombeau/objet_plan_tombeau.png', desc: 'La carte du ruinemaniac : le tombeau du -1 au -4. Plus bas, elle s\'arrête. Utilise-la pour la consulter.' },
  // la Caverne d'Ali Baba (Tombeau du Roi Sans Nom) : des objets « parfaitement légaux », des antiquités, et des antiquités.
  // replique : ce que dit Ali Baba quand on l'achète ; lot : on en reçoit autant pour un achat
  'seringue-somnifere': { pocket: 'objets', price: 800, name: 'Seringue Somnifère', img: 'tombeau/objet_seringue.png', desc: 'Calme un cheval nerveux en quelques secondes. Usage strictement vétérinaire.', replique: 'Une seringue somnifère ? Encore un vétérinaire ! T\'es le cinquième aujourd\'hui. C\'est fou ce qu\'il y a comme chevaux, dans un tombeau de cinq mille ans. Bon courage pour ton cheval !' },
  'batte-bricolage': { pocket: 'objets', price: 1800, name: 'Batte de Bricolage', img: 'tombeau/objet_batte.png', desc: 'Une batte hérissée de clous et de barbelés. Elle enfonce trois clous d\'un coup : l\'outil préféré des bricoleurs pressés.', replique: 'Ah, un bricoleur ! Tu montes une étagère, c\'est ça ? Moi aussi, j\'en monte une tous les soirs. Chez les voisins.' },
  'couteau-pot-au-feu': { pocket: 'objets', price: 1500, name: 'Couteau à Pot-au-feu', img: 'tombeau/objet_couteau.png', desc: 'Soixante centimètres de lame pour tailler les légumes d\'un pot-au-feu de vingt personnes. Les carottes ne verront rien venir.', replique: 'Tu cuisines pour beaucoup de monde, toi. Je ne pose pas de questions. Bon appétit !' },
  'vieux-couteau': { pocket: 'objets', price: 400, name: 'Vieux Couteau de Cuisine', img: 'tombeau/objet_vieux_couteau.png', desc: 'Un vieux couteau de cuisine qui a beaucoup servi. On y voit encore des traces de ketchup séché...', replique: 'Du ketchup, oui. Rien que du ketchup. Beaucoup, beaucoup de ketchup. Il est à toi !' },
  'pied-de-biche': { pocket: 'objets', price: 700, name: 'Pied-de-biche', img: 'tombeau/objet_pied_de_biche.png', desc: 'Ouvre les pots de confiture les plus récalcitrants. Et les sarcophages, mais c\'est plus rare.', replique: 'Les pots de confiture, quelle plaie ! Surtout ceux en granit, avec un roi dedans.' },
  'cagoule': { pocket: 'objets', price: 300, name: 'Cagoule en Laine', img: 'tombeau/objet_cagoule.png', desc: 'Garde les oreilles au chaud pendant les nuits fraîches du désert. Les trous pour les yeux, c\'est pour admirer les étoiles.', replique: 'Il fait frais la nuit, c\'est vrai. Surtout devant les bijouteries.' },
  'bougie-anniversaire': { pocket: 'objets', price: 2000, name: 'Bougie d\'Anniversaire', img: 'tombeau/objet_bougie.png', desc: 'Une seule bougie, mais quelle bougie ! Longue mèche, gros effet. Pour des anniversaires inoubliables.', replique: 'Un anniversaire ? Félicitations ! Pense à t\'éloigner du gâteau. Et des murs porteurs.' },
  'carte-conservatoire': { pocket: 'objets', price: 2500, name: 'Carte du Conservatoire', img: 'tombeau/objet_carte.png', desc: 'Une authentique carte de membre du Conservatoire des Antiquités. Très authentique. Vraiment très, très authentique.', replique: 'Toutes mes félicitations pour ta nomination au Conservatoire ! C\'était rapide. Le tampon n\'est même pas encore sec.' },
  'gants-velours': { pocket: 'objets', price: 350, name: 'Gants de Velours', img: 'tombeau/objet_gants.png', desc: 'Pour ne laisser aucune trace de doigts sur les objets fragiles. Les musées adorent.', replique: 'Des gants pour les musées ! Toi, tu respectes les œuvres. Tu les respectes tellement que tu les ramènes chez toi.' },
  'pelle-pliante': { pocket: 'objets', price: 600, name: 'Pelle Pliante', img: 'tombeau/objet_pelle.png', desc: 'Pour faire des châteaux de sable. De très, très profonds châteaux de sable. La nuit, de préférence.', replique: 'Un château de sable ? À cette heure-ci ? Ah, les artistes...' },
  'sac-toile': { pocket: 'objets', price: 200, name: 'Grand Sac de Toile', img: 'tombeau/objet_sac.png', desc: 'Un sac pour faire les courses. Le symbole dessiné dessus, c\'est juste pour faire joli.', replique: 'Pour les courses ! Ne prends que ce qui est en promotion. La nuit, tout est en promotion.' },
  'fausse-moustache': { pocket: 'objets', price: 150, name: 'Fausse Moustache', img: 'tombeau/objet_moustache.png', desc: 'Pour les soirées déguisées. Indispensable quand on doit passer devant des gens qui vous connaissent.', replique: 'Une soirée déguisée ? Tu vas te déguiser en... quelqu\'un d\'autre. Excellent costume.' },
  'scarabee-or': { pocket: 'objets', price: 6000, name: 'Scarabée d\'Or', img: 'tombeau/objet_scarabee.png', desc: 'Un bijou ancien en parfait état. Acheté en toute légalité à un ami qui passait par là avec une pelle.', replique: 'Une pièce unique ! J\'en ai encore douze comme ça derrière.' },
  'masque-funeraire': { pocket: 'objets', price: 12000, name: 'Masque Funéraire', img: 'tombeau/objet_masque.png', desc: 'Un masque de collection. Son ancien propriétaire n\'en avait plus l\'usage : il est mort depuis quatre mille ans.', replique: 'Il te va à ravir ! Son ancien propriétaire, lui, n\'a pas protesté.' },
  'vase-canope': { pocket: 'objets', price: 4500, name: 'Vase Canope', img: 'tombeau/objet_vase.png', desc: 'Parfait pour ranger les épices. Évite d\'ouvrir celui à tête de chacal.', replique: 'Pour les épices, oui. Ne l\'ouvre pas avant le dîner.' },
  'papyrus-ancien': { pocket: 'objets', price: 3000, name: 'Papyrus Ancien', img: 'tombeau/objet_papyrus.png', desc: 'Une recette de cuisine millénaire. Enfin, on suppose : personne ne sait le lire.', replique: 'Une recette de gâteau, à mon avis. Ou une malédiction. C\'est souvent pareil.' },
  'chat-momifie': { pocket: 'objets', price: 3500, name: 'Chat Momifié', img: 'tombeau/objet_chat.png', desc: 'Un compagnon calme et propre, qui ne griffe pas les canapés et ne réclame jamais à manger.', replique: 'Le compagnon idéal ! Il ne miaule plus depuis le règne du Roi Sans Nom.' },
  'sceptre-pharaon': { pocket: 'objets', price: 15000, name: 'Sceptre du Pharaon', img: 'tombeau/objet_sceptre.png', desc: 'Une élégante canne de marche pour les longues promenades. Le pharaon n\'en a plus besoin.', replique: 'Excellent pour le dos ! Le pharaon s\'en servait aussi. Enfin, avant.' },
  'sceau-roi': { pocket: 'cles', price: 0, key: true, name: 'Sceau du Roi Sans Nom', img: 'tombeau/objet_sceau.png', desc: 'Remis à ceux qui ont trouvé la sépulture du Roi Sans Nom.' },
  'cle-miroirs': { pocket: 'cles', price: 0, key: true, name: 'Clé des Miroirs', img: 'tombeau/objet_cle.png', desc: 'Une clé d\'argent froide comme la glace. Elle ouvre la porte du Donjon des Miroirs.' },
  'eclat-miroir': { pocket: 'cles', price: 0, key: true, name: 'Éclat de Miroir', img: 'miroirs/objet_eclat.png', desc: 'Un éclat qui reflète un lieu que tu n\'as jamais vu. Il ouvrira peut-être un autre donjon.' },
  // le Temple des Éléments, à trois : prêté par le moine de la Salle des Dalles, rendu au Gardien
  'talisman-elements': { pocket: 'cles', price: 0, key: true, name: 'Talisman des Éléments', img: 'temple/talisman.png', desc: 'Un pendentif à trois pierres, prêté par le moine du Temple des Éléments. Grâce à lui, tes Pokémon coupent les arbustes, poussent les rochers, brisent la roche fissurée et surfent, sans CS ni badge. À rendre au Gardien.' },
  // la Baie Fraive (le Temple des Éléments) : soigne une brûlure
  'rawst-berry': { pocket: 'baies', price: 80, name: 'Baie Fraive', img: 'temple/baie_fraive.png', cure: ['brn'], desc: 'Une Baie qui soigne une brûlure.' },
  // le Temple des Éléments, à trois : le sac du moine. Pendant le temple, on n'a que lui (et ce qu'on y trouve)
  'sac-quete': { pocket: 'cles', price: 0, key: true, name: 'Sac de Quête', img: 'temple/sac_quete.png', desc: 'Le sac prêté par le moine du Temple des Éléments. Ton sac habituel reste à l\'entrée : dans le temple, tu n\'as que ce que tu y trouves. Ce qui reste dedans est perdu en sortant.' },
  // le Temple des Éléments, en solo : ce qu'on trouve dans un chemin et qui sert dans un autre
  'braise-eternelle': { pocket: 'cles', price: 0, key: true, name: 'Braise Éternelle', img: 'temple/tresor_braise.png', desc: 'Une braise du chemin du Feu, qui ne s\'éteint jamais. Aucune ronce ne lui résiste.' },
  'graine-geante': { pocket: 'cles', price: 0, key: true, name: 'Graine Géante', img: 'temple/tresor_graine.png', desc: 'Une graine du chemin de la Plante. À peine en terre, ses racines boivent toute l\'eau qu\'elles trouvent.' },
  'fiole-eau-pure': { pocket: 'cles', price: 0, key: true, name: 'Fiole d\'Eau Pure', img: 'temple/tresor_fiole.png', desc: 'Une eau du chemin de l\'Eau, si pure qu\'elle éteint n\'importe quel feu.' },
  'pierre-ardente': { pocket: 'cles', price: 0, key: true, name: 'Pierre Ardente', img: 'temple/tresor_pierre.png', desc: 'Une pierre du chemin du Feu, toujours brûlante. Elle ferait fondre la glace la plus épaisse.' },
  'rosee-eternelle': { pocket: 'cles', price: 0, key: true, name: 'Rosée Éternelle', img: 'temple/tresor_rosee.png', desc: 'Une goutte du chemin de l\'Eau qui ne sèche jamais. Elle rendrait vie à un arbre mort.' },
  'corde-liane': { pocket: 'cles', price: 0, key: true, name: 'Corde de Liane', img: 'temple/tresor_corde.png', desc: 'Une liane tressée du chemin de la Plante, assez solide pour franchir un gouffre.' },
  'carte-temple': { pocket: 'cles', price: 0, key: true, field: 'carte-temple', name: 'Carte du Temple', img: 'temple/carte_temple.png', desc: 'La carte du Temple des Éléments en solo : les salles des trois chemins, leurs entrées, leurs sorties et les passages secrets. Utilise-la pour la consulter.' },
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
  ...['miroir_mur', 'miroir_mur_jaune', 'miroir_mur_rouge', 'miroir_mur_bleu', 'miroir_mur_noir', 'miroir_mur_vert', 'miroir_brise', 'miroir_d', 'miroir_g', 'miroir_poche', 'socle', 'brasier', 'brasier_on', 'soleil', 'soleil_on', 'porte_miroirs', 'robot'].map((k) => [k, IMG + 'miroirs/' + k + '.png']),
  ...['train_quai', 'marchepied', 'traverse', 'comptoir'].map((k) => [k, IMG + 'train/' + k + '.png']),
  ...['barriere', 'cage', 'fissure', 'wagonnet', 'poste', 'entree_mine'].map((k) => [k, IMG + 'mine/' + k + '.png']),
  ...['pyramide', 'obelisque', 'porte_1', 'porte_2', 'porte_3', 'porte_4', 'porte_1_f', 'porte_2_f', 'porte_3_f', 'porte_4_f'].map((k) => [k, IMG + 'pyramide/' + k + '.png']),
  ...['porte_feu', 'porte_feu_f', 'porte_eau', 'porte_eau_f', 'porte_plante', 'porte_plante_f', 'porte_grande', 'porte_grande_o', 'dalle_or', 'teleporteur', 'cle_feu', 'cle_eau', 'cle_plante', 'liane', 'cascade', 'porte_hall', 'arbuste_rouge', 'arbuste_jaune', 'arbuste_violet', 'ronces_rouge', 'ronces_jaune', 'ronces_violet', 'ronces_geantes', 'torrent', 'mur_flammes', 'tresor_braise', 'tresor_graine', 'arbuste_bleu', 'ronces_bleu', 'bouche_eau', 'bouche_sombre', 'bouche_tunnel', 'mur_glace', 'arbre_mort', 'gouffre', 'tresor_fiole', 'tresor_pierre', 'tresor_rosee', 'tresor_corde'].map((k) => [k, IMG + 'temple/' + k + '.png']),
  ...['borne', 'coffre_fort', 'drapeau', 'piege_trou', 'piege_roche', 'piege_brume', 'piege_colle', 'piege_alarme', 'piege_renvoi', 'piege_degats1', 'piege_degats2', 'piege_degats3', 'piege_combat'].map((k) => [k, IMG + 'ile/' + k + '.png']),
  ...['entree_tombeau', 'cordon', 'zzz', 'sarcophage', 'sarcophage_vide', 'socle_lunettes', 'socle_sceptre', 'socle_vide', 'autel_soleil', 'autel_soleil_on', 'pendentif_sol', 'lunettes_sol', 'torche', 'eboulement', 'sable_mouvant', ...['voleur', 'brume', 'brume_f', 'brutus'].flatMap((b) => [`gisant_${b}`, `gisant_${b}_2`])].map((k) => [k, IMG + 'tombeau/' + k + '.png']),
  ...['porte_sagesse', 'porte_force', 'porte_courage', 'porte_sagesse_f', 'porte_force_f', 'porte_courage_f', 'porte_code', 'porte_grille', 'coffre', 'coffre_ouvert', 'interrupteur', 'interrupteur_on', 'socle_statue'].map((k) => [k, IMG + 'voies/' + k + '.png']),
];
export const IMAGES = { copycat: IMG + 'miroirs/copycat.png', horloge: IMG + 'miroirs/horloge.png' };

let fait = false;
/** ajoute espèces et objets aux tables d'Odyssée ; avec ASSETS (navigateur), branche aussi leurs images */
export function installerContenu(ASSETS) {
  if (fait) return; fait = true;
  installerRegles();
  installerIA();
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
  // météo lancée par une attaque : cinq tours
  const speciale = Battle.prototype.special;
  Battle.prototype.special = function (i, d, mv) {
    if (mv.m?.u !== 'meteo') return speciale.call(this, i, d, mv);
    if (this.weather === mv.m.meteo) this.say('Mais cela échoue !'); else this.setWeather(mv.m.meteo, 5);
    return true;
  };
  // les abominations du tombeau ne se capturent pas
  const lancer = Battle.prototype.throwBall;
  Battle.prototype.throwBall = function (item) {
    if (this.wild && SPECIES[this.foe.sp]?.nonCapturable) { this.say(`Vous lancez une ${ITEMS[item]?.name || 'Ball'} !`); this.ev.push({ t: 'ball', item, blocked: true }); this.say('La Ball rebondit sur l\'abomination ! Elle ne se laisse pas capturer.'); return false; }
    return lancer.call(this, item);
  };
  if (!ASSETS) return;
  // formes de combat du labo (Protéen, Forme Assaut d'Exagide) : l'image de l'espèce d'origine
  for (const k of ['front', 'back', 'icon', 'cry']) { const f = ASSETS[k]; ASSETS[k] = (id, ...r) => f(SPECIES[id]?.visuel || id, ...r); }
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
