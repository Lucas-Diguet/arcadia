// testodyssee/js/horloge-vue.js — le dessin de la Tour de l'Horloge, niveau 0 (horloge.js) : tout est en volumes. Tout au
// fond, le cadran ; au centre, la barre du pivot qui monte et descend à travers les étages ; les trois aiguilles
// (horloge-aiguilles.js) ; le mur rond de la tour (bas du côté de la caméra, pour voir le quai), ses portes ; les
// plateformes, les leviers, la clé et le mécanisme central. Le sol et les murs ordinaires de la carte sont cachés.
import * as THREE from 'three';
import { C, R_PIVOT, R_MUR, PLATEFORMES, LEVIERS, SALLES, casesPlateforme, placeLevier, placeCle, placeMecanisme, placePorte, placeSortie, sens } from './horloge.js';
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

export function creerHorloge() {
  const G = new THREE.Group();
  // le cadran, tout au fond : bronze sombre, couronne d'or, soixante traits
  const disque = new THREE.Mesh(new THREE.CircleGeometry(R_MUR, 64).rotateX(-Math.PI / 2), mat('#1c1712'));
  disque.position.set(CX, FOND, CZ); G.add(disque);
  const couronne = new THREE.Mesh(new THREE.RingGeometry(R_MUR - 2.4, R_MUR - 1.6, 64).rotateX(-Math.PI / 2), mat('#7a5a22'));
  couronne.position.set(CX, FOND + 0.01, CZ); G.add(couronne);
  for (let k = 0; k < 60; k++) {
    const a = (k * Math.PI) / 30, grand = k % 5 === 0, r = R_MUR - 3.4;
    const b = new THREE.Mesh(new THREE.PlaneGeometry(grand ? 0.5 : 0.18, grand ? 2 : 0.7).rotateX(-Math.PI / 2), mat(grand ? '#c8a050' : '#6a5030'));
    b.rotation.y = -a; b.position.set(CX + Math.sin(a) * r, FOND + 0.02, CZ - Math.cos(a) * r); G.add(b);
  }
  // la barre du pivot : une colonne qui traverse tout, cerclée de bagues, avec son moyeu au niveau des aiguilles
  const barre = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 30, 24), [mat('#4a3c26'), mat('#8a7040'), mat('#2a2014')]);
  barre.position.set(CX, FOND + 15, CZ); G.add(barre);
  for (let y = FOND + 1; y < 16; y += 2.5) { const b = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.3, 24), mat('#a08850')); b.position.set(CX, y, CZ); G.add(b); }
  const moyeu = new THREE.Mesh(new THREE.CylinderGeometry(R_PIVOT - 0.2, R_PIVOT - 0.2, 0.7, 32), [mat('#6a5428'), mat('#b08c44'), mat('#3a2e18')]);
  moyeu.position.set(CX, -0.45, CZ); G.add(moyeu);
  // les trois aiguilles, chacune dans son groupe qui tourne autour du pivot (la fine au-dessus, la petite en dessous)
  const aig = {};
  for (const [q, y] of [['petite', -0.12], ['grande', 0], ['fine', 0.06]]) {
    const A = creerAiguille(q); A.position.set(CX, y, CZ); G.add(A); aig[q] = A;
  }
  // le mur de la tour : un anneau de blocs, haut au fond, bas du côté de la caméra ; une porte au fond des salles
  const N = 72;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2, devant = -Math.cos(a);   // -1 au fond (midi), 1 devant (six heures)
    const haut = devant > 0.35 ? 0.6 : 2.2 + 3.4 * Math.max(0, -devant + 0.35);
    const g = new THREE.BoxGeometry(2.6, haut, (Math.PI * 2 * (R_MUR + 1.2)) / N + 0.08); g.translate(0, haut / 2 - 0.6, 0);
    const clair = i % 2 ? '#5a5048' : '#625850';
    const bloc = new THREE.Mesh(g, [mat('#3a342e'), mat('#3a342e'), mat(clair), mat('#050405'), mat('#4a423a'), mat('#4a423a')]);
    bloc.position.set(CX + Math.sin(a) * (R_MUR + 1.2), 0, CZ - Math.cos(a) * (R_MUR + 1.2)); bloc.rotation.y = -a;
    G.add(bloc);
  }
  // les portes des salles, dans la face intérieure du mur : encadrement de laiton, battant de bois sombre
  for (const S of SALLES) {
    const k = PLATEFORMES.find((p) => p.id === S.pf).k, a = (k * Math.PI) / 6, r = R_MUR - 0.08;
    const P = new THREE.Group(); P.position.set(CX + Math.sin(a) * r, 0, CZ - Math.cos(a) * r); P.rotation.y = -a;
    P.add(new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.5, 0.2).translate(0, 1.25, 0), mat('#a08040')));
    P.add(new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.2, 0.24).translate(0, 1.1, 0.02), mat('#3a2616')));
    P.add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.3).translate(0.5, 1.1, 0.04), mat('#e0c060')));
    G.add(P);
  }
  // les plateformes : une dalle de pierre par case, et la frise de laiton au bord
  for (const P of PLATEFORMES) {
    for (const key of casesPlateforme(P.id)) {
      const [x, z] = key.split(',').map(Number), clair = (x + z) % 2 ? '#8c8270' : '#968c78';
      G.add(pave(x, x + 1, -0.6, 0, z, z + 1, P.corniche ? (clair === '#8c8270' ? '#7c7464' : '#867c6a') : clair, '#4a4236'));
    }
  }
  for (const L of LEVIERS) { const [x, z] = placeLevier(L); G.add(levier(x, z, L.quoi === 'grande' ? '#c84a3a' : '#3a7ac8')); }
  // le mécanisme central : un bâti de fer, une serrure, une manivelle
  { const [x, z] = placeMecanisme();
    G.add(pave(x + 0.1, x + 0.9, 0, 0.75, z + 0.15, z + 0.9, '#5a5a62', '#34343a'));
    G.add(pave(x + 0.4, x + 0.6, 0.75, 1.05, z + 0.4, z + 0.6, '#d8b048', '#8a6a22'));
    G.add(pave(x + 0.15, x + 0.85, 1.0, 1.1, z + 0.45, z + 0.55, '#8a8a92', '#4a4a52')); }
  // la clé : accrochée sur un petit pupitre (elle disparaît quand on l'a prise)
  const cle = new THREE.Group();
  { const [x, z] = placeCle();
    G.add(pave(x + 0.2, x + 0.8, 0, 0.7, z + 0.25, z + 0.8, '#6a5a48', '#3a3028'));
    cle.add(pave(x + 0.45, x + 0.55, 0.7, 1.2, z + 0.48, z + 0.56, '#e0c060', '#8a6a22'));
    const anneau = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 6, 16), mat('#e0c060')); anneau.position.set(x + 0.5, 1.32, z + 0.52); cle.add(anneau);
    G.add(cle); }
  // les marches devant la sortie et les portes, du côté du vide (un seuil de laiton)
  for (const [x, z] of [placeSortie(), ...SALLES.map(placePorte)]) G.add(pave(x + 0.05, x + 0.95, -0.6, 0.04, z + 0.05, z + 0.95, '#7a6a40', '#4a3e22'));
  return { G, aig, cle };
}

/** l'horloge à l'état affiché D ({ grande, fine, petite } en heures, des nombres à virgule pendant que ça tourne) */
export function poserHorloge(H, D) {
  for (const q of ['grande', 'fine', 'petite']) H.aig[q].rotation.y = -(D[q] * Math.PI) / 6;
  H.cle.visible = !D.cle;
}
export { sens };
