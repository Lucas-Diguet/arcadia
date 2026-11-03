// testodyssee/js/donjons/train.js — le Train Fantôme : une course contre la montre, en groupe.
//
// On monte dans la voiture de queue ; quand tout le monde est sur les dalles, le train part et l'horloge tourne
// (16 minutes jusqu'au terminus). Il faut remonter les voitures jusqu'à la locomotive et battre le contrôleur avant.
// À chaque gare (toutes les 3 minutes), les voitures de queue se décrochent : qui y est encore saute sur la voie
// et doit remonter à pied le long des rails pour rattraper le train (la voie ferrée, avec ses Pokémon sauvages).
// En chemin : dresseurs fantômes qui guettent, voiture-restaurant (on y soigne son équipe, mais le service prend
// du temps), voiture verrouillée qui s'ouvre à deux, fourgon à bagages encombré (caisses à pousser).
// Au terminus, si le contrôleur n'est pas battu, le train disparaît dans le brouillard : tout le monde redescend.
import { GameMap, rng } from '../../../odyssee/js/world/mapgen.js';
import { T } from '../../../odyssee/js/world/tiles.js';

/** l'extérieur : le quai, la nuit, et le train qui attend */
function exterieur() {
  const m = new GameMap('labo:train:dehors', 32, 22, { outdoor: true, fill: T.TREE, name: 'Quai de la Brume', music: 'route' });
  m.blob(16, 12, 13, 8, T.GRASS, rng(8181));
  m.rect(3, 3, 28, 19, T.GRASS, [T.TREE]);
  m.rect(4, 9, 27, 13, T.PAVE);
  // le train : 11 cases de large, porte au milieu
  const x0 = 10, yb = 8, porte = [x0 + 5, yb];
  for (let y = yb - 3; y <= yb; y++) for (let x = x0; x <= x0 + 10; x++) { if (x === porte[0] && y === yb) continue; m.under.set(x + ',' + y, T.PAVE); m.set(x, y, T.BLOCK); }
  for (let x = 2; x <= 29; x++) if (x < x0 || x > x0 + 10) { m.set(x, yb - 1, T.BLOCK); m.under.set(x + ',' + (yb - 1), T.PATH); m.deco.push({ k: 'traverse', x, y: yb - 1 }); }
  m.prop('train_quai', x0, yb, false, { w: 11, dz: 0.95 });
  m.set(...porte, T.DOOR);
  for (let y = 14; y <= 19; y++) m.set(porte[0], y, T.PATH);
  for (const [x, y] of [[6, 11], [25, 11], [10, 13], [21, 13]]) m.prop('lamp', x, y);
  for (const [x, y] of [[7, 13], [24, 13]]) m.prop('bench', x, y);
  m.zone(0, 0, 31, 21, { name: 'Quai de la Brume', music: 'route' });
  return { carte: m, porte };
}

const BANQUETTES = '#=|.......=|#';
const SALLE = '#...........#';
/** une voiture : le haut et le bas sont standard, le milieu est donné ligne par ligne */
const voiture = (milieu, o = {}) => ['######N######', ...(o.porte ? ['#####111#####'] : []), ...milieu, '######S######', ...(o.sansRetour ? [] : ['######D######'])];

export default {
  id: 'train',
  carte: 'labo:train',
  nom: 'Train Fantôme',
  niveau: 'niv. 35',
  entree: 'Le dernier train de la nuit ne s\'arrête pour personne. Atteignez la locomotive avant le terminus.',
  joueurs: { mode: 'groupe', n: 3 },
  musique: 'tower',
  equipe: 'milieu',
  style: 'bois',
  train: true,
  caisses: true,
  exterieur,
  // l'horloge : départ quand la voiture de queue est faite ; une gare toutes les 3 minutes, terminus à 16 minutes
  horloge: { gare: 180, terminus: 960, decroche: [['v1', 'v2'], ['v3', 'v4'], ['v5', 'v6'], ['v7']] },
  gares: ['Gare des Saules', 'Gare du Vieux-Pont', 'Gare des Brumes', 'Gare de Minuit'],
  portesDecor: { 1: 'porte_grille' },
  decor: { '=': 'bench', '|': 'porte_vide', '%': 'caisses', '&': 'tonneau', T: 'table', b: 'plant' },
  objets: {
    P: { type: 'panneau', texte: 'Voiture de queue.\nLe train partira quand tous les voyageurs seront sur les dalles. Il ne s\'arrêtera plus avant le terminus.' },
    Q: { type: 'panneau', texte: 'Voiture verrouillée.\nDeux voyageurs doivent se tenir sur les dalles pour ouvrir la porte.' },
    K: { type: 'restaurant', decor: 'comptoir' },
    L: { type: 'caisse', decor: 'caisse' },
    R: { type: 'levier', decor: 'pc' },
    M: { type: 'marchepied', decor: 'marchepied' },
    t: { type: 'traverse', sol: true, decor: 'traverse' },
    h: { type: 'ramasser', objet: 'hyper-potion' },
    u: { type: 'ramasser', objet: 'super-potion', n: 2 },
    r: { type: 'ramasser', objet: 'revive' },
    f: { type: 'ramasser', objet: 'full-heal' },
  },
  pnj: {
    a: { id: 'v2-a', cls: 'Voyageuse', nom: 'Clarisse', sprite: 'dame', dir: 'down', vue: 5, defi: 'Ce train est le mien... Retourne d\'où tu viens !', equipe: [[92, 32], [200, 33], [353, 32]] },
    c: { id: 'v2-b', cls: 'Médium', nom: 'Ophélie', sprite: 'medium', dir: 'down', vue: 5, defi: 'Les esprits du train m\'ont parlé de toi.', equipe: [[93, 33], [355, 33], [425, 32]] },
    e: { id: 'v6-a', cls: 'Contrôleur', nom: 'Hector', sprite: 'garde', dir: 'down', vue: 4, defi: 'Billet, s\'il vous plaît ! ... Pas de billet ?', equipe: [[93, 33], [302, 34], [426, 33]] },
    g: { id: 'v6-b', cls: 'Voyageur', nom: 'Anselme', sprite: 'vieil_homme', dir: 'down', vue: 4, defi: 'Cela fait cent ans que j\'attends mon arrêt...', equipe: [[354, 34], [200, 33], [94, 33]] },
    i: { id: 'v7-a', cls: 'Dormeuse', nom: 'Rose', sprite: 'kimono', dir: 'right', vue: 4, defi: 'Qui me réveille ?!', equipe: [[93, 33], [358, 33]] },
    j: { id: 'v7-b', cls: 'Dormeur', nom: 'Paulin', sprite: 'habitant', dir: 'left', vue: 4, defi: 'Chut... on dort, ici.', equipe: [[202, 34], [354, 34]] },
    k: { id: 'v7-c', cls: 'Dormeuse', nom: 'Iris', sprite: 'habitante', dir: 'right', vue: 4, defi: 'Encore un voyageur perdu...', equipe: [[429, 34], [93, 34]] },
    l: { id: 'v8-a', cls: 'Chef de train', nom: 'Barnabé', sprite: 'capitaine', dir: 'down', vue: 6, defi: 'Personne ne passe en tête de train sans mon accord !', equipe: [[93, 34], [356, 35], [426, 34], [609, 35]] },
    x: {
      id: 'controleur', cls: '', nom: 'Contrôleur Fantôme', sprite: 'garde', dir: 'down', raid: true, espece: 94, niveau: 38, blocs: 4, boost: 0,
      moves: [247, 94, 85, 109], effets: { 3: ['boostTout'], 2: ['baisseAttaques'], 1: ['ko'] },
      avant: ['Vous voilà enfin, voyageurs sans billet.', 'Ce train ne va nulle part. Et vous non plus.'],
      cri: 'Terminus pour tout le monde !', apres: 'Le Contrôleur s\'efface. Le train ralentit... et entre doucement en gare.',
    },
  },
  salles: [
    { id: 'v1', nom: 'Voiture de queue', type: 'dalles', porte: '1', plan: voiture([
      SALLE, BANQUETTES, SALLE, '#...o...o...#', BANQUETTES, '#...o...o...#', SALLE, BANQUETTES, '#.....P.....#', SALLE,
    ], { porte: true }) },
    { id: 'v2', nom: 'Voiture 2', type: 'combat', pnj: ['a', 'c'], plan: voiture([
      SALLE, BANQUETTES, '#.....c.....#', BANQUETTES, SALLE, BANQUETTES, SALLE, BANQUETTES, '#.....a.....#', BANQUETTES, SALLE, BANQUETTES, '#.u.........#', SALLE,
    ]) },
    { id: 'v3', nom: 'Voiture-restaurant', type: 'libre', plan: voiture([
      SALLE, '#.....K.....#', SALLE, '#.T.T...T.T.#', SALLE, SALLE, '#.T.T...T.T.#', SALLE, SALLE, '#.T.T...T.T.#', '#b.........b#', SALLE,
    ]) },
    { id: 'v4', nom: 'Voiture verrouillée', type: 'dalles', porte: '1', requisMax: 2, plan: voiture([
      SALLE, BANQUETTES, SALLE, '#..o.....o..#', SALLE, BANQUETTES, '#.....Q.....#', SALLE,
    ], { porte: true }) },
    { id: 'v5', nom: 'Fourgon à bagages', type: 'libre', plan: voiture([
      SALLE,
      '#...........#',
      '#%...%.%%%%.#',
      '#.%.%%...L.%#',
      '#..%.%..%...#',
      '#.....%%..LL#',
      '#.......%.%.#',
      '#........%..#',
      SALLE, '#&.........&#', SALLE, '#R..........#',
    ]) },
    { id: 'v6', nom: 'Voiture sans lumière', type: 'combat', pnj: ['e', 'g'], sombre: true, plan: voiture([
      SALLE, BANQUETTES, '#.....g.....#', BANQUETTES, SALLE, BANQUETTES, SALLE, BANQUETTES, '#.....e.....#', BANQUETTES, SALLE, '#.........h.#', SALLE,
    ]) },
    { id: 'v7', nom: 'Voiture-couchettes', type: 'combat', pnj: ['i', 'j', 'k'], plan: voiture([
      SALLE, '#i...###...j#', '#....###....#', '####.....####', SALLE, '#k...###....#', '#....###....#', '####.....####', SALLE, '#.r.........#', SALLE,
    ]) },
    { id: 'v8', nom: 'Voiture du chef de train', type: 'combat', pnj: ['l'], suivante: 'loco', plan: voiture([
      SALLE, '#b.........b#', '#.....l.....#', SALLE, SALLE, '#&.........&#', SALLE, '#....f......#', SALLE,
    ]) },
    // on y saute quand sa voiture se décroche ; le marchepied ramène dans la dernière voiture encore accrochée
    { id: 'voie', nom: 'Voie ferrée', type: 'libre', suivante: null, voieFerree: true, style: null,
      rencontres: [[92, 31, 33, 35], [353, 31, 33, 25], [425, 31, 33, 25], [200, 32, 33, 15]], taux: 0.05, plan: [
        '###########',
        '#####M#####',
        '#.........#',
        '#..t.t.t..#',
        '#.........#',
        '#..t.t.t..#',
        '#.%.......#',
        '#..t.t.t..#',
        '#.........#',
        '#..t.t.t%.#',
        '#.........#',
        '#..t.t.t..#',
        '#.&.......#',
        '#..t.t.t..#',
        '#.........#',
        '#..t.t.t..#',
        '#......&..#',
        '#..t.t.t..#',
        '#.........#',
        '#..t.t.t..#',
        '#.%.......#',
        '#..t.t.t..#',
        '#.........#',
        '#####S#####',
      ] },
    { id: 'loco', nom: 'Locomotive', type: 'raid', pnj: ['x'], plan: [
      '#############',
      '#&.........&#',
      '#.....x.....#',
      '#...........#',
      '#...........#',
      '#...........#',
      '#...........#',
      '######S######',
      '######D######',
    ] },
  ],
  journal: [
    { id: 'depart', nom: 'Le départ', salle: 'v1', but: 'Tous les voyageurs sur les dalles de la voiture de queue : le train part.' },
    { id: 'tete', nom: 'Remonter le train', salle: 'v8', but: 'Remontez les voitures avant que la vôtre ne se décroche. Une gare toutes les trois minutes.' },
    { id: 'controleur', nom: 'Le Contrôleur', salle: 'loco', but: 'Battez le Contrôleur Fantôme dans la locomotive avant le terminus.' },
  ],
  textes: {
    masque: 'Un froid glacial traverse la voiture.',
    perdu: ['Tes Pokémon n\'en peuvent plus...', 'Tu te réveilles à l\'entrée de la voiture. Ton équipe a été soignée.'],
    depart: 'Un long sifflet... Le train s\'ébranle. Il ne s\'arrêtera plus avant le terminus !',
    gare: '{gare} ! Les voitures de queue se décrochent...',
    decroche: ['Ta voiture se décroche dans un grincement !', 'Tu sautes sur la voie juste à temps. Il faut rattraper le train à pied !'],
    rattrape: 'Tu attrapes le marchepied et te hisses dans le train !',
    terminus: ['Le train s\'enfonce dans le brouillard...', 'Quand il se dissipe, tu es seul sur le quai. Le train a disparu.'],
    restaurant: 'Commander un repas ? Ton équipe sera soignée, mais le service prend 30 secondes... et le train ne t\'attend pas.',
    victoire: 'Le train entre en gare.',
  },
};
