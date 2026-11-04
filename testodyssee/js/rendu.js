// testodyssee/js/rendu.js — ce que le labo ajoute au rendu d'Odyssée : donjons « clairs » (sol et murs blancs),
// sol glacé, et faisceaux de lumière. Branché une fois au démarrage (navigateur seulement).
import * as THREE from 'three';
import { WorldView } from '../../odyssee/js/render/world3d.js';
import { Sol } from '../../odyssee/js/render/sol.js';
import { T } from '../../odyssee/js/world/tiles.js';

// textures d'Odyssée reprises pour les styles de donjon : clair (miroirs), sable (pyramide)
const CLAIR = { sol: 'floor_musee', mur: 'wall_mart', haut: ['snow', 'floor_lab', 'floor_mart'], glace: 'floor_gymWater', fond: '#e8eef8' };
const STYLES = { clair: CLAIR, bois: { sol: ['floor_wood'], mur: ['wall_in', 'wall_center'], haut: ['roof_flat', 'floor_wood'], fond: '#0c0a14' }, sable: { sol: ['floor_sand', 'gl_sable', 'floor_gymRock'], mur: ['wall_gym'], haut: ['floor_gymRock', 'cavetop'], fond: '#1a1008', relief: true } };
const cellule = (A, k) => (Array.isArray(k) ? k.map((q) => A[q]).find(Boolean) : A[k]);
const SOLS = new Set([T.CAVE, T.BLOCK, T.CAVEWALL, T.CAVEDOOR, T.FLOOR]);

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
    const lave = m?.biome === 'magma' && !m.outdoor, grotte = m && !m.outdoor && m.floor === 'cave';
    if (!nus?.size && !lave && !grotte) return pompe.call(this);
    m.get = function (x, y) {
      if (nus?.has(x + ',' + y)) return T.FLOOR;
      const t = Object.getPrototypeOf(this).get.call(this, x, y);
      if (lave && t === T.BRIDGE) return T.LAVA;
      if (grotte && (t === T.BARRIER_R || t === T.BARRIER_B)) return T.CAVE;
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
    // pont sur la lave (chemins du Temple) : la lave dessous, les planches en décalque
    if (m.biome === 'magma' && !m.outdoor && m.get(x, y) === T.BRIDGE) return { anim: this.N.cells.lava };
    const st = STYLES[m.style];
    if (st && SOLS.has(m.get(x, y)) && !['exitlight', 'carpet'].includes(this.decoAt.get(x + ',' + y)?.k)) { const c = cellule(A, st.sol); if (c) return { c }; }
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
    carte.call(this, map);
    const A = this.A?.cells; if (A && !A.dec_dalle_pontns) { A.dec_dalle_pontns = A.bridge; A.dec_dalle_pontew = A.bridgeEW || A.bridge; }
    // style clair : murs droits et blancs, sans les gradins de roche des grottes d'Odyssée
    const st = STYLES[map.style];
    if (st) { if (!st.relief) this.tiers = null; this.scene.background = new THREE.Color(st.fond); }
  };
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
