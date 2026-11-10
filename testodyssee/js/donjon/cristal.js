// testodyssee/js/donjon/cristal.js — mécaniques du Bastion du Cristal, ajoutées à la classe Donjons (jeu.js) :
// défense du cristal en temps réel. L'hôte tient la défense de chaque salle (règles dans defense.js) et l'envoie à
// tous deux fois par seconde (« djDef ») ; chacun dessine les pillards qui marchent, et se bat contre celui qui
// l'engage, puis renvoie l'issue à l'hôte (« djDefA »). Quand la dernière vague est repoussée, la salle est terminée.
import { walkable } from '../../../odyssee/js/world/tiles.js';
import { createMon, healFull } from '../../../odyssee/js/core/mon.js';
import { el } from '../../../odyssee/js/ui/ui.js';
import { preparerDefense, nouvelleDefense, demarrerDefense, pasDefense, issueDefense, libererDefense } from './defense.js';

const estCristal = (d) => !!d?.ennemis;
const PAS = 0.5;   // secondes entre deux pas de la défense

export const Cristal = {
  poserObjetsCristal(d, m) {
    if (!estCristal(d)) return;
    const P = m.donjon.plan, s = d.salles.find((q) => q.carte === m.id), cristal = [], entrees = [], soins = [];
    for (const [c, l] of Object.entries(P.objets)) {
      const o = d.objets[c];
      for (const [x, y] of l) {
        if (o.type === 'cristal') { cristal.push([x, y]); m.object(x, y, { use: () => this.toucherCristal(d, s) }); }
        else if (o.type === 'entree') entrees.push([x, y]);
        else if (o.type === 'soin') { soins.push([x, y]); m.npc({ id: `${d.id}:soin:${s.id}`, x, y, dir: 'down', sprite: o.sprite || 'nurse', move: 'static', talk: () => this.soigner(d, s) }); }
      }
    }
    if (s?.type !== 'defense') return;
    const bloque = new Set(soins.map(([x, y]) => x + ',' + y));
    m.defense = preparerDefense(m.w, m.h, (x, y) => walkable(m.get(x, y)) && !bloque.has(x + ',' + y), cristal, entrees);
  },

  /** la défense d'une salle (remise à neuf à chaque nouvelle descente) */
  defenseDe(d, s) {
    const k = d.id + ':' + s.id, run = this.etats[d.id].run, D = (this.defense ||= {})[k];
    if (!D || D.run !== run) this.defense[k] = nouvelleDefense(s, run);
    return this.defense[k];
  },
  /** joueurs présents sur une carte : { id, x, y } (ceux qui sont occupés ne sont pas engagés) */
  joueursSur(carte) {
    const g = this.game, out = [];
    if (g.state && g.mapObj?.id === carte) out.push({ id: this.moi, x: g.player.x, y: g.player.y, occupe: g.busy || g.bv.alive });
    for (const [id, o] of g.link?.others || []) if (o.map === carte) out.push({ id: String(id), x: o.x, y: o.y, occupe: !!o.busy });
    return out;
  },
  /** demande à l'hôte (lancer la défense, issue d'un combat) */
  envoyerDef(d, s, m) {
    if (this.hote) this.actionDef(this.moi, { id: d.id, s: s.id, ...m });
    else this.H.send('host', { t: 'djDefA', id: d.id, s: s.id, ...m });
  },
  /** chez l'hôte : une demande d'un joueur */
  actionDef(qui, m) {
    const d = this.defs.get(m.id), s = d?.salles.find((q) => q.id === m.s);
    if (!s || s.type !== 'defense') return;
    const D = this.defenseDe(d, s);
    if (m.op === 'debut' && ['attente', 'perdu'].includes(D.etat) && !this.etats[d.id].salles[s.id].faite) demarrerDefense(D, s, this.joueursSur(s.carte).length);
    else if (m.op === 'issue') issueDefense(D, s, m.ennemi, !!m.gagne);
    else return;
    this.diffuserDef(d, s, D.etat === 'gagne' ? [['gagne']] : []);
  },
  diffuserDef(d, s, ev) {
    const D = this.defenseDe(d, s);
    if (this.H) this.H.send('all', { t: 'djDef', id: d.id, s: s.id, D });
    if (ev.some(([t]) => t === 'gagne') && !this.etats[d.id].salles[s.id].faite) this.traiter(d.id, this.moi, { a: 'maj', salle: s.id, faite: true });
    this.recevoirDef({ id: d.id, s: s.id, D });
  },
  /** chez tout le monde : la défense envoyée par l'hôte */
  recevoirDef(m) {
    const d = this.defs.get(m.id), s = d?.salles.find((q) => q.id === m.s); if (!s || !m.D) return;
    const k = d.id + ':' + s.id, avant = (this.defVue ||= {})[k], D = m.D;
    if (!this.hote) (this.defense ||= {})[k] = D;
    this.defVue[k] = { vague: D.vague, etat: D.etat, cristal: D.cristal, t: performance.now() };
    const g = this.game, ici = g.state && g.mapObj?.id === s.carte;
    if (!ici) return;
    if (avant && D.vague > avant.vague) g.ui.toast(`Vague ${D.vague} sur ${s.vagues.length} : les pillards attaquent !`, 2600);
    if (avant && D.cristal < avant.cristal && D.etat !== 'perdu') { g.view.shake = 0.15; g.sound.sfx('bang'); }
    if (avant && D.etat === 'perdu' && avant.etat !== 'perdu') { g.view.shake = 0.4; this.taches.push(() => g.ui.say(d.textes.cristalTombe)); }
    if (avant && D.etat === 'pause' && avant.etat === 'vague') g.ui.toast(`Vague repoussée ! Un moment de répit.`, 2400);
    // un pillard m'engage : le combat se joue chez moi
    const e = D.ennemis.find((q) => q.engage === this.moi);
    if (e && this.defCombat !== k + ':' + e.id) { this.defCombat = k + ':' + e.id; this.taches.unshift(() => this.combatDef(d, s, e)); }
  },

  /* ---------------- ce que fait le joueur ---------------- */
  async toucherCristal(d, s) {
    const g = this.game, ui = g.ui;
    if (s.type !== 'defense') return;
    const D = this.defenseDe(d, s);
    if (this.etats[d.id].salles[s.id].faite) { await ui.say(d.textes.cristalSauve); return; }
    if (D.etat === 'vague' || D.etat === 'pause') { await ui.say(`Le cristal tient bon : ${D.cristal}/${D.max}.`); return; }
    const n = this.joueursSur(s.carte).length;
    if (!(await ui.yesNo(`${D.etat === 'perdu' ? 'Le cristal s\'est reformé. ' : ''}${n > 1 ? `Vous êtes ${n} dans la salle.` : 'Tu es seul dans la salle.'} Les pillards arrivent par vagues, plus nombreux s'il y a plus de défenseurs.\nLancer la défense ?`))) return;
    this.envoyerDef(d, s, { op: 'debut' });
  },
  async soigner(d, s) {
    const g = this.game, ui = g.ui;
    if (s.type === 'defense' && this.defenseDe(d, s).etat === 'vague') { await ui.say('Pas maintenant, les pillards attaquent ! Reviens entre deux vagues.', { speaker: 'Infirmière' }); return; }
    g.sound.sfx('heal'); for (const m of g.state.party) healFull(m);
    await ui.say('Voilà, ton équipe est en pleine forme. Courage !', { speaker: 'Infirmière' });
  },
  async combatDef(d, s, e) {
    const g = this.game, ui = g.ui, T = d.ennemis[e.t], eq = T.equipes[e.v % T.equipes.length];
    const p = { cls: T.cls, nom: T.nom, sprite: T.sprite, perd: T.perd };
    await ui.say(T.cri, { speaker: `${T.cls} ${T.nom}` });
    const party = eq.map(([sp, lvl]) => createMon(sp, lvl, { iv: Array(6).fill(Math.min(31, 10 + lvl / 2 | 0)), shiny: false }));
    const res = await this.combat(p, party);
    this.envoyerDef(d, s, { op: 'issue', ennemi: e.id, gagne: res === 'win' });
    if (res === 'win') return;
    // repoussé : on revient à l'entrée de la cour, équipe soignée
    const m = g.world.maps[s.carte], [x, y] = m.donjon.plan.depart;
    for (const mon of g.state.party) healFull(mon);
    await ui.say(d.textes.repousse);
    await g.warp({ map: m.id, x, y, dir: 'up' }, 'exit');
  },

  /* ---------------- à chaque image ---------------- */
  tickCristal(dt) {
    const g = this.game;
    // l'hôte fait avancer chaque défense en cours
    if (this.hote) {
      this.defT = (this.defT || 0) - dt;
      if (this.defT <= 0) {
        this.defT = PAS;
        for (const d of this.defs.values()) {
          if (!estCristal(d)) continue;
          for (const s of d.salles) {
            if (s.type !== 'defense') continue;
            const D = this.defenseDe(d, s); if (D.etat !== 'pause' && D.etat !== 'vague') continue;
            const C = g.world.maps[s.carte].defense, j = this.joueursSur(s.carte);
            libererDefense(D, new Set(j.map((q) => q.id)));
            const ev = pasDefense(D, C, s, d.ennemis, j.filter((q) => !q.occupe || D.ennemis.some((e) => e.engage === q.id)), Math.random);
            this.diffuserDef(d, s, ev);
          }
        }
      }
    }
    this.dessinerPillards();
  },
  dessinerPillards() {
    const g = this.game, v = g.view, m = g.state && g.mapObj, d = m && [...this.defs.values()].find((q) => estCristal(q) && this.estDans(q));
    const s = d && d.salles.find((q) => q.carte === m.id && q.type === 'defense');
    const D = s && this.defenseDe(d, s), vus = new Set();
    if (D && !g.bv.alive && (D.etat === 'vague' || D.etat === 'pause')) {
      const u = Math.min(1, (performance.now() - (this.defVue?.[d.id + ':' + s.id]?.t || 0)) / (PAS * 1000));
      for (const e of D.ennemis) {
        const id = 'def:' + e.id, T = d.ennemis[e.t]; vus.add(id);
        const a = v.actor(id, {}), bouge = e.ax !== e.x || e.ay !== e.y;
        v.setFrame(a, T.sprite, e.dir, bouge && u < 1 ? (u < 0.5 ? (e.id % 2 ? 1 : 2) : 0) : 0);
        v.place(a, e.ax + (e.x - e.ax) * u, e.ay + (e.y - e.ay) * u);
      }
    }
    for (const id of [...(this.pillardsVus || [])]) if (!vus.has(id) && v.actors.has(id)) v.removeActor(id);
    this.pillardsVus = vus;
    this.majCompteur(d, s, D);
  },
  /** en haut de l'écran : le cristal et la vague */
  majCompteur(d, s, D) {
    const g = this.game, montrer = !!D && !g.bv.alive && (D.etat === 'vague' || D.etat === 'pause');
    if (montrer && !this.compteurDef) { this.compteurDef = el('div', 'train-horloge'); g.ui.root.appendChild(this.compteurDef); }
    if (!this.compteurDef) return;
    this.compteurDef.style.display = montrer ? '' : 'none';
    if (!montrer) return;
    const n = s.vagues.length, reste = D.file.length + D.ennemis.length;
    const html = `<span class="${D.cristal <= D.max / 4 ? 'urgent' : ''}">Cristal <b>${D.cristal}/${D.max}</b></span>`
      + (D.etat === 'pause' ? `<span>Vague ${D.vague + 1}/${n} dans <b>${Math.ceil(D.pause * PAS)} s</b></span>` : `<span>Vague <b>${D.vague}/${n}</b> · ${reste} pillard${reste > 1 ? 's' : ''}</span>`);
    if (html !== this.compteurHtml) { this.compteurHtml = html; this.compteurDef.innerHTML = html; }
  },
  texteCristal(d, s) {
    if (!estCristal(d) || s.type !== 'defense') return null;
    const D = this.defenseDe(d, s);
    if (D.etat === 'vague') return `vague ${D.vague}/${s.vagues.length}`;
    if (D.etat === 'pause') return D.vague ? `répit (${D.vague}/${s.vagues.length})` : 'les pillards arrivent';
    if (D.etat === 'perdu') return 'cristal tombé';
    return 'parle au cristal';
  },
};
