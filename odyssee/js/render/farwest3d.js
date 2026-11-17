// odyssee/js/render/farwest3d.js — la ville du Far West du labo (Poussière-Ville), même atelier que batiments3d.js.
// Bois délavé, fausses façades plus hautes que le toit, auvents sur poteaux, trottoirs de planches, enseignes peintes.
//   saloonFW  (7 × 5) : saloon à étage, balcon à balustrade, portes battantes, enseigne, lanternes, tonneaux ;
//   banqueFW  (5 × 4) : banque en briques, corniche, fenêtres à barreaux, porte blindée, coffre peint sur l'enseigne ;
//   sherifFW  (4 × 4) : bureau du shérif, étoile au fronton, fenêtre à barreaux de la cellule, avis de recherche ;
//   magasinFW (6 × 4) : magasin général, grande vitrine, caisses et sacs sous l'auvent, enseigne « MAGASIN » ;
//   maisonFW  (4 × 3) : petite maison de planches à toit de bardeaux, porche, chaise à bascule.
// Coordonnées comme les autres modèles : x de 0 à w, z de 0 à d (façade sud en z = d), y vers le haut.
import * as THREE from 'three';

export function batimentsFarWest({ B, tex, hash, mix, S, D, boite, at, M, COL, LUM, cyl, reperePorte }) {
  /* ---------------------------------------------------------------- textures */
  // planches horizontales délavées, une teinte par planche, nœuds et clous
  const planches = (col) => tex('fwPl' + col, D, D, (g, px, w, h) => {
    const ph = 6 * S;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const r = Math.floor(y / ph), ly = y % ph;
      let f = (hash(r, 0, 91) - 0.5) * 0.22 + (hash(x >> 2, y, 92) - 0.5) * 0.05;
      if (ly < S) f = -0.38; else if (ly < 2 * S) f += 0.1;
      if (hash(x >> 1, r, 93) > 0.985) f -= 0.25;
      px(x, y, mix(col, f));
    }
  });
  // planches verticales (portes, auvents)
  const lattes = (col) => tex('fwLa' + col, D, D, (g, px, w, h) => {
    const lw = 6 * S;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const k = Math.floor(x / lw), lx = x % lw;
      let f = (hash(k, 1, 94) - 0.5) * 0.2 + (hash(x, y >> 2, 95) - 0.5) * 0.05;
      if (lx < S) f = -0.38; else if (lx < 2 * S) f += 0.1;
      px(x, y, mix(col, f));
    }
  });
  const briques = (col) => tex('fwBr' + col, D, D, (g, px, w, h) => {
    const bh = 4 * S, bl = 9 * S;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const r = Math.floor(y / bh), dec = (r % 2) * bl / 2, k = Math.floor((x + dec) / bl);
      let f = (hash(k, r, 96) - 0.5) * 0.24;
      if (y % bh < S || (x + dec) % bl < S) { px(x, y, '#c8b8a0'); continue; }
      px(x, y, mix(col, f));
    }
  });
  const bardeaux = (col) => tex('fwBd' + col, D, D, (g, px, w, h) => {
    const rh = 5 * S, tw = 7 * S;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const r = Math.floor(y / rh), lx = (x + (r % 2) * tw / 2) % tw, ly = y % rh;
      let f = (hash(Math.floor((x + (r % 2) * tw / 2) / tw), r, 97) - 0.5) * 0.2;
      if (ly >= rh - S) f = -0.4; else if (lx < S) f = -0.3;
      px(x, y, mix(col, f));
    }
  });
  /** une enseigne peinte : fond, cadre, lettres capitales */
  const enseigne = (txt, fond, encre, l = 4) => tex('fwEn' + txt + fond, Math.round(l * 32 * S), Math.round(8 * S), (g, px, w, h) => {
    g.fillStyle = fond; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x++) if (hash(x >> 1, 0, 98) > 0.8) { g.fillStyle = mix(fond, -0.12); g.fillRect(x, 0, 1, h); }
    g.fillStyle = mix(fond, -0.45); g.fillRect(0, 0, w, S); g.fillRect(0, h - S, w, S); g.fillRect(0, 0, S, h); g.fillRect(w - S, 0, S, h);
    g.fillStyle = encre; g.font = `bold ${Math.round(h * 0.62)}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(txt, w / 2, h / 2 + S * 0.5);
  }, false);

  /* ---------------------------------------------------------------- outils */
  const BOIS_SOMBRE = COL('#4a3020'), SOMBRE = COL('#1c1410'), VITRE = LUM('#e8c070', '#5a3a10'), FER = COL('#2e2a28');
  /** trottoir de planches devant la façade, sur toute la largeur */
  const trottoir = (G, x0, x1, z0, z1, mat) => {
    G.add(at(boite(x1 - x0, 0.2, z1 - z0, mat), (x0 + x1) / 2, 0.1, (z0 + z1) / 2));
    for (let x = x0 + 0.15; x < x1; x += 0.9) G.add(at(boite(0.08, 0.2, 0.06, BOIS_SOMBRE), x, 0.1, z1 + 0.01));
  };
  /** auvent sur poteaux : toit de planches légèrement penché, poteaux, poutre */
  const auvent = (G, x0, x1, zf, prof, y, mat, n = 3) => {
    const t = boite(x1 - x0 + 0.2, 0.1, prof + 0.2, mat); t.rotation.x = 0.12; G.add(at(t, (x0 + x1) / 2, y, zf + prof / 2));
    G.add(at(boite(x1 - x0 + 0.1, 0.16, 0.14, BOIS_SOMBRE), (x0 + x1) / 2, y - 0.14, zf + prof));
    for (let i = 0; i < n; i++) { const x = x0 + 0.12 + i * (x1 - x0 - 0.24) / (n - 1); G.add(at(boite(0.14, y - 0.2, 0.14, BOIS_SOMBRE), x, (y - 0.2) / 2 + 0.2, zf + prof)); }
  };
  /** fenêtre à petits carreaux, encadrement de bois */
  const fenetre = (G, x, y, z, w = 0.7, h = 0.9, cadre = BOIS_SOMBRE, barreaux = false) => {
    G.add(at(boite(w, h, 0.03, VITRE), x, y, z + 0.01));
    for (const [dx, dy, ww, hh] of [[0, h / 2, w + 0.14, 0.08], [0, -h / 2, w + 0.18, 0.1], [-w / 2, 0, 0.07, h], [w / 2, 0, 0.07, h], [0, 0, 0.04, h], [0, 0, w, 0.04]])
      G.add(at(boite(ww, hh, 0.06, cadre), x + dx, y + dy, z + 0.04));
    if (barreaux) for (let i = 1; i < 5; i++) G.add(at(boite(0.03, h, 0.03, FER), x - w / 2 + i * w / 5, y, z + 0.08));
  };
  /** fausse façade : un pan plus haut que le toit, couronné d'une corniche, avec son enseigne */
  const faussefacade = (G, x0, x1, y0, y1, z, mat, corn) => {
    G.add(at(boite(x1 - x0, y1 - y0, 0.14, mat), (x0 + x1) / 2, (y0 + y1) / 2, z - 0.07));
    G.add(at(boite(x1 - x0 + 0.2, 0.14, 0.26, corn), (x0 + x1) / 2, y1 + 0.07, z - 0.04));
    for (let x = x0 + 0.3; x < x1 - 0.2; x += 0.5) G.add(at(boite(0.08, 0.1, 0.1, corn), x, y1 - 0.06, z + 0.04));
  };
  const panneau = (G, txt, x, y, z, l, fond, encre) => {
    const e = enseigne(txt, fond, encre, l);
    G.add(at(new THREE.Mesh(new THREE.PlaneGeometry(l, 0.36 * l / 1.5 > 0.9 ? 0.9 : 0.25 * l), M({ map: e })), x, y, z));
  };
  const tonneau = (G, x, z, r = 0.24) => {
    G.add(at(cyl(r, r, 0.6, COL('#7a5230'), 10), x, 0.5, z));
    for (const y of [0.32, 0.68]) G.add(at(cyl(r + 0.015, r + 0.015, 0.05, FER, 10), x, y, z));
  };
  const caisse = (G, x, y, z, s = 0.45) => {
    G.add(at(boite(s, s, s, M({ map: lattes('#a07848') })), x, y + s / 2, z));
    const b = boite(s * 1.3, 0.05, 0.04, BOIS_SOMBRE); b.rotation.z = 0.78; G.add(at(b, x, y + s / 2, z + s / 2 + 0.01));
  };

  /* ---------------------------------------------------------------- le saloon (7 × 5) */
  B.saloonFW = () => {
    const G = new THREE.Group(), w = 7, cx = w / 2, zf = 3.6, H = 4.2;
    const MUR = M({ map: planches('#b4824e') }), MUR2 = M({ map: planches('#8e5a34') }), TOIT = M({ map: lattes('#6a4a32') }), PLAN = M({ map: planches('#8a6440') });
    G.add(at(boite(w - 0.2, H, zf - 0.4, MUR), cx, H / 2, (zf + 0.4) / 2));
    const t = boite(w, 0.12, zf - 0.2, TOIT); G.add(at(t, cx, H + 0.06, (zf + 0.4) / 2));
    faussefacade(G, 0.1, w - 0.1, H - 0.2, H + 1.3, zf, MUR2, BOIS_SOMBRE);
    // fronton cintré au milieu de la fausse façade
    G.add(at(boite(2.6, 0.5, 0.14, MUR2), cx, H + 1.55, zf - 0.07));
    G.add(at(boite(2.8, 0.12, 0.24, BOIS_SOMBRE), cx, H + 1.86, zf - 0.04));
    panneau(G, 'SALOON', cx, H + 0.75, zf + 0.02, 4.4, '#e8d8a8', '#7a1a12');
    // étage : balcon sur toute la largeur, balustrade, trois portes-fenêtres
    const yb = 2.2;
    G.add(at(boite(w, 0.14, 1.2, PLAN), cx, yb, zf + 0.6));
    G.add(at(boite(w, 0.08, 0.08, BOIS_SOMBRE), cx, yb + 0.85, zf + 1.18));
    for (let x = 0.1; x <= w - 0.1; x += 0.28) G.add(at(boite(0.05, 0.75, 0.05, BOIS_SOMBRE), x, yb + 0.45, zf + 1.18));
    for (const x of [1.3, cx, w - 1.3]) { G.add(at(boite(0.7, 1.2, 0.03, VITRE), x, yb + 0.75, zf + 0.01)); G.add(at(boite(0.84, 1.3, 0.05, BOIS_SOMBRE), x, yb + 0.72, zf - 0.005)); G.add(at(boite(0.7, 1.2, 0.03, VITRE), x, yb + 0.75, zf + 0.02)); }
    // poteaux du balcon, qui portent l'auvent du rez-de-chaussée
    for (const x of [0.15, 2.4, w - 2.4, w - 0.15]) G.add(at(boite(0.16, yb, 0.16, BOIS_SOMBRE), x, yb / 2, zf + 1.15));
    // rez-de-chaussée : portes battantes, deux grandes fenêtres
    const pw = 1.1, ph = 1.8;
    reperePorte(G, cx, 0.2, zf, pw, ph);
    G.add(at(boite(pw, ph, 0.04, SOMBRE), cx, 0.2 + ph / 2, zf + 0.01));
    for (const s of [-1, 1]) {
      G.add(at(boite(pw / 2 - 0.04, 0.8, 0.05, M({ map: lattes('#c89858') })), cx + s * pw / 4, 0.95, zf + 0.06));
      G.add(at(boite(pw / 2 - 0.04, 0.06, 0.07, BOIS_SOMBRE), cx + s * pw / 4, 1.38, zf + 0.07));
    }
    for (const x of [1.2, w - 1.2]) fenetre(G, x, 1.1, zf, 1.2, 1.0);
    trottoir(G, 0, w, zf, zf + 1.3, PLAN);
    // lanternes, tonneaux, un abreuvoir
    for (const x of [cx - 0.95, cx + 0.95]) { G.add(at(boite(0.16, 0.24, 0.16, LUM('#ffd080', '#a06010')), x, 2.0, zf + 0.12)); G.add(at(boite(0.2, 0.05, 0.2, FER), x, 2.14, zf + 0.12)); }
    tonneau(G, 0.45, zf + 0.7); tonneau(G, 0.95, zf + 0.75, 0.22);
    G.add(at(boite(1.4, 0.4, 0.45, M({ map: lattes('#7a5432') })), w - 1.0, 0.4, zf + 1.6));
    G.add(at(boite(1.25, 0.04, 0.32, COL('#4a7a8a')), w - 1.0, 0.58, zf + 1.6));
    return G;
  };

  /* ---------------------------------------------------------------- la banque (5 × 4) */
  B.banqueFW = () => {
    const G = new THREE.Group(), w = 5, cx = w / 2, zf = 3.0, H = 3.6;
    const BR = M({ map: briques('#a0503a') }), CORN = COL('#d8c8a8'), PLAN = M({ map: planches('#8a6440') });
    G.add(at(boite(w - 0.2, H, zf - 0.4, BR), cx, H / 2, (zf + 0.4) / 2));
    G.add(at(boite(w, 0.1, zf - 0.2, COL('#4a4040')), cx, H + 0.05, (zf + 0.4) / 2));
    faussefacade(G, 0.1, w - 0.1, H - 0.2, H + 0.8, zf, BR, CORN);
    panneau(G, 'BANQUE', cx, H + 0.25, zf + 0.02, 3.2, '#2a3a2a', '#e8d070');
    // pilastres clairs aux angles, corniche, socle de pierre
    for (const x of [0.2, w - 0.2]) G.add(at(boite(0.3, H, 0.2, CORN), x, H / 2, zf + 0.02));
    G.add(at(boite(w - 0.2, 0.4, 0.1, CORN), cx, 0.2, zf + 0.02));
    // la porte blindée vert sombre, deux fenêtres à barreaux en bas, deux en haut
    const pw = 1.1, ph = 2.0;
    reperePorte(G, cx, 0.2, zf, pw, ph);
    G.add(at(boite(pw, ph, 0.05, COL('#2a3a30')), cx, 0.2 + ph / 2, zf + 0.02));
    for (const k of [0.3, 0.7]) G.add(at(boite(pw - 0.2, 0.05, 0.07, COL('#c8a040')), cx, 0.2 + ph * k, zf + 0.05));
    G.add(at(boite(pw + 0.3, 0.2, 0.12, CORN), cx, 0.2 + ph + 0.1, zf + 0.04));
    for (const x of [0.95, w - 0.95]) { fenetre(G, x, 1.2, zf, 0.8, 1.1, CORN, true); fenetre(G, x, 2.8, zf, 0.7, 0.8, CORN); }
    G.add(at(boite(0.6, 0.6, 0.05, CORN), cx, 2.8, zf + 0.02));
    G.add(at(new THREE.Mesh(new THREE.CircleGeometry(0.2, 12), COL('#c8a040')), cx, 2.8, zf + 0.05));
    trottoir(G, 0, w, zf, zf + 0.9, PLAN);
    for (const x of [0.3, w - 0.3]) G.add(at(cyl(0.05, 0.05, 1.0, FER, 6), x, 0.6, zf + 0.85));
    G.add(at(boite(w - 0.6, 0.05, 0.05, FER), cx, 0.95, zf + 0.85));
    return G;
  };

  /* ---------------------------------------------------------------- le bureau du shérif (4 × 4) */
  B.sherifFW = () => {
    const G = new THREE.Group(), w = 4, cx = w / 2, zf = 2.8, H = 3.0;
    const MUR = M({ map: planches('#9a8a70') }), MUR2 = M({ map: planches('#7a6a54') }), TOIT = M({ map: lattes('#5a4a3a') }), PLAN = M({ map: planches('#8a6440') });
    G.add(at(boite(w - 0.2, H, zf - 0.4, MUR), cx, H / 2, (zf + 0.4) / 2));
    G.add(at(boite(w, 0.1, zf - 0.2, TOIT), cx, H + 0.05, (zf + 0.4) / 2));
    faussefacade(G, 0.1, w - 0.1, H - 0.2, H + 1.0, zf, MUR2, BOIS_SOMBRE);
    panneau(G, 'SHÉRIF', cx, H + 0.25, zf + 0.02, 2.6, '#e8dcc0', '#2a2a2a');
    // l'étoile au-dessus de l'enseigne
    const e = new THREE.Shape();
    for (let k = 0; k < 10; k++) { const a = Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 0.12 : 0.28; k ? e.lineTo(Math.cos(a) * r, Math.sin(a) * r) : e.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    G.add(at(new THREE.Mesh(new THREE.ExtrudeGeometry(e, { depth: 0.05, bevelEnabled: false }), LUM('#e8c040', '#604000')), cx, H + 0.75, zf + 0.01));
    const pw = 0.9, ph = 1.8;
    reperePorte(G, 1.3, 0.2, zf, pw, ph);
    G.add(at(boite(pw, ph, 0.05, M({ map: lattes('#6a4a2a') })), 1.3, 0.2 + ph / 2, zf + 0.02));
    G.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), COL('#c8a040')), 1.3 + pw / 2 - 0.15, 1.1, zf + 0.07));
    fenetre(G, 3.0, 1.2, zf, 0.7, 0.8, BOIS_SOMBRE, true);
    // avis de recherche cloués à côté de la porte
    for (const [x, y] of [[0.45, 1.4], [0.45, 0.85]]) { G.add(at(boite(0.38, 0.48, 0.02, COL('#e8dcb0')), x, y, zf + 0.02)); G.add(at(boite(0.2, 0.18, 0.02, COL('#5a4a3a')), x, y + 0.06, zf + 0.035)); }
    auvent(G, 0, w, zf, 0.9, 2.3, TOIT, 3);
    trottoir(G, 0, w, zf, zf + 0.95, PLAN);
    G.add(at(boite(0.6, 0.06, 0.3, BOIS_SOMBRE), 3.0, 0.5, zf + 0.5));                // un banc
    for (const x of [2.75, 3.25]) G.add(at(boite(0.06, 0.3, 0.26, BOIS_SOMBRE), x, 0.35, zf + 0.5));
    return G;
  };

  /* ---------------------------------------------------------------- le magasin général (6 × 4) */
  B.magasinFW = () => {
    const G = new THREE.Group(), w = 6, cx = w / 2, zf = 2.8, H = 3.2;
    const MUR = M({ map: planches('#6e8a7a') }), MUR2 = M({ map: planches('#5a7464') }), TOIT = M({ map: lattes('#6a5a44') }), PLAN = M({ map: planches('#8a6440') });
    G.add(at(boite(w - 0.2, H, zf - 0.4, MUR), cx, H / 2, (zf + 0.4) / 2));
    G.add(at(boite(w, 0.1, zf - 0.2, TOIT), cx, H + 0.05, (zf + 0.4) / 2));
    faussefacade(G, 0.1, w - 0.1, H - 0.2, H + 1.1, zf, MUR2, COL('#e8e0c8'));
    panneau(G, 'MAGASIN GÉNÉRAL', cx, H + 0.4, zf + 0.02, 5.0, '#f0e6c8', '#3a2a1a');
    // grande vitrine de part et d'autre de la porte vitrée
    const pw = 1.0, ph = 1.9;
    reperePorte(G, cx, 0.2, zf, pw, ph);
    G.add(at(boite(pw, ph, 0.04, COL('#5a3a22')), cx, 0.2 + ph / 2, zf + 0.02)); G.add(at(boite(pw - 0.3, 0.8, 0.03, VITRE), cx, 1.4, zf + 0.05));
    for (const s of [-1, 1]) {
      const x = cx + s * 1.65;
      G.add(at(boite(1.8, 1.3, 0.03, VITRE), x, 1.15, zf + 0.01));
      G.add(at(boite(2.0, 0.1, 0.12, COL('#e8e0c8')), x, 1.85, zf + 0.04)); G.add(at(boite(2.0, 0.12, 0.2, COL('#e8e0c8')), x, 0.45, zf + 0.08));
      for (const dx of [-0.6, 0, 0.6]) G.add(at(boite(0.05, 1.3, 0.05, COL('#e8e0c8')), x + dx, 1.15, zf + 0.04));
      for (let k = 0; k < 3; k++) G.add(at(boite(0.22, 0.3, 0.12, COL(['#c84a2a', '#e8c040', '#4a7ac8'][k])), x - 0.5 + k * 0.5, 0.68, zf - 0.1));   // marchandises en vitrine
    }
    auvent(G, 0, w, zf, 1.0, 2.4, M({ map: lattes('#c8b8a0') }), 4);
    trottoir(G, 0, w, zf, zf + 1.05, PLAN);
    caisse(G, 0.45, 0.2, zf + 0.5); caisse(G, 0.45, 0.65, zf + 0.5, 0.36); caisse(G, 0.95, 0.2, zf + 0.55, 0.4);
    for (const x of [w - 0.4, w - 0.8]) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), COL('#d8c8a0')); s.scale.y = 1.3; G.add(at(s, x, 0.5, zf + 0.5)); }
    tonneau(G, w - 1.3, zf + 0.6, 0.2);
    return G;
  };

  /* ---------------------------------------------------------------- la petite maison (4 × 3) */
  B.maisonFW = () => {
    const G = new THREE.Group(), w = 4, cx = w / 2, zf = 2.0, H = 2.5;
    const MUR = M({ map: planches('#a88a64') }), TOIT = M({ map: bardeaux('#6a5444') }), PLAN = M({ map: planches('#8a6440') });
    G.add(at(boite(w - 0.4, H, zf - 0.4, MUR), cx, H / 2, (zf + 0.4) / 2));
    // toit à deux pans, faîtage le long de x
    const dz = (zf - 0.4) / 2 + 0.25, hr = 0.7, L = Math.hypot(dz, hr), a = Math.atan2(hr, dz), cz = (zf + 0.4) / 2;
    for (const s of [-1, 1]) { const p = boite(w - 0.1, 0.1, L, TOIT); p.rotation.x = s * a; G.add(at(p, cx, H + hr / 2, cz + s * dz / 2)); }
    for (const x of [0.2, w - 0.2]) {
      const sh = new THREE.Shape(); sh.moveTo(-dz + 0.25, 0); sh.lineTo(dz - 0.25, 0); sh.lineTo(0, hr - 0.05);
      const pg = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: false }), MUR); pg.rotation.y = Math.PI / 2; G.add(at(pg, x - 0.05, H, cz));
    }
    G.add(at(boite(0.3, 0.9, 0.3, M({ map: briques('#8a5a44') })), w - 0.9, H + 0.8, cz - 0.3));     // cheminée
    const pw = 0.8, ph = 1.6;
    reperePorte(G, 1.3, 0.2, zf, pw, ph);
    G.add(at(boite(pw, ph, 0.05, M({ map: lattes('#7a5432') })), 1.3, 0.2 + ph / 2, zf + 0.02));
    fenetre(G, 2.8, 1.15, zf, 0.7, 0.7); fenetre(G, cx, 2.05, zf, 0.5, 0.4);
    for (const s of [-1, 1]) G.add(at(boite(0.2, 0.75, 0.04, COL('#7a3a2a')), 2.8 + s * 0.48, 1.15, zf + 0.04));
    auvent(G, 0.2, w - 0.2, zf, 0.7, 1.75, M({ map: lattes('#7a6048') }), 3);
    trottoir(G, 0.2, w - 0.2, zf, zf + 0.85, PLAN);
    // chaise à bascule
    G.add(at(boite(0.4, 0.06, 0.4, BOIS_SOMBRE), 2.6, 0.55, zf + 0.45)); G.add(at(boite(0.4, 0.55, 0.06, BOIS_SOMBRE), 2.6, 0.82, zf + 0.25));
    for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 4, 10, Math.PI * 0.5), BOIS_SOMBRE); p.rotation.set(0, Math.PI / 2, Math.PI * 1.25); G.add(at(p, 2.6 + s * 0.18, 0.55, zf + 0.45)); }
    return G;
  };
}
