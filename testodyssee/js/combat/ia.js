// testodyssee/js/combat/ia.js — l'IA des dresseurs sérieux du labo (ai: 'smart'), par-dessus celle d'Odyssée, sans la modifier.
// Elle ne connaît de l'équipe du joueur que ce qu'elle a vu en combat : les types, les attaques déjà lancées, les talents
// qui se sont montrés (ou qu'une espèce est seule à avoir). Pour le reste, elle suppose une attaque de 90 de puissance de
// chaque type du Pokémon d'en face, physique ou spéciale selon sa meilleure statistique.
// Chaque tour, elle calcule avec le moteur lui-même les dégâts qu'elle fait et ceux qu'elle risque (talents, objets,
// météo, crans de stats, immunités), et décide : achever, se protéger ou changer quand elle va tomber, poser un piège,
// un statut ou un boost seulement quand elle ne risque rien, garder en vie son poseur de météo et le renvoyer quand la
// météo s'arrête. Elle ne prédit pas les changements du joueur. Après un K.O., elle envoie le meilleur Pokémon.
import { Battle } from '../../../odyssee/js/core/battle.js';
import { MOVES } from '../../../odyssee/js/data/moves.js';
import { SPECIES } from '../../../odyssee/js/data/species.js';
import { getAbility, abilitiesOf } from '../../../odyssee/js/data/abilities.js';
import { isFainted } from '../../../odyssee/js/core/mon.js';

const B = Battle.prototype;
const uDe = (mv) => mv?.m?.u;
const METEO = { drizzle: 'rain', drought: 'sun', 'sand-stream': 'sandstorm', 'snow-warning': 'hail' };
const PROFITE = { rain: ['swift-swim', 'rain-dish', 'dry-skin', 'hydration'], sun: ['chlorophyll', 'solar-power', 'flower-gift'], sandstorm: ['sand-rush', 'sand-force', 'sand-veil'], hail: ['snow-cloak', 'ice-body', 'slush-rush'] };
const SOIN = new Set(['recover', 'roost', 'slack-off', 'soft-boiled', 'milk-drink', 'moonlight', 'morning-sun', 'synthesis', 'heal-order']);

/** Pokémon frais (crans à zéro) le temps d'un calcul : celui qu'on enverrait */
function avec(b, side, idx, f) {
  const s = b.sides[side], a = s.active, v = s.v;
  s.active = idx; s.v = { st: [0, 0, 0, 0, 0, 0, 0, 0] };
  try { return f(); } finally { s.active = a; s.v = v; }
}

let installe = false;
export function installerIA() {
  if (installe) return; installe = true;
  const orig = { foeChoose: B.foeChoose, useMove: B.useMove, doSwitch: B.doSwitch, triggerEntry: B.triggerEntry };
  const simple = (b) => Object.getPrototypeOf(b) === B;
  const serieuse = (b) => simple(b) && !b.wild && b.sides[1].trainer?.ai === 'smart';

  Object.assign(B, {
    /* ---------------- ce que l'IA a vu ---------------- */
    vu(m) { const V = (this._vu ||= new Map()); if (!V.has(m.uid)) V.set(m.uid, { moves: new Set(), ab: null }); return V.get(m.uid); },
    /** talent que l'IA prête à ce Pokémon du joueur : montré en combat, ou le seul possible pour son espèce */
    talentCru(m) {
      const s = this.vu(m); if (s.ab) return s.ab;
      const l = [...new Set(abilitiesOf(m.sp).filter(Boolean))];
      return l.length === 1 ? l[0] : null;
    },
    /** un message qui nomme le talent d'un Pokémon du joueur le dévoile */
    devoiler(n0) {
      const m = this.act(0); if (!m) return;
      const nom = getAbility(m)?.name; if (!nom) return;
      if (this.ev.slice(n0).some((e) => e.t === 'msg' && e.text?.includes(nom))) this.vu(m).ab = getAbility(m).id;
    },
    useMove(i, a, first) {
      const n0 = this.ev.length, m = this.act(i);
      orig.useMove.call(this, i, a, first);
      if (i === 0 && m && MOVES[a.id] && a.id !== 165) this.vu(m).moves.add(a.id);
      this.devoiler(n0);
    },
    triggerEntry(side) { const n0 = this.ev.length; orig.triggerEntry.call(this, side); this.devoiler(n0); },

    /* ---------------- calculs ---------------- */
    prioDe(i, mv) { const id = this.ab(i); return mv.pr + ((id === 'prankster' && mv.c === 'status') || (id === 'gale-wings' && mv.t === 'flying') ? 1 : 0); },
    /** l'attaque ne fait rien (type ou talent du défenseur, tel que l'attaquant le connaît) */
    sansEffet(a, d, mv, type, abD) {
      if (this.effOn(a, d, type) === 0) return true;
      if (this.ab(a) === 'mold-breaker') return false;
      if (type === 'ground' && abD === 'levitate') return true;
      if (type === 'water' && ['water-absorb', 'dry-skin', 'storm-drain'].includes(abD)) return true;
      if (type === 'electric' && ['volt-absorb', 'lightning-rod', 'motor-drive'].includes(abD)) return true;
      if (type === 'fire' && abD === 'flash-fire') return true;
      if (type === 'grass' && abD === 'sap-sipper') return true;
      if (abD === 'wonder-guard' && this.effOn(a, d, type) <= 1) return true;
      return false;
    },
    /** PV que l'attaque devrait enlever (précision comprise), sans toucher au hasard du combat */
    degats(a, d, mv, abD) {
      if (!mv || mv.c === 'status') return 0;
      const type = this.moveType(a, mv), A = this.act(a), D = this.act(d), u = uDe(mv);
      if (this.sansEffet(a, d, mv, type, abD)) return 0;
      if (u === 'coup-bas' && a === 1) { /* ne marche que si le joueur attaque : on compte à moitié */ }
      let dmg;
      if (u === 'seismic-toss' || u === 'night-shade') dmg = A.lvl;
      else if (u === 'super-fang') dmg = Math.floor(D.hp / 2);
      else if (['dragon-rage', 'sonic-boom', 'psywave', 'endeavor', 'counter', 'mirror-coat', 'present', 'splash'].includes(u)) dmg = 0;
      else {
        const p = u === 'magnitude' ? 70 : this.movePower(a, d, mv);
        if (!p) return 0;
        dmg = this.damageCore(a, d, mv, p, type, false, 0.92);
        const x = mv.m || {}; if (x.h0) dmg *= (x.h0 + (x.h1 || x.h0)) / 2;
      }
      if (u === 'coup-bas') dmg *= 0.7;
      const acc = this.ab(a) === 'no-guard' || mv.a == null ? 1 : mv.a / 100;
      return Math.max(0, dmg * acc);
    },
    /** attaques que l'IA prête au Pokémon actif du joueur : celles déjà vues, et une de 90 par type */
    attaquesCrues() {
      const m = this.act(0), vues = [...this.vu(m).moves].map((id) => MOVES[id]).filter((mv) => mv && mv.c !== 'status');
      const phys = this.stat(0, 1) >= this.stat(0, 3);
      const devinees = SPECIES[m.sp].t.map((t) => ({ id: -1, key: 'devinee-' + t, n: '', t, c: phys ? 'physical' : 'special', p: 90, a: 100, pp: 1, pr: 0, tg: 10, m: { cat: 0 } }));
      return [...vues, ...devinees];
    },
    /** le plus de PV que le joueur peut enlever au Pokémon actif de l'IA ce tour-ci (et la vitesse de son attaque) */
    menace() {
      const ab = this.ab(1); let best = 0, prio = 0;
      for (const mv of this.attaquesCrues()) { const d = this.degats(0, 1, mv, ab); if (d > best) best = d; if (d > 0 && mv.pr > 0) prio = Math.max(prio, d); }
      // Pokémon déjà boosté : on le craint d'autant plus
      const st = this.sides[0].v.st, boost = Math.max(st[1], st[3]);
      return { best: best * (boost > 0 ? 1.1 : 1), prio };
    },
    /** le meilleur coup de l'IA sur le Pokémon d'en face */
    meilleurCoup() {
      const m = this.foe, abP = this.talentCru(this.me); let best = 0;
      for (const q of m.moves) { if (q.pp <= 0) continue; const mv = MOVES[q.id]; best = Math.max(best, this.degats(1, 0, mv, abP)); }
      return best;
    },
    meteoDe(m) { return METEO[getAbility(m)?.id] || null; },
    profite(m, w) { return !!w && (PROFITE[w] || []).includes(getAbility(m)?.id); },
    /**
     * note d'un Pokémon de l'IA face au Pokémon du joueur (plus c'est haut, mieux c'est) ; gratuit : il entre après un
     * K.O. (pas de coup à encaisser en arrivant)
     */
    noteContre(idx, gratuit) {
      const s = this.sides[1], m = s.party[idx], P = this.me;
      const calc = (f) => (idx === s.active ? f() : avec(this, 1, idx, f));
      return calc(() => {
        const pique = s.roc && this.ab(1) !== 'magic-guard' ? m.stats[0] * this.effOn(0, 1, 'rock') / 8 : 0;
        const recu = this.menace().best, frappe = this.meilleurCoup();
        const reste = m.hp - pique - (gratuit ? 0 : recu);
        if (reste <= 0) return -9;
        const vite = this.stat(1, 5) > this.stat(0, 5);
        let note = Math.min(1.2, frappe / Math.max(1, P.hp)) * (vite ? 1.3 : 1) - Math.min(1.5, recu / Math.max(1, reste)) * 0.8 + reste / m.stats[0] * 0.3;
        if (frappe >= P.hp && vite) note += 0.8;
        if (recu >= reste && !vite) note -= 0.6;
        // météo : relancer la sienne, profiter de celle qui est là
        const w = this.meteoDe(m);
        if (w && this.weather !== w) note += 0.5;
        if (this.profite(m, this.weather)) note += 0.4;
        return note;
      });
    },
    /** meilleur Pokémon à envoyer (ou -1) */
    choisirEnvoi(gratuit) {
      const s = this.sides[1]; let best = -1, nb = -Infinity;
      s.party.forEach((m, k) => { if (k === s.active || m.hp <= 0) return; const n = this.noteContre(k, gratuit); if (n > nb) { nb = n; best = k; } });
      return { idx: best, note: nb };
    },
    /** doit-on changer de Pokémon ? (le changement coûte un coup à encaisser) */
    changementUtile(seuil) {
      if (this.turn - (this._iaChange ?? -9) < 2) return -1;
      const c = this.choisirEnvoi(false); if (c.idx < 0) return -1;
      const ici = this.noteContre(this.sides[1].active, true);
      return c.note > ici + seuil ? c.idx : -1;
    },

    /* ---------------- le choix du tour ---------------- */
    iaChoix() {
      const s = this.sides[1], m = this.foe, P = this.me, v = s.v;
      const ok = this.usableMoves(1).filter((k) => !this.interdit(1, m.moves[k].id));
      if (!ok.length) return { type: 'move', id: 165 };
      const pick = (k) => ({ type: 'move', id: m.moves[k].id, slot: k });
      const changer = (idx) => { this._iaChange = this.turn; return { type: 'switch', idx }; };
      const abP = this.talentCru(P);
      const opts = ok.map((k) => { const mv = MOVES[m.moves[k].id]; return { k, mv, u: uDe(mv), dmg: this.degats(1, 0, mv, abP), prio: this.prioDe(1, mv) }; });
      const M = this.menace(), vite = (this.stat(1, 5) > this.stat(0, 5)) !== (this.distorsion > 0), pv = m.hp, max = m.stats[0];
      const tombe = M.best >= pv, tranquille = M.best < pv * 0.45 && !tombe;
      const attaques = opts.filter((o) => o.dmg > 0).sort((a, b) => b.dmg - a.dmg);
      const meilleur = attaques[0];
      const banc = s.party.some((q, k) => k !== s.active && q.hp > 0);
      const vivantsJ = this.sides[0].party.filter((q) => q.hp > 0).length;

      // objet Choix bloqué sur une attaque qui ne sert à rien : on change
      if (v.choix && banc) { const o = opts.find((q) => q.mv.id === v.choix); if (!o || o.dmg < P.hp * 0.15) { const c = this.changementUtile(-1); if (c >= 0) return changer(c); } }
      // 1. achever le Pokémon d'en face
      const tuent = attaques.filter((o) => o.dmg >= P.hp);
      if (tuent.length) {
        const prio = tuent.find((o) => o.prio > 0);
        if (vite || !tombe) return pick(tuent.sort((a, b) => (b.mv.a ?? 100) - (a.mv.a ?? 100))[0].k);
        if (prio) return pick(prio.k);
      }
      // Relais : se renforcer d'abord, puis passer ce qu'il a gagné lui-même (pas ce qu'il vient de recevoir)
      const crans = v.st.reduce((a, x) => a + Math.max(0, x), 0), relaisB = opts.find((o) => o.u === 'relais-baton');
      // assez de crans : il s'en sert pour attaquer au lieu de les faire tourner
      if (relaisB && banc && !(crans >= 8 && attaques.length)) {
        const gagnes = crans - (v.recu || 0);
        const monte = (o) => o.mv.c === 'status' && o.mv.tg === 7 && (o.mv.m?.st || []).length && o.mv.m.st.every(([, c]) => c > 0) && o.mv.m.st.some(([k]) => v.st[k - 1] < 6);
        const protege = opts.find((o) => o.mv.key === 'protect' || o.mv.key === 'detect');
        const clone = opts.find((o) => o.u === 'clonage');
        if (tombe && gagnes >= 1 && !v.clone) return pick(relaisB.k);
        if (gagnes >= 2) return pick(relaisB.k);
        if (protege && v.turns === 0 && this.ab(1) === 'speed-boost') return pick(protege.k);
        if (clone && !v.clone && pv > max * 0.5 && v.dernier !== 'clonage') return pick(clone.k);
        const bo = opts.find(monte);
        if (bo && !tombe) return pick(bo.k);
        if (crans >= 1 && !attaques.length) return pick(relaisB.k);
      }
      // Danse Lune : il se sacrifie pour soigner le suivant
      const lune = opts.find((o) => o.u === 'danse-lune');
      if (lune && banc && (tombe || pv < max * 0.3) && s.party.some((q, k) => k !== s.active && q.hp > 0 && (q.hp < q.stats[0] * 0.7 || q.status))) return pick(lune.k);
      // Distorsion : le plus lent la pose dès qu'il peut
      const dist = opts.find((o) => o.u === 'distorsion');
      if (dist && !(this.distorsion > 0) && this.stat(1, 5) < this.stat(0, 5) && !tombe) return pick(dist.k);
      // 2. il va tomber : Prélèvem. Destin, changer, ou frapper le plus fort possible
      if (tombe) {
        const lien = opts.find((o) => o.u === 'prelevement');
        if (lien && !v.lien && vite) return pick(lien.k);
        const royal = opts.find((o) => o.u === 'bouclier-royal' || o.mv.key === 'protect' || o.mv.key === 'detect');
        if (royal && v.dernier !== royal.u && v.dernier !== royal.mv.key && this.sides[0].v.st[1] + this.sides[0].v.st[3] <= 0 && !vite) return pick(royal.k);
        // le poseur de météo reste en vie tant qu'il le peut
        const seuil = this.meteoDe(m) || m.role === 'climat' ? -0.4 : 0.1;
        if (banc && !(m.item === 'focus-sash' && pv === max)) { const c = this.changementUtile(seuil); if (c >= 0) return changer(c); }
        const prio = attaques.find((o) => o.prio > 0);
        if (prio && !vite && prio.dmg >= P.hp * 0.4) return pick(prio.k);
        if (meilleur) return pick(meilleur.k);
      }
      // 3. météo : son poseur la relance quand elle s'arrête
      if (banc) {
        const w = this.meteoDe(m);
        if (!w && this.weather === 'none') {
          const k = s.party.findIndex((q, n) => n !== s.active && q.hp > 0 && this.meteoDe(q));
          if (k >= 0 && avec(this, 1, k, () => this.menace().best) < s.party[k].hp * 0.5 && this.turn - (this._iaChange ?? -9) >= 2 && !(meilleur && meilleur.dmg >= P.hp * 0.6)) return changer(k);
        }
      }
      // 4. un bien meilleur Pokémon au banc pour ce duel
      if (banc && !tranquille) { const c = this.changementUtile(0.9); if (c >= 0) return changer(c); }
      // 5. soutien, seulement sans danger
      const has = (f) => opts.find(f);
      const stP = P.status, typesP = SPECIES[P.sp].t;
      if (tranquille || M.best < pv * 0.6) {
        let o;
        if ((o = has((q) => q.u === 'piege-roc')) && !this.sides[0].roc && vivantsJ >= 3) return pick(o.k);
        if ((o = has((q) => q.u === 'voeu')) && pv < max * 0.7 && !s.voeu) return pick(o.k);
        if ((o = has((q) => q.mv.key === 'protect')) && s.voeu?.t === 1) return pick(o.k);
        if ((o = has((q) => SOIN.has(q.mv.key) || q.u === 'atterrissage')) && pv < max * 0.55 && M.best < max * 0.45) return pick(o.k);
        if ((o = has((q) => q.u === 'aromatherapie')) && s.party.some((q) => q.hp > 0 && q.status)) return pick(o.k);
        if ((o = has((q) => q.u === 'vent-arriere')) && !s.vent) return pick(o.k);
        if ((o = has((q) => q.u === 'anneau-hydro')) && !v.anneau) return pick(o.k);
        if ((o = has((q) => q.u === 'gravite')) && !(this.gravite > 0) && m.moves.some((q) => MOVES[q.id]?.a && MOVES[q.id].a < 80)) return pick(o.k);
        if ((o = has((q) => q.u === 'clonage')) && !v.clone && pv > max * 0.6 && tranquille) return pick(o.k);
        if ((o = has((q) => q.u === 'provoc')) && !this.sides[0].v.provoc && [...this.vu(P).moves].some((id) => MOVES[id]?.c === 'status')) return pick(o.k);
        if (!stP && this.ab(0) !== 'magic-guard') {
          const phys = this.stat(0, 1) > this.stat(0, 3);
          if ((o = has((q) => q.mv.key === 'will-o-wisp')) && phys && !typesP.includes('fire') && abP !== 'water-veil' && abP !== 'flash-fire') return pick(o.k);
          if ((o = has((q) => q.mv.key === 'thunder-wave')) && !vite && !typesP.includes('ground') && !typesP.includes('electric') && abP !== 'limber') return pick(o.k);
          if ((o = has((q) => q.mv.key === 'toxic')) && !typesP.includes('poison') && !typesP.includes('steel') && P.hp > P.stats[0] * 0.5 && abP !== 'immunity' && abP !== 'poison-heal') return pick(o.k);
          if ((o = has((q) => q.mv.key === 'leech-seed')) && !typesP.includes('grass') && !this.sides[0].v.seed) return pick(o.k);
        }
        // boost : seulement s'il encaisse deux coups et qu'il ne peut pas déjà achever
        const boost = (q) => q.mv.c === 'status' && (q.u === 'malediction' && !SPECIES[m.sp].t.includes('ghost') || (q.mv.m?.st || []).every(([, c]) => c > 0) && (q.mv.m?.st || []).length && (q.mv.tg === 7 || q.mv.tg === 4));
        const cran = Math.max(v.st[1], v.st[3]);
        if ((o = has(boost)) && M.best * 2 < pv && cran < (relaisB ? 3 : 2) && pv > max * 0.6 && !(meilleur && meilleur.dmg >= P.hp)) return pick(o.k);
      }
      // 6. la plus forte attaque (Tour Rapide quand il y a des pierres de son côté, Demi-Tour quand le duel est perdu)
      if (attaques.length) {
        const spin = attaques.find((o) => o.u === 'tour-rapide');
        if (spin && s.roc && tranquille) return pick(spin.k);
        const relais = attaques.find((o) => o.u === 'relais' || o.mv.key === 'volt-switch');
        if (relais && banc && M.best > pv * 0.5 && this.choisirEnvoi(true).note > this.noteContre(s.active, true)) return pick(relais.k);
        // ne pas se blesser pour rien : contrecoup et Orbe Vie quand une autre attaque achève aussi
        return pick(meilleur.k);
      }
      // rien qui fasse mal : changer si possible, sinon un soutien quelconque
      if (banc) { const c = this.changementUtile(-5); if (c >= 0) return changer(c); }
      return pick(opts[0].k);
    },
    foeChoose() {
      if (!serieuse(this)) return orig.foeChoose.call(this);
      const forced = this.forcedAction(1); if (forced) return forced;
      const t = this.sides[1].trainer;
      // les objets de soin d'Odyssée restent possibles pour les dresseurs qui en ont
      if (t.items && Object.values(t.items).some((n) => n > 0)) { const r = orig.foeChoose.call(this); if (r.type === 'item') return r; }
      return this.iaChoix();
    },
    /** après un K.O., l'IA envoie le meilleur Pokémon contre celui d'en face (pas simplement le suivant) */
    doSwitch(i, idx, afterFaint, trigger = true) {
      if (i === 1 && afterFaint && !this._impose && !this._retenir && serieuse(this) && !isFainted(this.me)) {
        const c = this.choisirEnvoi(true); if (c.idx >= 0) idx = c.idx;
      }
      return orig.doSwitch.call(this, i, idx, afterFaint, trigger);
    },
  });
}
