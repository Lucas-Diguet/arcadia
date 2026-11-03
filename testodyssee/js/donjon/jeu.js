// testodyssee/js/donjon/jeu.js — les donjons dans la partie : PNJ, portes, combats, dalles, panneau d'avancement,
// et l'état partagé entre les joueurs du salon (l'hôte du salon fait autorité, voir etat.js).
//
// Messages (tous préfixés « dj », ignorés par la liaison d'Odyssée) :
//   invité → hôte : { t: 'dj', id, m, rid }    demande (prendre, lacher, gagne, degats, ouvrir, recommencer)
//   hôte → invité : { t: 'djR', rid, ok, why }  réponse à une demande
//   hôte → tous   : { t: 'djE', id, e }         état complet d'un donjon après chaque changement
//   invité → hôte : { t: 'dj?' }                demande des états (à l'arrivée, et tant qu'on n'a rien reçu)
import { createMon, healFull } from '../../../odyssee/js/core/mon.js';
import { itemName } from '../../../odyssee/js/core/items.js';
import { el, esc } from '../../../odyssee/js/ui/ui.js';
import { nouvelEtat, appliquer, battu, prisPar, requisDalles } from './etat.js';
import { construireCarte, relierExterieur, fermer, ouvrir } from './plan.js';
import { Mecaniques } from './mecaniques.js';
import { validParty } from '../../../odyssee/js/core/pvp.js';
import { T } from '../../../odyssee/js/world/tiles.js';

const newRid = () => Math.random().toString(36).slice(2, 10);

export class Donjons {
  constructor(game, defs, H) {
    this.game = game; this.H = H && H.embedded ? H : null;
    this.defs = new Map(defs.map((d) => [d.id, d]));
    this.etats = {}; this.vus = {};
    this.attentes = new Map();
    this.recu = new Set();
    this.taches = [];
    this.erreurs = {}; this.raids = {}; this.equipesRaid = {};
    this.wasHost = this.hote;
    for (const d of defs) {
      const m = construireCarte(d);
      game.world.maps[d.carte] = m;
      const dehors = relierExterieur(d, m);
      if (dehors) game.world.maps[dehors.id] = dehors;
      this.poserPnj(d, m);
      this.poserObjets(d, m);
      this.etats[d.id] = nouvelEtat(d);
      this.vus[d.id] = { run: 0, faites: new Set(), fini: false };
    }
    this.panel = el('div', 'dj-panel box'); this.panel.style.display = 'none';
    game.ui.root.appendChild(this.panel);
    // les messages du donjon ne passent pas par la liaison d'Odyssée (elle les mettrait de côté)
    const link = game.link;
    if (link) { const orig = link.receive.bind(link); link.receive = (from, m) => { if (typeof m?.t === 'string' && m.t.startsWith('dj')) return; orig(from, m); }; }
    if (this.H) {
      this.H.on('msg', (from, m) => this.recevoir(from, m));
      this.H.on('roster', () => this.roster());
    }
    for (const id of this.defs.keys()) this.appliquerEtat(id);
  }

  get hote() { return !this.H || this.H.info.role !== 'guest'; }
  get moi() { return String(this.H ? this.H.info.myId : 0); }
  nomDe(id) { if (String(id) === this.moi) return this.game.state?.name || 'Toi'; return this.game.link?.others.get(String(id))?.name || this.H?.players.find((p) => String(p.id) === String(id))?.name || 'un autre joueur'; }

  /* ---------------- carte ---------------- */
  poserPnj(d, m) {
    for (const [k, [[x, y]]] of Object.entries(m.donjon.plan.pnj)) {
      const p = d.pnj[k];
      m.npc({
        id: `${d.id}:${p.id}`, x, y, dir: p.dir || 'down', sprite: p.sprite, move: 'static',
        when: () => (p.gardien || p.quiz ? true : p.boss || p.raid ? !this.etats[d.id].fini : !battu(this.etats[d.id], d, k)),
        talk: async () => (p.gardien ? this.gardien(d) : p.quiz ? this.questionneur(d, k) : p.raid ? this.bossRaid(d, k) : p.boss ? this.boss(d, k) : this.adversaire(d, k)),
      });
    }
  }

  /** portes et PNJ suivent l'état ; joue les petites scènes quand une salle se termine */
  appliquerEtat(id) {
    const d = this.defs.get(id), e = this.etats[id], g = this.game, m = g.world.maps[d.carte], P = m.donjon.plan;
    const ici = g.state && g.mapObj === m;
    for (const s of d.salles) {
      if (!s.porte) continue;
      for (const [x, y] of P.portes[s.porte] || []) {
        const k = x + ',' + y;
        if (e.salles[s.id].faite) { if (ouvrir(m, x, y) && ici) { g.view.decoAt.delete(k); g.view.rebuildAt(x, y); } }
        else if (m.get(x, y) !== T.BLOCK) { fermer(m, x, y); if (ici) { g.view.decoAt.set(k, m.deco.find((q) => q.x === x && q.y === y)); g.view.rebuildAt(x, y); } }
      }
    }
    if (ici) g.refreshNpcs();
    const vu = this.vus[id];
    // premier état connu : ce qui est déjà fait ne rejoue pas de scène ; nouvelle descente : tout se rejoue
    if (vu.run !== e.run) {
      const first = vu.run === 0;
      vu.run = e.run; vu.faites = first ? new Set(Object.entries(e.salles).filter(([, S]) => S.faite).map(([k]) => k)) : new Set(); vu.fini = first && e.fini;
    }
    for (const s of d.salles) {
      if (!e.salles[s.id].faite || vu.faites.has(s.id)) continue;
      vu.faites.add(s.id);
      if (ici && s.type !== 'boss') this.taches.push(() => this.porteOuverte(d, s));
    }
    if (e.fini && !vu.fini) { vu.fini = true; if (ici && !d.salles.some((s) => s.type === 'raid')) this.taches.push(() => this.victoire(d)); }
    this.majPanneau();
  }
  async porteOuverte(d, s) {
    const g = this.game;
    g.sound.sfx('bang'); g.view.shake = 0.2;
    g.ui.toast(s.type === 'accueil' ? 'La porte de la crypte s\'ouvre !' : `${s.nom} : terminée ! Une porte s'ouvre.`, 2200);
  }
  async victoire(d) {
    const g = this.game, st = g.state, e = this.etats[d.id], R = d.recompense || {};
    g.sound.play('victory');
    await g.ui.say(d.textes.victoire);
    const noms = e.vainqueurs.map((q) => this.nomDe(q));
    const boss = Object.values(d.pnj).find((p) => p.boss);
    if (noms.length > 1 && boss) await g.ui.say(`${boss.nom} a été vaincu par ${noms.slice(0, -1).join(', ')} et ${noms[noms.length - 1]} !`);
    if (R.argent) { st.money += R.argent; await g.ui.say(`${st.name} reçoit ${R.argent.toLocaleString('fr-FR')} ₽ !`); }
    for (const [k, n] of Object.entries(R.objets || {})) if (n > 0) { g.give(k, n); g.sound.sfx('item'); await g.ui.say(`${st.name} reçoit ${n > 1 ? n + ' × ' : ''}${itemName(k)} !`); }
    for (const mon of st.party) healFull(mon);
    await g.ui.say('Le fossoyeur t\'attend à l\'entrée. Il peut rouvrir la crypte pour une nouvelle descente.');
    const [x, y] = g.world.maps[d.carte].donjon.plan.depart;
    await g.warp({ map: d.carte, x, y, dir: 'up' }, 'exit');
    g.updateZone();
  }

  /* ---------------- demandes ---------------- */
  presents(d) {
    const g = this.game; let n = g.state && g.mapObj?.id === d.carte ? 1 : 0;
    for (const o of g.link?.others.values() || []) if (o.map === d.carte) n++;
    return n;
  }
  options(d, m) {
    if (m.a !== 'ouvrir') return {};
    const b = Object.values(d.pnj).find((p) => p.boss);
    return { joueurs: this.presents(d), bossPv: b ? createMon(b.equipe[0][0], b.equipe[0][1]).stats[0] : 0 };
  }
  /** demande à l'hôte (ou s'applique tout de suite chez l'hôte) ; renvoie { ok, why } */
  demande(id, m) {
    if (this.hote) return Promise.resolve(this.traiter(id, this.moi, m));
    const rid = newRid();
    this.H.send('host', { t: 'dj', id, m, rid });
    return new Promise((res) => {
      const t = setTimeout(() => { this.attentes.delete(rid); res({ ok: false, why: 'reseau' }); }, 5000);
      this.attentes.set(rid, (r) => { clearTimeout(t); res(r); });
    });
  }
  traiter(id, qui, m) {
    const d = this.defs.get(id); if (!d || !m || typeof m.a !== 'string') return { ok: false, why: 'inconnu' };
    if (m.a === 'pret' && validParty(m.party)) (this.equipesRaid[id] ||= {})[String(qui)] = m.party;
    const r = appliquer(d, this.etats[id], qui, m, this.options(d, m));
    if (r.change) this.diffuser(id);
    return { ok: r.ok, why: r.why };
  }
  diffuser(id) {
    if (this.H) this.H.send('all', { t: 'djE', id, e: this.etats[id] });
    this.appliquerEtat(id);
  }
  recevoir(from, m) {
    if (!m || typeof m.t !== 'string' || !m.t.startsWith('dj') || String(from) === this.moi) return;
    if (m.t === 'dj' && this.hote) { const r = this.traiter(m.id, String(from), m.m); this.H.send(from, { t: 'djR', rid: m.rid, ...r }); return; }
    if (m.t === 'dj?' && this.hote) { for (const id of this.defs.keys()) this.H.send(from, { t: 'djE', id, e: this.etats[id] }); return; }
    if (m.t === 'djRA' && this.hote) { this.actionRaid(String(from), m.id, m.action); return; }
    if (m.t === 'djRaid' && String(from) === String(this.H.info.hostId)) { this.recevoirRaid(m); return; }
    if (m.t === 'djR') { const f = this.attentes.get(m.rid); if (f) { this.attentes.delete(m.rid); f({ ok: !!m.ok, why: m.why }); } return; }
    if (m.t === 'djE' && !this.hote && String(from) === String(this.H.info.hostId) && this.defs.has(m.id) && m.e) {
      const cur = this.etats[m.id];
      if (m.e.run !== cur.run || m.e.v >= cur.v) { this.etats[m.id] = m.e; this.recu.add(m.id); this.appliquerEtat(m.id); }
    }
  }
  /** un joueur part : ses adversaires se libèrent ; un nouvel hôte reprend l'état qu'il connaît */
  roster() {
    if (!this.H) return;
    const ids = new Set(this.H.players.map((p) => String(p.id)));
    if (this.hote) {
      for (const id of this.defs.keys()) {
        const e = this.etats[id], partis = new Set();
        for (const S of Object.values(e.salles)) for (const q of Object.values(S.pris)) if (!ids.has(q)) partis.add(q);
        for (const q of partis) this.traiter(id, q, { a: 'parti' });
        for (const S of Object.values(e.salles)) for (const q of [...Object.values(S.cles).map((c) => c.a), ...S.prets]) if (!ids.has(q)) this.traiter(id, q, { a: 'parti' });
        if (!this.wasHost) this.diffuser(id);
      }
    }
    if (this.hote) for (const R of Object.values(this.raids)) for (const q of R.ids) if (!ids.has(q)) this.retirerRaid(q);
    // l'hôte est parti pendant un combat : il s'arrête pour ceux qui le jouaient
    if (this.miroir && !this.hote && !ids.has(String(this.miroirHote))) this.miroir.recevoir({ parti: true });
    this.wasHost = this.hote;
  }
  dansUnDonjon() { const g = this.game; return !!g.state && [...this.defs.values()].some((q) => g.mapObj?.id === q.carte); }
  /** on quitte un donjon (autre lieu, changement de lieu) : les objets de quête disparaissent */
  sortir(d) {
    for (const q of d ? [d] : this.defs.values()) this.demande(q.id, { a: 'sortie' });
  }

  /* ---------------- à chaque image ---------------- */
  tick(dt) {
    const g = this.game;
    // demande les états à l'hôte tant qu'on n'a rien reçu
    if (!this.hote && this.recu.size < this.defs.size) {
      this.askT = (this.askT || 0) - dt;
      if (this.askT <= 0) { this.askT = 2.5; this.H.send('host', { t: 'dj?' }); }
    }
    if (this.hote) {
      this.dallesT = (this.dallesT || 0) - dt;
      if (this.dallesT <= 0) { this.dallesT = 0.25; for (const d of this.defs.values()) { this.verifierDalles(d); this.verifierRaid(d); } }
    }
    this.panT = (this.panT || 0) - dt;
    if (g.state && g.mapObj !== this.carteVue) {
      const avant = this.carteVue && [...this.defs.values()].find((q) => q.carte === this.carteVue.id);
      if (avant && g.mapObj.id !== avant.carte) this.sortir(avant);
    }
    if (g.state && (g.mapObj !== this.carteVue || this.panT <= 0)) { this.carteVue = g.mapObj; this.panT = 0.5; this.majPanneau(); }
    if (this.taches.length && g.state && !g.busy && !g.player.move && g.input.free && !g.bv.alive) {
      const f = this.taches.shift(); g.busy = true;
      f().catch((e) => console.error(e)).finally(() => { g.busy = false; });
    }
  }
  verifierDalles(d) {
    const e = this.etats[d.id], s = d.salles.find((q) => q.type === 'dalles');
    if (!s || e.salles[s.id].faite) return;
    const g = this.game, P = g.world.maps[d.carte].donjon.plan, sur = new Set(P.dalles.map(([x, y]) => x + ',' + y));
    let n = 0;
    if (g.state && g.mapObj.id === d.carte && !g.player.move && sur.has(g.player.x + ',' + g.player.y)) n++;
    for (const o of g.link?.others.values() || []) if (o.map === d.carte && sur.has(o.x + ',' + o.y)) n++;
    this.traiter(d.id, this.moi, { a: 'dalles', salle: s.id, n, requis: requisDalles(P.dalles.length, this.presents(d)) });
  }

  majPanneau() {
    const g = this.game, d = [...this.defs.values()].find((q) => g.state && g.mapObj?.id === q.carte);
    if (!d) { this.panel.style.display = 'none'; return; }
    const e = this.etats[d.id], P = g.world.maps[d.carte].donjon.plan, lignes = [];
    for (const s of d.salles) {
      const S = e.salles[s.id];
      let txt = '';
      if (s.type === 'accueil') txt = S.faite ? 'ouverte' : 'parle au gardien';
      else if (s.type === 'combat') txt = `${S.battus.length}/${s.pnj.length} vaincus`;
      else if (s.type === 'dalles') txt = S.faite ? 'faite' : `dalles ${S.dalles}/${requisDalles(P.dalles.length, Math.max(1, this.presents(d)))}`;
      else if (s.type === 'boss') txt = e.boss ? `${e.boss.pv}/${e.boss.max} PV` : '—';
      else if (s.type === 'serrures') txt = `serrures ${Object.values(S.cles).filter((c) => c.mise).length}/${s.pnj.length}`;
      else if (s.type === 'raid') txt = S.combat ? 'combat en cours' : `prêts ${S.prets.length}`;
      lignes.push(`<div class="dj-l${S.faite ? ' ok' : ''}"><span>${esc(s.nom)}</span><b>${S.faite ? '✔' : esc(txt)}</b></div>`);
    }
    const html = `<div class="dj-t">${esc(d.nom)}</div>${lignes.join('')}`;
    if (html !== this.panelHtml) { this.panelHtml = html; this.panel.innerHTML = html; }
    this.panel.style.display = '';
  }

  /* ---------------- PNJ ---------------- */
  async gardien(d) {
    const g = this.game, ui = g.ui, e = this.etats[d.id], who = d.pnj.g?.nom || 'Gardien';
    const accueil = d.salles.find((s) => s.type === 'accueil'), ouverteDeja = e.salles[accueil.id].faite;
    const opts = ouverteDeja ? ['Explications', 'Soigner mon équipe', 'Recommencer la crypte', 'Changer de lieu', 'Rien'] : ['Ouvrir la crypte', 'Explications', 'Soigner mon équipe', 'Changer de lieu', 'Rien'];
    const c = opts[await ui.ask(ouverteDeja ? (e.fini ? 'La crypte est calme. Tu veux y redescendre ?' : 'La crypte est ouverte. Bonne chance là-dessous.') : 'Tu veux entrer dans la crypte ?', opts, { speaker: who })];
    if (c === 'Explications') await ui.say(d.textes.gardien, { speaker: who });
    else if (c === 'Soigner mon équipe') { g.sound.sfx('heal'); for (const m of g.state.party) healFull(m); await ui.say('Voilà, ton équipe est en pleine forme.', { speaker: who }); }
    else if (c === 'Changer de lieu') this.onQuitter?.();
    else if (c === 'Ouvrir la crypte') {
      const n = this.presents(d);
      if (!(await ui.yesNo(`${n > 1 ? `Vous êtes ${n} dans la crypte.` : 'Tu es seul dans la crypte.'} Les PV d'Ossarion dépendent du nombre de joueurs présents. On ouvre ?`, { speaker: who }))) return;
      const r = await this.demande(d.id, { a: 'ouvrir' });
      if (r.ok) await ui.say(d.textes.ouverture, { speaker: who });
      else if (r.why === 'reseau') await ui.say('L\'hôte du salon ne répond pas...');
    } else if (c === 'Recommencer la crypte') {
      if (!(await ui.yesNo('Tout refermer et repartir de zéro, pour tout le groupe ?', { speaker: who }))) return;
      await this.demande(d.id, { a: 'recommencer' });
      await ui.say('Les portes se referment, les esprits reprennent leur place.', { speaker: who });
    }
  }

  async adversaire(d, k) {
    const g = this.game, ui = g.ui, p = d.pnj[k], titre = `${p.cls} ${p.nom}`;
    const e = this.etats[d.id], pris = prisPar(e, d, k);
    if (pris && pris !== this.moi) { await ui.say(`${this.nomDe(pris)} l'affronte déjà !`); return; }
    if (!(await ui.yesNo(`${titre} flotte devant toi.\nL'affronter ?`))) return;
    const r = await this.demande(d.id, { a: 'prendre', pnj: k });
    if (!r.ok) {
      await ui.say(r.why === 'occupe' ? `${this.nomDe(prisPar(this.etats[d.id], d, k))} vient de l'engager !` : r.why === 'reseau' ? 'L\'hôte du salon ne répond pas...' : 'Il n\'y a plus personne à combattre ici.');
      return;
    }
    const party = p.equipe.map(([sp, lvl]) => createMon(sp, lvl, { iv: Array(6).fill(Math.min(31, 10 + lvl / 2 | 0)), shiny: false }));
    const res = await this.combat(p, party);
    if (res === 'win') await this.demande(d.id, { a: 'gagne', pnj: k });
    else { await this.demande(d.id, { a: 'lacher', pnj: k }); await this.defaite(d); }
  }

  async boss(d, k) {
    const g = this.game, ui = g.ui, p = d.pnj[k], e = this.etats[d.id];
    if (e.fini || !e.boss) return;
    if (!(await ui.yesNo(`${p.cls} ${p.nom} se dresse devant toi. (${e.boss.pv}/${e.boss.max} PV pour tout le groupe)\nL'affronter ?`))) return;
    const now = this.etats[d.id].boss;
    if (!now || now.pv <= 0) return;
    const mon = createMon(p.equipe[0][0], p.equipe[0][1], { iv: Array(6).fill(31), shiny: false });
    mon.stats[0] = now.max; mon.hp = now.pv;
    const debut = mon.hp;
    const res = await this.combat(p, [mon]);
    const n = debut - Math.max(0, mon.hp);
    if (n > 0) await this.demande(d.id, { a: 'degats', n });
    if (res !== 'win') {
      if (n > 0 && !this.etats[d.id].fini) await ui.say(`Tu as infligé ${n} PV à ${p.nom}. Il lui en reste ${this.etats[d.id].boss.pv}.`);
      if (res === 'lose') await this.defaite(d);
    }
  }

  async combat(p, party) {
    const g = this.game;
    g.musicLock = true;
    const tr = { cls: p.cls, name: p.nom, prize: p.prix ?? 0, bs: p.bs || p.sprite, ai: 'smart', items: {}, lose: p.perd || '...' };
    const res = await g.runBattle({ trainer: tr, party, music: p.boss ? 'legend' : 'trainer', noWhiteout: true });
    g.musicLock = false; g.updateZone();
    return res;
  }
  async defaite(d) {
    const g = this.game, [x, y] = g.world.maps[d.carte].donjon.plan.depart;
    for (const m of g.state.party) healFull(m);
    await g.ui.say(d.textes.perdu);
    await g.warp({ map: d.carte, x, y, dir: 'up' }, 'exit');
  }
}

Object.assign(Donjons.prototype, Mecaniques);
