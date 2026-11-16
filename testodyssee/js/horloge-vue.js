// testodyssee/js/horloge-vue.js — le dessin de la Salle de l'Horloge (horloge.js) : tout est en volumes, posé dans le
// vide. Tout au fond, le cadran (chiffres, couronne) ; au centre, la vis qui monte du cadran jusqu'au pivot ; le pivot
// et ses deux aiguilles à la hauteur de la vis ; les plateformes flottantes à leur hauteur, les leviers, le coffre.
// Le sol et les murs ordinaires de la carte sont cachés (ne restent que les volumes).
import * as THREE from 'three';
import { C, R_GRANDE, R_PETITE, R_PIVOT, PLATEFORMES, LEVIERS, COFFRE, casesPlateforme, placeLevier, milieu } from './horloge.js';

/** hauteur d'un niveau (unités du monde), profondeur du cadran */
export const ETAGE = 1.25, FOND = -6;
const [CX, CZ] = [C[0] + 0.5, C[1] + 0.5];

const mat = (c) => new THREE.MeshBasicMaterial({ color: c });
/** un pavé de x0..x1, y0..y1, z0..z1 : dessus clair, côtés plus sombres, dessous très sombre */
function pave(x0, x1, y0, y1, z0, z1, dessus, cote) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  const c = new THREE.Color(cote), s = c.clone().multiplyScalar(0.75);
  return new THREE.Mesh(g, [mat(s), mat(s), mat(dessus), mat('#050405'), mat(c), mat(s)]);
}

export function creerHorloge() {
  const G = new THREE.Group();
  // le cadran, tout au fond : un disque de bronze sombre, la couronne d'or, les douze chiffres (des barres)
  const disque = new THREE.Mesh(new THREE.CircleGeometry(R_GRANDE + 3, 64).rotateX(-Math.PI / 2), mat('#1c1712'));
  disque.position.set(CX, FOND, CZ); G.add(disque);
  const couronne = new THREE.Mesh(new THREE.RingGeometry(R_GRANDE + 2.2, R_GRANDE + 3, 64).rotateX(-Math.PI / 2), mat('#7a5a22'));
  couronne.position.set(CX, FOND + 0.01, CZ); G.add(couronne);
  for (let k = 0; k < 60; k++) {
    const a = (k * Math.PI) / 30, grand = k % 5 === 0, r = R_GRANDE + 1.2;
    const b = new THREE.Mesh(new THREE.PlaneGeometry(grand ? 0.5 : 0.18, grand ? 2 : 0.7).rotateX(-Math.PI / 2), mat(grand ? '#c8a050' : '#6a5030'));
    b.rotation.y = -a; b.position.set(CX + Math.sin(a) * r, FOND + 0.02, CZ - Math.cos(a) * r); G.add(b);
  }
  // la vis : une colonne filetée du cadran au pivot (sa hauteur suit le niveau des aiguilles)
  const vis = new THREE.Group();
  for (let i = 0; i < 24; i++) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.5, 16), mat(i % 2 ? '#5a4a30' : '#8a7040'));
    t.position.y = i * 0.5 + 0.25; vis.add(t);
  }
  vis.position.set(CX, FOND, CZ); G.add(vis);
  // le pivot et les aiguilles : un groupe à la hauteur de la vis
  const haut = new THREE.Group(); G.add(haut);
  const pivot = new THREE.Mesh(new THREE.CylinderGeometry(R_PIVOT + 0.3, R_PIVOT + 0.3, 0.45, 32), [mat('#6a5428'), mat('#b08c44'), mat('#3a2e18')]);
  pivot.position.set(CX, -0.225, CZ); haut.add(pivot);
  const engrenage = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.9, 10), [mat('#9a7a3a'), mat('#e0c070'), mat('#4a3a1a')]);
  engrenage.position.set(CX, 0.45, CZ); haut.add(engrenage);
  const aiguille = (long, larg, haute, couleur, pointe) => {
    const A = new THREE.Group();
    const corps = pave(-larg / 2, larg / 2, -0.32, 0, -long + pointe, -R_PIVOT + 0.2, couleur, '#1a1a20'); A.add(corps);
    // la pointe : un triangle plat
    const s = new THREE.Shape(); s.moveTo(-larg / 2 - 0.4, 0); s.lineTo(larg / 2 + 0.4, 0); s.lineTo(0, pointe + 0.6); s.lineTo(-larg / 2 - 0.4, 0);
    const p = new THREE.Mesh(new THREE.ShapeGeometry(s).rotateX(-Math.PI / 2), mat(couleur)); p.position.set(0, 0.001, -long + pointe); A.add(p);
    // un filet d'or tout du long
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.16, long - R_PIVOT - pointe).rotateX(-Math.PI / 2), mat(haute));
    f.position.set(0, 0.003, -(long + R_PIVOT - pointe) / 2); A.add(f);
    A.position.set(CX, 0, CZ); haut.add(A);
    return A;
  };
  const grande = aiguille(R_GRANDE + 0.5, 1.9, '#d8b060', '#3a3a46', 1.2), petite = aiguille(R_PETITE + 0.5, 2.1, '#d8b060', '#4a3228', 1.2);
  // les plateformes flottantes : une dalle de pierre par case, à leur hauteur
  for (const P of PLATEFORMES) {
    const y = P.n * ETAGE;
    for (const k of casesPlateforme(P.id)) {
      const [x, z] = k.split(',').map(Number), clair = (x + z) % 2 ? '#8c8270' : '#968c78';
      G.add(pave(x, x + 1, y - 0.6, y, z, z + 1, clair, '#4a4236'));
    }
  }
  // les leviers et le coffre (la vis du pivot a son engrenage)
  for (const L of LEVIERS) {
    if (L.quoi === 'vis') continue;
    const [x, z] = placeLevier(L), P = L.pf ? PLATEFORMES.find((q) => q.id === L.pf) : PLATEFORMES[0], y = P.n * ETAGE;
    G.add(pave(x + 0.25, x + 0.75, y, y + 0.35, z + 0.3, z + 0.8, '#5a5048', '#3a342c'));
    const manche = pave(x + 0.44, x + 0.56, y + 0.3, y + 1.1, z + 0.5, z + 0.62, L.quoi === 'grande' ? '#c84a3a' : '#3a7ac8', '#2a2020');
    manche.userData.levier = L.quoi; G.add(manche);
  }
  { const [x, z] = milieu(COFFRE.pf), y = PLATEFORMES.find((q) => q.id === COFFRE.pf).n * ETAGE;
    G.add(pave(x + 0.1, x + 0.9, y, y + 0.6, z + 0.2, z + 0.85, '#d8b048', '#8a5a22')); }
  return { G, haut, vis, grande, petite };
}

/** l'horloge à l'état affiché D ({ grande, petite } en heures, niv en niveaux, des nombres à virgule pendant que ça tourne) */
export function poserHorloge(H, D) {
  H.haut.position.y = D.niv * ETAGE;
  H.vis.scale.y = Math.max(0.05, (D.niv * ETAGE - FOND) / 12);
  H.grande.rotation.y = -(D.grande * Math.PI) / 6;
  H.petite.rotation.y = -(D.petite * Math.PI) / 6;
}
