// testodyssee/js/donjon/mecaniques.js — mécaniques de donjon réutilisables, ajoutées à la classe Donjons (jeu.js) :
// PNJ à question (une bonne réponse ouvre un combat, la victoire donne une clé ; une mauvaise coûte des PV),
// ascenseur à serrures, journal du donjon, et combat à plusieurs contre un boss (raid).
//
// Raid, messages en plus de ceux de jeu.js :
//   hôte → participants : { t: 'djRaid', id, etape: 'debut' | 'tour', evs, photo, boss }
//   participant → hôte  : { t: 'djRA', id, action }   choix du tour (attaque, changement, abandon)
import { createMon, healFull } from '../../../odyssee/js/core/mon.js';
import { itemName } from '../../../odyssee/js/core/items.js';
import { validParty } from '../../../odyssee/js/core/pvp.js';
import { clesDe, serrures } from './etat.js';
import { aCote } from './plan.js';
import { Raid } from '../combat/raid.js';
import { CombatMiroir, brancher } from '../combat/vue.js';

const melange = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const copie = (o) => JSON.parse(JSON.stringify(o));

export const Mecaniques = {
  /* ---------------- objets du plan ---------------- */
  poserObjets(d, m) {
    for (const [c, l] of Object.entries(m.donjon.plan.objets)) {
      const o = d.objets[c];
      if (o.type !== 'ascenseur') continue;
      for (const [x, y] of l) m.object(x, y, { use: () => this.ascenseur(d, c) });
    }
  },
  async ascenseur(d, c) {
    const g = this.game, ui = g.ui, o = d.objets[c], e = this.etats[d.id], m = g.world.maps[d.carte], P = m.donjon.plan;
    const aller = async (vers) => { const [x, y] = aCote(m, P, vers); g.sound.sfx('pc'); await g.warp({ map: d.carte, x, y, dir: 'down' }, 'exit'); };
    if (!o.salle) { if (await ui.yesNo('Redescendre ?')) await aller(o.vers); return; }
    const S = e.salles[o.salle], n = o.serrures || 3;
    if (S.faite) {
      const opts = e.fini ? ['Monter', 'Remettre le donjon à zéro', 'Rien'] : ['Monter', 'Rien'];
      const r = opts[await ui.ask('L\'ascenseur est déverrouillé.', opts)];
      if (r === 'Monter') await aller(o.vers);
      else if (r === 'Remettre le donjon à zéro' && await ui.yesNo('Tout remettre à zéro, pour tout le groupe ?')) await this.demande(d.id, { a: 'recommencer' });
      return;
    }
    await ui.say(`${d.textes.ascenseur}\nSerrures remplies : ${serrures(d, e)}/${n}.`);
    const miennes = clesDe(d, e, this.moi);
    if (!miennes.length) return;
    const noms = miennes.map((k) => d.pnj[k].cle).join(', ');
    if (!(await ui.yesNo(`Mettre ${miennes.length > 1 ? 'tes clés' : 'ta clé'} dans les serrures ? (${noms})`))) return;
    const r = await this.demande(d.id, { a: 'inserer', salle: o.salle });
    if (!r.ok) { await ui.say(r.why === 'reseau' ? 'L\'hôte du salon ne répond pas...' : 'Les serrures ne bougent pas.'); return; }
    g.sound.sfx('item');
    const e2 = this.etats[d.id];
    await ui.say(e2.salles[o.salle].faite ? 'Clac ! La dernière serrure tourne : l\'ascenseur est déverrouillé !' : `Clac ! Serrures remplies : ${serrures(d, e2)}/${n}.`);
  },

  /* ---------------- PNJ à question ---------------- */
  async questionneur(d, k) {
    const g = this.game, ui = g.ui, p = d.pnj[k], who = `${p.cls} ${p.nom}`, e = this.etats[d.id];
    const salle = d.salles.find((s) => s.pnj?.includes(k)), S = e.salles[salle.id];
    const c = S.cles[k];
    if (c) { await ui.say(c.a === this.moi ? (c.mise ? 'Ma clé est dans sa serrure. Va.' : 'Tu as ma clé. L\'ascenseur t\'attend, au centre de la salle.') : `J'ai confié ma clé à ${this.nomDe(c.a)}.`, { speaker: who }); return; }
    const pris = S.pris[k];
    if (pris && pris !== this.moi) { await ui.say(`${this.nomDe(pris)} est déjà en train de me répondre.`, { speaker: who }); return; }
    const r0 = await this.demande(d.id, { a: 'prendre', pnj: k });
    if (!r0.ok) { await ui.say(r0.why === 'occupe' ? `${this.nomDe(S.pris[k])} vient de me parler.` : r0.why === 'reseau' ? 'L\'hôte du salon ne répond pas...' : '...', { speaker: who }); return; }
    const Q = d.questions[p.quiz], ordre = melange(Q.r.map((t, i) => ({ t, juste: i === 0 })));
    await ui.say(d.textes.adepte, { speaker: who });
    const i = await ui.ask(Q.q, ordre.map((x) => x.t).concat(['Je reviendrai plus tard']), { speaker: who, cancel: ordre.length });
    if (i < 0 || i >= ordre.length) { await this.demande(d.id, { a: 'lacher', pnj: k }); return; }
    if (!ordre[i].juste) {
      await this.demande(d.id, { a: 'lacher', pnj: k });
      g.sound.sfx('hitstrong'); g.view.shake = 0.25; await ui.flash(1, '#c040ff', 90);
      await ui.say(d.textes.faux, { speaker: who });
      await this.penalite(d);
      return;
    }
    g.sound.sfx('learn');
    await ui.say(d.textes.juste, { speaker: who });
    if (Q.bonus) await ui.say(Q.bonus, { speaker: who });
    const party = p.equipe.map(([sp, lvl]) => createMon(sp, lvl, { iv: Array(6).fill(Math.min(31, 10 + lvl / 2 | 0)), shiny: false }));
    const res = await this.combat(p, party);
    if (res !== 'win') { await this.demande(d.id, { a: 'lacher', pnj: k }); await this.defaite(d); return; }
    const r = await this.demande(d.id, { a: 'cle', pnj: k });
    if (!r.ok) { await ui.say('Bien joué... mais ma clé est déjà partie.', { speaker: who }); return; }
    for (const m of g.state.party) healFull(m);
    g.sound.sfx('item');
    await ui.say([d.textes.cleDonnee, `${g.state.name} reçoit la ${p.cle} !\nElle est rangée dans le journal du donjon.`], { speaker: who });
  },
  /** mauvaise réponse : toute l'équipe tombe à la moitié de ses PV, puis à 1 PV, puis plus rien */
  async penalite(d) {
    const g = this.game, run = this.etats[d.id].run;
    const E = (this.erreurs[d.id] && this.erreurs[d.id].run === run) ? this.erreurs[d.id] : (this.erreurs[d.id] = { run, n: 0 });
    E.n++;
    if (E.n > 2) { await g.ui.say('Tes Pokémon ont déjà tout perdu... il ne leur reste qu\'un souffle.'); return; }
    for (const m of g.state.party) { if (m.hp <= 0) continue; m.hp = E.n === 1 ? Math.min(m.hp, Math.ceil(m.stats[0] / 2)) : 1; }
    g.hud?.update(true);
    await g.ui.say(E.n === 1 ? 'Une onde glacée traverse ton équipe : tes Pokémon perdent la moitié de leurs PV !' : 'Une seconde onde, plus forte : il ne reste qu\'1 PV à chacun de tes Pokémon !');
  },

  /* ---------------- journal ---------------- */
  async journal() {
    const g = this.game, d = [...this.defs.values()].find((q) => this.estDans(q));
    if (!d) { await g.ui.say('Le journal du donjon ne sert qu\'à l\'intérieur d\'un donjon.'); return; }
    const e = this.etats[d.id];
    const quetes = (d.journal || []).map((q) => {
      const S = e.salles[q.salle], s = d.salles.find((x) => x.id === q.salle);
      const avance = s.type === 'serrures' ? ` (${serrures(d, e)}/${s.pnj.length} serrures)` : s.type === 'lumiere' ? ` (${Math.min(5, S.donnees.feux || 0)}/5 dans le brasier)` : '';
      const propre = this.queteJournal?.(d, q);
      if (propre) return { label: q.nom, right: propre.faite ? '✔' : '…', q, txt: propre.txt };
      return { label: q.nom, right: S.faite ? '✔' : '…', q, txt: S.faite ? 'Terminée.' : q.but + avance };
    });
    const objets = [...clesDe(d, e, this.moi).map((k) => ({ label: d.pnj[k].cle, right: '×1', txt: 'Une clé de l\'ascenseur. Elle disparaît si tu quittes le donjon.' })), ...(this.objetsJournal?.(d) || [])];
    const items = [{ label: '— Quêtes —', disabled: true }, ...(quetes.length ? quetes : [{ label: 'Aucune', disabled: true }]), { label: '— Objets de quête —', disabled: true }, ...(objets.length ? objets : [{ label: 'Aucun', disabled: true }])];
    for (;;) {
      const r = await g.ui.list({ title: `Journal · ${d.nom}`, items, cls: 'shop', cancel: -1, start: 1 });
      if (r < 0) return;
      if (items[r].txt) await g.ui.say(items[r].txt);
    }
  },

  /* ---------------- boss à affronter à plusieurs ---------------- */
  async bossRaid(d, k) {
    const g = this.game, ui = g.ui, p = d.pnj[k], e = this.etats[d.id], salle = d.salles.find((s) => s.type === 'raid');
    if (e.fini) return;
    if (e.salles[salle.id].combat) { await ui.say('Le combat a déjà commencé sans toi...'); return; }
    await ui.say(d.textes.masque);
    const r = await this.demande(d.id, { a: 'pret', party: copie(g.state.party) });
    if (!r.ok) { await ui.say(r.why === 'reseau' ? 'L\'hôte du salon ne répond pas...' : '...'); return; }
    // attente des autres : Échap pour partir
    const debut = this.debutRaid ? Promise.resolve(this.debutRaid) : new Promise((res) => { this.attenteRaid = res; });
    this.debutRaid = null;
    let parti = false;
    const box = ui.dialogBox();
    const maj = () => { const S = this.etats[d.id].salles[salle.id]; ui.typePage(box, `Prêts : ${S.prets.length}/${Math.max(S.prets.length, this.presents(d))}. En attente des autres joueurs… (Échap : partir)`, { last: true }); };
    maj(); const iv = setInterval(maj, 1000);
    const pop = g.input.push((key) => { if (key === 'b') { parti = true; this.attenteRaid?.(null); } });
    const msg = await debut;
    pop(); clearInterval(iv); ui.closeDialog(); this.attenteRaid = null;
    if (parti || !msg) { await this.demande(d.id, { a: 'pasPret' }); return; }
    await this.combatRaid(d, p, msg);
  },
  async combatRaid(d, p, intro) {
    const g = this.game, ui = g.ui;
    g.sound.play('legend'); g.view.shake = 0.4; await ui.flash(2, '#ffffff', 70);
    await ui.say(d.textes.cri, { speaker: p.nom });
    this.miroirHote = this.H?.info.hostId;
    const miroir = this.miroir = new CombatMiroir({ moi: this.moi, party: g.state.party, intro, boss: intro.boss });
    const envoyer = (action) => { if (this.hote) this.actionRaid(this.moi, d.id, action); else this.H.send('host', { t: 'djRA', id: d.id, action }); };
    const curtain = await g.encounterIntro('legend'); curtain.remove();
    g.musicLock = true;
    const defaire = brancher(g.bv, miroir, this.moi);
    let res;
    try { res = await g.bv.runPvp(miroir, miroir.duel(envoyer), { bg: 'cave' }); }
    finally { defaire(); g.bv.close(); g.musicLock = false; }
    // éliminé avant la fin : on attend l'issue du combat des autres
    if (res === 'out') {
      const box = ui.dialogBox(); ui.typePage(box, 'Tes Pokémon sont K.O. : tes équipiers continuent sans toi…', { last: true });
      for (;;) { const m = await miroir.prochain(); if (m.timeout || m.parti || m.photo?.state === 'over') { if (m.photo) res = m.photo.result; break; } }
      ui.closeDialog();
    }
    this.miroir = null;
    g.sound.stopMusic(0.1); g.sound.current = null; g.updateZone();
    if (res === 'win') {
      g.sound.play('victory');
      await ui.say(d.textes.apres, { speaker: p.nom });
      for (const [k, n] of Object.entries(d.recompense?.objets || {})) { g.give(k, n); g.sound.sfx('item'); await ui.say(`${g.state.name} reçoit ${n > 1 ? n + ' × ' : ''}${itemName(k)} !\nIl est rangé dans le Sac.`); }
      for (const m of g.state.party) healFull(m);
      g.updateZone();
    } else await this.defaite(d);
  },

  /* ---------------- côté hôte ---------------- */
  /** toutes les demi-secondes : lancer le combat quand tous les joueurs présents sont prêts */
  verifierRaid(d) {
    const salle = d.salles.find((s) => s.type === 'raid'); if (!salle) return;
    const e = this.etats[d.id], S = e.salles[salle.id];
    if (S.faite || S.combat || !S.prets.length) return;
    const presents = this.presentsIds(d);
    const prets = S.prets.filter((q) => presents.includes(q));
    if (prets.length < S.prets.length) { for (const q of S.prets.filter((x) => !presents.includes(x))) this.traiter(d.id, q, { a: 'pasPret' }); return; }
    if (!presents.every((q) => S.prets.includes(q))) return;
    const p = Object.values(d.pnj).find((q) => q.raid), equipes = this.equipesRaid[d.id] || {};
    const joueurs = prets.filter((q) => validParty(equipes[q])).map((q) => ({ id: q, nom: this.nomDe(q), party: copie(equipes[q]) }));
    if (!joueurs.length) return;
    const boss = createMon(p.espece, p.niveau, { iv: Array(6).fill(31), shiny: false });
    boss.stats[0] *= joueurs.length; boss.hp = boss.stats[0];
    const raid = new Raid({ joueurs, boss: { mon: boss, cls: p.cls, nom: p.nom, bs: p.bs }, blocs: 3 });
    this.raids[d.id] = { raid, ids: joueurs.map((j) => j.id), boss: { cls: p.cls, nom: p.nom, bs: p.bs } };
    this.traiter(d.id, this.moi, { a: 'raid', etape: 'debut' });
    const evs = raid.start();
    this.diffuserRaid(d.id, { etape: 'debut', evs, photo: raid.photo(), boss: this.raids[d.id].boss });
  },
  diffuserRaid(id, m) {
    const R = this.raids[id]; if (!R) return;
    for (const q of R.ids) {
      if (q === this.moi) setTimeout(() => this.recevoirRaid({ t: 'djRaid', id, ...m }), 0);
      else this.H?.send(q, { t: 'djRaid', id, ...m });
    }
  },
  actionRaid(qui, id, action) {
    const R = this.raids[id]; if (!R || !action) return;
    const evs = R.raid.action(qui, action);
    if (evs) this.tourRaid(id, evs);
  },
  tourRaid(id, evs) {
    const R = this.raids[id], raid = R.raid;
    this.diffuserRaid(id, { etape: 'tour', evs, photo: raid.photo() });
    if (raid.state === 'over') {
      delete this.raids[id];
      this.traiter(id, this.moi, { a: 'raid', etape: 'fin', result: raid.result, vainqueurs: R.ids });
    }
  },
  retirerRaid(qui) {
    for (const [id, R] of Object.entries(this.raids)) {
      if (!R.ids.includes(qui)) continue;
      R.raid.retirer(qui, `${this.nomDe(qui)} a quitté le combat.`);
      R.ids = R.ids.filter((q) => q !== qui);
      const evs = R.raid.avancer();
      if (evs) this.tourRaid(id, evs);
    }
  },
  /** côté joueur : un message du combat */
  recevoirRaid(m) {
    if (m.etape === 'debut') { if (this.attenteRaid) this.attenteRaid(m); else this.debutRaid = m; return; }
    this.miroir?.recevoir(m);
  },
  presentsIds(d) {
    const g = this.game, out = [];
    if (g.state && g.mapObj?.id === d.carte) out.push(this.moi);
    for (const o of g.link?.others.values() || []) if (o.map === d.carte) out.push(String(o.id));
    return out;
  },
};

