// testodyssee/js/combat/regles.js — règles de combat ajoutées au moteur d'Odyssée, dans le labo seulement.
// Le moteur d'Odyssée (odyssee/js/core/battle.js) n'est pas modifié : on enveloppe ses méthodes ici, et seule la page
// du labo charge ce fichier. Attaques (Piège de Roc, Provoc, Sabotage, Demi-Tour, Clonage, Coup Bas, Poursuite,
// Bouclier Royal…), talents (Peau Féérique, Protéen, Déclic Tactique, Délestage, Griffe Dure, Corps Maudit, Infiltration,
// Cœur Noble, Miroir Magik), objets (Veste de Combat, Bouton Fuite, Vulné-Assurance, Lumargile, Orbe Toxique, Roche
// Humide, Ceinture Pro, verrou des objets Choix), et Puissance Cachée fixée (m.pc = { t, p }, sans tenir compte des IV).
import { Battle, typeEff } from '../../../odyssee/js/core/battle.js';
import { MOVES } from '../../../odyssee/js/data/moves.js';
import { SPECIES } from '../../../odyssee/js/data/species.js';
import { ITEMS, itemName } from '../../../odyssee/js/core/items.js';
import { TALENTS_ESPECES } from '../../../odyssee/js/data/talents.js';
import { isFainted, calcStats } from '../../../odyssee/js/core/mon.js';

// attaques qui manquent à Odyssée (numéros de PokeAPI)
const A = (id, key, n, t, c, p, a, pp, o = {}) => ({ id, key, n, t, c, p, a, pp, pr: o.pr || 0, tg: o.tg ?? 10, m: { cat: 0, ...o.m } });
export const ATTAQUES_COMBAT = [
  A(446, 'stealth-rock', 'Piège de Roc', 'rock', 'status', 0, null, 20, { tg: 6, m: { cat: 11, u: 'piege-roc' } }),
  A(269, 'taunt', 'Provoc', 'dark', 'status', 0, 100, 20, { m: { cat: 13, u: 'provoc' } }),
  A(282, 'knock-off', 'Sabotage', 'dark', 'physical', 65, 100, 20, { m: { u: 'sabotage' } }),
  A(369, 'u-turn', 'Demi-Tour', 'bug', 'physical', 70, 100, 20, { m: { u: 'relais' } }),
  A(482, 'sludge-wave', 'Cradovague', 'poison', 'special', 95, 100, 10, { tg: 9, m: { cat: 4, ail: 'psn', ailc: 10 } }),
  A(164, 'substitute', 'Clonage', 'normal', 'status', 0, null, 10, { tg: 7, m: { cat: 13, u: 'clonage' } }),
  A(484, 'heavy-slam', 'Tacle Lourd', 'steel', 'physical', 0, 100, 10, { m: { u: 'tacle-lourd' } }),
  A(229, 'rapid-spin', 'Tour Rapide', 'normal', 'physical', 50, 100, 40, { m: { cat: 7, st: [[6, 1]], stc: 100, u: 'tour-rapide' } }),
  A(447, 'grass-knot', 'Nœud Herbe', 'grass', 'special', 0, 100, 20, { m: { u: 'low-kick' } }),
  A(174, 'curse', 'Malédiction', 'ghost', 'status', 0, null, 10, { tg: 7, m: { cat: 13, u: 'malediction' } }),
  A(273, 'wish', 'Vœu', 'normal', 'status', 0, null, 10, { tg: 7, m: { cat: 13, u: 'voeu' } }),
  A(312, 'aromatherapy', 'Aromathérapie', 'grass', 'status', 0, null, 5, { tg: 7, m: { cat: 13, u: 'aromatherapie' } }),
  A(389, 'sucker-punch', 'Coup Bas', 'dark', 'physical', 70, 100, 5, { pr: 1, m: { u: 'coup-bas' } }),
  A(355, 'roost', 'Atterrissage', 'flying', 'status', 0, null, 5, { tg: 7, m: { cat: 3, heal: 50, u: 'atterrissage' } }),
  A(605, 'dazzling-gleam', 'Éclat Magique', 'fairy', 'special', 80, 100, 10, { tg: 11 }),
  A(360, 'gyro-ball', 'Gyroballe', 'steel', 'physical', 0, 100, 5, { m: { u: 'gyroballe' } }),
  A(366, 'tailwind', 'Vent Arrière', 'flying', 'status', 0, null, 15, { tg: 4, m: { cat: 13, u: 'vent-arriere' } }),
  A(588, 'kings-shield', 'Bouclier Royal', 'steel', 'status', 0, null, 10, { pr: 4, tg: 7, m: { cat: 13, u: 'bouclier-royal' } }),
  A(434, 'draco-meteor', 'Draco Météore', 'dragon', 'special', 130, 90, 5, { m: { cat: 7, st: [[4, -2]], stc: 100 } }),
  A(57, 'surf', 'Surf', 'water', 'special', 90, 100, 15, { tg: 9 }),
  A(228, 'pursuit', 'Poursuite', 'dark', 'physical', 40, 100, 20, { m: { u: 'poursuite' } }),
  A(194, 'destiny-bond', 'Prélèvem. Destin', 'ghost', 'status', 0, null, 5, { tg: 7, m: { cat: 13, u: 'prelevement' } }),
];
// objets tenus qui manquent à Odyssée
const O = (name, price, desc) => ({ pocket: 'objets', price, name, desc: 'Objet à tenir. ' + desc });
export const OBJETS_COMBAT = {
  'assault-vest': O('Veste de Combat', 6000, 'Augmente la Défense Spéciale de 50 %, mais empêche d\'utiliser des capacités de statut.'),
  'eject-button': O('Bouton Fuite', 4000, 'Quand le porteur est touché par une attaque, il retourne dans sa Poké Ball et laisse sa place.'),
  'weakness-policy': O('Vulné-Assurance', 5000, 'Touché par une attaque super efficace, le porteur monte beaucoup son Attaque et son Attaque Spéciale.'),
  'light-clay': O('Lumargile', 4000, 'Protection et Mur Lumière durent 8 tours au lieu de 5.'),
  'toxic-orb': O('Orbe Toxique', 4000, 'À la fin du tour, le porteur est gravement empoisonné.'),
  'damp-rock': O('Roche Humide', 4000, 'La pluie lancée par le porteur dure 8 tours au lieu de 5.'),
  'expert-belt': O('Ceinture Pro', 4000, 'Les attaques super efficaces du porteur sont 20 % plus fortes.'),
};
for (const [k, o] of Object.entries(OBJETS_COMBAT)) o.hold = k;

const CHOIX = new Set(['choice-band', 'choice-specs', 'choice-scarf']);
const PIVOTS = new Set(['u-turn', 'volt-switch']);
const SONORES = new Set(['hyper-voice', 'boomburst', 'bug-buzz', 'snarl', 'round', 'echoed-voice', 'disarming-voice']);
const uDe = (mv) => mv?.m?.u;

/* ---------------- formes de combat : Protéen (type changé) et Déclic Tactique (Forme Assaut) ---------------- */
// une « espèce » cachée par forme, comme les Méga : le moteur lit ses types et ses stats, l'image reste celle de l'espèce
const FORMES = {};
export function forme(base, o) {
  const k = base + '|' + (o.t ? o.t.join('/') : '') + (o.b ? '|b' : '');
  if (FORMES[k]) return FORMES[k];
  const id = 40000 + Object.keys(FORMES).length, S = SPECIES[base];
  Object.defineProperty(SPECIES, id, { enumerable: false, configurable: true, value: { ...S, t: o.t || S.t, b: o.b || S.b, ev: [], visuel: base, forme: true } });
  TALENTS_ESPECES[id] = TALENTS_ESPECES[base];
  return (FORMES[k] = id);
}
const EXAGIDE = 681, LAME = [60, 140, 50, 140, 50, 60];
function changerForme(m, sp) {
  const base = m.formeDe || m.sp;
  if (sp === base) { if (!m.formeDe) return; m.sp = base; delete m.formeDe; }
  else { m.formeDe = base; m.sp = sp; }
  const hp = m.hp, max = m.stats[0]; m.stats = calcStats(m); m.stats[0] = max; m.hp = Math.min(hp, max);
}
export const formeDeBase = (m) => { if (m?.formeDe) changerForme(m, m.formeDe); };

/** objet qu'on peut faire tomber (pas une Méga-Gemme) */
const otable = (m) => !!m?.item && ITEMS[m.item]?.hold !== 'mega' && !m.megaFrom;

let installe = false;
export function installerRegles() {
  if (installe) return; installe = true;
  for (const mv of ATTAQUES_COMBAT) if (!Object.values(MOVES).some((q) => q.key === mv.key)) MOVES[mv.id] = mv;
  for (const [k, o] of Object.entries(OBJETS_COMBAT)) ITEMS[k] ||= o;
  const B = Battle.prototype, orig = {};
  for (const k of ['resolve', 'playerSwitch', 'playerAction', 'foeChoose', 'useMove', 'special', 'statusMove', 'inflict', 'boost', 'hp', 'stat', 'effOn', 'moveType', 'movePower', 'damageCore', 'doSwitch', 'checkFaints', 'endOfTurn', 'triggerEntry', 'doMega', 'end', 'start']) orig[k] = B[k];
  // seulement le combat ordinaire (pas les duels entre joueurs ni les combats à plusieurs du labo) : les changements en plein tour
  const simple = (b) => Object.getPrototypeOf(b) === B;
  const banc = (b, i) => b.sides[i].party.findIndex((m, k) => k !== b.sides[i].active && m.hp > 0);

  Object.assign(B, {
    start() { for (const s of this.sides) for (const m of s.party) m._obj0 = m.item || null; return orig.start.call(this); },

    /** Pokémon que l'adversaire envoie en plein tour (Demi-Tour, Bouton Fuite) : le meilleur pour l'IA sérieuse */
    remplacant() { const c = this.sides[1].trainer?.ai === 'smart' && this.choisirEnvoi?.(true); return c && c.idx >= 0 ? c.idx : banc(this, 1); },
    /** pourquoi ce Pokémon ne peut pas choisir cette attaque (ou null) */
    interdit(i, id) {
      const mv = MOVES[id], v = this.sides[i].v, m = this.act(i); if (!mv || id === 165) return null;
      if (v.choix && CHOIX.has(m.item) && id !== v.choix && m.moves.some((q) => q.id === v.choix && q.pp > 0)) return `${this.Nm(i)} ne peut utiliser que ${MOVES[v.choix].n} à cause de son ${itemName(m.item)} !`;
      if (mv.c === 'status' && v.provoc > 0) return `${this.Nm(i)} ne peut pas utiliser ${mv.n} après la Provoc !`;
      if (mv.c === 'status' && m.item === 'assault-vest') return `La Veste de Combat empêche ${this.nm(i)} d'utiliser ${mv.n} !`;
      if (v.entrave?.id === id) return `${mv.n} de ${this.nm(i)} est sous entrave !`;
      return null;
    },

    playerAction(action) {
      if (this.state === 'choose' && action?.type === 'move' && action.idx != null && !this.forcedAction(0)) {
        const mv = this.me.moves[action.idx], why = mv && mv.pp > 0 && this.interdit(0, mv.id);
        if (why) {
          const ok = this.usableMoves(0).filter((k) => !this.interdit(0, this.me.moves[k].id));
          if (!ok.length) return orig.playerAction.call(this, { ...action, idx: null, id: 165 });
          return [{ t: 'msg', text: why }];
        }
      }
      return orig.playerAction.call(this, action);
    },

    foeChoose() {
      const r = orig.foeChoose.call(this);
      if (r.type !== 'move' || this.wild || this.forcedAction(1)) return r;
      const m = this.foe, v = this.sides[1].v, me = this.me, opp = this.sides[0];
      const pick = (k) => ({ type: 'move', id: m.moves[k].id, slot: k });
      if (v.choix && CHOIX.has(m.item)) { const k = m.moves.findIndex((q) => q.id === v.choix && q.pp > 0); if (k >= 0) return pick(k); }
      const ok = this.usableMoves(1).filter((k) => !this.interdit(1, m.moves[k].id));
      if (!ok.length) return { type: 'move', id: 165 };
      const has = (u) => ok.find((k) => uDe(MOVES[m.moves[k].id]) === u);
      const pv = m.hp / m.stats[0], debut = v.turns === 0, vivants = opp.party.filter((q) => q.hp > 0).length;
      let k;
      if ((k = has('prelevement')) != null && pv < 0.3 && !v.lien && this.stat(1, 5) > this.stat(0, 5)) return pick(k);
      if ((k = has('piege-roc')) != null && !opp.roc && vivants >= 3 && debut) return pick(k);
      if ((k = has('vent-arriere')) != null && !this.sides[1].vent && debut) return pick(k);
      if ((k = has('provoc')) != null && debut && !opp.v.provoc && me.moves.some((q) => MOVES[q.id]?.c === 'status')) return pick(k);
      if ((k = has('clonage')) != null && debut && !v.clone && pv > 0.6) return pick(k);
      if ((k = has('voeu')) != null && pv < 0.55 && !this.sides[1].voeu) return pick(k);
      if ((k = has('aromatherapie')) != null && this.sides[1].party.some((q) => q.hp > 0 && q.status) && m.status) return pick(k);
      if ((k = has('bouclier-royal')) != null && v.lame && v.dernier !== 'bouclier-royal' && this.rng() < 0.35) return pick(k);
      // l'attaque choisie est interdite : la meilleure qui reste
      if (r.slot != null && !ok.includes(r.slot)) {
        const best = ok.map((q) => ({ q, s: MOVES[m.moves[q].id].c === 'status' ? 0 : this.estimate(1, 0, MOVES[m.moves[q].id]) })).sort((a, b) => b.s - a.s)[0];
        return pick(best.q);
      }
      // Coup Bas contre un Pokémon qui va sûrement attaquer, Poursuite seulement pour finir
      return r;
    },

    resolve(a, b) {
      const acts = [{ i: 0, a }, { i: 1, a: b }];
      this._acts = [a, b]; this._agi = new Set();
      for (const s of this.sides) { s.v.flinch = false; s.v.dmgTaken = null; }
      // Poursuite : frappe avant que l'autre ne change de Pokémon, deux fois plus fort
      for (const x of acts) {
        const o = acts[1 - x.i];
        if (x.a.type !== 'switch' || o.a.type !== 'move' || uDe(MOVES[o.a.id]) !== 'poursuite' || isFainted(this.act(o.i))) continue;
        this._poursuite = true; this.useMove(o.i, o.a, true); this._poursuite = false;
        o.done = true; this._agi.add(o.i);
        if (this.checkFaints()) { if (this.state === 'over') return; x.done = true; }
      }
      for (const x of acts) {
        if (x.done) continue;
        if (this.state === 'over') return;
        if (x.a.type === 'run') { if (this.tryRun()) return; x.done = true; }
        else if (x.a.type === 'switch') { this.doSwitch(x.i, x.a.idx, false, false); x.done = true; x.change = true; }
        else if (x.a.type === 'item') { if (this.useItem(x.i, x.a)) return; x.done = true; }
      }
      const switched = acts.filter((x) => x.change);
      if (switched.length) {
        switched.sort((p, q) => this.stat(q.i, 5) - this.stat(p.i, 5) || this.tie(p, q));
        for (const x of switched) this.triggerEntry(x.i);
      }
      if (this._koRoc) { this._koRoc = false; if (this.checkFaints()) { if (this.state !== 'over') this.endOfTurn(); return; } }
      const movers = acts.filter((x) => !x.done);
      const prio = (x) => {
        if (x.a.type !== 'move') return 0;
        const mv = MOVES[x.a.id], id = this.ab(x.i);
        return mv.pr + ((id === 'prankster' && mv.c === 'status') || (id === 'gale-wings' && mv.t === 'flying') ? 1 : 0);
      };
      movers.sort((p, q) => prio(q) - prio(p) || this.stat(q.i, 5) - this.stat(p.i, 5) || this.tie(p, q));
      movers.forEach((x, n) => { x.first = n === 0 && movers.length === 2; x.actif = this.sides[x.i].active; });
      if (this.jouerSuite(movers)) return;
      if (this.state !== 'over') this.endOfTurn();
    },
    /** joue les attaques du tour ; renvoie true si le tour s'arrête pour un changement de Pokémon du joueur (Demi-Tour…) */
    jouerSuite(movers) {
      for (let n = 0; n < movers.length; n++) {
        const x = movers[n];
        if (this.state === 'over') return true;
        if (isFainted(this.act(x.i))) continue;
        // le Pokémon qui avait choisi cette action est parti en plein tour (Bouton Fuite, Demi-Tour) : son remplaçant n'agit pas
        if (x.actif != null && this.sides[x.i].active !== x.actif) continue;
        if (x.a.type === 'recharge') { this.say(`${this.Nm(x.i)} doit se recharger !`); this.sides[x.i].v.recharge = false; continue; }
        this.useMove(x.i, x.a, x.first); this._agi?.add(x.i);
        // Demi-Tour qui met K.O. : le joueur change d'abord, l'adversaire remplace son Pokémon ensuite
        this._retenir = this._pivotJoueur && !isFainted(this.me) && banc(this, 0) >= 0;
        let stop;
        try { stop = this.checkFaints(); } finally { this._retenir = false; }
        if (this.state === 'over') return true;
        if (this._pivotJoueur) {
          this._pivotJoueur = false;
          if (!isFainted(this.me) && banc(this, 0) >= 0) {
            this._suite = stop || this._remplacant != null ? [] : movers.slice(n + 1); this._pivot = true;
            this.state = 'switch'; this.ev.push({ t: 'switch-prompt' });
            return true;
          }
        }
        if (stop) break;
      }
      return false;
    },
    playerSwitch(idx) {
      if (!this._pivot) {
        const r = orig.playerSwitch.call(this, idx);
        if (this._koRoc) { this._koRoc = false; this.checkFaints(); return r.concat(this.flush()); }
        return r;
      }
      if (this.state !== 'switch') return [];
      this.ev = []; this._pivot = false;
      this.doSwitch(0, idx, false);
      if (this._remplacant != null) { const k = this._remplacant; this._remplacant = null; this.doSwitch(1, k, true); }
      this.state = 'choose';
      if (this._koRoc) { this._koRoc = false; this.checkFaints(); }
      const suite = this._suite || []; this._suite = null;
      if (!this.jouerSuite(suite) && this.state !== 'over') this.endOfTurn();
      return this.flush();
    },

    useMove(i, a, first) {
      const d = 1 - i, side = this.sides[i], v = side.v, m = this.act(i), mv = MOVES[a.id], tv = this.sides[d].v, T = this.act(d);
      if (!mv) return orig.useMove.call(this, i, a, first);
      const u = uDe(mv);
      if (u !== 'prelevement') v.lien = false;
      // Provoc ou entrave reçue pendant le tour : l'attaque ne part pas
      if ((mv.c === 'status' && v.provoc > 0) || v.entrave?.id === mv.id) { this.say(this.interdit(i, mv.id) || 'Mais cela échoue !'); return; }
      // Déclic Tactique : Forme Assaut pour attaquer, Forme Parade avec le Bouclier Royal
      if (this.ab(i) === 'stance-change' && (m.formeDe || m.sp) === EXAGIDE) {
        if (mv.c !== 'status' && !v.lame) { v.lame = true; changerForme(m, forme(EXAGIDE, { b: LAME })); this.say(`${this.Nm(i)} passe en Forme Assaut !`); }
        else if (u === 'bouclier-royal' && v.lame) { v.lame = false; changerForme(m, EXAGIDE); this.say(`${this.Nm(i)} passe en Forme Parade !`); }
      }
      // Protéen : le Pokémon prend le type de l'attaque qu'il lance
      if (this.ab(i) === 'protean' && mv.id !== 165) {
        const t = this.moveType(i, mv), base = m.formeDe || m.sp;
        if (SPECIES[m.sp].t.join() !== t) { changerForme(m, SPECIES[base].t.join() === t ? base : forme(base, { t: [t] })); this.say(`${this.Nm(i)} devient de type ${NOMS_TYPES[t] || t} !`); }
      }
      const selfT = [7, 4, 13, 5, 12, 6].includes(mv.tg);
      const royal = !selfT && tv.protect && tv.royal && mv.c === 'physical';
      const n0 = this.ev.length, avant = T && !isFainted(T), hpT = T?.hp;
      this._cible = { d, actif: (tv.clone || 0) > 0 && this.ab(i) !== 'infiltrator' && !SONORES.has(mv.key) };
      this._cloneTouche = false;
      try { orig.useMove.call(this, i, a, first); } finally { this._cible = null; }
      v.dernier = u || mv.key;
      if (CHOIX.has(m.item) && mv.id !== 165 && !v.choix) v.choix = mv.id;
      if (royal) { this.lastUser = d; this.boost(i, 2, -2, false); }
      const touche = this.ev.slice(n0).some((e) => e.t === 'hit' && e.side === d) && !this._cloneTouche;
      if (!touche || !T) return;
      const vivant = !isFainted(T), eff = this.ev.slice(n0).filter((e) => e.t === 'hit' && e.side === d).reduce((x, e) => Math.max(x, e.eff || 1), 0);
      // Prélèvement Destin : celui qui met K.O. part avec
      if (avant && !vivant && tv.lien && !isFainted(m)) { this.say(`${this.Nm(d)} entraîne ${this.nm(i)} dans sa chute !`); this.hp(i, -m.hp); }
      if (vivant) {
        if (u === 'sabotage' && otable(T)) { (this._perdus ||= []).push([T, T.item]); this.say(`${this.Nm(i)} fait tomber ${itemName(T.item)} de ${this.nm(d)} !`); T.item = null; }
        if (this.ab(d) === 'cursed-body' && mv.c !== 'status' && !isFainted(m) && !v.entrave && this.r(100) < 30) { v.entrave = { id: mv.id, n: 4 }; this.say(`Corps Maudit de ${this.nm(d)} entrave ${mv.n} de ${this.nm(i)} !`); }
        if (this.ab(d) === 'justified' && this.moveType(i, mv) === 'dark') { this.lastUser = d; this.boost(d, 2, 1, true); }
        if (T.item === 'weakness-policy' && eff > 1) { this.say(`La Vulné-Assurance de ${this.nm(d)} s'active !`); (this._perdus ||= []).push([T, T.item]); T.item = null; this.lastUser = d; this.boost(d, 2, 2, true); this.boost(d, 4, 2, true); }
      }
      if (!simple(this) || this.state === 'over') return;
      // Bouton Fuite : le Pokémon touché laisse sa place
      if (vivant && T.item === 'eject-button' && banc(this, d) >= 0 && !isFainted(m)) {
        this.say(`Le Bouton Fuite de ${this.nm(d)} s'active !`); (this._perdus ||= []).push([T, T.item]); T.item = null;
        if (d === 1) this.doSwitch(1, this.remplacant(), false); else this._pivotJoueur = true;
        return;
      }
      // Demi-Tour, Change Éclair : le lanceur revient et un autre prend sa place
      if (PIVOTS.has(mv.key) && !isFainted(m) && banc(this, i) >= 0) {
        if (i === 1) this.doSwitch(1, this.remplacant(), false); else this._pivotJoueur = true;
      }
    },

    special(i, d, mv) {
      const u = uDe(mv), m = this.act(i), v = this.sides[i].v, T = this.act(d), tv = this.sides[d].v, scr0 = this.sides[i].screens;
      const echec = () => { this.say('Mais cela échoue !'); return true; };
      const renvoi = () => { if (this.ab(d) !== 'magic-bounce') return false; this.say(`Miroir Magik de ${this.nm(d)} renvoie ${mv.n} !`); return true; };
      switch (u) {
        case 'coup-bas': {
          const x = this._acts?.[d];
          if (!x || x.type !== 'move' || MOVES[x.id]?.c === 'status' || this._agi?.has(d)) return echec();
          return false;
        }
        case 'piege-roc': {
          const cible = renvoi() ? i : d;
          if (this.sides[cible].roc) return echec();
          this.sides[cible].roc = true; this.say(cible === 0 ? 'Des pierres pointues s\'éparpillent autour de votre équipe !' : 'Des pierres pointues s\'éparpillent autour de l\'équipe adverse !'); return true;
        }
        case 'provoc': {
          const c = renvoi() ? i : d, cv = this.sides[c].v;
          if (cv.provoc > 0 || (c === d && this._cible?.actif)) return echec();
          cv.provoc = 3; this.say(`${this.Nm(c)} est provoqué !`); return true;
        }
        case 'clonage': {
          const cout = Math.floor(m.stats[0] / 4);
          if (v.clone > 0) { this.say(`${this.Nm(i)} a déjà un clone !`); return true; }
          if (m.hp <= cout) { this.say('Mais il est trop faible pour créer un clone !'); return true; }
          this.hp(i, -cout); v.clone = cout + 1; this.say(`${this.Nm(i)} crée un clone !`); return true;
        }
        case 'malediction':
          if (SPECIES[m.sp].t.includes('ghost')) {
            if (tv.maudit) return echec();
            this.hp(i, -Math.floor(m.stats[0] / 2)); tv.maudit = true; this.say(`${this.Nm(i)} sacrifie ses PV et maudit ${this.nm(d)} !`); return true;
          }
          this.lastUser = i; this.boost(i, 2, 1, false); this.boost(i, 3, 1, false); this.boost(i, 6, -1, false); return true;
        case 'voeu':
          if (this.sides[i].voeu) return echec();
          this.sides[i].voeu = { t: 2, pv: Math.floor(m.stats[0] / 2), nom: this.Nm(i) }; this.say(`${this.Nm(i)} fait un vœu !`); return true;
        case 'aromatherapie':
          for (const q of this.sides[i].party) if (q.status && q.hp > 0) { q.status = null; q.slp = 0; q.tox = 0; }
          this.ev.push({ t: 'status', side: i, status: null }); this.say('Une odeur apaisante se répand ! L\'équipe est guérie.'); return true;
        case 'vent-arriere':
          if (this.sides[i].vent) return echec();
          this.sides[i].vent = 4; this.say(i === 0 ? 'Un vent arrière souffle derrière votre équipe !' : 'Un vent arrière souffle derrière l\'équipe adverse !'); return true;
        case 'bouclier-royal': {
          const ok = this.r(Math.pow(2, Math.min(4, v.royalChaine || 0))) === 0;
          if (ok) { v.protect = true; v.royal = true; v.royalChaine = (v.royalChaine || 0) + 1; this.ev.push({ t: 'anim', side: i, k: 'protect' }); this.say(`${this.Nm(i)} se protège !`); }
          else { v.royalChaine = 0; this.say('Mais cela échoue !'); }
          return true;
        }
        case 'prelevement': v.lien = true; this.say(`${this.Nm(i)} veut entraîner son adversaire avec lui !`); return true;
        case 'atterrissage': if (SPECIES[m.sp].t.includes('flying')) v.atterri = true; return false;
        case 'whirlwind': case 'roar': {
          if (this.wild || !simple(this)) break;
          const c = renvoi() ? i : d, l = this.sides[c].party.map((q, n) => (n !== this.sides[c].active && q.hp > 0 ? n : -1)).filter((n) => n >= 0);
          if (!l.length) return echec();
          this.say(`${this.Nm(c)} est emporté au loin !`);
          this._impose = true;
          try { this.doSwitch(c, l[this.r(l.length)], true); } finally { this._impose = false; }
          return true;
        }
        case 'tour-rapide':
          if (this.sides[i].roc || v.seed || v.trap) { this.sides[i].roc = false; v.seed = false; v.trap = 0; this.say(`${this.Nm(i)} se libère de ce qui l'entoure !`); }
          return false;
        default: break;
      }
      if (u !== 'bouclier-royal') v.royalChaine = 0;
      const r = orig.special.call(this, i, d, mv);
      // Lumargile : Protection et Mur Lumière tiennent 8 tours
      if ((u === 'reflect' || u === 'light-screen') && m.item === 'light-clay') { const k = u === 'reflect' ? 'reflect' : 'light'; if (scr0[k] === 5) scr0[k] = 8; }
      return r;
    },
    statusMove(i, d, mv) {
      const self = [7, 4, 13, 5, 12, 6].includes(mv.tg);
      if (!self && this._cible?.actif && (mv.m?.ail || mv.m?.st)) { this.say('Mais cela échoue !'); return; }
      if (!self && this.ab(d) === 'magic-bounce' && (mv.m?.ail || mv.m?.st?.some(([, c]) => c < 0))) { this.say(`Miroir Magik de ${this.nm(d)} renvoie ${mv.n} !`); return orig.statusMove.call(this, d, i, mv); }
      return orig.statusMove.call(this, i, d, mv);
    },
    inflict(d, ail, mv, secondary) {
      if (this._cible?.actif && d === this._cible.d && this.sides[d].v.clone > 0) { if (!secondary) this.say('Mais cela échoue !'); return false; }
      return orig.inflict.call(this, d, ail, mv, secondary);
    },
    boost(i, sid, c, secondary) {
      if (c < 0 && this._cible?.actif && i === this._cible.d && this.sides[i].v.clone > 0 && i !== this.lastUser) return false;
      return orig.boost.call(this, i, sid, c, secondary);
    },
    hp(i, delta, cause) {
      // Clonage : le clone encaisse l'attaque à la place du Pokémon
      const v = this.sides[i].v;
      if (delta < 0 && this._cible?.actif && i === this._cible.d && v.clone > 0) {
        const n = Math.min(v.clone, -delta); v.clone -= n; this._cloneTouche = true;
        this.say(`Le clone encaisse les dégâts à la place de ${this.nm(i)} !`);
        if (v.clone <= 0) { v.clone = 0; this.say(`Le clone de ${this.nm(i)} disparaît !`); }
        return 0;
      }
      // barre de vie à blocs (m.blocs) : un coup ne fait jamais tomber plus d'un bloc
      const m = this.act(i);
      if (delta < 0 && m?.blocs > 1 && m.hp > 0) {
        const M = m.stats[0], n = m.blocs, seuil = (k) => Math.round(k * M / n);
        let k = 1; while (k < n && m.hp > seuil(k)) k++;
        const bas = seuil(k - 1);
        if (m.hp + delta < bas) delta = bas - m.hp;
        const r = orig.hp.call(this, i, delta, cause);
        if (bas > 0 && m.hp <= bas) this.say(`Un bloc de vie de ${this.nm(i)} se brise ! Il lui en reste ${k - 1}.`);
        return r;
      }
      return orig.hp.call(this, i, delta, cause);
    },
    stat(i, k, crit, atkSide, ignore) {
      // Choc Psy : une attaque spéciale qui touche la Défense ; Lame Sainte : ignore les crans de Défense
      if (atkSide === false && k === 4 && this._defPhys) k = 2;
      if (atkSide === false && this._ignoreDef) ignore = true;
      let x = orig.stat.call(this, i, k, crit, atkSide, ignore);
      const m = this.act(i);
      if (k === 4 && m.item === 'assault-vest') x = Math.floor(x * 1.5);
      if (k === 5) {
        if (this.sides[i].vent) x *= 2;
        if (this.ab(i) === 'unburden' && m._obj0 && !m.item) x *= 2;
      }
      return Math.max(1, x);
    },
    effOn(a, d, type) {
      const v = this.sides[d].v, t = SPECIES[this.act(d).sp].t;
      if (v.atterri && t.includes('flying')) return typeEff(type, t.filter((q) => q !== 'flying').length ? t.filter((q) => q !== 'flying') : ['normal']);
      return orig.effOn.call(this, a, d, type);
    },
    moveType(i, mv) {
      const m = this.act(i);
      if (uDe(mv) === 'hidden-power' && m?.pc) return m.pc.t;
      const t = orig.moveType.call(this, i, mv);
      if (t === 'normal' && mv.c !== 'status' && this.ab(i) === 'pixilate') return 'fairy';
      return t;
    },
    movePower(i, d, mv) {
      const u = uDe(mv), m = this.act(i), T = this.act(d);
      if (u === 'hidden-power' && m?.pc) return m.pc.p;
      if (u === 'tacle-lourd') { const r = (SPECIES[m.sp].w || 1) / Math.max(1, SPECIES[T.sp].w || 1); return r >= 5 ? 120 : r >= 4 ? 100 : r >= 3 ? 80 : r >= 2 ? 60 : 40; }
      if (u === 'gyroballe') return Math.max(1, Math.min(150, Math.floor(25 * this.stat(d, 5) / Math.max(1, this.stat(i, 5))) + 1));
      let p = orig.movePower.call(this, i, d, mv);
      if (mv.key === 'acrobatics' && !m.item) p *= 2;
      if (u === 'sabotage' && otable(T)) p = Math.floor(p * 1.5);
      if (u === 'poursuite' && this._poursuite) p *= 2;
      return p;
    },
    damageCore(a, d, mv, power, type, crit, rand) {
      const aId = this.ab(a), A = this.act(a), scr = this.sides[d].screens;
      this._defPhys = mv.key === 'psyshock'; this._ignoreDef = mv.key === 'sacred-sword';
      if (aId === 'infiltrator') this.sides[d].screens = {};
      let dmg;
      try { dmg = orig.damageCore.call(this, a, d, mv, power, type, crit, rand); } finally { this.sides[d].screens = scr; this._defPhys = false; this._ignoreDef = false; }
      let f = 1;
      if (aId === 'pixilate' && mv.t === 'normal' && type === 'fairy') f *= 1.2;
      if (aId === 'tough-claws' && mv.c === 'physical') f *= 1.3;
      if (A.item === 'expert-belt' && this.effOn(a, d, type) > 1) f *= 1.2;
      return f === 1 ? dmg : Math.max(1, Math.floor(dmg * f));
    },

    doSwitch(i, idx, afterFaint, trigger = true) {
      if (this._retenir && i === 1 && afterFaint) { this._remplacant = idx; return; }
      const out = this.act(i);
      if (out) formeDeBase(out);
      orig.doSwitch.call(this, i, idx, afterFaint, trigger);
      // Piège de Roc : blesse en arrivant, selon l'efficacité de la Roche
      const m = this.act(i);
      if (this.sides[i].roc && m && !isFainted(m) && this.ab(i) !== 'magic-guard') {
        const n = Math.max(1, Math.floor(m.stats[0] * typeEff('rock', SPECIES[m.sp].t) / 8));
        this.hp(i, -n); this.say(`Des pierres pointues blessent ${this.nm(i)} !`);
        if (isFainted(m)) this._koRoc = true;
      }
    },
    checkFaints() {
      let r = orig.checkFaints.call(this);
      for (let k = 0; k < 6 && this._koRoc && this.state !== 'over'; k++) { this._koRoc = false; r = orig.checkFaints.call(this) || r; }
      return r;
    },
    triggerEntry(side) {
      orig.triggerEntry.call(this, side);
      const m = this.act(side);
      // Roche Humide : la pluie du porteur dure 8 tours
      if (m && this.ab(side) === 'drizzle' && m.item === 'damp-rock' && this.weather === 'rain' && this.weatherTurns === 5) {
        this.weatherTurns = 8;
        const e = [...this.ev].reverse().find((q) => q.t === 'weather'); if (e) e.turns = 8;
      }
    },
    endOfTurn() {
      orig.endOfTurn.call(this);
      if (this.state === 'over') return;
      let ko = false;
      for (const i of this.eotOrder()) {
        const s = this.sides[i], m = this.act(i), v = s.v;
        v.atterri = false; v.royal = false;
        if (s.voeu && --s.voeu.t <= 0) {
          const w = s.voeu; s.voeu = null;
          if (m && !isFainted(m) && m.hp < m.stats[0]) { this.say(`Le vœu de ${w.nom} se réalise !`); this.hp(i, w.pv); }
        }
        if (s.vent && --s.vent <= 0) { s.vent = 0; this.say(i === 0 ? 'Le vent arrière de votre équipe retombe.' : 'Le vent arrière de l\'équipe adverse retombe.'); }
        if (!m || isFainted(m)) continue;
        if (v.maudit && this.ab(i) !== 'magic-guard') { this.say(`${this.Nm(i)} est touché par la malédiction !`); this.hp(i, -Math.max(1, Math.floor(m.stats[0] / 4))); if (isFainted(m)) { ko = true; continue; } }
        if (v.provoc > 0 && --v.provoc === 0) this.say(`${this.Nm(i)} n'est plus provoqué.`);
        if (v.entrave && --v.entrave.n <= 0) { this.say(`${MOVES[v.entrave.id].n} de ${this.nm(i)} n'est plus sous entrave.`); v.entrave = null; }
        // Orbe Toxique
        if (m.item === 'toxic-orb' && !m.status && !SPECIES[m.sp].t.some((t) => t === 'poison' || t === 'steel')) { this.say(`L'Orbe Toxique de ${this.nm(i)} s'active !`); this.inflict(i, 'psn', { key: 'toxic' }, true); }
      }
      if (ko) this.checkFaints();
    },
    doMega(i) {
      orig.doMega.call(this, i);
      // un talent donné à la forme de base laisse la place au talent de la forme Méga
      const m = this.act(i), t = TALENTS_ESPECES[m.sp]?.[0];
      if (m.ability && t && t !== m.ability) { m._abBase = m.ability; m.ability = t; }
    },
    end(result) {
      for (const s of this.sides) for (const m of s.party) formeDeBase(m);
      orig.end.call(this, result);
      for (const s of this.sides) for (const m of s.party) { if (m._abBase) { m.ability = m._abBase; delete m._abBase; } delete m._obj0; }
      // les objets tombés (Sabotage) ou partis (Bouton Fuite, Vulné-Assurance) reviennent après le combat
      for (const [m, it] of this._perdus || []) if (!m.item) m.item = it;
      this._perdus = null;
    },
  });
}

const NOMS_TYPES = { normal: 'Normal', fire: 'Feu', water: 'Eau', grass: 'Plante', electric: 'Électrik', ice: 'Glace', fighting: 'Combat', poison: 'Poison', ground: 'Sol', flying: 'Vol', psychic: 'Psy', bug: 'Insecte', rock: 'Roche', ghost: 'Spectre', dragon: 'Dragon', dark: 'Ténèbres', steel: 'Acier', fairy: 'Fée' };
