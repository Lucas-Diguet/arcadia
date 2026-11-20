// testodyssee/js/horloge2-vue.js — le dessin de l'étage 2 de la Tour de l'Horloge (horloge-n2.js), en volumes : cinq
// cadrans au fond du vide, chacun avec sa barre de pivot et son aiguille de couleur (la même que son levier), les trois
// plateformes de pierre, les leviers, les monte-charges et le grand levier de l'arrivée.
import * as THREE from 'three';
import { HORLOGES2, PLATEFORMES2, LEVIERS2, LEVIER_PONT, MONTE, L_AIG } from './horloge-n2.js';

const mat = (c) => new THREE.MeshBasicMaterial({ color: c });
/** la couleur de chaque horloge (aiguille, bague du pivot, manche de son levier) */
export const COULEURS2 = ['#c84a3a', '#3a7ac8', '#4aa84a', '#c8a030', '#9a5ac8'];
export const NOMS_COULEURS2 = ['rouge', 'bleu', 'vert', 'jaune', 'violet'];
function pave(x0, x1, y0, y1, z0, z1, dessus, cote) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  const c = new THREE.Color(cote), s = c.clone().multiplyScalar(0.75);
  return new THREE.Mesh(g, [mat(s), mat(s), mat(dessus), mat('#050405'), mat(c), mat(s)]);
}
function levier(x, z, couleur, grand = false) {
  const G = new THREE.Group(), k = grand ? 1.4 : 1;
  G.add(pave(x + 0.2, x + 0.8, 0, 0.3, z + 0.25, z + 0.8, '#5a5048', '#3a342c'));
  G.add(pave(x + 0.44, x + 0.56, 0.25, 1.1 * k, z + 0.46, z + 0.58, couleur, '#2a2020'));
  G.add(pave(x + 0.36, x + 0.64, 1.05 * k, 1.25 * k, z + 0.4, z + 0.64, couleur, '#2a2020'));
  return G;
}
/** une aiguille, pointée vers -z (midi), posée à y = 0 : une poutre de laiton liserée de sa couleur, pointe en losange */
function aiguille(couleur) {
  const A = new THREE.Group(), L = L_AIG + 0.4;
  A.add(pave(-0.62, 0.62, -0.35, 0, -L, -1.3, '#b08c44', '#6a5428'));
  A.add(pave(-0.4, 0.4, -0.34, 0.02, -L + 0.2, -1.4, couleur, '#2a2020'));
  const pointe = new THREE.Mesh(new THREE.CylinderGeometry(0, 0.7, 0.36, 4), mat(couleur)); pointe.rotation.x = -Math.PI / 2; pointe.rotation.y = Math.PI / 4;
  pointe.position.set(0, -0.17, -L - 0.2); A.add(pointe);
  // le contrepoids, de l'autre côté du pivot
  const cp = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.3, 16), mat('#6a5428')); cp.position.set(0, -0.2, 1.8); A.add(cp);
  return A;
}
export function creerHorloge2() {
  const G = new THREE.Group(), aig = [];
  HORLOGES2.forEach((q, i) => {
    const cx = q.c[0] + 0.5, cz = q.c[1] + 0.5;
    // le cadran, loin au fond, ses douze traits, et la barre du pivot qui en monte
    const fond = new THREE.Mesh(new THREE.CircleGeometry(L_AIG + 0.8, 48).rotateX(-Math.PI / 2), mat('#241c14')); fond.position.set(cx, -6, cz); G.add(fond);
    const cour = new THREE.Mesh(new THREE.RingGeometry(L_AIG + 0.3, L_AIG + 0.8, 48).rotateX(-Math.PI / 2), mat('#7a5a22')); cour.position.set(cx, -5.98, cz); G.add(cour);
    for (let k = 0; k < 12; k++) { const a = (k * Math.PI) / 6, b = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.9).rotateX(-Math.PI / 2), mat('#c8a050')); b.rotation.y = -a; b.position.set(cx + Math.sin(a) * L_AIG, -5.96, cz - Math.cos(a) * L_AIG); G.add(b); }
    const barre = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 6.4, 16), [mat('#4a3c26'), mat('#8a7040'), mat('#2a2014')]); barre.position.set(cx, -3, cz); G.add(barre);
    const bague = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.3, 16), mat(COULEURS2[i])); bague.position.set(cx, 0.05, cz); G.add(bague);
    const A = aiguille(COULEURS2[i]); A.position.set(cx, 0, cz); G.add(A); aig.push(A);
  });
  for (const id in PLATEFORMES2) {
    const [x0, y0, x1, y1] = PLATEFORMES2[id].r;
    for (let z = y0; z <= y1; z++) for (let x = x0; x <= x1; x++) G.add(pave(x, x + 1, -0.6, 0, z, z + 1, (x + z) % 2 ? '#8c8270' : '#968c78', '#4a4236'));
    const pil = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 - 1, 8, y1 - y0 - 1), mat('#3a342c')); pil.position.set((x0 + x1 + 1) / 2, -4.6, (y0 + y1 + 1) / 2); G.add(pil);
  }
  for (const L of LEVIERS2) G.add(levier(L.place[0], L.place[1], COULEURS2[L.k - 1]));
  G.add(levier(LEVIER_PONT[0], LEVIER_PONT[1], '#e0c060', true));
  // les monte-charges : une plate-forme de fer dans un cadre de poutres
  for (const [x, z] of Object.values(MONTE)) {
    G.add(pave(x + 0.05, x + 0.95, 0, 0.12, z + 0.05, z + 0.95, '#6a6a76', '#3a3a44'));
    for (const [a, b] of [[0.05, 0.05], [0.85, 0.05], [0.05, 0.85], [0.85, 0.85]]) G.add(pave(x + a, x + a + 0.1, 0, 2.4, z + b, z + b + 0.1, '#5a4a2a', '#3a2e18'));
    G.add(pave(x + 0.05, x + 0.95, 2.3, 2.45, z + 0.05, z + 0.95, '#7a6a40', '#4a3e22'));
  }
  return { G, aig };
}
/** les aiguilles à l'heure affichée (à virgule pendant qu'elles tournent) */
export function poserHorloge2(V, heures) { V.aig.forEach((A, i) => { A.rotation.y = -(heures[i] * Math.PI) / 6; }); }
