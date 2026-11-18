// testodyssee/js/horloge-aiguilles.js — les trois aiguilles de la Salle de l'Horloge, en volumes plats (on marche dessus) :
// la grande et large (acier noirci, liseré d'or, rivets, pointe en fer de lance ajourée, contrepoids en anneau),
// la grande et fine (acier bleui, comme une trotteuse : longue tige, flèche, contrepoids en raquette),
// la petite et large (bronze, ajourée d'une grande « pomme » ronde près de la pointe, façon Breguet).
// Chaque aiguille est un groupe centré sur le pivot, pointée vers -z (midi), posée à y = 0 (dessus).
// Un profil = des points [r, demi-largeur] le long de l'aiguille (r < 0 : la queue, derrière le pivot).
import * as THREE from 'three';

const mat = (c) => new THREE.MeshBasicMaterial({ color: c });
const sombre = (c, k) => '#' + new THREE.Color(c).multiplyScalar(k).getHexString();

/** contour fermé d'un profil [r, l] (symétrique), élargi de e */
function contour(profil, e = 0) {
  const s = new THREE.Shape(), pts = profil.map(([r, l]) => [r, l > 0 ? l + e : 0]);
  const r0 = pts[0][0] - (pts[0][1] ? e : 0), r1 = pts[pts.length - 1][0] + e;
  s.moveTo(0 + 0, -r0);
  for (const [r, l] of pts) s.lineTo(l, -r);
  s.lineTo(0, -r1);
  for (const [r, l] of [...pts].reverse()) s.lineTo(-l, -r);
  s.lineTo(0, -r0);
  return s;
}
/** un trou rond ou en losange dans une forme */
const trouRond = (r, rayon) => { const h = new THREE.Path(); h.absarc(0, -r, rayon, 0, Math.PI * 2, true); return h; };
const trouLosange = (r, l, h) => { const p = new THREE.Path(); p.moveTo(0, -(r - h)); p.lineTo(l, -r); p.lineTo(0, -(r + h)); p.lineTo(-l, -r); p.lineTo(0, -(r - h)); return p; };

/** extrusion d'une forme couchée à plat : dessus à y = haut, épaisseur ep */
function plaque(forme, haut, ep, dessus, cote) {
  const g = new THREE.ExtrudeGeometry(forme, { depth: ep, bevelEnabled: false, curveSegments: 24 });
  g.rotateX(Math.PI / 2); g.translate(0, haut, 0);
  return new THREE.Mesh(g, [mat(dessus), mat(cote)]);
}
/** anneau plat (contrepoids, pomme) */
function anneau(r, rext, rint, haut, ep, dessus, cote) {
  const s = new THREE.Shape(); s.absarc(0, -r, rext, 0, Math.PI * 2, false); s.holes.push(trouRond(r, rint));
  return plaque(s, haut, ep, dessus, cote);
}
const clou = (x, z, y, c) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 8), mat(c)); m.position.set(x, y + 0.03, z); return m; };

export const AIGUILLES = {
  /** grande et large : la passerelle principale */
  grande: { long: 18.5, coul: '#2e2e38', bord: '#d8b060' },
  /** grande et fine : une tige où l'on avance en équilibre */
  fine: { long: 19.5, coul: '#2a4c94', bord: '#9ec0f0' },
  /** petite et large, ajourée : son anneau sert à autre chose */
  petite: { long: 12.5, coul: '#6a4426', bord: '#e0b060' },
};

export function creerAiguille(type) {
  const A = new THREE.Group(), o = AIGUILLES[type], ep = 0.32, y = 0;
  if (type === 'grande') {
    const prof = [[-1.6, 0.55], [0, 1.0], [14.6, 0.95], [15.2, 0.55], [16.0, 1.55], [16.9, 1.25], [17.6, 0.6], [o.long, 0]];
    const f = contour(prof); f.holes.push(trouLosange(16.25, 0.55, 0.55));
    const b = contour(prof, 0.18); b.holes.push(trouLosange(16.25, 0.55, 0.55));
    A.add(plaque(b, y - 0.06, ep, o.bord, sombre(o.bord, 0.55)));
    A.add(plaque(f, y, ep, o.coul, sombre(o.coul, 0.6)));
    // tôles de la passerelle : joints clairs et rivets d'or le long des bords
    for (let r = 2.5; r < 14.5; r += 2) { const j = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.06).rotateX(-Math.PI / 2), mat('#4a4a58')); j.position.set(0, y + 0.002, -r); A.add(j); }
    for (let r = 2.0; r < 14.5; r += 1) for (const s of [-1, 1]) A.add(clou(s * 0.78, -r, y, o.bord));
    // filet d'or au milieu de la pointe et contrepoids en anneau
    A.add(anneau(-2.6, 1.15, 0.55, y, ep, o.bord, sombre(o.bord, 0.55)));
    A.add(anneau(-2.6, 0.9, 0.62, y + 0.01, ep, o.coul, sombre(o.coul, 0.6)));
  } else if (type === 'fine') {
    const prof = [[-2.2, 0.16], [0, 0.26], [16, 0.17], [17.6, 0.14], [17.8, 0.55], [o.long, 0]];
    A.add(plaque(contour(prof, 0.06), y - 0.04, 0.2, o.bord, sombre(o.bord, 0.5)));
    A.add(plaque(contour(prof), y, 0.2, o.coul, sombre(o.coul, 0.55)));
    // la raquette du contrepoids et un petit losange à mi-longueur
    A.add(anneau(-3.0, 0.95, 0.55, y, 0.2, o.bord, sombre(o.bord, 0.5)));
    A.add(anneau(-3.0, 0.82, 0.62, y + 0.01, 0.2, o.coul, sombre(o.coul, 0.55)));
    const l = new THREE.Shape(); l.moveTo(0, -9.2); l.lineTo(0.42, -10); l.lineTo(0, -10.8); l.lineTo(-0.42, -10); l.lineTo(0, -9.2);
    A.add(plaque(l, y + 0.01, 0.2, o.bord, sombre(o.bord, 0.5)));
  } else {
    const prof = [[-1.2, 0.7], [0, 1.1], [7.4, 1.05], [8.2, 0.9], [11.6, 0.9], [o.long, 0]];
    const pomme = 9.6, f = contour(prof), b = contour(prof, 0.18);
    A.add(plaque(b, y - 0.06, ep, o.bord, sombre(o.bord, 0.55)));
    A.add(plaque(f, y, ep, o.coul, sombre(o.coul, 0.6)));
    // la pomme : un grand anneau ajouré, à cheval sur l'aiguille
    A.add(anneau(pomme, 2.1, 1.25, y - 0.06, ep, o.bord, sombre(o.bord, 0.55)));
    A.add(anneau(pomme, 1.9, 1.4, y + 0.01, ep, o.coul, sombre(o.coul, 0.6)));
    // le trou de la pomme : on voit le vide à travers (disque noir juste sous l'aiguille)
    const vide = new THREE.Mesh(new THREE.CircleGeometry(1.42, 32).rotateX(-Math.PI / 2), mat('#050405')); vide.position.set(0, y + 0.02, -pomme); A.add(vide);
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; A.add(clou(Math.cos(a) * 1.65, -pomme + Math.sin(a) * 1.65, y + 0.01, o.bord)); }
    for (let r = 1.8; r < 7.5; r += 1.2) for (const s of [-1, 1]) A.add(clou(s * 0.8, -r, y, o.bord));
  }
  return A;
}
