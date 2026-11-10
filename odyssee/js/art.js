// odyssee/js/art.js — chargement des images du monde (décor, sols, personnages), partagé par Odyssée et TestOdyssée
import { ASSETS, loadImg, loadAll } from './assets.js';
import { packActif } from './gfx.js';
import { DECOR_PLUS } from './data/decor-plus.js';
import { SPRITES } from './data/sprites.js';
import { SOL16_FICHIERS } from './data/sol16.js';

// éléments de décor dessinés repris dans le jeu (les autres restent dessinés par le code : herbes, fleurs…)
const NATURE = ['tree', 'tree2', 'pine', 'snowpine', 'deadtree', 'palm', 'bush', 'rock', 'stalag', 'sign', 'fence', 'lamp', 'mailbox', 'pot', 'itemball', 'bang', 'statue'];
const MOBILIER_PLUS = ['machine_sous', 'borne_tetris', 'borne_invaders', 'borne_briques', 'borne_serpent'];
const SOLS = ['tall0', 'tall1', 'darktall0', 'darktall1', 'snowtall0', 'snowtall1', 'floor_wood', 'floor_center', 'floor_mart', 'floor_lab', 'floor_league', 'floor_gymBug', 'floor_gymRock', 'floor_gymWater', 'floor_gymElec', 'floor_gymGrass', 'floor_gymPsy', 'floor_gymFire', 'floor_gymDragon', 'wall_center', 'wall_mart', 'wall_gym', 'wall_league'];

/** les images du décor ; prechauffe : seulement lancer leur téléchargement (rendu tout de suite, sans attendre) */
export async function loadArt(prechauffe = false) {
  const sprites = {};
  // décor version 2 (vue de 3/4, bible) : tout ce que la planche fournit ; sinon la sélection de la première planche
  for (const k of SPRITES.natureV2 ? Object.keys(SPRITES.nature) : NATURE) sprites[k] = ASSETS.nature(k);
  const dens = {}; for (const [k, v] of Object.entries(SPRITES.nature || {})) if (v[2]) dens[k] = v[2];
  // mobilier (sans écraser un élément de la nature du même nom, comme la statue d'arène)
  for (const k of Object.keys(SPRITES.mobilier || {})) if (!sprites[k]) sprites[k] = ASSETS.mobilier(k);
  for (const [k, v] of Object.entries(SPRITES.mobilier || {})) if (v[2] && !dens[k]) dens[k] = v[2];
  // mobilier dessiné à part (Casino de Métropole : machines à sous et bornes d'arcade), même densité que la planche
  for (const k of MOBILIER_PLUS) { sprites[k] = ASSETS.mobilier(k); dens[k] = 2; }
  // décor du tileset (fontaine, torii, lanternes, cloche…) : dessiné à la densité des tuiles du DS
  for (const k of Object.keys(SPRITES.deco || {})) if (!sprites[k]) { sprites[k] = ASSETS.deco(k); dens[k] = 1; }
  // décor ajouté à la main (arbres d'automne, relief…) : data/decor-plus.js
  for (const [k, [dir, d]] of Object.entries(DECOR_PLUS)) { sprites[k] = ASSETS[dir](k); dens[k] = d; }
  const kits = {}; for (const k of SPRITES.facades || []) kits[k] = ASSETS.facade(k);
  const sols = {}; for (const k of SOLS) sols[k] = ASSETS.sol(k);
  // tileset global (tools/odyssee-tileset.py) : sols à 32 px et pièces des hautes herbes
  const sol32 = {}; for (const k of SPRITES.sol32 || []) sol32[k] = ASSETS.sol32(k);
  for (const [th, ks] of Object.entries(SPRITES.herbes || {})) for (const k of ks) sol32[`h_${th}_${k}`] = ASSETS.herbe(`${th}_${k}`);
  // sols à 16 px (PixelLab) : ils remplacent ceux du tileset
  const pack = packActif();   // Options → Graphismes → Sol du dehors : un pack de tuiles remplace aussi les sols à 16 px
  if (!pack) for (const k of SOL16_FICHIERS) sol32['s16_' + k] = ASSETS.sol16(k);
  const tuilesPack = {}; if (pack) for (const k of pack.tuiles) tuilesPack[k] = ASSETS.gfx(pack.dossier, k);
  // décor du pack (arbres, rochers…) : remplace celui du jeu, dessiné pixel pour pixel
  if (pack?.kits) for (const [k, f] of Object.entries(pack.kits)) kits[k] = ASSETS.gfx(pack.dossier, f);   // façades du pack
  const batsPack = {}; if (pack?.batiments) for (const L of Object.values(pack.batiments)) for (const [n] of L) batsPack[n] = ASSETS.gfx(pack.dossier, 'b_' + n);
  if (pack?.decor) for (const k of pack.decor) { sprites[k] = ASSETS.gfx(pack.dossier, 'd_' + k); dens[k] = 2; }
  // devant un personnage dans l'herbe : le bas de la nappe du tileset (et l'image de l'herbe qui bouge)
  for (const [th, key] of [['prairie', 'grassfront'], ['bois', 'darkfront'], ['neige', 'snowfront']]) {
    if (!SPRITES.herbes?.[th]) continue;
    sprites[key] = ASSETS.herbe(th + '_front'); sprites[key + '2'] = ASSETS.herbe(th + '_front2'); dens[key] = dens[key + '2'] = 2;
  }
  // devant un personnage dans les hautes herbes à 16 px : le bas de la tuile
  sprites.grassfront = ASSETS.sol16('hautes_herbes_front'); sprites.grassfront2 = ASSETS.sol16('hautes_herbes_front2'); dens.grassfront = dens.grassfront2 = 1;
  // animations de terrain de HeartGold / SoulSilver (mer, rivages, fleurs)
  const hg = {}; for (const k of Object.keys(SPRITES.hgss || {})) hg[k] = ASSETS.hgss(k);
  if (prechauffe) {
    // même requête que loadImg (crossOrigin), pour que le cache des images du navigateur la resserve telle quelle
    const L = [sprites, kits, sols, sol32, hg, tuilesPack, batsPack].flatMap(Object.values).concat([ASSETS.chars, ASSETS.title, SPRITES.suiveurs && ASSETS.suiveurs, ASSETS.relief]);
    return L.filter(Boolean).map((src) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.src = src; return im; });
  }
  const [S, K, L, L32, HGI, chars, title, suiveurs, relief, PK, PB] = await Promise.all([loadAll(sprites), loadAll(kits), loadAll(sols), loadAll(sol32), loadAll(hg), loadImg(ASSETS.chars), loadImg(ASSETS.title), SPRITES.suiveurs ? loadImg(ASSETS.suiveurs) : null, loadImg(ASSETS.relief).catch(() => null), loadAll(tuilesPack), loadAll(batsPack)]);
  return { sprites: S, dens, kits: K, sols: L, sol32: L32, hgss: HGI, chars, title, suiveurs, relief, pack: pack ? PK : null, batiments: pack?.batiments ? { images: PB, styles: pack.batiments } : null };
}
