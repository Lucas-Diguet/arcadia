// testodyssee/js/rendu.js — ce que le labo ajoute au rendu d'Odyssée : donjons « clairs » (sol et murs blancs),
// sol glacé, et faisceaux de lumière. Branché une fois au démarrage (navigateur seulement).
import * as THREE from 'three';
import { WorldView } from '../../odyssee/js/render/world3d.js';
import { T } from '../../odyssee/js/world/tiles.js';

// textures d'Odyssée reprises pour le style clair
const CLAIR = { sol: 'floor_musee', mur: 'wall_mart', haut: ['snow', 'floor_lab', 'floor_mart'], glace: 'floor_gymWater', fond: '#e8eef8' };
const SOLS = new Set([T.CAVE, T.BLOCK, T.CAVEWALL, T.CAVEDOOR, T.FLOOR]);

export function brancherRendu() {
  const P = WorldView.prototype;
  const sol = P.groundCell;
  P.groundCell = function (x, y) {
    const m = this.map, A = this.A.cells;
    if (m.glace?.has(x + ',' + y)) return { c: A[CLAIR.glace] };
    if (m.style === 'clair' && SOLS.has(m.get(x, y)) && this.decoAt.get(x + ',' + y)?.k !== 'exitlight') return { c: A[CLAIR.sol] };
    return sol.call(this, x, y);
  };
  // murs de grotte dessinés avec les textures claires, le temps de construire le morceau de carte
  const morceau = P.buildChunk;
  P.buildChunk = function (i, j) {
    if (this.map?.style !== 'clair') return morceau.call(this, i, j);
    const A = this.A.cells, avant = { cavewall: A.cavewall, cavetop: A.cavetop };
    A.cavewall = A[CLAIR.mur]; A.cavetop = CLAIR.haut.map((k) => A[k]).find(Boolean) || avant.cavetop;
    try { return morceau.call(this, i, j); } finally { Object.assign(A, avant); }
  };
  const carte = P.setMap;
  P.setMap = function (map) {
    carte.call(this, map);
    // style clair : murs droits et blancs, sans les gradins de roche des grottes d'Odyssée
    if (map.style === 'clair') { this.tiers = null; this.scene.background = new THREE.Color(CLAIR.fond); }
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
