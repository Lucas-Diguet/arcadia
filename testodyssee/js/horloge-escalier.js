// testodyssee/js/horloge-escalier.js — le dessin de l'escalier de l'étage 1 de la Tour de l'Horloge (horloge-n1.js), en
// volumes : des marches de calcaire clair (PixelForge : testodyssee/img/horloge/) qui font tout le tour de la tour en
// montant, posées sur des piliers, une rambarde de balustres des deux côtés ; tout en bas, à travers le vide, les salles
// est, sud et ouest de l'étage ; le mur de la tour, haut au fond et bas devant (du côté de la caméra) ; le palier, le
// petit palier de 1 h, les portes des plateformes et, tout en haut, la grande porte de l'étage 2.
import * as THREE from 'three';
import { SC, SR0, SR1, R_MUR, R_MUR2 } from './horloge.js';
import { ESC, rInt, hMarche, caseEscalier, boutsEscalier, salles1, SALLES1 } from './horloge-n1.js';

/** profondeur des salles du dessous */
export const BAS = -3.2;
const O = SC + 0.5;
const IMG = new URL('../img/horloge/', import.meta.url).href;
const mat = (c) => new THREE.MeshBasicMaterial({ color: c });
let TEX = null;
function textures() {
  if (TEX) return TEX;
  const L = new THREE.TextureLoader(), t = (f) => { const x = L.load(IMG + f); x.magFilter = THREE.NearestFilter; x.minFilter = THREE.NearestFilter; x.colorSpace = THREE.SRGBColorSpace; return x; };
  TEX = { marche: t('marche_horloge.png'), contre: t('contremarche_horloge.png'), porte: t('porte_horloge.png'), balustre: t('balustre_horloge.png') };
  return TEX;
}
/** le point de la carte au rayon r, à l'heure h (en unités de la scène : x, z) */
const pt = (r, h) => { const a = (h * Math.PI) / 6; return [O + Math.sin(a) * r, O - Math.cos(a) * r]; };
/** un pavé orienté : centré en (x, z), de largeur radiale lr, de longueur tangentielle lt, de y0 à y1, tourné vers l'heure h */
function pave(x, z, h, lr, lt, y0, y1, m) {
  const g = new THREE.BoxGeometry(lr, y1 - y0, lt), me = new THREE.Mesh(g, m);
  me.position.set(x, (y0 + y1) / 2, z); me.rotation.y = Math.PI / 2 - (h * Math.PI) / 6;
  return me;
}

export function creerEscalier() {
  const T = textures(), G = new THREE.Group();
  const pierre = mat('#b4a88e'), pierreS = mat('#8a7e68'), pierreF = mat('#5e5444'), dessous = mat('#2a241c');
  const dessus = new THREE.MeshBasicMaterial({ map: T.marche }), contre = new THREE.MeshBasicMaterial({ map: T.contre });
  // ---- les salles du dessous : leur plan, en planches et en pierre, tout au fond
  const pos = [], col = [], c = new THREE.Color();
  const quad = (x, z, y, couleur) => { c.set(couleur); for (const [a, b] of [[0, 0], [1, 0], [1, 1], [0, 0], [1, 1], [0, 1]]) { pos.push(x + a, y, z + b); col.push(c.r, c.g, c.b); } };
  const L1 = salles1();
  for (const s of SALLES1) {
    const P = L1[s.id].plan, tq = new Set(L1[s.id].tourniquets.map((q) => q.x + ',' + q.y));
    P.forEach((l, y) => [...l].forEach((ch, x) => {
      if (ch === ' ') return;
      quad(x, y, BAS, tq.has(x + ',' + y) ? '#6a5020' : ch === '#' ? ((x + y) % 2 ? '#4e4a50' : '#56525a') : ch === 'G' ? '#3a3a44' : ((x * 3 + y) % 5 ? '#7a4426' : '#6e3c22'));
    }));
  }
  const gs = new THREE.BufferGeometry(); gs.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gs.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  gs.setIndex([...Array(pos.length / 3).keys()].reverse());
  G.add(new THREE.Mesh(gs, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })));
  // le vide autour, très sombre
  const fond = new THREE.Mesh(new THREE.RingGeometry(R_MUR - 1, R_MUR2 + 2, 96).rotateX(-Math.PI / 2), mat('#0a0806'));
  fond.position.set(O, BAS - 0.05, O); G.add(fond);
  // ---- les marches : une dalle par marche, posée de biais, nez de marche devant ; des piliers dessous de loin en loin
  const N = ESC.marches;
  for (let k = 0; k < N; k++) {
    const t = ((k + 0.5) / N) * 12, h = ESC.hs + t, r0 = rInt(t), rm = r0 + ESC.larg / 2, [x, z] = pt(rm, h), y = hMarche(k);
    const lt = ((Math.PI * 2 * (r0 + ESC.larg)) / N) * 1.04;
    // faces : +x (vers l'extérieur), -x, dessus, dessous, +z (vers la marche suivante), -z (le devant : la contremarche)
    G.add(pave(x, z, h, ESC.larg, lt, y - 0.45, y, [pierreS, pierreS, dessus, dessous, pierreF, contre]));
    if (k % 6 === 3) for (const rr of [r0 + 0.35, r0 + ESC.larg - 0.35]) { const [px, pz] = pt(rr, h); G.add(pave(px, pz, h, 0.5, 0.5, BAS, y - 0.45, [pierreS, pierreS, pierre, dessous, pierreF, pierreF])); }
    // la rambarde : balustres et main courante, des deux côtés
    // (pas de rambarde côté mur au bord du petit palier de 1 h : on y passe)
    const auPalierEst = ((h - ESC.pallierEst[0]) % 12 + 12) % 12 <= ESC.pallierEst[1] - ESC.pallierEst[0] + 0.05;
    for (const rr of [r0 + 0.08, ...(auPalierEst ? [] : [r0 + ESC.larg - 0.08])]) {
      const [bx, bz] = pt(rr, h);
      if (k % 2 === 0) G.add(pave(bx, bz, h, 0.16, 0.16, y, y + 0.7, [pierre, pierreS, pierre, dessous, pierre, pierreS]));
      G.add(pave(bx, bz, h, 0.24, lt, y + 0.7, y + 0.84, [pierre, pierreS, mat('#d6ccb4'), dessous, pierre, pierreS]));
    }
  }
  // ---- les paliers : dalles de pierre par case
  for (let y = 0; y < SC * 2 + 1; y++) for (let x = 0; x < SC * 2 + 1; x++) {
    const q = caseEscalier(x, y); if (!q || q.quoi === 'marche') continue;
    const clair = (x + y) % 2 ? '#a89c84' : '#b4a88e';
    const g = new THREE.BoxGeometry(1, 0.45 + (q.quoi === 'palier' ? 0 : 0), 1), me = new THREE.Mesh(g, [pierreS, pierreS, mat(clair), dessous, pierreF, pierreS]);
    me.position.set(x + 0.5, q.h - 0.225, y + 0.5); G.add(me);
    const sup = new THREE.Mesh(new THREE.BoxGeometry(1, q.h - 0.45 - BAS, 1), pierreF); sup.position.set(x + 0.5, (q.h - 0.45 + BAS) / 2, y + 0.5); G.add(sup);
  }
  // ---- le mur de la tour : extérieur haut au fond (nord), bas devant ; intérieur haut devant (au sud de l'escalier, il est
  // derrière lui pour la caméra), bas au fond ; arcades contre le mur du fond
  const NM = 120, haut = ESC.haut + 4.5, BP = boutsEscalier().porte, hPorte = ((Math.atan2(BP[0] + 0.5 - O, -(BP[1] + 0.5 - O)) / (Math.PI / 6)) % 12 + 12) % 12;
  for (let i = 0; i < NM; i++) {
    const h = (i / NM) * 12, a = (h * Math.PI) / 6, devant = -Math.cos(a);
    const t = ((h - ESC.hs) % 12 + 12) % 12, ici = hMarche(Math.floor((t / 12) * N));
    for (const [r0, r1, fondNord] of [[SR1 + 0.5, R_MUR2 + 0.5, true], [R_MUR - 0.6, SR0 - 0.5, false]]) {
      const auFond = fondNord ? devant < -0.2 : devant > 0.2;
      const yh = auFond ? haut : Math.max(0.6, (fondNord ? ici : 0) + 0.9);
      const [x, z] = pt((r0 + r1) / 2, h), lt = ((Math.PI * 2 * r1) / NM) * 1.06, clair = i % 2 ? '#6a6052' : '#726858';
      G.add(pave(x, z, h, r1 - r0, lt, BAS, yh, [mat('#4a4238'), mat('#4a4238'), mat(clair), dessous, mat('#5a5244'), mat('#5a5244')]));
      if (auFond && fondNord && i % 5 === 0 && Math.abs(((h - hPorte + 6) % 12 + 12) % 12 - 6) > 0.4) { const [px, pz] = pt(SR1 + 0.2, h); G.add(pave(px, pz, h, 0.6, 0.9, BAS, haut, [pierre, pierreS, pierre, dessous, pierre, pierreS])); }
    }
  }
  // ---- les portes : vers les plateformes (au bout des paliers) et la grande porte de l'étage 2, tout en haut
  const B = boutsEscalier();
  for (const b of [B.ouest, B.est]) {
    // une arche de pierre et de laiton, ouverte sur le noir, qui regarde le palier
    const [x, y] = b.sortie, q = caseEscalier(...b.case);
    const P = new THREE.Group(); P.position.set(x + 0.5, q.h, y + 0.5); P.rotation.y = Math.atan2(b.case[0] - x, b.case[1] - y);
    // dans le mur de devant (on y marche vers la caméra) : juste un seuil entre deux bornes basses, pour ne cacher personne
    if (b.case[1] < y) {
      for (const sx of [-0.95, 0.95]) P.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.0, 0.6).translate(sx, 0.5, 0), [pierreS, pierreS, pierre, dessous, pierre, pierreS]));
      P.add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.9).translate(0, 0.03, 0), mat('#9a7a34')));
      G.add(P); continue;
    }
    for (const sx of [-0.95, 0.95]) P.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.6, 0.6).translate(sx, 1.3, 0), [pierreS, pierreS, pierre, dessous, pierre, pierreS]));
    P.add(new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.4, 0.6).translate(0, 2.8, 0), [pierreS, pierreS, pierre, dessous, pierre, pierreS]));
    P.add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.62).translate(0, 2.55, 0), mat('#c8963a')));
    P.add(new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.55).translate(0, 1.27, -0.2), mat('#050403')));
    P.add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.9).translate(0, 0.03, 0.15), mat('#9a7a34')));
    G.add(P);
  }
  {
    // la grande porte, dans le mur du fond (au nord), au bout du palier du haut, contre la face du mur
    const [x] = B.porte;
    const P = new THREE.Group(); P.position.set(x + 0.5, ESC.haut, B.haut[1] + 0.02);
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 4.27), new THREE.MeshBasicMaterial({ map: T.porte, transparent: true, alphaTest: 0.5 }));
    pl.position.set(0, 4.27 / 2, 0.05); P.add(pl);
    G.add(P);
  }
  return G;
}
