// testodyssee/js/rendu.js — ce que le labo ajoute au rendu d'Odyssée : donjons « clairs » (sol et murs blancs),
// sol glacé, et faisceaux de lumière. Branché une fois au démarrage (navigateur seulement).
import * as THREE from 'three';
import { WorldView, HPX, EL } from '../../odyssee/js/render/world3d.js';
import { Sol } from '../../odyssee/js/render/sol.js';
import { T } from '../../odyssee/js/world/tiles.js';

// textures d'Odyssée reprises pour les styles de donjon : clair (miroirs), sable (pyramide)
const CLAIR = { sol: 'floor_musee', mur: 'wall_mart', haut: ['snow', 'floor_lab', 'floor_mart'], glace: 'floor_gymWater', fond: '#e8eef8' };
const EGYPTE = { sol: ['gl_sable'], mur: ['mur_tombeau', 'wall_in'], haut: ['haut_tombeau', 'cavetop'], fond: '#1c1408' };
const STYLES = { clair: CLAIR, egypte: EGYPTE, bois: { sol: ['floor_wood'], mur: ['wall_in', 'wall_center'], haut: ['roof_flat', 'floor_wood'], fond: '#0c0a14' }, sable: { sol: ['floor_sand', 'gl_sable', 'floor_gymRock'], mur: ['wall_gym'], haut: ['floor_gymRock', 'cavetop'], fond: '#1a1008', relief: true } };
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
};
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

/** une affiche encadrée sur la face sud d'un mur (case a.x, a.y) : papier clair, cadre bleu, quelques lignes d'écriture */
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

/** grand miroir debout le long d'une ligne (salle du Reflet) : une vitre blanche de la hauteur des murs, posée sur le bord
 *  nord de la rangée y, de x0 à x1, cadre bleu en haut et en bas ; null : efface */
export function dessinerMiroir(view, M) {
  if (!M) { if (view.__miroir) { view.__miroirRoot?.remove(view.__miroir); view.__miroir.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); }); view.__miroir = null; view.__miroirRoot = null; } return; }
  if (!view.root) return;
  dessinerMiroir(view, null);
  const g = new THREE.Group(), H = 1.25 * Math.tan(EL), z = M.y, w = M.x1 - M.x0;
  const vitre = (cx, y0, larg, haut, color, opacity, rot = 0, dz = 0) => {
    const geo = new THREE.PlaneGeometry(larg, haut); if (rot) geo.rotateZ(rot); geo.translate(cx, y0 + haut / 2, z + dz);
    const me = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }));
    me.renderOrder = 2; me.frustumCulled = false; g.add(me);
  };
  vitre(M.x0 + w / 2, 0, w, H, 0xffffff, 0.5);
  for (let x = M.x0 + 1.3; x < M.x1 - 0.5; x += 3.1) { vitre(x, H * 0.2, 0.12, H * 0.6, 0xffffff, 0.6, -0.35, 0.002); vitre(x + 0.3, H * 0.3, 0.05, H * 0.4, 0xffffff, 0.6, -0.35, 0.002); }
  vitre(M.x0 + w / 2, H - 0.08, w, 0.08, 0x6f9fd8, 0.95, 0, 0.004);   // cadre du haut
  vitre(M.x0 + w / 2, 0, w, 0.06, 0x6f9fd8, 0.95, 0, 0.004);          // cadre du bas
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
