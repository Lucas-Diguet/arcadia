// testodyssee/js/donjons/contes-maison.js — la maison de la vieille dame (Bois des Contes, Hansel et Gretel) : trois étages
// faits d'un long couloir droit, de haut en bas, avec cinq portes à gauche et cinq à droite ; chaque porte mène à une
// pièce, qui a sa propre carte. Les escaliers alternent : celui du haut d'un couloir arrive en haut du couloir du dessus,
// celui du bas arrive en bas. Les pièces se décident une par une (`PIECES`) ; les autres sont de petites pièces vides.
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
export const DEBARRAS = { cw: 24, ch: 14, graine: 0, verrous: [], arrivee: null };
/** le débarras : un labyrinthe de piles (une case sur deux), des meubles posés aux carrefours du bon chemin, qu'on pousse
 *  dans l'impasse d'en face ; tout au fond, en haut, le dernier casse-tête et le chaudron */
function debarras() {
  const { cw, ch } = DEBARRAS, W = cw * 2 + 1, H = ch * 2 + 1, PILES = 'wwnnccɓɓąkş';
  const DIR = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let graine = 1; graine < 400; graine++) {
    const R = alea(graine * 7919), g = Array.from({ length: H }, () => Array(W).fill('#'));
    const vu = new Set(['0,' + (ch - 1)]), pile = [[0, ch - 1]], parent = new Map();
    g[H - 2][1] = '.';
    while (pile.length) {
      // (une case prise tantôt au bout, tantôt au hasard : beaucoup de carrefours et de petites impasses)
      const ip = R() < 0.55 ? pile.length - 1 : Math.floor(R() * pile.length), [cx, cy] = pile[ip];
      const l = DIR.map(([dx, dy]) => [cx + dx, cy + dy, dx, dy]).filter(([x, y]) => x >= 0 && y >= 0 && x < cw && y < ch && !vu.has(x + ',' + y));
      if (!l.length) { pile.splice(ip, 1); continue; }
      const [x, y, dx, dy] = l[Math.floor(R() * l.length)];
      vu.add(x + ',' + y); parent.set(x + ',' + y, [cx, cy]); pile.push([x, y]);
      g[cy * 2 + 1 + dy][cx * 2 + 1 + dx] = '.'; g[y * 2 + 1][x * 2 + 1] = '.';
    }
    // le bon chemin : de l'entrée (en bas à gauche) à la case sous le casse-tête (en haut à droite)
    const but = [cw - 7, 0], chemin = [];
    for (let c = but; c; c = parent.get(c.join())) chemin.unshift(c);
    // les verrous : là où le chemin tourne et où, tout droit, part une autre allée (on y pousse le meuble)
    const ouvert = (x, y) => x > 0 && y > 0 && x < W - 1 && y < H - 1 && g[y][x] === '.';
    const verrous = [];
    for (let i = 1; i < chemin.length - 1; i++) {
      const [ax, ay] = chemin[i - 1], [bx, by] = chemin[i], [cx, cy] = chemin[i + 1], dx = bx - ax, dy = by - ay;
      if (cx - bx === dx && cy - by === dy) continue;
      const X = bx * 2 + 1, Y = by * 2 + 1, qx = X + 2 * dx, qy = Y + 2 * dy;
      if (!ouvert(X + dx, Y + dy) || !ouvert(qx, qy)) continue;
      if (verrous.length && i - verrous[verrous.length - 1].i < 5) continue;
      verrous.push({ i, X, Y, vers: [X + dx, Y + dy] });
    }
    if (verrous.length < 6) continue;
    const garde = verrous.slice(0, 8);
    garde.forEach(({ X, Y }, k) => { g[Y][X] = 'ⒶⓁⓉⓍ'[k % 4]; });
    // les piles de vieilleries
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (g[y][x] === '#') g[y][x] = PILES[Math.floor(R() * PILES.length)];
    g[H - 2][1] = 'S';
    // le casse-tête du fond, au-dessus de la case d'arrivée
    const ox = but[0] * 2 + 1, large = NOEUD_DEBARRAS[0].length;
    const haut = NOEUD_DEBARRAS.map((r) => '#'.repeat(ox) + r.replace('S', '.') + '#'.repeat(W - ox - large));
    // (pour les tests : chaque verrou et la case où on le pousse, dans les coordonnées du plan)
    const dy0 = 2 + NOEUD_DEBARRAS.length;
    DEBARRAS.graine = graine; DEBARRAS.verrous = garde.map(({ X, Y, vers }) => [X, Y + dy0, vers[0], vers[1] + dy0]); DEBARRAS.arrivee = [ox, 2 + NOEUD_DEBARRAS.length];
    return ['#'.repeat(W), '#'.repeat(W), ...haut, '#'.repeat(ox) + '.' + '#'.repeat(W - ox - 1), ...g.slice(1, H - 1).map((r) => r.join('')), '#Φ' + '#'.repeat(W - 2)];
  }
  throw new Error('débarras : pas de labyrinthe');
}

/** le jardin : la porte de la cuisine en haut, le bûcher et le puits à gauche, le potager à droite */
function jardin() {
  const W = 48, H = 24, g = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (y === 0 || y === H - 1 || x < 2 || x >= W - 2 ? '#' : '.')));
  const pose = (x, y, c) => { g[y][x] = c; };
  pose(10, 0, 'Ρ'); pose(10, 1, 'S');
  for (let y = 2; y < 10; y++) { pose(10, y, ':'); pose(11, y, ':'); }
  pose(4, 5, 'Ⓑ'); pose(6, 12, 'Ⓦ');
  for (const [x, y] of [[2, 1], [45, 1], [2, 22], [45, 22], [3, 16], [14, 20]]) pose(x, y, 'Y');
  for (const [x, y] of [[6, 2], [15, 3], [3, 9], [9, 16], [13, 13], [5, 20], [16, 8]]) pose(x, y, 'f');
  // le potager : deux blocs séparés par cinq colonnes d'herbe ; dans chacun, trois rangs de dix légumes séparés par un rang de
  // terre, trois rangs d'herbe, puis trois autres rangs
  const champ = (x0, y0, c) => { for (let r = 0; r < 5; r++) for (let x = 0; x < 10; x++) pose(x0 + x, y0 + r, r % 2 ? ':' : c); };
  champ(20, 5, 'ⓒ'); champ(20, 13, 'ⓘ');
  champ(35, 5, 'ⓟ'); champ(35, 13, 'ⓞ');
  return g.map((r) => r.join(''));
}

/** un couloir : l'escalier (ou la porte) du haut, celui du bas, cinq portes de chaque côté */
function couloir(haut, bas, portes) {
  const r = ['#####', '#####', `#.${haut}.#`, '#...#'];
  for (let i = 0; i < 5; i++) r.push(`${portes[i]}...${portes[5 + i]}`, '#...#', '#...#', '#...#');
  r.push('#.S.#', `#.${bas}.#`, '#####');
  return r;
}

const VIDE = ['#########', '#########', '##.....##', '##.....##', '##.....##', '##..S..##', '####◘####'];
/** les pièces décidées : étage, côté (g ou d), rang depuis le haut du couloir (0 à 4) */
const PIECES = [
  { etage: 1, cote: 'g', rang: 4, id: 'gm', nom: 'Chambre de la vieille dame', plan: [
    '###############', '###############',
    '##ƒ.ą..ʙ..ṽ.k##',
    '##...........##',
    '##.ç.p.......##',
    '##.........ç.##',
    '##ṽ.......p.ş##',
    '##.....S.....##',
    '#######◘#######',
  ] },
  { etage: 1, cote: 'd', rang: 4, id: 'd', nom: 'Débarras', meubles: true, sombre: true, plan: debarras() },
  { etage: 2, cote: 'g', rang: 0, id: 'eg', nom: 'Chambre de garçon', plan: [
    '#############', '#############',
    '##ʙ..ş..ʗ.k##',
    '##.........##',
    '##.ʘ.....p.##',
    '##.....ʘ...##',
    '##....S....##',
    '######◘######',
  ] },
  { etage: 2, cote: 'd', rang: 0, id: 'ef', nom: 'Chambre de fille', plan: [
    '#############', '#############',
    '##ʙ..ą..ṽ.ʚ##',
    '##.........##',
    '##.ʞ.....p.##',
    '##......ʚ..##',
    '##....S....##',
    '######◘######',
  ] },
  { etage: 3, cote: 'g', rang: 2, id: 'bib', nom: 'Bibliothèque', plan: [
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
      const cote = i < 5 ? 'g' : 'd', rang = i % 5, P = PIECES.find((q) => q.etage === e && q.cote === cote && q.rang === rang);
      const a = String.fromCharCode(n++), b = String.fromCharCode(n++), id = P ? `hg${P.id}` : `hg${e}${'abcdefghij'[i]}`;
      portes.push(a);
      objets[a] = { type: 'lien', sol: true, vers: id, cible: b }; objets[b] = { type: 'lien', sol: true, vers: `hg${e + 1}`, cible: a };
      pieces.push({ id, nom: `${NOM} — ${P ? P.nom : 'Petite pièce'}`, type: 'libre', conte: 'hg', ...(P?.meubles ? { meubles: true } : {}), ...(P?.sombre ? { sombre: true } : {}),
        plan: (P ? P.plan : VIDE).map((r) => r.replace('◘', b).replace('Φ', b)) });
    }
    salles.push({ id: `hg${e + 1}`, nom: `${NOM} — ${RANG[e - 1]} étage`, type: 'libre', conte: 'hg', plan: couloir(HAUT[e], BAS[e], portes) }, ...pieces);
  }
  return { salles, objets, jardin: jardin() };
}
