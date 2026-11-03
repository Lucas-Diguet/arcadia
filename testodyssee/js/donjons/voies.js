// testodyssee/js/donjons/voies.js — le Sanctuaire des Trois Voies : un donjon à trois joueurs, salles séparées.
//
// Salle 1 : trois dalles, une par joueur, pour ouvrir la porte.
// Salle 2 : les statues du trio des lacs et trois portes (Sagesse, Force, Courage). Une porte ne laisse passer
//           qu'un joueur, et on ne revient pas en arrière : chacun suit son chemin.
// Salles 3 : Sagesse, l'énigme des menteurs ; Force, deux dresseurs et un gardien à blocs (immunisé aux attaques
//            physiques tant que son premier bloc tient, son Attaque monte à chaque bloc cassé) ; Courage, des caisses
//            à pousser, un dresseur, une porte à interrupteur qu'il faut rejoindre en courant, un dresseur.
//            Au bout de chaque épreuve : un parchemin avec un nombre à deux chiffres.
// Salles 4 : la même salle pour les trois. Cinq dresseurs (un deuxième parchemin), un coffre qui s'ouvre avec ses
//            deux nombres et donne l'ordre du code de la grande porte, code fait des nombres des deux autres.
// Salle 5 : un couloir commun, trois dresseurs à affronter à trois (combats triples, à venir).
// Salle 6 : le gardien des Trois Voies, à trois contre un.
import { GameMap, rng } from '../../../odyssee/js/world/mapgen.js';
import { T } from '../../../odyssee/js/world/tiles.js';

const VOIES = { s: 'Sagesse', f: 'Force', c: 'Courage' };

/** l'extérieur : un sanctuaire de pierre au fond d'une clairière */
function exterieur() {
  const m = new GameMap('labo:voies:dehors', 32, 26, { outdoor: true, fill: T.TREE, name: 'Clairière des Trois Voies', music: 'route' });
  m.blob(16, 13, 12.5, 10, T.GRASS, rng(333));
  m.rect(5, 3, 26, 22, T.GRASS, [T.TREE]);
  const b = m.building('gym', 12, 4, { roof: 'gray', name: 'Sanctuaire des Trois Voies' });
  for (let y = b.doorY + 1; y <= 23; y++) m.set(b.doorX, y, T.PATH);
  m.rect(b.doorX - 1, b.doorY + 1, b.doorX + 1, b.doorY + 2, T.PATH);
  for (const [x, y] of [[8, 10], [23, 10], [8, 17], [23, 17]]) m.prop('lanterne', x, y);
  m.rect(7, 13, 10, 15, T.FLOWER, [T.GRASS]); m.rect(21, 13, 24, 15, T.FLOWER, [T.GRASS]);
  m.zone(0, 0, 31, 25, { name: 'Clairière des Trois Voies', music: 'route' });
  return { carte: m, porte: [b.doorX, b.doorY], panneau: [b.doorX + 2, 19] };
}

// les salles 4 sont des copies : mêmes plans, mêmes dresseurs, lettres différentes pour chaque chemin
const PLAN4 = [
  '#########################',
  '############N############',
  '###########VVV###########',
  '##.....................##',
  '##..1.............2....##',
  '##.....................##',
  '##...........K.........##',
  '##..+..............*...##',
  '##.........3...........##',
  '##.....................##',
  '##..4......H.......5...##',
  '##.....................##',
  '############S############',
  '############D############',
];
const LETTRES4 = { s: 'abcde', f: 'fghjk', c: 'lmnvw' };
const DRESSEURS4 = [
  { cls: 'Gardien', nom: 'Aubin', sprite: 'vieil_homme', equipe: [[16, 22], [17, 23]] },
  { cls: 'Gardienne', nom: 'Iris', sprite: 'fillette2', equipe: [[19, 22], [20, 23], [21, 22]] },
  { cls: 'Gardien', nom: 'Colas', sprite: 'montagnard', equipe: [[27, 23], [28, 24]] },
  { cls: 'Gardienne', nom: 'Nell', sprite: 'dame', equipe: [[43, 23], [44, 24], [69, 23], [70, 24]] },
  { cls: 'Gardien', nom: 'Hugo', sprite: 'gamin', equipe: [[60, 24], [61, 25], [54, 24]] },
];
const plan4 = (v) => PLAN4.map((r) => r.replace(/[1-5]/g, (n) => LETTRES4[v][+n - 1]));
const pnj4 = () => {
  const out = {};
  for (const [v, l] of Object.entries(LETTRES4)) [...l].forEach((k, i) => { out[k] = { ...DRESSEURS4[i], id: `${v}4-${i}`, dir: 'down', perd: 'Ton chemin continue...' }; });
  return out;
};

/** codes tirés à chaque descente : deux nombres par chemin, l'ordre du code de chaque grande porte */
function preparer(r) {
  const vus = new Set(), nombre = () => { for (;;) { const n = 10 + Math.floor(r() * 90); if (!vus.has(n)) { vus.add(n); return n; } } };
  const codes = {}; for (const v of Object.keys(VOIES)) codes[v] = [nombre(), nombre()];
  const motifs = {}, portes = {};
  for (const v of Object.keys(VOIES)) {
    const [a, b] = Object.keys(VOIES).filter((q) => q !== v);
    // deux places pour chacun des deux autres chemins, et pour chacun l'ordre de ses deux nombres
    const places = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]][Math.floor(r() * 6)];
    const motif = [0, 1, 2, 3].map((k) => (places.includes(k) ? a : b));
    const ordre = { [a]: r() < 0.5 ? [0, 1] : [1, 0], [b]: r() < 0.5 ? [0, 1] : [1, 0] }, vu = { [a]: 0, [b]: 0 };
    motifs[v] = motif;
    portes[v] = motif.map((q) => String(codes[q][ordre[q][vu[q]++]])).join('');
  }
  return { codes, motifs, portes };
}

export default {
  id: 'voies',
  carte: 'labo:voies',
  nom: 'Sanctuaire des Trois Voies',
  niveau: 'niv. 20 à 30',
  entree: 'Seul, on va plus vite. Ensemble, on va plus loin.',
  joueurs: { mode: 'exact', n: 3 },
  musique: 'tower',
  equipe: 'debut',
  exterieur,
  preparer,
  voies: VOIES,
  portesDecor: { 1: 'porte_grille' },
  objets: {
    // statues du trio des lacs, sur leur socle : Créhelf (Sagesse), Créfadet (Force), Créfollet (Courage)
    '<': { type: 'statue', decor: 'socle_statue', sp: 480 },
    '^': { type: 'statue', decor: 'socle_statue', sp: 482 },
    '>': { type: 'statue', decor: 'socle_statue', sp: 481 },
    P: { type: 'panneau', texte: 'Trois portes, trois épreuves, trois aventuriers.\nVos chemins se séparent ici, mais vos destins restent liés.' },
    Q: { type: 'panneau', texte: 'Certains d\'entre nous mentent toujours, les autres disent toujours vrai.\nTouchez ceux qui disent la vérité.' },
    Z: { type: 'voie', decor: 'porte_sagesse', voie: 's' },
    Y: { type: 'voie', decor: 'porte_force', voie: 'f' },
    W: { type: 'voie', decor: 'porte_courage', voie: 'c' },
    A: { type: 'menteur', decor: 'socle_statue', sp: 7, n: 0 },
    C: { type: 'menteur', decor: 'socle_statue', sp: 4, n: 1 },
    D: { type: 'menteur', decor: 'socle_statue', sp: 1, n: 2 },
    E: { type: 'menteur', decor: 'socle_statue', sp: 25, n: 3 },
    F: { type: 'menteur', decor: 'socle_statue', sp: 133, n: 4 },
    K: { type: 'parchemin', sol: true },
    H: { type: 'coffre', decor: 'coffre' },
    V: { type: 'porteCode', decor: 'porte_code' },
    L: { type: 'caisse', decor: 'caisse' },
    R: { type: 'levier', decor: 'console' },
    I: { type: 'interrupteur', sol: true, decor: 'interrupteur' },
    J: { type: 'porteMinute', decor: 'porte_grille' },
    '+': { type: 'ramasser', objet: 'super-potion', n: 2 },
    '*': { type: 'ramasser', objet: 'revive' },
  },
  pnj: {
    p: { id: 'f3-1', cls: 'Karatéka', nom: 'Bruno', sprite: 'karateka', dir: 'down', equipe: [[66, 21], [56, 21]] },
    q: { id: 'f3-2', cls: 'Karatéka', nom: 'Shin', sprite: 'karateka', dir: 'down', equipe: [[67, 23], [57, 22], [106, 23]] },
    B: {
      id: 'f3-gardien', cls: 'Gardien', nom: 'de la Force', sprite: 'karateka', dir: 'down', raid: true, espece: 68, niveau: 25,
      blocs: 3, immunite: 'physique', boost: 2,
      avant: ['Je suis le gardien de la Force.', 'Tant que mon premier bouclier tient, aucun coup physique ne m\'atteint.', 'Et chaque bouclier brisé me rendra plus fort !'],
      cri: 'Montre-moi ce que vaut ta force !', apres: 'Ta force est réelle. Le chemin est à toi.',
    },
    r: { id: 'c3-1', cls: 'Montagnard', nom: 'Anatole', sprite: 'montagnard', dir: 'down', equipe: [[74, 21], [95, 22]] },
    u: { id: 'c3-2', cls: 'Dompteuse', nom: 'Sacha', sprite: 'fillette2', dir: 'down', equipe: [[58, 22], [77, 22], [37, 23]] },
    ...pnj4(),
    x: { id: 'c5-1', cls: 'Sentinelle', nom: 'Bleue', sprite: 'vieil_homme', dir: 'down', toujours: true, trio: true, dit: 'Les sentinelles vous affronteront à trois contre trois... quand ce combat sera prêt. Passez, aventuriers.' },
    y: { id: 'c5-2', cls: 'Sentinelle', nom: 'Rouge', sprite: 'vieil_homme', dir: 'down', toujours: true, trio: true, dit: 'Les sentinelles vous affronteront à trois contre trois... quand ce combat sera prêt. Passez, aventuriers.' },
    z: { id: 'c5-3', cls: 'Sentinelle', nom: 'Verte', sprite: 'vieil_homme', dir: 'down', toujours: true, trio: true, dit: 'Les sentinelles vous affronteront à trois contre trois... quand ce combat sera prêt. Passez, aventuriers.' },
    M: {
      id: 'gardien-voies', cls: '', nom: 'Gardien des Trois Voies', sprite: 'vieil_homme', dir: 'down', raid: true, espece: 151, niveau: 30, blocs: 3,
      avant: ['Trois chemins, trois épreuves... et vous voilà réunis.', 'Voyons si ce lien tient face à moi.'],
      cri: 'Montrez-moi la force de votre lien !', apres: 'Votre lien est plus fort que mes trois boucliers. Le sanctuaire vous reconnaît.',
    },
  },
  salles: [
    { id: 's1', nom: 'Salle des Dalles', type: 'dalles', porte: '1', plan: [
      '###########',
      '#####N#####',
      '####111####',
      '##.......##',
      '##.......##',
      '##.o.o.o.##',
      '##.......##',
      '##.......##',
      '#####S#####',
      '#####D#####',
    ] },
    { id: 's2', nom: 'Salle des Trois Voies', type: 'voies', voies: { Z: 's3s', Y: 's3f1', W: 's3c1' }, plan: [
      '###########################',
      '####<Z<#####^Y^#####>W>####',
      '#.........................#',
      '#.........................#',
      '#.........................#',
      '#.........................#',
      '#...........<^>...........#',
      '#.........................#',
      '#.........................#',
      '#............P............#',
      '#.........................#',
      '#.........................#',
      '#############S#############',
      '#############D#############',
    ] },
    { id: 's3s', nom: 'Épreuve de la Sagesse', type: 'menteurs', voie: 's', porte: '1', parchemin: 1, apres: ['s2'], suivante: 's4s', plan: [
      '###################',
      '#########N#########',
      '########111########',
      '##.......K.......##',
      '##...............##',
      '##..A..C..D..E..F##',
      '##...............##',
      '##.......Q.......##',
      '##...............##',
      '##...............##',
      '#########S#########',
    ] },
    { id: 's3f1', nom: 'Épreuve de la Force', type: 'combat', voie: 'f', pnj: ['p', 'q'], apres: ['s2'], plan: [
      '###########',
      '#####N#####',
      '####...####',
      '####.q.####',
      '####...####',
      '####...####',
      '####.p.####',
      '####...####',
      '####...####',
      '#####S#####',
    ] },
    { id: 's3f2', nom: 'Gardien de la Force', type: 'raid', voie: 'f', pnj: ['B'], parchemin: 1, apres: ['s3f1'], suivante: 's4f', plan: [
      '#############',
      '######N######',
      '#####.K.#####',
      '##.........##',
      '##....B....##',
      '##.........##',
      '##.........##',
      '##.........##',
      '######S######',
      '######D######',
    ] },
    { id: 's3c1', nom: 'Épreuve du Courage', type: 'combat', voie: 'c', pnj: ['r'], apres: ['s2'], plan: [
      '###########',
      '#####N#####',
      '##r#.....##',
      '#...##L.L.#',
      '#..#.##.###',
      '#.....#L###',
      '#..#.....##',
      '###....#..#',
      '#....#.#..#',
      '#.....##.##',
      '####RS#####',
      '###########',
    ] },
    { id: 's3c2', nom: 'Couloir du Courage', type: 'combat', voie: 'c', pnj: ['u'], parchemin: 1, apres: ['s3c1'], suivante: 's4c', minuteur: 6, plan: [
      '###############',
      '#######N#######',
      '######.K.######',
      '######.u.######',
      '######...######',
      '#######J#######',
      '#.............#',
      '#.#############',
      '#.............#',
      '#############.#',
      '#.............#',
      '#.#############',
      '#.....I.......#',
      '#######S#######',
      '#######D#######',
    ] },
    { id: 's4s', nom: 'Salle des Codes (Sagesse)', type: 'combat', voie: 's', pnj: [...LETTRES4.s], parchemin: 2, apres: ['s3s'], suivante: 's5', plan: plan4('s') },
    { id: 's4f', nom: 'Salle des Codes (Force)', type: 'combat', voie: 'f', pnj: [...LETTRES4.f], parchemin: 2, apres: ['s3f2'], suivante: 's5', plan: plan4('f') },
    { id: 's4c', nom: 'Salle des Codes (Courage)', type: 'combat', voie: 'c', pnj: [...LETTRES4.c], parchemin: 2, apres: ['s3c2'], suivante: 's5', plan: plan4('c') },
    { id: 's5', nom: 'Couloir des Sentinelles', type: 'libre', apres: ['s4s', 's4f', 's4c'], plan: [
      '#########',
      '####N####',
      '###...###',
      '###.z.###',
      '###...###',
      '###.y.###',
      '###...###',
      '###.x.###',
      '###...###',
      '####S####',
    ] },
    { id: 's6', nom: 'Cœur du Sanctuaire', type: 'raid', pnj: ['M'], apres: ['s5'], plan: [
      '#############',
      '#...........#',
      '#.....M.....#',
      '#...........#',
      '#...........#',
      '#...........#',
      '######S######',
    ] },
  ],
  // menteurs de l'Épreuve de la Sagesse (dans l'ordre des statues A, C, D, E, F), vérifiés par les tests
  menteurs: {
    noms: ['Carapuce', 'Salamèche', 'Bulbizarre', 'Pikachu', 'Évoli'],
    paroles: [
      'Nous sommes exactement un à mentir.',
      'Entre Bulbizarre et Carapuce, un seul dit la vérité.',
      'Pikachu ou Carapuce ment, peut-être les deux.',
      'Bulbizarre ou Salamèche ment, peut-être les deux.',
      'Salamèche ment.',
    ],
    // la règle de chaque phrase, pour les tests : v = qui dit vrai
    regles: [
      (v) => v.filter((x) => !x).length === 1,
      (v) => v[2] !== v[0],
      (v) => !v[3] || !v[0],
      (v) => !v[2] || !v[1],
      (v) => !v[1],
    ],
    sinceres: [1, 2],
  },
  inscriptions: {
    s: ['Porte de la Sagesse.', 'Pour celui qui voit clair là où les autres se perdent. Ici, la force ne sert à rien.'],
    f: ['Porte de la Force.', 'Pour celui qui ne recule devant aucun adversaire. Ici, seule la puissance ouvre le chemin.'],
    c: ['Porte du Courage.', 'Pour celui qui avance sans savoir ce qui l\'attend. Ici, il faudra oser.'],
  },
  journal: [
    { id: 'dalles', nom: 'Les trois dalles', salle: 's1', but: 'Il faut un joueur sur chaque dalle en même temps.' },
    { id: 'voie', nom: 'Choisir sa voie', salle: 's2', but: 'Chacun prend une porte différente.' },
    { id: 'epreuve', nom: 'Ton épreuve', salle: 's2', but: 'Termine l\'épreuve de ton chemin.' },
    { id: 'codes', nom: 'La grande porte', salle: 's2', but: 'Bats les gardiens, ouvre le coffre avec tes deux nombres, puis trouve le code de la grande porte avec tes coéquipiers.' },
    { id: 'gardien', nom: 'Le Gardien des Trois Voies', salle: 's6', but: 'Retrouvez-vous et affrontez le gardien ensemble.' },
  ],
  textes: {
    masque: 'Une présence immense emplit la salle.',
    cri: 'Montrez-moi la force de votre lien !',
    apres: 'Le sanctuaire vous reconnaît.',
    perdu: ['Tes Pokémon n\'en peuvent plus...', 'Tu te réveilles à l\'entrée de la salle. Ton équipe a été soignée.'],
    victoire: 'Le sanctuaire vous reconnaît.',
  },
  recompense: { objets: { 'ct-abri': 1, 'relique-triforce': 1 } },
};
