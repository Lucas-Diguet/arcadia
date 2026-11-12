// testodyssee/js/rendu.js — ce que le labo ajoute au rendu d'Odyssée : donjons « clairs » (sol et murs blancs),
// sol glacé, et faisceaux de lumière. Branché une fois au démarrage (navigateur seulement).
import * as THREE from 'three';
import { WorldView, HPX, EL } from '../../odyssee/js/render/world3d.js';
import { Sol } from '../../odyssee/js/render/sol.js';
import { T } from '../../odyssee/js/world/tiles.js';

// textures d'Odyssée reprises pour les styles de donjon : clair (miroirs), sable (pyramide)
const CLAIR = { sol: 'floor_musee', mur: 'wall_mart', haut: ['snow', 'floor_lab', 'floor_mart'], glace: 'floor_gymWater', fond: '#e8eef8' };
const EGYPTE = { sol: ['gl_sable'], mur: ['mur_tombeau', 'wall_in'], haut: ['haut_tombeau', 'cavetop'], fond: '#1c1408' };
const STYLES = { insecte: { sol: ['floor_gymBug', 'floor_gymGrass'], mur: ['wall_gym', 'wall_in'], haut: ['floor_gymGrass', 'cavetop'], fond: '#0c1408' },
  poison: { sol: ['floor_gymPsy', 'floor_gymGrass'], mur: ['wall_gym', 'wall_in'], haut: ['floor_gymPsy', 'cavetop'], fond: '#120a16' },
  clair: CLAIR, egypte: EGYPTE, bois: { sol: ['floor_wood'], mur: ['wall_in', 'wall_center'], haut: ['roof_flat', 'floor_wood'], fond: '#0c0a14' }, sable: { sol: ['floor_sand', 'gl_sable', 'floor_gymRock'], mur: ['wall_gym'], haut: ['floor_gymRock', 'cavetop'], fond: '#1a1008', relief: true } };
const cellule = (A, k) => (Array.isArray(k) ? k.map((q) => A[q]).find(Boolean) : A[k]);
const SOLS = new Set([T.CAVE, T.BLOCK, T.CAVEWALL, T.CAVEDOOR, T.FLOOR]);
const REVELE = 'floor_gymWater';

/** tuiles du labo ajoutées à l'atlas d'Odyssée, à la suite des siennes : les murs du tombeau (grès orangé, vieilles pierres) */
function hasard(g) { let s = g >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
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
  sol_reflet(x) {
    // sol de la salle du Reflet : dalles bleu pâle, assez foncées pour que le haut blanc des murs s'en détache
    x.fillStyle = '#a9c9ee'; x.fillRect(0, 0, 32, 32);
    x.fillStyle = '#b8d3f2'; x.fillRect(1, 1, 14, 14); x.fillRect(17, 17, 14, 14);
    x.fillStyle = '#93b8e4'; x.fillRect(0, 15, 32, 1); x.fillRect(0, 31, 32, 1); x.fillRect(15, 0, 1, 32); x.fillRect(31, 0, 1, 32);
  },
  ...TUILES_ARENES(),
};
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
    const c = document.createElement('canvas'); c.width = c.height = C2; f(c.getContext('2d'), hasard(97 + i * 31));
    const cx = (n % cols) * P2, cy = Math.floor(n / cols) * P2; n++;
    ctx.drawImage(c, cx + 1, cy + 1);
    // bord dupliqué autour de la tuile (pas de joint visible au filtrage)
    ctx.drawImage(c, 0, 0, C2, 1, cx + 1, cy, C2, 1); ctx.drawImage(c, 0, C2 - 1, C2, 1, cx + 1, cy + C2 + 1, C2, 1);
    ctx.drawImage(c, 0, 0, 1, C2, cx, cy + 1, 1, C2); ctx.drawImage(c, C2 - 1, 0, 1, C2, cx + C2 + 1, cy + 1, 1, C2);
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
    const m = this.map, nus = m?.deco ? new Set(m.deco.filter((d) => SOUS.has(d.k)).map((d) => d.x + ',' + d.y)) : null;
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
    // arènes du labo : un sol par case (fourmis, toile, vase…)
    { const k = m.solArene?.get(x + ',' + y); if (k && A[k]) return { c: A[k] }; }
    // rebords dans une grotte : une marche de roche (pas de l'herbe)
    if (!m.outdoor && !m.rv) { const t = m.get(x, y); if (t === T.LEDGE || t === T.LEDGE_E || t === T.LEDGE_W) return { c: A.cavestairs }; }
    // Routes Victoire : ponts de bois et rebords taillés dans la roche (pas d'eau ni d'herbe sous la grotte)
    if (m.rv) {
      const t = m.get(x, y);
      if (t === T.BRIDGE) {
        const S = m.rv.sol, bout = (dx, dy) => { let i = 1; while ('=%'.includes(S[y + dy * i]?.[x + dx * i] || '#')) i++; return S[y + dy * i]?.[x + dx * i] === 'p'; };
        const ew = m.rv.gen === 4 ? bout(1, 0) || bout(-1, 0) : [m.get(x - 1, y), m.get(x + 1, y)].some((q) => q === T.BRIDGE || q === T.CAVE) && m.elev[y * m.w + x - 1] !== 3;
        return { c: A.cave0, bridge: ew ? A.bridgeEW || A.bridge : A.bridge };
      }
      if (t === T.LEDGE || t === T.LEDGE_E || t === T.LEDGE_W || m.rv.sol[y]?.[x] === 'e') return { c: A.cavestairs };
    }
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
