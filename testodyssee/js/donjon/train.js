// testodyssee/js/donjon/train.js — mécaniques du Train Fantôme, ajoutées à la classe Donjons (jeu.js) :
// horloge commune tenue par l'hôte (départ, gares, terminus), voitures de queue qui se décrochent, voie ferrée de
// rattrapage, voiture-restaurant, retour à quai à la fin. L'état est dans les données de la voiture de queue
// (depart : heure du départ chez l'hôte, decroches : gares passées, perdu : terminus atteint sans victoire).
import { T } from '../../../odyssee/js/world/tiles.js';
import { healFull } from '../../../odyssee/js/core/mon.js';
import { el, esc, wait } from '../../../odyssee/js/ui/ui.js';

const cle = (x, y) => x + ',' + y;
const estTrain = (d) => !!d?.train;
const mmss = (s) => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

export const Train = {
  trainIci() { return [...this.defs.values()].find((d) => estTrain(d) && this.estDans(d)); },
  queue(d) { return d.salles[0]; },
  dTrain(d) { return this.etats[d.id].salles[this.queue(d).id].donnees || {}; },
  /** secondes depuis le départ (null avant) */
  ecoule(d) { const D = this.dTrain(d); return D.depart ? (Date.now() - D.depart) / 1000 : null; },
  /** voitures décrochées */
  decrochees(d) { const n = this.dTrain(d).decroches || 0; return new Set(d.horloge.decroche.slice(0, n).flat()); },
  /** la dernière voiture encore accrochée (la plus en arrière) */
  queueActuelle(d) { const dec = this.decrochees(d); return d.salles.find((s) => /^v\d/.test(s.id) && !dec.has(s.id)); },

  poserObjetsTrain(d, m) {
    if (!estTrain(d)) return;
    for (const [c, l] of Object.entries(m.donjon.plan.objets)) {
      const o = d.objets[c];
      for (const [x, y] of l) {
        if (o.type === 'restaurant') m.object(x, y, { use: () => this.restaurant(d) });
        else if (o.type === 'marchepied') m.object(x, y, { use: () => this.marchepied(d) });
      }
    }
    const P = m.donjon.plan;
    if (P.sortie && m.warpAt(...P.sortie)) m.retourTrain = m.warpAt(...P.sortie);
  },
  /** une voiture dont celle d'avant est décrochée n'a plus de porte arrière */
  appliquerTrain(d) {
    if (!estTrain(d)) return;
    const g = this.game, dec = this.decrochees(d);
    d.salles.forEach((s, i) => {
      const m = g.world.maps[s.carte], P = m?.donjon.plan; if (!m?.retourTrain) return;
      const coupee = i > 0 && dec.has(d.salles[i - 1].id), [x, y] = P.sortie, k = cle(x, y);
      if (coupee && m.get(x, y) === T.CAVEDOOR) { m.set(x, y, T.CAVEWALL); m.warps.delete(k); m.deco = m.deco.filter((q) => !(q.x === x && q.y === y)); }
      else if (!coupee && m.get(x, y) !== T.CAVEDOOR) { m.set(x, y, T.CAVEDOOR); m.warp(x, y, m.retourTrain); m.deco.push({ k: 'exitlight', x, y }); }
      else return;
      if (g.mapObj === m) { g.view.decoAt.delete(k); const dd = m.deco.find((q) => q.x === x && q.y === y); if (dd) g.view.decoAt.set(k, dd); g.view.rebuildAt(x, y); }
    });
  },

  /** en entrant seul dans un train déjà parti ou fini : une nouvelle course commence */
  async entreeTrain(d) {
    if (!estTrain(d)) return;
    const e = this.etats[d.id], D = this.dTrain(d);
    if (this.presents(d) <= 1 && (e.salles[this.queue(d).id].faite || D.perdu || e.fini)) {
      await this.demande(d.id, { a: 'recommencer' });
      for (const s of d.salles) { const m = this.game.world.maps[s.carte]; if (m?.caissesOrigine) this.remettreCaisses(m); }
    }
  },

  /* ---------------- voiture-restaurant et voie ferrée ---------------- */
  async restaurant(d) {
    const g = this.game, ui = g.ui;
    if (!(await ui.yesNo(d.textes.restaurant))) return;
    const box = ui.dialogBox();
    for (let s = 30; s > 0; s--) { ui.typePage(box, `Le serveur prend ta commande... (${s} s)`, { last: true }); await wait(1000); }
    ui.closeDialog();
    g.sound.sfx('heal'); for (const m of g.state.party) healFull(m);
    await ui.say('Ton équipe a retrouvé toutes ses forces. Vite, le train avance !');
  },
  async marchepied(d) {
    const g = this.game, s = this.queueActuelle(d);
    if (!s) return;
    const m = g.world.maps[s.carte], [x, y] = m.donjon.plan.depart;
    g.sound.sfx('door');
    await g.ui.say(d.textes.rattrape);
    await g.warp({ map: m.id, x, y: y - 1, dir: 'up' }, 'exit');
  },
  async jeteSurLaVoie(d) {
    const g = this.game, v = d.salles.find((s) => s.voieFerree), m = g.world.maps[v.carte], [x, y] = m.donjon.plan.depart;
    g.sound.sfx('bang'); g.view.shake = 0.5;
    await g.ui.say(d.textes.decroche);
    await g.warp({ map: m.id, x, y: y - 1, dir: 'up' }, 'exit');
  },
  async horsDuTrain(d, textes) {
    const g = this.game, dehors = g.world.maps[d.carte].outside;
    await g.ui.say(textes);
    for (const m of g.state.party) healFull(m);
    await g.warp({ map: dehors.map, x: dehors.x, y: dehors.y, dir: 'down' }, 'exit');
  },

  /* ---------------- à chaque image ---------------- */
  tickTrain() {
    const g = this.game;
    for (const d of this.defs.values()) {
      if (!estTrain(d)) continue;
      const e = this.etats[d.id], D = this.dTrain(d), q = this.queue(d), H = d.horloge;
      // l'hôte tient l'horloge : départ, gares, terminus
      if (this.hote) {
        if (e.salles[q.id].faite && !D.depart && !this.departDemande) { this.departDemande = true; this.demande(d.id, { a: 'maj', salle: q.id, donnees: { depart: Date.now(), decroches: 0 } }).finally(() => { this.departDemande = false; }); }
        const t = this.ecoule(d);
        if (t != null && !e.fini && !D.perdu) {
          const n = Math.min(H.decroche.length, Math.floor(t / H.gare));
          if (n > (D.decroches || 0) && !this.gareDemande) { this.gareDemande = true; this.demande(d.id, { a: 'maj', salle: q.id, donnees: { decroches: n } }).finally(() => { this.gareDemande = false; }); }
          if (t >= H.terminus && !this.gareDemande) { this.gareDemande = true; this.demande(d.id, { a: 'maj', salle: q.id, donnees: { perdu: true } }).finally(() => { this.gareDemande = false; }); }
        }
      }
      // chez chacun : ce qui arrive à sa voiture
      const vu = (this.trainVu ||= {});
      if (vu.run !== e.run) { vu.run = e.run; vu.depart = !!D.depart; vu.decroches = D.decroches || 0; vu.perdu = !!D.perdu; vu.fini = e.fini; }
      const ici = g.state && this.estDans(d), carte = g.mapObj?.id;
      if (D.depart && !vu.depart) { vu.depart = true; if (ici) { g.sound.sfx('bang'); g.view.shake = 0.4; g.ui.toast(d.textes.depart, 3000); } }
      if ((D.decroches || 0) > vu.decroches) {
        vu.decroches = D.decroches;
        if (ici) {
          g.sound.sfx('bang'); g.view.shake = 0.3; g.ui.toast(d.textes.gare.replace('{gare}', d.gares[D.decroches - 1] || 'Gare'), 3200);
          const s = d.salles.find((x) => x.carte === carte);
          if (s && this.decrochees(d).has(s.id)) this.taches.push(() => this.jeteSurLaVoie(d));
        }
      }
      if (D.perdu && !vu.perdu) { vu.perdu = true; if (ici && !e.fini) this.taches.push(() => this.horsDuTrain(d, d.textes.terminus)); }
      if (e.fini && !vu.fini) { vu.fini = true; if (ici) this.taches.push(() => this.horsDuTrain(d, d.textes.victoire)); }
      // l'horloge à l'écran
      const montrer = ici && D.depart && !e.fini && !D.perdu;
      if (montrer && !this.horloge) { this.horloge = el('div', 'train-horloge'); g.ui.root.appendChild(this.horloge); }
      if (this.horloge) {
        this.horloge.style.display = montrer && !g.bv.alive ? '' : 'none';
        if (montrer) {
          const t = this.ecoule(d), n = D.decroches || 0, prochaine = n < H.decroche.length ? (n + 1) * H.gare - t : null, reste = H.terminus - t;
          const html = `${prochaine != null ? `<span>${esc(d.gares[n])} dans <b>${mmss(prochaine)}</b></span>` : ''}<span class="${reste < 120 ? 'urgent' : ''}">Terminus dans <b>${mmss(reste)}</b></span>`;
          if (html !== this.horlogeHtml) { this.horlogeHtml = html; this.horloge.innerHTML = html; }
        }
      }
    }
  },
  texteTrain(d, s) {
    if (!estTrain(d)) return null;
    if (this.decrochees(d).has(s.id)) return 'décrochée';
    if (s.voieFerree) return 'rattrape le train';
    return null;
  },
};
