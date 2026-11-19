// testodyssee/js/horloge-jeu.js — les règles de la Tour de l'Horloge (horloge.js) dans le jeu du labo : les leviers,
// le joueur emporté par l'aiguille sur laquelle il se tient, les clés, la grille, le mécanisme central et ses animations,
// le dessin (horloge-vue.js) à la place du sol et des murs de la carte, et la caméra qui recule devant la tour.
// À plusieurs, l'hôte du salon tient l'état de l'horloge : une action demande le mouvement à l'hôte (message djHor), qui
// la valide et l'annonce à tous (djHorE) ; chacun anime l'horloge et emporte son propre joueur s'il est sur l'aiguille.
import * as THREE from 'three';
import { HORLOGE, DEHORS, C, LEVIERS, NOMS, appliquer, caseHorloge, casesMecanisme, placeLevier, tourner, emporter, heure } from './horloge.js';
import { creerHorloge, poserHorloge } from './horloge-vue.js';

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
const egal = (a, b) => a[0] === b[0] && a[1] === b[1];
const lisse = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
/** la montée ou la descente de l'horloge : les aiguilles tournent de plus en plus vite (3 tours), puis ralentissent */
const TOURS = 36, PIC = 0.7;
const tours = (t) => (t < PIC ? (t * t) / (2 * PIC) : 0.5 * PIC + 0.5 * (1 - PIC) - ((1 - t) ** 2) / (2 * (1 - PIC))) / 0.5;
/** et le décor qui glisse (on descend : il monte) : rien au début, puis il part, attend, et revient */
const glisse = (t) => lisse((t - 0.3) / 0.2) - lisse((t - 0.78) / 0.17);

export class Horloge {
  constructor(game) {
    this.game = game;
    const v = game.view;
    // pendant que l'aiguille tourne, ceux qui se tiennent dessus (soi et les autres) tournent avec elle
    const place = v.place.bind(v);
    v.place = (a, x, y, ...r) => { const d = this.decalage(x, y); place(a, d ? x + d[0] : x, d ? y + d[1] : y, ...r); };
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
  /** avant un pas : on ne marche pas pendant que l'horloge bouge */
  avantPas() { return !!(this.ici() && this.anim); }
  /** à chaque image : l'horloge dessinée, les aiguilles qui tournent vers leur place */
  tick(dt) {
    const g = this.game, v = g.view, m = this.ici();
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
    let E2 = null, duree = 1.1, fx = null, s = 0;
    if (act.a === 'tourner' && (act.quoi === 'grande' || act.quoi === 'fine') && (act.s === 1 || act.s === -1)) E2 = tourner(E, act.quoi, act.s);
    else if ((act.a === 'cle1' || act.a === 'cle') && !E[act.a]) { E2 = { ...E, [act.a]: true }; duree = 0; }
    else if (act.a === 'meca' && E.cle && E.blocs) { E2 = { ...E, blocs: false }; duree = 1.6; fx = 'casse'; }
    else if (act.a === 'niveau' && E.cle && !E.blocs && (act.s === 1 || act.s === -1)) { E2 = { ...E }; duree = 9; fx = 'niveau'; s = act.s; }
    if (!E2) return Promise.resolve();
    this.occupe = true;
    this.salon?.H.send('all', { t: 'djHorE', E2, duree, fx, s });
    return this.bouger(E2, duree, fx, s).finally(() => { this.occupe = false; });
  }
  /** messages du salon (passés par les donjons) */
  recevoir(from, m, S) {
    const deHote = String(from) === String(S.H.info.hostId);
    if (m.t === 'djHor' && S.hote) { this.decider(m.act); return; }
    if (m.t === 'djHor?' && S.hote) { S.H.send(from, { t: 'djHorS', E: this.E }); return; }
    if (m.t === 'djHorE' && deHote && m.E2) {
      for (const [k, txt] of [['cle1', 'Quelqu\'un a trouvé la clé de la grille.'], ['cle', 'Quelqu\'un a trouvé la clé du mécanisme central.']]) if (m.E2[k] && !this.E[k]) this.game.ui.toast(txt, 1800);
      this.bouger(m.E2, m.duree, m.fx, m.s).then(() => { const r = this.attente; this.attente = null; r?.(); }); return;
    }
    if (m.t === 'djHorS' && deHote && m.E && !this.anim) { this.bouger(m.E, 0); }
  }

  /** fait bouger l'horloge jusqu'à l'état E2, en emportant le joueur qui se tient sur une aiguille qui tourne ;
   *  fx : 'casse' (les blocs se brisent), 'niveau' (l'horloge monte ou descend, s = 1 ou -1) */
  async bouger(E2, duree, fx = null, s = 0) {
    const g = this.game, p = g.player, m = this.ici(), E = this.E;
    const net = { ...E, ...E2, grande: heure(E2.grande), fine: heure(E2.fine), petite: heure(E2.petite) };
    // pas dans la salle, ou rien qui bouge : on pose l'horloge sans l'animer
    if (!m || !duree) { Object.assign(E, net); this.D = { ...E }; appliquer(g.world.maps[HORLOGE], E); return; }
    if (this.anim) await new Promise((r) => { const f = this.anim.fin; this.anim.fin = () => { f(); r(); }; });
    const place = fx ? [p.x, p.y] : emporter(E, net, p.x, p.y);
    const de = { ...this.D }, vers = { ...net };
    if (fx === 'niveau') for (const k of ['grande', 'fine', 'petite']) vers[k] = de[k] + TOURS;
    else for (const k of ['grande', 'fine', 'petite']) { let d = vers[k] - de[k]; while (d > 6) d -= 12; while (d < -6) d += 12; vers[k] = de[k] + d; }   // le chemin le plus court
    g.sound.sfx(fx === 'casse' ? 'ledge' : 'door');
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
      if (!tourner(this.E, L.quoi, s)) { await ui.say('Le levier résiste : l\'aiguille bute contre un bloc de pierre.'); return true; }
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
