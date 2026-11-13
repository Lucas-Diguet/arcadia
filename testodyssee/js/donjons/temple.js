// testodyssee/js/donjons/temple.js — le Temple des Éléments : deux donjons derrière un même hall.
//
// Le Grand Hall : des dresseurs qui se préparent, un vieil homme qui explique le temple, et deux portes.
//   À gauche, la Salle des Dalles : trois joueurs sur les trois dalles ouvrent la petite porte, le temple à trois
//   (niveaux 20 à 30). À droite, un moine ne laisse passer que les dresseurs à 10 badges : la Salle de la Dalle d'Or
//   et sa grande porte, le temple en solo (niveaux 50 à 65).
// À trois : la Salle des Trois Portes (Feu, Eau, Plante ; chaque porte ne laisse passer qu'un joueur), un chemin par
//   joueur, une clé au bout de chacun ; les chemins se rejoignent dans la Salle des Clés, dont la porte s'ouvre avec
//   les trois clés. Le Gardien des Éléments se bat à trois contre trois (ses trois singes, puis Tauros et ses cinq
//   blocs de vie quand ils sont tous K.O.), et derrière lui, une table et trois Poké Balls.
// En solo : les mêmes salles, mais reliées entre elles. Les trois portes sont ouvertes ; trois passages secrets (des
//   grottes au bord des premières salles) font passer d'un chemin à l'autre (`bouches`), et chaque sortie des
//   premières et deuxièmes salles a un verrou qui demande ce qu'on trouve au fond de la salle de même rang d'un autre
//   chemin (`verrou`, `recoins`) : on avance dans les trois chemins à la fois, dans l'ordre qu'on veut. Derrière le
//   Gardien, trois CT à usage unique pour un starter, dont on ne prend qu'une.
//
// Chaque chemin a ses grandes salles (temple-chemins.js, dessinées par tools/temple-chemins.py), avec leurs dresseurs :
//   Feu : barrières, interrupteurs et rochers à pousser sur un long trajet ; Eau : un labyrinthe de bassins et de
//   rivières qui emportent le surfeur ; Plante : un labyrinthe de haies, des ronces et l'arbuste d'où elles viennent.
import { GameMap, rng } from '../../../odyssee/js/world/mapgen.js';
import { T } from '../../../odyssee/js/world/tiles.js';
import { TEMPLE } from '../formes.js';
import { F1, F2, F3, E1, E2, E3, E4, P1, P2, P3 } from './temple-chemins.js';

const CHEMINS = { f: 'Feu', e: 'Eau', p: 'Plante' };

function exterieur() {
  const m = new GameMap('labo:temple:dehors', 32, 26, { outdoor: true, fill: T.TREE, name: 'Parvis du Temple', music: 'route' });
  m.blob(16, 13, 12.5, 10, T.GRASS, rng(4242));
  m.rect(5, 3, 26, 22, T.GRASS, [T.TREE]);
  const b = m.building('gym', 12, 4, { roof: 'red', name: 'Temple des Éléments' });
  for (let y = b.doorY + 1; y <= 23; y++) m.set(b.doorX, y, T.PATH);
  m.rect(b.doorX - 1, b.doorY + 1, b.doorX + 1, b.doorY + 2, T.PATH);
  // trois bassins : la lave, l'eau, les fleurs
  m.rect(6, 12, 9, 15, T.LAVA); m.rect(22, 12, 25, 15, T.WATER); m.rect(7, 18, 10, 20, T.FLOWER, [T.GRASS]); m.rect(21, 18, 24, 20, T.FLOWER, [T.GRASS]);
  for (const [x, y] of [[11, 10], [20, 10]]) m.prop('lanterne', x, y);
  m.zone(0, 0, 31, 25, { name: 'Parvis du Temple', music: 'route' });
  return { carte: m, porte: [b.doorX, b.doorY] };
}

// chemins : x et z sont deux recoins (rien à trois, des passages et des objets en solo) ; une sortie D sous l'arrivée
// ramène à la salle d'avant
const retour = (plan) => { const i = plan[plan.length - 1].indexOf('S'); return [...plan, '#'.repeat(i) + 'D' + '#'.repeat(plan[0].length - i - 1)]; };
const [F1r, F2r, F3r, E1r, E2r, E3r, E4r, P1r, P2r, P3r] = [F1, F2, F3, E1, E2, E3, E4, P1, P2, P3].map(retour);

// Le solo : trois passages secrets, chacun de la première salle d'un chemin à la deuxième d'un autre (Plante 1 et Eau 2,
// Eau 1 et Feu 2, Feu 1 et Plante 2), dans les deux sens. Chaque bout est une sortie de grotte percée dans un mur, comme
// les autres, du côté de la salle qui fait face à l'autre chemin (la Plante est à droite, l'Eau au milieu, le Feu à
// gauche). Il part d'un endroit qu'on atteint dès l'entrée de la salle, sans rien résoudre, et n'ouvre aucun autre
// passage. Côté Plante 1 : un petit lac où l'on surfe ; côté Eau 1 : un creux où l'eau s'est évaporée, roche rougie ;
// côté Feu 1 : un tunnel de roche grise ; côté Eau 2 : la verdure de la Plante ; ailleurs, une sortie toute simple.
const MURS_SOLO = '#YuL%&';
const VERDURE = ['Y', 'u', 'Y'];
/** ce qu'on atteint depuis l'arrivée sans rien résoudre (à pied, en surfant, emporté par les rivières) */function atteignables(P, rivieres = Infinity) {
  const at = (x, y) => P[y]?.[x] ?? '#', TERRE = '.SNKxzI"fh=', EAU = '~<>()', DIRV = { '<': [-1, 0], '>': [1, 0], '(': [0, -1], ')': [0, 1] };
  const sy = P.findIndex((r) => r.includes('S')), S = [P[sy].indexOf('S'), sy], rang = new Map([[S.join(), 0]]), f = [S];
  for (let i = 0; i < f.length; i++) {
    const [x, y] = f[i], r0 = rang.get(f[i].join());
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      let n = [x + dx, y + dy], r = r0;
      const c = at(...n);
      if (!TERRE.includes(c) && !EAU.includes(c)) continue;
      if (DIRV[c]) r++;
      for (let k = 0; k < 400 && DIRV[at(...n)]; k++) { const [ax, ay] = DIRV[at(...n)], m = [n[0] + ax, n[1] + ay]; if (!EAU.includes(at(...m))) break; n = m; }
      if (r > rivieres || (rang.has(n.join()) && rang.get(n.join()) <= r)) continue;
      rang.set(n.join(), r); f.push(n);
    }
  }
  return new Set(rang.keys());
}
/** la salle vue dans un miroir (gauche et droite échangées, rivières comprises) */
const MIROIR = { '<': '>', '>': '<' };
export const miroir = (plan) => plan.map((r) => [...r].reverse().map((c) => MIROIR[c] || c).join(''));
/** perce le passage secret d'une salle du solo : { cote, mode : 'porte' | 'lac' | 'sec', long, decor, teinte } →
 *  { plan, bouche: { x, y, devant, garde }, teintes, miroir } ; la salle est retournée si elle s'y prête mieux à l'envers */
export function creuserBouche(plan, spec) {
  // d'abord tout près de l'arrivée (une rivière au plus, dans l'Eau), puis un peu plus loin, et la salle à l'envers
  for (const bord of [0.4, 1]) for (const rivieres of [1, 2, 3]) for (const m of [false, true]) {
    try { return { ...creuser(m ? miroir(plan) : plan, spec, rivieres, bord), miroir: m }; } catch (e) { /* on essaie autrement */ }
  }
  throw new Error(`Temple : pas de place pour le passage secret (${spec.mode}, ${spec.cote})`);
}
function creuser(plan, { cote, mode = 'porte', long = 1, decor, teinte }, rivieres, bord) {
  const P = plan.map((r) => [...r]), H = P.length, W = P[0].length, at = (x, y) => P[y]?.[x] ?? '#';
  const mur = (x, y) => MURS_SOLO.includes(at(x, y)), vus = atteignables(plan, rivieres), K = (x, y) => x + ',' + y;
  const PIED = '.SNxz"fh=', depart = [...vus].map((k) => k.split(',').map(Number)).filter(([x, y]) => y > 3 && y < H - 4 && (PIED + '~').includes(at(x, y)));
  const pres = ([x]) => (cote === 'gauche' ? x : W - 1 - x);
  depart.splice(0, depart.length, ...depart.filter((c) => pres(c) <= W * bord));
  depart.sort((a, b) => pres(a) - pres(b) || a[1] - b[1]);
  const murs = (cases, sauf) => cases.every(([x, y]) => mur(x, y) || sauf.has(K(x, y)));
  const anneau = (cases) => { const C = new Set(cases.map(([x, y]) => K(x, y))), A = []; for (const [x, y] of cases) for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (!C.has(K(x + i, y + j))) A.push([x + i, y + j]); return A; };
  let best = null;
  for (const f of depart) {
    if (best && pres(f) > best.pres + 2) break;
    if (mode === 'porte') {
      // une porte au fond d'un couloir qui monte dans la roche, juste au-dessus de f
      const col = Array.from({ length: long + 1 }, (_, i) => [f[0], f[1] - 1 - i]);
      if (!murs(col, new Set()) || !murs(anneau(col).filter(([x, y]) => !(x === f[0] && y === f[1]) && y <= f[1] - 1), new Set())) continue;
      const porte = col[col.length - 1];
      best = { pres: pres(f), creux: col.slice(0, -1), porte, devant: col.length > 1 ? col[col.length - 2] : f, garde: col.length > 1 ? col[0] : null, f };
      break;
    }
    // un lac (ou un creux asséché) derrière une case de rive s, la porte au-dessus, une case de sol devant elle
    const tailles = mode === 'lac' ? [[7, 4], [6, 5], [8, 4], [6, 4], [8, 3], [7, 3]] : [[4, 3], [3, 3], [4, 2], [3, 2]];
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, 1], [0, -1]]) {
      const sh = [f[0] + dx, f[1] + dy]; if (!mur(...sh)) continue;
      for (const [w, h] of tailles) for (let o = 0; o < (dx ? h : w); o++) {
        const x0 = dx < 0 ? sh[0] - w : dx > 0 ? sh[0] + 1 : sh[0] - o, y0 = dy > 0 ? sh[1] + 1 : dy < 0 ? sh[1] - h : sh[1] - o;
        const lac = []; for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) lac.push([x, y]);
        const dc = x0 + (w >> 1), quai = [dc, y0 - 1], porte = [dc, y0 - 2];
        const tout = [...lac, quai, porte, sh], sauf = new Set([K(...f)]);
        if (x0 < 1 || x0 + w > W - 1 || y0 < 4 || y0 + h > H - 2 || !murs(tout, new Set())) continue;
        // tout autour, de la roche (la case de rive mise à part : elle touche f, et ses deux côtés restent du mur)
        const cote2 = dx ? [[sh[0], sh[1] - 1], [sh[0], sh[1] + 1]] : [[sh[0] - 1, sh[1]], [sh[0] + 1, sh[1]]];
        if (!murs(cote2, new Set()) || !murs(anneau([...lac, quai, porte]).filter(([x, y]) => !(x === sh[0] && y === sh[1])), sauf)) continue;
        if (!best || pres(f) < best.pres) best = { pres: pres(f), lac, quai, porte, sh, f, devant: quai, garde: sh };
        break;
      }
      if (best?.f === f) break;
    }
    if (best?.f === f) break;
  }
  if (!best) throw new Error(`Temple : pas de place pour le passage secret (${mode}, ${cote})`);
  const sol = mode === 'sec' ? 'à' : '~';
  if (best.lac) { for (const [x, y] of best.lac) P[y][x] = sol; P[best.quai[1]][best.quai[0]] = mode === 'sec' ? 'à' : '.'; P[best.sh[1]][best.sh[0]] = mode === 'sec' ? 'à' : '.'; }
  for (const [x, y] of best.creux || []) P[y][x] = '.';
  P[best.porte[1]][best.porte[0]] = 'ç';
  // autour de la porte : un peu de verdure, ou une roche d'une autre couleur
  const autour = []; for (let j = -2; j <= 1; j++) for (let i = -2; i <= 2; i++) autour.push([best.porte[0] + i, best.porte[1] + j]);
  for (const [x, y] of best.creux || []) for (const i of [-1, 1]) autour.push([x + i, y]);
  for (const [x, y] of best.lac ? [...best.lac, best.quai] : []) for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) autour.push([x + i, y + j]);
  const teintes = [];
  let n = 0;
  for (const [x, y] of autour) {
    if (at(x, y) !== '#' || P[y][x] !== '#') continue;
    if (decor) P[y][x] = decor[n++ % decor.length];
    if (teinte) teintes.push([x, y, teinte]);
  }
  return { plan: P.map((r) => r.join('')), bouche: { x: best.porte[0], y: best.porte[1], devant: best.devant, garde: best.garde }, teintes };
}
// les six bouts : chemin, rang de la salle, plan, comment le percer, et ce qui le garde (côté salle 1 seulement)
const BOUTS = {
  p1: { plan: P1r, spec: { cote: 'gauche', mode: 'lac' }, garde: { type: 'ronces', objet: 'braise' } },
  e2: { plan: E2r, spec: { cote: 'droite', mode: 'porte', decor: VERDURE } },
  e1: { plan: E1r, spec: { cote: 'gauche', mode: 'sec', teinte: 'magma' }, garde: { type: 'vapeur', objet: 'graine' } },
  f2: { plan: F2r, spec: { cote: 'droite', mode: 'porte' } },
  f1: { plan: F1r, spec: { cote: 'droite', mode: 'porte', long: 3, teinte: 'grotte' }, garde: { type: 'flammes', objet: 'fiole' } },
  p2: { plan: P2r, spec: { cote: 'gauche', mode: 'porte' } },
};
const PAIRES = [['p1', 'e2'], ['e1', 'f2'], ['f1', 'p2']];
const SOLO = Object.fromEntries(Object.entries(BOUTS).map(([k, B]) => [k, creuserBouche(B.plan, B.spec)]));
for (const [a, b] of PAIRES) for (const [u, v] of [[a, b], [b, a]]) Object.assign(SOLO[u].bouche, { vers: 's' + v, genre: { p1: 'lac', e1: 'sec', f1: 'tunnel' }[a] || 'porte' }, BOUTS[u].garde ? { verrou: BOUTS[u].garde } : {});
const solo = (k) => ({ plan: SOLO[k].plan, miroir: SOLO[k].miroir, teintes: SOLO[k].teintes, bouches: [SOLO[k].bouche] });

// le Grand Hall : deux portes en haut (e : la Salle des Dalles, p : le temple en solo, gardé par le moine @),
// le vieil homme ! près de l'entrée, des dresseurs qui se préparent
const HALL = (() => {
  const w = 35, h = 17, g = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => (y === 0 || y >= h - 2 || x === 0 || x === w - 1 || y === 1 ? '#' : '.')));
  const pose = (x, y, c) => { g[y][x] = c; };
  pose(5, 1, 'e'); pose(29, 1, 'p'); pose(29, 2, '@');
  pose(17, h - 2, 'S'); pose(17, h - 1, 'D'); pose(15, h - 4, '!');
  for (const [x, y] of [[3, 4], [31, 4], [3, 11], [31, 11], [11, 4], [23, 4], [11, 11], [23, 11]]) pose(x, y, '&');
  // au centre, les statues des trois starters de Kanto, en triangle : Tortank en haut, Dracaufeu et Florizarre en bas
  pose(17, 6, '`'); pose(14, 9, '{'); pose(20, 9, '}');
  for (const [x, y, c] of [[7, 5, '$'], [13, 7, ':'], [20, 6, ';'], [26, 8, ','], [9, 10, '/'], [22, 12, '_'], [28, 12, '?']]) pose(x, y, c);
  return g.map((r) => r.join(''));
})();
// la Salle des Clés : la porte aux trois gemmes
const CLES = (solo) => [
  '###############',
  '#######N#######',
  '######QQQ######',
  '##...........##',
  '#.............#',
  '#.............#',
  '#.............#',
  '#.............#',
  '##...........##',
  '#######S#######',
];
// la salle du Gardien : la table derrière lui
const GARDIEN = (table, boss) => [
  '###############',
  '#.............#',
  table,
  '#.............#',
  `#......${boss}......#`,
  '#.............#',
  '#.............#',
  '#.............#',
  '##...........##',
  '#######S#######',
];
const PORTES = (a, b, c) => [
  '#######################',
  `###${a}#######${b}#######${c}###`,
  '#.....................#',
  '#.....................#',
  '#.....................#',
  '#.....................#',
  '#.....................#',
  '#.....................#',
  '#.....................#',
  '###########S###########',
  '###########D###########',
];

// les dresseurs des chemins (places : DRESSEURS de temple-chemins.js) : ceux qui aiment l'élément du chemin d'abord
// (montagnards au Feu, marins et nageurs à l'Eau, scouts à la Plante), puis des dresseurs venus tenter l'épreuve.
// [classe, sprite, portrait, nom, ce qu'il dit en nous voyant, en perdant, après]
const P_ = (cls, sprite, bs, nom, intro, lose, after) => ({ cls, sprite, bs, nom, intro, lose, after });
export const DRESSEURS_TEMPLE = {
  f: {
    theme: [
      P_('Montagnard', 'montagnard', 'montagnard', 'Bernard', 'Trente ans que je grimpe sur des volcans. Un temple de lave, je n\'allais pas le rater !', 'Ah, la vache... Tu as le pied sûr.', 'Garde un œil sur les rochers. Ils ne vont jamais là où on les attend.'),
      P_('Montagnard', 'montagnard', 'montagnard', 'Marcel', 'Je pousse ce rocher depuis ce matin. Une petite pause, un petit combat ?', 'Bon. Je retourne à mon rocher.', 'Le truc, c\'est de regarder où va le rocher avant de pousser. Moi, je pousse d\'abord.'),
      P_('Montagnard', 'montagnard', 'montagnard', 'Gérard', 'Il fait une de ces chaleurs ! Mes Pokémon, eux, adorent ça.', 'Ouf. Je vais m\'asseoir un peu.', 'Bois de l\'eau. Ici, on se dessèche vite.'),
      P_('Alpiniste', 'montagnard', 'montagnard', 'Lucien', 'La roche, je la connais par cœur. Celle d\'ici est encore tiède.', 'Tu m\'as bien eu.', 'Les rochers fissurés, un bon coup et ils cèdent.'),
    ],
    autres: [
      P_('Gamin', 'gamin', 'gamin', 'Malo', 'Le Feu, c\'est le chemin le plus cool. Tout le monde le sait !', 'Bon, d\'accord, t\'es cool aussi.', 'Mes copains ont pris l\'Eau et la Plante. Ils vont être jaloux.'),
      P_('Fillette', 'fillette', 'fillette', 'Rose', 'Moi aussi, je passe l\'épreuve ! Mes Pokémon sont tout chauds.', 'Oh non, pas déjà...', 'Je vais quand même aller jusqu\'au bout.'),
      P_('Topdresseur', 'topdresseur', 'topdresseur', 'Axel', 'On n\'est pas nombreux à tenter le Feu. Voyons si tu tiens la chaleur.', 'Tu la tiens.', 'Le Gardien est au bout. Garde des forces pour lui.'),
      P_('Topdresseuse', 'topdresseuse', 'topdresseuse', 'Léna', 'Je reviens tous les ans. Cette année, je vais jusqu\'au Gardien.', 'Pas encore cette année, apparemment.', 'Ne te brûle pas les doigts sur les interrupteurs.'),
    ],
  },
  e: {
    theme: [
      P_('Marin', 'marin', 'marin', 'Yvon', 'Dès qu\'il y a de l\'eau, j\'y vais. Un temple plein de rivières, tu penses bien que je n\'allais pas prendre la porte du Feu !', 'Coulé, matelot.', 'Une rivière, c\'est comme la mer : on ne lutte pas contre, on se laisse porter.'),
      P_('Marin', 'marin', 'marin', 'Gaston', 'Ohé ! Mes Pokémon ont le pied marin. Et les tiens ?', 'Ils l\'ont aussi, faut croire.', 'Si un courant te ramène en arrière, ce n\'est pas grave. Il y en a toujours un autre.'),
      P_('Pêcheur', 'pecheur', 'pecheur', 'Rémi', 'Chut... Ah, ce n\'est que toi. Puisque rien ne mord, battons-nous.', 'Encore une prise ratée.', 'Il y a du poisson dans ces bassins. Du gros.'),
    ],
    autres: [
      P_('Gamin', 'gamin', 'gamin', 'Noé', 'J\'ai choisi l\'Eau parce que mon Pokémon adore nager. Toi aussi ?', 'Il nage mieux qu\'il ne se bat...', 'On se revoit au bout ?'),
      P_('Fillette', 'fillette', 'fillette', 'Jade', 'C\'est mon premier temple ! On se bat ?', 'Bon, c\'était quand même bien.', 'Les rivières vont super vite, c\'est trop drôle.'),
      P_('Topdresseuse', 'topdresseuse', 'topdresseuse', 'Clara', 'J\'ai fait le chemin du Feu l\'an dernier. Cette fois, j\'essaie l\'eau.', 'Je crois que je préférais la lave.', 'Le courant décide pour toi. Il faut juste savoir lequel prendre.'),
    ],
    // sur l'eau
    nage: [
      P_('Nageur', 'labo_nageur', 'enfant', 'Léo', 'L\'eau est bonne ! Mais on n\'est pas là que pour nager.', 'Je bois la tasse...', 'Je fais encore quelques longueurs, et je file.'),
      P_('Nageuse', 'labo_nageuse', 'fillette', 'Maëlle', 'Tu surfes, moi je nage. Voyons qui va le plus vite !', 'Tu as gagné haut la main.', 'Avant de te jeter dans un courant, regarde où il va.'),
      P_('Nageur', 'labo_nageur', 'enfant', 'Hugo', 'Pas facile de garder la tête hors de l\'eau, hein ? Voyons tes Pokémon.', 'Glou...', 'Je me repose ici. Les courants, ça fatigue.'),
      P_('Nageuse', 'labo_nageuse', 'fillette', 'Lou', 'Je m\'entraîne pour la grande traversée. Un combat, ça me fera une pause.', 'Bon, la pause est finie.', 'On voit le fond, ici. Plus loin, c\'est une autre histoire.'),
    ],
  },
  p: {
    theme: [
      P_('Scout', 'pecheur', 'pecheur', 'Paul', 'Toujours prêt ! Un scout connaît chaque plante de la forêt... et ce labyrinthe aussi, enfin presque.', 'Pas assez prêt, faut croire.', 'Si tu te perds, garde toujours la même main contre la haie.'),
      P_('Scoute', 'randonneuse', 'randonneuse', 'Agathe', 'Notre troupe campe devant le temple. Moi, je suis partie en éclaireuse.', 'Je rentre au camp prévenir les autres.', 'Les ronces viennent toujours d\'un arbuste tout proche. C\'est la base.'),
      P_('Scout', 'pecheur', 'pecheur', 'Victor', 'Il me manque le badge de botanique. Il paraît qu\'on le gagne ici.', 'Je l\'aurai l\'année prochaine.', 'Tu as vu les fleurs des arbustes ? Elles ont la couleur des ronces.'),
      P_('Scoute', 'randonneuse', 'randonneuse', 'Margaux', 'J\'ai noté chaque cul-de-sac dans mon carnet. Il y en a beaucoup !', 'Je n\'avais pas noté celui-là.', 'Les petits arbres secs, on les coupe. Ils repoussent la nuit, paraît-il.'),
    ],
    autres: [
      P_('Insectomane', 'insectomane', 'insectomane', 'Timothée', 'Ce labyrinthe grouille d\'insectes. Le paradis !', 'Mes insectes ont besoin de repos.', 'J\'en ai vu un rare près des ronces. Ou c\'était une feuille.'),
      P_('Jardinier', 'jardinier', 'vieil_homme', 'Firmin', 'Ces haies auraient besoin d\'une bonne taille. Mais d\'abord, un combat.', 'Tu as la main verte.', 'Je viens tailler ici chaque printemps. Personne ne me l\'a demandé.'),
      P_('Gamin', 'gamin', 'gamin', 'Sacha', 'Le chemin de la Plante, c\'est le plus calme. Enfin, je croyais.', 'D\'accord, pas si calme.', 'Il y a des abeilles partout, ici.'),
      P_('Fillette', 'fillette', 'fillette', 'Nina', 'Mes Pokémon adorent les fleurs. On se bat ?', 'Elles sont jolies, tes attaques.', 'Je vais cueillir des fleurs pour le Gardien.'),
    ],
  },
};
// leurs Pokémon : à trois (premiers stades), en solo (évolués) ; le Feu a 30 % de Pokémon Roche
export const POKEMON_TEMPLE = {
  f: { trois: [37, 58, 77, 126, 218, 228, 240, 322, 324], solo: [38, 59, 78, 467, 229, 219, 323, 136, 324, 126] },
  roche: { trois: [74, 95, 111, 138, 140, 185, 299, 246, 75], solo: [76, 112, 139, 141, 142, 409, 411, 476, 247] },
  e: { trois: [54, 60, 61, 72, 86, 90, 98, 116, 118, 120, 170, 183, 223, 278, 318, 341, 363, 418], solo: [55, 62, 73, 87, 91, 99, 117, 119, 121, 130, 131, 134, 171, 184, 230, 319, 342, 365, 419, 423] },
  p: { trois: [43, 44, 46, 48, 69, 70, 102, 114, 123, 127, 165, 167, 187, 188, 191, 204, 273, 285, 315, 331, 401, 406, 415], solo: [45, 47, 49, 71, 103, 166, 168, 189, 205, 212, 214, 274, 275, 286, 332, 357, 402, 407, 416, 465, 469] },
};
// ce qu'un dresseur vaincu donne : deux objets différents, tirés selon ces chances (en %)
export const BUTIN_TEMPLE = [['potion', 35], ['super-potion', 20], ['hyper-potion', 10], ['full-restore', 5], ['full-heal', 10], ['sitrus-berry', 10], ['ether', 10]];
// les objets posés dans les salles : 2 dans la première, 3 dans les suivantes (la Mer Intérieure n'en a pas)
export const OBJETS_SALLES = { 1: ['full-heal', 'rawst-berry'], 2: ['ether', 'potion', 'oran-berry'], 3: ['potion', 'lum-berry', 'sitrus-berry'] };

const SINGES = [[512, 30], [514, 30], [516, 30]];
const NIDO = ['ice-beam', 'thunderbolt', 'sludge-wave', 'earth-power'];

// dresseurs du hall : ils parlent, on ne les combat pas
const H = (id, sprite, dir, cls, nom, dit) => ({ id, sprite, dir, cls, nom, dit, toujours: true });

const DEF_TEMPLE = {
  id: 'temple',
  carte: 'labo:temple',
  nom: 'Temple des Éléments',
  niveau: 'niv. 20 à 30 à trois, 50 à 65 en solo',
  entree: 'Le feu, l\'eau, la plante. À trois, chacun suit un élément. Seul, il faut les maîtriser tous.',
  joueurs: { mode: 'groupe', n: 3 },
  // le hall, les dalles et les salles de fin ; chaque chemin a la sienne (plus bas)
  musique: 'routevictoirerse',
  equipe: 'debut',
  exterieur,
  voies: CHEMINS,
  voiesDe: { f: 'du ', e: 'de l\'', p: 'de la ' },
  portesDecor: { 1: 'porte_grille' },
  decor: { '%': 'caverock', '&': 'stalag', '[': 'counter', ']': 'counter' },
  /** badges demandés par le moine pour le temple en solo */
  badgesSolo: 10,
  objets: {
    // le hall : la porte de la Salle des Dalles, celle du temple en solo (derrière le moine)
    e: { type: 'porteHall', decor: 'porte_hall', vers: 'e1' },
    p: { type: 'porteHall', decor: 'porte_hall', vers: 'eo', moine: true },
    G: { type: 'grandePorte', decor: 'porte_vide' },
    X: { type: 'dalleOr', sol: true, decor: 'dalle_or' },
    // les statues du hall
    '`': { type: 'statue', decor: 'socle_statue', sp: 9, grand: true },
    '{': { type: 'statue', decor: 'socle_statue', sp: 6, grand: true },
    '}': { type: 'statue', decor: 'socle_statue', sp: 3, grand: true },
    // à trois : une porte par joueur
    F: { type: 'voie', decor: 'porte_feu', voie: 'f' },
    A: { type: 'voie', decor: 'porte_eau', voie: 'e' },
    H: { type: 'voie', decor: 'porte_plante', voie: 'p' },
    // en solo : les mêmes portes ; celles du Feu et de l'Eau sont scellées tant qu'on n'est pas arrivé derrière
    R: { type: 'porteSolo', decor: 'porte_feu', chemin: 'f' },
    U: { type: 'porteSolo', decor: 'porte_eau', chemin: 'e' },
    W: { type: 'porteSolo', decor: 'porte_plante', chemin: 'p' },
    // le décor des chemins
    L: { type: 'tuile', sol: true, t: 'LAVA' },
    '~': { type: 'tuile', sol: true, t: 'WATER' },
    '"': { type: 'tuile', sol: true, t: 'TALL' },
    // Feu : rochers fissurés (Éclate-Roc), rochers à pousser (Force), ponts ; un rocher poussé sur * ouvre les
    // barrières +, sur ^ les barrières -
    m: { type: 'tuile', sol: true, t: 'SMASH' },
    B: { type: 'tuile', sol: true, t: 'BOULDER' },
    '=': { type: 'tuile', sol: true, t: 'BRIDGE' },
    '*': { type: 'bouton', sol: true, decor: 'interrupteur', ouvre: '+' },
    '^': { type: 'bouton', sol: true, decor: 'interrupteur', ouvre: '-' },
    '+': { type: 'tuile', sol: true, t: 'BARRIER_R' },
    '-': { type: 'tuile', sol: true, t: 'BARRIER_R' },
    // la clé de la 3e salle du Feu : derrière une troisième barrière (s), ouverte par son interrupteur (i)
    i: { type: 'bouton', sol: true, decor: 'interrupteur', ouvre: 's' },
    s: { type: 'tuile', sol: true, t: 'BARRIER_R' },
    // Eau : les rivières emportent le surfeur dans leur sens
    '<': { type: 'courant', sol: true, dir: 'left' },
    '>': { type: 'courant', sol: true, dir: 'right' },
    '(': { type: 'courant', sol: true, dir: 'up' },
    ')': { type: 'courant', sol: true, dir: 'down' },
    // la 4e salle de l'Eau : des eaux tumultueuses, infranchissables
    E: { type: 'tuile', sol: true, t: 'WHIRL' },
    // Plante : arbres, broussailles, herbes, fleurs, lianes ; un arbuste coupé fait tomber les ronces de sa couleur
    Y: { type: 'tuile', sol: true, t: 'TREE' },
    u: { type: 'tuile', sol: true, t: 'BUSH' },
    h: { type: 'tuile', sol: true, t: 'DARKTALL' },
    f: { type: 'tuile', sol: true, t: 'FLOWER' },
    w: { type: 'liane', sol: true, decor: 'liane' },
    r: { type: 'arbuste', decor: 'arbuste_rouge', couleur: 'rouges', ouvre: 't' },
    y: { type: 'arbuste', decor: 'arbuste_jaune', couleur: 'jaunes', ouvre: 'd' },
    q: { type: 'arbuste', decor: 'arbuste_violet', couleur: 'violettes', ouvre: 'g' },
    v: { type: 'arbuste', decor: 'arbuste_bleu', couleur: 'bleues', ouvre: 'n' },
    C: { type: 'tuile', sol: true, t: 'CUT' },
    t: { type: 'ronces', decor: 'ronces_rouge', couleur: 'rouges' },
    d: { type: 'ronces', decor: 'ronces_jaune', couleur: 'jaunes' },
    g: { type: 'ronces', decor: 'ronces_violet', couleur: 'violettes' },
    n: { type: 'ronces', decor: 'ronces_bleu', couleur: 'bleues' },
    // deux recoins par salle : rien à trois ; en solo, ce que dit `recoins` de la salle
    x: { type: 'recoin', sol: true },
    z: { type: 'recoin', sol: true },
    // le solo : les grottes des passages secrets entre les chemins
    'ç': { type: 'bouche', sol: true },
    'à': { type: 'tuile', t: 'SAND', sol: true },
    // les objets de la salle (OBJETS_SALLES), au fond des culs-de-sac
    I: { type: 'objetSalle', sol: true },
    K: { type: 'cle', sol: true },
    Q: { type: 'porteCles', decor: 'porte_vide' },
    // la table : trois Poké Balls (à trois) ; en solo, trois CT
    a: { type: 'starter', decor: 'counter', n: 0 },
    b: { type: 'starter', decor: 'counter', n: 1 },
    c: { type: 'starter', decor: 'counter', n: 2 },
    j: { type: 'ct', decor: 'counter', n: 0 },
    k: { type: 'ct', decor: 'counter', n: 1 },
    l: { type: 'ct', decor: 'counter', n: 2 },
  },
  pnj: {
    '!': {
      id: 'ancien', sprite: 'vieil_homme', dir: 'down', cls: '', nom: 'Vieil homme', toujours: true,
      dit: ['Bienvenue au Temple des Éléments, jeune dresseur.', 'Ce temple abrite deux épreuves.',
        'La première, par la porte de gauche, est faite pour les dresseurs novices. On l\'affronte à trois : trois dalles, trois portes, trois chemins. Chacun suit son élément, et vous vous retrouvez devant le Gardien.',
        'La seconde, par la porte de droite, est bien plus dangereuse. On y entre seul, et les trois chemins s\'y mêlent. Le moine n\'y laisse passer que les dresseurs confirmés : dix badges, pas un de moins.',
        'Prépare-toi bien. Le feu, l\'eau et la plante ne pardonnent rien.'],
    },
    '@': { id: 'moine', sprite: 'pretre', dir: 'down', cls: '', nom: 'Moine', toujours: true, moine: true },
    // le moine de la Salle des Dalles : il prête le Talisman des Éléments (Coupe, Force, Éclate-Roc, Surf)
    '|': { id: 'moine-dalles', sprite: 'pretre', dir: 'right', cls: '', nom: 'Moine', toujours: true, talisman: true },
    $: H('hall-1', 'gamin', 'right', 'Gamin', 'Tom', ['On attend notre troisième équipier. Il est toujours en retard !', 'Moi, je prends la porte du Feu. J\'ai un Pokémon Eau, ça va être du gâteau.']),
    ':': H('hall-2', 'fillette', 'left', 'Fillette', 'Zoé', ['Il paraît qu\'au bout du chemin de l\'Eau, les rivières te ramènent au départ si tu te trompes.', 'Il faut bien regarder dans quel sens va le courant avant de se lancer.']),
    ';': H('hall-3', 'montagnard', 'down', 'Montagnard', 'Hervé', ['Dans le chemin du Feu, les barrières ne s\'ouvrent qu\'avec un rocher posé sur leur interrupteur.', 'Et le rocher n\'est jamais à côté ! J\'ai poussé pendant une heure.']),
    ',': H('hall-4', 'topdresseuse', 'left', 'Topdresseuse', 'Inès', ['Le temple en solo ? J\'y suis entrée une fois. Les trois chemins communiquent, on passe de l\'un à l\'autre sans arrêt.', 'Ce qu\'on trouve dans le feu sert dans la plante, ce qu\'on trouve dans la plante sert dans l\'eau... Je n\'en dis pas plus.']),
    '/': H('hall-5', 'jardinier', 'up', 'Jardinier', 'Basile', ['Les ronces du chemin de la Plante viennent toujours d\'un arbuste tout proche, aux fleurs de la même couleur.', 'Coupe l\'arbuste, les ronces tombent. Encore faut-il trouver par où l\'atteindre !']),
    _: H('hall-6', 'karateka', 'up', 'Karatéka', 'Kenji', ['Le Gardien garde son Pokémon le plus fort pour la fin.', 'Tant qu\'un seul de ses trois singes tient debout, il ne l\'envoie pas.']),
    '?': H('hall-7', 'scientifique', 'left', 'Scientifique', 'Odile', ['J\'étudie la table du Gardien. Trois Poké Balls pour ceux qui viennent à trois, trois CT pour celui qui vient seul.', 'Dans les deux cas, on n\'en prend qu\'une.']),
    M: {
      id: 'gardien-trois', cls: 'Gardien', nom: 'des Éléments', sprite: 'pretre', dir: 'down', groupe: true, musique: 'opboss',
      avant: ['Le feu, l\'eau et la plante vous ont menés jusqu\'ici.', 'Montrez-moi que vous savez les vaincre ensemble !'],
      apres: 'Vous avez dompté les trois éléments. La table est à vous : que chacun choisisse son compagnon.',
      reste: 'Félicitations pour avoir triomphé de cette épreuve. Vous pouvez à présent choisir une récompense sur la table derrière moi.',
      // une fois la récompense prise
      retour: 'Les éléments vous ont reconnus. Je vous ramène au Grand Hall.',
      // les trois singes ensemble ; Tauros n'arrive que quand ils sont tous K.O., avec cinq blocs de vie
      equipe: [...SINGES, [128, 45, { blocs: 5, attend: true }]],
    },
    Z: {
      id: 'gardien-solo', cls: 'Gardien', nom: 'des Éléments', sprite: 'pretre', dir: 'down', musique: 'opboss',
      defi: 'Seul, tu as traversé les trois éléments. Voyons si tu peux les vaincre tous à la fois !',
      perd: 'Tu les maîtrises tous. Ce qui est sur la table t\'appartient.',
      reste: 'Félicitations pour avoir triomphé de cette épreuve. Tu peux à présent choisir une récompense sur la table derrière moi.',
      retour: 'Les éléments t\'ont reconnu. Je te ramène au Grand Hall.',
      // [espèce, niveau, objet, attaques, talent, { blocs }]
      equipe: [
        [31, 60, null, NIDO, 'sheer-force'],
        [34, 60, null, NIDO, 'sheer-force'],
        [143, 63, null, ['body-slam', 'fire-punch', 'ice-punch', 'thunder-punch'], 'thick-fat'],
        [392, 65, 'charcoal', ['flare-blitz', 'close-combat', 'u-turn', 'mach-punch'], 'blaze', { blocs: 3 }],
        [389, 65, 'miracle-seed', ['wood-hammer', 'earthquake', 'stone-edge', 'synthesis'], 'overgrow', { blocs: 3 }],
        [395, 65, 'mystic-water', ['surf', 'ice-beam', 'flash-cannon', 'aqua-jet'], 'torrent', { blocs: 3 }],
      ],
    },
  },
  salles: [
    { id: 'h0', nom: 'Grand Hall', type: 'libre', suivante: null, repere: 'S', plan: HALL },
    { id: 'e1', nom: 'Salle des Dalles', type: 'dalles', porte: '1', requis: 3, suivante: 'g2', retour: ['h0', 'e'], plan: [
      '###############',
      '#######N#######',
      '######111######',
      '#.............#',
      '#.............#',
      '#...o..o..o...#',
      '#.............#',
      '#|............#',
      '#######S#######',
      '#######D#######',
    ] },
    // à trois
    { id: 'g2', nom: 'Salle des Trois Portes', type: 'voies', branche: 'groupe', voies: { F: 'gf1', A: 'ge1', H: 'gp1' }, plan: PORTES('F', 'A', 'H') },
    { id: 'gf1', nom: 'Pentes du Volcan', type: 'libre', branche: 'groupe', voie: 'f', biome: 'magma', apres: ['g2'], pk: 'F1', plan: F1r },
    { id: 'gf2', nom: 'Gradins de Lave', type: 'libre', branche: 'groupe', voie: 'f', biome: 'magma', apres: ['gf1'], pk: 'F2', plan: F2r },
    { id: 'gf3', nom: 'Cratère', type: 'libre', branche: 'groupe', voie: 'f', biome: 'magma', cle: 'f', apres: ['gf2'], suivante: 'g4', pk: 'F3', plan: F3r },
    { id: 'ge1', nom: 'Bassin Profond', type: 'libre', branche: 'groupe', voie: 'e', biome: 'mer', apres: ['g2'], pk: 'E1', plan: E1r },
    { id: 'ge2', nom: 'Grotte des Courants', type: 'libre', branche: 'groupe', voie: 'e', biome: 'mer', apres: ['ge1'], pk: 'E2', plan: E2r },
    { id: 'ge3', nom: 'Source', type: 'libre', branche: 'groupe', voie: 'e', biome: 'mer', apres: ['ge2'], pk: 'E3', plan: E3r },
    { id: 'ge4', nom: 'Mer Intérieure', type: 'libre', branche: 'groupe', voie: 'e', biome: 'mer', cle: 'e', apres: ['ge3'], suivante: 'g4', pk: 'E4', plan: E4r },
    { id: 'gp1', nom: 'Jardin Abandonné', type: 'libre', branche: 'groupe', voie: 'p', biome: 'terre', apres: ['g2'], pk: 'P1', plan: P1r },
    { id: 'gp2', nom: 'Jungle Profonde', type: 'libre', branche: 'groupe', voie: 'p', biome: 'terre', apres: ['gp1'], pk: 'P2', plan: P2r },
    { id: 'gp3', nom: 'Cœur de la Jungle', type: 'libre', branche: 'groupe', voie: 'p', biome: 'terre', cle: 'p', apres: ['gp2'], suivante: 'g4', pk: 'P3', plan: P3r },
    { id: 'g4', nom: 'Salle des Clés', type: 'libre', branche: 'groupe', ouvertPar: 'porte', apres: ['gf3', 'ge4', 'gp3'], plan: CLES(false) },
    { id: 'g5', nom: 'Salle du Gardien', type: 'groupe', branche: 'groupe', pnj: ['M'], apres: ['g4'], suivante: null, table: 'starters', plan: GARDIEN('#....[abc]....#', 'M') },
    // en solo : la dalle d'or, puis les mêmes salles reliées entre elles
    { id: 'eo', nom: 'Salle de la Dalle d\'Or', type: 'libre', suivante: null, retour: ['h0', 'p'], plan: [
      '###############',
      '######GGG######',
      '#.............#',
      '#.............#',
      '#......X......#',
      '#.............#',
      '#.............#',
      '#######S#######',
      '#######D#######',
    ] },
    { id: 's2', nom: 'Salle des Trois Portes', type: 'libre', branche: 'solo', suivante: null, plan: PORTES('R', 'U', 'W').map((r) => r.replace('D', '#')) },
    // les trois portes sont ouvertes. La sortie de chaque première salle est une grille qui ne s'ouvre que de l'autre côté :
    // on entre dans une deuxième salle par le passage secret d'un autre chemin (gardé par un obstacle qui demande l'objet
    // trouvé au fond de la première salle d'un troisième chemin), puis la grille s'ouvre derrière soi. La sortie de chaque
    // deuxième salle demande l'objet trouvé au fond de la deuxième salle d'un autre chemin.
    { id: 'sp1', nom: 'Jardin Abandonné', type: 'libre', branche: 'solo', chemin: 'p', biome: 'terre', suivante: 'sp2', retour: ['s2', 'W'], pk: 'P1', ...solo('p1'),
      verrou: { type: 'grille' }, recoins: { z: { type: 'objet', objet: 'graine' } } },
    { id: 'sp2', nom: 'Jungle Profonde', type: 'libre', branche: 'solo', chemin: 'p', biome: 'terre', suivante: 'sp3', pk: 'P2', ...solo('p2'),
      verrou: { type: 'arbre', objet: 'rosee' }, recoins: { z: { type: 'objet', objet: 'corde' } } },
    { id: 'sp3', nom: 'Cœur de la Jungle', type: 'libre', branche: 'solo', chemin: 'p', biome: 'terre', cle: 'p', suivante: 's4', pk: 'P3', plan: P3r },
    { id: 'se1', nom: 'Bassin Profond', type: 'libre', branche: 'solo', chemin: 'e', biome: 'mer', suivante: 'se2', retour: ['s2', 'U'], pk: 'E1', ...solo('e1'),
      verrou: { type: 'grille' }, recoins: { z: { type: 'objet', objet: 'fiole' } } },
    { id: 'se2', nom: 'Grotte des Courants', type: 'libre', branche: 'solo', chemin: 'e', biome: 'mer', suivante: 'se3', pk: 'E2', ...solo('e2'),
      verrou: { type: 'glace', objet: 'pierre' }, recoins: { z: { type: 'objet', objet: 'rosee' } } },
    { id: 'se3', nom: 'Source', type: 'libre', branche: 'solo', chemin: 'e', biome: 'mer', suivante: 'se4', pk: 'E3', plan: E3r },
    { id: 'se4', nom: 'Mer Intérieure', type: 'libre', branche: 'solo', chemin: 'e', biome: 'mer', cle: 'e', suivante: 's4', pk: 'E4', plan: E4r },
    { id: 'sf1', nom: 'Pentes du Volcan', type: 'libre', branche: 'solo', chemin: 'f', biome: 'magma', suivante: 'sf2', retour: ['s2', 'R'], pk: 'F1', ...solo('f1'),
      verrou: { type: 'grille' }, recoins: { z: { type: 'objet', objet: 'braise' } } },
    { id: 'sf2', nom: 'Gradins de Lave', type: 'libre', branche: 'solo', chemin: 'f', biome: 'magma', suivante: 'sf3', pk: 'F2', ...solo('f2'),
      verrou: { type: 'gouffre', objet: 'corde' }, recoins: { z: { type: 'objet', objet: 'pierre' } } },
    { id: 'sf3', nom: 'Cratère', type: 'libre', branche: 'solo', chemin: 'f', biome: 'magma', cle: 'f', suivante: 's4', pk: 'F3', plan: F3r },
    { id: 's4', nom: 'Salle des Clés', type: 'libre', branche: 'solo', ouvertPar: 'porte', plan: CLES(true) },
    { id: 's5', nom: 'Salle du Gardien', type: 'combat', branche: 'solo', pnj: ['Z'], apres: ['s4'], suivante: null, table: 'solo', plan: GARDIEN('#....[jkl]....#', 'Z') },
  ],
  // ce qu'on trouve dans un chemin du solo et qui sert dans un autre (objets du Sac, contenu.js)
  tresors: {
    braise: { objet: 'braise-eternelle', decor: 'tresor_braise', vu: 'Une braise qui ne s\'éteint pas, posée sur une pierre noire.' },
    graine: { objet: 'graine-geante', decor: 'tresor_graine', vu: 'Une graine grosse comme le poing, qui palpite doucement.' },
    fiole: { objet: 'fiole-eau-pure', decor: 'tresor_fiole', vu: 'Une fiole remplie d\'une eau si claire qu\'on la voit à peine.' },
    pierre: { objet: 'pierre-ardente', decor: 'tresor_pierre', vu: 'Une pierre rouge, brûlante, qui luit de l\'intérieur.' },
    rosee: { objet: 'rosee-eternelle', decor: 'tresor_rosee', vu: 'Une goutte de rosée sur une feuille. Elle ne sèche pas.' },
    corde: { objet: 'corde-liane', decor: 'tresor_corde', vu: 'Une longue liane tressée, solide comme une corde.' },
  },
  // les CT du solo : `fin` si le donjon arrive tard dans le jeu, `tot` s'il arrive plus tôt
  cts: { fin: ['ct-eruption-temple', 'ct-gicledo-temple', 'ct-jaillisseve-temple'], tot: ['ct-surchauffe-temple', 'ct-lame-de-fond-temple', 'ct-tempete-verte-temple'] },
  ctsChoix: 'fin',
  inscriptions: {
    f: ['Porte du Feu.', 'Au bout du chemin, la Clé du Feu.'],
    e: ['Porte de l\'Eau.', 'Au bout du chemin, la Clé de l\'Eau.'],
    p: ['Porte de la Plante.', 'Au bout du chemin, la Clé de la Plante.'],
  },
  journal: [
    { id: 'dalles', nom: 'Les deux portes', salle: 'h0', but: 'À trois, un joueur sur chaque dalle ouvre la petite porte. Seul, avec dix badges, le moine laisse passer vers la dalle d\'or.' },
    { id: 'cles', nom: 'Les trois clés', salle: 'h0', but: 'Au bout de chaque chemin, une clé. La porte de la Salle des Clés s\'ouvre avec les trois.' },
    { id: 'gardien', nom: 'Le Gardien des Éléments', salle: 'h0', but: 'Bats le Gardien. Derrière lui, une table t\'attend.' },
  ],
  textes: {
    masque: 'Le Gardien des Éléments vous attend.',
    perdu: ['Tes Pokémon n\'en peuvent plus...', 'Tu te réveilles à l\'entrée de la salle. Ton équipe a été soignée.'],
    victoire: 'Le Temple vous reconnaît.',
  },
};
// la musique de chaque chemin, à trois comme en solo
const MUSIQUE_CHEMIN = { f: 'templedufeu', e: 'templedeleau', p: 'templedelaforet' };
for (const salle of DEF_TEMPLE.salles) { const el = salle.voie || salle.chemin; if (el) salle.musique = MUSIQUE_CHEMIN[el]; }
export default DEF_TEMPLE;
