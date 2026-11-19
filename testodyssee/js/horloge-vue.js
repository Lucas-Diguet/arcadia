// testodyssee/js/horloge-vue.js — le dessin de la Tour de l'Horloge, niveau 0 (horloge.js) : tout est en volumes. Tout au
// fond, le cadran ; au centre, la barre du pivot qui traverse les étages, cerclée du mécanisme central ; les trois
// aiguilles (horloge-aiguilles.js) ; le mur de la tour, épais (les salles sont dedans), bas du côté de la caméra pour
// voir le quai, et ses portes ; les plateformes, les leviers, et les deux blocs de pierre qui arrêtent les aiguilles.
// Le décor (tout sauf les aiguilles et la barre) est dans un groupe qui glisse quand l'horloge monte ou descend.
import * as THREE from 'three';
import { C, R_PIVOT, R_MUR, R_MUR2, PLATEFORMES, LEVIERS, SALLES_PF, BLOCS, R_BLOC, casesPlateforme, placeLevier, placePorte, placeSortie, sens } from './horloge.js';
import { creerAiguille } from './horloge-aiguilles.js';

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

export function creerHorloge() {
  const G = new THREE.Group(), decor = new THREE.Group(); G.add(decor);
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
  for (const S of SALLES_PF()) {
    const k = PLATEFORMES.find((p) => p.id === S.pf).k, a = (k * Math.PI) / 6, r = R_MUR - 0.08;
    const P = new THREE.Group(); P.position.set(CX + Math.sin(a) * r, 0, CZ - Math.cos(a) * r); P.rotation.y = -a;
    P.add(new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.5, 0.2).translate(0, 1.25, 0), mat('#a08040')));
    P.add(new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.2, 0.24).translate(0, 1.1, 0.02), mat('#3a2616')));
    P.add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.3).translate(0.5, 1.1, 0.04), mat('#e0c060')));
    decor.add(P);
  }
  // les plateformes : une dalle de pierre par case
  for (const P of PLATEFORMES) for (const key of casesPlateforme(P.id)) {
    const [x, z] = key.split(',').map(Number), clair = (x + z) % 2 ? '#8c8270' : '#968c78';
    decor.add(pave(x, x + 1, -0.6, 0, z, z + 1, P.corniche ? (clair === '#8c8270' ? '#7c7464' : '#867c6a') : clair, '#4a4236'));
  }
  for (const L of LEVIERS) { const [x, z] = placeLevier(L); decor.add(levier(x, z, L.quoi === 'grande' ? '#c84a3a' : '#3a7ac8')); }
  // la sortie et les portes : un seuil de laiton
  for (const [x, z] of [placeSortie(), ...SALLES_PF().map(placePorte)]) decor.add(pave(x + 0.05, x + 0.95, -0.6, 0.04, z + 0.05, z + 0.95, '#7a6a40', '#4a3e22'));
  // les deux blocs de pierre qui arrêtent les aiguilles : de gros piliers dressés depuis le fond, plus hauts que les aiguilles
  const blocs = BLOCS.map((h) => {
    const B = new THREE.Group(), [dx, dy] = sens(h), entier = new THREE.Group(); B.add(entier);
    B.position.set(CX + dx * R_BLOC, 0, CZ + dy * R_BLOC); B.rotation.y = -(h * Math.PI) / 6;
    entier.add(pave(-1.3, 1.3, FOND, 1.8, -1.6, 1.6, '#8a8276', '#5a544a'));
    entier.add(pave(-1.45, 1.45, 1.8, 2.3, -1.75, 1.75, '#9a9284', '#625a50'));
    for (const z of [-1.0, 0, 1.0]) entier.add(pave(-1.35, -1.25, -1, 1.6, z - 0.04, z + 0.04, '#4a443c', '#3a342c'));
    const eclats = [];
    for (let i = 0; i < 10; i++) { const e = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35 + (i % 3) * 0.12, 0), mat(i % 2 ? '#8a8276' : '#6a6458')); e.visible = false; e.userData.v = [Math.cos(i * 2.4) * 3, 4 + (i % 4), Math.sin(i * 2.4) * 3]; B.add(e); eclats.push(e); }
    decor.add(B); return { B, entier, eclats };
  });
  return { G, decor, aig, blocs };
}

/** l'horloge à l'état affiché D ({ grande, fine, petite } en heures, à virgule pendant que ça tourne ; blocs ; casse de 0 à 1
 *  pendant qu'ils se brisent ; envY : décalage du décor pendant que l'horloge monte ou descend) */
export function poserHorloge(H, D) {
  for (const q of ['grande', 'fine', 'petite']) H.aig[q].rotation.y = -(D[q] * Math.PI) / 6;
  H.decor.position.y = D.envY || 0;
  const c = D.casse || 0;
  for (const { B, entier, eclats } of H.blocs) {
    B.visible = !!D.blocs;
    entier.visible = c < 0.25;
    for (const e of eclats) { e.visible = c >= 0.15 && c < 1; const [vx, vy, vz] = e.userData.v, t = c * 1.2; e.position.set(vx * t, 1 + vy * t - 9 * t * t, vz * t); e.rotation.set(t * 5, t * 3, 0); }
  }
}
