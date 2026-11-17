// odyssee/js/render/elements3d.js — le Temple des Éléments du labo, vu du dehors (même atelier que batiments3d.js).
//   templeElements (13 × 9) : une façade de temple taillée dans une falaise, à la manière de Petra : soubassement et
//   escalier, six colonnes, fronton aux trois gemmes, étage à rotonde coiffée d'une urne entre deux demi-frontons ;
//   autour, la roche brute de la montagne : coulée de lave à gauche, cascade à droite, arbres et racines sur le sommet.
// Coordonnées comme les autres modèles : x de 0 à w, z de 0 à d (façade sud en z = d), y vers le haut.
import * as THREE from 'three';

export function templeElements({ B, tex, hash, mix, S, D, boite, at, M, COL, LUM, cyl, reperePorte }) {
  /* ---------------------------------------------------------------- textures */
  const ROC = '#9a7458', TAILLE = '#c49a74';
  // roche de la falaise : strates obliques, taches, fissures
  const roche = () => tex('elemRoche', D, D, (g, px, w, h) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const strate = Math.floor((y + x * 0.25) / (6 * S)), u = hash(x >> 1, y >> 1, 51);
      let f = (hash(strate, 0, 52) - 0.5) * 0.18;
      if (((y + x * 0.25) % (6 * S)) < S) f -= 0.12;
      if (u < 0.05) f -= 0.15; else if (u > 0.96) f += 0.15;
      px(x, y, mix(ROC, f));
    }
  });
  // pierre taillée dans la roche : grandes assises, ciseau fin
  const taillee = () => tex('elemTaille', D, D, (g, px, w, h) => {
    const rh = 12 * S, l = 24 * S;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const r = Math.floor(y / rh), dec = r % 2 ? l / 2 : 0, k = Math.floor((x + dec) / l);
      let f = (hash(k, r, 53) - 0.5) * 0.1 + (hash(x, y, 54) < 0.05 ? -0.06 : 0);
      if (y % rh < S) f = -0.2; else if ((x + dec) % l < S) f = -0.14; else if (y % rh < 2 * S) f += 0.1;
      px(x, y, mix(TAILLE, f));
    }
  });
  // eau qui tombe : bandes claires qui filent vers le bas
  const chute = () => tex('elemChute', D, D, (g, px, w, h) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const b = hash(x >> 1, 0, 55), v = (y + Math.floor(b * h)) % (10 * S);
      px(x, y, v < 2 * S && b > 0.4 ? '#e8f8ff' : b > 0.7 ? '#7ac6e4' : '#3a8ac0');
    }
  });
  // lave : croûte sombre et filets brillants
  const lave = () => tex('elemLave', D, D, (g, px, w, h) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = Math.sin(x * 0.4 / S + Math.sin(y * 0.3 / S) * 2) + hash(x >> 2, y >> 2, 56) * 0.8;
      px(x, y, u > 1.1 ? '#fff0a0' : u > 0.6 ? '#ffb030' : u > 0.1 ? '#e8501a' : '#5a1a0c');
    }
  });
  const R = M({ map: roche() }), RC = COL('#8a684e'), RC2 = COL('#a07c5c'), TA = M({ map: taillee() }), NUIT = COL('#140e10');

  /** un prisme triangulaire (fronton) de largeur w, hauteur h, épaisseur e, posé sur y, face avant en z */
  const fronton = (G, x, y, z, w, h, e, mat, demi = 0) => {
    const s = new THREE.Shape();
    if (demi < 0) { s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); }        // demi-fronton qui monte vers la droite
    else if (demi > 0) { s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(-w / 2, h); }
    else { s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); }
    const g = new THREE.ExtrudeGeometry(s, { depth: e, bevelEnabled: false }), uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i), uv.getY(i));
    const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true;
    G.add(at(m, x, y, z - e));
  };
  /** une colonne : base, fût, chapiteau */
  const colonne = (G, x, y, z, h, r = 0.22) => {
    G.add(at(boite(r * 2.6, 0.18, r * 2.6, TA), x, y + 0.09, z));
    G.add(at(cyl(r, r * 1.08, h - 0.42, TA, 12), x, y + 0.18 + (h - 0.42) / 2, z));
    G.add(at(cyl(r * 1.5, r, 0.16, TA, 12), x, y + h - 0.32, z));
    G.add(at(boite(r * 3, 0.16, r * 3, TA), x, y + h - 0.08, z));
  };
  /** un rocher : un polyèdre irrégulier, aplati */
  const rocher = (G, x, y, z, r, mat, k = 0, sy = 0.7) => {
    const g = new THREE.DodecahedronGeometry(r, 0), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const X = p.getX(i), Y = p.getY(i), Z = p.getZ(i), f = 0.82 + hash(Math.round(X * 97 + Z * 31), Math.round(Y * 89), k + 60) * 0.3; p.setXYZ(i, X * f, Y * f * sy, Z * f); }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.rotation.y = hash(k, 1, 60) * 6; m.castShadow = m.receiveShadow = true; G.add(at(m, x, y, z));
  };
  const boule = (G, x, y, z, r, mat) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat); m.castShadow = true; G.add(at(m, x, y, z)); };

  /* ---------------------------------------------------------------- le temple (13 × 9) */
  B.templeElements = () => {
    const G = new THREE.Group(), w = 13, d = 9, cx = w / 2, zf = 6.2;             // zf : plan de la façade taillée
    // la falaise : des blocs de roche de hauteurs inégales, plus hauts au centre
    const blocs = [[0, 2.6, 8.4, 0.5], [2.4, 2.6, 10.2, 0.2], [4.8, 3.4, 11.0, 0], [8.2, 2.4, 10.4, 0.3], [10.6, 2.4, 8.8, 0.6]], zb = 3.4;
    for (const [x, bw, h, rz] of blocs) G.add(at(boite(bw, h, zf - zb - rz, R), x + bw / 2, h / 2, (zf + zb + rz) / 2));
    // flancs saillants de part et d'autre de la façade, en avancée
    for (const [x, bw, h] of [[0, 2.1, 7.6], [w - 2.1, 2.1, 7.0]]) G.add(at(boite(bw, h, 1.6, R), x + bw / 2, h / 2, zf + 0.6));
    // éboulis au pied des flancs
    for (let i = 0; i < 9; i++) {
      const x = i < 5 ? 1.8 + i * 0.3 : w - 1.8 - (i - 5) * 0.3, r = 0.18 + hash(i, 0, 57) * 0.22;
      rocher(G, x, r * 0.4, zf + 1.3 + hash(i, 1, 57) * 0.4, r * 1.2, i % 2 ? RC : RC2, i);
    }
    // une crête de rochers sur le haut des blocs et des flancs : la montagne n'est pas taillée au cordeau
    for (let i = 0; i < 16; i++) {
      const x = 0.4 + i * (w - 0.8) / 15, b = blocs.find(([bx, bw]) => x >= bx && x < bx + bw) || blocs[4];
      rocher(G, x, b[2] - 0.05, zb + 0.6 + hash(i, 6, 61) * 1.4, 0.55 + hash(i, 7, 61) * 0.45, RC, i + 40, 0.75);
    }
    for (const [x, h] of [[1.05, 7.6], [w - 1.05, 7.0]]) for (let k = 0; k < 3; k++) rocher(G, x + (k - 1) * 0.6, h, zf + 0.4 + k * 0.2, 0.55, RC, k + 60, 0.8);
    // la façade taillée : fond plat dans la roche
    const fx0 = 2.1, fx1 = w - 2.1, fw = fx1 - fx0;
    G.add(at(boite(fw, 9.6, 0.3, TA), cx, 4.8, zf - 0.15));
    // soubassement et escalier
    G.add(at(boite(fw, 0.5, 1.2, TA), cx, 0.25, zf + 0.6));
    for (let k = 0; k < 3; k++) G.add(at(boite(3.0 + k * 0.4, 0.5 - k * 0.16, 0.32, TA), cx, (0.5 - k * 0.16) / 2, zf + 1.36 + k * 0.32));
    // niveau bas : six colonnes, entablement, fronton aux trois gemmes
    const yb = 0.5, hc = 3.4;
    for (const x of [fx0 + 0.55, fx0 + 1.75, cx - 1.0, cx + 1.0, fx1 - 1.75, fx1 - 0.55]) colonne(G, x, yb, zf + 0.45, hc);
    G.add(at(boite(fw, 0.5, 0.9, TA), cx, yb + hc + 0.25, zf + 0.45));
    G.add(at(boite(fw + 0.2, 0.12, 1.0, TA), cx, yb + hc + 0.56, zf + 0.45));
    fronton(G, cx, yb + hc + 0.62, zf + 0.9, 4.2, 1.2, 0.8, TA);
    for (const s of [-1, 1]) { const r = boite(2.35, 0.12, 0.9, TA); r.rotation.z = -s * Math.atan2(1.2, 2.1); G.add(at(r, cx + s * 1.05, yb + hc + 1.24, zf + 0.5)); }
    // les trois gemmes dans le fronton : rouge, verte, bleue
    const yg = yb + hc + 1.05;
    for (const [dx, dy, c, e] of [[-0.6, -0.1, '#e8402a', '#801808'], [0.6, -0.1, '#3a8aec', '#0a2a70'], [0, 0.4, '#3cc444', '#0a5a14']]) {
      boule(G, cx + dx, yg + dy, zf + 0.95, 0.2, LUM(c, e));
      G.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.05, 6, 14), COL('#e8c060')), cx + dx, yg + dy, zf + 0.94));
    }
    // la porte : grande baie sombre entre les deux colonnes du milieu, encadrement mouluré
    const pw = 1.4, ph = 2.5;
    reperePorte(G, cx, yb, zf, pw, ph);
    G.add(at(boite(pw, ph, 0.05, NUIT), cx, yb + ph / 2, zf + 0.02));
    for (const s of [-1, 1]) G.add(at(boite(0.16, ph + 0.16, 0.14, TA), cx + s * (pw / 2 + 0.08), yb + (ph + 0.16) / 2, zf + 0.06));
    G.add(at(boite(pw + 0.5, 0.2, 0.2, TA), cx, yb + ph + 0.2, zf + 0.08));
    // deux niches à statue entre les colonnes des côtés
    for (const s of [-1, 1]) {
      const x = cx + s * 2.95;
      G.add(at(boite(0.7, 1.6, 0.04, COL('#5a4030')), x, yb + 1.4, zf + 0.01));
      G.add(at(boite(0.3, 1.0, 0.25, TA), x, yb + 1.15, zf + 0.12)); boule(G, x, yb + 1.8, zf + 0.12, 0.17, TA);
    }
    // niveau haut : rotonde centrale à colonnes, toit conique et urne ; deux pavillons à demi-fronton
    const yh = yb + hc + 1.95, hh = 2.9;
    G.add(at(boite(fw, 0.3, 0.9, TA), cx, yh - 0.15, zf + 0.45));
    const zr = zf - 0.35;
    G.add(at(cyl(0.9, 0.9, hh, TA, 16), cx, yh + hh / 2, zr));
    for (let k = 0; k < 5; k++) { const a = (k - 2) * 0.6; colonne(G, cx + Math.sin(a) * 1.08, yh, zr + Math.cos(a) * 1.08, hh, 0.12); }
    G.add(at(cyl(1.3, 1.3, 0.22, TA, 16), cx, yh + hh + 0.11, zr));
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.9, 16), TA); cone.castShadow = true; G.add(at(cone, cx, yh + hh + 0.67, zr));
    G.add(at(cyl(0.12, 0.22, 0.4, TA, 10), cx, yh + hh + 1.3, zr)); boule(G, cx, yh + hh + 1.62, zr, 0.22, TA);
    for (const s of [-1, 1]) {
      const x = cx + s * 2.9;
      for (const dx of [-0.7, 0.7]) colonne(G, x + dx, yh, zf + 0.4, hh - 0.5, 0.15);
      G.add(at(boite(2.0, 0.3, 0.7, TA), x, yh + hh - 0.35, zf + 0.4));
      fronton(G, x, yh + hh - 0.2, zf + 0.75, 2.0, 0.8, 0.6, TA, s);
    }
    // à gauche, le feu : une coulée de lave qui suinte de la roche et descend en zigzag jusqu'à une mare au pied
    const LV = M({ map: lave(), emissive: new THREE.Color('#a03008') });
    let px = 1.2, py = 7.4;
    for (let i = 0; i < 9; i++) {
      const nx = px + (hash(i, 2, 58) - 0.5) * 0.5, ny = py - 0.85;
      const L = Math.hypot(nx - px, ny - py), b = boite(0.24 - i * 0.008, L + 0.08, 0.1, LV);
      b.rotation.z = Math.atan2(nx - px, py - ny); G.add(at(b, (px + nx) / 2, (py + ny) / 2, zf + 1.42));
      px = nx; py = ny;
    }
    G.add(at(cyl(0.75, 0.75, 0.06, LV, 14), 1.1, 0.04, zf + 2.0));
    for (const a of [0.3, 1.4, 2.6]) rocher(G, 1.1 + Math.cos(a) * 0.85, 0.08, zf + 2.0 + Math.sin(a) * 0.65, 0.22, RC, Math.round(a * 10) + 20);
    // à droite, l'eau : une cascade qui tombe du haut du flanc dans un bassin
    const EAU = M({ map: chute(), transparent: true, opacity: 0.88, emissive: new THREE.Color('#103048') });
    const cascade = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 6.8), EAU); G.add(at(cascade, w - 1.15, 3.6, zf + 1.42));
    G.add(at(cyl(0.95, 0.95, 0.08, M({ color: new THREE.Color('#3a8ac0'), emissive: new THREE.Color('#0a2030') }), 16), w - 1.15, 0.05, zf + 2.0));
    for (const a of [0.4, 1.6, 2.8, 3.6]) rocher(G, w - 1.15 + Math.cos(a) * 1.0, 0.08, zf + 2.0 + Math.sin(a) * 0.74, 0.22, RC2, Math.round(a * 10) + 30);
    for (let i = 0; i < 4; i++) boule(G, w - 1.15 + (hash(i, 4, 58) - 0.5) * 0.6, 0.25, zf + 2.0, 0.12, COL('#f0fcff'));   // écume
    // en haut, la forêt : des arbres sur le sommet de la falaise, des racines et du lierre qui retombent
    const TR = COL('#5a3a22'), FE = [COL('#2c5a26'), COL('#447e34'), COL('#62a244')];
    for (const [x, z, s] of [[0.9, 4.6, 1.0], [3.3, 4.2, 1.2], [6.6, 4.0, 1.4], [9.3, 4.3, 1.1], [12.0, 4.8, 0.9], [5.0, 5.4, 0.7], [8.1, 5.5, 0.8]]) {
      const i = Math.round(x * 3), h = (blocs.find(([bx, bw]) => x >= bx && x < bx + bw) || blocs[0])[2];
      G.add(at(cyl(0.1 * s, 0.14 * s, 1.0 * s, TR, 6), x, h + 0.5 * s, z));
      boule(G, x, h + 1.2 * s, z, 0.62 * s, FE[i % 3]); boule(G, x + 0.35 * s, h + 0.95 * s, z + 0.2, 0.45 * s, FE[(i + 1) % 3]);
      boule(G, x - 0.3 * s, h + 1.0 * s, z - 0.15, 0.42 * s, FE[(i + 2) % 3]);
    }
    for (let i = 0; i < 12; i++) {
      const x = fx0 + 0.3 + i * (fw - 0.6) / 11, h = (blocs.find(([bx, bw]) => x >= bx && x < bx + bw) || blocs[2])[2];
      const L = 0.8 + hash(i, 5, 59) * 1.8;
      G.add(at(cyl(0.035, 0.05, L, TR, 5), x, Math.min(h, 9.6) - L / 2, zf + 0.05));
      if (i % 2) boule(G, x, Math.min(h, 9.6) - L, zf + 0.1, 0.12, FE[1]);
    }
    // le haut de la façade se perd dans la roche : une corniche brute
    G.add(at(boite(fw + 0.4, 0.4, 0.6, R), cx, 9.8, zf + 0.0));
    return G;
  };
}
