// testodyssee/js/horloge-jeu.js — les règles de la Tour de l'Horloge (horloge.js) dans le jeu du labo : les leviers,
// le joueur emporté par l'aiguille sur laquelle il se tient, les clés, la grille, le mécanisme central et ses animations,
// le dessin (horloge-vue.js) à la place du sol et des murs de la carte, et la caméra qui recule devant la tour.
// À plusieurs, l'hôte du salon tient l'état de l'horloge : une action demande le mouvement à l'hôte (message djHor), qui
// la valide et l'annonce à tous (djHorE) ; chacun anime l'horloge et emporte son propre joueur s'il est sur l'aiguille.
import * as THREE from 'three';
import { HORLOGE, DEHORS, VESTIBULE, VW, TUBE_Y, C, LEVIERS, NOMS, appliquer, caseHorloge, casesMecanisme, placeLevier, tourner, emporter, heure, dansLeTube, boutsDuTube, V_PORTE, VH, VESTIBULE as VEST, SALLES, PLATEFORMES, salleId, labyrinthes, placeArrivee, caseSur } from './horloge.js';
import { creerHorloge, poserHorloge } from './horloge-vue.js';

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
      const d = this.decalage(x, y);
      // dans le vestibule, qui est dans le tube de cuivre y est dessiné en hauteur (soi : on le sait ; les autres : on le
      // devine, celui qui arrive sur la rangée du tube par un pas de côté ou en apparaissant y est, celui qui y arrive
      // par un pas vers le haut ou le bas passe dessous)
      if (this.game.mapObj?.id === VESTIBULE && this.dansTube(a, x, y, a === v.actors.get('player'))) hop += TUBE_H;
      place(a, d ? x + d[0] : x, d ? y + d[1] : y, hop, ...r);
    };
    const update = v.update.bind(v);
    v.update = (dt, x, y, ...r) => {
      update(dt, x, y, ...r);
      const d = y != null && this.decalage(x, y);
      if (d) { v.camera.position.x += d[0]; v.camera.position.z += d[1]; v.camera.updateMatrixWorld(); }
      this.recul();
    };
    // le sol et les murs de la carte ne se dessinent pas : seulement les volumes de l'horloge
    const render = v.render.bind(v);
    v.render = () => { if (this.ici()) for (const c of v.chunks?.values() || []) c.visible = false; render(); };
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
  /** devant la tour, en arrivant : la caméra recule pour la montrer en entier, puis revient */
  recul() {
    const g = this.game, v = g.view, m = g.mapObj;
    if (m?.id !== DEHORS) { this.dehors = null; return; }
    if (!this.dehors) this.dehors = { debut: performance.now() };
    const t = (performance.now() - this.dehors.debut) / 1000 - 0.6;   // on laisse d'abord l'écran s'ouvrir
    const f = lisse(t / 1.6) - lisse((t - 4.2) / 1.6);
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
  ici() { const m = this.game.mapObj; return m?.id === HORLOGE ? m : null; }
  get E() { return this.game.world.maps[HORLOGE]?.horloge; }
  /** avant un pas : on ne marche pas pendant que l'horloge bouge ; dans le vestibule, on ne descend pas du tube et l'on
   *  n'y monte pas (on passe dessous par le couloir du milieu) */
  avantPas(d) {
    if (this.ici() && this.anim) return true;
    const g = this.game, p = g.player, m = g.mapObj;
    if (p.move || !d || g.busy || !m) return false;
    const [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[d], tx = p.x + dx, ty = p.y + dy;
    const arret = () => { p.dir = d; p.walking = false; return true; };
    // la bouche du tube, au bout de la salle est : on s'y glisse en marchant dedans
    if (m.tube && tx === m.tube.x && ty === m.tube.y) { arret(); this.entrerTube(...m.tube.vers); return true; }
    // la porte d'une salle du mur, vers sa plateforme : on y entre en marchant dedans
    if (m.porte && tx === m.porte[0] && ty === m.porte[1]) { arret(); g.warp(m.warpAt(tx, ty)); return true; }
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
  /** quelqu'un posé en (x, y) dans le vestibule est-il dans le tube ? */
  dansTube(a, x, y, moi) {
    const cx = Math.round(x), cy = Math.round(y), ici = cy === TUBE_Y;
    if (moi) return ici && this.tube;
    const avant = a._tube;
    if (!avant || avant.x !== cx || avant.y !== cy) a._tube = { x: cx, y: cy, dedans: ici && (!avant || (avant.y === cy && avant.dedans)) };
    return a._tube.dedans;
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
    const L = labyrinthes(), [ax, ay] = placeArrivee(), pf = (p) => { const P = PLATEFORMES.find((q) => q.id === p); const [x, y] = caseSur(p, P.r1 - 0.5, 0); return { map: HORLOGE, x, y, dir: 'down' }; };
    return [
      { nom: 'Le vestibule', to: { map: VEST, x: V_PORTE[0], y: VH - 2, dir: 'up' } },
      { nom: 'Le quai (salle des aiguilles)', to: { map: HORLOGE, x: ax, y: ay, dir: 'up' } },
      ...PLATEFORMES.filter((p) => p.id !== 'sud').map((p) => ({ nom: p.nom, to: pf(p.id) })),
      ...SALLES.map((s) => ({ nom: s.nom, to: { map: salleId(s), x: L[s.id].entree[0], y: L[s.id].entree[1], dir: 'up' } })),
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
    if (!m || !v.root) return;
    if (!this.D) this.D = { ...this.E };
    if (this.vue?.root !== v.root) {
      const H = creerHorloge(); v.root.add(H.G); this.vue = { root: v.root, H };
      v.scene.background?.set?.('#07060a');
    }
    this.D.envY = 0; this.D.casse = 0;
    if (this.anim) {
      const A = this.anim; A.t = Math.min(1, A.t + dt / A.duree);
      if (A.fx === 'niveau') {
        const u = tours(A.t); for (const k of ['grande', 'fine', 'petite']) this.D[k] = A.de[k] + TOURS * u;
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
    poserHorloge(this.vue.H, this.D);
    if (!this.vu && !g.busy) this.arrivee();
  }

  /* ---------------- à plusieurs ---------------- */
  /** le salon (celui des donjons), s'il y en a un */
  get salon() { const D = this.game.donjons; return D?.H ? D : null; }
  /** une action ({ a: 'tourner', quoi, s }, { a: 'cle1' | 'cle' }, { a: 'meca' }, { a: 'niveau', s }) : l'hôte décide, tout le monde voit */
  demander(act) {
    const S = this.salon;
    if (!S || S.hote) return this.decider(act);
    S.H.send('host', { t: 'djHor', act });
    return new Promise((r) => { this.attente = r; setTimeout(() => { if (this.attente === r) { this.attente = null; r(); } }, 15000); });
  }
  /** chez l'hôte : un seul mouvement à la fois, annoncé à tous */
  decider(act) {
    const E = this.E;
    if (this.occupe || !act || !E) return Promise.resolve();
    let E2 = null, duree = 1.1, fx = null, s = 0, quoi = null;
    if (act.a === 'tourner' && (act.quoi === 'grande' || act.quoi === 'fine') && (act.s === 1 || act.s === -1)) {
      E2 = tourner(E, act.quoi, act.s);
      // un bloc de pierre l'arrête : l'aiguille part, bute contre lui et revient
      if (!E2) { E2 = { ...E }; duree = 1.5; fx = 'bute'; s = act.s; quoi = act.quoi; }
    }
    else if ((act.a === 'cle1' || act.a === 'cle') && !E[act.a]) { E2 = { ...E, [act.a]: true }; duree = 0; }
    else if (act.a === 'meca' && E.cle && E.blocs) { E2 = { ...E, blocs: false }; duree = 1.6; fx = 'casse'; }
    else if (act.a === 'niveau' && E.cle && !E.blocs && (act.s === 1 || act.s === -1)) { E2 = { ...E }; duree = 9; fx = 'niveau'; s = act.s; }
    if (!E2) return Promise.resolve();
    this.occupe = true;
    this.salon?.H.send('all', { t: 'djHorE', E2, duree, fx, s, quoi });
    return this.bouger(E2, duree, fx, s, quoi).finally(() => { this.occupe = false; });
  }
  /** messages du salon (passés par les donjons) */
  recevoir(from, m, S) {
    const deHote = String(from) === String(S.H.info.hostId);
    if (m.t === 'djHor' && S.hote) { this.decider(m.act); return; }
    if (m.t === 'djHor?' && S.hote) { S.H.send(from, { t: 'djHorS', E: this.E }); return; }
    if (m.t === 'djHorE' && deHote && m.E2) {
      for (const [k, txt] of [['cle1', 'Quelqu\'un a trouvé la clé de la grille.'], ['cle', 'Quelqu\'un a trouvé la clé du mécanisme central.']]) if (m.E2[k] && !this.E[k]) this.game.ui.toast(txt, 1800);
      this.bouger(m.E2, m.duree, m.fx, m.s, m.quoi).then(() => { const r = this.attente; this.attente = null; r?.(); }); return;
    }
    if (m.t === 'djHorS' && deHote && m.E && !this.anim) { this.bouger(m.E, 0); }
  }

  /** fait bouger l'horloge jusqu'à l'état E2, en emportant le joueur qui se tient sur une aiguille qui tourne ;
   *  fx : 'casse' (les blocs se brisent), 'niveau' (l'horloge monte ou descend, s = 1 ou -1), 'bute' (l'aiguille quoi part
   *  dans le sens s, heurte un bloc de pierre et revient à sa place) */
  async bouger(E2, duree, fx = null, s = 0, quoi = null) {
    const g = this.game, p = g.player, m = this.ici(), E = this.E;
    const net = { ...E, ...E2, grande: heure(E2.grande), fine: heure(E2.fine), petite: heure(E2.petite) };
    // pas dans la salle, ou rien qui bouge : on pose l'horloge sans l'animer
    if (!m || !duree) { Object.assign(E, net); this.D = { ...E }; appliquer(g.world.maps[HORLOGE], E); return; }
    if (this.anim) await new Promise((r) => { const f = this.anim.fin; this.anim.fin = () => { f(); r(); }; });
    const place = fx ? [p.x, p.y] : emporter(E, net, p.x, p.y);
    const de = { ...this.D }, vers = { ...net };
    if (fx === 'niveau') for (const k of ['grande', 'fine', 'petite']) vers[k] = de[k] + TOURS;
    else if (fx === 'bute') vers[quoi] = de[quoi] + s * BUTEE;   // jusqu'au bloc (seule cette aiguille bouge)
    else for (const k of ['grande', 'fine', 'petite']) { let d = vers[k] - de[k]; while (d > 6) d -= 12; while (d < -6) d += 12; vers[k] = de[k] + d; }   // le chemin le plus court
    g.sound.sfx(fx === 'casse' ? 'ledge' : 'door');
    if (fx === 'bute') this.choc = false;
    await new Promise((fin) => { this.anim = { de, vers, t: 0, duree, fin, fx, s, E0: { ...E } }; });
    Object.assign(E, net);
    this.D = { ...E };
    appliquer(m, E);
    if (place[0] !== p.x || place[1] !== p.y) { p.x = place[0]; p.y = place[1]; g.view.update(0, p.x, p.y); }
    if (fx === 'casse') await g.ui.say('Les deux blocs de pierre volent en éclats ! Les aiguilles peuvent faire le tour complet du cadran.');
    if (fx === 'niveau') await g.ui.say(`L'étage ${s > 0 ? '1' : '-1'} n'est pas encore construit : l'horloge est revenue au niveau 0.`);
  }
  /** prendre une clé (dans les salles) */
  async prendre(quoi) {
    const g = this.game, E = this.E; if (!E) return false;
    if (E[quoi]) { await g.ui.say('Le coffre est vide.'); return true; }
    g.sound.sfx('item');
    await g.ui.say(quoi === 'cle1' ? 'Dans le coffre, une petite clé de fer : la clé de la grille !' : 'Dans le coffre, une grosse clé de laiton : la clé du mécanisme central !');
    await this.demander({ a: quoi });
    return true;
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
    const E = this.E, ici = [x, y];
    const L = LEVIERS.find((q) => egal(placeLevier(q), ici));
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
      const r = await ui.ask('Le mécanisme central. Faire bouger l\'horloge ?', ['Monter à l\'étage 1', 'Descendre à l\'étage -1', 'Ne rien faire']);
      if (r === 0 || r === 1) await this.demander({ a: 'niveau', s: r === 0 ? 1 : -1 });
      return true;
    }
    return false;
  }
  /** en arrivant dans la salle : où l'on est, et à quoi servent les leviers */
  async arrivee() {
    if (!this.ici() || this.vu) return;
    this.vu = true;
    const g = this.game, S = this.salon;
    if (S && !S.hote) S.H.send('host', { t: 'djHor?' });   // l'état de l'horloge chez l'hôte
    g.busy = true;
    await attendre(300);
    try { await g.ui.say(['Une horloge gigantesque, au creux de la tour. Ses aiguilles sont des passerelles.',
      'Sur chaque plateforme, le levier rouge fait tourner la grande aiguille d\'une heure, le bleu l\'aiguille fine.',
      'Celui qui se tient sur une aiguille est emporté avec elle... mais il faut quelqu\'un d\'autre au levier.',
      'Deux blocs de pierre empêchent les aiguilles d\'atteindre la corniche nord.']); } finally { g.busy = false; }
  }
}
