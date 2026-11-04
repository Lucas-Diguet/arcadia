// testodyssee/js/ile/modele.js — l'île privée du joueur (sans DOM) : la même île pour tout le monde, ce que le joueur y
// pose (case par case), les trophées débloqués, et le musée où on les expose librement (ses salles s'ouvrent au fil
// des trophées). Tout tient dans une donnée (« l'île ») qui suivra un jour la sauvegarde d'Odyssée ; les cartes sont
// reconstruites à partir d'elle à chaque visite.
//
// L'île : { v, nom, biome, fixes: { maison: [x, y], mairie, musee }, travaux: [{ a, x, y, texte? }], donjons: [...],
//           musee: { travaux: [...] } }
// Deux zones de construction : 'ile' (dehors) et 'musee' (dedans). Un article = une tuile, un décor ou un bâtiment ;
// un chemin reste toujours libre jusqu'aux portes (dehors) et jusqu'à chaque salle (au musée).
import { T } from '../../../odyssee/js/world/tiles.js';
import { GameMap, rng, BUILDINGS } from '../../../odyssee/js/world/mapgen.js';
import { applyOps } from '../../../odyssee/js/world/retouches.js';
import { houseInterior, room } from '../../../odyssee/js/world/interiors.js';
import { PIEGES, STATUES, GARDES, completerUsine, enStock, ajouterStock, nomGarde, GARDE } from './usine.js';

export const ILE = 'labo:ile', MUSEE = 'labo:ile:musee', USINE = 'labo:ile:usine', CASERNE = 'labo:ile:caserne', SALLE = 'labo:ile:salle';
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

/* ---------------- les trophées ---------------- */
const VILLES = ['Sylvebourg', 'Port-Azur', 'Voltacité', 'Floralia', 'Mirage', 'Port-Granit', 'Cendrelune', 'Fort-Écaille'];
const de = (n) => (/^[AEIOUYÉH]/i.test(n) ? 'd\'' : 'de ') + n;
const NOMS_STATUES = { crypte: 'Statue de la Crypte', didier: 'Statue du Donjon de Didier', miroirs: 'Statue du Donjon des Miroirs', voies: 'Statue du trio des lacs', pyramide: 'Statue de la Pyramide de l\'Ascension', mine: 'Statue de la Mine Effondrée', train: 'Statue du Train Fantôme', temple: 'Statue du Temple des Éléments' };
const DONJONS_NOMS = { crypte: 'la Crypte', didier: 'le Donjon de Didier', miroirs: 'le Donjon des Miroirs', voies: 'le Sanctuaire des Trois Voies', pyramide: 'la Pyramide de l\'Ascension', mine: 'la Mine Effondrée', train: 'le Train Fantôme', temple: 'le Temple des Éléments' };
/** une statue par arène d'Odyssée (badge) et par donjon du labo, avec ce qui l'a rapportée */
export const TROPHEES = [
  ...VILLES.map((v, i) => ({ id: `badge${i}`, nom: `Statue de l'arène ${de(v)}`, sp: [212, 130, 135, 3, 65, 76, 6, 149][i], badge: i, origine: `En récompense pour avoir triomphé de l'arène ${de(v)}.` })),
  ...Object.entries({ crypte: 92, didier: 2001, miroirs: 122, voies: 482, pyramide: 563, mine: 306, train: 94, temple: 493 }).map(([id, sp]) => ({ id, sp, donjon: id, nom: NOMS_STATUES[id], origine: `En récompense pour avoir terminé ${DONJONS_NOMS[id]}.` })),
];
export const TROPHEE = Object.fromEntries(TROPHEES.map((t) => [t.id, t]));

/**
 * le catalogue (gratuit pendant les tests) : t = tuile, p = décor, s = panneau, b = bâtiment, tr = trophée.
 * couvre : cases prises autour de la case posée (par défaut, la case seule) ; passe : celles où l'on marche quand même
 * (le portique torii : deux poteaux et un passage). zones : où il se pose (dehors par défaut).
 */
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
  { cat: 'Mobilier', id: 'banc', nom: 'Banc', p: 'banc', zones: ['ile', 'musee'] },
  { cat: 'Mobilier', id: 'lamp', nom: 'Lampadaire', p: 'lamp' },
  { cat: 'Mobilier', id: 'lanterne', nom: 'Lanterne', p: 'lanterne', zones: ['ile', 'musee'] },
  { cat: 'Mobilier', id: 'fontaine', nom: 'Fontaine', p: 'fontaine', couvre: [[0, 0], [1, 0]], w: 2 },
  { cat: 'Mobilier', id: 'tonneau', nom: 'Tonneau', p: 'tonneau', zones: ['ile', 'salle'] },
  { cat: 'Mobilier', id: 'caisse', nom: 'Caisse', p: 'caisse', zones: ['ile', 'salle'] },
  { cat: 'Mobilier', id: 'pot', nom: 'Pot de fleurs', p: 'pot', zones: ['ile', 'musee', 'salle'] },
  { cat: 'Mobilier', id: 'plante', nom: 'Plante verte', p: 'plant', zones: ['musee'] },
  { cat: 'Mobilier', id: 'vase', nom: 'Vase', p: 'vase', zones: ['musee'] },
  { cat: 'Mobilier', id: 'colonne', nom: 'Colonne', p: 'colonne', zones: ['ile', 'musee', 'salle'] },
  { cat: 'Mobilier', id: 'parasol', nom: 'Parasol', p: 'parasol' },
  { cat: 'Mobilier', id: 'boite', nom: 'Boîte aux lettres', p: 'mailbox' },
  { cat: 'Mobilier', id: 'torii', nom: 'Portique torii', p: 'torii', couvre: [[-1, 0], [0, 0], [1, 0]], passe: [[0, 0]], dz: 0.95 },
  { cat: 'Mobilier', id: 'panneau', nom: 'Panneau', s: true, zones: ['ile', 'musee'] },
  { cat: 'Bâtiments', id: 'house', nom: 'Maison', b: 'house', taille: [4, 3] },
  { cat: 'Bâtiments', id: 'house2', nom: 'Grande maison', b: 'house2', taille: [5, 3] },
  { cat: 'Bâtiments', id: 'bighouse', nom: 'Résidence', b: 'bighouse', taille: [6, 4] },
  { cat: 'Bâtiments', id: 'usine', nom: 'Usine à pièges', b: 'bighouse', toit: 'gray', taille: [6, 4], lieu: USINE, unique: true },
  { cat: 'Bâtiments', id: 'caserne', nom: 'Caserne', b: 'house2', toit: 'green', taille: [5, 3], lieu: CASERNE, unique: true },
  { cat: 'Loisirs', id: 'borne', nom: 'Borne d\'arcade', p: 'borne' },
  { cat: 'Sols', id: 'chemin', nom: 'Chemin de terre', t: T.PATH, sol: true },
  { cat: 'Sols', id: 'paves', nom: 'Pavés', t: T.PAVE, sol: true },
  { cat: 'Sols', id: 'sable', nom: 'Sable', t: T.SAND, sol: true },
  { cat: 'Sols', id: 'herbe', nom: 'Herbe', t: T.GRASS, sol: true },
  ...PIEGES.map((p) => ({ cat: 'Pièges', id: p.id, nom: p.nom, piege: p, stock: true, zones: ['ile', 'salle'] })),
  ...STATUES.map((q) => ({ cat: 'Statues piégées', id: q.id, nom: q.nom, statue: q, stock: true, dir: true, zones: ['ile', 'salle'] })),
  ...GARDES.map((q) => ({ cat: 'Gardes', id: q.id, nom: q.nom, garde: q, stock: true, dir: true, zones: ['ile', 'salle'] })),
  ...TROPHEES.map((t) => ({ cat: 'Trophées', id: 'tr:' + t.id, nom: t.nom, tr: t.id, zones: ['ile', 'musee'] })),
];
export const ARTICLE = Object.fromEntries(CATALOGUE.map((c) => [c.id, c]));
/** la sorte d'une zone : 'ile', 'musee', ou 'salle' (une salle d'entraînement : 'salle:plan:numéro') */
export const sorteZone = (zone) => String(zone).split(':')[0];
export const dansZone = (a, zone) => (a.zones || ['ile']).includes(sorteZone(zone));

/* ---------------- la donnée ---------------- */
export function nouvelleIle(nom = 'Mon île') {
  return completerUsine({ v: 2, nom, biome: 'plaine', fixes: Object.fromEntries(Object.entries(FIXES).map(([k, f]) => [k, [...f.defaut]])), travaux: [], donjons: [], musee: { travaux: [] } });
}
/** complète une île lue (version plus ancienne, champ manquant) */
export function etatIle(ile) {
  const n = nouvelleIle(ile?.nom);
  if (!ile || typeof ile !== 'object') return n;
  ile.fixes = { ...n.fixes, ...(ile.fixes || {}) };
  ile.travaux = Array.isArray(ile.travaux) ? ile.travaux.filter((t) => ARTICLE[t?.a]) : [];
  ile.donjons = Array.isArray(ile.donjons) ? ile.donjons : [];
  // version 1 : huit socles fixes ; on garde les statues à la place de leur socle
  if (!ile.musee || !Array.isArray(ile.musee.travaux)) {
    const anciens = ile.musee && typeof ile.musee === 'object' ? ile.musee : {};
    ile.musee = { travaux: Object.entries(anciens).filter(([, id]) => TROPHEE[id]).map(([i, id]) => ({ a: 'tr:' + id, x: [3, 6, 9, 12][i % 4], y: i < 4 ? 4 : 7 })) };
  }
  ile.musee.travaux = ile.musee.travaux.filter((t) => ARTICLE[t?.a]);
  ile.biome ||= 'plaine'; ile.v = 2;
  return completerUsine(ile);
}
/** trophées débloqués : badges de la partie et donjons finis */
export function debloques(ile, st) {
  return TROPHEES.filter((t) => (t.badge != null ? !!st?.badges?.[t.badge] : ile.donjons.includes(t.donjon))).map((t) => t.id);
}
/** un trophée n'existe qu'en un exemplaire : sur l'île, au musée, ou en attente */
export function trophePlace(ile, id) {
  if (ile.travaux.some((t) => ARTICLE[t.a]?.tr === id)) return 'ile';
  if (ile.musee.travaux.some((t) => ARTICLE[t.a]?.tr === id)) return 'musee';
  return null;
}
/** le musée s'agrandit avec les trophées : une salle, puis une de plus tous les quatre trophées (quatre au plus) */
export const sallesMusee = (n) => Math.min(4, 1 + Math.floor(n / 4));
export function liste(ile, zone) {
  if (zone === 'musee') return ile.musee.travaux;
  if (sorteZone(zone) === 'salle') { const [, pi, k] = zone.split(':'); return ile.plans[+pi].salles[+k]; }
  return ile.travaux;
}

/* ---------------- le terrain de l'île (le même pour tout le monde) ---------------- */
let FORME = null;
/** 'eau', 'plage', 'herbe' ou 'ponton' pour chaque case */
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

/* ---------------- le musée : des salles en enfilade ---------------- */
const SW = 13, SH = 9;
export const tailleMusee = (n) => [1 + n * (SW + 1), SH + 3];
/** sortie du musée (le tapis) et case d'arrivée */
export const SORTIE_MUSEE = [Math.floor(SW / 2) + 1, SH + 2];
/** cases libres du musée : le sol des salles, sauf les passages entre salles et l'entrée */
function solMusee(n, x, y) {
  const [w] = tailleMusee(n);
  if (x < 1 || x >= w - 1 || y < 2 || y > SH + 1) return false;
  if (x % (SW + 1) === 0) return false;                                       // mur entre deux salles (passage compris)
  if ((x % (SW + 1) === 1 || x % (SW + 1) === SW) && y >= 5 && y <= 7) return false;   // devant un passage
  if (Math.abs(x - SORTIE_MUSEE[0]) <= 1 && y >= SH) return false;            // devant l'entrée
  return true;
}
/** les points à garder reliés : l'entrée et chaque salle */
const pointsMusee = (n) => Array.from({ length: n }, (_, k) => [1 + k * (SW + 1) + 1, 6]);

/* ---------------- les règles de pose ---------------- */
/** les cases que couvre un article posé (un bâtiment : son emprise et la case devant sa porte) */
export function emprise(a, x, y) {
  const art = typeof a === 'string' ? ARTICLE[a] : a;
  if (art?.b || art?.kind) { const [w, h] = art.taille; const out = []; for (let j = 0; j <= h; j++) for (let i = 0; i < w; i++) out.push([x + i, y + j]); return out; }
  return (art?.couvre || [[0, 0]]).map(([dx, dy]) => [x + dx, y + dy]);
}
/** les cases d'un bâtiment, sans celle devant sa porte (pour un décor : toutes ses cases) */
export function corps(a, x, y) { return (a?.b || a?.kind) ? emprise(a, x, y).slice(0, a.taille[0] * a.taille[1]) : emprise(a, x, y); }
/** les portes des bâtiments fixes (case devant), à garder reliées au ponton */
export function portes(ile) {
  const out = Object.entries(FIXES).filter(([k]) => k !== ile.cache).map(([k, f]) => { const [x, y] = ile.fixes[k]; return [x + BUILDINGS[f.kind].door, y + f.taille[1]]; });
  // l'usine et la caserne aussi
  for (const t of ile.travaux) { const a = ARTICLE[t.a]; if (a.lieu) out.push([t.x + BUILDINGS[a.b].door, t.y + a.taille[1]]); }
  return out;
}

/**
 * peut-on poser cet article ici ? { ok, why }. trav = { a, x, y } ; pour déplacer un bâtiment fixe : { fixe, x, y }.
 * Dehors : sur l'herbe, sans rien recouvrir, le débarcadère libre et le chemin vers chaque porte. Au musée : sur le
 * sol des salles, sans boucher les passages ni l'entrée.
 */
export function posable(ile, trav, zone = 'ile', o = {}) {
  const art = trav.fixe ? FIXES[trav.fixe] : ARTICLE[trav.a];
  if (!art) return { ok: false, why: 'inconnu' };
  if (!trav.fixe && !dansZone(art, zone)) return { ok: false, why: zone === 'musee' ? 'Ça ne se pose pas au musée.' : 'Ça se pose au musée.' };
  if (sorteZone(zone) === 'salle') return posableSalle(liste(ile, zone), trav);
  const cases = emprise(art, trav.x, trav.y);
  const n = o.salles || 1;
  // pièges, statues et gardes : il faut les avoir en stock (achetés à l'usine, engagés à la caserne)
  if (!trav.fixe && art.stock && zone === 'ile' && enStock(ile, art.id) < 1 && !o.sansStock) return { ok: false, why: art.garde ? 'Engage d\'abord ce garde à la caserne.' : 'Il t\'en faut un : il s\'achète à l\'usine à pièges.' };
  if (!trav.fixe && art.unique && ile.travaux.some((t) => t.a === art.id)) return { ok: false, why: `Il n'y a qu'un bâtiment comme celui-là : ${art.nom}.` };
  if (zone === 'musee') { if (!cases.every(([x, y]) => solMusee(n, x, y))) return { ok: false, why: 'Pas ici : il faut laisser les passages et l\'entrée libres.' }; }
  else {
    if (!cases.every(([x, y]) => fo(x, y) === 'herbe')) return { ok: false, why: 'Seulement sur l\'herbe de l\'île.' };
    if (!art.sol && cases.some(([x, y]) => Math.abs(x - ARRIVEE[0]) <= 1 && y >= ARRIVEE[1] - 1)) return { ok: false, why: 'Il faut laisser le débarcadère libre.' };
  }
  // ce qui occupe déjà les cases
  const occ = new Set(), dessous = new Set();
  if (zone === 'ile') for (const [k, f] of Object.entries(FIXES)) {
    if (k === trav.fixe || k === ile.cache) continue;
    for (const [x, y] of emprise(f, ...ile.fixes[k])) occ.add(x + ',' + y);
    for (const [x, y] of corps(f, ...ile.fixes[k])) dessous.add(x + ',' + y);
  }
  for (const t of liste(ile, zone)) {
    const a = ARTICLE[t.a]; if (a.sol) continue;
    for (const [x, y] of emprise(a, t.x, t.y)) occ.add(x + ',' + y);
    for (const [x, y] of corps(a, t.x, t.y)) dessous.add(x + ',' + y);
  }
  // un sol se peint partout, sauf sous un bâtiment ou un objet (devant une porte, oui)
  if (art.sol) { if (cases.some(([x, y]) => dessous.has(x + ',' + y))) return { ok: false, why: 'Il y a déjà quelque chose ici.' }; }
  else if (cases.some(([x, y]) => occ.has(x + ',' + y))) return { ok: false, why: 'La place est déjà prise.' };
  if (art.tr && trophePlace(ile, art.tr)) return { ok: false, why: 'Ce trophée est déjà exposé.' };
  // le chemin
  const essai = { ...ile, fixes: { ...ile.fixes }, travaux: [...ile.travaux], musee: { travaux: [...ile.musee.travaux] } };
  if (trav.fixe) { essai.fixes[trav.fixe] = [trav.x, trav.y]; delete essai.cache; } else liste(essai, zone).push({ a: trav.a, x: trav.x, y: trav.y });
  if (o.sansChemin) return { ok: true };
  if (zone === 'musee' ? !musseeRelie(essai, n) : !cheminLibre(essai)) return { ok: false, why: zone === 'musee' ? 'Ça couperait le passage vers une salle.' : 'Ça couperait le chemin vers un bâtiment.' };
  return { ok: true };
}
/** depuis le débarcadère, on atteint la porte de chaque bâtiment fixe */
export function cheminLibre(ile) {
  const m = construire({}, ile, { seul: true }), vu = m.reach(...ARRIVEE);
  return portes(ile).every(([x, y]) => vu[y * m.w + x]);
}
/** depuis l'entrée du musée, on atteint chaque salle */
export function musseeRelie(ile, n) {
  const m = construireMusee(ile, n), vu = m.reach(SORTIE_MUSEE[0], SORTIE_MUSEE[1] - 1);
  return pointsMusee(n).every(([x, y]) => vu[y * m.w + x]);
}
/** le dernier article posé qui couvre cette case (pour le ranger ou le déplacer) */
export function articleEn(ile, x, y, zone = 'ile') {
  const l = liste(ile, zone);
  for (let i = l.length - 1; i >= 0; i--) if (corps(ARTICLE[l[i].a], l[i].x, l[i].y).some(([a, b]) => a === x && b === y)) return i;
  return -1;
}
export function fixeEn(ile, x, y) {
  return Object.keys(FIXES).find((k) => k !== ile.cache && corps(FIXES[k], ...ile.fixes[k]).some(([a, b]) => a === x && b === y)) || null;
}
/** pose (après posable) : un sol remplace le sol déjà peint sur la case */
export function poser(ile, trav, zone = 'ile') {
  const art = ARTICLE[trav.a];
  if (art.sol && zone === 'ile') ile.travaux = ile.travaux.filter((t) => !(ARTICLE[t.a].sol && t.x === trav.x && t.y === trav.y));
  liste(ile, zone).push({ ...trav });
  if (art.stock && zone === 'ile') ajouterStock(ile, art.id, -1);
}
/** reprendre l'article n° i (le ranger ou le prendre en main) : un piège, une statue ou un garde retourne au stock */
export function reprendre(ile, i, zone = 'ile') {
  const [t] = liste(ile, zone).splice(i, 1);
  if (t && ARTICLE[t.a].stock && zone === 'ile') ajouterStock(ile, t.a, 1);
  return t;
}

/* ---------------- les salles d'entraînement ---------------- */
// Une salle : 15 × 10 cases posables (coordonnées de la carte : x de 1 à 15, y de 3 à 12). On entre en bas (8, 12),
// l'escalier de la salle suivante est en haut (8, 2) : un chemin doit toujours relier les deux.
export const SALLE_X = 1, SALLE_Y = 3, SALLE_W = 15, SALLE_H = 10;
export const ENTREE_SALLE = [8, 12], ESCALIER_SALLE = [8, 2];
export const MAX_SALLES = 5, MAX_PLANS = 6;
const dansSalle = (x, y) => x >= SALLE_X && x < SALLE_X + SALLE_W && y >= SALLE_Y && y < SALLE_Y + SALLE_H;
/** un article bloque-t-il le passage ? (les pièges et les sols, non) */
export const bloque = (a) => !(a.piege || a.sol || a.t === T.TALL || a.t === T.FLOWER);
/** de l'entrée de la salle, on atteint l'escalier sans traverser d'obstacle */
export function salleRelie(items) {
  const dur = new Set();
  for (const t of items) { const a = ARTICLE[t.a]; if (a && bloque(a)) for (const [x, y] of corps(a, t.x, t.y)) dur.add(x + ',' + y); }
  const vu = new Set([ENTREE_SALLE.join(',')]), file = [ENTREE_SALLE];
  while (file.length) {
    const [x, y] = file.shift();
    if (x === ESCALIER_SALLE[0] && y === ESCALIER_SALLE[1] + 1) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
      if (!dansSalle(nx, ny) || vu.has(k) || dur.has(k)) continue;
      vu.add(k); file.push([nx, ny]);
    }
  }
  return false;
}
export function posableSalle(items, trav) {
  const art = ARTICLE[trav.a];
  if (!art || !dansZone(art, 'salle')) return { ok: false, why: 'Ça ne se pose pas dans une salle d\'entraînement.' };
  const cases = emprise(art, trav.x, trav.y);
  if (!cases.every(([x, y]) => dansSalle(x, y))) return { ok: false, why: 'Seulement dans la salle.' };
  if (cases.some(([x, y]) => x === ENTREE_SALLE[0] && y === ENTREE_SALLE[1])) return { ok: false, why: 'Il faut laisser l\'entrée libre.' };
  const occ = new Set(); for (const t of items) for (const [x, y] of emprise(ARTICLE[t.a], t.x, t.y)) occ.add(x + ',' + y);
  if (cases.some(([x, y]) => occ.has(x + ',' + y))) return { ok: false, why: 'La place est déjà prise.' };
  if (bloque(art) && !salleRelie([...items, trav])) return { ok: false, why: 'Ça couperait le chemin jusqu\'à l\'escalier.' };
  return { ok: true };
}
/** une salle collée sur l'île (ox, oy : la case de son coin en haut à gauche) : ses articles, à leur place sur l'île */
export const collage = (items, ox, oy) => items.map((t) => ({ ...t, x: t.x - SALLE_X + ox, y: t.y - SALLE_Y + oy }));
/** combien de chaque article la salle demande */
export function besoins(items) { const n = {}; for (const t of items) if (ARTICLE[t.a]?.stock) n[t.a] = (n[t.a] || 0) + 1; return n; }
/** peut-on coller cette salle ici ? { ok, why, manque } (le stock doit suffire, comme pour une pose à la main) */
export function collable(ile, items, ox, oy) {
  const manque = Object.entries(besoins(items)).filter(([id, n]) => enStock(ile, id) < n).map(([id, n]) => [id, n - enStock(ile, id)]);
  const essai = { ...ile, fixes: { ...ile.fixes }, travaux: [...ile.travaux], musee: ile.musee, stock: { ...ile.stock } };
  for (const t of collage(items, ox, oy)) {
    const r = posable(essai, t, 'ile', { sansChemin: true, sansStock: true });
    if (!r.ok) return { ok: false, why: r.why, manque };
    essai.travaux.push(t);
  }
  if (!cheminLibre(essai)) return { ok: false, why: 'Ça couperait le chemin vers un bâtiment.', manque };
  if (manque.length) return { ok: false, why: 'Il te manque : ' + manque.map(([id, n]) => `${n} × ${ARTICLE[id].nom}`).join(', ') + '.', manque };
  return { ok: true, manque };
}
export function coller(ile, items, ox, oy) { for (const t of collage(items, ox, oy)) poser(ile, t, 'ile'); }

/* ---------------- les cartes ---------------- */
const DECOR_PLAGE = [['palm', 9, 13], ['palm', 6, 22], ['palm', 10, 31], ['palm', 50, 12], ['palm', 55, 22], ['palm', 49, 33], ['palm', 22, 37], ['palm', 39, 37],
  ['rock', 5, 18], ['rock', 53, 28], ['rock', 24, 5], ['rock', 41, 6]];
/** ce qui a été posé, sur une carte : tuiles, décors, panneaux, bâtiments, trophées (qui disent d'où ils viennent) */
function poserTravaux(m, travaux, maps, o = {}) {
  const ops = [], apres = [];
  m.statues ||= []; m.pieges ||= []; m.defenses ||= []; m.lieux ||= [];
  for (const t of travaux) {
    const a = ARTICLE[t.a];
    if (a.t != null) ops.push(['t', t.x, t.y, a.t]);
    else if (a.p && !a.couvre && a.p !== 'borne') ops.push(['p', a.p, t.x, t.y]);
    else if (a.p) apres.push(() => {
      // décor de plusieurs cases : dessiné au milieu, ses cases bloquées sauf celles où l'on passe
      const passe = new Set((a.passe || []).map(([dx, dy]) => (t.x + dx) + ',' + (t.y + dy)));
      for (const [x, y] of emprise(a, t.x, t.y)) if (!passe.has(x + ',' + y)) { m.under.set(x + ',' + y, m.get(x, y)); m.set(x, y, T.BLOCK); }
      m.deco.push({ k: a.p, x: t.x, y: t.y, w: a.w, dz: a.dz });
    });
    else if (a.s) ops.push(['s', t.x, t.y, t.texte || 'PANNEAU']);
    else if (a.lieu) m.lieux.push({ a, t });
    else if (a.b) ops.push(['b', a.b, t.x, t.y, t.toit || 'red', a.nom]);
    else if (a.piege) {
      // un piège ne se voit que si on le demande (o.voir), ou une fois déclenché
      m.pieges.push({ id: a.id, x: t.x, y: t.y });
      if (o.voir || o.vus?.has(t.x + ',' + t.y)) m.deco.push({ k: a.piege.img, x: t.x, y: t.y, dz: 0.9 });
    } else if (a.statue) {
      ops.push(['p', 'socle_statue', t.x, t.y]);
      m.statues.push({ sp: a.statue.sp, x: t.x, y: t.y, carte: m.id, grand: o.grand });
      m.defenses.push({ id: a.id, x: t.x, y: t.y, dir: t.dir || 'down', statue: a.statue });
      apres.push(() => m.object(t.x, t.y, { defense: a.id, use: (api) => api.game.ile?.parlerDefense(t) }));
    } else if (a.garde) {
      m.defenses.push({ id: a.id, x: t.x, y: t.y, dir: t.dir || 'down', garde: a.garde });
      if (o.seul) apres.push(() => m.set(t.x, t.y, T.BLOCK));
      else m.npc({ id: `ile:garde:${t.x},${t.y}`, x: t.x, y: t.y, dir: t.dir || 'down', sprite: a.garde.sprite, move: 'static', nom: nomGarde(t.x, t.y), talk: (api) => api?.game?.ile?.parlerDefense(t) });
    } else if (a.p === 'borne') {
      ops.push(['p', 'borne', t.x, t.y]);
      apres.push(() => m.object(t.x, t.y, { borne: true, use: (api) => api.game.ile?.borne() }));
    }
    else if (a.tr) {
      const tr = TROPHEE[a.tr];
      ops.push(['p', 'socle_statue', t.x, t.y]);
      m.statues.push({ sp: tr.sp, x: t.x, y: t.y, carte: m.id, grand: o.grand });
      apres.push(() => m.object(t.x, t.y, { trophee: tr.id, use: (api) => api.game.ui.say([`${tr.nom}.`, tr.origine]) }));
    }
  }
  applyOps(m, ops, maps);
  if (!maps) for (const t of travaux) { const a = ARTICLE[t.a]; if (a.b && !a.lieu) m.building(a.b, t.x, t.y); }
  for (const f of apres) f();
}
/** le musée, avec n salles en enfilade reliées par des passages de trois cases */
export function construireMusee(ile, n = 1) {
  const [w, h] = tailleMusee(n);
  const m = room(MUSEE, w, h, { floor: 'marble', music: 'house', name: 'Musée', wall: 'wall_mart', exitX: SORTIE_MUSEE[0] });
  for (let x = 0; x < w; x++) if (x !== m.exitX) m.set(x, h - 1, T.WALL);
  for (let k = 1; k < n; k++) for (let y = 2; y < h - 1; y++) if (y < 5 || y > 7) m.set(k * (SW + 1), y, T.WALL);
  m.statues = [];
  poserTravaux(m, ile.musee.travaux, null, { grand: true });
  m.salles = n;
  return m;
}
/**
 * construit l'île et ses intérieurs (dans maps) à partir de sa donnée. o.seul : la carte de l'île seulement (tests,
 * chemin libre) ; o.salles : nombre de salles du musée. Renvoie la carte de l'île ; m.statues liste ses statues.
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
    const id = `${ILE}:${k}`;
    const dedans = k === 'musee' ? construireMusee(ile, o.salles || 1) : k === 'maison' ? houseInterior(id, f.nom, { bed: true }) : room(id, 15, 11, { floor: 'wood', music: 'house', name: f.nom, wall: 'wall_in' });
    if (k === 'mairie') { for (const [kk, xx, yy] of [['books', 1, 2], ['books', 2, 2], ['plant', 13, 2], ['plant', 1, 9], ['clock', 7, 2]]) dedans.prop(kk, xx, yy); dedans.npc({ id: 'ile:adjoint', x: 7, y: 4, dir: 'down', sprite: 'dame', move: 'static' }); }
    dedans.outside = { map: ILE, x: B.doorX, y: B.doorY + 1, dir: 'down' };
    dedans.warp(dedans.exitX, dedans.exitY, dedans.outside);
    m.warp(B.doorX, B.doorY, { map: id, x: dedans.exitX, y: dedans.exitY - 1, dir: 'up' });
    maps[id] = dedans;
  }
  poserTravaux(m, ile.travaux, o.seul ? null : maps, { voir: o.voir });
  // l'usine à pièges et la caserne : leur bâtiment, et leur intérieur
  for (const { a, t } of m.lieux) {
    const B = m.building(a.b, t.x, t.y, { roof: a.toit, name: a.nom });
    if (o.seul) continue;
    const dedans = a.lieu === USINE ? interieurUsine() : interieurCaserne();
    dedans.outside = { map: ILE, x: B.doorX, y: B.doorY + 1, dir: 'down' };
    dedans.warp(dedans.exitX, dedans.exitY, dedans.outside);
    m.warp(B.doorX, B.doorY, { map: a.lieu, x: dedans.exitX, y: dedans.exitY - 1, dir: 'up' });
    maps[a.lieu] = dedans;
  }
  m.zone(0, 0, W - 1, H - 1, { name: ile.nom || 'Mon île', music: 'town' });
  if (!o.seul) maps[ILE] = m;
  return m;
}

/** l'usine : la contremaîtresse (achats, statues) et le technicien (salles d'entraînement) */
export function interieurUsine() {
  const m = room(USINE, 15, 11, { floor: 'gymRock', music: 'house', name: 'Usine à pièges', wall: 'wall_mart' });
  for (const [k, x, y] of [['labmachine', 1, 2], ['labmachine', 2, 2], ['caisse', 12, 2], ['caisse', 13, 2], ['tonneau', 13, 3], ['pc', 10, 2], ['plant', 1, 9], ['plant', 13, 9]]) m.prop(k, x, y, true);
  m.npc({ id: 'ile:contremaitresse', x: 4, y: 4, dir: 'down', sprite: 'scientifique', move: 'static', nom: 'Contremaîtresse' });
  m.npc({ id: 'ile:technicien', x: 10, y: 4, dir: 'down', sprite: 'savant', move: 'static', nom: 'Technicien' });
  m.sign(7, 2, 'SALLE D\'ENTRAÎNEMENT\nParle au technicien pour concevoir et tester tes salles de pièges.');
  return m;
}
/** la caserne : le recruteur */
export function interieurCaserne() {
  const m = room(CASERNE, 13, 9, { floor: 'wood', music: 'house', name: 'Caserne', wall: 'wall_in' });
  for (const [k, x, y] of [['books', 1, 2], ['books', 2, 2], ['clock', 6, 2], ['plant', 11, 2], ['plant', 1, 7]]) m.prop(k, x, y, true);
  m.npc({ id: 'ile:recruteur', x: 6, y: 4, dir: 'down', sprite: 'garde', move: 'static', nom: 'Recruteur' });
  return m;
}
/** une salle d'entraînement : l'entrée en bas, l'escalier vers la salle suivante en haut, ce que le plan y pose */
export function construireSalle(ile, pi, k, o = {}) {
  const plan = ile.plans[pi], n = plan.salles.length;
  const m = room(SALLE, SALLE_W + 2, SALLE_H + 4, { floor: 'gymRock', music: 'house', name: `${plan.nom} · salle ${k + 1}/${n}`, wall: 'wall_gym', exitX: ENTREE_SALLE[0] });
  m.set(ESCALIER_SALLE[0], ESCALIER_SALLE[1], T.STAIRS);
  m.salle = { pi, k, n };
  poserTravaux(m, plan.salles[k], null, { voir: o.voir, vus: o.vus });
  return m;
}
