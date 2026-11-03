// testodyssee/js/ile/modele.js — l'île privée du joueur (sans DOM) : la même île pour tout le monde, ce que le joueur y
// pose (case par case), les trophées débloqués et ceux exposés au musée. Tout tient dans une donnée (« l'île ») qui
// suivra un jour la sauvegarde d'Odyssée ; la carte est reconstruite à partir d'elle à chaque visite.
//
// L'île : { v, nom, biome, fixes: { maison: [x, y], mairie, musee }, travaux: [{ a, x, y, texte? toit? }],
//           donjons: [id des donjons finis], musee: { [socle]: id du trophée } }
// La pose reprend le format des retouches d'Odyssée (et l'idée du chantier du Domaine) : un article = une tuile,
// un décor ou un bâtiment ; un chemin reste toujours libre entre le ponton et les portes des bâtiments fixes.
import { T } from '../../../odyssee/js/world/tiles.js';
import { GameMap, rng, BUILDINGS } from '../../../odyssee/js/world/mapgen.js';
import { applyOps } from '../../../odyssee/js/world/retouches.js';
import { houseInterior, room } from '../../../odyssee/js/world/interiors.js';

export const ILE = 'labo:ile';
export const W = 60, H = 44;
export const PONTON = [30, 40];                // bout du ponton (le capitaine)
export const ARRIVEE = [30, 37];               // là où l'on débarque
export const CLE_STOCKAGE = 'testodyssee-ile:';

/** les bâtiments présents dès le début : ils se déplacent mais ne se rangent pas */
export const FIXES = {
  maison: { kind: 'house2', nom: 'Maison', toit: 'red', taille: [5, 3], defaut: [28, 26] },
  mairie: { kind: 'bighouse', nom: 'Mairie', toit: 'blue', taille: [6, 4], defaut: [36, 7] },
  musee: { kind: 'bighouse', nom: 'Musée', toit: 'purple', taille: [6, 4], defaut: [17, 7] },
};

/** les trophées : une statue par arène d'Odyssée (badge) et par donjon du labo */
export const TROPHEES = [
  ...['Hector', 'Marine', 'Volta', 'Flora', 'Sibylle', 'Basalte', 'Pyros', 'Drakos'].map((n, i) => ({ id: `badge${i}`, nom: `Statue de l'arène ${/^[AEIOUYH]/.test(n) ? 'd\'' : 'de '}${n}`, sp: [212, 130, 135, 3, 65, 76, 6, 149][i], badge: i })),
  { id: 'crypte', nom: 'Statue de la Crypte', sp: 92, donjon: 'crypte' },
  { id: 'didier', nom: 'Statue du Donjon de Didier', sp: 2001, donjon: 'didier' },
  { id: 'miroirs', nom: 'Statue des Miroirs', sp: 122, donjon: 'miroirs' },
  { id: 'voies', nom: 'Statue du trio des lacs', sp: 482, donjon: 'voies' },
  { id: 'pyramide', nom: 'Statue de la Pyramide', sp: 563, donjon: 'pyramide' },
  { id: 'mine', nom: 'Statue de la Mine', sp: 306, donjon: 'mine' },
  { id: 'train', nom: 'Statue du Train Fantôme', sp: 94, donjon: 'train' },
];
export const TROPHEE = Object.fromEntries(TROPHEES.map((t) => [t.id, t]));

/** le catalogue (gratuit pendant les tests) : t = tuile, p = décor, s = panneau, b = bâtiment, tr = trophée */
export const CATALOGUE = [
  { cat: 'Nature', id: 'arbre', nom: 'Arbre', t: T.TREE },
  { cat: 'Nature', id: 'sapin', nom: 'Sapin', t: T.PINE },
  { cat: 'Nature', id: 'buisson', nom: 'Buisson', t: T.BUSH },
  { cat: 'Nature', id: 'fleurs', nom: 'Massif de fleurs', t: T.FLOWER },
  { cat: 'Nature', id: 'hautes', nom: 'Hautes herbes', t: T.TALL },
  { cat: 'Nature', id: 'rocher', nom: 'Rocher', t: T.ROCK },
  { cat: 'Nature', id: 'palmier', nom: 'Palmier', p: 'palm' },
  { cat: 'Nature', id: 'cerisier', nom: 'Cerisier', p: 'cerisier' },
  { cat: 'Nature', id: 'erable', nom: 'Érable', p: 'erable' },
  { cat: 'Nature', id: 'grandrocher', nom: 'Grand rocher', p: 'rocher_grand' },
  { cat: 'Mobilier', id: 'banc', nom: 'Banc', p: 'banc' },
  { cat: 'Mobilier', id: 'lamp', nom: 'Lampadaire', p: 'lamp' },
  { cat: 'Mobilier', id: 'lanterne', nom: 'Lanterne', p: 'lanterne' },
  { cat: 'Mobilier', id: 'fontaine', nom: 'Fontaine', p: 'fontaine' },
  { cat: 'Mobilier', id: 'tonneau', nom: 'Tonneau', p: 'tonneau' },
  { cat: 'Mobilier', id: 'caisse', nom: 'Caisse', p: 'caisse' },
  { cat: 'Mobilier', id: 'pot', nom: 'Pot de fleurs', p: 'pot' },
  { cat: 'Mobilier', id: 'parasol', nom: 'Parasol', p: 'parasol' },
  { cat: 'Mobilier', id: 'boite', nom: 'Boîte aux lettres', p: 'mailbox' },
  { cat: 'Mobilier', id: 'torii', nom: 'Portique torii', p: 'torii' },
  { cat: 'Mobilier', id: 'panneau', nom: 'Panneau', s: true },
  { cat: 'Bâtiments', id: 'house', nom: 'Maison', b: 'house', taille: [4, 3] },
  { cat: 'Bâtiments', id: 'house2', nom: 'Grande maison', b: 'house2', taille: [5, 3] },
  { cat: 'Bâtiments', id: 'bighouse', nom: 'Résidence', b: 'bighouse', taille: [6, 4] },
  { cat: 'Sols', id: 'chemin', nom: 'Chemin de terre', t: T.PATH, sol: true },
  { cat: 'Sols', id: 'paves', nom: 'Pavés', t: T.PAVE, sol: true },
  { cat: 'Sols', id: 'sable', nom: 'Sable', t: T.SAND, sol: true },
  { cat: 'Sols', id: 'herbe', nom: 'Herbe', t: T.GRASS, sol: true },
  ...TROPHEES.map((t) => ({ cat: 'Trophées', id: 'tr:' + t.id, nom: t.nom, tr: t.id })),
];
export const ARTICLE = Object.fromEntries(CATALOGUE.map((c) => [c.id, c]));

/* ---------------- la donnée ---------------- */
export function nouvelleIle(nom = 'Mon île') {
  return { v: 1, nom, biome: 'plaine', fixes: Object.fromEntries(Object.entries(FIXES).map(([k, f]) => [k, [...f.defaut]])), travaux: [], donjons: [], musee: {} };
}
/** complète une île lue (version plus ancienne, champ manquant) */
export function etatIle(ile) {
  const n = nouvelleIle(ile?.nom);
  if (!ile || typeof ile !== 'object') return n;
  ile.fixes = { ...n.fixes, ...(ile.fixes || {}) };
  ile.travaux = Array.isArray(ile.travaux) ? ile.travaux.filter((t) => ARTICLE[t?.a]) : [];
  ile.donjons = Array.isArray(ile.donjons) ? ile.donjons : [];
  ile.musee = ile.musee && typeof ile.musee === 'object' ? ile.musee : {};
  ile.biome ||= 'plaine'; ile.v = 1;
  return ile;
}
/** trophées débloqués : badges de la partie et donjons finis */
export function debloques(ile, st) {
  return TROPHEES.filter((t) => (t.badge != null ? !!st?.badges?.[t.badge] : ile.donjons.includes(t.donjon))).map((t) => t.id);
}
/** un trophée n'existe qu'en un exemplaire : sur l'île, au musée, ou dans le stock */
export function trophePlace(ile, id) {
  if (ile.travaux.some((t) => ARTICLE[t.a]?.tr === id)) return 'ile';
  if (Object.values(ile.musee).includes(id)) return 'musee';
  return null;
}

/* ---------------- le terrain (le même pour tout le monde) ---------------- */
let FORME = null;
/** 'eau', 'plage' ou 'herbe' pour chaque case, plus le ponton */
export function forme() {
  if (FORME) return FORME;
  const r = rng(6060), f = Array.from({ length: H }, () => Array(W).fill('eau'));
  const bosses = Array.from({ length: 12 }, () => r() * 0.12 - 0.05);
  const rayon = (x, y, rx, ry) => { const a = Math.atan2((y - 21) / ry, (x - 30) / rx), k = Math.floor(((a + Math.PI) / (2 * Math.PI)) * 12) % 12; return Math.hypot((x - 30) / rx, (y - 21) / ry) - bosses[k]; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (rayon(x, y, 27, 18) < 1) f[y][x] = 'plage';
    if (rayon(x, y, 24.5, 15.5) < 1) f[y][x] = 'herbe';
  }
  for (let y = ARRIVEE[1]; y <= PONTON[1]; y++) f[y][PONTON[0]] = f[y][PONTON[0]] === 'herbe' ? 'herbe' : 'ponton';
  FORME = f;
  return f;
}
const fo = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? forme()[y][x] : 'eau');

/** les cases que couvre un article posé (un bâtiment : son emprise et la case devant sa porte) */
export function emprise(a, x, y) {
  const art = typeof a === 'string' ? ARTICLE[a] : a;
  if (art?.b || art?.kind) { const [w, h] = art.taille; const out = []; for (let j = 0; j <= h; j++) for (let i = 0; i < w; i++) out.push([x + i, y + j]); return out; }
  return [[x, y]];
}
/** les cases d'un bâtiment, sans celle devant sa porte */
export function corps(a, x, y) { return (a?.b || a?.kind) ? emprise(a, x, y).slice(0, a.taille[0] * a.taille[1]) : [[x, y]]; }
/** les portes des bâtiments fixes (case devant), à garder reliées au ponton */
export function portes(ile) {
  return Object.entries(FIXES).filter(([k]) => k !== ile.cache).map(([k, f]) => { const [x, y] = ile.fixes[k]; return [x + BUILDINGS[f.kind].door, y + f.taille[1]]; });
}

/**
 * peut-on poser cet article ici ? { ok, why }. trav = { a, x, y } ; pour déplacer un bâtiment fixe : { fixe, x, y }.
 * Les sols se peignent sur l'herbe et les chemins ; tout le reste demande une case libre ; aucun bâtiment ne recouvre
 * un autre objet ; et le chemin du ponton aux portes des bâtiments fixes doit rester libre.
 */
export function posable(ile, trav) {
  const art = trav.fixe ? FIXES[trav.fixe] : ARTICLE[trav.a];
  if (!art) return { ok: false, why: 'inconnu' };
  const cases = emprise(art, trav.x, trav.y);
  if (!cases.every(([x, y]) => fo(x, y) === 'herbe')) return { ok: false, why: 'Seulement sur l\'herbe de l\'île.' };
  const pres = (x, y) => Math.abs(x - ARRIVEE[0]) <= 1 && y >= ARRIVEE[1] - 1;
  if (!art.sol && cases.some(([x, y]) => pres(x, y))) return { ok: false, why: 'Il faut laisser le débarcadère libre.' };
  // ce qui occupe déjà les cases (sols exceptés)
  const occ = new Set();
  if (!art.sol) for (const [k, f] of Object.entries(FIXES)) if (k !== trav.fixe && k !== ile.cache) for (const [x, y] of emprise(f, ...ile.fixes[k])) occ.add(x + ',' + y);
  for (const t of ile.travaux) if (!ARTICLE[t.a].sol) for (const [x, y] of emprise(t.a, t.x, t.y)) occ.add(x + ',' + y);
  if (!art.sol && cases.some(([x, y]) => occ.has(x + ',' + y))) return { ok: false, why: 'La place est déjà prise.' };
  // un sol se peint partout, sauf sous un bâtiment ou un objet (devant une porte, oui)
  if (art.sol) {
    const dessous = new Set();
    for (const [k, f] of Object.entries(FIXES)) if (k !== ile.cache) for (const [x, y] of corps(f, ...ile.fixes[k])) dessous.add(x + ',' + y);
    for (const t of ile.travaux) if (!ARTICLE[t.a].sol) for (const [x, y] of corps(ARTICLE[t.a], t.x, t.y)) dessous.add(x + ',' + y);
    if (cases.some(([x, y]) => dessous.has(x + ',' + y))) return { ok: false, why: 'Il y a déjà quelque chose ici.' };
  }
  if (art.tr && trophePlace(ile, art.tr)) return { ok: false, why: 'Ce trophée est déjà exposé.' };
  // le chemin
  const essai = { ...ile, fixes: { ...ile.fixes }, travaux: [...ile.travaux] };
  if (trav.fixe) { essai.fixes[trav.fixe] = [trav.x, trav.y]; delete essai.cache; } else essai.travaux.push({ a: trav.a, x: trav.x, y: trav.y });
  if (!cheminLibre(essai)) return { ok: false, why: 'Ça couperait le chemin vers un bâtiment.' };
  return { ok: true };
}
/** depuis le débarcadère, on atteint la porte de chaque bâtiment fixe */
export function cheminLibre(ile) {
  const m = construire({}, ile, { seul: true }), vu = m.reach(...ARRIVEE);
  return portes(ile).every(([x, y]) => vu[y * m.w + x]);
}
/** le dernier article posé qui couvre cette case (pour le ranger ou le déplacer) */
export function articleEn(ile, x, y) {
  for (let i = ile.travaux.length - 1; i >= 0; i--) if (emprise(ile.travaux[i].a, ile.travaux[i].x, ile.travaux[i].y).some(([a, b]) => a === x && b === y)) return i;
  return -1;
}
export function fixeEn(ile, x, y) {
  return Object.keys(FIXES).find((k) => k !== ile.cache && emprise(FIXES[k], ...ile.fixes[k]).slice(0, FIXES[k].taille[0] * FIXES[k].taille[1]).some(([a, b]) => a === x && b === y)) || null;
}
/** pose (après posable) : un sol remplace le sol déjà peint sur la case */
export function poser(ile, trav) {
  const art = ARTICLE[trav.a];
  if (art.sol) ile.travaux = ile.travaux.filter((t) => !(ARTICLE[t.a].sol && t.x === trav.x && t.y === trav.y));
  ile.travaux.push({ ...trav });
}

/* ---------------- la carte ---------------- */
const DECOR_PLAGE = [['palm', 9, 13], ['palm', 6, 22], ['palm', 10, 31], ['palm', 50, 12], ['palm', 55, 22], ['palm', 49, 33], ['palm', 22, 37], ['palm', 39, 37],
  ['rock', 5, 18], ['rock', 53, 28], ['rock', 24, 5], ['rock', 41, 6]];
/** l'intérieur des bâtiments fixes : la mairie (l'adjoint), le musée (ses socles) */
export const SOCLES = [[3, 4], [6, 4], [9, 4], [12, 4], [3, 7], [6, 7], [9, 7], [12, 7]];
/**
 * construit l'île (et ses intérieurs dans maps) à partir de sa donnée. o.seul : la carte de l'île seulement (tests).
 * Renvoie la carte ; m.statues liste les statues à dessiner ({ sp, x, y, carte }).
 */
export function construire(maps, ile, o = {}) {
  const m = new GameMap(ILE, W, H, { outdoor: true, fill: T.WATER, name: ile.nom || 'Mon île', music: 'town' });
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const f = fo(x, y); m.set(x, y, f === 'herbe' ? T.GRASS : f === 'plage' ? T.SAND : f === 'ponton' ? T.BRIDGE : T.WATER); }
  // la plage (sable clair) et quelques palmiers et rochers, les mêmes pour tout le monde
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (fo(x, y) === 'plage') m.deco.push({ k: 'sable', x, y });
  for (const [k, x, y] of DECOR_PLAGE) if (fo(x, y) === 'plage') m.prop(k, x, y);
  m.statues = [];
  // bâtiments fixes
  for (const [k, f] of Object.entries(FIXES)) {
    if (k === ile.cache) continue;   // bâtiment en cours de déplacement
    const [x, y] = ile.fixes[k], B = m.building(f.kind, x, y, { roof: f.toit, name: f.nom });
    if (o.seul) continue;
    const id = `${ILE}:${k}`, dedans = k === 'maison' ? houseInterior(id, f.nom, { bed: true }) : room(id, 15, 11, { floor: k === 'musee' ? 'marble' : 'wood', music: 'house', name: f.nom, wall: k === 'musee' ? 'wall_mart' : 'wall_in' });
    if (k === 'mairie') { for (const [kk, xx, yy] of [['books', 1, 2], ['books', 2, 2], ['plant', 13, 2], ['plant', 1, 9], ['clock', 7, 2]]) dedans.prop(kk, xx, yy); dedans.npc({ id: 'ile:adjoint', x: 7, y: 4, dir: 'down', sprite: 'dame', move: 'static', script: 'adjointIle' }); }
    if (k === 'musee') for (const [kk, xx, yy] of [['plant', 1, 2], ['plant', 13, 2], ['plant', 1, 9], ['plant', 13, 9]]) dedans.prop(kk, xx, yy);
    dedans.outside = { map: ILE, x: B.doorX, y: B.doorY + 1, dir: 'down' };
    dedans.warp(dedans.exitX, dedans.exitY, dedans.outside);
    m.warp(B.doorX, B.doorY, { map: id, x: dedans.exitX, y: dedans.exitY - 1, dir: 'up' });
    if (k === 'musee') {
      for (const [i, [sx, sy]] of SOCLES.entries()) {
        dedans.prop('socle_statue', sx, sy); dedans.object(sx, sy, { socle: i });
        const t = TROPHEE[ile.musee[i]]; if (t) m.statues.push({ sp: t.sp, x: sx, y: sy, carte: id, grand: true });
      }
    }
    maps[id] = dedans;
  }
  // ce que le joueur a posé, dans l'ordre
  const ops = [];
  for (const t of ile.travaux) {
    const a = ARTICLE[t.a];
    if (a.t != null) ops.push(['t', t.x, t.y, a.t]);
    else if (a.p) ops.push(['p', a.p, t.x, t.y]);
    else if (a.s) ops.push(['s', t.x, t.y, t.texte || 'PANNEAU']);
    else if (a.b) ops.push(['b', a.b, t.x, t.y, t.toit || 'red', a.nom]);
    else if (a.tr) { ops.push(['p', 'socle_statue', t.x, t.y]); m.statues.push({ sp: TROPHEE[a.tr].sp, x: t.x, y: t.y, carte: ILE }); }
  }
  applyOps(m, ops, o.seul ? null : maps);
  if (o.seul) for (const t of ile.travaux) { const a = ARTICLE[t.a]; if (a.b) m.building(a.b, t.x, t.y); }
  m.zone(0, 0, W - 1, H - 1, { name: ile.nom || 'Mon île', music: 'town' });
  if (!o.seul) maps[ILE] = m;
  return m;
}
