// testodyssee/js/donjons/contes-maison.js — la maison de la vieille dame (Bois des Contes, Hansel et Gretel) : trois étages
// faits d'un long couloir droit, de gauche à droite (style manoir : tapis rouge, tapisseries et portraits), avec dix portes
// dans le mur du fond ; chaque porte mène à une pièce, au-dessus du couloir, qui a sa propre carte (sa porte dans le mur du bas). Les escaliers alternent : celui de gauche d'un couloir arrive à gauche du couloir du dessus,
// celui de droite arrive à droite. Les pièces se décident une par une (`PIECES`) ; les autres sont de petites pièces vides.
// Le débarras est immense et sombre : un labyrinthe de piles de vieilleries, des meubles à pousser, le chaudron au fond.
// Le jardin : le bûcher, le puits, et le potager (carottes et citrouilles, pommes de terre et oignons).

const alea = (g) => () => { g = (g * 1103515245 + 12345) & 0x7fffffff; return g / 0x7fffffff; };
const NOM = 'Maison de la vieille dame';

/** le casse-tête du fond du débarras : 9 poussées au mieux (vérifié par les tests) */
export const NOEUD_DEBARRAS = [
  'Ⓛ...ⓉⓉ..c...Ⓗ',
  'cn.n.n.n.w.w.',
  '.Ⓐ...Ⓛ.......',
  '.wⓉwⓉw.w.n.n.',
  'Ⓐ.....ⓉⒶ.Ⓐ..Ⓐ',
  '.w.n.ncw.wcnc',
  'S.c..Ⓢ...Ⓣ...',
];
/** trois barrages de bric-à-brac (13 × 7, bord compris) : on entre par S en bas, on sort par E en haut ; les meubles
 *  Ⓚ Ⓡ Ⓢ Ⓜ Ⓧ Ⓣ se poussent avec Force, le reste est fixe (trouvés par recherche, vérifiés par les tests) */
export const BARRAGES = [
  [
    '#########E###',
    '#.Ⓚ.Ⓧ......c#',
    '#....ɓ.w.ṽ.n#',
    '#.ɓ.Ⓧw..ą..ɓ#',
    '#n..Ⓢ.wɓ.ɓⓂ.#',
    '#Ⓣ.Ⓣ.Ⓡ..cnwⓈ#',
    '####S########',
  ],
  [
    '#########E###',
    '#.n...Ⓜ.....#',
    '#Ⓜ...Ⓢc.ṽc..#',
    '#.Ⓣṽw..şṽąş.#',
    '#Ⓧ...Ⓡ..nɓ.w#',
    '#şṽ.........#',
    '#####S#######',
  ],
  [
    '##E##########',
    '#Ⓣ...wnş.şⓈṽ#',
    '#ɓ..c.Ⓡ.ąɓṽş#',
    '#ṽɓ...Ⓡ.nⓈąⓀ#',
    '#...ⓀⓂ.Ⓚą.c.#',
    '#ą...c.Ⓡ....#',
    '##########S##',
  ],
];
/** où sont posés les barrages et le nœud du fond, et ce que vérifient les tests (coordonnées du plan) */
export const DEBARRAS = { iw: 45, barrages: [], noeud: null, entree: null, chaudron: null };
/** le débarras : une immense pièce encombrée, du bas vers le haut ; quatre allées séparées par des murs de vieilleries
 *  (malles, caisses, armoires, miroirs, tableaux, étagères) ; chaque mur n'a qu'un passage, bouché par des meubles à
 *  pousser ; tout au fond, le dernier casse-tête et le chaudron. Dans les allées, des meubles qu'on peut pousser pour rien. */
function debarras() {
  const IW = DEBARRAS.iw, W = IW + 4, MUR = 'wnccɓɓąşṽɰŧkyw', DECO = 'wncɓąşṽɰŧykçƟʘ', LIBRE = 'ⓀⓇⓈⓂ';
  for (let graine = 1; graine < 500; graine++) {
  const R = alea(graine * 4243);
  const ligne = () => Array(W).fill('#');
  const rangee = (f) => { const l = ligne(); for (let x = 2; x < W - 2; x++) l[x] = f(x); return l; };
  const plein = () => rangee(() => MUR[Math.floor(R() * MUR.length)]);
  const g = [ligne(), ligne()];
  // le nœud du fond (le chaudron), dans un mur de vieilleries
  const nx = 30;
  NOEUD_DEBARRAS.forEach((r) => { const l = plein(); [...r].forEach((c, i) => { l[nx + i] = c === 'S' ? '.' : c; }); g.push(l); });
  DEBARRAS.noeud = { x: nx, y: 2 };
  { const l = plein(); l[nx] = '.'; g.push(l); }
  // allées et barrages, de haut en bas
  const allee = (h) => { for (let k = 0; k < h; k++) g.push(rangee(() => { const r = R(); return r < 0.12 ? DECO[Math.floor(R() * DECO.length)] : r < 0.16 ? LIBRE[Math.floor(R() * LIBRE.length)] : '.'; })); };
  const POS = [10, 28, 4];
  [2, 1, 0].forEach((i) => {
    allee(5);
    const B = BARRAGES[i], bx = POS[i], y0 = g.length;
    B.forEach((r, j) => { const l = plein(); [...r].forEach((c, k) => { l[bx + k] = c === '#' ? MUR[Math.floor(R() * MUR.length)] : c === 'E' || c === 'S' ? '.' : c; }); g.push(l); });
    DEBARRAS.barrages[i] = { x: bx, y: y0 };
  });
  allee(6);
  const sx = 2 + (IW >> 1);
  g.push(ligne()); g[g.length - 2][sx] = 'S'; g[g.length - 1][sx] = 'Φ';
  DEBARRAS.entree = [sx, g.length - 2];
  // chaque allée mène du passage d'en bas à celui d'en haut sans rien pousser (les meubles des allées comptent comme des murs)
  const va = ([x0, y0], [x1, y1]) => {
    const vu = new Set([x0 + ',' + y0]), f = [[x0, y0]];
    while (f.length) { const [x, y] = f.pop(); if (x === x1 && y === y1) return true; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = x + dx, b = y + dy, k = a + ',' + b; if (vu.has(k) || !g[b] || (g[b][a] !== '.' && !(a === x1 && b === y1))) continue; vu.add(k); f.push([a, b]); } }
    return false;
  };
  const porte = (i, c) => { const B = BARRAGES[i], { x, y } = DEBARRAS.barrages[i], j = B.findIndex((r) => r.includes(c)); return [x + B[j].indexOf(c), y + j]; };
  const etapes = [[DEBARRAS.entree, porte(0, 'S')], [porte(0, 'E'), porte(1, 'S')], [porte(1, 'E'), porte(2, 'S')], [porte(2, 'E'), [nx, 2 + NOEUD_DEBARRAS.length]]];
  if (!etapes.every(([a, b]) => va(a, b))) { DEBARRAS.barrages = []; continue; }
  DEBARRAS.etapes = etapes;
  return g.map((l) => l.join(''));
  }
  throw new Error('débarras : pas de plan');
}

/** le jardin : la porte de la cuisine en haut, le bûcher et le puits à gauche, le potager à droite */
function jardin() {
  const W = 48, H = 24, g = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (y === 0 || y === H - 1 || x < 2 || x >= W - 2 ? '#' : '.')));
  const pose = (x, y, c) => { g[y][x] = c; };
  pose(10, 0, 'Ρ'); pose(10, 1, 'S');
  for (let y = 2; y < 10; y++) { pose(10, y, '⁚'); pose(11, y, '⁚'); }
  pose(4, 5, 'Ⓑ'); pose(6, 12, 'Ⓦ');
  for (const [x, y] of [[2, 1], [45, 1], [2, 22], [45, 22], [3, 16], [14, 20]]) pose(x, y, 'Y');
  for (const [x, y] of [[6, 2], [15, 3], [3, 9], [9, 16], [13, 13], [5, 20], [16, 8]]) pose(x, y, 'f');
  // le potager : deux blocs séparés par cinq colonnes d'herbe ; dans chacun, trois rangs de dix légumes séparés par un rang de
  // terre, trois rangs d'herbe, puis trois autres rangs
  const champ = (x0, y0, c) => { for (let r = 0; r < 5; r++) for (let x = 0; x < 10; x++) pose(x0 + x, y0 + r, r % 2 ? '⁚' : c); };
  champ(20, 5, 'ⓒ'); champ(20, 13, 'ⓘ');
  champ(35, 5, 'ⓟ'); champ(35, 13, 'ⓞ');
  return g.map((r) => r.join(''));
}

/** un couloir horizontal : l'escalier de gauche, celui de droite, dix portes dans le mur du fond (on les ouvre en leur
 *  faisant face) ; entre les portes, des tapisseries et des portraits */
function couloir(gauche, droite, portes) {
  const W = 45, haut = Array(W).fill('#');
  portes.forEach((c, i) => { haut[4 + i * 4] = c; });
  for (let i = 0; i < 11; i++) haut[2 + i * 4] = i % 2 ? 'Ʊ' : 'Ƭ';
  return ['#'.repeat(W), haut.join(''), '#Ƥ' + '.'.repeat(W - 4) + 'Ƥ#', `#${gauche}${'.'.repeat(W - 5)}S${droite}#`, '#' + '.'.repeat(W - 2) + '#', '#'.repeat(W)];
}
/** le tapis du couloir : de l'escalier de gauche à celui de droite */
const TAPIS_COULOIR = [[2, 3, 41, 3]];

// plans des pièces : ◘ la porte, dans le mur du bas (les pièces sont au-dessus du couloir) ; S juste au-dessus
const VIDE = ['#########', '#########', '##.....##', '##.....##', '##..S..##', '####◘####'];
/** les pièces décidées : étage, rang de la porte depuis la gauche (0 à 9) */
const PIECES = [
  { etage: 1, rang: 9, id: 'gm', nom: 'Chambre de la vieille dame', plan: [
    '###############', '###############',
    '##ƒ.ą..ʙ..ṽ.k##',
    '##...........##',
    '##.ç.p.......##',
    '##...........##',
    '##ṽ.......p..##',
    '##.ş...S.....##',
    '#######◘#######',
  ] },
  { etage: 1, rang: 4, id: 'd', nom: 'Débarras', meubles: true, sombre: true, style: 'manoir', plan: debarras() },
  { etage: 2, rang: 0, id: 'eg', nom: 'Chambre de garçon', plan: [
    '#############', '#############',
    '##ʙ..ş..ʗ.k##',
    '##.........##',
    '##.ʘ.......##',
    '##.....ʘ.p.##',
    '##....S....##',
    '######◘######',
  ] },
  { etage: 2, rang: 5, id: 'ef', nom: 'Chambre de fille', plan: [
    '#############', '#############',
    '##ʙ..ą..ṽ.ʚ##',
    '##.........##',
    '##.ʞ.......##',
    '##....ʚ..p.##',
    '##....S....##',
    '######◘######',
  ] },
  { etage: 3, rang: 2, id: 'bib', nom: 'Bibliothèque', plan: [
    '#############################', '#############################',
    '##kkkkkkkkkkkkkkkkkkkkkkkkk##',
    '##.........................##',
    '##.kkkk.kkkk.....kkkk.kkkk.##',
    '##.........................##',
    '##.kkkk.kkkk..p..kkkk.kkkk.##',
    '##...........ç.ç...........##',
    '##.kkkk.kkkk..p..kkkk.kkkk.##',
    '##.........................##',
    '##.kkkk.kkkk.....kkkk.kkkk.##',
    '##.........................##',
    '##ş...........S...........ş##',
    '##############◘##############',
  ] },
];

/** les salles et les passages de la maison, à ajouter au donjon */
export function maison() {
  const salles = [], objets = {};
  let n = 0x2500;
  const HAUT = { 1: 'η', 2: 'Η', 3: 'σ' }, BAS = { 1: 'Ζ', 2: 'θ', 3: 'Θ' }, RANG = ['Premier', 'Deuxième', 'Troisième'];
  for (let e = 1; e <= 3; e++) {
    const portes = [], pieces = [];
    for (let i = 0; i < 10; i++) {
      const P = PIECES.find((q) => q.etage === e && q.rang === i);
      const a = String.fromCharCode(n++), b = String.fromCharCode(n++), id = P ? `hg${P.id}` : `hg${e}${'abcdefghij'[i]}`;
      portes.push(a);
      objets[a] = { type: 'lien', mur: true, tenture: 'porte', porte: true, vers: id, cible: b }; objets[b] = { type: 'lien', sol: true, vers: `hg${e + 1}`, cible: a };
      pieces.push({ id, nom: `${NOM} — ${P ? P.nom : 'Petite pièce'}`, type: 'libre', conte: 'hg', ...(P?.style ? { style: P.style } : {}), ...(P?.meubles ? { meubles: true } : {}), ...(P?.sombre ? { sombre: true } : {}),
        plan: (P ? P.plan : VIDE).map((r) => r.replace('◘', b).replace('Φ', b)) });
    }
    salles.push({ id: `hg${e + 1}`, nom: `${NOM} — ${RANG[e - 1]} étage`, type: 'libre', conte: 'hg', style: 'manoir', tapis: TAPIS_COULOIR, plan: couloir(HAUT[e], BAS[e], portes) }, ...pieces);
  }
  return { salles, objets, jardin: jardin() };
}
