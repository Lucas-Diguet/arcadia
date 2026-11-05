// testodyssee/js/mont/mont.js — le Mont Givrécime : une montagne enneigée de dix grandes salles, pour l'aventure solo
// (pas un donjon : pas de groupe, pas de boss). On la gravit tantôt dedans (grottes), tantôt dehors (pentes,
// corniches), par plusieurs chemins. Les plans viennent de tools/mont.py (plans.js) ; ici, on en fait des cartes.
import { GameMap } from '../../../odyssee/js/world/mapgen.js';
import { trainerNpc } from '../../../odyssee/js/world/region.js';
import { T } from '../../../odyssee/js/world/tiles.js';
import { SALLES, LIENS } from './plans.js';

export const PRE = 'mont';
export const idSalle = (i) => `${PRE}:${i}`;

// Pokémon sauvages : [espèce, niveau min, niveau max, poids]
const DEHORS = [[459, 44, 48, 25], [220, 44, 47, 20], [215, 45, 48, 15], [225, 44, 47, 10], [361, 45, 48, 15], [712, 44, 47, 15]];
const HAUT = [[460, 48, 52, 20], [221, 47, 51, 20], [461, 49, 52, 10], [478, 49, 52, 10], [614, 48, 51, 15], [713, 49, 52, 10], [362, 48, 51, 15]];
const GROTTE = [[75, 44, 48, 20], [95, 44, 47, 15], [42, 45, 48, 20], [299, 44, 47, 10], [361, 45, 48, 20], [582, 44, 47, 15]];
const PROFOND = [[208, 48, 52, 10], [476, 49, 52, 10], [362, 48, 51, 20], [583, 47, 51, 20], [615, 49, 52, 10], [42, 48, 51, 15], [221, 48, 51, 15]];
const EAU = [[86, 44, 48, 40], [87, 48, 51, 15], [131, 48, 51, 10], [124, 46, 49, 35]];
const RENCONTRES = [DEHORS, GROTTE, DEHORS, GROTTE, GROTTE, HAUT, PROFOND, HAUT, PROFOND, HAUT];

// objets de chaque salle, dans l'ordre des lettres I J O P Q R U
const OBJETS = [
  ['ultra-ball', 'ice-heal', 'max-potion', 'escape-rope', 'revive', 'full-heal', 'max-repel'],
  ['revive', 'max-potion', 'elixir', 'ultra-ball', 'nugget', 'ice-heal', 'full-heal'],
  ['never-melt-ice', 'max-repel', 'ultra-ball', 'hyper-potion', 'revive', 'calcium', 'ice-heal'],
  ['max-revive', 'full-restore', 'pp-up', 'zinc', 'ultra-ball', 'max-potion', 'elixir'],
  ['hp-up', 'ultra-ball', 'max-potion', 'revive', 'max-elixir', 'nugget', 'full-heal'],
  ['ice-stone', 'full-restore', 'max-repel', 'ultra-ball', 'revive', 'max-potion', 'rare-candy'],
  ['pp-up', 'max-revive', 'full-restore', 'ultra-ball', 'nugget', 'max-elixir', 'calcium'],
  ['rare-candy', 'full-restore', 'max-revive', 'ultra-ball', 'zinc', 'max-potion', 'hp-up'],
  ['max-elixir', 'pp-up', 'full-restore', 'max-revive', 'rare-candy', 'nugget', 'ultra-ball'],
  ['rare-candy', 'max-revive', 'pp-up', 'full-restore', 'never-melt-ice', 'max-elixir', 'nugget'],
];
const LETTRES = 'IJOPQRU';

// dresseurs de chaque salle, dans l'ordre où ils apparaissent sur le plan (de haut en bas, de gauche à droite)
const D = (cls, nom, equipe, intro) => ({ cls, nom, equipe, intro });
const DRESSEURS = [
  [D('Randonneuse', 'Solène', [[220, 44], [459, 45]], 'Le mont se mérite : montre-moi ce que tu vaux !'), D('Montagnard', 'Gaspard', [[75, 45], [95, 45], [221, 46]]), D('Skieuse', 'Neige', [[215, 45], [225, 46]])],
  [D('Montagnard', 'Armand', [[95, 46], [75, 46], [208, 47]]), D('Médium', 'Ombeline', [[42, 46], [361, 47]]), D('Randonneuse', 'Agathe', [[299, 46], [582, 47]])],
  [D('Skieuse', 'Flocon', [[459, 47], [220, 46], [215, 47]], 'Attention, ça glisse !'), D('Alpiniste', 'Bastien', [[221, 47], [712, 47]]), D('Topdresseuse', 'Mila', [[478, 48], [460, 48]])],
  [D('Montagnard', 'Hubert', [[208, 48], [76, 48]]), D('Karatéka', 'Kenji', [[68, 48], [106, 47], [107, 47]]), D('Médium', 'Lune', [[362, 48], [478, 48]])],
  [D('Alpiniste', 'Corentin', [[221, 48], [473, 49]]), D('Topdresseur', 'Victor', [[461, 48], [615, 48], [87, 49]]), D('Randonneuse', 'Iris', [[583, 48], [362, 48]])],
  [D('Skieuse', 'Blanche', [[460, 49], [614, 49]], 'Le blizzard ne m\'arrête pas, et toi non plus, on dirait.'), D('Alpiniste', 'Élie', [[713, 49], [221, 49], [473, 50]]), D('Topdresseuse', 'Aurore', [[478, 50], [131, 50]])],
  [D('Pêcheur', 'Morvan', [[87, 49], [131, 50]]), D('Topdresseur', 'Loïc', [[124, 49], [91, 50], [478, 50]]), D('Montagnard', 'Roch', [[208, 50], [476, 50]])],
  [D('Alpiniste', 'Margaux', [[473, 51], [460, 51]]), D('Skieuse', 'Givre', [[471, 51], [614, 51], [362, 50]]), D('Topdresseur', 'Anatole', [[461, 51], [713, 51], [143, 52]])],
  [D('Médium', 'Séléné', [[478, 51], [615, 52], [583, 51]]), D('Karatéka', 'Takeshi', [[68, 52], [107, 51], [237, 51]]), D('Topdresseuse', 'Ysé', [[473, 52], [131, 52], [208, 52]])],
  [D('Topdresseur', 'Alaric', [[473, 54], [461, 53], [460, 54], [131, 54]], 'Tu as atteint le sommet... Il reste une dernière marche : moi.'), D('Topdresseuse', 'Céleste', [[478, 54], [713, 54], [614, 53], [362, 54]], 'Ici, le vent porte tout ce qu\'on dit. Battons-nous dignement.')],
];

const SOL_DEHORS = { '.': T.SNOW, '#': T.CAVEWALL, Y: T.PINE, o: T.ROCK, '"': T.TALL, v: T.LEDGE, t: T.SNOW, S: T.SNOW };
const SOL_DEDANS = { '.': T.CAVE, '#': T.CAVEWALL, '~': T.WATER, m: T.SMASH, B: T.BOULDER, t: T.CAVE };
const DIRS = [[0, 1, 'down'], [0, -1, 'up'], [-1, 0, 'left'], [1, 0, 'right']];

/** où l'on arrive par une sortie, et dans quel sens on regarde */
function arrivee(S, x, y) {
  const P = S.plan, H = P.length, W = P[0].length;
  if (y === 0) return [x, 1, 'down'];
  if (y === H - 1) return [x, H - 2, 'up'];
  if (x === 0) return [1, y, 'right'];
  if (x === W - 1) return [W - 2, y, 'left'];
  return [x, y + 1, 'down'];   // entrée de grotte, échelle : on ressort en dessous
}
function trouver(S, c) { for (let y = 0; y < S.plan.length; y++) { const x = S.plan[y].indexOf(c); if (x >= 0) return [x, y]; } return null; }

/** construit les dix cartes ; renvoie le lieu à proposer dans la liste */
export function construireMont(maps) {
  const sorties = SALLES.map(() => ({}));
  for (const [a, b, sorte, c] of LIENS) { sorties[a][c] = { vers: b, sorte }; sorties[b][c] = { vers: a, sorte }; }
  SALLES.forEach((S, i) => {
    const P = S.plan, H = P.length, W = P[0].length, id = idSalle(i), haut = i === SALLES.length - 1;
    const m = S.dehors
      ? new GameMap(id, W, H, { outdoor: true, fill: T.CAVEWALL, name: S.nom, music: haut ? 'mystic' : 'snow' })
      : new GameMap(id, W, H, { outdoor: false, fill: T.CAVEWALL, floor: 'cave', music: 'cave', name: S.nom, battleBg: 'cave' });
    m.edge = T.CAVEWALL;
    m.mont = { salle: i };
    const SOL = S.dehors ? SOL_DEHORS : SOL_DEDANS, enc = RENCONTRES[i];
    let nt = 0, nbt = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = P[y][x];
      m.set(x, y, SOL[c] ?? (S.dehors ? T.SNOW : T.CAVE));
      if (c === '%') m.prop('caverock', x, y);
      else if (c === '&') m.prop('stalag', x, y);
      else if (LETTRES.includes(c)) m.item(x, y, OBJETS[i][LETTRES.indexOf(c)], 1, `${id}:${c}`);
      else if (c === 't') {
        const d = DRESSEURS[i][nt++ % DRESSEURS[i].length];
        trainerNpc(m, x, y, 'down', d.cls, d.nom, d.equipe, { id: `${id}:t${nbt++}`, sight: 4, intro: d.intro, ai: 'smart', prize: 70 });
      }
    }
    // sorties : sentier au bord, entrée de grotte dans la falaise, sortie de grotte, échelle
    for (const [c, L] of Object.entries(sorties[i])) {
      const p = trouver(S, c); if (!p) throw new Error(`Mont : la sortie ${c} manque dans ${S.nom}`);
      const [x, y] = p, Q = SALLES[L.vers], q = trouver(Q, c), [ax, ay, dir] = arrivee(Q, ...q);
      const to = { map: idSalle(L.vers), x: ax, y: ay, dir };
      const bord = x === 0 || y === 0 || x === W - 1 || y === H - 1;
      if (S.dehors && !bord) { m.building('cave', x - 2, y - 2); m.warp(x, y, to); }
      else if (!S.dehors && !bord) { m.set(x, y, T.CAVE); m.deco.push({ k: 'ladder', x, y }); m.warp(x, y, { ...to, step: true }); }
      else if (!S.dehors) { m.set(x, y, T.CAVEDOOR); m.deco.push({ k: 'exitlight', x, y }); m.warp(x, y, to); }
      else { m.set(x, y, T.SNOW); m.warp(x, y, { ...to, step: true }); }
    }
    if (S.dehors) m.zone(0, 0, W - 1, H - 1, { name: S.nom, music: haut ? 'mystic' : 'snow', theme: 'snow', enc });
    else {
      m.zone(0, 0, W - 1, H - 1, { name: S.nom, music: 'cave' });
      m.biome = 'glace'; m.encounter = enc;
      if (P.some((r) => r.includes('~'))) { m.surf = true; m.surfEnc = EAU; }
    }
    if (haut) {
      const [cx, cy] = trouverSommet(m);
      m.sign(cx, cy, 'Sommet du Mont Givrécime — 2 870 m.\nPar temps clair, on voit toute la région.');
    }
    maps[id] = m;
  });
  const [sx, sy] = trouver(SALLES[0], 'S');
  return { nom: 'Mont Givrécime', note: 'aventure solo · 10 salles, dedans et dehors', map: idSalle(0), x: sx, y: sy - 1, dir: 'up', equipe: 'fin' };
}

/** une case de neige libre au milieu du sommet, pour le panneau */
function trouverSommet(m) {
  const S = SALLES[SALLES.length - 1].plan, cx = S[0].length >> 1, cy = S.length >> 1;
  for (let r = 0; r < 20; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const x = cx + dx, y = cy + dy;
    if (S[y]?.[x] === '.' && S[y + 1]?.[x] === '.' && S[y - 1]?.[x] === '.' && S[y][x - 1] === '.' && S[y][x + 1] === '.') return [x, y];
  }
  return [cx, cy];
}
