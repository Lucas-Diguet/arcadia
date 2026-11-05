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
// Salles : Seuil (dalles), Chambre du Sarcophage, Galerie des Lunettes, Salle des Abîmes, Nef du Guet-apens,
// Couloir Piégé, Ossuaire, Repaire des Pilleurs, Escalier du Soleil, Autel du Soleil.
// Les grandes salles viennent de tools/tombeau.py (tombeau-salles.js).
import { GameMap, rng } from '../../../odyssee/js/world/mapgen.js';
import { T } from '../../../odyssee/js/world/tiles.js';
import { SALLES_TOMBEAU } from './tombeau-salles.js';

/** distance minimale (en cases, sur la même salle) entre le porteur du pendentif et celui des lunettes */
export const DISTANCE = 5;

/** l'extérieur : l'entrée du tombeau au fond d'une vallée de sable */
function exterieur() {
  const m = new GameMap('labo:tombeau:dehors', 34, 28, { outdoor: true, fill: T.ROCK, name: 'Vallée des Rois Oubliés', music: 'mystic' });
  m.blob(17, 15, 13.5, 11, T.SAND, rng(9191));
  m.rect(5, 6, 28, 25, T.SAND, [T.ROCK]);
  const b = m.building('cave', 14, 4, { name: 'Tombeau du Roi Sans Nom' });
  for (let y = b.doorY + 1; y <= 25; y++) m.set(b.doorX, y, T.PATH);
  for (const y of [10, 14, 18]) for (const x of [b.doorX - 3, b.doorX + 3]) m.prop('obelisque', x, y);
  m.prop('gargouille', b.x - 1, b.doorY); m.prop('gargouille', b.x + b.w, b.doorY);
  for (const [x, y] of [[8, 9], [26, 10], [7, 20], [27, 21]]) m.prop('rocher_grand', x, y);
  for (const [x, y] of [[10, 14], [24, 15], [11, 23], [23, 23]]) m.prop('stele', x, y);
  m.zone(0, 0, 33, 27, { name: 'Vallée des Rois Oubliés', music: 'mystic' });
  return { carte: m, porte: [b.doorX, b.doorY] };
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

const pnj = {
  // salles faites à la main
  a: { id: 's2-a', cls: 'Pilleur', nom: 'Rufus', sprite: 'voleur', dir: 'left', pilleur: true, defi: 'Ce pendentif est à moi !', perd: 'Il est maudit, de toute façon...', equipe: [[52, 33], [19, 34]] },
  c: { id: 's2-c', cls: 'Pilleuse', nom: 'Iseult', sprite: 'brume_f', dir: 'right', pilleur: true, defi: 'On l\'a vu en premier !', perd: 'Garde-le, ton caillou.', equipe: [[41, 33], [96, 33]] },
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

const G = Object.fromEntries(['lunettes', 'abimes', 'piege1', 'piege2', 'escalier'].map((k) => [k, SALLES_TOMBEAU[k]]));
const P3 = pilleurs('s3', G.lunettes, pnj), P4 = pilleurs('s4', G.abimes, pnj), P7 = pilleurs('s7', G.piege2, pnj), P9 = pilleurs('s9', G.escalier, pnj);

export default {
  id: 'tombeau',
  carte: 'labo:tombeau',
  nom: 'Tombeau du Roi Sans Nom',
  niveau: 'niv. 35',
  entree: 'Un pendentif maudit, des gouffres sans fond, des pilleurs aux aguets. Seuls trois aventuriers qui se font confiance en reviendront.',
  joueurs: { mode: 'exact', n: 3 },
  musique: 'cave',
  equipe: 'milieu',
  tombeau: true,
  exterieur,
  decor: { '%': 'caverock', '|': 'colonne', l: 'stele', b: 'brasero' },
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
    // objets à ramasser (chacun les siens)
    h: { type: 'ramasser', objet: 'hyper-potion' },
    r: { type: 'ramasser', objet: 'revive' },
    u: { type: 'ramasser', objet: 'super-potion', n: 2 },
    e: { type: 'ramasser', objet: 'full-heal' },
    m: { type: 'ramasser', objet: 'max-potion' },
    z: { type: 'ramasser', objet: 'full-restore' },
  },
  pnj,
  salles: [
    { id: 's1', nom: 'Seuil du Tombeau', type: 'dalles', porte: '1', plan: [
      '###############',
      '#######N#######',
      '######111######',
      '##...........##',
      '##.b.......b.##',
      '##...........##',
      '##..o..o..o..##',
      '##...........##',
      '##.l.......l.##',
      '##.....Q.....##',
      '##...........##',
      '#######S#######',
      '#######D#######',
    ] },
    { id: 's2', nom: 'Chambre du Sarcophage', type: 'combat', pnj: ['a', 'c'], plan: [
      '####################################',
      '#################N##################',
      '################...#################',
      '#############..........#############',
      '############.|...P....|.############',
      '############............############',
      '###########...l......l...###########',
      '#####....####..........####....#####',
      '####..h...##............##...e..####',
      '####......................a.....####',
      '#####...........b..b...........#####',
      '######.....|..........|.......######',
      '####............................####',
      '####..c.........................####',
      '#####.....####..........####...#####',
      '######...######........######.######',
      '#######.#######...Q....######..#####',
      '#######.##########..##########...###',
      '#######u##########..############.###',
      '##################..############m###',
      '##################S#################',
      '##################D#################',
    ] },
    { id: 's3', nom: 'Galerie des Lunettes', type: 'combat', pnj: P3.lettres, plan: P3.plan },
    { id: 's4', nom: 'Salle des Abîmes', type: 'combat', pnj: P4.lettres, plan: P4.plan },
    { id: 's5', nom: 'Nef du Guet-apens', type: 'libre', ouvertPar: 'vol', plan: [
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
    { id: 's6', nom: 'Couloir Piégé', type: 'libre', poursuite: true, plan: G.piege1.plan },
    { id: 's7', nom: 'Ossuaire', type: 'combat', poursuite: true, pnj: P7.lettres, plan: P7.plan },
    { id: 's8', nom: 'Repaire des Pilleurs', type: 'groupe', pnj: ['C'], plan: [
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
    { id: 's9', nom: 'Escalier du Soleil', type: 'combat', pnj: P9.lettres, plan: P9.plan },
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
    { id: 'seuil', nom: 'Le seuil', salle: 's1', but: 'Il faut les trois aventuriers sur les trois dalles en même temps.' },
    { id: 'pendentif', nom: 'Le pendentif', salle: 's2', but: 'Prenez le Pendentif Maudit sur le sarcophage. Il ronge les Pokémon de qui le porte : passez-le-vous (Sac → Pendentif Maudit).' },
    { id: 'lunettes', nom: 'Les lunettes', salle: 's3', but: 'Trouvez les Lunettes de Vérité : elles montrent le chemin au-dessus des gouffres. Leur porteur ne peut pas approcher celui du pendentif.' },
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
