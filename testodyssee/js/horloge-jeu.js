// testodyssee/js/horloge-jeu.js — les règles de la Tour de l'Horloge (horloge.js) dans le jeu du labo : les leviers,
// le joueur emporté par l'aiguille sur laquelle il se tient, la clé et le mécanisme central, et le dessin
// (horloge-vue.js) à la place du sol et des murs de la carte.
// À plusieurs, l'hôte du salon tient l'état de l'horloge : un levier demande le mouvement à l'hôte (message djHor), qui
// le valide et l'annonce à tous (djHorE) ; chacun anime l'horloge et emporte son propre joueur s'il est sur l'aiguille.
import { HORLOGE, C, LEVIERS, NOMS, appliquer, caseHorloge, placeLevier, placeCle, placeMecanisme, tourner, emporter, heure } from './horloge.js';
import { creerHorloge, poserHorloge } from './horloge-vue.js';

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
const egal = (a, b) => a[0] === b[0] && a[1] === b[1];

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
  ici() { const m = this.game.mapObj; return m?.id === HORLOGE ? m : null; }
  get E() { return this.game.world.maps[HORLOGE]?.horloge; }
  /** avant un pas : tout est à la même hauteur, rien à refuser */
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
    if (this.anim) {
      const A = this.anim; A.t = Math.min(1, A.t + dt / A.duree);
      const u = A.t < 0.5 ? 2 * A.t * A.t : 1 - (-2 * A.t + 2) ** 2 / 2;
      for (const k of ['grande', 'fine', 'petite']) this.D[k] = A.de[k] + (A.vers[k] - A.de[k]) * u;
      if (A.t >= 1) { this.anim = null; A.fin(); }
    }
    this.D.cle = this.E.cle;
    poserHorloge(this.vue.H, this.D);
    if (!this.vu && !g.busy) this.arrivee();
  }

  /* ---------------- à plusieurs ---------------- */
  /** le salon (celui des donjons), s'il y en a un */
  get salon() { const D = this.game.donjons; return D?.H ? D : null; }
  /** une action ({ a: 'tourner', quoi, s } ou { a: 'cle' }) : l'hôte décide, tout le monde voit */
  demander(act) {
    const S = this.salon;
    if (!S || S.hote) return this.decider(act);
    S.H.send('host', { t: 'djHor', act });
    return new Promise((r) => { this.attente = r; setTimeout(() => { if (this.attente === r) { this.attente = null; r(); } }, 6000); });
  }
  /** chez l'hôte : un seul mouvement à la fois, annoncé à tous */
  decider(act) {
    const E = this.E;
    if (this.occupe || !act || !E) return Promise.resolve();
    let E2 = null, duree = 1.1;
    if (act.a === 'tourner' && (act.quoi === 'grande' || act.quoi === 'fine') && (act.s === 1 || act.s === -1)) E2 = tourner(E, act.quoi, act.s);
    else if (act.a === 'cle' && !E.cle) { E2 = { ...E, cle: true }; duree = 0; }
    if (!E2) return Promise.resolve();
    this.occupe = true;
    this.salon?.H.send('all', { t: 'djHorE', E2, duree });
    return this.bouger(E2, duree).finally(() => { this.occupe = false; });
  }
  /** messages du salon (passés par les donjons) */
  recevoir(from, m, S) {
    const deHote = String(from) === String(S.H.info.hostId);
    if (m.t === 'djHor' && S.hote) { this.decider(m.act); return; }
    if (m.t === 'djHor?' && S.hote) { S.H.send(from, { t: 'djHorS', E: this.E }); return; }
    if (m.t === 'djHorE' && deHote && m.E2) {
      if (m.E2.cle && !this.E.cle && this.ici()) this.game.ui.toast('La clé du mécanisme central a été trouvée.', 1800);
      this.bouger(m.E2, m.duree).then(() => { const r = this.attente; this.attente = null; r?.(); }); return;
    }
    if (m.t === 'djHorS' && deHote && m.E && !this.anim) { this.bouger(m.E, 0); }
  }

  /** fait tourner l'horloge jusqu'à l'état E2, en emportant le joueur qui se tient sur une aiguille qui tourne */
  async bouger(E2, duree) {
    const g = this.game, p = g.player, m = this.ici(), E = this.E;
    const net = { ...E, ...E2, grande: heure(E2.grande), fine: heure(E2.fine), petite: heure(E2.petite), cle: !!E2.cle };
    // pas dans la salle, ou rien qui tourne : on pose l'horloge sans l'animer
    if (!m || !duree) { Object.assign(E, net); this.D = { ...E }; appliquer(g.world.maps[HORLOGE], E); return; }
    if (this.anim) await new Promise((r) => { const f = this.anim.fin; this.anim.fin = () => { f(); r(); }; });
    const place = emporter(E, net, p.x, p.y);
    const de = { ...this.D }, vers = { ...net };
    // le chemin le plus court sur le cadran
    for (const k of ['grande', 'fine', 'petite']) { let d = vers[k] - de[k]; while (d > 6) d -= 12; while (d < -6) d += 12; vers[k] = de[k] + d; }
    g.sound.sfx('door');
    await new Promise((fin) => { this.anim = { de, vers, t: 0, duree, fin, E0: { ...E } }; });
    Object.assign(E, net);
    this.D = { ...E };
    appliquer(m, E);
    if (place[0] !== p.x || place[1] !== p.y) { p.x = place[0]; p.y = place[1]; g.view.update(0, p.x, p.y); }
  }
  /** E devant un levier, la clé ou le mécanisme central */
  async utiliser(x, y) {
    const g = this.game, ui = g.ui, m = this.ici(); if (!m || this.anim) return false;
    const E = this.E, ici = [x, y];
    const L = LEVIERS.find((q) => egal(placeLevier(q), ici));
    if (L) {
      const r = await ui.ask(`${L.nom}. Faire tourner ${NOMS[L.quoi]} d'une heure ?`, ['Sens des aiguilles', 'Sens inverse', 'Ne rien faire']);
      if (r === 0 || r === 1) await this.demander({ a: 'tourner', quoi: L.quoi, s: r === 0 ? 1 : -1 });
      return true;
    }
    if (egal(placeCle(), ici)) {
      if (E.cle) return false;
      g.sound.sfx('item');
      await ui.say('Une grosse clé de laiton, accrochée au mur : la clé du mécanisme central !');
      await this.demander({ a: 'cle' });
      return true;
    }
    if (egal(placeMecanisme(), ici)) {
      if (!E.cle) { await ui.say(['Le mécanisme central : une grande manivelle reliée à la barre du pivot.', 'Elle est verrouillée. Il manque une clé.']); return true; }
      const r = await ui.ask('Le mécanisme central. La clé tourne dans la serrure.\nFaire bouger l\'horloge ?', ['Monter à l\'étage 1', 'Descendre à l\'étage -1', 'Ne rien faire']);
      if (r === 0 || r === 1) await ui.say('Les étages 1 et -1 ne sont pas encore construits : l\'horloge reste au niveau 0.');
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
      'L\'aiguille fine est la plus longue : elle seule atteint les corniches.']); } finally { g.busy = false; }
  }
}
