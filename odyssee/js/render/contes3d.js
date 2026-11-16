// odyssee/js/render/contes3d.js — bâtiments du Bois des Contes (labo) en fausse 3D, même atelier que batiments3d.js
// (PixelForge : volumes simples, textures pixel art à D px par unité, éclairage en paliers). Trois modèles :
//   painEpice  (27 × 8) : le manoir de la vieille dame — trois étages, deux ailes, un avant-corps à pignon et balcon ;
//                         murs de pain d'épice à joints de sucre glace, toits de
//                         chocolat ourlés de glaçage qui coule, boules de gomme, cheminées, fenêtres en sucre filé,
//                         porte en tablettes de chocolat, sucres d'orge, sucettes et bonbons devant ;
//   puitsJardin (2 × 2) : puits de pierre moussue, toit de bardeaux, treuil, seau, pots de fleurs ;
//   cabaneOutils (3 × 3) : cabane de planches au toit de bardeaux, porte entrouverte, outils appuyés, brouette, arrosoir.
// Coordonnées comme les autres modèles : x de 0 à w, z de 0 à d (façade sud en z = d), y vers le haut.
import * as THREE from 'three';

export function batimentsContes({ B, TX, tex, hash, mix, S, D, boite, at, M, COL, LUM, cyl, toit2, porte, fenetre2, reperePorte }) {
  /* ---------------------------------------------------------------- textures */
  const PAIN = '#b4682e', CHOCO = '#5a3420', GLACE = '#fbf8ff';
  // pain d'épice : grain, éclats d'amande, joints de sucre glace tous les 16 px (des plaques de biscuit)
  const painEpice = () => tex('painEpice', D, D, (g, px, w, h) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = hash(x, y, 31); let c = u < 0.08 ? mix(PAIN, -0.18) : u > 0.95 ? mix(PAIN, 0.22) : PAIN;
      if (hash(x >> 1, y >> 1, 32) > 0.985) c = '#f0dcb0';
      if (x % (16 * S) < S || y % (16 * S) < S) c = GLACE; else if (x % (16 * S) < 2 * S || y % (16 * S) < 2 * S) c = mix(PAIN, -0.25);
      px(x, y, c);
    }
  });
  // tuiles de chocolat : carrés à bord clair, un ton par carré
  const chocolat = () => tex('chocolat', D, D, (g, px, w, h) => {
    const t = 16 * S;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const lx = x % t, ly = y % t, id = hash(Math.floor(x / t), Math.floor(y / t), 33);
      let f = id < 0.3 ? -0.08 : id > 0.75 ? 0.08 : 0;
      if (lx < 2 * S || ly < 2 * S) f = 0.28; else if (lx >= t - 2 * S || ly >= t - 2 * S) f = -0.38; else if (lx > t / 2 - S && lx < t / 2 + S && ly > 3 * S && ly < t - 3 * S) f -= 0.1;
      px(x, y, mix(CHOCO, f));
    }
  });
  // sucre d'orge : rayures obliques rouge et blanc
  const sucreOrge = () => tex('sucreOrge', D, D, (g, px, w, h) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px(x, y, Math.floor((x + y) / (8 * S)) % 2 ? '#e8384a' : GLACE); });
  // biscuit sablé (soubassement, chemin) : pâte dorée piquée de petits trous
  const sable = () => tex('sable', D, D, (g, px, w, h) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const tr = (x % (8 * S) === 4 * S && y % (8 * S) === 4 * S); px(x, y, tr ? '#9a6a2e' : hash(x, y, 34) < 0.06 ? '#d8a860' : '#ecc480'); } });
  // sucette : spirale de couleurs (pas de répétition)
  const spirale = () => tex('spirale', 2 * D, 2 * D, (g, px, w, h) => {
    const C = ['#e8384a', '#f8c838', '#3aa8e8', '#f6f6f6'];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const dx = x - w / 2, dy = y - h / 2, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx); px(x, y, C[((Math.floor(r / (5 * S) + a / (Math.PI / 2)) % 4) + 4) % 4]); }
  }, false);
  const verreSucre = () => tex('verreSucre', D, D, (g, px, w, h) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const d = (x + y) % Math.round(14 * S); px(x, y, d < 2 * S ? '#fff6c8' : y < h / 2 ? '#f8d070' : '#e8a840'); } }, false);
  const mousse = () => tex('mousse', D, D, (g, px, w, h) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const u = hash(x >> 1, y >> 1, 35); px(x, y, u < 0.35 ? '#5a8c3a' : u < 0.5 ? '#7aa84a' : '#8c8478'); } });

  /** toit à deux pans, pignon sur rue : le faîtage va de l'avant vers le fond */
  const toitPignon = (G, x0, x1, z0, z1, y, hr, mat, pignon, deb, faite) => {
    const R = new THREE.Group(); R.rotation.y = Math.PI / 2; R.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2);
    toit2(R, -(z1 - z0) / 2, (z1 - z0) / 2, -(x1 - x0) / 2, (x1 - x0) / 2, y, hr, mat, pignon, deb, faite);
    G.add(R);
  };
  const BONBONS = ['#e8384a', '#f8c838', '#3aa8e8', '#58c858', '#c858e0', '#f88a2c'];
  const boule = (G, x, y, z, r, c) => { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), LUM(c, mix(c, -0.7))); s.castShadow = true; s.scale.y = 0.8; G.add(at(s, x, y, z)); return s; };
  /** un sucre d'orge vertical de hauteur h, crosse en haut, tournée vers dir (1 : vers +x) */
  const canne = (G, x, z, h, r = 0.12, dir = 1) => {
    const SO = M({ map: sucreOrge() });
    G.add(at(cyl(r, r, h, SO, 10), x, h / 2, z));
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.22, r, 8, 14, Math.PI), SO); t.castShadow = true;
    t.rotation.y = dir > 0 ? 0 : Math.PI; G.add(at(t, x + dir * 0.22, h, z));
  };
  /** une rangée de glaçage qui coule le long d'un bord (de x0 à x1, à la hauteur y, en avant de z) */
  const coulures = (G, x0, x1, y, z, seed = 0) => {
    const GL = COL(GLACE);
    G.add(at(boite(x1 - x0, 0.12, 0.16, GL), (x0 + x1) / 2, y, z));
    for (let x = x0 + 0.1; x < x1 - 0.05; x += 0.22) {
      const l = 0.08 + hash(Math.round(x * 10), seed, 36) * 0.26;
      G.add(at(boite(0.12, l, 0.1, GL), x, y - 0.06 - l / 2, z + 0.02));
      boule(G, x, y - 0.06 - l, z + 0.02, 0.07, GLACE);
    }
  };

  /* ---------------------------------------------------------------- le manoir en pain d'épice (27 × 8) */
  // trois étages : deux ailes et un avant-corps central à pignon et balcon
  B.painEpice = () => {
    const G = new THREE.Group(), w = 27, d = 8, yb = 0.3, fh = 2.4, H = 3 * fh, cx = w / 2;
    const z0 = 2.4, z1 = 6.8, zc = 7.4;                       // fond, façade des ailes, façade de l'avant-corps
    const xa = 0.5, xb = w - 0.5, c0 = 10.5, c1 = w - 10.5;    // ailes de xa à xb, avant-corps de c0 à c1
    const PE = M({ map: painEpice() }), CH = M({ map: chocolat() }), SB = M({ map: sable() }), GL = COL(GLACE);
    const PED = M({ map: painEpice(), side: THREE.DoubleSide }), VOLET = M({ map: TX.bardage('#e8c890') }), VITRE = LUM('#f8d070', '#806020');
    // soubassement de sablés, le corps principal, l'avant-corps
    G.add(at(boite(xb - xa + 0.3, yb, z1 - z0 + 0.3, SB), cx, yb / 2, (z0 + z1) / 2));
    G.add(at(boite(c1 - c0 + 0.3, yb, zc - z0 + 0.3, SB), cx, yb / 2, (z0 + zc) / 2));
    G.add(at(boite(xb - xa, H, z1 - z0, PE), cx, yb + H / 2, (z0 + z1) / 2));
    G.add(at(boite(c1 - c0, H, zc - z0, PE), cx, yb + H / 2, (z0 + zc) / 2));
    for (const x of [c0, c1]) G.add(at(boite(0.18, H, 0.18, GL), x, yb + H / 2, zc));
    // les cordons de glaçage qui marquent les étages, sur les ailes et l'avant-corps
    for (let e = 1; e <= 3; e++) {
      const y = yb + e * fh;
      coulures(G, xa, c0, y, z1 + 0.06, e); coulures(G, c1, xb, y, z1 + 0.06, e + 5);
      coulures(G, c0, c1, y, zc + 0.06, e + 9);
    }
    // le grand toit de chocolat des ailes (faîtage le long de x), boules de gomme, deux cheminées
    const hr = 2.6, deb = 0.45, dz = (z1 - z0) / 2 + deb, czt = (z0 + z1) / 2, haut = yb + H + hr;
    toit2(G, xa, xb, z0, z1, yb + H, hr, CH, PED, deb, GLACE);
    for (let r = 0; r < 2; r++) for (let x = xa + 0.6 + r * 0.45; x < xb - 0.4; x += 0.9) {
      if (x > c0 - 0.3 && x < c1 + 0.3) continue;
      const t = 0.35 + r * 0.3;
      boule(G, x, haut - hr * t + 0.12, czt + dz * t, 0.14, BONBONS[Math.floor(x * 1.3 + r) % BONBONS.length]);
    }
    for (let x = xa - 0.3; x < xb + 0.3; x += 0.34) boule(G, x, haut + 0.18, czt, 0.1, GLACE);
    for (const x of [xa, xb]) G.add(at(boite(0.16, H, 0.16, GL), x, yb + H / 2, z1));
    for (const xc of [xa + 3.0, xb - 3.0]) {
      G.add(at(boite(0.8, 2.4, 0.8, CH), xc, haut - 0.3, z0 + 0.9));
      G.add(at(boite(1.0, 0.18, 1.0, GL), xc, haut + 0.95, z0 + 0.9));
      for (let i = 0; i < 3; i++) boule(G, xc + i * 0.2, haut + 1.35 + i * 0.4, z0 + 0.9 - i * 0.05, 0.24 + i * 0.07, '#f8c8e0');
    }
    // l'avant-corps : un haut pignon sur rue, rives de glaçage, une grande rosace de sucre
    { const hp = 3.4, debp = 0.4, ax = (c1 - c0) / 2 + debp, top = yb + H + hp;
      toitPignon(G, c0, c1, z0 + 0.4, zc, yb + H, hp, CH, PED, debp, GLACE);
      const L = Math.hypot(ax, hp), pente = Math.atan2(hp, ax);
      for (const sg of [-1, 1]) {
        const r = boite(L, 0.2, 0.22, GL); r.rotation.z = -sg * pente; G.add(at(r, cx + sg * ax / 2, yb + H + hp / 2 + 0.08, zc + debp + 0.02));
        for (let k = 1; k < 14; k++) {
          const t = k / 14, l = 0.1 + hash(k, sg + 3, 38) * 0.25;
          G.add(at(boite(0.11, l, 0.08, GL), cx + sg * ax * t, top - hp * t - l / 2, zc + debp + 0.03));
          boule(G, cx + sg * ax * t, top - hp * t - l, zc + debp + 0.03, 0.07, GLACE);
        }
        for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) {
          const t = 0.25 + r * 0.25, z = z0 + 1.2 + (i + (r % 2) * 0.5) * (zc - z0 - 1.0) / 4;
          boule(G, cx + sg * ax * t, top - hp * t + 0.13, z, 0.14, BONBONS[(i + r * 2 + (sg > 0 ? 3 : 0)) % BONBONS.length]);
        }
      }
      for (let z = z0 + 0.5; z < zc + debp; z += 0.34) boule(G, cx, top + 0.18, z, 0.1, GLACE);
      const yr = yb + H + 1.25;
      G.add(at(new THREE.Mesh(new THREE.CircleGeometry(0.75, 24), VITRE), cx, yr, zc + 0.02));
      G.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.1, 8, 24), GL), cx, yr, zc + 0.05));
      for (let k = 0; k < 4; k++) { const b = boite(1.5, 0.06, 0.04, GL); b.rotation.z = k * Math.PI / 4; G.add(at(b, cx, yr, zc + 0.04)); }
      boule(G, cx, top + 0.45, zc + 0.1, 0.28, '#e8384a'); }
    // les fenêtres : rondes au rez-de-chaussée (jardinières de bonbons), hautes et cintrées aux étages (volets de gaufrette)
    const ronde = (fx, fy, z) => {
      G.add(at(new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), VITRE), fx, fy, z + 0.01));
      G.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.08, 8, 20), GL), fx, fy, z + 0.03));
      G.add(at(boite(0.06, 1.0, 0.04, GL), fx, fy, z + 0.03)); G.add(at(boite(1.0, 0.06, 0.04, GL), fx, fy, z + 0.03));
      for (const s of [-1, 1]) G.add(at(boite(0.32, 1.05, 0.06, VOLET), fx + s * 0.76, fy, z + 0.03));
      G.add(at(boite(1.15, 0.14, 0.22, CH), fx, fy - 0.62, z + 0.12));
      for (let k = 0; k < 6; k++) boule(G, fx - 0.45 + k * 0.18, fy - 0.49, z + 0.12, 0.07, BONBONS[(k + Math.round(fx)) % BONBONS.length]);
    };
    const cintree = (fx, fy, z, fw = 0.8, fhh = 1.15) => {
      G.add(at(boite(fw, fhh, 0.02, VITRE), fx, fy, z + 0.01));
      G.add(at(new THREE.Mesh(new THREE.CircleGeometry(fw / 2, 16, 0, Math.PI), VITRE), fx, fy + fhh / 2, z + 0.01));
      G.add(at(new THREE.Mesh(new THREE.TorusGeometry(fw / 2 + 0.03, 0.07, 6, 16, Math.PI), GL), fx, fy + fhh / 2, z + 0.04));
      for (const s of [-1, 1]) G.add(at(boite(0.12, fhh, 0.08, GL), fx + s * (fw / 2 + 0.03), fy, z + 0.04));
      G.add(at(boite(0.05, fhh, 0.04, GL), fx, fy, z + 0.03)); G.add(at(boite(fw, 0.05, 0.04, GL), fx, fy + 0.1, z + 0.03));
      G.add(at(boite(fw + 0.3, 0.1, 0.22, GL), fx, fy - fhh / 2 - 0.05, z + 0.1));
      for (const s of [-1, 1]) G.add(at(boite(fw * 0.45, fhh + 0.3, 0.06, VOLET), fx + s * (fw * 0.75 + 0.06), fy + 0.12, z + 0.03));
    };
    for (const fx of [2.0, 4.3, 6.6, 8.9, w - 2.0, w - 4.3, w - 6.6, w - 8.9]) {
      ronde(fx, yb + 1.2, z1);
      cintree(fx, yb + fh + 1.05, z1); cintree(fx, yb + 2 * fh + 1.05, z1);
    }
    ronde(cx - 2.0, yb + 1.2, zc); ronde(cx + 2.0, yb + 1.2, zc);
    for (const fx of [cx - 2.0, cx + 2.0]) cintree(fx, yb + fh + 1.05, zc);
    for (const fx of [cx - 2.0, cx, cx + 2.0]) cintree(fx, yb + 2 * fh + 1.05, zc);
    // le balcon du premier étage : porte-fenêtre, dalle de chocolat, balustrade de sucres d'orge
    { const yB = yb + fh, SO = M({ map: sucreOrge() });
      cintree(cx, yB + 1.0, zc, 1.0, 1.5);
      G.add(at(boite(2.6, 0.18, 0.9, CH), cx, yB + 0.04, zc + 0.45));
      coulures(G, cx - 1.3, cx + 1.3, yB - 0.02, zc + 0.92, 21);
      for (let k = 0; k <= 8; k++) G.add(at(cyl(0.05, 0.05, 0.7, SO, 6), cx - 1.2 + k * 0.3, yB + 0.48, zc + 0.85));
      G.add(at(boite(2.6, 0.1, 0.12, GL), cx, yB + 0.86, zc + 0.85));
      for (const s of [-1, 1]) G.add(at(boite(0.1, 0.1, 0.9, GL), cx + s * 1.25, yB + 0.86, zc + 0.45)); }
    // la porte : une double tablette de chocolat sous une arche de glaçage, un cœur au-dessus, des marches de nougat
    const pw = 1.2, ph = 1.8;
    reperePorte(G, cx, yb, zc, pw, ph);
    for (const s of [-1, 1]) {
      G.add(at(boite(pw / 2 - 0.02, ph, 0.04, CH), cx + s * pw / 4, yb + ph / 2, zc + 0.02));
      for (let j = 0; j < 4; j++) G.add(at(boite(0.44, 0.34, 0.06, CH), cx + s * pw / 4, yb + 0.28 + j * 0.42, zc + 0.04));
    }
    G.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.12, 8, 18, Math.PI), GL), cx, yb + ph, zc + 0.05));
    for (const s of [-1, 1]) { G.add(at(boite(0.16, ph, 0.14, GL), cx + s * 0.72, yb + ph / 2, zc + 0.05)); boule(G, cx + s * 0.15, yb + 0.9, zc + 0.1, 0.07, '#f8c838'); }
    const coeur = new THREE.Shape(); coeur.moveTo(0, -0.3); coeur.bezierCurveTo(0.55, 0.06, 0.3, 0.48, 0, 0.22); coeur.bezierCurveTo(-0.3, 0.48, -0.55, 0.06, 0, -0.3);
    G.add(at(new THREE.Mesh(new THREE.ExtrudeGeometry(coeur, { depth: 0.06, bevelEnabled: false }), [M({ color: new THREE.Color('#d8383a') }), GL]), cx, yb + ph + 0.4, zc + 0.04));
    for (let k = 0; k < 2; k++) G.add(at(boite(2.0 - k * 0.4, 0.15, 0.4, COL('#f2e6c8')), cx, 0.08 + k * 0.15, zc + 0.55 - k * 0.2));
    // devant : grands sucres d'orge en colonnes de l'avant-corps, sucettes, bordure de boules de gomme
    for (const [x, sg] of [[c0 - 0.2, -1], [c1 + 0.2, 1]]) canne(G, x, zc + 0.3, 4.2, 0.17, sg);
    for (const [x, sg] of [[xa + 0.1, -1], [xb - 0.1, 1]]) canne(G, x, z1 + 0.35, 3.0, 0.14, sg);
    for (const x of [c0 - 1.15, c1 + 1.15, 5.45, w - 5.45]) {
      G.add(at(cyl(0.05, 0.05, 1.5, GL, 6), x, 0.75, d - 0.2));
      const disque = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.12, 22), [COL('#e8384a'), M({ map: spirale() }), M({ map: spirale() })]);
      disque.rotation.x = Math.PI / 2; disque.castShadow = true; G.add(at(disque, x, 1.8, d - 0.2));
    }
    for (let x = 0.6; x < w - 0.4; x += 0.55) if (Math.abs(x - cx) > 1.4) boule(G, x, 0.15, d - 0.15, 0.15, BONBONS[Math.round(x / 0.55) % BONBONS.length]);
    return G;
  };

  /* ---------------------------------------------------------------- le puits du jardin (2 × 2) */
  B.puitsJardin = () => {
    const G = new THREE.Group(), c = 1, BO = M({ map: TX.bois('#6a4a2a') });
    G.add(at(cyl(0.72, 0.78, 0.75, M({ map: TX.pierre('#a8a296') }), 16), c, 0.38, c));
    G.add(at(cyl(0.74, 0.74, 0.08, M({ map: mousse() }), 16), c, 0.76, c));                 // la mousse sur la margelle
    G.add(at(cyl(0.56, 0.56, 0.02, COL('#0e1820'), 16), c, 0.79, c));
    for (const s of [-1, 1]) G.add(at(boite(0.12, 1.55, 0.12, BO), c + s * 0.62, 1.3, c));
    toitPignon(G, c - 0.62, c + 0.62, c - 0.75, c + 0.75, 2.05, 0.75, M({ map: TX.bardeaux('#7a4a34') }), M({ map: TX.planches('#6a4a2a'), side: THREE.DoubleSide }), 0.15, '#3a2414');
    const tr = cyl(0.09, 0.09, 1.2, BO, 8); tr.rotation.z = Math.PI / 2; G.add(at(tr, c, 1.6, c));
    for (let i = 0; i < 4; i++) G.add(at(cyl(0.1, 0.1, 0.03, COL('#c8b080'), 8), c - 0.15 + i * 0.08, 1.7, c).rotateZ(Math.PI / 2));   // la corde enroulée
    G.add(at(boite(0.03, 0.55, 0.03, COL('#c8b080')), c, 1.42, c));
    G.add(at(cyl(0.15, 0.12, 0.22, M({ map: TX.bois('#8a5a32') }), 10), c, 1.06, c));          // le seau
    G.add(at(boite(0.06, 0.06, 0.32, BO), c + 0.66, 1.7, c + 0.15)); G.add(at(boite(0.06, 0.22, 0.06, BO), c + 0.66, 1.6, c + 0.3));   // la manivelle
    // deux pots de fleurs, une touffe d'herbe
    for (const [x, z, f] of [[0.15, 1.85, '#f05a6a'], [1.85, 1.8, '#f8d850']]) {
      G.add(at(cyl(0.16, 0.12, 0.24, COL('#b8603a'), 10), x, 0.12, z));
      for (let k = 0; k < 4; k++) G.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), COL(k % 2 ? f : '#4c8c3c')), x - 0.08 + (k % 2) * 0.16, 0.3 + Math.floor(k / 2) * 0.07, z - 0.05 + Math.floor(k / 2) * 0.08));
    }
    return G;
  };

  /* ---------------------------------------------------------------- la cabane à outils (3 × 3) */
  B.cabaneOutils = () => {
    const G = new THREE.Group(), x0 = 0.35, x1 = 2.65, z0 = 0.5, z1 = 2.4, H = 1.9, cx = 1.5, PL = M({ map: TX.planches('#7a5030') }), BO = COL('#5a3a20');
    G.add(at(boite(x1 - x0 + 0.1, 0.12, z1 - z0 + 0.1, M({ map: TX.pierre('#8a847a') })), cx, 0.06, (z0 + z1) / 2));
    G.add(at(boite(x1 - x0, H, z1 - z0, PL), cx, 0.12 + H / 2, (z0 + z1) / 2));
    for (const x of [x0, x1]) for (const z of [z0, z1]) G.add(at(boite(0.12, H, 0.12, BO), x, 0.12 + H / 2, z));
    toitPignon(G, x0, x1, z0, z1, 0.12 + H, 1.1, M({ map: TX.bardeaux('#4a525e') }), M({ map: TX.planches('#7a5030'), side: THREE.DoubleSide }), 0.25, '#2a2e36');
    // une petite lucarne ronde dans le pignon, une enseigne « OUTILS » : une pelle et un râteau croisés
    G.add(at(new THREE.Mesh(new THREE.CircleGeometry(0.2, 14), M({ map: TX.verre() })), cx, 0.12 + H + 0.45, z1 + 0.01));
    for (const sg of [-1, 1]) { const o = boite(0.05, 0.6, 0.03, COL('#a07848')); o.rotation.z = sg * 0.7; G.add(at(o, cx, 0.12 + H - 0.12, z1 + 0.03)); }
    // la porte entrouverte : l'intérieur sombre, le battant de travers
    G.add(at(boite(0.8, 1.25, 0.02, COL('#1a120c')), cx - 0.25, 0.12 + 0.63, z1 + 0.01));
    const battant = boite(0.75, 1.25, 0.05, M({ map: TX.planches('#8a6038') })); battant.rotation.y = -0.9; G.add(at(battant, cx + 0.38, 0.12 + 0.63, z1 + 0.28));
    G.add(at(boite(0.06, 0.06, 0.04, COL('#c8a040')), cx + 0.5, 0.75, z1 + 0.4));
    // une petite fenêtre
    fenetre2(G, x0 + 0.5, 1.1, z1, 0.4, 0.36, { cadre: '#5a3a20', rideau: '#e8d8b0' });
    // les outils appuyés contre le mur : râteau, pelle, fourche
    const manche = (x, z, h, inc) => { const m = boite(0.05, h, 0.05, COL('#a07848')); m.rotation.z = inc; G.add(at(m, x, h / 2 + 0.05, z)); return m; };
    manche(x1 + 0.12, z1 - 0.3, 1.5, 0.12); G.add(at(boite(0.4, 0.05, 0.06, COL('#7a7a82')), x1 + 0.03, 1.5, z1 - 0.3));
    for (let k = 0; k < 5; k++) G.add(at(boite(0.03, 0.1, 0.03, COL('#7a7a82')), x1 - 0.13 + k * 0.08, 1.43, z1 - 0.3));
    manche(x1 + 0.12, z1 - 0.8, 1.3, 0.1); G.add(at(boite(0.22, 0.3, 0.04, COL('#9a9aa2')), x1 + 0.2, 0.2, z1 - 0.8));
    manche(x0 - 0.12, z1 - 0.4, 1.4, -0.1); for (const dx of [-0.08, 0, 0.08]) G.add(at(boite(0.03, 0.3, 0.03, COL('#7a7a82')), x0 - 0.06 + dx, 1.45, z1 - 0.4));
    // la brouette, l'arrosoir, des pots
    const BR = COL('#3a6a4a');
    G.add(at(boite(0.7, 0.3, 0.5, BR), 0.6, 0.45, z1 + 0.5)); G.add(at(cyl(0.16, 0.16, 0.06, COL('#3a3a40'), 12).rotateZ(Math.PI / 2), 0.15, 0.17, z1 + 0.5));
    for (const s of [-1, 1]) G.add(at(boite(0.7, 0.05, 0.05, COL('#6a4a2a')), 1.05, 0.38, z1 + 0.5 + s * 0.2));
    G.add(at(boite(0.4, 0.2, 0.3, COL('#7a5a3a')), 0.6, 0.65, z1 + 0.5));   // la terre dans la brouette
    G.add(at(cyl(0.15, 0.17, 0.3, COL('#5a8a6a'), 10), 2.4, 0.15, z1 + 0.45));
    const bec = boite(0.04, 0.04, 0.3, COL('#5a8a6a')); bec.rotation.x = 0.7; G.add(at(bec, 2.4, 0.3, z1 + 0.65));
    for (const [x, z] of [[2.9, 0.6], [2.95, 1.0]]) { G.add(at(cyl(0.12, 0.09, 0.18, COL('#b8603a'), 8), x, 0.09, z)); G.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 5), COL('#5a9a4a')), x, 0.24, z)); }
    return G;
  };
}
