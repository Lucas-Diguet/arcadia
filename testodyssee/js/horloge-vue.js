// testodyssee/js/horloge-vue.js — le dessin de la Tour de l'Horloge, niveau 0 (horloge.js) : tout est en volumes. Tout au
// fond, le cadran ; au centre, la barre du pivot qui traverse les étages, cerclée du mécanisme central ; les trois
// aiguilles (horloge-aiguilles.js) ; le mur de la tour, épais (les salles sont dedans), bas du côté de la caméra pour
// voir le quai, et ses portes ; les plateformes, les leviers, et les deux blocs de pierre qui arrêtent les aiguilles.
// Le décor (tout sauf les aiguilles et la barre) est dans un groupe qui glisse quand l'horloge monte ou descend.
import * as THREE from 'three';
import { C, R_PIVOT, R_MUR, R_MUR2, PLATEFORMES, SALLES_PF, BLOCS, R_BLOC, NIVEAUX, casesPlateforme, placeLevier, placePorte, placeSortie, sens } from './horloge.js';
import { sallesEtage1, portePf } from './horloge-n1.js';
import { creerAiguille } from './horloge-aiguilles.js';
import { R_SOL, BAS_SOL, SALLES_M1, porteM1, echelle, TOTEMS } from './horloge-m1.js';

/** profondeur du cadran */
export const FOND = -7;
const [CX, CZ] = [C[0] + 0.5, C[1] + 0.5];

const mat = (c) => new THREE.MeshBasicMaterial({ color: c });
/** un pavé de x0..x1, y0..y1, z0..z1 : dessus clair, côtés plus sombres, dessous très sombre */
function pave(x0, x1, y0, y1, z0, z1, dessus, cote) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  const c = new THREE.Color(cote), s = c.clone().multiplyScalar(0.75);
  return new THREE.Mesh(g, [mat(s), mat(s), mat(dessus), mat('#050405'), mat(c), mat(s)]);
}
/** un levier sur sa case : socle et manche de couleur */
function levier(x, z, couleur) {
  const G = new THREE.Group();
  G.add(pave(x + 0.2, x + 0.8, 0, 0.3, z + 0.25, z + 0.8, '#5a5048', '#3a342c'));
  G.add(pave(x + 0.44, x + 0.56, 0.25, 1.1, z + 0.46, z + 0.58, couleur, '#2a2020'));
  G.add(pave(x + 0.36, x + 0.64, 1.05, 1.25, z + 0.4, z + 0.64, couleur, '#2a2020'));
  return G;
}
/** hauteur du mur selon l'angle : haut au fond, bas devant (du côté de la caméra) */
const hautMur = (a) => { const devant = -Math.cos(a); return devant > 0.35 ? 0.6 : 2.4 + 4.2 * Math.max(0, -devant + 0.35); };

/** la couleur du manche d'un levier */
const COULEUR_LEVIER = { grande: '#c84a3a', fine: '#3a7ac8', petite: '#4aa84a' };
/** un encadrement de porte dans la face intérieure du mur, à l'angle a (radians, 0 = midi) */
function porteMur(a, r = R_MUR - 0.08, y = 0) {
  const P = new THREE.Group(); P.position.set(CX + Math.sin(a) * r, y, CZ - Math.cos(a) * r); P.rotation.y = -a;
  P.add(new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.5, 0.2).translate(0, 1.25, 0), mat('#a08040')));
  P.add(new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.2, 0.24).translate(0, 1.1, 0.02), mat('#3a2616')));
  P.add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.3).translate(0.5, 1.1, 0.04), mat('#e0c060')));
  return P;
}

/** la salle des aiguilles de l'étage n (0 : le quai, les blocs ; 1 : les îlots de la petite aiguille) */
export function creerHorloge(n = 0) {
  const G = new THREE.Group(), decor = new THREE.Group(); G.add(decor);
  const N0 = NIVEAUX[n];
  // le cadran, tout au fond : bronze sombre, couronne d'or, soixante traits
  const disque = new THREE.Mesh(new THREE.CircleGeometry(R_MUR, 64).rotateX(-Math.PI / 2), mat('#1c1712'));
  disque.position.set(CX, FOND, CZ); decor.add(disque);
  const couronne = new THREE.Mesh(new THREE.RingGeometry(R_MUR - 2.4, R_MUR - 1.6, 64).rotateX(-Math.PI / 2), mat('#7a5a22'));
  couronne.position.set(CX, FOND + 0.01, CZ); decor.add(couronne);
  for (let k = 0; k < 60; k++) {
    const a = (k * Math.PI) / 30, grand = k % 5 === 0, r = R_MUR - 3.4;
    const b = new THREE.Mesh(new THREE.PlaneGeometry(grand ? 0.5 : 0.18, grand ? 2 : 0.7).rotateX(-Math.PI / 2), mat(grand ? '#c8a050' : '#6a5030'));
    b.rotation.y = -a; b.position.set(CX + Math.sin(a) * r, FOND + 0.02, CZ - Math.cos(a) * r); decor.add(b);
  }
  // la barre du pivot : une colonne qui traverse tout, cerclée de bagues
  const barre = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 60, 24), [mat('#4a3c26'), mat('#8a7040'), mat('#2a2014')]);
  barre.position.set(CX, FOND - 10, CZ); G.add(barre);
  for (let y = -30; y < 30; y += 2.5) { const b = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.3, 24), mat('#a08850')); b.position.set(CX, y, CZ); G.add(b); }
  // le mécanisme central, à hauteur des aiguilles : un tambour de laiton autour de la barre, ses serrures et ses dents
  const moyeu = new THREE.Mesh(new THREE.CylinderGeometry(R_PIVOT - 0.2, R_PIVOT - 0.2, 0.9, 32), [mat('#6a5428'), mat('#b08c44'), mat('#3a2e18')]);
  moyeu.position.set(CX, -0.4, CZ); G.add(moyeu);
  const meca = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.2, 1.6, 8), [mat('#5a4a2a'), mat('#c8a050'), mat('#3a2e18')]);
  meca.position.set(CX, 0.8, CZ); G.add(meca);
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + Math.PI / 8, S = new THREE.Group();
    S.add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.12), mat('#e0c060')));
    const trou = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.4, 0.14), mat('#1a1208')); trou.position.z = 0.04; S.add(trou);
    S.position.set(CX + Math.sin(a) * 2.12, 0.85, CZ + Math.cos(a) * 2.12); S.rotation.y = a; G.add(S);
  }
  for (let k = 0; k < 16; k++) { const a = (k * Math.PI) / 8, d = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.5), mat('#9a7a3a')); d.position.set(CX + Math.sin(a) * 2.35, 1.5, CZ + Math.cos(a) * 2.35); d.rotation.y = a; G.add(d); }
  // les trois aiguilles, chacune dans son groupe qui tourne autour du pivot (la fine au-dessus, la petite en dessous)
  const aig = {};
  for (const [q, y] of [['petite', -0.12], ['grande', 0], ['fine', 0.06]]) { const A = creerAiguille(q); A.position.set(CX, y, CZ); G.add(A); aig[q] = A; }
  // le mur de la tour, épais : un anneau de blocs de R_MUR à R_MUR2 (les salles sont dans son épaisseur)
  const N = 96, ep = R_MUR2 - R_MUR, rm = (R_MUR + R_MUR2) / 2;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2, haut = hautMur(a);
    const g = new THREE.BoxGeometry(ep, haut, (Math.PI * 2 * R_MUR2) / N + 0.1); g.translate(0, haut / 2 - 0.6, 0);
    const clair = i % 2 ? '#5a5048' : '#625850';
    const bloc = new THREE.Mesh(g, [mat('#3a342e'), mat('#3a342e'), mat(clair), mat('#050405'), mat('#4a423a'), mat('#4a423a')]);
    bloc.position.set(CX + Math.sin(a) * rm, 0, CZ - Math.cos(a) * rm); bloc.rotation.y = Math.PI / 2 - a;
    decor.add(bloc);
    // un rang de pierres claires sur le dessus, au bord intérieur
    const r2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, (Math.PI * 2 * R_MUR) / N + 0.05), mat('#7a7064'));
    r2.position.set(CX + Math.sin(a) * (R_MUR + 0.4), haut - 0.54, CZ - Math.cos(a) * (R_MUR + 0.4)); r2.rotation.y = Math.PI / 2 - a; decor.add(r2);
  }
  // les portes des salles, dans la face intérieure du mur : encadrement de laiton, battant de bois sombre
  const portes = n === 0 ? SALLES_PF().map(placePorte) : n === -1 ? SALLES_M1.map(porteM1) : sallesEtage1().flatMap(({ s }) => [portePf(s.pfDe, 1), portePf(s.pfA, -1)]);
  for (const [x, z] of portes) decor.add(porteMur(Math.atan2(x + 0.5 - CX, -(z + 0.5 - CZ)), n === -1 ? R_SOL + 0.25 : undefined, n === -1 ? -BAS_SOL : 0));
  const totems = n === -1 ? TOTEMS.map((t, i) => { const T = totem(i); decor.add(T); return T; }) : [];
  if (n === -1) etageMoinsUn(decor, aig);
  // les plateformes : une dalle de pierre par case ; les îlots de l'étage 1 sur un pilier qui monte du fond
  for (const P of N0.plateformes) {
    for (const key of casesPlateforme(P.id)) {
      const [x, z] = key.split(',').map(Number), clair = (x + z) % 2 ? '#8c8270' : '#968c78';
      decor.add(pave(x, x + 1, -0.6, 0, z, z + 1, P.corniche || P.ilot ? (clair === '#8c8270' ? '#7c7464' : '#867c6a') : clair, '#4a4236'));
    }
    if (P.ilot) {
      const [dx, dy] = sens(P.k), rm = (P.r0 + P.r1) / 2, pil = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, -FOND - 0.6, 8), [mat('#4a4236'), mat('#5a5244'), mat('#2a241e')]);
      pil.position.set(CX + dx * rm, (FOND - 0.6) / 2, CZ + dy * rm); decor.add(pil);
    }
  }
  for (const L of N0.leviers) { const [x, z] = placeLevier(L); decor.add(levier(x, z, COULEUR_LEVIER[L.quoi] || '#8e8e9a')); }
  // la sortie et les portes : un seuil de laiton
  for (const [x, z] of [...(n === 0 ? [placeSortie()] : []), ...portes]) decor.add(pave(x + 0.05, x + 0.95, -0.6, 0.04, z + 0.05, z + 0.95, '#7a6a40', '#4a3e22'));
  // étage 0 : les deux blocs de pierre qui arrêtent les aiguilles, de gros piliers dressés depuis le fond, plus hauts que les aiguilles
  const blocs = (n === 0 ? BLOCS : []).map((h) => {
    const B = new THREE.Group(), [dx, dy] = sens(h), entier = new THREE.Group(); B.add(entier);
    B.position.set(CX + dx * R_BLOC, 0, CZ + dy * R_BLOC); B.rotation.y = -(h * Math.PI) / 6;
    entier.add(pave(-1.3, 1.3, FOND, 1.8, -1.6, 1.6, '#8a8276', '#5a544a'));
    entier.add(pave(-1.45, 1.45, 1.8, 2.3, -1.75, 1.75, '#9a9284', '#625a50'));
    for (const z of [-1.0, 0, 1.0]) entier.add(pave(-1.35, -1.25, -1, 1.6, z - 0.04, z + 0.04, '#4a443c', '#3a342c'));
    const eclats = [];
    for (let i = 0; i < 10; i++) { const e = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35 + (i % 3) * 0.12, 0), mat(i % 2 ? '#8a8276' : '#6a6458')); e.visible = false; e.userData.v = [Math.cos(i * 2.4) * 3, 4 + (i % 4), Math.sin(i * 2.4) * 3]; B.add(e); eclats.push(e); }
    decor.add(B); return { B, entier, eclats };
  });
  return { G, decor, aig, blocs, totems, n };
}

/** les couleurs des totems : pierre, peinture des visages */
const PIERRES = [['#8a7a62', '#5e5242'], ['#7a7468', '#524e46'], ['#8e7258', '#604c3a'], ['#6e7a6c', '#4a5248']];
const PEINTURES = ['#b8402e', '#2e6ab0', '#d8a030', '#3a8a4a', '#e8e0c8'];
/** un totem de pierre sur deux cases sur deux (son coin en 0, 0) : socle, trois têtes sculptées empilées, ailes au sommet */
function totem(i) {
  const T = new THREE.Group(), [clair, sombre] = PIERRES[i % PIERRES.length], y0 = -BAS_SOL;
  const p1 = PEINTURES[i % PEINTURES.length], p2 = PEINTURES[(i + 2) % PEINTURES.length];
  T.add(pave(0.08, 1.92, y0, y0 + 0.3, 0.08, 1.92, clair, sombre));
  const etages = [[0.3, 1.25, 0.2], [1.25, 2.2, 0.28], [2.2, 3.1, 0.36]];
  etages.forEach(([b, h, m], k) => {
    T.add(pave(m, 2 - m, y0 + b, y0 + h - 0.06, m, 2 - m, clair, sombre));
    T.add(pave(m - 0.05, 2 - m + 0.05, y0 + h - 0.08, y0 + h, m - 0.05, 2 - m + 0.05, k % 2 ? p1 : p2, sombre));
    // le visage, tourné vers le bas de l'écran : deux yeux peints, un nez, une bouche
    const z = 2 - m + 0.01, ym = y0 + (b + h) / 2, c = k % 2 ? p2 : p1;
    for (const x of [0.62, 1.38]) {
      T.add(pave(x - 0.2, x + 0.2, ym + 0.08, ym + 0.3, z - 0.02, z + 0.05, '#f0e8d0', '#e8e0c8'));
      T.add(pave(x - 0.08, x + 0.08, ym + 0.12, ym + 0.26, z + 0.04, z + 0.08, '#1a1410', '#1a1410'));
    }
    T.add(pave(0.9, 1.1, ym - 0.15, ym + 0.12, z - 0.02, z + 0.14, clair, sombre));
    T.add(pave(0.55, 1.45, ym - 0.36, ym - 0.22, z - 0.02, z + 0.06, c, c));
  });
  for (const s of [-1, 1]) T.add(pave(s < 0 ? -0.35 : 1.6, s < 0 ? 0.4 : 2.35, y0 + 2.55, y0 + 2.85, 0.75, 1.25, p1, sombre));
  T.add(pave(0.7, 1.3, y0 + 3.1, y0 + 3.45, 0.7, 1.3, p2, sombre));
  return T;
}

/** étage -1 : un sol de dalles sous les aiguilles, le pied du mur (plus épais) tout autour, et une échelle accrochée à
 *  chaque aiguille, du côté où elle tourne (horloge-m1.js) */
function etageMoinsUn(decor, aig) {
  const y = -BAS_SOL;
  for (let r = 0; r < R_SOL + 0.5; r += 1) {
    const g = new THREE.RingGeometry(Math.max(0.01, r), Math.min(R_SOL + 0.4, r + 1), 64, 1).rotateX(-Math.PI / 2);
    const me = new THREE.Mesh(g, mat(r % 2 ? '#6a6052' : '#726858')); me.position.set(CX, y, CZ); decor.add(me);
  }
  for (let k = 0; k < 48; k++) {
    const a = (k * Math.PI) / 24, joint = new THREE.Mesh(new THREE.PlaneGeometry(0.06, R_SOL - 3.5).rotateX(-Math.PI / 2), mat('#4a4238'));
    joint.position.set(CX + Math.sin(a) * (R_SOL + 3.5) / 2, y + 0.005, CZ - Math.cos(a) * (R_SOL + 3.5) / 2); joint.rotation.y = -a; decor.add(joint);
  }
  // le pied du mur : de R_SOL au mur de la tour, un anneau de pierre, bas du côté de la caméra
  const N = 96;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2, devant = -Math.cos(a), haut = devant > 0.35 ? 0.5 : 1.6, ep = R_MUR - R_SOL - 0.4, rm = R_SOL + 0.4 + ep / 2;
    const g = new THREE.BoxGeometry(ep, haut, (Math.PI * 2 * R_MUR) / N + 0.08); g.translate(0, y + haut / 2, 0);
    const b = new THREE.Mesh(g, [mat('#3e3830'), mat('#3e3830'), mat(i % 2 ? '#5e564a' : '#665e52'), mat('#050405'), mat('#4e463c'), mat('#4e463c')]);
    b.position.set(CX + Math.sin(a) * rm, 0, CZ - Math.cos(a) * rm); b.rotation.y = Math.PI / 2 - a; decor.add(b);
  }
  // les échelles : deux montants et des barreaux de bois, du sol au dessus de l'aiguille
  for (const q of ['grande', 'fine', 'petite']) {
    const { main, pied } = echelle(q, 0), dx = pied[0] - main[0], E = new THREE.Group(), bois = mat('#8a5a2a'), clair = mat('#b07a40');
    if (dx < 0) E.rotation.y = Math.PI;
    E.position.set(main[0] + 0.5 - CX + dx * 0.6, 0, main[1] + 0.5 - CZ);
    for (const z of [-0.3, 0.3]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, BAS_SOL + 0.3, 0.08), bois); rail.position.set(0.1, -BAS_SOL / 2 + 0.1, z); rail.rotation.z = -0.45; E.add(rail); }
    for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.66), clair); b.position.set(0.22 - k * 0.1, -BAS_SOL + 0.08 + k * 0.17, 0); E.add(b); }
    aig[q].add(E);
  }
}

/** l'horloge à l'état affiché D ({ grande, fine, petite } en heures, à virgule pendant que ça tourne ; blocs ; casse de 0 à 1
 *  pendant qu'ils se brisent ; envY : décalage du décor pendant que l'horloge monte ou descend) */
export function poserHorloge(H, D) {
  // les aiguilles ne sont qu'à l'étage où est l'horloge (pendant qu'elle monte ou descend, à celui qu'elle quitte)
  for (const q of ['grande', 'fine', 'petite']) { H.aig[q].rotation.y = -(D[q] * Math.PI) / 6; H.aig[q].visible = (D.vueNiv ?? D.niv ?? 0) === H.n; }
  H.decor.position.y = D.envY || 0;
  // les totems glissent jusqu'à leur case
  (H.totems || []).forEach((T, i) => {
    const t = (D.totems || TOTEMS)[i]; if (!t) return;
    if (!T.userData.pose) { T.position.set(t[0], 0, t[1]); T.userData.pose = true; return; }
    T.position.x += (t[0] - T.position.x) * 0.2; T.position.z += (t[1] - T.position.z) * 0.2;
  });
  const c = D.casse || 0;
  for (const { B, entier, eclats } of H.blocs) {
    B.visible = !!D.blocs;
    entier.visible = c < 0.25;
    for (const e of eclats) { e.visible = c >= 0.15 && c < 1; const [vx, vy, vz] = e.userData.v, t = c * 1.2; e.position.set(vx * t, 1 + vy * t - 9 * t * t, vz * t); e.rotation.set(t * 5, t * 3, 0); }
  }
}
