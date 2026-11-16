// testodyssee/js/donjon/course.js — mécaniques de la Grande Course (donjons/course.js), ajoutées à la classe Donjons.
//
// Partagé par le groupe (données de la salle c0) : depart (la graine de la course en cours, posée par l'arbitre) et,
// pour chaque arrivée, `fin:<graine>:<joueur>` = { t: temps en ms, nom }. Tout le reste est à chacun : dresseurs battus,
// casse-têtes résolus et grilles ouvertes sont gardés ici (this.course), remis à zéro à chaque nouvelle course.
// Les casse-têtes sont tirés de la graine : tout le monde a les mêmes. Les autres coureurs ne sont pas dessinés.
import { createMon, healFull } from '../../../odyssee/js/core/mon.js';
import { T } from '../../../odyssee/js/world/tiles.js';
import { fermer, ouvrir } from './plan.js';
import { JEUX_SEPULTURE } from './jeux-tombeau.js';
import { jouerCasseTete } from './jeux-tombeau-ecran.js';

const cle = (x, y) => x + ',' + y;
const estCourse = (d) => !!d?.course;
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
/** un tirage reproductible (mulberry32) : la même graine donne les mêmes casse-têtes à tous */
export function alea(graine) {
  let a = graine >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const PENALITE = 10000;   // une défaite : dix secondes à attendre, équipe soignée
const temps = (ms) => { const s = ms / 1000, m = Math.floor(s / 60); return `${m}:${(s % 60).toFixed(1).padStart(4, '0')}`; };

export const Course = {
  poserObjetsCourse(d, m) {
    if (!estCourse(d)) return;
    const P = m.donjon.plan;
    (m.course = { grilles: [], arrivee: new Set() });
    for (const [c, l] of Object.entries(P.objets)) {
      const o = d.objets[c];
      for (const [x, y] of l) {
        if (o.type === 'grilleCourse') { m.course.grilles.push({ x, y, cle: o.cle }); fermer(m, x, y, 'porte_grille'); }
        else if (o.type === 'arrivee') m.course.arrivee.add(cle(x, y));
        else if (o.type === 'steleCourse') m.object(x, y, { use: () => this.steleCourse(d, o) });
        else if (o.type === 'tableauCourse') m.object(x, y, { use: () => this.tableauCourse(d) });
        else if (o.type === 'arbitre') m.npc({ id: `${d.id}:arbitre`, x, y, dir: 'down', sprite: 'habitant', move: 'static', talk: () => this.arbitre(d) });
        else if (o.type === 'dresseurCourse') {
          const p = o.dresseur;
          m.npc({ id: `${d.id}:${o.cle}`, x, y, dir: p.dir || 'down', sprite: p.sprite, move: 'static',
            when: () => !this.courseFait(d, 'd:' + o.cle), talk: () => this.dresseurCourse(d, o) });
        }
      }
    }
  },
  /** la course en cours (sa graine) et l'état à moi de cette course */
  donneesCourse(d) { return this.etats[d.id]?.salles.c0?.donnees || {}; },
  courseFait(d, k) { const C = this.course; return !!(C && C.graine === this.donneesCourse(d).depart && C.faits.has(k)); },
  /** ce qui est fait (dresseur battu, casse-tête résolu) : la grille de même clé s'ouvre, chez moi seulement */
  async marquerCourse(d, k) {
    this.course.faits.add(k);
    this.grillesCourse(d);
    this.game.refreshNpcs();
  },
  grillesCourse(d) {
    const g = this.game, faits = this.course?.graine === this.donneesCourse(d).depart ? this.course.faits : new Set();
    for (const s of d.salles) {
      const m = g.world.maps[s.carte]; if (!m?.course) continue;
      for (const q of m.course.grilles) {
        const ouverte = faits.has(q.cle) || (q.cle === 'depart' && this.course?.parti);
        if (ouverte) { if (ouvrir(m, q.x, q.y) && g.mapObj === m) { g.view.decoAt.delete(cle(q.x, q.y)); g.view.rebuildAt(q.x, q.y); } }
        else if (m.get(q.x, q.y) !== T.BLOCK && !(g.mapObj === m && g.player.x === q.x && g.player.y === q.y)) {
          fermer(m, q.x, q.y, 'porte_grille');
          if (g.mapObj === m) { g.view.decoAt.set(cle(q.x, q.y), m.deco.find((z) => z.x === q.x && z.y === q.y)); g.view.rebuildAt(q.x, q.y); }
        }
      }
    }
  },
  /** l'arbitre : lance une course (pour tout le groupe), ou dit où l'on en est */
  async arbitre(d) {
    const ui = this.game.ui, D = this.donneesCourse(d), qui = { speaker: 'Arbitre' };
    const enCours = D.depart && this.course?.graine === D.depart && this.course.parti && !this.course.fini;
    if (enCours) { await ui.say('La course est lancée ! Qu\'est-ce que tu fais encore là ?', qui); return; }
    await ui.say(['Bienvenue sur la Grande Course !', 'Tout le monde part en même temps : mêmes dresseurs, mêmes énigmes. Le premier à franchir la ligne d\'arrivée gagne.',
      'Une défaite te coûte dix secondes, le temps de soigner ton équipe.'], qui);
    if (!(await ui.yesNo('Lancer une nouvelle course pour tous les joueurs présents ?', qui))) return;
    await this.demande(d.id, { a: 'maj', salle: 'c0', donnees: { depart: (Math.random() * 2 ** 31) | 0 } });
  },
  /** à chaque image : une nouvelle course (compte à rebours, puis la grille du départ s'ouvre), les arrivées des autres */
  tickCourse(dt) {
    const g = this.game, d = this.defs.get('course'); if (!d || !g.state) return;
    this.cacherCoureurs(d);
    const D = this.donneesCourse(d);
    if (D.depart && this.course?.graine !== D.depart) {
      // une nouvelle course : tout est remis à zéro chez moi
      this.course = { graine: D.depart, faits: new Set(), parti: false, t0: 0, fini: false, vus: new Set(), decompte: this.estDans(d) ? 3.99 : 0 };
      this.grillesCourse(d); g.refreshNpcs?.();
      if (this.estDans(d)) g.ui.toast('Nouvelle course ! Tous à la ligne de départ...', 1800);
    }
    const C = this.course; if (!C) return;
    if (!C.parti && C.decompte > 0) {
      const avant = Math.ceil(C.decompte); C.decompte -= dt; const apres = Math.ceil(C.decompte);
      if (apres !== avant && apres > 0 && apres <= 3) { g.ui.toast(String(apres), 800); g.sound.sfx('select'); }
      if (C.decompte <= 0) { C.parti = true; C.t0 = performance.now(); g.ui.toast('Partez !', 1200); g.sound.sfx('bang'); this.grillesCourse(d); }
    } else if (!C.parti && this.estDans(d)) { C.parti = true; C.t0 = performance.now(); this.grillesCourse(d); }
    // les arrivées des autres
    const pre = `fin:${C.graine}:`, arrivees = Object.entries(D).filter(([k, v]) => k.startsWith(pre) && v).sort((a, b) => a[1].t - b[1].t);
    for (const [k, v] of arrivees) {
      if (C.vus.has(k)) continue;
      C.vus.add(k);
      if (k === pre + this.moi || !this.estDans(d)) continue;
      g.ui.toast(arrivees[0][0] === k ? `${v.nom} remporte la course en ${temps(v.t)} !` : `${v.nom} franchit la ligne (${temps(v.t)}).`, 2600);
    }
    // le chrono, dans le journal du donjon
    if (C.parti && !C.fini && this.estDans(d)) C.affiche = temps(performance.now() - C.t0);
  },
  /** les autres coureurs ne sont pas dessinés, et on ne leur parle pas, sur les cartes de la course */
  cacherCoureurs(d) {
    const g = this.game; if (this.coureursCaches || !g.drawPeers) return;
    this.coureursCaches = true;
    const ici = () => d.cartes?.includes(g.mapObj?.id) && g.mapObj?.id !== d.carte;
    const dp = g.drawPeers, dt = g.drawTags, pa = g.peerAt;
    g.drawPeers = () => { if (!ici()) return dp(); for (const id of [...g.view.actors.keys()]) if (id.startsWith('peer:')) g.view.removeActor(id); };
    if (dt) g.drawTags = (show) => dt(show && !ici());
    if (pa) g.peerAt = (x, y) => (ici() ? null : pa(x, y));
  },
  /** un dresseur de la course : il barre le passage tant qu'on ne l'a pas battu (chacun le sien) */
  async dresseurCourse(d, o) {
    const g = this.game, ui = g.ui, p = o.dresseur, titre = `${p.cls} ${p.nom}`;
    if (!this.course?.parti) { await ui.say('Attends le départ !', { speaker: titre }); return; }
    await ui.say(p.defi, { speaker: titre });
    const party = p.equipe.map(([sp, lvl]) => createMon(sp, lvl, { iv: Array(6).fill(25), shiny: false }));
    const res = await this.combat({ cls: p.cls, nom: p.nom, sprite: p.sprite, prix: 0, perd: 'Tu es trop rapide pour moi...' }, party);
    if (res === 'win') { await this.marquerCourse(d, 'd:' + o.cle); return; }
    await this.penaliteCourse();
  },
  async penaliteCourse() {
    const g = this.game, ui = g.ui;
    for (const m of g.state.party) healFull(m);
    g.busy = true;
    try {
      await ui.say('Ton équipe est soignée... Dix secondes de pénalité !');
      for (let s = PENALITE / 1000; s > 0; s--) { ui.toast(`Pénalité : ${s}`, 900); await attendre(1000); }
      ui.toast('Repars !', 1000);
    } finally { g.busy = false; }
  },
  /** une stèle : le casse-tête de la course, le même pour tous (tiré de la graine) */
  async steleCourse(d, o) {
    const g = this.game, ui = g.ui;
    if (this.courseFait(d, o.cle)) { await ui.say('La stèle est apaisée. La grille est ouverte.'); return; }
    if (!this.course?.parti) { await ui.say('Attends le départ !'); return; }
    const J = JEUX_SEPULTURE.find((q) => q.id === o.jeu), graine = this.course.graine + o.cle.length * 7919;
    const def = { ...J, jeu: { ...J.jeu, nouveau: (...a) => J.jeu.nouveau.call(J.jeu, alea(graine), ...a.slice(1)) } };
    g.busy = true;
    let ok = false;
    try { ok = await jouerCasseTete(g, def); } finally { g.busy = false; }
    if (ok) { g.sound.sfx('item'); await ui.say('La grille se lève !'); await this.marquerCourse(d, o.cle); }
  },
  /** après un pas : la ligne d'arrivée */
  async apresPasCourse() {
    const g = this.game, d = this.defs.get('course'), m = g.mapObj, C = this.course;
    if (!d || !m?.course?.arrivee.has(cle(g.player.x, g.player.y)) || !C?.parti || C.fini) return;
    C.fini = true;
    const t = performance.now() - C.t0;
    g.sound.sfx('badge');
    await this.demande(d.id, { a: 'maj', salle: 'c0', donnees: { [`fin:${C.graine}:${this.moi}`]: { t, nom: g.state.name || 'Toi' } } });
    const pre = `fin:${C.graine}:`, liste = Object.entries(this.donneesCourse(d)).filter(([k, v]) => k.startsWith(pre) && v).sort((a, b) => a[1].t - b[1].t);
    const rang = liste.findIndex(([k]) => k === pre + this.moi) + 1;
    await g.ui.say(rang === 1 ? [`Arrivée ! ${temps(t)}.`, 'Tu es le premier : tu remportes la course !'] : [`Arrivée ! ${temps(t)}.`, `Tu finis ${rang}e.`]);
  },
  /** le tableau des résultats de la course en cours */
  async tableauCourse(d) {
    const D = this.donneesCourse(d), pre = `fin:${D.depart}:`;
    const liste = Object.entries(D).filter(([k, v]) => k.startsWith(pre) && v).sort((a, b) => a[1].t - b[1].t);
    await this.game.ui.say(!D.depart ? 'Pas encore de course. Parle à l\'arbitre pour en lancer une.'
      : !liste.length ? 'Personne n\'a encore franchi la ligne.'
        : 'Résultats de la course :\n' + liste.map(([, v], i) => `${i + 1}. ${v.nom} — ${temps(v.t)}`).join('\n'));
  },
  /** le journal du donjon : le chrono */
  texteCourse(d, s) {
    if (!estCourse(d) || s.carte !== this.game.mapObj?.id) return null;
    const C = this.course;
    if (!C?.graine) return 'parle à l\'arbitre';
    if (!C.parti) return 'départ imminent';
    return C.fini ? 'arrivé !' : `chrono ${C.affiche || '0:00.0'}`;
  },
};
