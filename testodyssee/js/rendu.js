// testodyssee/js/rendu.js — ce que le labo ajoute au rendu d'Odyssée : donjons « clairs » (sol et murs blancs),
// sol glacé, et faisceaux de lumière. Branché une fois au démarrage (navigateur seulement).
import * as THREE from 'three';
import { WorldView, HPX, EL } from '../../odyssee/js/render/world3d.js';
import { Sol } from '../../odyssee/js/render/sol.js';
import { T } from '../../odyssee/js/world/tiles.js';

// textures d'Odyssée reprises pour les styles de donjon : clair (miroirs), sable (pyramide)
const CLAIR = { sol: 'floor_musee', mur: 'wall_mart', haut: ['snow', 'floor_lab', 'floor_mart'], glace: 'floor_gymWater', fond: '#e8eef8' };
const EGYPTE = { sol: ['gl_sable'], mur: ['mur_tombeau', 'wall_in'], haut: ['haut_tombeau', 'cavetop'], fond: '#1c1408' };
const CHATEAU = { sol: ['sol_chateau'], mur: ['mur_chateau', 'wall_in'], haut: ['haut_chateau', 'cavetop'], fond: '#0c0a10' };
const MANOIR = { sol: ['sol_manoir'], mur: ['mur_manoir', 'wall_in'], haut: ['haut_manoir', 'cavetop'], fond: '#0a0608' };
const FILLE = { sol: ['sol_chambre'], mur: ['mur_fille', 'wall_in'], haut: ['haut_manoir', 'cavetop'], fond: '#0a0608' };
const GARCON = { sol: ['sol_chambre'], mur: ['mur_garcon', 'wall_in'], haut: ['haut_manoir', 'cavetop'], fond: '#0a0608' };
const STYLES = { carillon: { sol: ['sol_carillon'], mur: ['mur_manoir', 'wall_in'], haut: ['haut_manoir', 'cavetop'], fond: '#0a0608' }, chateau: CHATEAU, manoir: MANOIR, fille: FILLE, garcon: GARCON, insecte: { sol: ['floor_gymBug', 'floor_gymGrass'], mur: ['wall_gym', 'wall_in'], haut: ['floor_gymGrass', 'cavetop'], fond: '#0c1408' },
  poison: { sol: ['floor_gymPsy', 'floor_gymGrass'], mur: ['wall_gym', 'wall_in'], haut: ['floor_gymPsy', 'cavetop'], fond: '#120a16' },
  clair: CLAIR, egypte: EGYPTE, bois: { sol: ['floor_wood'], mur: ['wall_in', 'wall_center'], haut: ['roof_flat', 'floor_wood'], fond: '#0c0a14' }, sable: { sol: ['floor_sand', 'gl_sable', 'floor_gymRock'], mur: ['wall_gym'], haut: ['floor_gymRock', 'cavetop'], fond: '#1a1008', relief: true } };
const cellule = (A, k) => (Array.isArray(k) ? k.map((q) => A[q]).find(Boolean) : A[k]);
const SOLS = new Set([T.CAVE, T.BLOCK, T.CAVEWALL, T.CAVEDOOR, T.FLOOR]);
const REVELE = 'floor_gymWater';

/** tuiles du labo ajoutées à l'atlas d'Odyssée, à la suite des siennes : les murs du tombeau (grès orangé, vieilles pierres) */
function hasard(g) { let s = g >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
/** les pièces des tourniquets de la Tour de l'Horloge (testodyssee/img/horloge/, PixelForge), posées sur le plancher */
const IMG_HORLOGE = new URL('../img/horloge/', import.meta.url).href;
const TQ = ['tq_h', 'tq_v', 'tq_h_e', 'tq_h_o', 'tq_v_n', 'tq_v_s', ...['h', 'h_e', 'h_o', 'h_x', 'v', 'v_n', 'v_s', 'v_x'].map((k) => 'cl_' + k), ...[...Array(16).keys()].map((m) => 'tq_pivot_' + [...'NESO'].map((c, i) => (m >> (3 - i)) & 1 ? c : '-').join(''))];
const IMAGES_TUILES = {};
function imageSurPlancher(k) {
  const f = (x, r) => { planchesCarillon(x, r); const im = IMAGES_TUILES[k]; if (im?.complete && im.naturalWidth) x.drawImage(im, 0, 0); };
  f.image = () => { if (typeof Image === 'undefined') return null; if (!IMAGES_TUILES[k]) { IMAGES_TUILES[k] = new Image(); IMAGES_TUILES[k].src = IMG_HORLOGE + k + '.png'; } return IMAGES_TUILES[k]; };
  return f;
}
const TUILES = {
  mur_tombeau(x, r) {
    // assises de blocs de grès, joints sombres, usure et petites fissures
    x.fillStyle = '#9a5a2c'; x.fillRect(0, 0, 32, 32);
    for (let j = 0; j < 4; j++) {
      const y = j * 8, dec = j % 2 ? 8 : 0;
      for (let i = -1; i < 3; i++) {
        const bx = i * 16 + dec, t = r();
        x.fillStyle = t < 0.33 ? '#a6643a' : t < 0.66 ? '#8e522a' : '#9c5c30'; x.fillRect(bx + 1, y + 1, 14, 6);
        x.fillStyle = 'rgba(255,200,140,0.18)'; x.fillRect(bx + 1, y + 1, 14, 1);
        x.fillStyle = 'rgba(40,16,4,0.35)'; x.fillRect(bx + 1, y + 6, 14, 1);
      }
      x.fillStyle = '#4a2810'; x.fillRect(0, y, 32, 1);
      for (let i = -1; i < 3; i++) x.fillRect(i * 16 + dec, y, 1, 8);
    }
    for (let k = 0; k < 40; k++) { x.fillStyle = r() < 0.5 ? 'rgba(60,24,6,0.35)' : 'rgba(200,130,70,0.3)'; x.fillRect(r() * 32 | 0, r() * 32 | 0, 1, 1); }
    x.fillStyle = 'rgba(50,20,6,0.6)'; let cx = 6 + r() * 20 | 0, cy = 2 + r() * 10 | 0;
    for (let k = 0; k < 7; k++) { x.fillRect(cx, cy, 1, 1); cx += r() < 0.5 ? 1 : 0; cy += 1; }
  },
  haut_tombeau(x, r) {
    x.fillStyle = '#3a2214'; x.fillRect(0, 0, 32, 32);
    for (let k = 0; k < 60; k++) { x.fillStyle = r() < 0.5 ? '#46291a' : '#2c180c'; x.fillRect(r() * 32 | 0, r() * 32 | 0, 2, 2); }
  },
  sol_terre(x, r) {
    // terre retournée du potager (Bois des Contes) : brune, avec quelques mottes
    x.fillStyle = '#6a4326'; x.fillRect(0, 0, 32, 32);
    for (let k = 0; k < 70; k++) { x.fillStyle = r() < 0.5 ? '#7b5130' : '#573619'; x.fillRect(r() * 32 | 0, r() * 32 | 0, 2, 1); }
    for (let k = 0; k < 8; k++) { x.fillStyle = '#4a2d14'; x.fillRect(r() * 30 | 0, r() * 30 | 0, 2, 2); }
  },
  mur_chateau(x, r) {
    // château noir : grands blocs de pierre sombre, joints creusés, quelques éclats plus clairs
    x.fillStyle = '#2e2c33'; x.fillRect(0, 0, 32, 32);
    for (let j = 0; j < 3; j++) {
      const y = j * 11, dec = j % 2 ? 10 : 0;
      for (let i = -1; i < 3; i++) {
        const bx = i * 20 + dec, t = r();
        x.fillStyle = t < 0.33 ? '#36343b' : t < 0.66 ? '#2a2830' : '#323037'; x.fillRect(bx + 1, y + 1, 18, 9);
        x.fillStyle = 'rgba(200,200,220,0.08)'; x.fillRect(bx + 1, y + 1, 18, 1);
        x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(bx + 1, y + 9, 18, 1);
      }
      x.fillStyle = '#141218'; x.fillRect(0, y, 32, 1);
      for (let i = -1; i < 3; i++) x.fillRect(i * 20 + dec, y, 1, 11);
    }
    for (let k = 0; k < 30; k++) { x.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.3)' : 'rgba(160,160,180,0.12)'; x.fillRect(r() * 32 | 0, r() * 32 | 0, 1, 1); }
  },
  haut_chateau(x, r) {
    x.fillStyle = '#1a181e'; x.fillRect(0, 0, 32, 32);
    for (let k = 0; k < 50; k++) { x.fillStyle = r() < 0.5 ? '#222027' : '#141217'; x.fillRect(r() * 32 | 0, r() * 32 | 0, 2, 2); }
  },
  sol_chateau(x, r) {
    // dalles de pierre grise usées, joints sombres, une dalle sur deux un peu plus claire
    x.fillStyle = '#4a4850'; x.fillRect(0, 0, 32, 32);
    for (const [px, py] of [[0, 0], [16, 0], [0, 16], [16, 16]]) { const t = r(); x.fillStyle = t < 0.4 ? '#4e4c54' : t < 0.75 ? '#46444c' : '#524f58'; x.fillRect(px + 1, py + 1, 14, 14); }
    x.fillStyle = '#2a2830'; x.fillRect(0, 15, 32, 1); x.fillRect(15, 0, 1, 32); x.fillRect(0, 31, 32, 1); x.fillRect(31, 0, 1, 32);
    for (let k = 0; k < 40; k++) { x.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.06)'; x.fillRect(r() * 32 | 0, r() * 32 | 0, 1, 1); }
  },
  // manoir de la vieille dame : parquet sombre, tapisserie rouge au-dessus d'un lambris, plafond de poutres
  sol_manoir(x, r) {
    x.fillStyle = '#2e1c12'; x.fillRect(0, 0, 32, 32);
    for (let j = 0; j < 4; j++) {
      const y = j * 8, dec = (j * 11) % 32;
      for (let i = -1; i < 2; i++) {
        const t = r(); x.fillStyle = t < 0.33 ? '#3a2416' : t < 0.66 ? '#33200f' : '#402818'; x.fillRect(i * 32 + dec + 1, y + 1, 30, 6);
        x.fillStyle = 'rgba(255,200,150,0.07)'; x.fillRect(i * 32 + dec + 1, y + 1, 30, 1);
        x.fillStyle = '#1a0f08'; x.fillRect(i * 32 + dec, y, 1, 8);
      }
      x.fillStyle = '#1a0f08'; x.fillRect(0, y, 32, 1);
      for (let k = 0; k < 3; k++) { x.fillStyle = 'rgba(20,10,4,0.35)'; x.fillRect(r() * 32 | 0, y + 2 + (r() * 4 | 0), 4 + (r() * 6 | 0), 1); }
    }
  },
  mur_manoir(x, r) {
    // en haut une tapisserie damassée rouge sombre, un rail doré, en bas un lambris de bois à panneaux
    x.fillStyle = '#5a1018'; x.fillRect(0, 0, 32, 19);
    x.fillStyle = '#4a0c14';
    for (const [cx, cy] of [[8, 4], [24, 4], [0, 12], [16, 12], [32, 12]]) { x.fillRect(cx - 1, cy - 3, 2, 6); x.fillRect(cx - 3, cy - 1, 6, 2); x.fillRect(cx - 2, cy - 2, 4, 4); }
    x.fillStyle = '#7a2028'; for (const [cx, cy] of [[8, 4], [24, 4], [16, 12]]) x.fillRect(cx - 1, cy - 1, 1, 1);
    x.fillStyle = '#c89a48'; x.fillRect(0, 18, 32, 1); x.fillStyle = '#6a4a20'; x.fillRect(0, 19, 32, 1);
    x.fillStyle = '#3a2214'; x.fillRect(0, 20, 32, 12);
    for (const px of [1, 17]) { x.fillStyle = '#2a180c'; x.fillRect(px, 22, 14, 8); x.fillStyle = '#4a2c18'; x.fillRect(px + 1, 23, 12, 6); x.fillStyle = 'rgba(255,220,180,0.08)'; x.fillRect(px + 1, 23, 12, 1); }
    x.fillStyle = '#1e1008'; x.fillRect(0, 31, 32, 1);
  },
  haut_manoir(x, r) {
    x.fillStyle = '#1a100a'; x.fillRect(0, 0, 32, 32);
    x.fillStyle = '#24160e'; x.fillRect(0, 2, 32, 6); x.fillRect(0, 18, 32, 6);
    for (let k = 0; k < 30; k++) { x.fillStyle = r() < 0.5 ? '#120a06' : '#2a1a10'; x.fillRect(r() * 32 | 0, r() * 32 | 0, 2, 1); }
  },
  // chambres d'enfants : parquet plus clair, papier peint (rose à fleurs, bleu à étoiles) au-dessus d'un lambris blanc
  // Tour de l'Horloge, salles du mur (façon Tour Carillon) : passerelles de planches, planchers bas posés de biais, rambardes
  sol_carillon(x, r) { planchesCarillon(x, r); },
  sol_carillon_bas(x, r) { sol_bas(x, r); },
  // une rambarde : barrière de bois clair cerclée de sombre, poteaux, ombre portée, et des chevrons gravés dans le sens du saut
  // la muraille de la tour, autour des salles du mur : grosses pierres grises vues de dessus (trois variantes)
  muraille_0(x, r) { muraille(x, r, 0); },
  muraille_1(x, r) { muraille(x, r, 1); },
  muraille_2(x, r) { muraille(x, r, 2); },
  // le bout du tube de cuivre (Tour de l'Horloge), qui sort du mur d'extrémité d'une salle ; n : il vient du mur du haut
  tube_n(x, r) { boutTube(x, r, 0); },
  tube_e(x, r) { boutTube(x, r, Math.PI / 2); },
  tube_s(x, r) { boutTube(x, r, Math.PI); },
  tube_o(x, r) { boutTube(x, r, -Math.PI / 2); },
  // étage 1 : les tourniquets (barrières de bois peint et poteau coiffé de laiton, façon Cimetronelle, dessinés par
  // tools/pixelforge/tourniquets.py) et la grille de fer des salles
  ...Object.fromEntries(TQ.map((k) => [k, imageSurPlancher(k)])),
  // étage -1 : dalles du sous-sol, fosses et contrepoids, chaînes, rails et balanciers
  sol_sous(x, r) { dallesSous(x, r); },
  fosse(x, r) { x.fillStyle = '#0a0806'; x.fillRect(0, 0, 32, 32); x.fillStyle = '#1a1410'; x.fillRect(0, 0, 32, 5); x.fillStyle = 'rgba(255,255,255,0.05)'; for (let k = 0; k < 6; k++) x.fillRect(r() * 30 | 0, 8 + (r() * 22 | 0), 2, 1); },
  poids(x, r) { x.fillStyle = '#0a0806'; x.fillRect(0, 0, 32, 32); x.fillStyle = '#26262c'; x.fillRect(1, 1, 30, 30); x.fillStyle = '#4a4a54'; x.fillRect(3, 3, 26, 26); x.fillStyle = '#6a6a76'; x.fillRect(3, 3, 26, 3); x.fillStyle = '#c8962e'; x.fillRect(13, 13, 6, 6); x.fillStyle = '#3a2408'; x.fillRect(15, 15, 2, 2); },
  chaine_a(x, r) { chaine(x, r, false); },
  chaine_b(x, r) { chaine(x, r, true); },
  rail(x, r) { dallesSous(x, r); x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(0, 13, 32, 6); x.fillStyle = '#7a6a40'; x.fillRect(0, 15, 32, 2); },
  rail_mur(x, r) { sol_bas(x, r); x.fillStyle = '#7a6a40'; x.fillRect(0, 15, 32, 2); },
  balancier(x, r) { dallesSous(x, r); boule(x); },
  balancier_mur(x, r) { sol_bas(x, r); boule(x); },
  grille_tour(x, r) { grilleTour(x, r, false); },
  grille_ouverte(x, r) { grilleTour(x, r, true); },
  rambarde_s(x, r) { rambarde(x, r, 's'); },
  rambarde_e(x, r) { rambarde(x, r, 'e'); },
  rambarde_w(x, r) { rambarde(x, r, 'w'); },
  sol_chambre(x, r) {
    x.fillStyle = '#5a3a22'; x.fillRect(0, 0, 32, 32);
    for (let j = 0; j < 4; j++) {
      const y = j * 8, dec = (j * 13) % 32;
      for (let i = -1; i < 2; i++) { const t = r(); x.fillStyle = t < 0.33 ? '#6a4628' : t < 0.66 ? '#624024' : '#704c2c'; x.fillRect(i * 32 + dec + 1, y + 1, 30, 6); x.fillStyle = '#3e2614'; x.fillRect(i * 32 + dec, y, 1, 8); }
      x.fillStyle = '#3e2614'; x.fillRect(0, y, 32, 1);
    }
  },
  mur_fille(x, r) { murEnfant(x, '#c88aa0', '#b07088', '#f4e0a8', (cx, cy) => { x.fillStyle = '#f4d0dc'; x.fillRect(cx - 1, cy - 2, 2, 1); x.fillRect(cx - 2, cy - 1, 4, 2); x.fillRect(cx - 1, cy + 1, 2, 1); x.fillStyle = '#e8b040'; x.fillRect(cx - 0, cy - 0, 1, 1); }); },
  mur_garcon(x, r) { murEnfant(x, '#6a86b0', '#5a7298', '#f0e0a0', (cx, cy) => { x.fillStyle = '#f0e0a0'; x.fillRect(cx, cy - 2, 1, 5); x.fillRect(cx - 2, cy, 5, 1); x.fillRect(cx - 1, cy - 1, 3, 3); }); },
  ...TUILES_TAPIS('tapis', '#7a1820', '#6a121a', '#4a0c12', '#d0a050'),
  ...TUILES_TAPIS('tapisrose', '#d890a8', '#c87890', '#a85a78', '#fff0f4'),
  ...TUILES_TAPIS('tapisbleu', '#4a6aa0', '#3e5c90', '#2a3e68', '#e8d890'),

  sol_reflet(x) {
    // sol de la salle du Reflet : dalles bleu pâle, assez foncées pour que le haut blanc des murs s'en détache
    x.fillStyle = '#a9c9ee'; x.fillRect(0, 0, 32, 32);
    x.fillStyle = '#b8d3f2'; x.fillRect(1, 1, 14, 14); x.fillRect(17, 17, 14, 14);
    x.fillStyle = '#93b8e4'; x.fillRect(0, 15, 32, 1); x.fillRect(0, 31, 32, 1); x.fillRect(15, 0, 1, 32); x.fillRect(31, 0, 1, 32);
  },
  ...TUILES_ARENES(),
};
/** tapis rouges du manoir, posés par m.solArene : une tuile par côté bordé (N, S, O, E : bord d'or de ce côté) */
/** un mur de chambre d'enfant : papier peint à motif (dessin), baguette, lambris blanc */
function murEnfant(x, fond, fonce, baguette, motif) {
  x.fillStyle = fond; x.fillRect(0, 0, 32, 19);
  x.fillStyle = fonce; for (let k = 0; k < 32; k += 8) x.fillRect(k, 0, 1, 19);
  for (const [cx, cy] of [[4, 4], [20, 4], [12, 12], [28, 12]]) motif(cx, cy);
  x.fillStyle = baguette; x.fillRect(0, 18, 32, 1); x.fillStyle = '#8a7a6a'; x.fillRect(0, 19, 32, 1);
  x.fillStyle = '#e8e2d6'; x.fillRect(0, 20, 32, 12);
  for (const px of [1, 17]) { x.fillStyle = '#c8c0b0'; x.fillRect(px, 22, 14, 8); x.fillStyle = '#ece6da'; x.fillRect(px + 1, 23, 12, 6); }
  x.fillStyle = '#9a9080'; x.fillRect(0, 31, 32, 1);
}
/** plancher du dessous (Tour de l'Horloge), lames posées de biais */
function sol_bas(x, r) {
  x.fillStyle = '#3e2216'; x.fillRect(0, 0, 32, 32);
  for (let k = -32; k < 32; k += 8) { x.fillStyle = r() < 0.5 ? '#5a3220' : '#52301e'; x.beginPath(); x.moveTo(k, 32); x.lineTo(k + 32, 0); x.lineTo(k + 37, 0); x.lineTo(k + 5, 32); x.fill(); }
  x.fillStyle = 'rgba(0,0,0,0.25)'; for (let k = -32; k < 32; k += 8) { x.beginPath(); x.moveTo(k + 5, 32); x.lineTo(k + 37, 0); x.lineTo(k + 38, 0); x.lineTo(k + 6, 32); x.fill(); }
}
/** planches de passerelle (Tour de l'Horloge) : lames horizontales orangées, joints sombres */
function planchesCarillon(x, r) {
  x.fillStyle = '#5a2e18'; x.fillRect(0, 0, 32, 32);
  for (let j = 0; j < 4; j++) {
    const y = j * 8, dec = (j * 13) % 32;
    for (let i = -1; i < 2; i++) { const t = r(); x.fillStyle = t < 0.33 ? '#b06036' : t < 0.66 ? '#a85a32' : '#ba683c'; x.fillRect(i * 32 + dec + 1, y + 1, 30, 6); x.fillStyle = 'rgba(255,220,170,0.12)'; x.fillRect(i * 32 + dec + 1, y + 1, 30, 1); x.fillStyle = '#5a2e18'; x.fillRect(i * 32 + dec, y, 1, 8); }
  }
}
/** pierres de taille de la muraille (Tour de l'Horloge), en rangs décalés */
function muraille(x, r, v) {
  x.fillStyle = '#3a3640'; x.fillRect(0, 0, 32, 32);
  const tons = ['#6e6a72', '#77737b', '#66626a', '#7e7a82'];
  for (let j = 0; j < 4; j++) {
    const dec = ((j + v) % 2) * 8;
    for (let i = -1; i < 3; i++) {
      const bx = i * 16 + dec, by = j * 8;
      x.fillStyle = tons[(i + j + v + 4) % 4]; x.fillRect(bx + 1, by + 1, 14, 6);
      x.fillStyle = 'rgba(255,255,255,0.12)'; x.fillRect(bx + 1, by + 1, 14, 1);
      x.fillStyle = 'rgba(0,0,0,0.2)'; x.fillRect(bx + 1, by + 6, 14, 1);
    }
  }
  if (r() < 0.4) { x.fillStyle = 'rgba(70,90,60,0.35)'; x.fillRect(Math.floor(r() * 24), Math.floor(r() * 26), 6, 4); }   // un peu de mousse
}
/** le bout du tube de cuivre, vu de dessus : le tuyau sort du mur (en haut), sa bride, et l'ouverture sombre vers la salle */
function boutTube(x, r, angle) {
  sol_bas(x, r);
  x.save(); x.translate(16, 16); x.rotate(angle); x.translate(-16, -16);
  x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(5, 0, 24, 30);
  x.fillStyle = '#7a3e16'; x.fillRect(4, 0, 24, 26);                 // le tuyau
  x.fillStyle = '#c8783a'; x.fillRect(6, 0, 20, 26);
  x.fillStyle = '#f0b070'; x.fillRect(9, 0, 4, 26);
  x.fillStyle = '#5a2c10'; x.fillRect(2, 18, 28, 8);                 // la bride
  x.fillStyle = '#d88a48'; x.fillRect(3, 19, 26, 5);
  for (const bx of [5, 15, 25]) { x.fillStyle = '#5a2c10'; x.fillRect(bx, 20, 2, 2); }
  x.fillStyle = '#0c0604'; x.beginPath(); x.ellipse(16, 27, 10, 4, 0, 0, Math.PI * 2); x.fill();   // l'ouverture
  x.fillStyle = 'rgba(160,220,255,0.3)'; x.fillRect(10, 26, 5, 1);
  x.restore();
}
/** les dalles de pierre du sous-sol de la Tour de l'Horloge */
function dallesSous(x, r) {
  x.fillStyle = '#4a4238'; x.fillRect(0, 0, 32, 32);
  for (const [a, b] of [[0, 0], [16, 0], [0, 16], [16, 16]]) { const t = r(); x.fillStyle = t < 0.33 ? '#6e6454' : t < 0.66 ? '#685e50' : '#74695a'; x.fillRect(a + 1, b + 1, 14, 14); x.fillStyle = 'rgba(255,240,210,0.1)'; x.fillRect(a + 1, b + 1, 14, 1); }
}
/** une chaîne qui pend au mur (tirée : plus bas, avec son anneau) */
function chaine(x, r, tiree) {
  sol_bas(x, r);
  const bas = tiree ? 28 : 20;
  for (let y = 0; y < bas; y += 4) { x.fillStyle = '#2a2a30'; x.fillRect(13, y, 6, 4); x.fillStyle = '#8a8a96'; x.fillRect(14, y + 1, 4, 2); }
  x.fillStyle = '#c8962e'; x.fillRect(10, bas, 12, 3); x.fillRect(10, bas - 6, 3, 9); x.fillRect(19, bas - 6, 3, 9);
}
/** la masse d'un balancier, vue de dessus */
function boule(x) {
  x.fillStyle = 'rgba(0,0,0,0.4)'; x.beginPath(); x.arc(18, 19, 13, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#5a3a14'; x.beginPath(); x.arc(16, 16, 13, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#c8962e'; x.beginPath(); x.arc(16, 16, 11, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#f0d070'; x.beginPath(); x.arc(12, 12, 4, 0, Math.PI * 2); x.fill();
}
/** la grille de fer d'une salle de l'étage 1 (ouverte : relevée, on n'en voit que le linteau) */
function grilleTour(x, r, ouverte) {
  planchesCarillon(x, r);
  if (ouverte) { x.fillStyle = '#26262e'; x.fillRect(0, 0, 32, 5); x.fillStyle = '#55555f'; x.fillRect(0, 1, 32, 2); return; }
  x.fillStyle = 'rgba(0,0,0,0.4)'; x.fillRect(0, 0, 32, 32);
  for (let k = 2; k < 32; k += 6) { x.fillStyle = '#14141a'; x.fillRect(k, 0, 4, 32); x.fillStyle = '#76767f'; x.fillRect(k + 1, 0, 2, 32); x.fillStyle = '#9c9ca6'; x.fillRect(k + 1, 0, 1, 32); }
  for (const y of [6, 24]) { x.fillStyle = '#14141a'; x.fillRect(0, y, 32, 4); x.fillStyle = '#55555f'; x.fillRect(0, y + 1, 32, 2); }
}
/** une rambarde de la Tour de l'Horloge, dessinée vers le bas puis tournée selon son sens (s, e, w) */
function rambarde(x, r, d) {
  planchesCarillon(x, r);
  x.save(); x.translate(16, 16); x.rotate(d === 'e' ? -Math.PI / 2 : d === 'w' ? Math.PI / 2 : 0); x.translate(-16, -16);
  // chevrons gravés : le sens où l'on saute
  x.fillStyle = 'rgba(40,16,6,0.55)';
  for (const y0 of [3, 9]) { x.beginPath(); x.moveTo(10, y0); x.lineTo(16, y0 + 4); x.lineTo(22, y0); x.lineTo(22, y0 + 2); x.lineTo(16, y0 + 6); x.lineTo(10, y0 + 2); x.fill(); }
  // l'ombre de la barrière sur le bord de la passerelle, et le vide juste derrière
  x.fillStyle = 'rgba(0,0,0,0.45)'; x.fillRect(0, 25, 32, 7);
  x.fillStyle = '#2a1408'; x.fillRect(0, 30, 32, 2);
  // les poteaux
  for (const px of [2, 14, 26]) { x.fillStyle = '#2a1408'; x.fillRect(px - 1, 15, 6, 12); x.fillStyle = '#7a4420'; x.fillRect(px, 16, 4, 10); x.fillStyle = '#a8642e'; x.fillRect(px, 16, 1, 10); }
  // la lisse : bois doré, contour sombre, reflet
  x.fillStyle = '#2a1408'; x.fillRect(0, 13, 32, 7);
  x.fillStyle = '#e8b45a'; x.fillRect(0, 14, 32, 4);
  x.fillStyle = '#fff0b0'; x.fillRect(0, 14, 32, 1);
  x.fillStyle = '#a86a2a'; x.fillRect(0, 18, 32, 1);
  x.restore();
}
function TUILES_TAPIS(nom, fond, motif, frange, filet) {
  const out = {};
  for (let k = 0; k < 16; k++) {
    const n = k & 1, s = k & 2, o = k & 4, e = k & 8;
    out[`${nom}_${n ? 'N' : ''}${s ? 'S' : ''}${o ? 'O' : ''}${e ? 'E' : ''}`] = (x, r) => {
      x.fillStyle = fond; x.fillRect(0, 0, 32, 32);
      // motif : losanges d'or pâle et rosaces plus sombres
      x.fillStyle = motif; for (const [cx, cy] of [[8, 8], [24, 24]]) { x.fillRect(cx - 4, cy - 1, 8, 2); x.fillRect(cx - 1, cy - 4, 2, 8); }
      x.fillStyle = filet; x.globalAlpha = 0.45; for (const [cx, cy] of [[24, 8], [8, 24]]) { x.fillRect(cx - 1, cy - 3, 2, 1); x.fillRect(cx - 2, cy - 2, 4, 1); x.fillRect(cx - 3, cy - 1, 6, 2); x.fillRect(cx - 2, cy + 1, 4, 1); x.fillRect(cx - 1, cy + 2, 2, 1); }
      x.globalAlpha = 1;
      for (let i = 0; i < 25; i++) { x.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,120,120,0.06)'; x.fillRect(r() * 32 | 0, r() * 32 | 0, 1, 1); }
      // bordures : franges sombres, filet d'or
      const bord = (fx, fy, fw, fh, gx, gy, gw, gh) => { x.fillStyle = frange; x.fillRect(fx, fy, fw, fh); x.fillStyle = filet; x.fillRect(gx, gy, gw, gh); };
      if (n) bord(0, 0, 32, 4, 0, 4, 32, 1);
      if (s) bord(0, 28, 32, 4, 0, 27, 32, 1);
      if (o) bord(0, 0, 4, 32, 4, 0, 1, 32);
      if (e) bord(28, 0, 4, 32, 27, 0, 1, 32);
      if (n && o) { x.fillStyle = frange; x.fillRect(0, 0, 5, 5); }
      if (n && e) { x.fillStyle = frange; x.fillRect(27, 0, 5, 5); }
      if (s && o) { x.fillStyle = frange; x.fillRect(0, 27, 5, 5); }
      if (s && e) { x.fillStyle = frange; x.fillRect(27, 27, 5, 5); }
    };
  }
  return out;
}
/** sols des arènes du labo (Insecte, Poison) : posés case par case par m.solArene */
function TUILES_ARENES() {
  const fond = (x, c) => { x.fillStyle = c; x.fillRect(0, 0, 32, 32); };
  const grains = (x, r, cs, n = 40, t = 1) => { for (let k = 0; k < n; k++) { x.fillStyle = cs[(r() * cs.length) | 0]; x.fillRect((r() * 32) | 0, (r() * 32) | 0, t, t); } };
  const vide = (x, r) => { fond(x, '#07090a'); grains(x, r, ['#0e1210', '#111614'], 30, 2); };
  const fil = (x, r, coul = '#e8ecdc', ombre = '#9aa08a') => {
    vide(x, r);
    // une toile tendue : deux brins épais et des fils plus fins en travers
    x.fillStyle = ombre; x.fillRect(3, 3, 26, 26);
    x.fillStyle = '#20261c'; x.fillRect(5, 5, 22, 22);
    x.fillStyle = coul;
    for (let k = 4; k < 29; k += 6) { x.fillRect(k, 3, 1, 26); x.fillRect(3, k, 26, 1); }
    x.fillRect(3, 3, 26, 1); x.fillRect(3, 28, 26, 1); x.fillRect(3, 3, 1, 26); x.fillRect(28, 3, 1, 26);
    for (let k = 0; k < 26; k++) { x.fillRect(3 + k, 3 + k, 1, 1); x.fillRect(28 - k, 3 + k, 1, 1); }
  };
  const fourmis = (dir) => (x, r) => {
    fond(x, '#6a4a2c'); grains(x, r, ['#5a3e24', '#7a5634', '#4e341e'], 50, 2);
    x.fillStyle = '#4a3018'; x.fillRect(10, 0, 12, 32);
    // trois fourmis portant une feuille, tête vers le sens de la colonne
    const pose = (cy) => { x.fillStyle = '#1a0e08'; x.fillRect(14, cy, 4, 3); x.fillRect(15, cy + 3, 2, 2); x.fillRect(14, cy + 5, 4, 3); x.fillRect(12, cy + 2, 1, 4); x.fillRect(19, cy + 2, 1, 4); x.fillStyle = '#58b040'; x.fillRect(12, cy - 3, 8, 3); x.fillStyle = '#3a8a2a'; x.fillRect(13, cy - 2, 6, 1); };
    pose(4); pose(14); pose(24);
    x.fillStyle = '#f0d070'; x.fillRect(15, 0, 2, 2);
    if (dir !== 'up') { const c = x.getImageData(0, 0, 32, 32), o = x.createImageData(32, 32), q = { right: 1, down: 2, left: 3 }[dir];
      for (let j = 0; j < 32; j++) for (let i = 0; i < 32; i++) { let a = i, b = j; for (let t = 0; t < q; t++) [a, b] = [31 - b, a]; for (let z = 0; z < 4; z++) o.data[(b * 32 + a) * 4 + z] = c.data[(j * 32 + i) * 4 + z]; }
      x.putImageData(o, 0, 0); }
  };
  const vase = (x, r, a, b, n) => { fond(x, a); grains(x, r, b, n, 3); x.fillStyle = 'rgba(160,60,200,0.35)'; for (let k = 0; k < 4; k++) { const cx = (r() * 26) | 0, cy = (r() * 26) | 0; x.fillRect(cx, cy, 5, 3); } };
  return {
    terre_fourmis(x, r) { fond(x, '#7a5a38'); grains(x, r, ['#6a4c2e', '#8a6844', '#5e4228'], 70, 2); },
    eboulis(x, r) { fond(x, '#7a5a38'); grains(x, r, ['#5a4028', '#9a7a54', '#4a3420'], 90, 3); x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(0, 14, 32, 2); x.fillRect(15, 0, 2, 32); },
    fourmis_up: fourmis('up'), fourmis_down: fourmis('down'), fourmis_left: fourmis('left'), fourmis_right: fourmis('right'),
    vide_toile: vide,
    fil: (x, r) => fil(x, r),
    rosee: (x, r) => { fil(x, r, '#c8f0ff', '#5a8aa0'); x.fillStyle = '#e8fcff'; for (let k = 0; k < 9; k++) x.fillRect(5 + ((r() * 22) | 0), 5 + ((r() * 22) | 0), 2, 2); },
    noeud: (x, r) => { fil(x, r, '#f0e8a0', '#a09a5a'); x.fillStyle = '#e0d068'; x.fillRect(9, 9, 14, 14); x.fillStyle = '#fff6b0'; x.fillRect(11, 11, 6, 4); },
    traction: (x, r) => { fil(x, r, '#f0c8f0', '#a07aa0'); x.fillStyle = '#d070d0'; for (let k = 0; k < 4; k++) x.fillRect(8 + k * 4, 8 + k * 4, 16 - k * 8 > 0 ? 16 - k * 8 : 2, 2); x.fillRect(15, 6, 2, 20); x.fillRect(6, 15, 20, 2); },
    mousse(x, r) { fond(x, '#4a6a34'); grains(x, r, ['#3a5a28', '#5a7a40', '#6a8a48'], 80, 2); },
    pierres(x, r) { fond(x, '#3a3a2c'); for (const [a, b, c, d] of [[2, 2, 13, 12], [17, 3, 12, 11], [3, 17, 12, 12], [18, 17, 11, 12]]) { x.fillStyle = '#8a8a78'; x.fillRect(a, b, c, d); x.fillStyle = '#a8a894'; x.fillRect(a + 1, b + 1, c - 2, 2); x.fillStyle = '#6a6a58'; x.fillRect(a, b + d - 2, c, 2); } },
    vase: (x, r) => vase(x, r, '#4a2e52', ['#3a2042', '#5a3a64', '#6a3a70'], 60),
    vase_profonde: (x, r) => { vase(x, r, '#26122e', ['#1a0a22', '#341a3e', '#401848'], 60); x.fillStyle = 'rgba(200,100,255,0.25)'; x.fillRect(4, 12, 24, 2); },
    lys: (x, r) => { vase(x, r, '#4a2e52', ['#3a2042'], 30); x.fillStyle = '#3a9a4a'; x.fillRect(3, 6, 26, 20); x.fillRect(6, 3, 20, 26); x.fillStyle = '#2a7a3a'; x.fillRect(15, 6, 2, 10); x.fillStyle = '#ffffff'; x.fillRect(12, 12, 8, 8); x.fillStyle = '#ffd8f0'; x.fillRect(13, 13, 6, 6); x.fillStyle = '#ffe060'; x.fillRect(15, 15, 2, 2); },
    bulles: (x, r) => { vase(x, r, '#4a2e52', ['#3a2042', '#5a3a64'], 40); x.fillStyle = '#9ad050'; for (const [a, b, c] of [[8, 9, 4], [19, 7, 3], [14, 19, 5], [23, 21, 3]]) { x.fillRect(a, b, c, c); x.fillStyle = '#c8f080'; x.fillRect(a, b, 1, 1); x.fillStyle = '#9ad050'; } },
    sas_sol(x, r) { fond(x, '#c8ccd0'); x.fillStyle = '#b0b4ba'; x.fillRect(0, 15, 32, 1); x.fillRect(15, 0, 1, 32); x.fillStyle = '#dde0e4'; x.fillRect(1, 1, 13, 13); x.fillRect(17, 17, 13, 13); },
    ...Object.fromEntries([['violet', '#9a4ad8'], ['vert', '#3ab04a'], ['jaune', '#e8c830'], ['rose', '#f070b0']].map(([k, c]) => [`douche_${k}`, (x) => {
      fond(x, '#9aa0a8'); x.fillStyle = '#6a7078'; for (let j = 2; j < 32; j += 6) x.fillRect(2, j, 28, 2);
      x.fillStyle = c; x.fillRect(5, 5, 22, 22); x.fillStyle = 'rgba(255,255,255,0.5)'; for (let k = 0; k < 6; k++) x.fillRect(8 + k * 3, 7 + (k % 2) * 4, 1, 14);
    }])),
  };
}
function ajouterTuiles(view) {
  const A = view.A; if (!A || A.cells.sol_reflet) return;
  const P2 = 34, C2 = 32, SIZE = A.size || A.canvas.width, cols = Math.floor(SIZE / P2);
  let n = 0;
  for (const [u, v] of Object.values(A.cells)) n = Math.max(n, Math.round((v * SIZE - 1) / P2) * cols + Math.round((u * SIZE - 1) / P2) + 1);
  const ctx = A.canvas.getContext('2d');
  Object.entries(TUILES).forEach(([k, f], i) => {
    const cx = (n % cols) * P2, cy = Math.floor(n / cols) * P2; n++;
    const poser = () => {
      const c = document.createElement('canvas'); c.width = c.height = C2; f(c.getContext('2d'), hasard(97 + i * 31));
      ctx.drawImage(c, cx + 1, cy + 1);
      // bord dupliqué autour de la tuile (pas de joint visible au filtrage)
      ctx.drawImage(c, 0, 0, C2, 1, cx + 1, cy, C2, 1); ctx.drawImage(c, 0, C2 - 1, C2, 1, cx + 1, cy + C2 + 1, C2, 1);
      ctx.drawImage(c, 0, 0, 1, C2, cx, cy + 1, 1, C2); ctx.drawImage(c, C2 - 1, 0, 1, C2, cx + C2 + 1, cy + 1, 1, C2);
    };
    poser();
    // une tuile faite d'une image : redessinée quand l'image arrive
    const im = f.image?.(); if (im && !(im.complete && im.naturalWidth)) im.addEventListener('load', () => { poser(); if (view.texA) view.texA.needsUpdate = true; }, { once: true });
    A.cells[k] = [(cx + 1) / SIZE, (cy + 1) / SIZE, (cx + 1 + C2) / SIZE, (cy + 1 + C2) / SIZE];
  });
  if (view.texA) view.texA.needsUpdate = true;
}

export function brancherRendu() {
  const P = WorldView.prototype;
  // donjons à style (clair, bois, sable) : leurs propres sols, pas le sol de grotte généré d'Odyssée
  const couvre = Sol.prototype.couvre;
  Sol.prototype.couvre = function (map = this.map) { return !STYLES[map?.style] && couvre.call(this, map); };
  // les dalles des donjons (et les cases à motif posées par le labo) restent visibles : le sol généré les laisse à nu
  const SOUS = new Set(['carpet', 'glace', 'sable', 'asph']);
  const pompe = Sol.prototype.pump;
  // ponts sur la lave : le jeu dessine la lave et les planches (pas les pontons sur l'eau du sol généré) ;
  // barrières des grottes : le sol de grotte dessous
  Sol.prototype.pump = function () {
    const m = this.map; let nus = m?.deco ? new Set(m.deco.filter((d) => SOUS.has(d.k)).map((d) => d.x + ',' + d.y)) : null;
    if (m?.terre?.size) { nus ||= new Set(); for (const k of m.terre) nus.add(k); }   // la terre du potager
    const vide = m?.tomb ? new Set(m.deco.filter((d) => d.k === 'gouffre' || d.k === 'revele').map((d) => d.x + ',' + d.y)) : null;
    const lave = m?.biome === 'magma' && !m.outdoor, grotte = m && !m.outdoor && m.floor === 'cave', neige = m?.mont && m.outdoor;
    if (!nus?.size && !lave && !grotte && !neige) return pompe.call(this);
    m.get = function (x, y) {
      if (nus?.has(x + ',' + y)) return T.FLOOR;
      if (vide?.has(x + ',' + y)) return T.LAVA;   // gouffre et chemin révélé : dessinés par le jeu (le vide, la lumière)
      const t = Object.getPrototypeOf(this).get.call(this, x, y);
      if (lave && t === T.BRIDGE) return T.LAVA;
      if (grotte && (t === T.BARRIER_R || t === T.BARRIER_B)) return T.CAVE;
      if (neige && t === T.LEDGE) return T.LAVA;   // le jeu dessine lui-même le rebord (une marche de roche)
      return t;
    };
    try { return pompe.call(this); } finally { delete m.get; }
  };
  const sol = P.groundCell;
  P.groundCell = function (x, y) {
    const m = this.map, A = this.A.cells;
    if (m.glace?.has(x + ',' + y)) return { c: A[CLAIR.glace] };
    if (m.terre?.has(x + ',' + y) && A.sol_terre) return { c: A.sol_terre };
    // arènes du labo : un sol par case (fourmis, toile, vase…)
    { const k = m.solArene?.get(x + ',' + y); if (k && A[k]) return { c: A[k] }; }
    // rebords dans une grotte : une marche de roche (pas de l'herbe)
    if (m.style === 'carillon') { const t = m.get(x, y), k = t === T.LEDGE ? 'rambarde_s' : t === T.LEDGE_E ? 'rambarde_e' : t === T.LEDGE_W ? 'rambarde_w' : null; if (k && A[k]) return { c: A[k] }; }
    if (!m.outdoor) { const t = m.get(x, y); if (t === T.LEDGE || t === T.LEDGE_E || t === T.LEDGE_W) return { c: A.cavestairs }; }
    // tombeau : le gouffre est noir ; à travers les lunettes, le chemin invisible est une dalle de lumière
    if (m.tomb) { const k = this.decoAt.get(x + ',' + y)?.k; if (k === 'gouffre') return { c: A.void }; if (k === 'revele') return { c: A[REVELE] || A.matgreen }; }
    // Mont Givrécime : les rebords dehors sont des marches de roche dans la neige, pas des talus d'herbe
    if (m.mont && m.outdoor && m.get(x, y) === T.LEDGE) return { c: A.cavestairs };
    // pont sur la lave (chemins du Temple) : la lave dessous, les planches en décalque
    if (m.biome === 'magma' && !m.outdoor && m.get(x, y) === T.BRIDGE) return { anim: this.N.cells.lava };
    const st = STYLES[m.style];
    if (st && SOLS.has(m.get(x, y)) && !['exitlight', 'carpet'].includes(this.decoAt.get(x + ',' + y)?.k)) { const c = cellule(A, m.solSalle || st.sol); if (c) return { c }; }
    return sol.call(this, x, y);
  };
  // murs de grotte dessinés avec les textures claires, le temps de construire le morceau de carte
  const morceau = P.buildChunk;
  P.buildChunk = function (i, j) {
    const st = STYLES[this.map?.style];
    if (!st) return morceau.call(this, i, j);
    const A = this.A.cells, avant = { cavewall: A.cavewall, cavetop: A.cavetop };
    A.cavewall = cellule(A, st.mur) || avant.cavewall; A.cavetop = cellule(A, st.haut) || avant.cavetop;
    try { return morceau.call(this, i, j); } finally { Object.assign(A, avant); }
  };
  const carte = P.setMap;
  P.setMap = function (map) {
    ajouterTuiles(this);
    carte.call(this, map);
    const A = this.A?.cells; if (A && !A.dec_dalle_pontns) { A.dec_dalle_pontns = A.bridge; A.dec_dalle_pontew = A.bridgeEW || A.bridge; }
    // style clair : murs droits et blancs, sans les gradins de roche des grottes d'Odyssée
    const st = STYLES[map.style];
    if (st) { if (!st.relief) this.tiers = null; this.scene.background = new THREE.Color(st.fond); }
    if (map.affiches) for (const a of map.affiches) poserAffiche(this, a);
  };
}

/** une affiche encadrée sur la face sud d'un mur (case a.x, a.y) : papier clair, cadre de bois sombre, quelques lignes d'écriture */
function poserAffiche(view, a) {
  if (a.genre) return poserTenture(view, a);
  const c = document.createElement('canvas'); c.width = 32; c.height = 26;
  const x = c.getContext('2d');
  x.fillStyle = '#4a2c14'; x.fillRect(0, 0, 32, 26);                 // cadre de bois sombre
  x.fillStyle = '#7a4a24'; x.fillRect(1, 1, 30, 24);
  x.fillStyle = '#4a2c14'; x.fillRect(2, 2, 28, 22);
  x.fillStyle = '#fbf6e6'; x.fillRect(3, 3, 26, 20);                 // papier
  x.fillStyle = '#e6dcc0'; x.fillRect(3, 21, 26, 2); x.fillRect(27, 3, 2, 20);
  x.fillStyle = '#5a5248';
  for (const [y0, l] of [[9, 20], [12, 18], [15, 20], [18, 12]]) x.fillRect(6, y0, l, 1);
  x.fillStyle = '#9cc0ea'; x.fillRect(13, 4, 6, 3); x.fillStyle = '#ffffff'; x.fillRect(14, 4, 2, 1);   // petit miroir dessiné en tête
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
  const W = 0.86, H = W * 26 / 32 * Math.tan(EL), haut = 1.25 * Math.tan(EL);
  const geo = new THREE.PlaneGeometry(W, H); geo.translate(a.x + 0.5, haut * 0.52, a.y + 1.01);
  const mat = new THREE.MeshBasicMaterial({ map: t }); mat.userData.own = true;
  view.root.add(new THREE.Mesh(geo, mat));
}

/** une tenture accrochée sur la face sud d'un mur : tapisserie (rouge, bordure d'or, blason), portrait (cadre doré, visage sombre) */
function poserTenture(view, a) {
  if (a.genre === 'porte') return poserPorteManoir(view, a);
  if (a.genre === 'tube') return poserBoucheTube(view, a);
  if (a.genre === 'dessin') return poserDessin(view, a);
  if (a.genre === 'panoplie') return poserPanoplie(view, a);
  if (a.genre === 'epees' || a.genre === 'epee') return poserEpees(view, a);
  const tap = a.genre === 'tapisserie', c = document.createElement('canvas'); c.width = 24; c.height = tap ? 40 : 28;
  const x = c.getContext('2d'), R = hasard(a.x * 131 + a.y * 17);
  if (tap) {
    x.fillStyle = '#3a2410'; x.fillRect(0, 0, 24, 2);                                  // tringle
    x.fillStyle = '#c89a48'; x.fillRect(0, 0, 2, 2); x.fillRect(22, 0, 2, 2);
    x.fillStyle = '#7a1018'; x.fillRect(2, 2, 20, 32);
    x.beginPath(); x.moveTo(2, 34); x.lineTo(12, 39); x.lineTo(22, 34); x.fill();     // pointe en bas
    x.fillStyle = '#d0a050'; x.fillRect(3, 3, 18, 1); x.fillRect(3, 3, 1, 30); x.fillRect(20, 3, 1, 30);
    x.fillStyle = '#5a0a12'; x.fillRect(6, 9, 12, 14);                                 // écu
    x.beginPath(); x.moveTo(6, 23); x.lineTo(12, 28); x.lineTo(18, 23); x.fill();
    x.fillStyle = '#d0a050'; x.fillRect(11, 11, 2, 12); x.fillRect(8, 15, 8, 2);         // une croix d'or
    x.fillStyle = '#e0b860'; x.fillRect(11, 38, 2, 2);
    for (let i = 0; i < 20; i++) { x.fillStyle = 'rgba(0,0,0,0.15)'; x.fillRect(2 + (R() * 20 | 0), 2 + (R() * 32 | 0), 1, 1); }
  } else {
    x.fillStyle = '#6a4a18'; x.fillRect(0, 0, 24, 28); x.fillStyle = '#c89a48'; x.fillRect(1, 1, 22, 26); x.fillStyle = '#7a5420'; x.fillRect(2, 2, 20, 24);
    x.fillStyle = '#1e1810'; x.fillRect(3, 3, 18, 22);
    const fond = ['#2a3020', '#302024', '#202838'][(R() * 3) | 0]; x.fillStyle = fond; x.fillRect(4, 4, 16, 20);
    x.fillStyle = '#1a1210'; x.fillRect(6, 17, 12, 7);                                  // buste
    x.fillStyle = ['#c8a888', '#b89070', '#d8b8a0'][(R() * 3) | 0]; x.fillRect(9, 9, 6, 7); // visage
    x.fillStyle = ['#3a2a1a', '#d8d0c0', '#6a3a1a'][(R() * 3) | 0]; x.fillRect(8, 7, 8, 3); x.fillRect(8, 9, 1, 4); x.fillRect(15, 9, 1, 4);
    x.fillStyle = '#1a1210'; x.fillRect(10, 11, 1, 1); x.fillRect(13, 11, 1, 1);
    x.fillStyle = 'rgba(255,240,200,0.12)'; x.fillRect(4, 4, 16, 2);
  }
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
  const W = tap ? 0.62 : 0.6, H = W * c.height / c.width * Math.tan(EL), haut = 1.25 * Math.tan(EL);
  const geo = new THREE.PlaneGeometry(W, H); geo.translate(a.x + 0.5, haut * (tap ? 0.62 : 0.6), a.y + 1.01);
  const mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.5 }); mat.userData.own = true;
  view.root.add(new THREE.Mesh(geo, mat));
}

/** des épées au mur : deux épées croisées sur une plaque de bois (epees), ou une longue épée posée sur deux crochets (epee) */
function poserEpees(view, a) {
  const c = document.createElement('canvas'); c.width = 28; c.height = 24;
  const x = c.getContext('2d');
  const px = (X, Y, col) => { x.fillStyle = col; x.fillRect(X, Y, 1, 1); };
  const epee = (pts) => pts.forEach(([X, Y], i) => {
    const n = pts.length, col = i < 4 ? '#4a2c14' : i === 4 ? '#e0b850' : i === 5 ? '#d8b048' : (i % 3 ? '#d0d4e0' : '#a0a6b8');
    px(X, Y, col); if (i >= 6) px(X + 1, Y, i % 2 ? '#8a90a2' : '#e8ecf4');
    if (i === 4) for (const d of [-2, -1, 1, 2]) px(X + d, Y - d, '#d8b048');
    if (i === 0) { px(X - 1, Y, '#e0b850'); px(X, Y + 1, '#e0b850'); }
  });
  if (a.genre === 'epees') {
    x.fillStyle = '#3a2210'; x.beginPath(); x.ellipse(14, 12, 9, 10, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#5a3a1e'; x.beginPath(); x.ellipse(14, 12, 7.5, 8.5, 0, 0, Math.PI * 2); x.fill();
    epee([...Array(22)].map((_, i) => [3 + i, 22 - i]));
    epee([...Array(22)].map((_, i) => [24 - i, 22 - i]));
  } else {
    for (const X of [6, 21]) { x.fillStyle = '#2a1a0c'; x.fillRect(X, 9, 2, 5); x.fillStyle = '#c89a48'; x.fillRect(X, 9, 2, 1); }
    for (let i = 0; i < 26; i++) {
      const X = 1 + i, col = i < 4 ? '#4a2c14' : i === 4 ? '#e0b850' : '#d0d4e0';
      x.fillStyle = i < 4 ? '#5a3418' : i === 4 ? '#f0d070' : '#eef0f6'; x.fillRect(X, 10, 1, 1);
      x.fillStyle = col; x.fillRect(X, 11, 1, 1); x.fillStyle = i < 4 ? '#3a2010' : i === 4 ? '#d8b048' : '#9aa0b0'; x.fillRect(X, 12, 1, 1);
      if (i === 4) { x.fillStyle = '#d8b048'; x.fillRect(X - 1, 6, 2, 11); }
    }
    x.fillStyle = '#e0b850'; x.fillRect(0, 11, 1, 2);
  }
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
  const W = 1.0, H = W * 24 / 28 * Math.tan(EL), haut = 1.25 * Math.tan(EL);
  const geo = new THREE.PlaneGeometry(W, H); geo.translate(a.x + 0.5, haut * 0.6, a.y + 1.01);
  const mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.5 }); mat.userData.own = true;
  view.root.add(new THREE.Mesh(geo, mat));
}

/** une panoplie au mur : deux épées croisées derrière un bouclier aux couleurs de la maison */
function poserPanoplie(view, a) {
  const c = document.createElement('canvas'); c.width = 24; c.height = 24;
  const x = c.getContext('2d');
  const lame = (x0, y0, dx, dy) => { for (let i = 0; i < 18; i++) { x.fillStyle = i < 3 ? '#4a2c14' : i === 3 ? '#d8b048' : i % 4 ? '#c8ccd8' : '#9aa0b0'; x.fillRect(x0 + dx * i, y0 + dy * i, 2, 2); } };
  lame(3, 21, 1, -1); lame(19, 21, -1, -1);
  x.fillStyle = '#d8b048'; x.fillRect(1, 18, 5, 1); x.fillRect(18, 18, 5, 1);
  x.fillStyle = '#2a1a10'; x.beginPath(); x.moveTo(6, 5); x.lineTo(18, 5); x.lineTo(18, 13); x.lineTo(12, 20); x.lineTo(6, 13); x.fill();
  x.fillStyle = '#8a1820'; x.beginPath(); x.moveTo(7, 6); x.lineTo(17, 6); x.lineTo(17, 13); x.lineTo(12, 19); x.lineTo(7, 13); x.fill();
  x.fillStyle = '#d8b048'; x.fillRect(11, 7, 2, 10); x.fillRect(8, 10, 8, 2);
  x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(7, 6, 10, 1);
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
  const W = 0.72, H = W * Math.tan(EL), haut = 1.25 * Math.tan(EL);
  const geo = new THREE.PlaneGeometry(W, H); geo.translate(a.x + 0.5, haut * 0.6, a.y + 1.01);
  const mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.5 }); mat.userData.own = true;
  view.root.add(new THREE.Mesh(geo, mat));
}

/** un dessin d'enfant punaisé au mur : la maison, un soleil, deux enfants qui se tiennent la main (tiré de la case) */
function poserDessin(view, a) {
  const c = document.createElement('canvas'); c.width = 20; c.height = 16;
  const x = c.getContext('2d'), R = hasard(a.x * 71 + a.y * 13), k = Math.floor(R() * 3);
  x.fillStyle = '#f4efe0'; x.fillRect(0, 0, 20, 16); x.fillStyle = '#d8d0b8'; x.fillRect(0, 15, 20, 1); x.fillRect(19, 0, 1, 16);
  x.fillStyle = '#c03030'; x.fillRect(9, 0, 2, 1);                                        // punaise
  x.fillStyle = '#f0c020'; x.fillRect(15, 2, 3, 3);                                       // soleil
  if (k === 0) { x.fillStyle = '#a06030'; x.fillRect(3, 8, 8, 6); x.fillStyle = '#c03040'; x.fillRect(2, 6, 10, 2); x.fillRect(4, 5, 6, 1); x.fillStyle = '#e8a0c0'; x.fillRect(5, 9, 2, 2); x.fillRect(8, 10, 2, 4); }   // la maison en pain d'épice
  else { const coul = k === 1 ? ['#3060c0', '#d050a0'] : ['#40a040', '#d08030'];
    for (const [cx, col] of [[6, coul[0]], [12, coul[1]]]) { x.fillStyle = '#e0b090'; x.fillRect(cx, 5, 2, 2); x.fillStyle = col; x.fillRect(cx, 7, 2, 4); x.fillStyle = '#404040'; x.fillRect(cx, 11, 1, 3); x.fillRect(cx + 1, 11, 1, 3); }
    x.fillStyle = '#404040'; x.fillRect(8, 8, 4, 1); }
  x.fillStyle = '#50a040'; x.fillRect(0, 14, 19, 1);
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
  const W = 0.6, H = W * 16 / 20 * Math.tan(EL), haut = 1.25 * Math.tan(EL);
  const geo = new THREE.PlaneGeometry(W, H); geo.translate(a.x + 0.5 + (R() - 0.5) * 0.15, haut * 0.66, a.y + 1.01);
  const mat = new THREE.MeshBasicMaterial({ map: t }); mat.userData.own = true;
  view.root.add(new THREE.Mesh(geo, mat));
}

/** une porte de manoir dans le mur : chambranle sculpté, deux battants de bois sombre à panneaux, poignées d'or, imposte cintrée */
function poserPorteManoir(view, a) {
  const c = document.createElement('canvas'); c.width = 32; c.height = 40;
  const x = c.getContext('2d');
  // chambranle : bois sombre, arc en plein cintre, filet d'or
  x.fillStyle = '#24140a'; x.fillRect(2, 10, 28, 30); x.beginPath(); x.arc(16, 12, 14, Math.PI, 0); x.fill();
  x.fillStyle = '#c89a48'; x.fillRect(4, 12, 1, 28); x.fillRect(27, 12, 1, 28); x.beginPath(); x.arc(16, 12, 12, Math.PI, 0); x.lineTo(27, 12); x.arc(16, 12, 11, 0, Math.PI, true); x.fill();
  // imposte : vitrail sombre en éventail
  x.fillStyle = '#3a1a22'; x.beginPath(); x.arc(16, 12, 10, Math.PI, 0); x.fill();
  x.fillStyle = '#7a3040'; for (const a0 of [1.25, 1.5, 1.75]) { x.beginPath(); x.moveTo(16, 12); x.arc(16, 12, 9, a0 * Math.PI, (a0 + 0.12) * Math.PI); x.fill(); }
  x.fillStyle = '#c89a48'; x.fillRect(5, 12, 22, 1);
  // battants
  for (const bx of [5, 16]) {
    x.fillStyle = '#4a2a16'; x.fillRect(bx, 13, 11, 27);
    x.fillStyle = '#3a2010'; x.fillRect(bx + 2, 15, 7, 9); x.fillRect(bx + 2, 27, 7, 11);
    x.fillStyle = '#5a3420'; x.fillRect(bx + 3, 16, 5, 7); x.fillRect(bx + 3, 28, 5, 9);
    x.fillStyle = 'rgba(255,220,170,0.12)'; x.fillRect(bx + 3, 16, 5, 1); x.fillRect(bx + 3, 28, 5, 1);
  }
  x.fillStyle = '#1a0c06'; x.fillRect(15, 13, 2, 27);
  x.fillStyle = '#e0b860'; x.fillRect(13, 26, 2, 2); x.fillRect(17, 26, 2, 2);
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
  const H = 1.25 * Math.tan(EL), W = 0.98;
  const geo = new THREE.PlaneGeometry(W, H); geo.translate(a.x + 0.5, H / 2, a.y + 1.01);
  const mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.5 }); mat.userData.own = true;
  view.root.add(new THREE.Mesh(geo, mat));
}

/** la bouche du tube de cuivre (Tour de l'Horloge) sur la face d'un mur : une grosse bride ronde, le verre, le noir dedans */
function poserBoucheTube(view, a) {
  const c = document.createElement('canvas'); c.width = 32; c.height = 34;
  const x = c.getContext('2d'), cx = 16, cy = 17;
  const rond = (r, col) => { x.fillStyle = col; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); };
  rond(16, '#4a2410'); rond(15, '#c8783a'); rond(12.5, '#8a4a1e');
  x.fillStyle = '#f0b070'; x.beginPath(); x.arc(cx, cy, 14.5, Math.PI * 1.05, Math.PI * 1.6); x.arc(cx, cy, 12.5, Math.PI * 1.6, Math.PI * 1.05, true); x.fill();
  for (let k = 0; k < 8; k++) { const t = (k * Math.PI) / 4; x.fillStyle = '#5a2c10'; x.fillRect(cx + Math.cos(t) * 13.8 - 1, cy + Math.sin(t) * 13.8 - 1, 2, 2); }
  rond(11, '#120a06'); rond(9, '#0a0604');
  x.fillStyle = 'rgba(170,220,255,0.28)'; x.beginPath(); x.ellipse(cx - 3, cy - 4, 5, 3, -0.5, 0, Math.PI * 2); x.fill();
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
  const H = 1.05 * Math.tan(EL), W = 0.98;
  const geo = new THREE.PlaneGeometry(W, H); geo.translate(a.x + 0.5, H / 2, a.y + 1.01);
  const mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.5 }); mat.userData.own = true;
  view.root.add(new THREE.Mesh(geo, mat));
}

/** cases colorées au sol (les regards des gardiens du tombeau, vus à travers les lunettes) ; tableau vide : efface */
export function dessinerZones(view, cases) {
  if (view.__zones) { view.__zonesRoot?.remove(view.__zones); view.__zones.geometry.dispose(); view.__zones = null; }
  if (!cases.length || !view.root) return;
  const pos = new Float32Array(cases.length * 18), H = 0.02;
  cases.forEach(([x, y], i) => pos.set([x, H, y, x, H, y + 1, x + 1, H, y + 1, x, H, y, x + 1, H, y + 1, x + 1, H, y], i * 18));
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const me = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xff3a3a, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }));
  me.renderOrder = 4; me.frustumCulled = false;
  view.root.add(me); view.__zones = me; view.__zonesRoot = view.root;
}

/** plaques de pression (Fonderie) : carrés de couleur au sol, plus vifs sous un joueur ; une plaque de deux groupes a
 *  un carré intérieur de la seconde couleur. Grilles : un voyant de leur couleur sur la face, allumé quand elle est
 *  levée. Liste vide : efface */
export function dessinerPlaques(view, liste) {
  if (view.__plaques) { view.__plaquesRoot?.remove(view.__plaques); view.__plaques.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); }); view.__plaques = null; view.__plaquesRoot = null; }
  if (!liste.length || !view.root) return;
  const g = new THREE.Group(), H = 0.025, haut = 1.25 * Math.tan(EL);
  const quad = (x0, z0, t, color, opacity, h) => {
    const geo = new THREE.PlaneGeometry(t, t); geo.rotateX(-Math.PI / 2); geo.translate(x0 + 0.5, h, z0 + 0.5);
    const me = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
    me.renderOrder = 3; me.frustumCulled = false; g.add(me);
  };
  for (const q of liste) {
    if (q.grille) {
      const geo = new THREE.PlaneGeometry(0.34, 0.34 * Math.tan(EL)); geo.translate(q.x + 0.5, haut * 0.82, q.y + 1.02);
      const me = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: q.couleurs[0], transparent: true, opacity: q.on ? 1 : 0.4, depthWrite: false }));
      me.renderOrder = 3; me.frustumCulled = false; g.add(me);
      continue;
    }
    quad(q.x, q.y, 0.86, 0x1c1c22, 0.7, H);
    quad(q.x, q.y, 0.72, q.couleurs[0], q.on ? 0.95 : 0.5, H + 0.002);
    if (q.couleurs[1] != null) quad(q.x, q.y, 0.34, q.couleurs[1], q.on ? 0.95 : 0.55, H + 0.004);
  }
  view.root.add(g); view.__plaques = g; view.__plaquesRoot = view.root;
}

/** grand miroir debout le long d'une ligne (salle du Reflet) : une vitre blanche deux fois plus haute que les murs, posée sur le bord
 *  nord de la rangée y, de x0 à x1, sans cadre ; null : efface */
export function dessinerMiroir(view, M) {
  if (!M) { if (view.__miroir) { view.__miroirRoot?.remove(view.__miroir); view.__miroir.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); }); view.__miroir = null; view.__miroirRoot = null; } return; }
  if (!view.root) return;
  dessinerMiroir(view, null);
  const g = new THREE.Group(), H = 2.5 * Math.tan(EL), z = M.y, w = M.x1 - M.x0;   // deux fois la hauteur des murs
  const vitre = (cx, y0, larg, haut, color, opacity, rot = 0, dz = 0) => {
    const geo = new THREE.PlaneGeometry(larg, haut); if (rot) geo.rotateZ(rot); geo.translate(cx, y0 + haut / 2, z + dz);
    const me = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }));
    me.renderOrder = 2; me.frustumCulled = false; g.add(me);
  };
  vitre(M.x0 + w / 2, 0, w, H, 0xeef6ff, 0.72);
  for (let x = M.x0 + 1.3; x < M.x1 - 0.5; x += 2.6) { vitre(x, H * 0.15, 0.16, H * 0.7, 0xffffff, 0.9, -0.35, 0.002); vitre(x + 0.35, H * 0.3, 0.07, H * 0.4, 0xffffff, 0.9, -0.35, 0.002); }
  view.root.add(g); view.__miroir = g; view.__miroirRoot = view.root;
}

/** « Zzz » au-dessus des personnages endormis (les gardiens du tombeau) ; liste vide : efface */
export function dessinerZzz(view, npcs) {
  const vus = new Set();
  for (const n of npcs) {
    const id = 'zzz:' + n.id; vus.add(id);
    const r = view.S?.rects?.zzz; if (!r) continue;
    const a = view.actor(id, { kind: 'bang' });
    if (!a.zzz) { view.setSpriteRect(a, r, r.w, r.h); a.zzz = true; }
    a.mesh.position.set(n.x + 0.5, 34 * HPX + Math.sin(performance.now() / 400) * 0.04, n.y + 0.56);
  }
  for (const id of [...view.actors.keys()]) if (id.startsWith('zzz:') && !vus.has(id)) view.removeActor(id);
}

/**
 * faisceaux de lumière : une suite de lignes brisées, chaque point est une case [x, y] (centre de la case).
 * Remplace ceux déjà dessinés ; tableau vide : efface.
 */
export function dessinerFaisceaux(view, traits) {
  if (view.__faisceaux) { view.root?.remove(view.__faisceaux); view.__faisceaux.traverse((o) => o.geometry?.dispose()); view.__faisceaux = null; }
  view.__faisceauxRoot = view.root;
  if (!traits.length || !view.root) return;
  const g = new THREE.Group();
  const coeur = new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0.95, depthWrite: false });
  const halo = new THREE.MeshBasicMaterial({ color: 0xffc030, transparent: true, opacity: 0.45, depthWrite: false });
  const H = 0.55;
  for (const pts of traits) {
    for (let k = 1; k < pts.length; k++) {
      const [ax, ay] = pts[k - 1], [bx, by] = pts[k];
      const len = Math.hypot(bx - ax, by - ay); if (!len) continue;
      for (const [mat, w, h] of [[halo, 0.42, H - 0.01], [coeur, 0.14, H]]) {
        const geo = new THREE.PlaneGeometry(len + w, w); geo.rotateX(-Math.PI / 2);
        const me = new THREE.Mesh(geo, mat);
        me.position.set((ax + bx) / 2 + 0.5, h, (ay + by) / 2 + 0.5);
        me.rotation.y = -Math.atan2(by - ay, bx - ax);
        me.renderOrder = 5; me.frustumCulled = false;
        g.add(me);
      }
    }
  }
  view.root.add(g); view.__faisceaux = g; view.__faisceauxRoot = view.root;
}

/** cases colorées au sol, chacune sa couleur (arènes du labo : bulles, traînée toxique, douches) ; liste vide : efface */
export function dessinerCases(view, liste) {
  if (view.__cases) { view.__casesRoot?.remove(view.__cases); view.__cases.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); }); view.__cases = null; view.__casesRoot = null; }
  if (!liste.length || !view.root) return;
  const g = new THREE.Group();
  for (const q of liste) {
    const t = q.t ?? 0.9, geo = new THREE.PlaneGeometry(t, t); geo.rotateX(-Math.PI / 2); geo.translate(q.x + 0.5, 0.03, q.y + 0.5);
    const me = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: q.c, transparent: true, opacity: q.o ?? 0.5, depthWrite: false }));
    me.renderOrder = 4; me.frustumCulled = false; g.add(me);
  }
  view.root.add(g); view.__cases = g; view.__casesRoot = view.root;
}

/** les cailloux semés dans le labyrinthe (Bois des Contes) : des pastilles de couleur cerclées de noir, dessinées
 *  par-dessus tout (les hautes haies cachent le sol des allées horizontales) ; liste vide : efface */
export function dessinerCailloux(view, liste) {
  if (view.__cailloux) { view.__caillouxRoot?.remove(view.__cailloux); view.__cailloux.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); }); view.__cailloux = null; view.__caillouxRoot = null; }
  if (!liste.length || !view.root) return;
  const g = new THREE.Group();
  const disque = (q, r, c, ordre) => {
    const geo = new THREE.CircleGeometry(r, 12); geo.rotateX(-Math.PI / 2); geo.translate(q.x + 0.5, 0.04, q.y + 0.5);
    const me = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: c, depthTest: false, depthWrite: false, transparent: true }));
    me.renderOrder = ordre; me.frustumCulled = false; g.add(me);
  };
  for (const q of liste) { disque(q, 0.2, '#141414', 60); disque(q, 0.14, q.c, 61); }
  view.root.add(g); view.__cailloux = g; view.__caillouxRoot = view.root;
}

/** les rivières du chemin de l'Eau : des chevrons blancs qui défilent dans le sens du courant (m absent : efface) */
export function dessinerCourants(view, m, t) {
  if (view.__courants && (view.__courantsRoot !== view.root || view.__courantsMap !== m)) {
    view.__courantsRoot?.remove(view.__courants); view.__courants.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); }); view.__courants = null;
  }
  if (!m?.courants || !view.root) return;
  if (!view.__courants) {
    const G = new THREE.Group(), V = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    for (let ph = 0; ph < 3; ph++) {
      const pos = [];
      for (const [k, dir] of m.courants) {
        const [x, y] = k.split(',').map(Number), [dx, dz] = V[dir], px = -dz, pz = dx, o = (ph - 1) * 0.3;
        const cx = x + 0.5 + dx * o, cz = y + 0.5 + dz * o;
        const P = (a, b) => [cx + dx * a + px * b, 0.045, cz + dz * a + pz * b];
        // un chevron : deux bandes
        pos.push(...P(0.16, 0), ...P(-0.1, 0.26), ...P(-0.2, 0.26), ...P(0.16, 0), ...P(-0.2, 0.26), ...P(0.04, 0));
        pos.push(...P(0.16, 0), ...P(-0.2, -0.26), ...P(-0.1, -0.26), ...P(0.16, 0), ...P(0.04, 0), ...P(-0.2, -0.26));
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      const me = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xe8f8ff, transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide }));
      me.renderOrder = 4; me.frustumCulled = false; G.add(me);
    }
    view.root.add(G); view.__courants = G; view.__courantsRoot = view.root; view.__courantsMap = m;
  }
  const ph = Math.floor(t / 200) % 3;
  view.__courants.children.forEach((c, i) => { c.visible = i === ph; });
}

/** les eaux tumultueuses (tourbillons infranchissables) de la Mer Intérieure : des remous qui tournent par-dessus
 * l'eau (m absent : efface) */
export function dessinerRemous(view, m, t) {
  if (view.__remous && (view.__remousRoot !== view.root || view.__remousMap !== m)) {
    view.__remousRoot?.remove(view.__remous); view.__remous.traverse((o) => { o.geometry?.dispose(); o.material?.map?.dispose(); o.material?.dispose(); }); view.__remous = null;
  }
  if (!m?.remous || !view.root) return;
  if (!view.__remous) {
    const G = new THREE.Group();
    for (let ph = 0; ph < 2; ph++) {
      // une texture de remous : des arcs d'écume blanche sur un bleu sombre
      const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d');
      x.fillStyle = 'rgba(10,40,90,0.55)'; x.fillRect(0, 0, 32, 32);
      x.strokeStyle = 'rgba(220,240,255,0.85)'; x.lineWidth = 2;
      for (const [cx, cy, r0] of [[9, 10, 5], [24, 22, 6], [22, 6, 3], [7, 26, 3]]) { x.beginPath(); x.arc(cx, cy, r0, ph * 1.6, ph * 1.6 + 3.6); x.stroke(); }
      const tex = new THREE.CanvasTexture(c); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
      const pos = [], uv = [];
      for (const [px, py] of m.remous) {
        pos.push(px, 0.04, py, px + 1, 0.04, py, px + 1, 0.04, py + 1, px, 0.04, py, px + 1, 0.04, py + 1, px, 0.04, py + 1);
        uv.push(0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0);
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      const me = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
      me.renderOrder = 4; me.frustumCulled = false; G.add(me);
    }
    view.root.add(G); view.__remous = G; view.__remousRoot = view.root; view.__remousMap = m;
  }
  const ph = Math.floor(t / 450) % 2;
  view.__remous.children.forEach((c, i) => { c.visible = i === ph; });
}
