// testodyssee/js/donjons/tombeau.js — le Tombeau du Roi Sans Nom : un donjon solo, d'infiltration.
//
// Dehors : la grande place, la façade gardée (on ne passe pas), des touristes ; le ruinemaniac indique l'entrée des
// pilleurs (une roche fissurée, à pousser avec Force) et donne la Clé de Fer de la porte entre le -3 et le -2. Il faut
// le Sceptre du Roi Sans Nom pour ouvrir la dernière salle du tombeau, celle de sa sépulture.
// -3 : le repaire des brigands (ils n'attaquent jamais), la Caverne d'Ali Baba, le tripot, le dortoir ; deux brigands
//      gardent le passage du -4 et ne laissent passer qu'un dresseur qui a le sceptre... et qui les bat.
// -2 : les Galeries des Moines, presque un labyrinthe, des moines qui font leur ronde.
// -1 : la Crypte du Sceptre ; le gardien du sceptre surveille l'entrée de sa chambre : on se glisse derrière lui par le
//      couloir de service pour l'endormir. Un moine qui te voit te jette dehors (et reprend le sceptre).
// -4 : la Galerie des Pilleurs, plongée dans le noir (la suite viendra).
// Les salles des moines viennent de tools/tombeau-gardes.mjs (tombeau-gardes-plans.js), la Galerie de tools/tombeau.py.
import { GameMap, rng } from '../../../odyssee/js/world/mapgen.js';
import { T } from '../../../odyssee/js/world/tiles.js';
import { SALLES_TOMBEAU } from './tombeau-salles.js';
import { GALERIES, CRYPTE } from './tombeau-gardes-plans.js';

// touristes devant le tombeau, et autres passants de la place : [x, y, sprite, direction, déplacement, nom, phrase]
const TOURISTES = [
  [-6, 5, 'dame', 'up', 'static', 'Touriste', 'Clic ! Encore une photo pour mon album. Trois mille ans, tu te rends compte ?'],
  [-4, 5, 'topdresseur', 'up', 'turn', 'Touriste', 'Les gardiens ne laissent entrer personne. Même pas pour une petite photo de l\'intérieur...'],
  [-2, 6, 'enfant', 'up', 'turn', 'Petit garçon', 'Maman, on peut entrer ? Il y a un trésor dedans, c\'est sûr !'],
  [0, 6, 'habitante', 'up', 'static', 'Touriste', 'Regarde ces hiéroglyphes au-dessus de la porte... On dirait un sceptre, non ?'],
  [2, 5, 'fillette2', 'up', 'turn', 'Fillette', 'Souris ! Clic ! Oh, elle est floue...'],
  [4, 6, 'topdresseuse', 'up', 'static', 'Touriste', 'J\'ai fait douze heures de bus pour voir ça. Ça valait le coup.'],
  [6, 5, 'vieil_homme', 'up', 'static', 'Vieux touriste', 'Quand j\'étais jeune, on disait que le Roi Sans Nom maudissait quiconque touchait à son sceptre.'],
  [-5, 7, 'gamin', 'up', 'turn', 'Gamin', 'Waouh ! C\'est encore plus grand qu\'à la télé !'],
  [-1, 8, 'kimono', 'up', 'static', 'Touriste', 'Quelle merveille... Je pourrais rester des heures à la regarder.'],
  [3, 8, 'habitant', 'up', 'turn', 'Touriste', 'Il paraît que des pilleurs rôdent dans la vallée, la nuit. Brr.'],
  [7, 8, 'marin', 'up', 'static', 'Photographe', 'Ne bouge pas... Encore un peu à gauche... Parfait ! Clic !'],
  [-7, 8, 'fillette', 'up', 'turn', 'Fillette', 'Les gardiens ont l\'air méchants. Ils ne sourient jamais ?'],
];
const PASSANTS = [
  [12, 22, 'vendeur', 'left', 'static', 'Marchand de souvenirs', 'Sceptres du Roi Sans Nom, pas chers ! Garantis sans malédiction !'],
  [36, 14, 'savant', 'down', 'static', 'Archéologue', 'Nous fouillons la vallée depuis des années. Le tombeau, lui, reste fermé : le Conservatoire veille.'],
  [30, 31, 'enfant', 'up', 'wander', 'Enfant', 'J\'ai trouvé un caillou bizarre ! Ah non, c\'est juste un caillou.'],
  [16, 30, 'randonneuse', 'right', 'turn', 'Randonneuse', 'Il fait une de ces chaleurs... Heureusement qu\'il y a des palmiers.'],
  [27, 18, 'pretre', 'down', 'static', 'Moine du désert', 'Le Roi Sans Nom dort sous nos pieds. Qu\'on le laisse en paix.'],
];
/** l'extérieur : une grande place de sable devant la façade du tombeau, gardée ; l'entrée des pilleurs est cachée
 *  sous une des roches du bord (porte) */
function exterieur() {
  const W = 48, H = 40, m = new GameMap('labo:tombeau:dehors', W, H, { outdoor: true, fill: T.ROCK, name: 'Vallée des Rois Oubliés', music: 'yghdesert' });
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
  m.zone(0, 0, W - 1, H - 1, { name: 'Vallée des Rois Oubliés', music: 'yghdesert' });
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
  p4: [[[28, 36], [51, 37]], [[105, 37], [302, 36]], [[332, 37], [229, 36]]],
  p5: [[[51, 38], [344, 38]], [[553, 38], [28, 37]], [[450, 38], [198, 37]]],
  p6: [[[553, 39], [332, 39]], [[430, 40], [105, 39]], [[344, 39], [232, 40]]],
  p7: [[[450, 40], [553, 40]], [[330, 41], [430, 40]], [[232, 41], [344, 40]]],
};
// ce que disent les pilleurs de Sable-Noir quand ils voient le sceptre (et ce qui les fait attaquer)
const DITS = ['Hé ! C\'est... le sceptre du roi ?! Donne-moi ça !', 'Le sceptre ! Ce gamin a le sceptre du Roi Sans Nom !', 'Je rêve, ou tu tiens le sceptre du roi ? Il est à Sable-Noir !', 'Ce sceptre... Le chef paierait une fortune pour ça. Donne !'];
const MOQUE = ['Alors, on a perdu son joli sceptre ? Hé hé.', 'Sans ton sceptre, tu ne vaux même pas un combat.', 'Le sous-chef est passé par là en courant. Avec un truc qui brillait...', 'Va-t\'en, avant que je change d\'avis.'];

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

// les brigands du -3 : ils n'attaquent jamais ; certains proposent un combat (autant de fois qu'on veut)
const brig = (cls, nom, sprite, dir, dit, combat) => ({ cls, nom, sprite, dir, toujours: true, prix: combat ? 900 : 0, brigand: { dit, combat } });
const BRIGANDS = Object.fromEntries(Object.entries({
  // le repaire
  'ñ': brig('Brigand', 'Fernand', 'voleur', 'right', 'Encore un nouveau ? Bienvenue au repaire. Ici, personne ne pose de questions.'),
  'ç': brig('Brigande', 'Sidonie', 'brume_f', 'down', 'Les moines d\'en haut ? Ils ne descendent jamais. Ils nous croient tous morts depuis longtemps.'),
  'ø': brig('Brigand', 'Marcel', 'brutus', 'up', 'J\'ai creusé le tunnel jusqu\'ici pendant six mois. À la petite cuillère.'),
  'æ': brig('Brigand', 'Ange', 'brume', 'left', ['Tu veux monter au -2 ? La porte de fer est fermée à clé.', 'Nous, on ne monte jamais. Et c\'est très bien comme ça.']),
  'œ': brig('Brigand', 'Riton', 'voleur', 'down', 'Je m\'ennuie à mourir. Un petit combat pour passer le temps ?', [[52, 34], [19, 35], [20, 35]]),
  'ß': brig('Brigande', 'Lulu', 'brume_f', 'down', 'Tu as l\'air d\'en avoir dans le ventre. Un combat, histoire de rigoler ?', [[41, 35], [96, 35], [302, 36]]),
  'ð': brig('Brigand', 'Comptable', 'corbin', 'up', 'Chut ! Je compte le butin. Quatre cent douze, quatre cent treize... Zut, je recommence.'),
  'þ': brig('Brigande', 'Mado', 'brume_f', 'left', ['Le sceptre du roi ? Il est tout en haut, gardé par des moines.', 'Ils ne dorment jamais. Enfin... jamais tout seuls.']),
  'ą': brig('Brigand', 'Boris', 'brutus', 'right', 'Cette porte de fer mène au -2. On ne l\'a jamais ouverte : personne n\'a la clé.'),
  'ć': brig('Brigand', 'Gégé', 'brume', 'down', 'Le Roi Sans Nom ? Un voisin comme un autre. Il ne se plaint jamais du bruit.'),
  'ę': brig('Brigande', 'Rosine', 'brume_f', 'right', 'Plus bas, au -4, c\'est une autre affaire. Là-bas, les pilleurs ne rigolent pas.'),
  'ł': brig('Brigand', 'Tonton', 'voleur', 'down', 'On parie sur un combat ? Si tu gagnes, tu gagnes. Si tu perds... tu perds.', [[198, 36], [215, 36]]),
  'ś': brig('Brigand', 'Nono', 'brume', 'up', 'Mes Pokémon rouillent. Un combat, vite fait ?', [[105, 36], [93, 37]]),
  // le tripot
  'ŝ': brig('Brigand', 'Lucky', 'corbin', 'down', 'Une partie ? Pas aux dés : aux Pokémon. Et à la loyale, promis juré.', [[262, 37], [229, 37]]),
  'ŷ': brig('Brigande', 'Margot', 'brume_f', 'left', 'J\'ai perdu ma chemise, ma pelle et mon chameau. Mais je me refais à la prochaine.'),
  'ẑ': brig('Croupier', 'Fortuné', 'croupier', 'up', ['Faites vos jeux ! Rien ne va plus !', 'Tu n\'as rien à miser ? Alors misons nos Pokémon !'], [[302, 38], [198, 38], [359, 38]]),
  'ŕ': brig('Brigand', 'Double-Six', 'voleur', 'up', 'Le double six ! Encore ! Ces dés sont formidables. Je les ai achetés chez Ali Baba.'),
  'ŧ': brig('Brigand', 'Pipette', 'corbin', 'right', 'Psst. Tu veux acheter un dé qui tombe toujours sur six ? Non ? Tant pis pour toi.'),
  // le dortoir
  'ǩ': brig('Brigand', 'Gros-Louis', 'brutus', 'down', 'Zzz... Touche pas... à mon butin... Zzz...'),
  'ǯ': brig('Brigande', 'Nini', 'brume_f', 'down', 'Zzz... Encore cinq minutes... Zzz...'),
  'ǰ': brig('Brigand', 'Petit-Paul', 'brume', 'down', 'Zzz... Le sceptre... du roi... Zzz...'),
}).map(([k, p], i) => [k, { id: `brigand-${i}`, ...p }]));

// les deux brigands qui gardent le passage du -4 : sans le sceptre, on ne passe pas ; avec, il faut les battre
const PORTIERS = {
  'Ǥ': { id: 'portier-1', cls: 'Brigand', nom: 'Gros-Bras', sprite: 'brutus', dir: 'down', toujours: true, portier: 0, prix: 1500, equipe: [[112, 38], [68, 38], [76, 39]] },
  'ǥ': { id: 'portier-2', cls: 'Brigande', nom: 'Lame-Fine', sprite: 'brume_f', dir: 'down', toujours: true, portier: 1, prix: 1500, equipe: [[212, 39], [461, 39], [229, 40]] },
};

const pnj = {
  'Ŵ': { id: 'alibaba', cls: 'Marchand', nom: 'Ali Baba', sprite: 'vendeur', dir: 'down', toujours: true, boutique: true },
  ...BRIGANDS,
  ...PORTIERS,
};

// -4 à -9 : les profondeurs (tools/tombeau.py). Les pilleurs (t) gardent leur regard ; les morts-vivants (q), les luttes (j
// contre o), les corps (g) et les mourants (a) prennent une lettre chacun (ou un objet du décor). « apres » : seulement une
// fois le sceptre repris au sous-chef (la lutte contre les morts-vivants a commencé au -6 et au -7).
const MORTS = 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩЁЂЃЄЅІЇЈ', LUTTEURS = 'ЉЊЋЌЎЏБГДЖ';
let nMort = 0, nLutte = 0;
const NIVEAUX_MORTS = { p6: [39, 41], p7: [40, 42], m8: [41, 43], m9: [43, 45] };
const ESPECES_MORTS = [2101, 2102, 2103];
const CRIS_LUTTE = [['Recule ! Ils... ils ne meurent pas !'], ['Frappe-le ! Frappe-le, bon sang !'], ['Je le tiens... Je le tiens pas !'], ['Ces choses... sortent des murs !']];
const BRIGS = ['voleur', 'brume', 'brume_f', 'brutus'];
function profondeur(sid, gen, pnj, apres) {
  const P = pilleurs(sid, gen, pnj), plan = P.plan.map((r) => [...r]), lettres = [...P.lettres], [l0, l1] = NIVEAUX_MORTS[sid] || [40, 42];
  let k = 0;
  const mort = (x, y, extra) => {
    const l = MORTS[nMort++], sp = ESPECES_MORTS[(k + y) % 3];
    pnj[l] = { id: `${sid}-m${k}`, cls: '', nom: 'Abomination', sprite: 'spectrel', dir: 'down', mortvivant: { sp, lvl: l0 + (k % (l1 - l0 + 1)) }, apres, ...extra };
    plan[y][x] = l; lettres.push(l); k++;
  };
  for (let y = 0; y < plan.length; y++) for (let x = 0; x < plan[y].length; x++) {
    const c = plan[y][x];
    if (c === 'q') mort(x, y, {});
    else if (c === 'o') mort(x, y, { dir: 'left', lutte: true });
    else if (c === 'j') {
      const l = LUTTEURS[nLutte], b = BANDE[nLutte % BANDE.length];
      pnj[l] = { id: `${sid}-l${nLutte}`, ...b, nom: NOMS[nNom++ % NOMS.length], dir: 'right', toujours: true, lutteur: true, cris: CRIS_LUTTE[nLutte % CRIS_LUTTE.length], apres };
      nLutte++; plan[y][x] = l; lettres.push(l);
    }
    else if (c === 'g') plan[y][x] = 'ɠ';
    else if (c === 'a') plan[y][x] = 'ɑ';
  }
  return { plan: plan.map((r) => r.join('')), lettres };
}
const PROF = Object.fromEntries(['p4', 'p5', 'p6', 'p7', 'm8', 'm9'].map((id) => [id, profondeur(id, SALLES_TOMBEAU[id], pnj, id === 'p6' || id === 'p7')]));

// -10 : la grande salle, la porte scellée et le chef de Sable-Noir
function grandeSalle() {
  const W = 32, H = 27, g = Array.from({ length: H }, () => Array(W).fill('#')), cr = (x0, y0, x1, y1, c = '.') => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = c; };
  cr(2, 5, 29, 23); cr(12, 2, 19, 4);
  g[1][15] = 'Ж'; g[2][13] = 'b'; g[2][18] = 'b'; g[4][15] = 'Ѡ';
  for (const y of [8, 12, 16, 20]) for (const x of [6, 25]) g[y][x] = '|';
  for (const [x, y] of [[3, 6], [28, 6], [3, 22], [28, 22]]) g[y][x] = 'b';
  for (const [x, y] of [[9, 9], [21, 11], [12, 15], [19, 18], [8, 19], [23, 7], [16, 21]]) g[y][x] = 'ɠ';
  for (const [x, y] of [[14, 10], [10, 13]]) g[y][x] = 'ɑ';
  g[24][15] = '.'; g[25][15] = 'S'; g[26][15] = 'D';
  cr(15, 24, 15, 24);
  return g.map((r) => r.join(''));
}
// le sous-chef : il vole le sceptre au -7, puis remonte jusqu'à l'éboulement du -4 ; le chef attend au -10
pnj['Ҩ'] = { id: 'sous-chef', cls: 'Sous-chef', nom: 'Vipère', sprite: 'corbin', dir: 'down', toujours: true, souschef: true, prix: 3000, equipe: [[553, 42], [330, 43], [430, 43]] };
pnj['Ѡ'] = { id: 'chef', cls: 'Chef de Sable-Noir', nom: 'Khamsin', sprite: 'nox', dir: 'up', toujours: true, chef: true, prix: 8000, boss: true, equipe: [[450, 46], [332, 46], [344, 46], [553, 47], [330, 47], [248, 48]] };

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
  entree: 'Des moines qui ne dorment jamais, des brigands qui ne posent pas de questions, et le sceptre d\'un roi oublié. Une aventure à mener seul, sans se faire voir.',
  joueurs: { mode: 'solo' },
  musique: 'yghtombeau',
  // quand les morts-vivants apparaissent (le sceptre repris au sous-chef), leurs salles changent de musique : le nom de
  // cette musique ici (une de odyssee/musiques/musiques.js) ; en attendant, elles gardent celle du tombeau
  musiqueMorts: null,
  sallesMorts: ['p6', 'p7', 'm8', 'm9'],
  equipe: 'milieu',
  style: 'egypte',
  tombeau: true,
  exterieur,
  decor: { 'Ϯ': 'torche', '%': 'caverock', '|': 'colonne', l: 'stele', b: 'brasero', k: 'sarcophage_vide', c: 'caisse', n: 'tonneau', p: 'table', y: 'coffre', v: 'lanterne', w: 'caisses', 'ʙ': 'bed', 'Ŗ': 'counter' },
  objets: {
    // le gouffre : on y tombe ; pièges à pointes
    _: { type: 'gouffre', sol: true, decor: 'gouffre' },
    x: { type: 'piege', sol: true, decor: 'piege_degats2' },
    // le socle du sceptre, au -1
    L: { type: 'relique', decor: 'socle_sceptre' },
    // les profondeurs : corps, mourants, la grille du -7, la porte scellée du -10
    'ɠ': { type: 'corps', decor: 'gisant_voleur' },
    'ɑ': { type: 'mourant', decor: 'gisant_brume' },
    '¤': { type: 'verrou', decor: 'porte_grille' },
    'Ж': { type: 'porte_scellee', decor: 'porte_grande' },
    // passages entre les étages (vers : la salle, cible : la marque du passage d'en face) ; porte : fermée à clé
    'α': { type: 'lien', vers: 's2', cible: 'β', porte: true }, 'β': { type: 'lien', vers: 'b3', cible: 'α', porte: true },
    'γ': { type: 'lien', vers: 's1', cible: 'δ', sol: true }, 'δ': { type: 'lien', vers: 's2', cible: 'γ', sol: true },
    'η': { type: 'lien', vers: 'b4a', cible: 'θ', sol: true }, 'θ': { type: 'lien', vers: 'b3', cible: 'η', sol: true },
    'ι': { type: 'lien', vers: 'b4b', cible: 'λ', sol: true }, 'λ': { type: 'lien', vers: 'b3', cible: 'ι', sol: true },
    'κ': { type: 'lien', vers: 'b4c', cible: 'μ', sol: true }, 'μ': { type: 'lien', vers: 'b3', cible: 'κ', sol: true },
    // objets à ramasser
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
    // -3 : le repaire des brigands, où l'on arrive par le trou des pilleurs ; la porte de fer vers le -2, ses trois salles,
    // et le passage du -4, gardé par deux brigands
    { id: 'b3', nom: 'Repaire des Brigands (-3)', type: 'libre', suivante: 'p4', ouvertPar: 'jamais', plan: [
      "##############################################",
      "#########α##########################N#########",
      "#########..#########################..########",
      "#########..#########################Ǥǥ########",
      "###...............####........b...b........###",
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
    // -2 et -1 : les moines (gardes : leurs rondes, dans le plan ; gardien : celui du sceptre)
    { id: 's2', nom: 'Galeries des Moines (-2)', type: 'libre', gardiens: true, suivante: null, gardes: GALERIES.gardes, plan: GALERIES.plan },
    { id: 's1', nom: 'Crypte du Sceptre (-1)', type: 'libre', gardiens: true, suivante: null, gardes: [...CRYPTE.gardes, CRYPTE.gardien], plan: CRYPTE.plan },
    // les trois salles du repaire ; Ali Baba vit là depuis longtemps : sa caverne est mieux éclairée
    { id: 'b4a', nom: 'Caverne d\'Ali Baba (-3)', type: 'libre', suivante: null, lumiere: 'vive', plan: [
      "##################",
      "##################",
      "##ww.y.k..k.y.ww##",
      "##.Ϯ...Ϯ..Ϯ...Ϯ.##",
      "##......Ŵ......n##",
      "##v...ŖŖ.ŖŖ.....##",
      "##..............##",
      "##............S..θ",
      "##v..............#",
      "##..............##",
      "##.............n##",
      "##wϮ..........Ϯw##",
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
    // -4 à -10 : les profondeurs, bien plus sombres. Au -4, l'éboulement ferme le retour ; au -7, le piège et la grille
    { id: 'p4', nom: 'Galerie des Pilleurs (-4)', type: 'libre', lumiere: 'noire', eboulement: true, pnj: PROF.p4.lettres, plan: PROF.p4.plan },
    { id: 'p5', nom: 'Camp de Sable-Noir (-5)', type: 'libre', lumiere: 'noire', pnj: PROF.p5.lettres, plan: PROF.p5.plan },
    { id: 'p6', nom: 'Galerie des Échos (-6)', type: 'libre', lumiere: 'noire', pnj: PROF.p6.lettres, plan: PROF.p6.plan },
    { id: 'p7', nom: 'Salle des Sables (-7)', type: 'libre', lumiere: 'noire', piege: true, pnj: PROF.p7.lettres, plan: PROF.p7.plan },
    { id: 'm8', nom: 'Fosse des Pillards (-8)', type: 'libre', lumiere: 'noire', pnj: PROF.m8.lettres, plan: PROF.m8.plan },
    { id: 'm9', nom: 'Couloirs des Morts (-9)', type: 'libre', lumiere: 'noire', pnj: PROF.m9.lettres, plan: PROF.m9.plan },
    { id: 'g10', nom: 'Salle de la Porte Scellée (-10)', type: 'libre', lumiere: 'noire', suivante: null, pnj: ['Ѡ'], plan: grandeSalle() },
  ],
  journal: [
    { id: 'entree', nom: 'L\'entrée des pilleurs', salle: 'b3', but: 'L\'entrée officielle est gardée. Le ruinemaniac de la place connaît un autre accès : une roche à pousser avec Force, au bord est de la place.' },
    { id: 'sceptre', nom: 'Le sceptre', salle: 's1', but: 'La sépulture du Roi Sans Nom ne s\'ouvre qu\'avec son sceptre, gardé au -1. La porte de fer du -3 mène au -2 (la Clé de Fer du ruinemaniac l\'ouvre). Ne te fais pas voir des moines : endors le gardien du sceptre avec une Seringue Somnifère, en t\'approchant par derrière.' },
    { id: 'passage', nom: 'Le passage du -4', salle: 'b3', but: 'Au fond du repaire, deux brigands gardent le passage du -4. Ils ne laissent passer personne... sauf peut-être quelqu\'un d\'assez fort.' },
    { id: 'profondeurs', nom: 'Les profondeurs', salle: 'p4', but: 'Le passage s\'est effondré derrière toi. Les pilleurs de Sable-Noir rôdent dans les profondeurs, et ils veulent ton sceptre.' },
    { id: 'porte', nom: 'La porte scellée', salle: 'g10', but: 'Tout au fond, une porte scellée. Le chef de Sable-Noir est déjà là.' },
  ],
  textes: {
    perdu: ['Tes Pokémon n\'en peuvent plus...', 'Tu reprends tes esprits à l\'entrée de la salle. Tes Pokémon ont retrouvé un peu de forces.'],
  },
  recompense: { objets: { 'sceau-roi': 1 } },
};
for (const salle of TOMBEAU.salles) if (!salle.gardes) salle.plan = torches(salle.plan, salle.lumiere === 'vive' ? 4 : salle.lumiere === 'noire' ? 12 : 7);
export default TOMBEAU;
