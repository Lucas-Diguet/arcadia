// testodyssee/js/donjons/tombeau.js — le Tombeau du Roi Sans Nom : un donjon à trois, à rôles qui tournent.
//
// Le Pendentif Maudit repose sur le sarcophage du roi. Il faut le porter jusqu'à l'Autel du Soleil, tout en haut.
// Il ronge les Pokémon de qui le porte, un peu à chaque pas : il faut se le passer (le poser, le donner à un voisin),
// sinon l'équipe tombe. Les Lunettes de Vérité, trouvées plus loin, montrent à qui les porte le chemin invisible
// au-dessus des gouffres et les pièges cachés : lui seul le voit, il guide les autres à la voix. Le pendentif et
// les lunettes se repoussent : leurs porteurs ne peuvent pas s'approcher à moins de DISTANCE cases l'un de l'autre.
// Comme le pendentif use son porteur, les lunettes aussi doivent changer de mains.
// Des pilleurs veulent le pendentif : ils attaquent qui passe devant eux, et voient son porteur de bien plus loin.
// Dans la Nef du Guet-apens, leur bande le vole ; on les poursuit à travers des salles piégées jusqu'à leur repaire,
// on bat leur chef tous ensemble, et on reprend la montée avec le pendentif.
//
// Dehors : la grande place, la façade gardée (on ne passe pas), des touristes ; le ruinemaniac donne la clé de l'entrée
// des pilleurs, cachée sous une roche fissurée au bord de la place.
// Salles : Crypte des Gardiens et Chambre du Sarcophage (des gardiens qui tournent la tête : qui entre dans leur champ
// de vision est jeté dehors ; on y vole les lunettes puis le pendentif), Galerie des Pilleurs, Salle des Abîmes,
// Nef du Guet-apens, Couloir Piégé, Ossuaire, Repaire des Pilleurs, Escalier du Soleil, Autel du Soleil.
// Les grandes salles viennent de tools/tombeau.py (tombeau-salles.js).
import { GameMap, rng } from '../../../odyssee/js/world/mapgen.js';
import { T } from '../../../odyssee/js/world/tiles.js';
import { SALLES_TOMBEAU } from './tombeau-salles.js';

/** distance minimale (en cases, sur la même salle) entre le porteur du pendentif et celui des lunettes */
export const DISTANCE = 5;

// touristes devant le tombeau, et autres passants de la place : [x, y, sprite, direction, déplacement, nom, phrase]
const TOURISTES = [
  [-6, 5, 'dame', 'up', 'static', 'Touriste', 'Clic ! Encore une photo pour mon album. Trois mille ans, tu te rends compte ?'],
  [-4, 5, 'topdresseur', 'up', 'turn', 'Touriste', 'Les gardiens ne laissent entrer personne. Même pas pour une petite photo de l\'intérieur...'],
  [-2, 6, 'enfant', 'up', 'turn', 'Petit garçon', 'Maman, on peut entrer ? Il y a un trésor dedans, c\'est sûr !'],
  [0, 6, 'habitante', 'up', 'static', 'Touriste', 'Regarde ces hiéroglyphes au-dessus de la porte... On dirait un pendentif, non ?'],
  [2, 5, 'fillette2', 'up', 'turn', 'Fillette', 'Souris ! Clic ! Oh, elle est floue...'],
  [4, 6, 'topdresseuse', 'up', 'static', 'Touriste', 'J\'ai fait douze heures de bus pour voir ça. Ça valait le coup.'],
  [6, 5, 'vieil_homme', 'up', 'static', 'Vieux touriste', 'Quand j\'étais jeune, on disait que le Roi Sans Nom maudissait quiconque touchait son pendentif.'],
  [-5, 7, 'gamin', 'up', 'turn', 'Gamin', 'Waouh ! C\'est encore plus grand qu\'à la télé !'],
  [-1, 8, 'kimono', 'up', 'static', 'Touriste', 'Quelle merveille... Je pourrais rester des heures à la regarder.'],
  [3, 8, 'habitant', 'up', 'turn', 'Touriste', 'Il paraît que des pilleurs rôdent dans la vallée, la nuit. Brr.'],
  [7, 8, 'marin', 'up', 'static', 'Photographe', 'Ne bouge pas... Encore un peu à gauche... Parfait ! Clic !'],
  [-7, 8, 'fillette', 'up', 'turn', 'Fillette', 'Les gardiens ont l\'air méchants. Ils ne sourient jamais ?'],
];
const PASSANTS = [
  [12, 22, 'vendeur', 'left', 'static', 'Marchand de souvenirs', 'Pendentifs du Roi Sans Nom, pas chers ! Garantis sans malédiction !'],
  [36, 14, 'savant', 'down', 'static', 'Archéologue', 'Nous fouillons la vallée depuis des années. Le tombeau, lui, reste fermé : le Conservatoire veille.'],
  [38, 26, 'topdresseuse', 'left', 'turn', 'Guide', 'Bienvenue dans la Vallée des Rois Oubliés ! Le tombeau se visite... de l\'extérieur.'],
  [30, 31, 'enfant', 'up', 'wander', 'Enfant', 'J\'ai trouvé un caillou bizarre ! Ah non, c\'est juste un caillou.'],
  [16, 30, 'randonneuse', 'right', 'turn', 'Randonneuse', 'Il fait une de ces chaleurs... Heureusement qu\'il y a des palmiers.'],
  [27, 18, 'pretre', 'down', 'static', 'Moine du désert', 'Le Roi Sans Nom dort sous nos pieds. Qu\'on le laisse en paix.'],
];
/** l'extérieur : une grande place de sable devant la façade du tombeau, gardée ; l'entrée des pilleurs est cachée
 *  sous une des roches du bord (porte) */
function exterieur() {
  const W = 48, H = 40, m = new GameMap('labo:tombeau:dehors', W, H, { outdoor: true, fill: T.ROCK, name: 'Vallée des Rois Oubliés', music: 'mystic' });
  m.blob(24, 21, 21, 17, T.SAND, rng(9191));
  m.rect(4, 4, 43, 36, T.SAND, [T.ROCK]);
  // la façade du tombeau, au nord : la porte officielle est fermée
  const fx = 19, fw = 9, fy = 2, fh = 4, px = fx + 4, py = fy + fh - 1;
  for (let y = fy; y < fy + fh; y++) for (let x = fx; x < fx + fw; x++) { m.under.set(x + ',' + y, T.SAND); m.set(x, y, T.BLOCK); }
  m.prop('entree_tombeau', fx, py, false, { w: fw, dz: 0.95 });
  m.edge = T.ROCK;
  // le cordon (des bornes) et les gardiens : on ne passe pas
  for (let x = fx - 2; x <= fx + fw + 1; x++) m.prop('cordon', x, py + 3);
  for (const dx of [-2, 0, 2]) m.npc({ id: `tombeau-garde-dehors${dx}`, x: px + dx, y: py + 4, dir: 'down', sprite: 'pretre', move: 'static', name: 'Gardien du tombeau', text: dx ? 'Le tombeau est fermé au public. Ordre du Conservatoire des Antiquités.' : 'Halte ! Personne n\'entre dans le tombeau du Roi Sans Nom. Personne.' });
  for (const [dx, dy, sprite, dir, move, name, text] of TOURISTES) m.npc({ id: `tombeau-touriste${dx},${dy}`, x: px + dx, y: py + dy, dir, sprite, move, name, text });
  for (const [x, y, sprite, dir, move, name, text] of PASSANTS) m.npc({ id: `tombeau-passant${x},${y}`, x, y, dir, sprite, move, name, text });
  // le ruinemaniac, à l'ombre des palmiers de l'ouest
  m.npc({ id: 'tombeau-ruinemaniac', x: 8, y: 27, dir: 'right', sprite: 'montagnard', move: 'static', name: 'Ruinemaniac' });
  // décor : obélisques le long de l'allée, statues, colonnes en ruine, palmiers, étals, fouilles
  for (const y of [12, 17, 22, 27]) for (const x of [px - 3, px + 3]) m.prop('obelisque', x, y);
  for (const [x, y] of [[fx - 2, py + 1], [fx + fw + 1, py + 1]]) m.prop('statue', x, y);
  for (const [x, y] of [[7, 7], [40, 7], [6, 33], [41, 33], [7, 25], [9, 29], [39, 20], [16, 33]]) m.prop('palm', x, y);
  for (const [x, y] of [[12, 9], [14, 9], [33, 9], [35, 9], [10, 16], [37, 30]]) m.prop('colonne', x, y);
  for (const [x, y] of [[11, 21], [13, 21]]) m.prop('parasol', x, y);
  for (const [x, y] of [[11, 23], [13, 23]]) m.prop('caisse', x, y);
  for (const [x, y] of [[34, 13], [38, 12], [35, 16]]) m.prop('fossile', x, y);
  m.prop('squelette', 37, 16);
  for (const [x, y] of [[18, 26], [30, 25], [20, 33], [28, 34]]) m.prop('stele', x, y);
  // les roches du bord de la place : une seule est fissurée (l'entrée des pilleurs)
  const roches = [[5, 13], [5, 21], [6, 30], [42, 11], [42, 23], [41, 28], [13, 35], [34, 35]];
  for (const [x, y] of roches) m.prop('rocher_grand', x, y);
  m.zone(0, 0, W - 1, H - 1, { name: 'Vallée des Rois Oubliés', music: 'mystic' });
  return { carte: m, porte: [42, 23], roches, devant: [px, py + 5], arrivee: [px, H - 6], panneau: [px + 4, py + 5] };
}

// les pilleurs des grandes salles : une lettre chacun (le plan généré dit seulement « t »)
const LETTRES = 'ÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝ';
const BANDE = [
  { cls: 'Pilleur', sprite: 'voleur' }, { cls: 'Pilleuse', sprite: 'brume_f' }, { cls: 'Pilleur', sprite: 'brume' },
];
const NOMS = ['Grégoire', 'Sacha', 'Bertille', 'Malo', 'Lisandre', 'Corbin', 'Zélie', 'Anselme', 'Rose', 'Thaddée', 'Mireille', 'Gaspard', 'Ninon', 'Octave', 'Célia', 'Basile', 'Héloïse', 'Fulbert'];
// équipes par salle (niveaux qui montent d'une salle à l'autre)
const EQUIPES = {
  s2: [[[52, 33], [41, 33]], [[19, 33], [96, 34]]],
  s3: [[[42, 34], [53, 34]], [[302, 34], [198, 35]]],
  s4: [[[20, 35], [42, 35], [197, 35]], [[302, 35], [215, 36]], [[105, 35], [93, 36]]],
  s7: [[[93, 36], [105, 36], [302, 37]], [[198, 36], [215, 37], [262, 37]]],
  s9: [[[262, 37], [229, 38]], [[461, 38], [302, 37], [94, 38]], [[430, 38], [359, 38]]],
};
const DITS = ['Ce pendentif vaut une fortune. Donne-le !', 'Tu n\'iras pas plus loin avec ce bijou.', 'Le tombeau est à nous !', 'Encore des curieux...'];

let nLettre = 0, nNom = 0;
/** remplace les « t » d'un plan par des lettres de pilleurs, et crée ces pilleurs */
function pilleurs(sid, gen, pnj) {
  const plan = gen.plan.map((r) => r), lettres = [], eq = EQUIPES[sid] || [];
  let k = 0;
  for (let y = 0; y < plan.length; y++) {
    let r = plan[y];
    for (let x = r.indexOf('t'); x >= 0; x = r.indexOf('t', x + 1)) {
      const l = LETTRES[nLettre++], b = BANDE[k % BANDE.length];
      pnj[l] = { id: `${sid}-p${k}`, ...b, nom: NOMS[nNom++ % NOMS.length], dir: gen.dirs[k], pilleur: true, dit: undefined, defi: DITS[k % DITS.length], perd: 'Grr... Ce n\'est que partie remise.', equipe: eq[k % eq.length] || [[52, 34], [41, 34]] };
      r = r.slice(0, x) + l + r.slice(x + 1);
      lettres.push(l); k++;
    }
    plan[y] = r;
  }
  return { plan, lettres };
}

// les brigands du -3 et du -4 : ils n'attaquent jamais ; certains proposent un combat (autant de fois qu'on veut)
const brig = (cls, nom, sprite, dir, dit, combat) => ({ cls, nom, sprite, dir, toujours: true, prix: combat ? 900 : 0, brigand: { dit, combat } });
const BRIGANDS = Object.fromEntries(Object.entries({
  // -3, le repaire
  'ñ': brig('Brigand', 'Fernand', 'voleur', 'right', 'Encore un nouveau ? Bienvenue au repaire. Ici, personne ne pose de questions.'),
  'ç': brig('Brigande', 'Sidonie', 'brume_f', 'down', 'Les gardiens d\'en haut ? Ils ne descendent jamais. Trop peur de nous.'),
  'ø': brig('Brigand', 'Marcel', 'montagnard', 'up', 'J\'ai creusé le tunnel jusqu\'ici pendant six mois. À la petite cuillère.'),
  'æ': brig('Brigand', 'Ange', 'brume', 'left', ['Tu veux monter au -2 ? La porte de fer est fermée à clé.', 'Nous, on ne monte jamais : les moines nous croient tous morts depuis longtemps. Et c\'est très bien comme ça.']),
  'œ': brig('Brigand', 'Riton', 'voleur', 'down', 'Je m\'ennuie à mourir. Un petit combat pour passer le temps ?', [[52, 34], [19, 35], [20, 35]]),
  'ß': brig('Brigande', 'Lulu', 'brume_f', 'down', 'Tu as l\'air d\'en avoir dans le ventre. Un combat, histoire de rigoler ?', [[41, 35], [96, 35], [302, 36]]),
  'ð': brig('Brigand', 'Comptable', 'savant', 'up', 'Chut ! Je compte le butin. Quatre cent douze, quatre cent treize... Zut, je recommence.'),
  'þ': brig('Brigande', 'Mado', 'dame', 'left', ['Les reliques du roi sont gardées par des moines. Ils ne dorment jamais.', 'Enfin... jamais tout seuls.']),
  'ą': brig('Brigand', 'Boris', 'karateka', 'right', 'Cette porte de fer mène au -2. On ne l\'a jamais ouverte : personne n\'a la clé.'),
  'ć': brig('Brigand', 'Gégé', 'habitant', 'down', 'Le Roi Sans Nom ? Un voisin comme un autre. Il ne se plaint jamais du bruit.'),
  'ę': brig('Brigande', 'Rosine', 'randonneuse', 'right', 'Il paraît que plus bas, il y a des pilleurs bien moins sympathiques que nous.'),
  // -3, près du passage qui descend
  'ł': brig('Brigand', 'Tonton', 'voleur', 'down', 'On parie sur un combat ? Si tu gagnes, tu gagnes. Si tu perds... tu perds.', [[198, 36], [215, 36]]),
  'ś': brig('Brigand', 'Nono', 'brume', 'up', 'Mes Pokémon rouillent. Un combat, vite fait ?', [[105, 36], [93, 37]]),
  'ğ': brig('Brigand', 'Sentinelle', 'garde', 'down', 'Ce passage descend au -4, chez les pilleurs de Sable-Noir. Eux, ils attaquent tout ce qui bouge.'),
  // le tripot
  'ŝ': brig('Brigand', 'Lucky', 'topdresseur', 'down', 'Une partie ? Pas aux dés : aux Pokémon. Et à la loyale, promis juré.', [[262, 37], [229, 37]]),
  'ŷ': brig('Brigande', 'Margot', 'topdresseuse', 'left', 'J\'ai perdu ma chemise, ma pelle et mon chameau. Mais je me refais à la prochaine.'),
  'ẑ': brig('Croupier', 'Fortuné', 'croupier', 'up', ['Faites vos jeux ! Rien ne va plus !', 'Tu n\'as rien à miser ? Alors misons nos Pokémon !'], [[302, 38], [198, 38], [359, 38]]),
  'ŕ': brig('Brigand', 'Double-Six', 'voleur', 'up', 'Le double six ! Encore ! Ces dés sont formidables. Je les ai achetés chez Ali Baba.'),
  'ŧ': brig('Brigande', 'Pipette', 'fillette2', 'right', 'Psst. Tu veux acheter un dé qui tombe toujours sur six ? Non ? Tant pis pour toi.'),
  // le dortoir
  'ǩ': brig('Brigand', 'Gros-Louis', 'montagnard', 'down', 'Zzz... Touche pas... à mon butin... Zzz...'),
  'ǯ': brig('Brigande', 'Nini', 'brume_f', 'down', 'Zzz... Encore cinq minutes... Zzz...'),
  'ǰ': brig('Brigand', 'Petit-Paul', 'enfant', 'down', 'Zzz... Un pendentif... maudit... Zzz...'),
  // la Caverne d'Ali Baba
  'ı': brig('Garde du corps', 'Bouboule', 'karateka', 'down', 'Tu achètes ou tu circules. Le patron n\'aime pas les badauds.'),
}).map(([k, p], i) => [k, { id: `brigand-${i}`, ...p }]));

const pnj = {
  'Ŵ': { id: 'alibaba', cls: 'Marchand', nom: 'Ali Baba', sprite: 'vendeur', dir: 'down', toujours: true, boutique: true },
  // les gardiens des deux premières salles : ils tournent la tête ; qui entre dans leur champ de vision est jeté dehors
  ...gardiens({
    K: { tourne: ['down', 'left', 'down', 'right'], decal: 0 }, M: { tourne: ['right', 'up'], decal: 6 }, O: { tourne: ['left', 'up', 'left', 'down'], decal: 3 },
    T: { tourne: ['down', 'left'], decal: 9 }, U: { tourne: ['right', 'down', 'left', 'up'], decal: 4 }, H: { tourne: ['up', 'left', 'up', 'right'], decal: 7 },
    I: { tourne: ['right', 'down'], decal: 0 }, J: { tourne: ['left', 'down'], decal: 6 }, E: { tourne: ['up', 'right'], decal: 3 },
    F: { tourne: ['up', 'left'], decal: 9 }, Z: { tourne: ['left', 'down', 'right', 'down'], decal: 2 }, B: { tourne: ['down', 'left', 'down', 'right'], decal: 5, portee: 4 },
    // les gardiens des reliques : leur regard ne bouge pas ; il faut les endormir pour prendre la relique
    'Λ': { tourne: ['left'], relique: 'lun' }, 'Γ': { tourne: ['down'], relique: 'pend' },
  }),
  ...BRIGANDS,
  // la bande du Guet-apens (n'apparaît que pendant la scène du vol)
  V: { id: 'vol-chef', cls: 'Chef des pilleurs', nom: 'Sable-Noir', sprite: 'nox', dir: 'down', scene: 'vol', toujours: true },
  W: { id: 'vol-1', cls: 'Pilleur', nom: '', sprite: 'voleur', dir: 'right', scene: 'vol', toujours: true },
  X: { id: 'vol-2', cls: 'Pilleuse', nom: '', sprite: 'brume_f', dir: 'left', scene: 'vol', toujours: true },
  Y: { id: 'vol-3', cls: 'Pilleur', nom: '', sprite: 'brume', dir: 'right', scene: 'vol', toujours: true },
  // le repaire : Sable-Noir et sa bande, à trois contre trois
  C: {
    id: 'repaire-chef', cls: 'Chef des pilleurs', nom: 'Sable-Noir', sprite: 'nox', dir: 'down', groupe: true,
    avant: ['Vous m\'avez suivi jusqu\'ici ? Avec vos lunettes et vos airs de héros ?', 'Le pendentif est à moi. Venez le chercher... tous ensemble !'],
    apres: 'Prenez-le, ce maudit caillou ! Il nous rongeait autant que vous...',
    equipe: [[229, 39], [435, 39], [430, 39], [302, 38], [262, 39], [461, 39], [94, 40], [359, 39], [248, 40]],
  },
};

/** gardiens : regard qui tourne (une direction toutes les PERIODE secondes, décalées de decal quarts de seconde) */
export const PERIODE = 3;
function gardiens(o) {
  return Object.fromEntries(Object.entries(o).map(([k, g], i) => [k, { id: `garde-${k}`, cls: 'Gardien du tombeau', nom: '', sprite: 'pretre', dir: g.tourne[0], toujours: true, garde: { portee: 6, ...g } }]));
}

const G = Object.fromEntries(['lunettes', 'abimes', 'piege1', 'piege2', 'escalier'].map((k) => [k, SALLES_TOMBEAU[k]]));
// les lunettes sont maintenant dans la première salle : leur socle de la Galerie devient un objet
G.lunettes = { ...G.lunettes, plan: G.lunettes.plan.map((r) => r.replace('L', 'z')) };
const P3 = pilleurs('s3', G.lunettes, pnj), P4 = pilleurs('s4', G.abimes, pnj), P7 = pilleurs('s7', G.piege2, pnj), P9 = pilleurs('s9', G.escalier, pnj);

/** des torches le long des murs du haut : une case de sol sous un mur, entourée de sol libre, assez loin des autres lumières */
export const LUMIERES = 'Ϯbv';
function torches(plan, ecart = 7) {
  const g = plan.map((r) => [...r]), H = g.length, W = g[0].length, at = (x, y) => (g[y] || [])[x];
  const lum = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (LUMIERES.includes(at(x, y))) lum.push([x, y]);
  const libre = (x, y) => { for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const c = at(x + i, y + j); if (j === -1 ? c !== '#' && c !== '.' : c !== '.') return false; } return true; };
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (at(x, y - 1) !== '#' || !libre(x, y) || at(x, y + 2) !== '.') continue;
    if (lum.some(([a, b]) => Math.max(Math.abs(a - x), Math.abs(b - y)) < ecart)) continue;
    g[y][x] = 'Ϯ'; lum.push([x, y]);
  }
  return g.map((r) => r.join(''));
}

const TOMBEAU = {
  id: 'tombeau',
  carte: 'labo:tombeau',
  nom: 'Tombeau du Roi Sans Nom',
  niveau: 'niv. 35',
  entree: 'Un pendentif maudit, des gouffres sans fond, des pilleurs aux aguets. Seuls trois aventuriers qui se font confiance en reviendront.',
  joueurs: { mode: 'exact', n: 3 },
  musique: 'cave',
  equipe: 'milieu',
  style: 'egypte',
  tombeau: true,
  exterieur,
  decor: { 'Ϯ': 'torche', '%': 'caverock', '|': 'colonne', l: 'stele', b: 'brasero', k: 'sarcophage_vide', c: 'caisse', n: 'tonneau', p: 'table', y: 'coffre', v: 'lanterne', w: 'caisses', 'ʙ': 'bed', 'Ŗ': 'counter' },
  objets: {
    // le gouffre : on y tombe ; le chemin invisible : seul le porteur des lunettes le voit
    _: { type: 'gouffre', sol: true, decor: 'gouffre' },
    ':': { type: 'cache', sol: true, decor: 'gouffre' },
    // pièges : à pointes (visibles), cachés (visibles avec les lunettes)
    x: { type: 'piege', sol: true, decor: 'piege_degats2' },
    '?': { type: 'piegeCache', sol: true },
    // les pilleurs qui s'enfuient avec le pendentif, la ligne du guet-apens, où le pendentif réapparaît
    f: { type: 'fuyards', sol: true },
    g: { type: 'guet', sol: true },
    j: { type: 'retour', sol: true },
    // les artefacts : le sarcophage (pendentif), le socle des lunettes, l'autel
    P: { type: 'sarcophage', decor: 'sarcophage' },
    L: { type: 'socleLunettes', decor: 'socle_lunettes' },
    A: { type: 'autel', decor: 'autel_soleil' },
    Q: { type: 'panneau', texte: 'Ici repose le Roi Sans Nom.\nQue son pendentif rejoigne l\'Autel du Soleil, tout en haut du tombeau, et la malédiction s\'éteindra.\nQui le porte le paiera de ses forces. Qui voit la vérité ne peut l\'approcher.' },
    R: { type: 'panneau', texte: 'Ce panneau a été gravé par un pilleur : « Les lunettes du roi montrent le chemin au-dessus du vide. Ne marchez pas dans le noir sans elles. »' },
    // passages entre les étages (vers : la salle, cible : la marque du passage d'en face) ; porte : fermée à clé
    'α': { type: 'lien', vers: 's2', cible: 'β', porte: true }, 'β': { type: 'lien', vers: 'b3', cible: 'α', porte: true },
    'γ': { type: 'lien', vers: 's1', cible: 'δ', sol: true }, 'δ': { type: 'lien', vers: 's2', cible: 'γ', sol: true },
    'η': { type: 'lien', vers: 'b4a', cible: 'θ', sol: true }, 'θ': { type: 'lien', vers: 'b3', cible: 'η', sol: true },
    'ι': { type: 'lien', vers: 'b4b', cible: 'λ', sol: true }, 'λ': { type: 'lien', vers: 'b3', cible: 'ι', sol: true },
    'κ': { type: 'lien', vers: 'b4c', cible: 'μ', sol: true }, 'μ': { type: 'lien', vers: 'b3', cible: 'κ', sol: true },
    // objets à ramasser (chacun les siens)
    h: { type: 'ramasser', objet: 'hyper-potion' },
    r: { type: 'ramasser', objet: 'revive' },
    u: { type: 'ramasser', objet: 'super-potion', n: 2 },
    e: { type: 'ramasser', objet: 'full-heal' },
    m: { type: 'ramasser', objet: 'max-potion' },
    z: { type: 'ramasser', objet: 'full-restore' },
  },
  pnj,
  // ce que vend Ali Baba : le classique, puis les objets « parfaitement légaux », puis les antiquités
  boutique: ['super-potion', 'hyper-potion', 'max-potion', 'full-heal', 'revive', 'max-repel', 'ultra-ball',
    'seringue-somnifere', 'batte-bricolage', 'couteau-pot-au-feu', 'vieux-couteau', 'pied-de-biche', 'cagoule', 'bougie-anniversaire',
    'carte-conservatoire', 'gants-velours', 'pelle-pliante', 'sac-toile', 'fausse-moustache',
    'scarabee-or', 'masque-funeraire', 'vase-canope', 'papyrus-ancien', 'chat-momifie', 'sceptre-pharaon'],
  salles: [
    // niveau -1 : on arrive par le tunnel des pilleurs ; les Lunettes de Vérité sur leur socle, au fond, derrière les gardiens
    // -3 : le repaire des brigands, où l'on arrive par le trou des pilleurs ; la porte de fer vers le -2, ses trois salles,
    // et le passage du fond qui descend plus bas
    { id: 'b3', nom: 'Repaire des Brigands (-3)', type: 'libre', suivante: 's3', pendentif: true, plan: [
      "##############################################",
      "#########α##########################N#########",
      "#########..#########################.#########",
      "#########..#########################.#########",
      "###...............####........b...b..ğ.....###",
      "###.v...........v.####..w.w.............w..###",
      "###...............####.....................###",
      "###...............####....................w###",
      "###.........ć............ą.................###",
      "###...k.......k............|.........|.....###",
      "###...............####.....................###",
      "###....ę..........####........œ............###",
      "###...............####.........ppp.........###",
      "###.v...........v.####............ß..........ι",
      "###...............####..........ð..........###",
      "##########..##########...ł..............þ..###",
      "##########..##########.....................###",
      "##########..##########.....|.........|.....###",
      "###n.....b......c...n#.....................###",
      "###n.................#..................ś..###",
      "###...pp..........æ........................###",
      "η.......ñ...............w.................w###",
      "###...........pp.....#.....................###",
      "###..ø.......ç.......##################..#####",
      "###..............b...##################..#####",
      "###..................##################..#####",
      "###c........c......nn##################..#####",
      "####..#################################..#####",
      "####..#################################..#####",
      "####..#################################..#####",
      "####S.#################################κ######",
      "####D#########################################",
    ] },
    // -1 : le Monocle de Vérité sur son socle, au fond, gardé ; on y monte depuis le -2
    { id: 's1', nom: 'Crypte des Gardiens (-1)', type: 'libre', gardiens: true, suivante: null, plan: [
      "##########################################",
      "##########################################",
      "##########################..##############",
      "##########################..##############",
      "##########################..##############",
      "###b..................................b###",
      "###.................K..........T.........#",
      "###....................................ΛL#",
      "###....|....|....|....|....|....|........#",
      "#........................................#",
      "#h..........kk.............kk..........###",
      "#......................................###",
      "###....|....|....|....|....|....|......###",
      "###.......U..........................O.###",
      "###.................kk.................###",
      "###....|....|....|....|....|....|......###",
      "###.M..................................###",
      "###......................H.............###",
      "###....................................###",
      "##############..##..######################",
      "##############..##..######################",
      "##############..##e.######################",
      "######..........##########################",
      "######..........##########################",
      "######..##################################",
      "######..##################################",
      "######..##################################",
      "######..##################################",
      "######S.##################################",
      "######δ###################################",
    ] },
    // -2 : le Pendentif Maudit sur le sarcophage du roi, gardé ; on y monte depuis le -3 par la porte de fer
    { id: 's2', nom: 'Chambre du Sarcophage (-2)', type: 'libre', gardiens: true, suivante: null, plan: [
      "############################################",
      "#####################γ######################",
      "#####################..#####################",
      "#####################..#####################",
      "#####################..#####################",
      "#####################..#####################",
      "######..............b..b..............######",
      "##u.##.I............................J.##.r##",
      "##..##...............Z................##..##",
      "##..##....kk....................kk........##",
      "##....................................##..##",
      "##..##............|......|............##..##",
      "##..##................................##..##",
      "##..##...............P................##..##",
      "##..##...............Γ....................##",
      "##....................................##..##",
      "##..##............|......|............##..##",
      "##..##................................##..##",
      "##..##....kk....................kk........##",
      "##....................................##..##",
      "##..##.E............................F.##..##",
      "##..##................................##..##",
      "##...........########B#########...........##",
      "##........................................##",
      "############..|....|....|....|..############",
      "############....................############",
      "############....................############",
      "#####################..#####################",
      "#####################..#####################",
      "#####################..#####################",
      "#####################S.#####################",
      "#####################β######################",
    ] },
    // les trois salles du repaire
    { id: 'b4a', nom: 'Caverne d\'Ali Baba (-3)', type: 'libre', suivante: null, plan: [
      "##################",
      "##################",
      "##ww.y.k..k.y.ww##",
      "##..ı...........##",
      "##......Ŵ......n##",
      "##v...ŖŖ.ŖŖ.....##",
      "##..............##",
      "##............S..θ",
      "##v..............#",
      "##..............##",
      "##.............n##",
      "##w............w##",
      "##################",
      "##################",
    ] },
    { id: 'b4b', nom: 'Tripot (-3)', type: 'libre', suivante: null, plan: [
      "######################",
      "######################",
      "##n.......b.......n###",
      "##.................###",
      "##....ŝ............###",
      "##....pp.....pp....###",
      "##............ŷ....###",
      "λ....................#",
      "#...|...........|....#",
      "##........ẑ........###",
      "##.......ppp.......###",
      "##.ŧ........ŕ......###",
      "##........S........###",
      "##n...............n###",
      "######################",
      "######################",
    ] },
    { id: 'b4c', nom: 'Dortoir (-3)', type: 'libre', suivante: null, plan: [
      "############μ#############",
      "############..############",
      "##.....................n##",
      "##..........S...........##",
      "##..ʙ...ʙ.......ʙ...ʙ...##",
      "##...ǩ..................##",
      "##e..................ǰ..##",
      "##......................##",
      "##...............ǯ......##",
      "##..ʙ...ʙ.......ʙ...ʙ...##",
      "##.....................h##",
      "##n........c..c........n##",
      "##########################",
      "##########################",
    ] },
    { id: 's3', nom: 'Galerie des Pilleurs (-4)', pendentif: true, type: 'combat', pnj: P3.lettres, plan: P3.plan },
    { id: 's4', nom: 'Salle des Abîmes', pendentif: true, type: 'combat', pnj: P4.lettres, plan: P4.plan },
    { id: 's5', nom: 'Nef du Guet-apens', pendentif: true, type: 'libre', ouvertPar: 'vol', plan: [
      '##########################',
      '############N#############',
      '###########...############',
      '#########.......##########',
      '#####W##...........##X####',
      '#####.....|.....|.....####',
      '#####.................####',
      '####Y..|.....V.....|..####',
      '#####.................####',
      '######..b.........b..#####',
      '#######.............######',
      '########...........#######',
      '########.|.......|.#######',
      '########ggggggggggg#######',
      '#######......h......######',
      '########...........#######',
      '########.|.......|.#######',
      '########...........#######',
      '#######.............######',
      '######..b....l....b..#####',
      '#######.............######',
      '########.|.......|.#######',
      '########...........#######',
      '#########.........########',
      '###########.....##########',
      '############S#############',
      '############D#############',
    ] },
    { id: 's6', nom: 'Couloir Piégé', pendentif: true, type: 'libre', poursuite: true, plan: G.piege1.plan },
    { id: 's7', nom: 'Ossuaire', pendentif: true, type: 'combat', poursuite: true, pnj: P7.lettres, plan: P7.plan },
    { id: 's8', nom: 'Repaire des Pilleurs', pendentif: true, type: 'groupe', pnj: ['C'], plan: [
      '##############################',
      '##############N###############',
      '#############...##############',
      '##########..........##########',
      '#########.%...C....%.#########',
      '#########............#########',
      '########..b...j....b..########',
      '#######................#######',
      '#######..%..........%..#######',
      '######..................######',
      '######...|..........|...######',
      '######..................######',
      '#######................#######',
      '########..............########',
      '#########.....l......#########',
      '###########........###########',
      '##############S###############',
      '##############D###############',
    ] },
    { id: 's9', nom: 'Escalier du Soleil', pendentif: true, type: 'combat', pnj: P9.lettres, plan: P9.plan },
    { id: 's10', nom: 'Autel du Soleil', type: 'libre', plan: [
      '#########################',
      '#########################',
      '###########...###########',
      '#########.......#########',
      '########..|.A.|..########',
      '########.........########',
      '#######..b.....b..#######',
      '#######...........#######',
      '######..|.......|..######',
      '######.............######',
      '#######...........#######',
      '########....l....########',
      '##########.....##########',
      '############S############',
      '############D############',
    ] },
  ],
  journal: [
    { id: 'entree', nom: 'L\'entrée des pilleurs', salle: 'b3', but: 'L\'entrée officielle est gardée. Le ruinemaniac de la place connaît un autre accès : une roche à pousser avec Force, au bord est de la place.' },
    { id: 'reliques', nom: 'Les reliques', salle: 's2', but: 'La dernière salle du tombeau ne s\'ouvre qu\'avec deux reliques : le Monocle de Vérité (-1) et le Pendentif Maudit (-2). La porte de fer du -3 y mène (le ruinemaniac en a donné la clé). Des moines gardent les reliques sans jamais détourner le regard : approchez-vous sans être vus et endormez-les.' },
    { id: 'descente', nom: 'La descente', salle: 'b3', but: 'Redescendez les reliques jusqu\'au -3 sans vous faire repérer. Le passage du fond du repaire mène plus bas.' },
    { id: 'vol', nom: 'Le vol', salle: 's5', but: 'Des pilleurs ont volé le pendentif. Rattrapez-les : leur repaire est plus haut, derrière les salles piégées.' },
    { id: 'autel', nom: 'L\'autel', salle: 's10', but: 'Portez le pendentif jusqu\'à l\'Autel du Soleil et posez-le dessus.' },
  ],
  textes: {
    perdu: ['Tes Pokémon n\'en peuvent plus...', 'Tu reprends tes esprits à l\'entrée de la salle. Tes Pokémon ont retrouvé un peu de forces.'],
    victoire: 'Le pendentif s\'illumine sur l\'autel, puis s\'éteint pour toujours. La malédiction du Roi Sans Nom est levée.',
    masque: 'Une présence glaciale emplit le repaire.',
    cri: 'À l\'attaque, la bande !',
  },
  recompense: { objets: { 'sceau-roi': 1 } },
};
for (const salle of TOMBEAU.salles) salle.plan = torches(salle.plan);
export default TOMBEAU;
