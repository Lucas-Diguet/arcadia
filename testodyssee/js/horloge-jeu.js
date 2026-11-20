// testodyssee/js/horloge-jeu.js — les règles de la Tour de l'Horloge (horloge.js) dans le jeu du labo : les leviers,
// le joueur emporté par l'aiguille sur laquelle il se tient, les clés, la grille, le mécanisme central et ses animations,
// le dessin (horloge-vue.js) à la place du sol et des murs de la carte, et la caméra qui recule devant la tour.
// À plusieurs, l'hôte du salon tient l'état de l'horloge : une action demande le mouvement à l'hôte (message djHor), qui
// la valide et l'annonce à tous (djHorE) ; chacun anime l'horloge et emporte son propre joueur s'il est sur l'aiguille.
import * as THREE from 'three';
import { HORLOGE, HORLOGE1, DEHORS, VESTIBULE, VW, TUBE_Y, C, NOMS, NIVEAUX, niveauCarte, appliquer, caseHorloge, casesMecanisme, placeLevier, tourner, emporter, heure, surAiguille, caseSurAiguille, boutsDuTube, V_PORTE, VH, VESTIBULE as VEST, SALLES, PLATEFORMES, PLATEFORMES1, salleId, labyrinthes, placeArrivee, caseSur } from './horloge.js';
import { ESCALIER, SALLES1, salle1Id, salles1, hauteurEscalier, caseEscalier, pasEscalier, milieuEscalier, boutsEscalier, pousser, occupation, appliquerSalles1 } from './horloge-n1.js';
import { creerHorloge, poserHorloge } from './horloge-vue.js';
import { HORLOGE2, HORLOGES2, PLATEFORMES2, LEVIERS2, LEVIER_PONT, MONTE, PORTE2, depart2, tourner2, emporter2, appliquer2, surPf, case2 } from './horloge-n2.js';
import { creerHorloge2, poserHorloge2, NOMS_COULEURS2 } from './horloge2-vue.js';
import { HORLOGE_M1, SALLES_M1, salleM1Id, devantPorteM1, pasM1, BAS_SOL, balancier, appliquerSallesM1, CHAINES_DEPART } from './horloge-m1.js';
import { creerEscalier } from './horloge-escalier.js';

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
const egal = (a, b) => a[0] === b[0] && a[1] === b[1];
const lisse = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
/** la montée ou la descente de l'horloge : les aiguilles tournent de plus en plus vite (3 tours), puis ralentissent */
const TOURS = 36, PIC = 0.7;
/** jusqu'où une aiguille tourne (en heures) avant de heurter un bloc de pierre */
const BUTEE = 0.7;
/** hauteur du plancher du tube de cuivre, au-dessus du vestibule */
const TUBE_H = 1.6;
const tours = (t) => (t < PIC ? (t * t) / (2 * PIC) : 0.5 * PIC + 0.5 * (1 - PIC) - ((1 - t) ** 2) / (2 * (1 - PIC))) / 0.5;
/** et le décor qui glisse (on descend : il monte) : rien au début, puis il part, attend, et revient */
const glisse = (t) => lisse((t - 0.3) / 0.2) - lisse((t - 0.78) / 0.17);

export class Horloge {
  constructor(game) {
    this.game = game;
    const v = game.view;
    // pendant que l'aiguille tourne, ceux qui se tiennent dessus (soi et les autres) tournent avec elle
    const place = v.place.bind(v);
    v.place = (a, x, y, hop = 0, ...r) => {
      const d = this.decalage(x, y) || this.decalage2(x, y);
      // dans le vestibule, qui est dans le tube de cuivre y est dessiné en hauteur (soi : on le sait ; les autres : on le
      // devine, celui qui arrive sur la rangée du tube par un pas de côté ou en apparaissant y est, celui qui y arrive
      // par un pas vers le haut ou le bas passe dessous)
      if (this.game.mapObj?.id === VESTIBULE && this.dansTube(a, x, y, a === v.actors.get('player'))) hop += TUBE_H;
      // sur l'escalier, chacun à la hauteur de sa marche ; sur les marches, au milieu de l'escalier
      if (this.game.mapObj?.id === HORLOGE_M1 && this.E && caseHorloge(this.E, Math.round(x), Math.round(y), -1)?.quoi !== 'aiguille') hop -= BAS_SOL;
      if (this.game.mapObj?.id === ESCALIER) {
        const M = milieuEscalier(x, y);
        if (M) return place(a, M.x, M.y, hop + M.h, ...r);
        hop += this.hEsc(x, y);
      }
      place(a, d ? x + d[0] : x, d ? y + d[1] : y, hop, ...r);
    };
    const update = v.update.bind(v);
    v.update = (dt, x, y, ...r) => {
      const esc = y != null && this.game.mapObj?.id === ESCALIER, M = esc ? milieuEscalier(x, y) : null;
      update(dt, M ? M.x : x, M ? M.y : y, ...r);
      const d = y != null && (this.decalage(x, y) || this.decalage2(x, y));
      if (d) { v.camera.position.x += d[0]; v.camera.position.z += d[1]; v.camera.updateMatrixWorld(); }
      if (esc) this.cameraEscalier(dt, M ? M.h : this.hEsc(x, y), M?.cap ?? 0);
      else this.cap = 0;
      this.recul();
    };
    // le sol et les murs de la carte ne se dessinent pas : seulement les volumes de l'horloge
    const render = v.render.bind(v);
    v.render = () => { if (this.ici() || this.game.mapObj?.id === ESCALIER || this.game.mapObj?.id === HORLOGE2) for (const c of v.chunks?.values() || []) c.visible = false; render(); };
  }
  /** sur l'escalier : la caméra tourne autour de soi pour regarder dans le sens de la montée (cap), en douceur, et monte
   *  avec la marche (h) ; sur les paliers, elle revient face au nord */
  cameraEscalier(dt, h, cap) {
    const v = this.game.view, f = v.focus, c = v.camera.position;
    let e = cap - (this.cap || 0); e = Math.atan2(Math.sin(e), Math.cos(e));
    this.cap = (this.cap || 0) + e * Math.min(1, dt * 5);
    const dx = c.x - f.x, dz = c.z - f.z, dh = Math.hypot(dx, dz);
    c.x = f.x - Math.sin(this.cap) * dh; c.z = f.z + Math.cos(this.cap) * dh; c.y += h;
    v.camera.lookAt(f.x, f.y + h, f.z); v.camera.updateMatrixWorld();
  }
  /** la hauteur de l'escalier sous (x, y), à virgule pendant qu'on marche d'une case à l'autre */
  hEsc(x, y) {
    const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.ceil(x), y1 = Math.ceil(y), f = x1 !== x0 ? x - x0 : y - y0;
    const a = hauteurEscalier(x0, y0), b = hauteurEscalier(x1, y1);
    return a == null ? b ?? 0 : b == null ? a : a + (b - a) * f;
  }
  /** de combien déplacer (à l'écran) quelqu'un posé en (x, y) pendant que l'horloge tourne : l'angle déjà parcouru par
   *  l'aiguille qui tourne sous ses pieds, autour du pivot ; null s'il n'est pas sur une aiguille qui tourne */
  decalage(x, y) {
    const A = this.anim; if (!A || !this.ici()) return null;
    const c = caseHorloge(A.E0, Math.round(x), Math.round(y));
    const q = c?.quoi === 'aiguille' && c.sur.find((k) => A.vers[k] !== A.de[k]); if (!q) return null;
    const th = ((this.D[q] - A.de[q]) * Math.PI) / 6, vx = x - C[0], vy = y - C[1];
    return [vx * Math.cos(th) - vy * Math.sin(th) - vx, vx * Math.sin(th) + vy * Math.cos(th) - vy];
  }
  /** étage 2 : de combien déplacer quelqu'un posé sur l'aiguille qui tourne (autour de son pivot) */
  decalage2(x, y) {
    const A = this.anim2; if (!A || this.game.mapObj?.id !== HORLOGE2) return null;
    const i = A.i, q = HORLOGES2[i], c = case2(A.H0, Math.round(x), Math.round(y)); if (c?.quoi !== 'aig' || c.k !== i) return null;
    const th = ((this.H2aff[i] - A.H0[i]) * Math.PI) / 6, vx = x - q.c[0], vy = y - q.c[1];
    return [vx * Math.cos(th) - vy * Math.sin(th) - vx, vx * Math.sin(th) + vy * Math.cos(th) - vy];
  }
  /** en entrant dans la tour : la caméra recule pour la montrer en entier, puis on passe la porte (entrerTour) */
  recul() {
    const g = this.game, v = g.view, m = g.mapObj;
    if (m?.id !== DEHORS || !this.dehors) { this.dehors = null; return; }
    const t = (performance.now() - this.dehors.debut) / 1000;
    const f = lisse(t / 1.4);
    if (f <= 0) return;
    const cam = v.camera;
    if (v._ortho) {
      // vue orthographique (relief en 3D) : on élargit le champ, et l'on remonte vers la tour
      const e = cam.projectionMatrix.elements, k = 1 / (1 + 3.2 * f); e[0] *= k; e[5] *= k;
      cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
      cam.position.z -= 24 * f;
    } else {
      const dir = new THREE.Vector3(); cam.getWorldDirection(dir);
      cam.position.addScaledVector(dir, -46 * f);
      cam.position.z -= 9 * f; cam.position.y += 6 * f;
      if (cam.far < 400) { cam.far = 400; cam.updateProjectionMatrix(); }
    }
    cam.updateMatrixWorld();
  }
  /** la carte de la salle des aiguilles où l'on est (étage 0 ou 1), ou null */
  ici() { const m = this.game.mapObj; return m && niveauCarte(m.id) !== null ? m : null; }
  /** l'étage de la salle des aiguilles où l'on est */
  get niv() { return this.ici()?.horlogeNiv || 0; }
  get E() { return this.game.world.maps[HORLOGE]?.horloge; }
  /** avant un pas : on ne marche pas pendant que l'horloge bouge ; dans le vestibule, on ne descend pas du tube et l'on
   *  n'y monte pas (on passe dessous par le couloir du milieu) */
  avantPas(d) {
    if (this.ici() && this.anim) return true;
    const g = this.game, p = g.player, m = g.mapObj;
    if (p.move || !d || g.busy || !m) return false;
    const [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[d], tx = p.x + dx, ty = p.y + dy;
    const arret = () => { p.dir = d; p.walking = false; return true; };
    if (this.pousse) return arret();
    // la bouche du tube, au bout de la salle est : on s'y glisse en marchant dedans
    if (m.tube && tx === m.tube.x && ty === m.tube.y) { arret(); this.entrerTube(...m.tube.vers); return true; }
    // l'escalier : pas d'une marche à une autre bien plus haute ou plus basse (le haut de l'escalier passe au-dessus du palier)
    // sur les marches, comme dans la Tour des Cieux : haut fait monter l'escalier, bas le descendre, quel que soit le sens
    // où il tourne à cet endroit ; gauche et droite font changer de côté de l'escalier
    if (m.id === ESCALIER && !this.guide && caseEscalier(p.x, p.y)?.quoi === 'marche') {
      const d2 = pasEscalier(p.x, p.y, d);
      if (!d2) return arret();
      if (d2 !== d) { this.guide = true; try { g.tryStep(d2); } finally { this.guide = false; } p.dir = d; return true; }
    }
    if (m.id === ESCALIER) { const a = hauteurEscalier(p.x, p.y), b = hauteurEscalier(tx, ty); if (a != null && b != null && Math.abs(a - b) > 1) return arret(); return false; }
    // étage -1 : on ne passe du dessus d'une aiguille au sol (et l'inverse) que par son échelle
    if (m.id === HORLOGE_M1 && this.E && !pasM1(this.E, p.x, p.y, tx, ty)) return arret();
    // une salle à tourniquets : marcher dans un bras le fait tourner (si rien ne le gêne), puis on avance
    if (m.tourniquets) {
      const rots = this.E?.tq?.[m.horlogeSalle] || [];
      if (!occupation(m.tourniquets, rots).has(tx + ',' + ty)) return false;
      if (!pousser(m.planTq, m.tourniquets, rots, p.x, p.y, [dx, dy])) return false;
      arret(); this.pousser(m.horlogeSalle, p.x, p.y, d);
      return true;
    }
    // la porte d'une salle du mur, vers sa plateforme : on y entre en marchant dedans
    if (m.porte && tx === m.porte[0] && ty === m.porte[1]) { arret(); g.warp(m.warpAt(tx, ty)); return true; }
    // dehors, la porte de la tour : la caméra recule pour montrer toute la tour, puis on entre
    if (m.id === DEHORS) { const w = m.warpAt(tx, ty); if (w?.map === VEST) { arret(); this.entrerTour(w); return true; } return false; }
    if (m.id !== VESTIBULE) return false;
    if (this.tube) {
      if (dy !== 0) return arret();   // on ne descend pas du tube au milieu
      if (tx <= 1 || tx >= VW - 2) { const b = boutsDuTube()[tx <= 1 ? 'gauche' : 'droite']; arret(); g.warp(b); return true; }   // au bout, on ressort dans la salle
      return false;
    }
    // la porte du fond : on y entre en marchant dedans
    if (tx === V_PORTE[0] && ty === V_PORTE[1]) { arret(); g.warp(g.mapObj.warpAt(tx, ty)); return true; }
    return false;
  }
  /** la porte de la tour : la caméra recule (recul), on regarde la tour un instant, puis on entre */
  async entrerTour(w) {
    const g = this.game; if (this.dehors) return;
    g.busy = true;
    try { this.dehors = { debut: performance.now() }; await attendre(2600); } finally { g.busy = false; }
    await g.warp(w);
  }
  /** quelqu'un posé en (x, y) dans le vestibule est-il dans le tube ? */
  dansTube(a, x, y, moi) {
    const cx = Math.round(x), cy = Math.round(y), ici = cy === TUBE_Y;
    if (moi) return ici && this.tube;
    const avant = a._tube;
    if (!avant || avant.x !== cx || avant.y !== cy) a._tube = { x: cx, y: cy, dedans: ici && (!avant || (avant.y === cy && avant.dedans)) };
    return a._tube.dedans;
  }
  /** pousser le bras d'un tourniquet en (x, y) + d : l'hôte le fait tourner pour tous, puis on avance */
  async pousser(salle, x, y, d) {
    const g = this.game; this.pousse = true;
    try {
      const [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[d];
      await this.demander({ a: 'tq', salle, x, y, d: [dx, dy] });
    } finally { this.pousse = false; }
    // on avance si le tourniquet a bien tourné (sinon rien : l'hôte a refusé)
    const m = g.mapObj, [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[d];
    if (m?.tourniquets && occupation(m.tourniquets, this.E?.tq?.[salle] || []).has((x + dx) + ',' + (y + dy))) return;
    g.sound.sfx('door');
    if (g.player.x === x && g.player.y === y && !g.player.move) g.tryStep(d);
  }
  /** se glisser dans le tube de cuivre (depuis la salle est) : on arrive dans le vestibule, dans le tube */
  async entrerTube(x, dir) {
    const g = this.game;
    this.tube = true;
    await g.warp({ map: VESTIBULE, x, y: TUBE_Y, dir });
    this.tube = true;
    return true;
  }
  /** mode test : les lieux de la tour où l'on peut aller directement (si l'on est dans la tour) */
  salles() {
    const id = this.game.mapObj?.id; if (!id?.startsWith(HORLOGE) || id === DEHORS) return [];
    const g = this.game, L = labyrinthes(), L1 = salles1(), B = boutsEscalier(), [ax, ay] = placeArrivee();
    const pf = (P, map) => { const [x, y] = caseSur(P.id, (P.r0 + P.r1) / 2, 0); return { map, x, y, dir: 'down' }; };
    return [
      { nom: 'Le vestibule', to: { map: VEST, x: V_PORTE[0], y: VH - 2, dir: 'up' } },
      { nom: 'Le quai (salle des aiguilles)', to: { map: HORLOGE, x: ax, y: ay, dir: 'up' } },
      ...PLATEFORMES.filter((p) => p.id !== 'sud').map((p) => ({ nom: p.nom, to: pf(p, HORLOGE) })),
      ...SALLES.map((s) => ({ nom: s.nom, to: { map: salleId(s), x: L[s.id].entree[0], y: L[s.id].entree[1], dir: 'up' } })),
      ...PLATEFORMES1.map((p) => ({ nom: 'Étage 1 : ' + p.nom.replace(/^L/, 'l'), to: pf(p, HORLOGE1) })),
      ...SALLES1.map((s) => { const c = L1[s.id].bouts[s.depuis === 'a' ? 'a' : 'de'].case; return { nom: s.nom, to: { map: salle1Id(s), x: c[0], y: c[1], dir: 'up' } }; }),
      { nom: 'Étage -1 : devant la salle des contrepoids', to: { map: HORLOGE_M1, ...(() => { const [x, y] = devantPorteM1(SALLES_M1[0]); return { x, y, dir: 'up' }; })() } },
      ...SALLES_M1.map((s) => { const c = g.world.maps[salleM1Id(s)]?.planM1.porte.case || [0, 0]; return { nom: 'Étage -1 : ' + s.nom.replace(/^L/, 'l'), to: { map: salleM1Id(s), x: c[0], y: c[1], dir: 'up' } }; }),
      ...Object.entries(PLATEFORMES2).map(([id, P]) => ({ nom: 'Étage 2 : ' + P.nom.replace(/^L/, 'l'), to: { map: HORLOGE2, x: P.r[0] + 2, y: P.r[1] + 2, dir: 'up' } })),
      { nom: 'L\'escalier (en bas)', to: { map: ESCALIER, x: B.ouest.case[0], y: B.ouest.case[1], dir: 'right' } },
      { nom: 'L\'escalier (en haut, la grande porte)', to: { map: ESCALIER, x: B.haut[0], y: B.haut[1], dir: 'right' } },
    ];
  }
  async allerSalle() {
    const g = this.game, l = this.salles(); if (!l.length) return false;
    const r = await g.ui.list({ title: 'Aller dans la tour', items: [...l.map((s) => ({ label: s.nom })), { label: 'Retour' }], cls: 'shop', cancel: l.length });
    if (r < 0 || r >= l.length) return false;
    this.tube = false;
    await g.warp(l[r].to, 'exit');
    return true;
  }
  /** le tube du vestibule, en volume : verre épais cerclé de cuivre, d'un mur à l'autre */
  poserTube() {
    const v = this.game.view;
    if (this.tube3d?.root === v.root) return;
    // le verre est dessiné après les personnages : celui qui est dans le tube paraît bien dedans, derrière la vitre
    const R = 1.05, T = new THREE.Group(), y = TUBE_H + R - 0.15, z = TUBE_Y + 0.5, L = VW - 1;
    const fondTube = new THREE.Mesh(new THREE.CylinderGeometry(R, R, L, 24, 1, true, Math.PI / 2, Math.PI).rotateZ(Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#3a5a6a', transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }));
    fondTube.position.set(L / 2 + 0.5, y, z); T.add(fondTube);
    const verre = new THREE.Mesh(new THREE.CylinderGeometry(R, R, L, 24, 1, true, -Math.PI / 2, Math.PI).rotateZ(Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#b8e4ff', transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }));
    verre.position.set(L / 2 + 0.5, y, z); verre.renderOrder = 50; T.add(verre);
    const reflet = new THREE.Mesh(new THREE.BoxGeometry(L, 0.08, 0.04), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.45, depthWrite: false }));
    reflet.position.set(L / 2 + 0.5, y + R * 0.55, z + R * 0.83); reflet.renderOrder = 51; T.add(reflet);
    const fond = new THREE.Mesh(new THREE.BoxGeometry(L, 0.08, 1.2), new THREE.MeshBasicMaterial({ color: '#7a4a22' })); fond.position.set(L / 2 + 0.5, TUBE_H - 0.04, z); T.add(fond);
    const cuivre = new THREE.MeshBasicMaterial({ color: '#c8783a' });
    for (let x = 1; x <= L; x += 3) { const o = new THREE.Mesh(new THREE.TorusGeometry(R + 0.04, 0.07, 6, 24), cuivre); o.rotation.y = Math.PI / 2; o.position.set(x, y, z); o.renderOrder = 52; T.add(o); }
    for (const x of [0.6, L + 0.4]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.25, R + 0.25, 0.3, 24).rotateZ(Math.PI / 2), cuivre); b.position.set(x, y, z); T.add(b); }
    for (const x of [3, 8, 15, 20]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.2, TUBE_H, 0.2), new THREE.MeshBasicMaterial({ color: '#6a4426' })); s.position.set(x, TUBE_H / 2, z); T.add(s); }
    v.root.add(T); this.tube3d = { root: v.root, T };
  }
  /** à chaque image : l'horloge dessinée, les aiguilles qui tournent vers leur place */
  tick(dt) {
    const g = this.game, v = g.view, m = this.ici();
    if (g.mapObj?.id === VESTIBULE) { if (v.root) this.poserTube(); }
    else this.tube = false;
    this.balanciers();
    if (g.mapObj?.id === HORLOGE2 && v.root) {
      if (this.vue2?.root !== v.root) { this.vue2 = { root: v.root, V: creerHorloge2() }; v.root.add(this.vue2.V.G); v.scene.background?.set?.('#07060a'); }
      const H = this.E?.h2 || depart2();
      if (!this.H2aff) this.H2aff = H.slice();
      if (this.anim2) { const A = this.anim2; A.t = Math.min(1, A.t + dt / A.duree); const u = A.t < 0.5 ? 2 * A.t * A.t : 1 - (-2 * A.t + 2) ** 2 / 2; this.H2aff = A.H0.map((h, i) => h + (i === A.i ? A.s * u : 0)); if (A.t >= 1) { this.anim2 = null; A.fin(); } }
      else this.H2aff = H.slice();
      poserHorloge2(this.vue2.V, this.H2aff);
    }
    if (g.mapObj?.id === ESCALIER && v.root && this.esc?.root !== v.root) { v.root.add(creerEscalier()); this.esc = { root: v.root }; v.scene.background?.set?.('#07060a'); }
    if (!m || !v.root) return;
    if (!this.D) this.D = { ...this.E };
    if (this.vue?.root !== v.root) {
      const H = creerHorloge(m.horlogeNiv || 0); v.root.add(H.G); this.vue = { root: v.root, H };
      v.scene.background?.set?.('#07060a');
    }
    this.D.envY = 0; this.D.casse = 0;
    if (this.anim) {
      const A = this.anim; A.t = Math.min(1, A.t + dt / A.duree);
      if (A.fx === 'niveau') {
        const u = tours(A.t); for (const k of ['grande', 'fine', 'petite']) this.D[k] = A.de[k] + (A.vers[k] - A.de[k]) * u;
        this.D.envY = -A.s * 7 * glisse(A.t);
        v.shake = Math.max(v.shake || 0, 0.04 * Math.sin(Math.PI * A.t));
      } else if (A.fx === 'bute') {
        // élan jusqu'au bloc, choc, petit rebond, puis retour lent à sa place
        const u = A.t < 0.35 ? (A.t / 0.35) ** 2 : A.t < 0.45 ? 1 - 0.08 * Math.sin(((A.t - 0.35) / 0.1) * Math.PI) : 1 - lisse((A.t - 0.45) / 0.55);
        for (const k of ['grande', 'fine', 'petite']) this.D[k] = A.de[k] + (A.vers[k] - A.de[k]) * u;
        if (A.t >= 0.35 && !this.choc) { this.choc = true; this.game.sound.sfx('ledge'); v.shake = Math.max(v.shake || 0, 0.18); }
      } else if (A.fx === 'casse') {
        this.D.casse = A.t; v.shake = Math.max(v.shake || 0, 0.12 * (1 - A.t));
      } else {
        const u = A.t < 0.5 ? 2 * A.t * A.t : 1 - (-2 * A.t + 2) ** 2 / 2;
        for (const k of ['grande', 'fine', 'petite']) this.D[k] = A.de[k] + (A.vers[k] - A.de[k]) * u;
      }
      if (A.t >= 1) { this.anim = null; A.fin(); }
    }
    this.D.blocs = this.E.blocs;
    if (this.anim?.fx === 'casse') this.D.blocs = true;
    // l'horloge qui part vers un autre étage reste visible ici jusqu'à la fin de son tour
    this.D.vueNiv = this.anim?.fx === 'niveau' ? this.anim.depuis : undefined;
    if (this.D.vueNiv === undefined) this.D.niv = this.E.niv || 0;
    poserHorloge(this.vue.H, this.D);
    if (!this.vu && !g.busy) this.arrivee();
  }

  /* ---------------- à plusieurs ---------------- */
  /** le salon (celui des donjons), s'il y en a un */
  get salon() { const D = this.game.donjons; return D?.H ? D : null; }
  /** une action ({ a: 'tourner', quoi, s }, { a: 'cle1' | 'cle' }, { a: 'meca' }, { a: 'niveau', s }, { a: 'grille', id },
   *  { a: 'tq', salle, x, y, d }) : l'hôte décide, tout le monde voit */
  demander(act) {
    const S = this.salon;
    if (!S || S.hote) return this.decider(act);
    S.H.send('host', { t: 'djHor', act });
    return new Promise((r) => { this.attente = r; setTimeout(() => { if (this.attente === r) { this.attente = null; r(); } }, 15000); });
  }
  /** chez l'hôte : un seul mouvement à la fois, annoncé à tous (from : qui l'a demandé, prévenu si rien ne bouge) */
  decider(act, from = null) {
    const E = this.E, non = () => { if (from != null) this.salon?.H.send(from, { t: 'djHorN' }); return Promise.resolve(); };
    if (this.occupe || !act || !E) return non();
    let E2 = null, duree = 1.1, fx = null, s = 0, quoi = null;
    if (act.a === 'tourner' && ['grande', 'fine', 'petite'].includes(act.quoi) && (act.s === 1 || act.s === -1)) {
      E2 = tourner(E, act.quoi, act.s);
      // un bloc de pierre l'arrête : l'aiguille part, bute contre lui et revient
      if (!E2) { E2 = { ...E }; duree = 1.5; fx = 'bute'; s = act.s; quoi = act.quoi; }
    }
    else if (['cle1', 'cle', 'piece', 'cle2'].includes(act.a) && !E[act.a]) { E2 = { ...E, [act.a]: true }; duree = 0; }
    else if (act.a === 'chaine' && act.i >= 0 && act.i < 4) { const b = (E.poids || CHAINES_DEPART).slice(); b[act.i] ^= 1; E2 = { ...E, poids: b }; duree = 0; }
    else if (act.a === 'meca' && E.cle && E.blocs) { E2 = { ...E, blocs: false }; duree = 1.6; fx = 'casse'; }
    else if (act.a === 'niveau' && E.cle && !E.blocs && (act.s === 1 || act.s === -1) && !((E.niv || 0) + act.s === 1 && !E.piece)) {
      // vers un étage construit : les aiguilles y arrivent à leur place ; sinon l'horloge fait ses tours et revient
      const n = (E.niv || 0) + act.s, N = NIVEAUX[n];
      E2 = N ? { ...E, niv: n, ...N.arrivee } : { ...E }; duree = 9; fx = 'niveau'; s = act.s;
    }
    else if (act.a === 'h2' && act.k >= 0 && act.k < 5 && (act.s === 1 || act.s === -1)) {
      const H2 = tourner2(E.h2 || depart2(), act.k, act.s);
      if (H2) { E2 = { ...E, h2: H2 }; duree = 1.1; fx = 'h2'; s = act.s; quoi = act.k; }
    }
    else if (act.a === 'pont' && !E.pont) { E2 = { ...E, pont: true }; duree = 0; }
    else if (act.a === 'coffre2' && !E.coffre2) { E2 = { ...E, coffre2: true }; duree = 0; }
    else if (act.a === 'grille' && /^grille[EO]$/.test(act.id) && !E.grilles?.[act.id]) { E2 = { ...E, grilles: { ...E.grilles, [act.id]: true } }; duree = 0; }
    else if (act.a === 'tq' && SALLES1.some((q) => q.id === act.salle) && Array.isArray(act.d)) {
      const L = salles1()[act.salle], rots = E.tq?.[act.salle] || [];
      const r2 = pousser(L.plan, L.tourniquets, rots, act.x, act.y, act.d);
      if (r2) { E2 = { ...E, tq: { ...E.tq, [act.salle]: r2 } }; duree = 0; }
    }
    if (!E2) return non();
    this.occupe = true;
    this.salon?.H.send('all', { t: 'djHorE', E2, duree, fx, s, quoi });
    return this.bouger(E2, duree, fx, s, quoi).finally(() => { this.occupe = false; });
  }
  /** messages du salon (passés par les donjons) */
  recevoir(from, m, S) {
    const deHote = String(from) === String(S.H.info.hostId);
    if (m.t === 'djHor' && S.hote) { this.decider(m.act, from); return; }
    if (m.t === 'djHorN' && deHote) { const r = this.attente; this.attente = null; r?.(); return; }
    if (m.t === 'djHor?' && S.hote) { S.H.send(from, { t: 'djHorS', E: this.E }); return; }
    if (m.t === 'djHorE' && deHote && m.E2) {
      for (const [k, txt] of [['cle1', 'Quelqu\'un a trouvé la clé de la grille.'], ['cle', 'Quelqu\'un a trouvé la clé du mécanisme central.'], ['piece', 'Quelqu\'un a trouvé la pièce du mécanisme central.'], ['cle2', 'Quelqu\'un a trouvé la clé de la grande porte.'], ['pont', 'Les monte-charges de l\'étage 2 mènent à l\'arrivée.']]) if (m.E2[k] && !this.E[k]) this.game.ui.toast(txt, 1800);
      for (const k of ['grilleE', 'grilleO']) if (m.E2.grilles?.[k] && !this.E.grilles?.[k]) this.game.ui.toast('Une grille de fer s\'est levée dans les murs.', 1800);
      this.bouger(m.E2, m.duree, m.fx, m.s, m.quoi).then(() => { const r = this.attente; this.attente = null; r?.(); }); return;
    }
    if (m.t === 'djHorS' && deHote && m.E && !this.anim) { this.bouger(m.E, 0); }
  }

  /** fait bouger l'horloge jusqu'à l'état E2, en emportant le joueur qui se tient sur une aiguille qui tourne ;
   *  fx : 'casse' (les blocs se brisent), 'niveau' (l'horloge monte ou descend, s = 1 ou -1), 'bute' (l'aiguille quoi part
   *  dans le sens s, heurte un bloc de pierre et revient à sa place) */
  async bouger(E2, duree, fx = null, s = 0, quoi = null) {
    if (fx === 'h2') return this.bouger2(E2, duree, s, quoi);
    const g = this.game, p = g.player, E = this.E, depuis = E.niv || 0;
    let m = this.ici();
    const net = { ...E, ...E2, grande: heure(E2.grande), fine: heure(E2.fine), petite: heure(E2.petite) };
    // ailleurs que dans la salle des aiguilles où sont les aiguilles : rien à voir ; à l'étage où l'horloge arrive, elle
    // apparaît quand elle a fini de tourner
    if (m && duree && fx === 'niveau' && (m.horlogeNiv || 0) !== depuis) { await attendre(duree * 1000); m = null; }
    if (m && (m.horlogeNiv || 0) !== depuis) m = null;
    // pas dans la salle, ou rien qui bouge : on pose l'horloge sans l'animer
    if (!m || !duree) { Object.assign(E, net); this.D = { ...E }; this.appliquerTout(); return; }
    if (this.anim) await new Promise((r) => { const f = this.anim.fin; this.anim.fin = () => { f(); r(); }; });
    const place = fx ? [p.x, p.y] : emporter(E, net, p.x, p.y);
    // qui monte ou descend avec l'horloge : celui qui se tient sur une aiguille
    const passager = fx === 'niveau' && net.niv !== depuis ? surAiguille(E, p.x, p.y, depuis) : null;
    const de = { ...this.D }, vers = { ...net };
    if (fx === 'niveau') for (const k of ['grande', 'fine', 'petite']) { let d = ((vers[k] - de[k]) % 12 + 12) % 12; vers[k] = de[k] + TOURS + d; }
    else if (fx === 'bute') vers[quoi] = de[quoi] + s * (NIVEAUX[depuis].butee ?? BUTEE);   // jusqu'au bloc (seule cette aiguille bouge)
    else for (const k of ['grande', 'fine', 'petite']) { let d = vers[k] - de[k]; while (d > 6) d -= 12; while (d < -6) d += 12; vers[k] = de[k] + d; }   // le chemin le plus court
    g.sound.sfx(fx === 'casse' ? 'ledge' : 'door');
    if (fx === 'bute') this.choc = false;
    await new Promise((fin) => { this.anim = { de, vers, t: 0, duree, fin, fx, s, E0: { ...E }, depuis }; });
    Object.assign(E, net);
    this.D = { ...E };
    this.appliquerTout();
    if (place[0] !== p.x || place[1] !== p.y) { p.x = place[0]; p.y = place[1]; g.view.update(0, p.x, p.y); }
    if (fx === 'casse') await g.ui.say('Les deux blocs de pierre volent en éclats ! Les aiguilles peuvent faire le tour complet du cadran.');
    if (fx === 'niveau' && net.niv === depuis) await g.ui.say(`L'étage ${depuis + s} n'est pas encore construit : l'horloge est revenue à l'étage ${depuis}.`);
    // celui qui était sur une aiguille arrive avec elle à l'autre étage, à la même place sur l'aiguille
    if (passager) {
      const [x, y] = caseSurAiguille(passager.quoi, net[passager.quoi], passager.r, passager.t, NIVEAUX[net.niv].rSol ?? Infinity);
      this.vu = false;
      await g.warp({ map: NIVEAUX[net.niv].carte, x, y, dir: p.dir || 'down' });
    }
  }
  /** étage 2 : l'aiguille i tourne d'une heure (s), en emportant celui qui se tient dessus */
  async bouger2(E2, duree, s, i) {
    const g = this.game, p = g.player, E = this.E, H0 = (E.h2 || depart2()).slice(), ici = g.mapObj?.id === HORLOGE2;
    if (ici && duree && g.view) {
      if (this.anim2) await new Promise((r) => { const f = this.anim2.fin; this.anim2.fin = () => { f(); r(); }; });
      g.sound.sfx('door');
      await new Promise((fin) => { this.anim2 = { H0, i, s, t: 0, duree, fin }; });
    }
    const place = ici ? emporter2(H0, E2.h2, i, p.x, p.y) : [p.x, p.y];
    Object.assign(E, E2); this.H2aff = E.h2.slice();
    this.appliquerTout();
    if (place[0] !== p.x || place[1] !== p.y) { p.x = place[0]; p.y = place[1]; g.view?.update(0, p.x, p.y); }
  }
  /** étage 2 : un levier (l'aiguille de sa couleur), le grand levier de l'arrivée, ou un monte-charge */
  async utiliser2(x, y) {
    const g = this.game, ui = g.ui, E = this.E; if (!E || this.anim2) return true;
    const L = LEVIERS2.find((q) => egal(q.place, [x, y]));
    if (L) {
      const r = await ui.ask(`Le levier ${NOMS_COULEURS2[L.k - 1]}, relié par une chaîne à l'horloge ${L.k}. Faire tourner son aiguille d'une heure ?`, ['Sens des aiguilles', 'Sens inverse', 'Ne rien faire']);
      if (r === 0 || r === 1) { const avant = (E.h2 || depart2()).join(); await this.demander({ a: 'h2', k: L.k - 1, s: r === 0 ? 1 : -1 }); if ((this.E.h2 || depart2()).join() === avant) await ui.say('L\'aiguille ne peut pas aller plus loin de ce côté.'); }
      return true;
    }
    if (egal(LEVIER_PONT, [x, y])) {
      if (E.pont) { await ui.say('Le grand levier est abaissé : les monte-charges de l\'entrée et de l\'est montent jusqu\'ici.'); return true; }
      if (await ui.yesNo('Un grand levier doré. L\'abaisser ?')) { g.sound.sfx('door'); await this.demander({ a: 'pont' }); await ui.say('Des chaînes se mettent à tourner dans le vide : les monte-charges de l\'entrée et de l\'est mènent maintenant à l\'arrivée.'); }
      return true;
    }
    if (Object.values(MONTE).some((c) => egal(c, [x, y]))) {
      if (!E.pont) { await ui.say('Un monte-charge, immobile. Sa chaîne monte vers le nord-ouest, jusqu\'à un grand levier de l\'autre côté du vide.'); return true; }
      if (!await ui.yesNo('Le monte-charge est prêt. Monter à l\'arrivée ?')) return true;
      const [x0, y0, x1, y1] = PLATEFORMES2.arrivee.r;
      await g.warp({ map: HORLOGE2, x: x0 + 3, y: y1, dir: 'down' });
      return true;
    }
    return false;
  }
  /** étage 2 : le coffre de l'arrivée */
  async coffre2() {
    const g = this.game, E = this.E; if (!E) return true;
    if (E.coffre2) { await g.ui.say(['Le coffre est vide.', 'Au fond de l\'arrivée, un escalier monte vers l\'étage 3. Il n\'est pas encore construit.']); return true; }
    g.sound.sfx('item');
    await g.ui.say(['Dans le coffre, un engrenage d\'or finement ciselé : le Rouage du Temps.', 'Au fond de l\'arrivée, un escalier monte vers l\'étage 3. Il n\'est pas encore construit.']);
    await this.demander({ a: 'coffre2' });
    return true;
  }
  /** pose l'état sur toutes les cartes de la tour : salles des aiguilles, tourniquets et grilles (et redessine les cases
   *  changées de la carte où l'on est) */
  appliquerTout() {
    const g = this.game, E = this.E, W = g.world.maps;
    for (const n in NIVEAUX) if (W[NIVEAUX[n].carte]) appliquer(W[NIVEAUX[n].carte], E);
    if (W[HORLOGE2]) { const c2 = appliquer2(W[HORLOGE2], E); if (g.mapObj?.id === HORLOGE2 && g.view) for (const [x, y] of c2) g.view.rebuildAt(x, y); }
    const ch = { ...appliquerSalles1(g.world, E), ...appliquerSallesM1(g.world, E) }[g.mapObj?.id];
    if (ch && g.view) for (const [x, y] of ch) g.view.rebuildAt(x, y);
  }
  /** la grande porte, en haut de l'escalier */
  async grandePorte() {
    const g = this.game, E = this.E;
    if (!E?.cle2) { await g.ui.say(['Une porte immense, en chêne cerclé de fer. Un cadran de laiton est pris dans la pierre au-dessus.', 'Elle est fermée à clé, et la serrure est énorme. La clé doit être sous la tour.']); return true; }
    if (!this.porte2) { this.porte2 = true; await g.ui.say('La clé tourne dans l\'énorme serrure. Les deux battants s\'ouvrent lentement.'); }
    g.sound.sfx('door');
    await g.warp({ map: HORLOGE2, x: PORTE2[0], y: PORTE2[1] - 1, dir: 'up' });
    return true;
  }
  /** prendre une clé (dans les salles) */
  async prendre(quoi) {
    const g = this.game, E = this.E; if (!E) return false;
    if (E[quoi]) { await g.ui.say('Le coffre est vide.'); return true; }
    g.sound.sfx('item');
    await g.ui.say({ cle1: 'Dans le coffre, une petite clé de fer : la clé de la grille !', cle: 'Dans le coffre, une grosse clé de laiton : la clé du mécanisme central !', piece: ['Dans le coffre, une grande roue dentée de laiton : la pièce qui manque au mécanisme central !', 'Avec elle, l\'horloge pourra monter à l\'étage 1.'], cle2: ['Dans le coffre, une clé de fer immense, presque aussi longue qu\'un bras.', 'Elle doit ouvrir la grande porte, tout en haut de l\'escalier de l\'étage 1.'] }[quoi]);
    await this.demander({ a: quoi });
    return true;
  }
  /** une chaîne de la salle des contrepoids : un poids descend dans sa fosse, l'autre remonte */
  async chaine(i) {
    const g = this.game;
    if (!await g.ui.yesNo('Une lourde chaîne pend du plafond, reliée à deux contrepoids. La tirer ?')) return true;
    g.sound.sfx('door');
    await this.demander({ a: 'chaine', i });
    return true;
  }
  /** la salle des balanciers : chacun voit les balanciers au même rythme (l'heure de l'ordinateur) ; celui qu'un
   *  balancier touche revient au début de la salle */
  balanciers() {
    const g = this.game, m = g.mapObj; if (m?.horlogeM1 !== 'balanciers' || !g.view) return;
    const t = Date.now() / 1000, avant = m._bal || new Set(), maint = new Set();
    for (const L of m.planM1.lignes) for (const [x, y] of balancier(L, t)) maint.add(x + ',' + y);
    for (const k of new Set([...avant, ...maint])) {
      if (avant.has(k) === maint.has(k)) continue;
      const [x, y] = k.split(',').map(Number), mur = m.planM1.plan[y][x] === '#';
      m.solArene.set(k, maint.has(k) ? (mur ? 'balancier_mur' : 'balancier') : (mur ? 'rail_mur' : 'rail'));
      g.view.rebuildAt(x, y);
    }
    m._bal = maint;
    const p = g.player, ici = (x, y) => maint.has(Math.round(x) + ',' + Math.round(y));
    if (!g.busy && !this.touche && (ici(p.x, p.y) || (p.move && ici(p.move.tx, p.move.ty)))) {
      this.touche = true; g.sound.sfx('bump'); g.ui.toast('Le balancier te renvoie au début de la salle !', 1600);
      const [x, y] = m.planM1.porte.case;
      g.warp({ map: m.id, x, y, dir: 'up' }).finally(() => { this.touche = false; });
    }
  }
  /** la grille entre la salle ouest et la salle nord */
  async grille(vers, x, y) {
    const g = this.game, E = this.E; if (!E) return false;
    if (!E.cle1) { await g.ui.say('Une grille de fer, fermée à clé.'); return true; }
    g.sound.sfx('door');
    await g.warp({ map: vers, x, y, dir: 'down' });
    return true;
  }
  /** E devant un levier ou devant le mécanisme central (la barre du pivot) */
  async utiliser(x, y) {
    const g = this.game, ui = g.ui, m = this.ici(); if (!m || this.anim) return false;
    const E = this.E, ici = [x, y], n = m.horlogeNiv || 0;
    const L = NIVEAUX[n].leviers.find((q) => egal(placeLevier(q), ici));
    if (L && L.quoi.startsWith('grille')) {
      if (E.grilles?.[L.quoi]) { await ui.say('Le levier est abaissé. Quelque part dans le mur, une grille est levée.'); return true; }
      if (await ui.yesNo(`${L.nom}, relié par une chaîne au mur de la tour. L'abaisser ?`)) { g.sound.sfx('door'); await this.demander({ a: 'grille', id: L.quoi }); await ui.say('Un grincement de chaîne, au loin, dans le mur : une grille se lève.'); }
      return true;
    }
    if (L && (E.niv || 0) !== n) { await ui.say(`${L.nom}. Il n'y a pas d'aiguille à cet étage : l'horloge est à l'étage ${E.niv || 0}.`); return true; }
    if (L) {
      const r = await ui.ask(`${L.nom}. Faire tourner ${NOMS[L.quoi]} d'une heure ?`, ['Sens des aiguilles', 'Sens inverse', 'Ne rien faire']);
      if (r !== 0 && r !== 1) return true;
      const s = r === 0 ? 1 : -1;
      await this.demander({ a: 'tourner', quoi: L.quoi, s });
      return true;
    }
    if (casesMecanisme().some((c) => egal(c, ici))) {
      if (!E.cle) { await ui.say(['Le mécanisme central, pris dans la barre du pivot : une grande serrure de laiton.', 'Il manque une clé.']); return true; }
      if (E.blocs) {
        if (await ui.yesNo('La clé entre dans la serrure du mécanisme central. La tourner ?')) await this.demander({ a: 'meca' });
        return true;
      }
      if (n === -1 && caseHorloge(E, g.player.x, g.player.y, -1)?.quoi !== 'aiguille') { await ui.say('Du sol, le mécanisme est hors de portée : il faut se tenir sur une aiguille.'); return true; }
      const choix = [[n + 1, 1], [n - 1, -1]].filter(([k]) => k >= -1 && k <= 1);
      const r = await ui.ask('Le mécanisme central. Faire bouger l\'horloge ?', [...choix.map(([k, s]) => `${s > 0 ? 'Monter' : 'Descendre'} à l'étage ${k}`), 'Ne rien faire']);
      if (r >= 0 && r < choix.length && choix[r][0] === 1 && !E.piece) { await ui.say(['Le mécanisme grince et s\'arrête net : une grande roue dentée manque dans les engrenages.', 'Sans elle, l\'horloge ne peut pas monter. Elle doit être quelque part sous la tour.']); return true; }
      if (r >= 0 && r < choix.length) await this.demander({ a: 'niveau', s: choix[r][1] });
      return true;
    }
    return false;
  }
  /** en arrivant dans la salle : on demande l'état de l'horloge à l'hôte (sans texte) */
  arrivee() {
    if (!this.ici() || this.vu) return;
    this.vu = true;
    const S = this.salon;
    if (S && !S.hote) S.H.send('host', { t: 'djHor?' });
  }
}
