// odyssee/js/render/labo3d.js — grands bâtiments des donjons du labo, même atelier que batiments3d.js (PixelForge).
//   chateauFort     (30 × 28) : château fort gigantesque de pierre noire, entouré de douves, pont-levis abaissé devant la herse, quatre
//                               énormes tours rondes aux angles, courtines crénelées, donjon carré au centre (plate-forme
//                               au sommet : la place du boss) flanqué de quatre tourelles ;
//   voiesSanctuaire (9 × 7)   : le Sanctuaire des Trois Voies, petit et sobre : une porte de pierre taillée dans un rocher,
//                               trois marches, trois niches éclairées au-dessus, deux lanternes ;
//   museeAntique    (17 × 9)  : un vieux musée à l'antique en marbre blanc et gris : grand escalier, portique de huit
//                               colonnes, fronton sculpté, frise, ailes à pilastres et hautes fenêtres, dôme de cuivre vert.
// Coordonnées comme les autres modèles : x de 0 à w, z de 0 à d (façade sud en z = d), y vers le haut.
import * as THREE from 'three';

export function batimentsLabo({ B, TX, tex, hash, mix, S, D, boite, at, M, COL, LUM, cyl, reperePorte }) {
  /* ---------------------------------------------------------------- outils */
  const cylUV = (r1, r2, h, mat, n = 20) => {
    const g = new THREE.CylinderGeometry(r1, r2, h, n, 1), uv = g.attributes.uv, c = Math.PI * (r1 + r2);
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * c, uv.getY(i) * h);
    const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; return m;
  };
  const coneUV = (r, h, mat, n = 20) => {
    const g = new THREE.ConeGeometry(r, h, n), uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.PI * r * 2, uv.getY(i) * Math.hypot(r, h));
    const m = new THREE.Mesh(g, mat); m.castShadow = true; return m;
  };
  const fronton = (G, x, y, z, w, h, e, mat) => {
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h);
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: e, bevelEnabled: false }), mat); m.castShadow = m.receiveShadow = true;
    G.add(at(m, x, y, z - e));
  };
  /** créneaux le long d'un segment (merlons de largeur l, un vide sur deux) */
  const creneaux = (G, x0, z0, x1, z1, y, mat, h = 0.7, e = 0.5, l = 0.6) => {
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.floor(L / (l * 2))), a = Math.atan2(z1 - z0, x1 - x0);
    for (let i = 0; i < n; i++) {
      const t = (i * 2 + 0.5) * l / L + (L - n * 2 * l) / (2 * L), b = boite(l, h, e, mat); b.rotation.y = -a;
      G.add(at(b, x0 + (x1 - x0) * t + Math.cos(a) * l / 2, y + h / 2, z0 + (z1 - z0) * t + Math.sin(a) * l / 2));
    }
  };
  /** créneaux en couronne au sommet d'une tour */
  const couronne = (G, x, z, r, y, mat, h = 0.8, n = 18) => {
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, b = boite(r * Math.PI / n, h, 0.5, mat); b.rotation.y = -a + Math.PI / 2;
      G.add(at(b, x + Math.cos(a) * (r - 0.25), y + h / 2, z + Math.sin(a) * (r - 0.25)));
    }
  };
  const fente = (G, x, y, z, ry = 0, h = 0.9) => { const b = boite(0.14, h, 0.06, COL('#16141c')); b.rotation.y = ry; G.add(at(b, x, y, z)); };
  const drapeau = (G, x, y, z, coul, h = 2.4) => {
    G.add(at(cyl(0.05, 0.05, h, COL('#3a3030'), 6), x, y + h / 2, z));
    G.add(at(boite(0.03, 0.7, 1.1, COL(coul)), x, y + h - 0.4, z + 0.56));
  };

  /* ---------------------------------------------------------------- textures */
  // grosse pierre de château : grands blocs gris, joints creusés, mousse en bas
  const grosBloc = (col, k) => tex('gb' + col + k, D, D, (g, px, w, h) => {
    const rh = 10 * S, l = 18 * S;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const r = Math.floor(y / rh), dec = (r % 2) * l / 2, b = Math.floor((x + dec) / l);
      let f = (hash(b, r, 71 + k) - 0.5) * 0.16 + (hash(x >> 1, y >> 1, 72) < 0.06 ? -0.06 : 0);
      if (y % rh < S) f = -0.32; else if ((x + dec) % l < S) f = -0.26; else if (y % rh < 2 * S) f += 0.1;
      px(x, y, mix(col, f));
    }
  });
  const dalles = (col) => tex('dl' + col, D, D, (g, px, w, h) => {
    const t = 16 * S;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let f = (hash(Math.floor(x / t), Math.floor(y / t), 73) - 0.5) * 0.12;
      if (x % t < S || y % t < S) f = -0.25;
      px(x, y, mix(col, f));
    }
  });
  const eauDouves = () => tex('douves', D, D, (g, px, w, h) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = Math.sin((x + y * 0.4) * 0.25 / S + hash(x >> 3, y >> 3, 74) * 2);
      px(x, y, v > 0.92 ? '#8cc0c8' : v > 0.4 ? '#3e7480' : '#2c5a66');
    }
  });
  const planches = TX.planches ? TX.planches('#6a4a2a') : null;
  // marbre blanc veiné de gris, en grands blocs
  const marbre = (col) => tex('mb' + col, D, D, (g, px, w, h) => {
    const rh = 12 * S, l = 24 * S;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const r = Math.floor(y / rh), dec = (r % 2) * l / 2;
      let f = (hash(Math.floor((x + dec) / l), r, 75) - 0.5) * 0.05;
      const v = Math.sin((x * 0.7 + y * 0.3) * 0.18 / S + Math.sin(y * 0.11 / S) * 3);
      if (v > 0.995) f -= 0.08;
      if (y % rh < S) f -= 0.16; else if ((x + dec) % l < S) f -= 0.1;
      px(x, y, mix(col, f));
    }
  });
  const cuivre = () => tex('cuivreVert', D, D, (g, px, w, h) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let f = (hash(x >> 1, y >> 1, 76) - 0.5) * 0.12; if (x % (6 * S) < S) f -= 0.2;
      px(x, y, mix('#6fa898', f));
    }
  });

  /* ---------------------------------------------------------------- le château fort (30 × 28) */
  B.chateauFort = () => {
    const G = new THREE.Group(), w = 30, d = 28, cx = w / 2;
    const P = M({ map: grosBloc('#2e2c32', 0) }), PT = M({ map: grosBloc('#25232a', 1) }), PD = M({ map: grosBloc('#343238', 2) });
    const SOMBRE = COL('#1a1820'), BOIS = planches ? M({ map: planches }) : COL('#6a4a2a'), FER = COL('#3a3a42');
    const x0 = 3.2, x1 = w - 3.2, z0 = 3.2, z1 = d - 3.6, Hm = 11, ep = 1.6, r = 3.4, Ht = 17;
    // les douves : un anneau d'eau, et les berges de pierre côté château
    const EAU = M({ map: eauDouves(), emissive: new THREE.Color('#0a1a20') });
    for (const [x, z, bw, bd] of [[cx, 1.0, w, 2.0], [cx, d - 1.6, w, 3.2], [1.0, d / 2, 2.0, d], [w - 1.0, d / 2, 2.0, d]]) G.add(at(boite(bw, 0.1, bd, EAU), x, -0.05, z));
    G.add(at(boite(w - 4, 0.7, d - 5.2, PT), cx, 0.0, (z0 + z1) / 2 + 0.2));                       // le socle, qui sort de l'eau
    // la cour pavée
    G.add(at(boite(x1 - x0 - ep, 0.05, z1 - z0 - ep, M({ map: dalles('#4a4648') })), cx, 0.38, (z0 + z1) / 2));
    // les courtines crénelées, avec leur chemin de ronde
    const murs = [[x0, z0, x1, z0], [x0, z1, cx - 2.6, z1], [cx + 2.6, z1, x1, z1], [x0, z0, x0, z1], [x1, z0, x1, z1]];
    for (const [a, b, c, e] of murs) {
      const L = Math.hypot(c - a, e - b), hz = a === c;
      G.add(at(boite(hz ? ep : L, Hm, hz ? L : ep, P), (a + c) / 2, Hm / 2, (b + e) / 2));
      // talus à la base et cordon sous les créneaux
      G.add(at(boite(hz ? ep + 0.6 : L, 1.4, hz ? L : ep + 0.6, PT), (a + c) / 2, 0.7, (b + e) / 2));
      G.add(at(boite(hz ? ep + 0.3 : L, 0.35, hz ? L : ep + 0.3, PT), (a + c) / 2, Hm - 0.2, (b + e) / 2));
      // créneaux sur le bord extérieur
      const o = 0.55;
      if (hz) creneaux(G, a + (a < cx ? -o : o), b, c + (a < cx ? -o : o), e, Hm, P); else creneaux(G, a, b + (b < d / 2 ? -o : o), c, e + (b < d / 2 ? -o : o), Hm, P);
      // archères
      for (let t = 0.2; t < 0.9; t += 0.2) {
        if (hz) fente(G, a + (a < cx ? -ep / 2 - 0.02 : ep / 2 + 0.02), 6, b + (e - b) * t, Math.PI / 2);
        else if (b > d / 2) fente(G, a + (c - a) * t, 6, b + ep / 2 + 0.02);
      }
    }
    // les quatre énormes tours d'angle : talus, fût, mâchicoulis, créneaux, toit en poivrière, archères, drapeau
    const TOIT = M({ map: TX.ardoise('#1e1c24') });
    for (const [tx, tz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) {
      G.add(at(cylUV(r + 0.6, r + 1.0, 1.6, PT), tx, 0.8, tz));
      G.add(at(cylUV(r, r, Ht, PD), tx, Ht / 2, tz));
      G.add(at(cylUV(r + 0.45, r, 0.7, PT), tx, Ht + 0.1, tz));
      for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; G.add(at(boite(0.2, 0.6, 0.2, PT), tx + Math.cos(a) * (r + 0.2), Ht - 0.45, tz + Math.sin(a) * (r + 0.2))); }
      G.add(at(cylUV(r + 0.45, r + 0.45, 0.4, P), tx, Ht + 0.65, tz));
      couronne(G, tx, tz, r + 0.45, Ht + 0.85, P, 0.9, 22);
      const toit = coneUV(r - 0.2, 5.5, TOIT, 20); G.add(at(toit, tx, Ht + 0.85 + 2.75, tz));
      drapeau(G, tx, Ht + 6.2, tz, '#7a1a22');
      for (let e = 0; e < 3; e++) for (const a of [Math.PI / 2, tx < cx ? Math.PI : 0]) fente(G, tx + Math.cos(a) * (r + 0.02), 4 + e * 4, tz + Math.sin(a) * (r + 0.02), -a + Math.PI / 2, 1.1);
    }
    // le châtelet : deux tours en demi-lune, la porte voûtée, la herse levée, le pont-levis abaissé sur les douves
    const gr = 1.9, gh = 14;
    for (const s of [-1, 1]) {
      const gx = cx + s * 2.6;
      G.add(at(cylUV(gr, gr + 0.3, gh, PD), gx, gh / 2, z1 + 0.3));
      G.add(at(cylUV(gr + 0.35, gr, 0.5, PT), gx, gh, z1 + 0.3));
      couronne(G, gx, z1 + 0.3, gr + 0.35, gh + 0.25, P, 0.8, 14);
      for (let e = 0; e < 2; e++) fente(G, gx, 5 + e * 4, z1 + 0.3 + gr + 0.02);
      drapeau(G, gx, gh + 1, z1 + 0.3, '#2a3a7a', 2.0);
    }
    G.add(at(boite(5.2, gh - 2, 2.4, P), cx, (gh - 2) / 2, z1 + 0.2));
    creneaux(G, cx - 2.6, z1 + 1.35, cx + 2.6, z1 + 1.35, gh - 2, P);
    const pw = 3.0, ph = 5.0;
    reperePorte(G, cx, 0.35, z1 + 1.4, pw, ph);
    G.add(at(boite(pw, ph, 0.05, SOMBRE), cx, 0.35 + ph / 2, z1 + 1.42));
    G.add(at(new THREE.Mesh(new THREE.CircleGeometry(pw / 2, 16, 0, Math.PI), SOMBRE), cx, 0.35 + ph, z1 + 1.42));
    for (let k = 0; k < 7; k++) G.add(at(new THREE.Mesh(new THREE.CircleGeometry(0.3, 6), PT), cx + Math.cos(k / 6 * Math.PI) * (pw / 2 + 0.25), 0.35 + ph + Math.sin(k / 6 * Math.PI) * (pw / 2 + 0.25), z1 + 1.43));
    for (let i = 0; i < 6; i++) G.add(at(boite(0.08, 1.0, 0.08, FER), cx - pw / 2 + 0.25 + i * (pw - 0.5) / 5, 0.35 + ph + 0.3, z1 + 1.46));   // la herse, levée
    G.add(at(boite(pw - 0.2, 0.08, 0.08, FER), cx, 0.35 + ph - 0.18, z1 + 1.46));
    // le pont-levis, posé sur les douves, et ses deux chaînes
    const zp0 = z1 + 1.4, zp1 = d - 0.05, Lp = zp1 - zp0;
    G.add(at(boite(pw, 0.22, Lp, BOIS), cx, 0.25, (zp0 + zp1) / 2));
    for (let k = 0; k < 5; k++) G.add(at(boite(pw + 0.06, 0.06, 0.1, FER), cx, 0.38, zp0 + 0.4 + k * (Lp - 0.6) / 4));
    for (const s of [-1, 1]) {
      const ax = cx + s * (pw / 2 - 0.1), y0 = 0.35 + ph + 1.2, yb = 0.4, L = Math.hypot(Lp - 0.2, y0 - yb), c = cyl(0.04, 0.04, L, FER, 5);
      c.rotation.x = -Math.atan2(Lp - 0.2, y0 - yb); G.add(at(c, ax, (y0 + yb) / 2, zp0 + (Lp - 0.2) / 2));
    }
    // le donjon carré au centre, ses quatre tourelles, et la plate-forme du sommet
    const kx = cx, kz = (z0 + z1) / 2 - 0.5, kw = 8.5, kh = 22;
    G.add(at(boite(kw + 0.8, 1.4, kw + 0.8, PT), kx, 0.7, kz));
    G.add(at(boite(kw, kh, kw, PD), kx, kh / 2, kz));
    for (let y = 5; y < kh; y += 5) G.add(at(boite(kw + 0.2, 0.25, kw + 0.2, PT), kx, y, kz));
    for (let e = 0; e < 4; e++) for (const dx of [-2, 0, 2]) fente(G, kx + dx, 3 + e * 5, kz + kw / 2 + 0.02, 0, 1.2);
    G.add(at(boite(kw + 0.6, 0.4, kw + 0.6, PT), kx, kh + 0.2, kz));
    for (const [a, b, c, e] of [[-1, -1, 1, -1], [-1, 1, 1, 1], [-1, -1, -1, 1], [1, -1, 1, 1]])
      creneaux(G, kx + a * (kw / 2 + 0.05), kz + b * (kw / 2 + 0.05), kx + c * (kw / 2 + 0.05), kz + e * (kw / 2 + 0.05), kh + 0.4, PD, 0.9, 0.45, 0.7);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const tx = kx + sx * kw / 2, tz = kz + sz * kw / 2;
      G.add(at(cylUV(1.1, 1.1, 4.2, PD, 14), tx, kh + 2.1, tz));
      couronne(G, tx, tz, 1.3, kh + 4.2, PD, 0.6, 10);
      G.add(at(coneUV(1.2, 2.6, TOIT, 14), tx, kh + 4.2 + 1.3, tz));
    }
    // dans la cour : deux appentis contre les courtines, un puits
    for (const s of [-1, 1]) {
      const ax = cx + s * 7.6;
      G.add(at(boite(4.2, 2.4, 2.4, M({ map: TX.planches ? TX.planches('#8a6a4a') : null })), ax, 1.6, z0 + ep / 2 + 1.2));
      const t = boite(4.6, 0.15, 3.0, TOIT); t.rotation.x = 0.35; G.add(at(t, ax, 3.1, z0 + ep / 2 + 1.3));
    }
    G.add(at(cylUV(0.7, 0.7, 0.8, PT, 12), cx + 6.5, 0.8, kz + 3));
    return G;
  };

  /* ---------------------------------------------------------------- vus de la cour du château */
  // une des quatre tours d'angle, vue de la cour (5 × 6) : fût de pierre noire, porte cloutée en arc, archères,
  // mâchicoulis, créneaux, toit en poivrière ; casse : le haut s'est effondré (moignon déchiqueté, gravats)
  B.tourCour = ({ casse = false, prison = false } = {}) => {
    const G = new THREE.Group(), w = 5, d = 6, cx = w / 2, cz = 2.6, r = 2.35, Ht = casse ? 9 : 15;
    const PD = M({ map: grosBloc('#343238', 2) }), PT = M({ map: grosBloc('#25232a', 1) }), P = M({ map: grosBloc('#2e2c32', 0) });
    const TOIT = M({ map: TX.ardoise('#1e1c24') }), SOMBRE = COL('#141218'), BOIS = COL('#4a3020'), FER = COL('#3a3a42');
    G.add(at(cylUV(r + 0.15, r + 0.3, 0.6, PT), cx, 0.3, cz));
    G.add(at(cylUV(r, r, Ht, PD), cx, Ht / 2, cz));
    if (!casse) {
      G.add(at(cylUV(r + 0.35, r, 0.6, PT), cx, Ht + 0.1, cz));
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; G.add(at(boite(0.18, 0.5, 0.18, PT), cx + Math.cos(a) * (r + 0.15), Ht - 0.35, cz + Math.sin(a) * (r + 0.15))); }
      G.add(at(cylUV(r + 0.35, r + 0.35, 0.35, P), cx, Ht + 0.55, cz));
      couronne(G, cx, cz, r + 0.35, Ht + 0.72, P, 0.8, 16);
      G.add(at(coneUV(r - 0.1, 4.2, TOIT, 18), cx, Ht + 0.72 + 2.1, cz));
      drapeau(G, cx, Ht + 4.6, cz, prison ? '#1a1a1a' : '#7a1a22', 1.8);
    } else {
      // le sommet effondré : des blocs de hauteurs inégales, un trou noir, des gravats au pied
      for (let i = 0; i < 14; i++) {
        const a = i / 14 * Math.PI * 2, h = 0.4 + hash(i, 0, 99) * 2.4;
        const b = boite(1.1, h, 0.7, PD); b.rotation.y = -a + Math.PI / 2; G.add(at(b, cx + Math.cos(a) * (r - 0.3), Ht + h / 2, cz + Math.sin(a) * (r - 0.3)));
      }
      G.add(at(cylUV(r - 0.65, r - 0.65, 0.05, SOMBRE), cx, Ht + 0.02, cz));
      for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25 + hash(i, 1, 99) * 0.3, 0), PT); m.castShadow = true; G.add(at(m, cx - 2 + hash(i, 2, 99) * 4, 0.2, cz + r + 0.6 + hash(i, 3, 99) * 1.2)); }
      const p = boite(1.6, 0.12, 0.3, BOIS); p.rotation.z = 0.5; G.add(at(p, cx + 1.4, Ht + 0.5, cz + 1.0));   // une poutre qui dépasse
    }
    for (let e = 0; e < (casse ? 2 : 3); e++) fente(G, cx + (e % 2 ? 0.9 : -0.9), 4 + e * 3.5, cz + r * 0.92 + 0.02, 0, 1.0);
    if (prison) for (const dx of [-1.0, 1.0]) for (let i = 0; i < 3; i++) G.add(at(boite(0.04, 0.7, 0.04, FER), cx + dx - 0.2 + i * 0.2, 6.5, cz + r * 0.95));
    // la porte : arc de pierre, vantail de bois clouté
    const pw = 1.3, ph = 2.1, zp = cz + r + 0.32;
    G.add(at(boite(pw + 0.9, ph + 1.0, 0.5, PD), cx, (ph + 1.0) / 2, zp - 0.26));   // avant-corps de la porte
    reperePorte(G, cx, 0, zp, pw, ph);
    G.add(at(boite(pw, ph, 0.05, BOIS), cx, ph / 2, zp));
    G.add(at(new THREE.Mesh(new THREE.CircleGeometry(pw / 2, 12, 0, Math.PI), BOIS), cx, ph, zp));
    for (let i = 0; i < 9; i++) G.add(at(boite(0.07, 0.07, 0.04, FER), cx - 0.4 + (i % 3) * 0.4, 0.4 + Math.floor(i / 3) * 0.55, zp + 0.04));
    for (let k = 0; k < 7; k++) G.add(at(boite(0.32, 0.26, 0.22, PT), cx + Math.cos(k / 6 * Math.PI) * (pw / 2 + 0.16), ph + Math.sin(k / 6 * Math.PI) * (pw / 2 + 0.16), zp - 0.02));
    for (const s of [-1, 1]) { G.add(at(boite(0.14, 0.4, 0.14, FER), cx + s * 0.95, 1.6, zp + 0.08)); G.add(at(boite(0.12, 0.2, 0.12, LUM('#ffb050', '#a04000')), cx + s * 0.95, 1.9, zp + 0.1)); }
    return G;
  };
  // le donjon central vu de la cour (11 × 8) : grosse tour carrée, perron, grande porte à deux battants ferrés,
  // bannières, quatre tourelles d'angle, créneaux
  B.donjonCour = () => {
    const G = new THREE.Group(), w = 11, d = 8, cx = w / 2, zf = 6.2, kw = 9, kd = 5.6, kh = 18;
    const PD = M({ map: grosBloc('#343238', 2) }), PT = M({ map: grosBloc('#25232a', 1) }), TOIT = M({ map: TX.ardoise('#1e1c24') });
    const BOIS = COL('#3e2818'), FER = COL('#3a3a42'), SOMBRE = COL('#141218');
    const kz = zf - kd / 2;
    G.add(at(boite(kw + 0.6, 1.2, kd + 0.6, PT), cx, 0.6, kz));
    G.add(at(boite(kw, kh, kd, PD), cx, kh / 2, kz));
    for (let y = 4.5; y < kh; y += 4.5) G.add(at(boite(kw + 0.2, 0.22, kd + 0.2, PT), cx, y, kz));
    G.add(at(boite(kw + 0.5, 0.35, kd + 0.5, PT), cx, kh + 0.15, kz));
    creneaux(G, cx - kw / 2 - 0.1, zf + 0.15, cx + kw / 2 + 0.1, zf + 0.15, kh + 0.3, PD, 0.8, 0.45, 0.6);
    for (const sx of [-1, 1]) {
      const tx = cx + sx * kw / 2, tz = zf - 0.2;
      G.add(at(cylUV(0.9, 0.9, 3.4, PD, 14), tx, kh + 1.7, tz));
      couronne(G, tx, tz, 1.05, kh + 3.4, PD, 0.5, 10);
      G.add(at(coneUV(0.95, 2.2, TOIT, 14), tx, kh + 3.4 + 1.1, tz));
    }
    for (let e = 0; e < 3; e++) for (const dx of [-2.6, 2.6]) fente(G, cx + dx, 6 + e * 4, zf + 0.02, 0, 1.2);
    // grande baie haute, à vitrail sombre
    G.add(at(boite(1.4, 2.6, 0.05, SOMBRE), cx, 10.5, zf + 0.01));
    G.add(at(new THREE.Mesh(new THREE.CircleGeometry(0.7, 12, 0, Math.PI), LUM('#802030', '#300810')), cx, 11.8, zf + 0.02));
    // perron et grande porte
    for (let k = 0; k < 3; k++) G.add(at(boite(4.4 - k * 0.6, 0.2, 0.5, PT), cx, 0.1 + k * 0.2, zf + 1.3 - k * 0.45));
    const pw = 2.2, ph = 3.2;
    reperePorte(G, cx, 0.6, zf, pw, ph);
    for (const s of [-1, 1]) {
      G.add(at(boite(pw / 2 - 0.03, ph, 0.08, BOIS), cx + s * pw / 4, 0.6 + ph / 2, zf + 0.04));
      for (const k of [0.25, 0.55, 0.85]) G.add(at(boite(pw / 2 - 0.1, 0.1, 0.05, FER), cx + s * pw / 4, 0.6 + ph * k, zf + 0.1));
      G.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 6, 10), FER), cx + s * 0.22, 0.6 + ph * 0.45, zf + 0.12));
    }
    G.add(at(new THREE.Mesh(new THREE.CircleGeometry(pw / 2, 14, 0, Math.PI), BOIS), cx, 0.6 + ph, zf + 0.03));
    for (let k = 0; k < 9; k++) G.add(at(boite(0.36, 0.3, 0.24, PT), cx + Math.cos(k / 8 * Math.PI) * (pw / 2 + 0.18), 0.6 + ph + Math.sin(k / 8 * Math.PI) * (pw / 2 + 0.18), zf));
    // deux bannières noir et rouge, deux braseros
    for (const s of [-1, 1]) {
      G.add(at(boite(0.9, 3.0, 0.04, COL('#5a1018')), cx + s * 2.6, 5.4, zf + 0.04));
      G.add(at(boite(0.5, 0.5, 0.05, COL('#141012')), cx + s * 2.6, 5.9, zf + 0.06));
      G.add(at(cylUV(0.3, 0.18, 0.4, FER, 8), cx + s * 2.9, 1.2, zf + 1.2));
      G.add(at(cylUV(0.06, 0.06, 1.0, FER, 6), cx + s * 2.9, 0.5, zf + 1.2));
      G.add(at(new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 6), LUM('#ff9a30', '#c04000')), cx + s * 2.9, 1.6, zf + 1.2));
    }
    return G;
  };

  // le toit du donjon central (15 × 12) : terrasse de dalles noires, parapet crénelé, deux tourelles au fond,
  // braseros, cercle d'invocation rouge au fond (là où le dragon se pose), trappe de l'escalier devant
  B.toitDonjon = () => {
    const G = new THREE.Group(), w = 15, d = 12;
    const PD = M({ map: grosBloc('#343238', 2) }), PT = M({ map: grosBloc('#25232a', 1) }), TOIT = M({ map: TX.ardoise('#1e1c24') });
    const FER = COL('#3a3a42'), SOMBRE = COL('#0c0a10'), ROUGE = LUM('#ff3030', '#a00010');
    const td = dalles('#2a2830');
    const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * d);
    const sol = new THREE.Mesh(g, M({ map: td })); sol.receiveShadow = true; G.add(at(sol, w / 2, 0, d / 2));
    // parapet : haut au fond et sur les côtés, bas devant pour qu'on voie la terrasse
    G.add(at(boite(w, 1.1, 0.6, PD), w / 2, 0.55, 0.3));
    for (const x of [0.3, w - 0.3]) G.add(at(boite(0.6, 1.1, d, PD), x, 0.55, d / 2));
    G.add(at(boite(w, 0.45, 0.5, PD), w / 2, 0.22, d - 0.25));
    creneaux(G, 0, 0.3, w, 0.3, 1.1, PD, 0.6, 0.6, 0.55);
    creneaux(G, 0.3, 0, 0.3, d, 1.1, PD, 0.6, 0.6, 0.55);
    creneaux(G, w - 0.3, 0, w - 0.3, d, 1.1, PD, 0.6, 0.6, 0.55);
    // deux tourelles au fond
    for (const x of [1.2, w - 1.2]) {
      G.add(at(cylUV(1.2, 1.25, 4.2, PD, 16), x, 2.1, 1.2));
      couronne(G, x, 1.2, 1.35, 4.2, PD, 0.6, 12);
      G.add(at(coneUV(1.3, 2.8, TOIT, 16), x, 4.2 + 1.4, 1.2));
      fente(G, x, 2.6, 1.2 + 1.24, 0, 1.0);
    }
    // cercle d'invocation : anneau rouge et runes, dalles fendues
    const anneau = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.08, 4, 40), ROUGE); anneau.rotation.x = Math.PI / 2; G.add(at(anneau, w / 2, 0.03, 3.6));
    const anneau2 = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.05, 4, 32), ROUGE); anneau2.rotation.x = Math.PI / 2; G.add(at(anneau2, w / 2, 0.03, 3.6));
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * Math.PI * 2, r = boite(0.22, 0.02, 0.42, ROUGE); r.rotation.y = -a;
      G.add(at(r, w / 2 + Math.cos(a) * 2.05, 0.03, 3.6 + Math.sin(a) * 2.05));
    }
    for (const [x, z, l, a] of [[4.6, 5.4, 1.4, 0.6], [10.2, 4.9, 1.2, -0.5], [6.1, 1.6, 0.9, 1.2]]) {
      const f = boite(l, 0.02, 0.06, SOMBRE); f.rotation.y = a; G.add(at(f, x, 0.02, z));
    }
    // braseros le long des côtés
    for (const x of [1.4, w - 1.4]) for (const z of [4.5, 8.5]) {
      G.add(at(cylUV(0.07, 0.07, 0.9, FER, 6), x, 0.45, z));
      G.add(at(cylUV(0.38, 0.2, 0.35, FER, 8), x, 1.0, z));
      G.add(at(new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.6, 6), LUM('#ff9a30', '#c04000')), x, 1.45, z));
    }
    // bannières sur le parapet du fond
    for (const x of [4.2, w - 4.2]) {
      G.add(at(boite(0.9, 1.6, 0.04, COL('#5a1018')), x, 1.9, 0.62));
      G.add(at(boite(0.45, 0.45, 0.05, COL('#141012')), x, 2.1, 0.64));
      G.add(at(cylUV(0.04, 0.04, 2.0, FER, 6), x, 1.9, 0.58));
    }
    // trappe de l'escalier, devant
    G.add(at(boite(2.0, 0.04, 1.4, SOMBRE), w / 2, 0.02, d - 1.6));
    G.add(at(boite(2.2, 0.12, 0.12, PT), w / 2, 0.06, d - 2.35));
    G.add(at(boite(2.2, 0.12, 0.12, PT), w / 2, 0.06, d - 0.85));
    return G;
  };

  /* ---------------------------------------------------------------- le Donjon des Miroirs (11 × 7) */
  // palais de marbre blanc sur la neige : colonnes de cristal, hauts miroirs entre elles, grand miroir rond au-dessus
  // de la porte, fronton en pointe de cristal, toit enneigé et bouquet de cristaux, deux obélisques de glace devant
  const miroirTex = () => tex('miroirSalle', D, D * 2, (g, px, w, h) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const t = y / h, b = ((x + y * 0.55) / (w * 0.9)) % 1;
      let c = mix('#cfe6f4', -0.35 * t + 0.08);
      if (b > 0.18 && b < 0.26) c = mix('#ffffff', -0.05 * t);
      else if (b > 0.32 && b < 0.35) c = mix('#eaf6fc', -0.1 * t);
      px(x, y, c);
    }
  });
  B.templeMiroirs = () => {
    const G = new THREE.Group(), w = 11, cx = w / 2, zf = 5.2;
    const MB = M({ map: marbre('#eef0f4') }), MG = M({ map: marbre('#c4cad6') }), MC = M({ map: marbre('#dde1ea') });
    const NEIGE = COL('#f8fbff'), MIR = M({ map: miroirTex(), emissive: new THREE.Color('#1c2c3a') });
    const CRI = new THREE.MeshStandardMaterial({ color: '#bfe9ff', emissive: '#2a6a8a', emissiveIntensity: 0.5, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.88 });
    const ARG = COL('#aab2c4');
    // soubassement et marches enneigées
    G.add(at(boite(w - 0.4, 0.7, zf - 0.6, MG), cx, 0.35, (zf + 0.6) / 2));
    for (let k = 0; k < 3; k++) {
      G.add(at(boite(4.2 - k * 0.3, 0.7 - k * 0.22, 0.42, MG), cx, (0.7 - k * 0.22) / 2, zf + 0.2 + k * 0.42));
      G.add(at(boite(4.2 - k * 0.3, 0.05, 0.3, NEIGE), cx - 0.2, 0.7 - k * 0.22 + 0.02, zf + 0.18 + k * 0.42));
    }
    // le corps
    const y0 = 0.7, H = 4.0, zw = zf - 0.55;
    G.add(at(boite(w - 1.0, H, zf - 1.4, MB), cx, y0 + H / 2, (zf - 1.4) / 2 + 0.85));
    G.add(at(boite(w - 0.7, 0.3, zf - 1.1, MC), cx, y0 + H + 0.15, (zf - 1.4) / 2 + 0.85));
    G.add(at(boite(w - 0.6, 0.12, zf - 1.0, NEIGE), cx, y0 + H + 0.36, (zf - 1.4) / 2 + 0.85));
    // colonnes de cristal et hauts miroirs cintrés
    const xs = [1.1, 2.6, 4.0, 7.0, 8.4, 9.9];
    for (const x of xs) {
      G.add(at(boite(0.6, 0.25, 0.6, MC), x, y0 + 0.12, zw + 0.25));
      G.add(at(cylUV(0.22, 0.22, H - 0.5, CRI, 6), x, y0 + 0.25 + (H - 0.5) / 2, zw + 0.25));
      G.add(at(boite(0.6, 0.25, 0.6, MC), x, y0 + H - 0.12, zw + 0.25));
    }
    for (const x of [1.85, 3.3, 7.7, 9.15]) {
      G.add(at(boite(0.95, 2.4, 0.04, MIR), x, y0 + 1.6, zw + 0.03));
      G.add(at(new THREE.Mesh(new THREE.CircleGeometry(0.475, 14, 0, Math.PI), MIR), x, y0 + 2.8, zw + 0.03));
      G.add(at(boite(1.1, 0.12, 0.12, ARG), x, y0 + 0.35, zw + 0.06));
    }
    // la porte d'argent, et le grand miroir rond au-dessus
    const pw = 1.6, ph = 2.2;
    reperePorte(G, cx, y0, zw, pw, ph);
    G.add(at(boite(pw, ph, 0.05, COL('#8a93a8')), cx, y0 + ph / 2, zw + 0.03));
    G.add(at(boite(0.05, ph, 0.07, COL('#3a4054')), cx, y0 + ph / 2, zw + 0.06));
    for (const sx of [-1, 1]) G.add(at(boite(0.5, 1.4, 0.04, MIR), cx + sx * 0.4, y0 + 1.4, zw + 0.07));
    for (const sx of [-1, 1]) G.add(at(boite(0.22, ph + 0.3, 0.2, MC), cx + sx * (pw / 2 + 0.11), y0 + (ph + 0.3) / 2, zw + 0.1));
    G.add(at(boite(pw + 0.6, 0.25, 0.22, MC), cx, y0 + ph + 0.4, zw + 0.1));
    const yc = y0 + ph + 1.2;
    const rond = new THREE.Mesh(new THREE.CircleGeometry(0.55, 28), MIR); G.add(at(rond, cx, yc, zw + 0.06));
    const cercle = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.08, 6, 28), ARG); G.add(at(cercle, cx, yc, zw + 0.08));
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, r = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.25, 4), CRI); r.rotation.z = a - Math.PI / 2; G.add(at(r, cx + Math.cos(a) * 0.82, yc + Math.sin(a) * 0.82, zw + 0.08)); }
    // fronton en pointe au-dessus du pavillon central
    fronton(G, cx, y0 + H + 0.42, zw + 0.3, 4.4, 1.6, 1.2, MB);
    const losange = boite(0.55, 0.55, 0.04, MIR); losange.rotation.z = Math.PI / 4; G.add(at(losange, cx, y0 + H + 0.95, zw + 0.32));
    for (const sx of [-1, 1]) { const n = boite(2.5, 0.12, 1.25, NEIGE); n.rotation.z = -sx * Math.atan2(1.6, 2.2); G.add(at(n, cx + sx * 1.1, y0 + H + 1.27, zw - 0.3)); }
    // bouquet de cristaux sur le toit
    const cristal = (x, y, z, r, h, a) => { const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), CRI); c.rotation.z = a; c.castShadow = true; G.add(at(c, x, y + h / 2, z)); };
    const yr = y0 + H + 0.4, zr = (zf - 1.4) / 2 + 0.6;
    cristal(cx, yr, zr, 0.5, 2.4, 0); cristal(cx - 0.65, yr, zr + 0.2, 0.32, 1.5, 0.3); cristal(cx + 0.7, yr, zr + 0.1, 0.34, 1.6, -0.28);
    cristal(cx - 0.3, yr, zr - 0.5, 0.3, 1.6, 0.15); cristal(cx + 0.4, yr, zr - 0.45, 0.28, 1.4, -0.2);
    for (const x of [1.4, w - 1.4]) { cristal(x, yr, zr, 0.3, 1.5, 0); cristal(x + 0.35, yr, zr + 0.2, 0.2, 0.9, -0.3); }
    // deux obélisques de glace au pied des marches
    for (const sx of [-1, 1]) {
      const ox = cx + sx * 3.3, oz = zf + 1.2;
      G.add(at(boite(0.8, 0.5, 0.8, MG), ox, 0.25, oz));
      G.add(at(boite(0.8, 0.06, 0.8, NEIGE), ox, 0.52, oz));
      const ob = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 2.4, 4), CRI); ob.rotation.y = Math.PI / 4; G.add(at(ob, ox, 0.55 + 1.2, oz));
      const p = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.4, 4), CRI); p.rotation.y = Math.PI / 4; G.add(at(p, ox, 0.55 + 2.6, oz));
    }
    return G;
  };

  /* ---------------------------------------------------------------- le Sanctuaire des Trois Voies (9 × 7) */
  B.voiesSanctuaire = () => {
    const G = new THREE.Group(), w = 9, d = 7, cx = w / 2, zf = 5.0;
    const RC = COL('#7a746c'), TA = M({ map: marbre('#a8a29a') }), SOMBRE = COL('#141218');
    const rocher = (x, y, z, r, k, sy = 0.75) => {
      const g = new THREE.DodecahedronGeometry(r, 0), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const X = p.getX(i), Y = p.getY(i), Z = p.getZ(i), f = 0.82 + hash(Math.round(X * 97 + Z * 31), Math.round(Y * 89), k + 80) * 0.3; p.setXYZ(i, X * f, Y * f * sy, Z * f); }
      g.computeVertexNormals(); const m = new THREE.Mesh(g, RC); m.castShadow = m.receiveShadow = true; m.rotation.y = hash(k, 0, 81) * 6; G.add(at(m, x, y, z));
    };
    // le rocher : une masse arrondie, la façade taillée en plat sur le devant
    // de gros blocs de roche entassés autour d'un noyau, plus hauts au milieu
    G.add(at(boite(w - 2.4, 4.0, zf - 2.0, RC), cx, 2.0, (zf + 1.6) / 2));
    for (let i = 0; i < 7; i++) {
      const x = 0.9 + i * (w - 1.8) / 6, hm = 4.6 - Math.abs(x - cx) * 0.35;
      rocher(x, hm - 0.4, 2.4 + hash(i, 2, 82) * 1.0, 1.25 + hash(i, 3, 82) * 0.35, i, 0.9);
      rocher(x + 0.4, hm * 0.45, 2.0 + hash(i, 4, 82), 1.3, i + 30, 1.0);
    }
    for (const [x, k] of [[0.8, 20], [w - 0.8, 21]]) { rocher(x, 1.1, zf - 0.6, 1.2, k, 1.0); rocher(x, 2.6, zf - 1.1, 1.0, k + 5, 0.9); }
    G.add(at(boite(5.2, 4.2, 0.3, TA), cx, 2.1, zf - 0.1));
    // la porte : encadrement, linteau, trois marches
    const pw = 1.3, ph = 2.2;
    reperePorte(G, cx, 0.45, zf, pw, ph);
    G.add(at(boite(pw, ph, 0.05, SOMBRE), cx, 0.45 + ph / 2, zf + 0.06));
    for (const s of [-1, 1]) G.add(at(boite(0.3, ph + 0.2, 0.3, TA), cx + s * (pw / 2 + 0.15), 0.45 + (ph + 0.2) / 2, zf + 0.12));
    G.add(at(boite(pw + 1.0, 0.35, 0.4, TA), cx, 0.45 + ph + 0.35, zf + 0.15));
    for (let k = 0; k < 3; k++) G.add(at(boite(2.4 + (2 - k) * 0.5, 0.15, 0.4, TA), cx, 0.075 + k * 0.15, zf + 1.1 - k * 0.35));
    // trois niches au-dessus de la porte, une flamme pâle dans chacune : les trois voies
    for (const [dx, c] of [[-1.3, '#f0a050'], [0, '#a0d0f0'], [1.3, '#b0e090']]) {
      G.add(at(boite(0.6, 0.8, 0.06, SOMBRE), cx + dx, 3.35, zf + 0.06));
      G.add(at(new THREE.Mesh(new THREE.CircleGeometry(0.3, 10, 0, Math.PI), SOMBRE), cx + dx, 3.75, zf + 0.06));
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.3, 6), LUM(c, c)); G.add(at(f, cx + dx, 3.25, zf + 0.12));
      G.add(at(boite(0.7, 0.08, 0.2, TA), cx + dx, 2.92, zf + 0.12));
    }
    // deux lanternes de pierre sur la dernière marche
    for (const s of [-1, 1]) {
      const lx = cx + s * 2.2, lz = zf + 1.0;
      G.add(at(boite(0.4, 0.9, 0.4, TA), lx, 0.45, lz));
      G.add(at(boite(0.5, 0.45, 0.5, LUM('#f4e0b0', '#806030')), lx, 1.12, lz));
      G.add(at(coneUV(0.45, 0.4, TA, 4), lx, 1.55, lz));
    }
    // de la mousse et quelques herbes sur le rocher
    for (let i = 0; i < 7; i++) { const x = 1.0 + i * 1.15, m = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), COL(i % 2 ? '#4a7a3a' : '#5e8c44')); m.scale.y = 0.45; G.add(at(m, x, 4.6 - Math.abs(x - cx) * 0.35 + 0.55, 2.6 + hash(i, 5, 82) * 0.8)); }
    return G;
  };

  /* ---------------------------------------------------------------- le musée à l'antique (17 × 9) */
  B.museeAntique = () => {
    const G = new THREE.Group(), w = 17, d = 9, cx = w / 2, zf = 6.4;
    const MB = M({ map: marbre('#e4e2de') }), MG = M({ map: marbre('#bcbab8') }), MC = M({ map: marbre('#d0cec8') });
    const VERRE = M({ map: TX.verre ? TX.verre() : null, color: TX.verre ? undefined : new THREE.Color('#6a8aa0') }), SOMBRE = COL('#24262c');
    // soubassement gris, grand escalier sur toute la largeur du portique
    G.add(at(boite(w - 0.6, 0.9, zf - 0.8, MG), cx, 0.45, (zf + 0.8) / 2));
    for (let k = 0; k < 5; k++) G.add(at(boite(8.4 + (4 - k) * 0.25, 0.9 - k * 0.18, 0.4, MG), cx, (0.9 - k * 0.18) / 2, zf + 0.2 + k * 0.4));
    // le corps : deux ailes et le pavillon central, en retrait du portique
    const y0 = 0.9, H = 5.2;
    G.add(at(boite(w - 1.0, H, zf - 1.6, MB), cx, y0 + H / 2, (zf + 1.0) / 2 - 0.3));
    G.add(at(boite(w - 0.8, 0.35, zf - 1.4, MC), cx, y0 + H + 0.17, (zf + 1.0) / 2 - 0.3));            // corniche
    G.add(at(boite(w - 1.2, 0.6, zf - 1.8, MB), cx, y0 + H + 0.65, (zf + 1.0) / 2 - 0.3));             // attique
    // les ailes : pilastres et hautes fenêtres cintrées
    const zw = zf - 0.6 + 0.01;
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
      const fx = cx + s * (5.2 + i * 1.3);
      G.add(at(boite(0.7, 2.4, 0.03, VERRE), fx, y0 + 2.4, zw + 0.02));
      G.add(at(new THREE.Mesh(new THREE.CircleGeometry(0.35, 12, 0, Math.PI), VERRE), fx, y0 + 3.6, zw + 0.02));
      G.add(at(boite(0.9, 0.12, 0.2, MC), fx, y0 + 1.15, zw + 0.08));
      G.add(at(boite(0.24, H - 0.4, 0.14, MC), fx + 0.65, y0 + H / 2, zw + 0.06));
    }
    for (const s of [-1, 1]) G.add(at(boite(0.3, H, 0.16, MC), cx + s * 4.55, y0 + H / 2, zw + 0.06));
    // la frise : une bande gris clair et des triglyphes
    G.add(at(boite(w - 0.9, 0.5, 0.06, MG), cx, y0 + H - 0.4, zw + 0.06));
    for (let x = 1.0; x < w - 0.8; x += 0.6) G.add(at(boite(0.18, 0.4, 0.04, MC), x, y0 + H - 0.4, zw + 0.1));
    // le portique : huit colonnes cannelées, architrave, frise, fronton sculpté
    const zp = zf + 0.05, nc = 8, pw0 = 8.0, ch = H + 0.1;
    G.add(at(boite(pw0 + 0.8, 0.25, 2.0, MG), cx, y0 + 0.12, zp - 0.6));
    for (let i = 0; i < nc; i++) {
      const x = cx - pw0 / 2 + i * pw0 / (nc - 1);
      G.add(at(boite(0.62, 0.22, 0.62, MC), x, y0 + 0.36, zp));
      G.add(at(cylUV(0.24, 0.27, ch - 0.7, MB, 14), x, y0 + 0.47 + (ch - 0.7) / 2, zp));
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; G.add(at(boite(0.035, ch - 0.8, 0.035, MG), x + Math.cos(a) * 0.25, y0 + 0.47 + (ch - 0.7) / 2, zp + Math.sin(a) * 0.25)); }
      G.add(at(boite(0.66, 0.24, 0.66, MC), x, y0 + ch - 0.12, zp));
    }
    G.add(at(boite(pw0 + 1.0, 0.45, 2.0, MC), cx, y0 + ch + 0.22, zp - 0.6));
    G.add(at(boite(pw0 + 1.1, 0.4, 2.1, MG), cx, y0 + ch + 0.65, zp - 0.6));
    G.add(at(boite(pw0 + 1.3, 0.18, 2.2, MC), cx, y0 + ch + 0.94, zp - 0.6));
    fronton(G, cx, y0 + ch + 1.03, zp + 0.45, pw0 + 1.3, 1.7, 2.1, MB);
    // dans le tympan : un médaillon gris et deux figures couchées
    G.add(at(new THREE.Mesh(new THREE.CircleGeometry(0.45, 18), MG), cx, y0 + ch + 1.6, zp + 0.47));
    for (const s of [-1, 1]) { const f = boite(1.4, 0.3, 0.05, MG); f.rotation.z = -s * 0.12; G.add(at(f, cx + s * 1.6, y0 + ch + 1.35, zp + 0.47)); }
    for (const s of [-1, 1]) { const r = boite(4.8, 0.14, 2.2, MC); r.rotation.z = -s * Math.atan2(1.7, (pw0 + 1.3) / 2); G.add(at(r, cx + s * 2.35, y0 + ch + 1.9, zp - 0.6)); }
    // acrotères
    for (const x of [cx - (pw0 + 1.3) / 2, cx, cx + (pw0 + 1.3) / 2]) G.add(at(boite(0.4, 0.4, 0.4, MB), x, y0 + ch + (x === cx ? 2.95 : 1.25), zp - 0.1));
    // la grande porte de bronze au fond du portique, et l'inscription au-dessus
    const pw = 1.8, ph = 3.2;
    reperePorte(G, cx, y0, zw, pw, ph);
    G.add(at(boite(pw, ph, 0.05, COL('#5a4a2a')), cx, y0 + ph / 2, zw + 0.03));
    G.add(at(boite(0.04, ph, 0.06, SOMBRE), cx, y0 + ph / 2, zw + 0.06));
    for (const s of [-1, 1]) for (const k of [0.3, 0.7]) G.add(at(boite(pw / 2 - 0.3, ph * 0.3, 0.04, COL('#6e5c34')), cx + s * pw / 4, y0 + ph * k, zw + 0.07));
    G.add(at(boite(pw + 0.6, 0.3, 0.12, MC), cx, y0 + ph + 0.2, zw + 0.06));
    G.add(at(boite(3.6, 0.36, 0.04, MG), cx, y0 + ph + 0.85, zw + 0.06));
    // le dôme de cuivre vert, sur un tambour à fenêtres, et sa lanterne
    const dz = (zf + 1.0) / 2 - 0.6, yt = y0 + H + 0.95;
    G.add(at(cylUV(2.0, 2.0, 1.2, MB, 20), cx, yt + 0.6, dz));
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; if (Math.sin(a) < -0.2) continue; const f = boite(0.25, 0.6, 0.05, SOMBRE); f.rotation.y = -a + Math.PI / 2; G.add(at(f, cx + Math.cos(a) * 2.02, yt + 0.6, dz + Math.sin(a) * 2.02)); }
    G.add(at(cylUV(2.2, 2.2, 0.2, MC, 20), cx, yt + 1.25, dz));
    const dome = new THREE.Mesh(new THREE.SphereGeometry(2.05, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M({ map: cuivre() })); dome.castShadow = true; dome.scale.y = 0.7; G.add(at(dome, cx, yt + 1.35, dz));
    G.add(at(cylUV(0.35, 0.35, 0.6, MB, 10), cx, yt + 3.0, dz));
    G.add(at(coneUV(0.45, 0.5, M({ map: cuivre() }), 10), cx, yt + 3.55, dz));
    // deux statues grises sur socles au pied de l'escalier, des vasques
    for (const s of [-1, 1]) {
      const sx = cx + s * 5.6, sz = zf + 1.4;
      G.add(at(boite(1.0, 1.2, 1.0, MG), sx, 0.6, sz));
      G.add(at(cylUV(0.22, 0.3, 1.2, MC, 10), sx, 1.8, sz)); const t = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), MC); G.add(at(t, sx, 2.6, sz));
      G.add(at(boite(0.8, 0.12, 0.2, MC), sx - s * 0.2, 2.1, sz));
      G.add(at(cylUV(0.4, 0.2, 0.35, MB, 12), cx + s * 7.4, 1.08, zf + 1.4)); G.add(at(cylUV(0.12, 0.12, 0.9, MB, 8), cx + s * 7.4, 0.45, zf + 1.4));
    }
    return G;
  };
}
