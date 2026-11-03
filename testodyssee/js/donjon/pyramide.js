// testodyssee/js/donjon/pyramide.js — mécaniques de la Pyramide de l'Ascension, ajoutées à la classe Donjons (jeu.js) :
// objets de soin mis de côté à l'entrée, objets partagés des étages, duos de dresseurs à deux joueurs, escalier qui
// apparaît, fontaine, portes à une personne, Pokémon sauvages qu'on ne fuit pas, duels des arènes et du sommet.
// L'avancée passe par les actions d'etat.js (couple*, duel*, ramasse, elimine) : l'hôte du salon fait autorité.
// Les duels entre joueurs se jouent comme les combats entre joueurs d'Odyssée (même combat sur les deux écrans,
// graine tirée par l'hôte), sans soigner les équipes avant.
import { T } from '../../../odyssee/js/world/tiles.js';
import { createMon, healFull } from '../../../odyssee/js/core/mon.js';
import { ITEMS, itemName } from '../../../odyssee/js/core/items.js';
import { Battle } from '../../../odyssee/js/core/battle.js';
import { PvpBattle, validParty } from '../../../odyssee/js/core/pvp.js';
import { el } from '../../../odyssee/js/ui/ui.js';
import { Groupe } from '../combat/groupe.js';
import { battu, actifs, pourNb, attendusArene, attendusSommet, areneEnCours } from './etat.js';

// Pokémon sauvages des grottes : on ne peut pas les fuir
let sansFuite = null;
const fuir = Battle.prototype.tryRun;
Battle.prototype.tryRun = function () { if (sansFuite && this.wild) { this.say(sansFuite); return false; } return fuir.call(this); };

const cle = (x, y) => x + ',' + y;
const copie = (p) => JSON.parse(JSON.stringify(p));
/** objets de soin : poche Soins et Baies */
export const estSoin = (k) => ['soin', 'baies'].includes(ITEMS[k]?.pocket);
const estPyr = (d) => !!d?.pyramide;

export const Pyramide = {
  pyrIci() { return [...this.defs.values()].find((d) => estPyr(d) && this.estDans(d)); },

  /* ---------------- carte ---------------- */
  poserObjetsPyramide(d, m) {
    if (!estPyr(d)) return;
    const s = d.salles.find((q) => q.carte === m.id);
    for (const [c, l] of Object.entries(m.donjon.plan.objets)) {
      const o = d.objets[c];
      l.forEach(([x, y], i) => {
        if (o.type === 'soin') m.object(x, y, { use: () => this.ramasserSoin(d, s, c, i) });
        else if (o.type === 'fontaine') m.object(x, y, { use: () => this.fontaine(d) });
        else if (o.type === 'porteP') m.object(x, y, { use: () => this.portePyr(d, s, c) });
      });
    }
    if (s?.couchant) m.couchant = true;
  },
  /** le décor suit l'état : objets pris, portes franchies, escaliers apparus */
  appliquerPyramide(d) {
    if (!estPyr(d)) return;
    const g = this.game, e = this.etats[d.id];
    for (const [i, s] of d.salles.entries()) {
      const m = g.world.maps[s.carte]; if (!m) continue;
      const P = m.donjon.plan, S = e.salles[s.id], pris = S.donnees.ramasses || [];
      for (const [c, l] of Object.entries(P.objets)) {
        const o = d.objets[c];
        l.forEach(([x, y], k) => {
          if (o.type === 'soin') this.decor(m, x, y, pris.includes(`${c}:${k}`) ? null : 'itemball');
          else if (o.type === 'porteP') this.decor(m, x, y, (e.salles[s.id].donnees.voies || {})[c] ? o.decor + '_f' : o.decor);
        });
      }
      // escalier de l'étage : un des emplacements E, tiré par l'hôte
      if (s.type === 'etage' && P.objets.E) {
        const n = e.secret?.escaliers?.[s.id] ?? 0, suiv = d.salles[i + 1], sm = g.world.maps[suiv.carte];
        P.objets.E.forEach(([x, y], k) => {
          const la = S.faite && k === n % P.objets.E.length, deja = m.get(x, y) === T.STAIRS;
          if (la === deja) return;
          if (la) { m.set(x, y, T.STAIRS); m.warp(x, y, { map: sm.id, x: sm.donjon.plan.depart[0], y: sm.donjon.plan.depart[1], dir: 'up' }); }
          else { m.set(x, y, T.CAVE); m.warps.delete(cle(x, y)); }
          if (g.mapObj === m) g.view.rebuildAt(x, y);
        });
      }
    }
    // quelqu'un attend un partenaire pour un duo : les autres joueurs de la salle sont prévenus
    const avant = this.attentesVues || {}, vues = {};
    for (const s of d.salles) {
      if (s.type !== 'etage') continue;
      for (const [k, l] of Object.entries(e.salles[s.id].donnees.attente || {})) {
        if (!l.length) continue;
        vues[k] = l.join(',');
        if (avant[k] === vues[k] || l.includes(this.moi) || l.length > 1 || g.mapObj?.id !== s.carte) continue;
        const p = d.pnj[k];
        g.ui.toast(`${this.nomDe(l[0])} a besoin d'un partenaire contre ${p.cls} ${p.nom} !`, 3200);
      }
    }
    this.attentesVues = vues;
  },
  /** fin d'une salle : l'étage annonce son escalier */
  porteOuvertePyr(d, s) {
    if (!estPyr(d)) return false;
    if (s.type === 'etage') { this.game.sound.sfx('bang'); this.game.view.shake = 0.2; this.game.ui.toast(d.textes.escalier, 2600); return true; }
    return s.type === 'voies' || s.type === 'arene' || s.type === 'sommet';
  },

  /* ---------------- entrée et sortie ---------------- */
  /** en entrant : les objets de soin du Sac sont mis de côté ; seul dans la pyramide, une nouvelle ascension commence */
  async entreePyramide(d) {
    if (!estPyr(d)) return;
    const g = this.game, st = g.state, e = this.etats[d.id];
    if (this.presents(d) <= 1 && (e.salles.s1.faite || e.dehors.length || e.fini)) await this.demande(d.id, { a: 'recommencer' });
    if (st.sacPyramide) return;
    const mis = {};
    for (const [k, n] of Object.entries(st.bag)) if (estSoin(k) && n > 0) { mis[k] = n; delete st.bag[k]; }
    st.sacPyramide = mis;
    if (Object.keys(mis).length) g.ui.toast(d.textes.miseDeCote, 3200);
  },
  /** en sortant : ce qu'on a trouvé reste dans la pyramide, ses propres objets reviennent */
  sortiePyramide(d) {
    if (!estPyr(d)) return;
    const g = this.game, st = g.state; if (!st?.sacPyramide) return;
    for (const k of Object.keys(st.bag)) if (estSoin(k)) delete st.bag[k];
    for (const [k, n] of Object.entries(st.sacPyramide)) st.bag[k] = (st.bag[k] || 0) + n;
    const rendu = Object.keys(st.sacPyramide).length;
    delete st.sacPyramide;
    if (rendu) g.ui.toast(d.textes.rendus, 2600);
  },
  /** perdu : on est ramené dehors, sans récompense */
  async elimine(d, texte) {
    const g = this.game;
    for (const m of g.state.party) healFull(m);
    await g.ui.say(texte || d.textes.perdu);
    await this.demande(d.id, { a: 'elimine' });
    const dehors = g.world.maps[d.carte].outside;
    await g.warp({ map: dehors.map, x: dehors.x, y: dehors.y, dir: 'down' }, 'exit');
  },

  /* ---------------- objets, fontaine, portes ---------------- */
  async ramasserSoin(d, s, c, i) {
    const g = this.game, o = d.objets[c];
    const r = await this.demande(d.id, { a: 'ramasse', salle: s.id, objet: `${c}:${i}` });
    if (!r.ok) { await g.ui.say(r.why === 'reseau' ? 'L\'hôte du salon ne répond pas...' : 'Quelqu\'un vient de le ramasser.'); return; }
    g.give(o.objet, o.n || 1); g.sound.sfx('item');
    await g.ui.say(`${g.state.name} trouve ${o.n > 1 ? o.n + ' × ' : ''}${itemName(o.objet)} !`);
  },
  async fontaine(d) {
    const g = this.game, ui = g.ui, [a, q] = d.textes.fontaine;
    await ui.say(a);
    if (!(await ui.yesNo(q))) return;
    g.sound.sfx('heal');
    for (const m of g.state.party) healFull(m);
    for (const k of Object.keys(g.state.bag)) if (estSoin(k)) delete g.state.bag[k];
    await ui.say(d.textes.fontaineBue);
    this.demande(d.id, { a: 'equipe', party: copie(g.state.party) });
  },
  async portePyr(d, s, lettre) {
    const g = this.game, ui = g.ui, o = d.objets[lettre], nom = d.voies[o.voie], V = (this.etats[d.id].salles[s.id].donnees.voies || {});
    if (V[lettre] && !g.modeTest) { await ui.say(`La ${nom} s'est refermée.\n${this.nomDe(V[lettre])} a pris ce chemin.`); return; }
    if (!(await ui.yesNo(`Franchir la ${nom} ? Elle se refermera derrière toi : personne d'autre ne pourra la prendre.`))) return;
    const r = await this.demande(d.id, { a: 'voie', salle: s.id, voie: lettre, test: !!g.modeTest });
    if (!r.ok) { await ui.say(r.why === 'prise' ? 'Trop tard : quelqu\'un vient de franchir cette porte.' : r.why === 'deja' ? 'Tu as déjà choisi ta porte.' : r.why === 'reseau' ? 'L\'hôte du salon ne répond pas...' : '...'); return; }
    g.sound.sfx('bang'); g.view.shake = 0.2;
    const cible = d.salles.find((q) => q.id === s.voies[lettre]), cm = g.world.maps[cible.carte], [x, y] = cm.donjon.plan.depart;
    await g.warp({ map: cm.id, x, y, dir: 'up' }, 'door');
  },

  /* ---------------- Pokémon sauvages des grottes ---------------- */
  async apresPasPyramide() {
    const d = this.pyrIci(); if (!d) return;
    const g = this.game, p = g.player, m = g.mapObj, s = d.salles.find((q) => q.carte === m.id);
    if (!s?.rencontres || m.get(p.x, p.y) !== T.CAVE || g.bv.alive || Math.random() > (s.taux || 0.03)) return;
    const tot = s.rencontres.reduce((a, x) => a + x[3], 0); let r = Math.random() * tot, e = s.rencontres[0];
    for (const x of s.rencontres) { r -= x[3]; if (r <= 0) { e = x; break; } }
    const wild = createMon(e[0], e[1] + Math.floor(Math.random() * (e[2] - e[1] + 1)), { met: d.nom });
    g.busy = true; sansFuite = d.textes.sansFuite;
    try {
      const res = await g.runBattle({ wild, noWhiteout: true });
      sansFuite = null;
      if (res === 'lose') await this.elimine(d);
    } finally { sansFuite = null; g.busy = false; }
  },

  /* ---------------- duos de dresseurs ---------------- */
  async duo(d, k) {
    const g = this.game, ui = g.ui, p = d.pnj[k], e = this.etats[d.id], s = d.salles.find((q) => q.pnj?.includes(k)), S = e.salles[s.id];
    const titre = `${p.cls} ${p.nom}`;
    if (battu(e, d, k)) return;
    if (S.pris[k]) { await ui.say('Ce duo est déjà en plein combat.'); return; }
    const att = S.donnees.attente?.[k] || [];
    if (att.length && !att.includes(this.moi)) {
      if (!(await ui.yesNo(`${this.nomDe(att[0])} attend un partenaire pour affronter ${titre}.\nFaire équipe ?`))) return;
    } else {
      await ui.say(`« Nous sommes deux : il vous faudra être deux ! »`, { speaker: titre });
      if (!(await ui.yesNo(g.modeTest ? 'Mode test : affronter le duo seul ?' : 'Appeler un partenaire ? Les autres joueurs de la salle seront prévenus.'))) return;
    }
    const r = await this.demande(d.id, { a: 'couple', pnj: k, party: copie(g.state.party), test: !!g.modeTest });
    if (!r.ok) { await ui.say(r.why === 'complet' || r.why === 'occupe' ? 'Ce duo a déjà ses adversaires.' : r.why === 'reseau' ? 'L\'hôte du salon ne répond pas...' : '...'); return; }
    const debut = this.debutRaid ? Promise.resolve(this.debutRaid) : new Promise((res) => { this.attenteRaid = res; });
    this.debutRaid = null;
    let parti = false;
    const box = ui.dialogBox();
    ui.typePage(box, 'En attente d\'un partenaire… (Échap : renoncer)', { last: true });
    const pop = g.input.push((key) => { if (key === 'b') { parti = true; this.attenteRaid?.(null); } });
    const msg = await debut;
    pop(); ui.closeDialog(); this.attenteRaid = null;
    if (parti || !msg) { await this.demande(d.id, { a: 'coupleAnnule', pnj: k }); return; }
    await this.combatRaid(d, p, msg, s);
  },
  /** côté hôte : un duo a ses deux adversaires (ou un seul en mode test) : le combat commence */
  verifierDuos(d) {
    const e = this.etats[d.id], equipes = this.equipesRaid[d.id] || {};
    for (const s of d.salles) {
      if (s.type !== 'etage') continue;
      const S = e.salles[s.id];
      for (const [k, l] of Object.entries(S.donnees.attente || {})) {
        if (S.pris[k] || S.battus.includes(k) || !(l.length >= 2 || (l.length === 1 && S.donnees.seul?.[k]))) continue;
        const joueurs = l.slice(0, 2).filter((q) => validParty(equipes[q])).map((q) => ({ id: q, nom: this.nomDe(q), party: copie(equipes[q]) }));
        if (!joueurs.length) continue;
        const p = d.pnj[k], infos = { cls: p.cls, nom: p.nom, bs: p.bs || p.sprite };
        const reserve = p.equipe.map(([sp, lvl]) => createMon(sp, lvl, { iv: Array(6).fill(Math.min(31, 10 + lvl / 2 | 0)), shiny: false }));
        const combat = new Groupe({ joueurs, dresseur: infos, reserve, places: 2 }), id = `${d.id}|${s.id}|${k}`;
        this.raids[id] = { raid: combat, ids: joueurs.map((j) => j.id), boss: infos, d: d.id, salle: s.id, pnj: k, fin: (result) => this.traiter(d.id, this.moi, { a: 'coupleFin', pnj: k, result }) };
        this.traiter(d.id, this.moi, { a: 'coupleDebut', pnj: k });
        const evs = combat.start();
        this.diffuserRaid(id, { etape: 'debut', groupe: true, evs, photo: combat.photo(), boss: infos });
      }
    }
  },

  /* ---------------- arènes et sommet ---------------- */
  async arbitre(d, k) {
    const g = this.game, ui = g.ui, p = d.pnj[k], titre = `${p.cls} ${p.nom}`, s = d.salles.find((q) => q.carte === g.mapObj.id);
    if (!s) return;
    const e = this.etats[d.id], S = e.salles[s.id];
    if (S.faite) { await ui.say(s.type === 'sommet' ? 'Le sommet a désigné son vainqueur.' : 'Le duel de cette arène est terminé.', { speaker: titre }); return; }
    if (S.combat) { await ui.say('Un duel est en cours.', { speaker: titre }); return; }
    await ui.say(s.type === 'sommet' ? d.textes.sommet : d.textes.arene, { speaker: titre });
    if (!(await ui.yesNo('Prêt pour le duel ?'))) return;
    const r = await this.demande(d.id, { a: 'duelPret', salle: s.id, party: copie(g.state.party) });
    if (!r.ok) { await ui.say(r.why === 'reseau' ? 'L\'hôte du salon ne répond pas...' : '...'); return; }
    const debut = this.messagePyr ? Promise.resolve(this.messagePyr) : new Promise((res) => { this.attentePyr = res; });
    this.messagePyr = null;
    let parti = false;
    const box = ui.dialogBox();
    ui.typePage(box, 'En attente de ton adversaire… (Échap : partir)', { last: true });
    const pop = g.input.push((key) => { if (key === 'b') { parti = true; this.attentePyr?.(null); } });
    const msg = await debut;
    pop(); ui.closeDialog(); this.attentePyr = null;
    if (parti || !msg) { await this.demande(d.id, { a: 'duelAnnule', salle: s.id }); return; }
    let gagnant = null;
    if (msg.etape === 'duel') {
      const res = await this.duelPyr(msg), adv = msg.ids.find((q) => q !== this.moi);
      gagnant = res === 'win' ? this.moi : res === 'lose' ? adv : msg.ids[0];
    } else if (msg.etape === 'reflet') {
      await ui.say(d.textes.reflet, { speaker: titre });
      const party = msg.party.map((m) => { const c = copie(m); healFull(c); delete c._ko; return c; });
      const res = await this.combat({ cls: 'Reflet', nom: `de ${msg.nom}`, bs: msg.bs || 'player_m', perd: '...' }, party);
      gagnant = res === 'win' ? this.moi : null;
    } else gagnant = this.moi;
    await this.demande(d.id, { a: 'duelFin', salle: s.id, gagnant });
    if (gagnant !== this.moi) { await this.elimine(d, s.type === 'arene' ? d.textes.perduArene : undefined); return; }
    g.sound.play('victory');
    for (const m of g.state.party) healFull(m);
    if (s.type === 'arene') {
      await ui.say(d.textes.gagneArene, { speaker: titre });
      const sm = g.world.maps[d.salles.find((q) => q.type === 'sommet').carte], [x, y] = sm.donjon.plan.depart;
      await g.warp({ map: sm.id, x, y, dir: 'up' }, 'exit');
      return;
    }
    await ui.say(msg.etape === 'seul' ? [d.textes.seulSommet, d.textes.gagneSommet] : d.textes.gagneSommet, { speaker: titre });
    for (const [k2, n] of Object.entries(d.recompense?.objets || {})) { g.give(k2, n); g.sound.sfx('item'); await ui.say(`${g.state.name} reçoit ${n > 1 ? n + ' × ' : ''}${itemName(k2)} !\nIl est rangé dans le Sac.`); }
    const dehors = g.world.maps[d.carte].outside;
    await g.warp({ map: dehors.map, x: dehors.x, y: dehors.y, dir: 'down' }, 'exit');
  },
  /** un duel entre deux joueurs, sans soin : chacun fait tourner le même combat (graine de l'hôte) */
  async duelPyr(m) {
    const g = this.game, ui = g.ui, link = g.link, st = g.state;
    const adv = m.ids.find((q) => q !== this.moi), rid = `pyr:${m.salle}:${m.seed}`;
    const mine = copie(st.party); for (const q of mine) delete q._ko;
    link.send(adv, { t: 'pyb', rid, step: 'party', party: copie(mine), gender: st.gender });
    const box = ui.dialogBox(); ui.typePage(box, `${this.nomDe(adv)} se prépare…`, { last: true });
    const r = await link.wait(adv, (q) => q.t === 'pyb' && q.rid === rid && q.step === 'party', 60000);
    ui.closeDialog();
    // l'adversaire est parti avant le duel : victoire par forfait
    if (r.step !== 'party' || !validParty(r.party)) { await ui.say(`${this.nomDe(adv)} ne s'est pas présenté.`); return 'win'; }
    const battle = new PvpBattle({ me: { name: st.name, party: mine }, foe: { name: this.nomDe(adv), party: r.party, bs: r.gender === 'f' ? 'serena' : 'calem' }, seed: m.seed >>> 0, canon: m.ids[0] === this.moi ? 0 : 1 });
    const B = (step, n) => (q) => q.t === 'pyb' && q.rid === rid && ((q.step === step && q.n === n) || q.step === 'quit');
    const attendre = async (step, n) => { const q = await link.wait(adv, B(step, n), 300000); if (q.t === 'left') return { left: true }; if (q.t === 'timeout') return { timeout: true }; if (q.step === 'quit') return { quit: true }; return q; };
    const duel = {
      foeName: this.nomDe(adv),
      sendAct: (n, action, sum) => link.send(adv, { t: 'pyb', rid, step: 'act', n, action, sum }),
      waitAct: async (n) => { const q = await attendre('act', n); return q.action ? { action: q.action, sum: q.sum } : q; },
      sendSwitch: (n, idx) => link.send(adv, { t: 'pyb', rid, step: 'sw', n, idx }),
      waitSwitch: async (n) => { const q = await attendre('sw', n); return q.step === 'sw' ? { idx: q.idx } : q; },
      sendQuit: () => link.send(adv, { t: 'pyb', rid, step: 'quit' }),
    };
    const real = st.party;
    const curtain = await g.encounterIntro('trainer'); curtain.remove();
    g.bv.pvp = true; st.party = mine;
    let res;
    try { res = await g.bv.runPvp(battle, duel, { bg: 'cave' }); }
    finally { st.party = real; g.bv.pvp = false; g.bv.close(); }
    g.sound.stopMusic(0.1); g.sound.current = null; g.updateZone();
    return res;
  },
  /** côté hôte : lance les duels quand les joueurs attendus sont prêts */
  verifierArenes(d) {
    const e = this.etats[d.id];
    for (const s of d.salles) {
      if (s.type !== 'arene' && s.type !== 'sommet') continue;
      const S = e.salles[s.id];
      if (S.faite || S.combat || !S.prets.length) continue;
      if (s.type === 'sommet' && areneEnCours(d, e)) continue;
      let att = s.type === 'arene' ? attendusArene(d, e, s) : attendusSommet(d, e);
      // arrivé là sans passer par les portes (mode test) : on y est seul
      if (!att.length && S.prets.length === 1) att = [...S.prets];
      if (att.length >= 2) { const ids = att.slice(0, 2); if (ids.every((q) => S.prets.includes(q))) this.lancerDuel(d, s, ids, { etape: 'duel', seed: (Math.random() * 2 ** 32) >>> 0 }); }
      else if (att.length === 1 && S.prets.includes(att[0])) this.lancerDuel(d, s, att, s.type === 'arene' ? this.refletPyr(d, s, att[0]) : { etape: 'seul' });
    }
  },
  /** le reflet que va affronter celui qui est seul dans son arène : l'équipe d'un joueur de l'autre arène */
  refletPyr(d, s, q) {
    const e = this.etats[d.id], sv = d.salles.find((x) => x.type === 'voies'), V = e.salles[sv.id].donnees.voies || {}, equipes = this.equipesRaid[d.id] || {};
    const autre = d.salles.find((x) => x.type === 'arene' && x !== s);
    let src = [...new Set((autre?.portes || []).map((l) => V[l]).filter((x) => x && x !== q && validParty(equipes[x])))];
    if (!src.length) src = Object.keys(equipes).filter((x) => x !== q && validParty(equipes[x]));
    const qui = src.length ? src[Math.floor(Math.random() * src.length)] : q;
    return { etape: 'reflet', nom: this.nomDe(qui), party: copie(equipes[qui] || equipes[q] || []) };
  },
  lancerDuel(d, s, ids, m) {
    this.traiter(d.id, this.moi, { a: 'duelDebut', salle: s.id, ids });
    for (const q of ids) {
      const msg = { t: 'djPyr', d: d.id, salle: s.id, ids, ...m };
      if (q === this.moi) setTimeout(() => this.recevoirPyr(msg), 0);
      else this.H?.send(q, msg);
    }
  },
  /** côté joueur : l'hôte lance son duel */
  recevoirPyr(m) { if (this.attentePyr) this.attentePyr(m); else this.messagePyr = m; },

  /* ---------------- à chaque image ---------------- */
  tickPyramide(dt) {
    const g = this.game;
    if (this.hote) {
      this.pyrT = (this.pyrT || 0) - dt;
      if (this.pyrT <= 0) { this.pyrT = 0.25; for (const d of this.defs.values()) if (estPyr(d)) { this.verifierDuos(d); this.verifierArenes(d); } }
    }
    // le sommet, au soleil couchant
    const ici = !!(g.state && g.mapObj?.couchant);
    if (ici && !this.couchant) { this.couchant = el('div', 'testody-couchant'); g.ui.root.prepend(this.couchant); }
    if (this.couchant) this.couchant.style.display = ici ? '' : 'none';
  },
  /** texte de l'encadré du donjon pour les salles de la pyramide */
  textePyramide(d, s) {
    const e = this.etats[d.id], S = e.salles[s.id];
    if (s.type === 'etage') { const l = actifs(d, e, s); return `${l.filter((k) => S.battus.includes(k)).length}/${l.length} vaincus`; }
    if (s.type === 'arene' || s.type === 'sommet') return S.combat ? 'duel en cours' : 'duel';
    return null;
  },
  /** un dresseur des étages n'est là qu'à 3 ou qu'à 4 joueurs */
  presentPyr(d, p) { return !p.pour || p.pour === pourNb(this.etats[d.id]); },
};
