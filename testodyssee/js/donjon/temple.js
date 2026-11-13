// testodyssee/js/donjon/temple.js — mécaniques du Temple des Éléments, ajoutées à la classe Donjons (jeu.js) :
// la dalle d'or et la grande porte (pour un seul joueur), les décors des chemins, les clés et la porte aux trois
// gemmes, le téléporteur du solo, et la table derrière le Gardien : trois Poké Balls à se partager (deux joueurs qui
// veulent la même se départagent en duel) ; en solo, trois CT pour un starter, dont on ne prend qu'une.
// L'avancée passe par les actions d'etat.js (« maj », « choixStarter », « starterDuelFin ») : l'hôte fait autorité.
import { T, walkable } from '../../../odyssee/js/world/tiles.js';
import { fermer, ouvrir } from './plan.js';
import { dessinerCourants, dessinerRemous } from '../rendu.js';
import { ASSETS } from '../../../odyssee/js/assets.js';
import { el, esc } from '../../../odyssee/js/ui/ui.js';
import { SPECIES } from '../../../odyssee/js/data/species.js';
import { healFull } from '../../../odyssee/js/core/mon.js';
import { battu, resoudreStarters } from './etat.js';
import { STARTERS_TEMPLE } from '../formes.js';
import { itemName, ITEMS } from '../../../odyssee/js/core/items.js';
import { CHAR_ROWS } from '../../../odyssee/js/render/world3d.js';
import { ReliefHGSS } from '../../../odyssee/js/render/falaises.js';
import { DRESSEURS } from '../donjons/temple-chemins.js';
import { DRESSEURS_TEMPLE, POKEMON_TEMPLE, BUTIN_TEMPLE, OBJETS_SALLES } from '../donjons/temple.js';
const ITEMS_DESC = (k) => ITEMS[k]?.desc || '';

const cle = (x, y) => x + ',' + y;
const estTemple = (d) => d.id === 'temple';
const TYPES = new Set(['grandePorte', 'porteSolo', 'porteCles', 'starter', 'ct', 'porteHall', 'arbuste', 'ronces']);
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export const TALISMAN = 'talisman-elements';
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
// le solo : objets du Sac, décors des passages et des verrous
const SAC = { braise: 'braise-eternelle', graine: 'graine-geante', fiole: 'fiole-eau-pure', pierre: 'pierre-ardente', rosee: 'rosee-eternelle', corde: 'corde-liane' };
const DECOR_VERROU = { ronces: 'ronces_geantes', vapeur: 'vapeur', flammes: 'mur_flammes', glace: 'mur_glace', arbre: 'arbre_mort', gouffre: 'gouffre', grille: 'grille_temple' };
/** la roche des grottes : une couleur par salle, sauf là où la salle en donne une autre (biomesCase) */
let teinte = false;
function teinterRoche() {
  if (teinte) return; teinte = true;
  const avant = ReliefHGSS.prototype.biomeDe;
  ReliefHGSS.prototype.biomeDe = function (x, y) { return this.m?.biomesCase?.get(x + ',' + y) || avant.call(this, x, y); };
}
export const CARTE_TEMPLE = 'carte-temple';
/** la case devant la sortie d'une salle (la sortie peut être en haut ou sur un côté) */
export function devantSortie(P) {
  const [x, y] = P.suivante, sol = new Set(P.sol.map(([a, b]) => a + ',' + b));
  return [[0, 1], [1, 0], [-1, 0], [0, -1]].map(([dx, dy]) => [x + dx, y + dy]).find(([a, b]) => sol.has(a + ',' + b)) || [x, y + 1];
}
const TYPE_FR = { fire: 'Feu', water: 'Eau', grass: 'Plante', normal: 'Normal', steel: 'Acier', flying: 'Vol', poison: 'Poison' };
const NOM_CLE = { f: 'Clé du Feu', e: 'Clé de l\'Eau', p: 'Clé de la Plante' };
const IMG_CLE = { f: 'cle_feu', e: 'cle_eau', p: 'cle_plante' };
const NIVEAU_STARTER = 15;
// un tirage qui ne dépend que de son texte : tout le monde voit les mêmes dresseurs
const tirage = (txt) => { let h = 2166136261; for (const c of txt) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; }; };

export const Temple = {
  poserObjetsTemple(d, m) {
    if (!estTemple(d)) return;
    if (ITEMS[CARTE_TEMPLE] && !ITEMS[CARTE_TEMPLE].use) ITEMS[CARTE_TEMPLE].use = async () => { await this.carteTemple(d); return true; };
    const P = m.donjon.plan, S = d.salles.find((q) => q.carte === m.id);
    // la roche de leur élément
    if (S?.biome) m.biome = S.biome;
    // on surfe dans tous les chemins (l'Eau, et les passages entre les chemins du solo) ; pas de Pokémon sauvages
    if (S?.voie || S?.chemin) { m.surf = true; m.encounter = null; m.surfEnc = null; }
    for (const [c, l] of Object.entries(P.objets)) {
      const o = d.objets[c];
      for (const [x, y] of l) {
        if (o.cascade) { (m.cascades ||= new Set()).add(cle(x, y)); m.deco.push({ k: 'cascade', x, y }); }
        if (o.type === 'tuile') { m.set(x, y, T[o.t]); if (o.t === 'WHIRL') (m.remous ||= []).push([x, y]); }
        if (o.type === 'courant') { m.set(x, y, T.WATER); (m.courants ||= new Map()).set(cle(x, y), o.dir); }
        if (TYPES.has(o.type)) m.object(x, y, { use: () => this.objetTemple(d, m, c, x, y) });
      }
    }
    // sorties vers une salle qui n'est pas « la précédente » (le hall, la salle des trois portes du solo)
    if (S?.retour && P.sortie) {
      const [sid, c] = S.retour, cm = this.game.world.maps[d.salles.find((q) => q.id === sid).carte], [ox, oy] = cm.donjon.plan.objets[c][0];
      const moine = Object.values(cm.donjon.plan.pnj).some(([[a, b]]) => a === ox && b === oy + 1);
      const [sx, sy] = P.sortie;
      m.set(sx, sy, T.CAVEDOOR); m.warp(sx, sy, { map: cm.id, x: moine ? ox - 1 : ox, y: moine ? oy + 2 : oy + 1, dir: 'down' }); m.deco.push({ k: 'exitlight', x: sx, y: sy });
    }
    // le solo : recoins (passages, objets, source) et verrou devant la sortie
    if (S?.recoins) for (const [c, R] of Object.entries(S.recoins)) {
      const [x, y] = P.objets[c][0];
      m.object(x, y, { use: () => this.recoinTemple(d, S, c) });
    }
    if (S?.verrou) { const [vx, vy] = devantSortie(P); m.object(vx, vy, { use: () => this.verrouTemple(d, S) }); }
    // les grottes des passages secrets : leur dessin dépend de leurs deux chemins
    for (const B of S?.bouches || []) {
      // une sortie de grotte comme les autres, vers le devant de la porte d'en face ; côté première salle, un obstacle
      const S2 = d.salles.find((q) => q.id === B.vers), B2 = S2.bouches[0], m2 = this.game.world.maps[S2.carte];
      m.set(B.x + 1, B.y + 1, T.CAVEDOOR); m.warp(B.x + 1, B.y + 1, { map: m2.id, x: B2.devant[0] + 1, y: B2.devant[1] + 1, dir: 'down' }); m.deco.push({ k: 'exitlight', x: B.x + 1, y: B.y + 1 });
      if (B.verrou) m.object(B.garde[0] + 1, B.garde[1] + 1, { use: () => this.verrouTemple(d, S, B.verrou, `${S.id}:passage`) });
    }
    // la roche d'une autre couleur autour de certains passages (rougie près du Feu, grise dans le tunnel)
    if (S?.teintes?.length) { m.biomesCase = new Map(S.teintes.map(([x, y, b]) => [cle(x + 1, y + 1), b])); teinterRoche(); }
    if (S?.branche === 'solo') this.syncSolo(d, m);
    // les objets de la salle, puis ses dresseurs (et le nageur épuisé de la Mer Intérieure)
    const niv = S?.pk ? Number(S.pk[1]) : 0;
    (P.objets.I || []).forEach(([x, y], i) => { const k = OBJETS_SALLES[niv]?.[i]; if (k) m.item(x, y, k, 1, `${m.id}:I:${i}`); });
    if (S?.pk) this.poserDresseursTemple(d, m, S);
    // ponts sur la lave : des planches posées en décalque (le rendu met la lave dessous)
    if (m.biome === 'magma') for (const [x, y] of P.objets['='] || []) {
      const ns = m.get(x - 1, y) === T.LAVA || m.get(x + 1, y) === T.LAVA;
      m.deco.push({ k: 'dalle', g: ns ? 'pontns' : 'pontew', x, y });
    }
    // la table : un comptoir, avec une Poké Ball dessus là où il y a quelque chose à prendre
    const balles = new Set(Object.entries(P.objets).filter(([c]) => ['starter', 'ct'].includes(d.objets[c].type)).flatMap(([, l]) => l.map(([x, y]) => cle(x, y))));
    for (const dd of m.deco) if (dd.k === 'counter') { dd.front = 'counterfront'; dd.top = 'lab'; dd.ball = balles.has(cle(dd.x, dd.y)); }
    // la grande porte : un seul dessin, au milieu de ses trois cases
    if (P.objets.G) { const [x, y] = P.objets.G[1]; const dd = m.deco.find((q) => q.x === x && q.y === y); if (dd) dd.k = 'porte_grande'; }
    if (P.objets.Q) { const [x, y] = P.objets.Q[1]; const dd = m.deco.find((q) => q.x === x && q.y === y); if (dd) dd.k = 'porte_grande'; }
  },
  /** un rocher poussé sur un bouton d'un chemin : ses barrières tombent */
  rocherTemple(x, y) {
    const g = this.game, m = g.mapObj, d = this.defs?.get('temple'); if (!d || m?.donjon?.def?.id !== 'temple') return;
    const P = m.donjon.plan, st = g.state;
    for (const [c, l] of Object.entries(P.objets)) {
      const o = d.objets[c]; if (o.type !== 'bouton' || !l.some(([bx, by]) => bx === x && by === y)) continue;
      const f = `TPB:${m.id}:${c}`; if (st.flags[f]) return;
      st.flags[f] = true;
      const dd = m.deco.find((q) => q.x === x && q.y === y && q.k === 'interrupteur'); if (dd) dd.k = 'interrupteur_on';
      for (const [bx, by] of P.objets[o.ouvre] || []) g.setTile(bx, by, T.CAVE);
      g.sound.sfx('bang'); g.view.shake = 0.15;
      this.taches.push(() => g.ui.say('Clac ! Quelque part, une barrière s\'abaisse.'));
    }
  },
  /** en entrant dans un chemin : rochers, arbres et pierres reviennent à leur place (rien n'y reste coincé) ;
   *  les barrières déjà ouvertes le restent */
  remiseTemple(to) {
    const g = this.game, d = this.defs?.get('temple'), m = g.world.maps[to?.map];
    if (!d || m?.donjon?.def !== d || g.mapObj === m) return;
    const S = d.salles.find((q) => q.carte === m.id); if (!S?.voie && !S?.chemin) return;
    const st = g.state, P = m.donjon.plan, t = (st.tiles ||= {})[m.id] = {};
    for (const [c, l] of Object.entries(P.objets)) {
      const o = d.objets[c]; if (o.type !== 'bouton' || !st.flags[`TPB:${m.id}:${c}`]) continue;
      for (const [bx, by] of P.objets[o.ouvre] || []) t[cle(bx, by)] = T.CAVE;
    }
  },
  /* ---------------- les dresseurs des chemins ---------------- */
  /** cinq ou six dresseurs par salle : leur place vient du plan, leur classe et leurs Pokémon du chemin */
  poserDresseursTemple(d, m, S) {
    const el = S.pk[0] === 'F' ? 'f' : S.pk[0] === 'E' ? 'e' : 'p', solo = S.branche === 'solo';
    if (S.pk === 'E4') {
      const [sx, sy] = m.donjon.plan.depart;
      m.npc({ id: `${m.id}:epuise`, x: sx + 2, y: sy - 2, dir: 'left', sprite: 'topdresseur', move: 'static',
        text: ['Je suis arrivé jusqu\'ici, mais les courants m\'ont épuisé.', 'Je reprends mon souffle avant d\'aller chercher la clé.'] });
      return;
    }
    const R = tirage(m.id), D = DRESSEURS_TEMPLE[el], places = DRESSEURS[S.pk] || [];
    const melange = (l) => { const a = [...l]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    // d'abord ceux qui aiment l'élément du chemin (plus de la moitié), puis les autres
    const terre = [...melange(D.theme), ...melange(D.autres)], themes = Math.min(D.theme.length, Math.ceil(places.filter((q) => q[3] === 'terre').length * 0.6));
    const ordre = [...terre.slice(0, themes), ...melange([...terre.slice(themes)])], nage = melange(D.nage || []);
    const [lo, hi] = solo ? [55, 60] : [20, 25];
    places.forEach(([px, py, dir, ou], i) => {
      const P = ou === 'eau' ? nage.shift() : ordre.shift(); if (!P) return;
      // une salle du solo retournée (miroir) : ses dresseurs aussi
      if (S.miroir) { px = S.plan[0].length - 1 - px; dir = { left: 'right', right: 'left' }[dir] || dir; }
      const x = px + 1, y = py + 1, n = 1 + Math.floor(R() * 3);
      const team = Array.from({ length: n }, () => {
        const pool = POKEMON_TEMPLE[el === 'f' && R() < 0.3 ? 'roche' : el][solo ? 'solo' : 'trois'];
        return [pool[Math.floor(R() * pool.length)], lo + Math.floor(R() * (hi - lo + 1))];
      });
      // il tourne la tête vers les cases d'où il voit venir (sur l'eau pour un nageur)
      const libre = (a, b) => { const t = m.get(a, b); return ou === 'eau' ? t === T.WATER && !m.courants?.has(cle(a, b)) : walkable(t); };
      const tourne = Object.entries(DIRS).filter(([, [dx, dy]]) => libre(x + dx, y + dy)).map(([k]) => k);
      m.npc({
        id: `${m.id}:dr${i}`, x, y, dir: tourne.includes(dir) ? dir : tourne[0] || dir, sprite: P.sprite, move: 'static', tourne, nage: ou === 'eau',
        trainer: { cls: P.cls, name: P.nom, team, prize: solo ? 60 : 24, sight: 4, bs: P.bs, ai: 'normal', intro: P.intro, lose: P.lose, after: P.after },
        onWin: (api, n) => this.butinTemple(n),
      });
    });
  },
  /** un combat de dresseur des chemins ? (battu, on se réveille à l'entrée de la salle) */
  dresseurTemple(id) { return typeof id === 'string' && id.startsWith('labo:temple:') && /:dr\d+$/.test(id); },
  perduTemple() { const d = this.defs.get('temple'); if (d) this.taches.push(() => this.defaite(d)); },
  /** le dresseur vaincu donne deux objets différents, tirés au hasard */
  async butinTemple(n) {
    const g = this.game, pris = [], tr = n?.def?.trainer;
    for (let k = 0; k < 2; k++) {
      const reste = BUTIN_TEMPLE.filter(([o]) => !pris.includes(o)), tot = reste.reduce((a, [, p]) => a + p, 0);
      let r = Math.random() * tot;
      for (const [o, p] of reste) { r -= p; if (r <= 0) { pris.push(o); break; } }
      if (pris.length === k) pris.push(reste[reste.length - 1][0]);
    }
    if (tr) {
      const MOTS = ['Tiens, prends mes affaires. Moi, je n\'irai pas plus loin.', 'Tu l\'as mérité. Prends ce que j\'ai, ça te servira plus qu\'à moi.',
        'Bon... Voilà ce que j\'avais sur moi. Fais-en bon usage.', 'Prends ça. Le Gardien ne fera pas de cadeau, lui.', 'Je rentre. Garde mes provisions, tu en auras besoin.',
        'C\'est de bonne guerre. Tiens, mes objets sont à toi.'];
      let h = 0; for (const c of n.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
      await g.ui.say(MOTS[h % MOTS.length], { speaker: `${tr.cls} ${tr.name}` });
    }
    for (const o of pris) g.give(o, 1);
    g.sound.sfx('item');
    await g.ui.say(`${g.state.name} reçoit : ${pris.map((o) => itemName(o)).join(' et ')} !`);
  },
  /** une nouvelle épreuve : les dresseurs d'une branche sont de nouveau là */
  remiseDresseurs(d, branche = 'groupe') {
    const fl = this.game.state?.flags; if (!fl) return;
    for (const s of d.salles.filter((q) => q.branche === branche && q.carte)) for (const k of Object.keys(fl)) if (k.startsWith(`T:${s.carte}:dr`)) delete fl[k];
  },
  /** les dresseurs tournent la tête de temps en temps ; un nageur voit loin sur l'eau */
  tickDresseurs(dt) {
    const g = this.game; if (!g.state || g.busy || !g.mapObj?.id?.startsWith('labo:temple:')) return;
    for (const n of g.npcs) {
      const t = n.def.tourne; if (!t?.length || n.move || g.state.flags['T:' + n.id]) continue;
      n.tourneT = (n.tourneT ?? Math.random() * 2) - dt;
      if (n.tourneT > 0) continue;
      n.tourneT = 1.2 + Math.random() * 2.6;
      n.dir = t[Math.floor(Math.random() * t.length)];
    }
  },
  async regardNageurs() {
    const g = this.game, m = g.mapObj, p = g.player; if (!m?.id?.startsWith('labo:temple:')) return false;
    for (const n of g.npcs) {
      if (!n.def.nage || g.state.flags['T:' + n.id]) continue;
      const [dx, dy] = DIRS[n.dir];
      for (let k = 1; k <= 4; k++) {
        const x = n.x + dx * k, y = n.y + dy * k;
        if (x === p.x && y === p.y) { await g.trainerBattle(n, true); return true; }
        if (m.get(x, y) !== T.WATER || g.npcs.some((q) => q !== n && q.x === x && q.y === y)) break;
      }
    }
    return false;
  },
  /** les deux nageurs n'existent pas dans Odyssée : on les dessine dans deux rangées libres de la planche */
  spritesTemple() {
    const g = this.game, v = g.view; if (!v?.pairSprite || this.nageursPrets === 'ok') return;
    if (!this.nageursImg) {
      this.nageursImg = 'charge';
      const im = new Image(); im.onload = () => { this.nageursImg = im; }; im.src = new URL('../../img/temple/nageurs.png', import.meta.url).href;
      return;
    }
    if (this.nageursImg === 'charge') return;
    ['labo_nageur', 'labo_nageuse'].forEach((k, i) => {
      const key = v.pairSprite(k, () => { const c = document.createElement('canvas'); c.width = 768; c.height = 64; c.getContext('2d').drawImage(this.nageursImg, 0, i * 64, 768, 64, 0, 0, 768, 64); return c; });
      if (key) { CHAR_ROWS[k] = CHAR_ROWS[key]; const e = v.pairs.get(k); if (e) e.t = Infinity; }
    });
    if (CHAR_ROWS.labo_nageur != null && CHAR_ROWS.labo_nageuse != null) this.nageursPrets = 'ok';
  },
  /* ---------------- la Carte du Temple (solo) ---------------- */
  /** vue d'ensemble des salles du solo, puis le squelette de chacune : entrées, sorties, passages secrets, rien d'autre */
  async carteTemple(d) {
    const g = this.game, ui = g.ui, ids = ['s2', 'sf1', 'sf2', 'sf3', 'se1', 'se2', 'se3', 'se4', 'sp1', 'sp2', 'sp3', 's4'];
    const salles = ids.map((id) => d.salles.find((s) => s.id === id));
    let vue = salles.find((s) => g.world.maps[s.carte] === g.mapObj) || null;
    const box = el('div', 'box mine-plan'); ui.root.appendChild(box);
    const titre = el('div', 'mine-titre'), cv = document.createElement('canvas'); box.append(titre, cv);
    const dessiner = () => (vue ? this.dessinerSalleTemple(d, vue, cv, titre) : this.dessinerEnsembleTemple(d, salles, cv, titre));
    dessiner(); const iv = setInterval(dessiner, 300);
    try {
      for (;;) {
        const items = [{ label: 'Vue d\'ensemble' }, ...salles.map((s) => ({ label: `${s.chemin ? d.voies[s.chemin] + ' · ' : ''}${s.nom}` })), { label: 'Ranger la carte' }];
        const k = await ui.list({ title: 'Carte du Temple', items, cls: 'shop mine-menu', cancel: items.length - 1, start: vue ? salles.indexOf(vue) + 1 : 0 });
        if (k < 0 || k >= items.length - 1) return;
        vue = k === 0 ? null : salles[k - 1]; g.sound.sfx('select'); dessiner();
      }
    } finally { clearInterval(iv); box.remove(); }
  },
  /** les salles en trois colonnes (Feu, Eau, Plante), les sorties, et les passages secrets en pointillés */
  dessinerEnsembleTemple(d, salles, cv, titre) {
    const g = this.game, W = 420, H = 330; if (cv.width !== W) { cv.width = W; cv.height = H; }
    const x = cv.getContext('2d'), COL = { f: 70, e: 210, p: 350 }, COUL = { f: '#c8502c', e: '#3c82d2', p: '#4a9a44' };
    x.fillStyle = '#1a140e'; x.fillRect(0, 0, W, H);
    const pos = (s) => s.id === 's2' ? [210, 305] : s.id === 's4' ? [210, 25] : [COL[s.chemin], 285 - Number(s.id[2]) * 58];
    const trait = (a, b, pointilles, coul) => { x.save(); x.strokeStyle = coul; x.lineWidth = 2; if (pointilles) x.setLineDash([5, 4]); x.beginPath(); x.moveTo(...a); x.lineTo(...b); x.stroke(); x.restore(); };
    for (const s of salles) {
      if (!s.chemin) continue;
      const n = Number(s.id[2]), avant = n === 1 ? salles[0] : salles.find((q) => q.id === s.id.slice(0, 2) + (n - 1));
      trait(pos(avant), pos(s), false, '#8a7a60');
      if (s.cle) trait(pos(s), pos(salles[salles.length - 1]), false, '#8a7a60');
      for (const B of s.bouches || []) { const s2 = salles.find((q) => q.id === B.vers); if (s2.id[2] > s.id[2]) trait(pos(s), pos(s2), true, '#b070d0'); }
    }
    for (const s of salles) {
      const [cx, cy] = pos(s), ici = g.world.maps[s.carte] === g.mapObj;
      x.fillStyle = s.chemin ? COUL[s.chemin] : '#8a7a60'; x.fillRect(cx - 52, cy - 14, 104, 28);
      x.strokeStyle = ici ? '#fff' : '#000'; x.lineWidth = ici ? 3 : 1.5; x.strokeRect(cx - 52, cy - 14, 104, 28);
      x.fillStyle = '#fff'; x.font = 'bold 10px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(s.nom, cx, cy);
    }
    titre.innerHTML = `<b>Temple des Éléments</b> · <span class="mine-leg"><i style="background:#8a7a60"></i>sortie <i style="background:#b070d0"></i>passage secret <i style="background:#fff"></i>toi</span>`;
  },
  /** une salle, en gros : le sol, l'eau, les murs ; l'entrée, la sortie, les passages secrets, et toi */
  dessinerSalleTemple(d, s, cv, titre) {
    const g = this.game, P = s.plan, H = P.length, W = P[0].length, Z = Math.max(3, Math.floor(480 / W));
    if (cv.width !== W * Z) { cv.width = W * Z; cv.height = H * Z; }
    const x = cv.getContext('2d'), mur = (c) => '#YuL%&'.includes(c) || c === undefined, eau = (c) => '~<>()E'.includes(c);
    x.fillStyle = '#1a140e'; x.fillRect(0, 0, cv.width, cv.height);
    // par blocs de 2 × 2 : le squelette, sans le détail (ni clé, ni rocher, ni arbuste)
    for (let j = 0; j < H; j += 2) for (let i = 0; i < W; i += 2) {
      const c4 = [P[j]?.[i], P[j]?.[i + 1], P[j + 1]?.[i], P[j + 1]?.[i + 1]], ouvert = c4.filter((c) => c && !mur(c));
      if (ouvert.length < 2) continue;
      x.fillStyle = ouvert.filter(eau).length * 2 >= ouvert.length ? '#3c6ea8' : '#b8a27c';
      x.fillRect(i * Z, j * Z, 2 * Z, 2 * Z);
    }
    const marque = (i, j, coul, txt) => {
      x.fillStyle = coul; x.fillRect(i * Z - Z, j * Z - Z, Z * 3, Z * 3); x.strokeStyle = '#000'; x.lineWidth = 1; x.strokeRect(i * Z - Z, j * Z - Z, Z * 3, Z * 3);
      if (!txt) return;
      x.font = 'bold 11px sans-serif'; x.textBaseline = 'middle'; x.textAlign = i > W / 2 ? 'right' : 'left';
      const tx = i > W / 2 ? i * Z - Z - 3 : i * Z + 2 * Z + 3;
      x.strokeStyle = '#000'; x.lineWidth = 3; x.strokeText(txt, tx, j * Z + Z / 2); x.fillStyle = '#fff'; x.fillText(txt, tx, j * Z + Z / 2);
    };
    const nomDe = (id) => d.salles.find((q) => q.id === id)?.nom || '';
    P.forEach((r, j) => [...r].forEach((c, i) => {
      if (c === 'S' && s.id !== 's2') marque(i, j, '#e8c840', 'entrée');
      else if (c === 'N') marque(i, j, '#e0a040', 'sortie');
    }));
    for (const B of s.bouches || []) marque(B.x, B.y, '#b070d0', `→ ${nomDe(B.vers)}`);
    const m = g.world.maps[s.carte];
    if (g.mapObj === m) { x.fillStyle = '#fff'; x.beginPath(); x.arc((g.player.x - 1) * Z + Z / 2, (g.player.y - 1) * Z + Z / 2, Z * 1.2, 0, 7); x.fill(); x.strokeStyle = '#000'; x.lineWidth = 2; x.stroke(); }
    titre.innerHTML = `<b>${esc(s.nom)}</b>${s.chemin ? ` · chemin ${esc(d.voiesDe[s.chemin] + d.voies[s.chemin])}` : ''} · <span class="mine-leg"><i style="background:#e8c840"></i>entrée <i style="background:#e0a040"></i>sortie <i style="background:#b070d0"></i>passage <i style="background:#fff"></i>toi</span>`;
  },
  salleTemple(d, m = this.game.mapObj) { return m && d.salles.find((s) => s.carte === m.id); },
  dt(d, sid) { return this.etats[d.id].salles[sid].donnees || {}; },
  /** la branche où l'on est : 'groupe', 'solo', ou rien (la salle des dalles) */
  brancheIci(d) { return this.salleTemple(d)?.branche || null; },

  /** le décor suit l'état : clés ramassées, porte aux trois gemmes */
  appliquerTemple(d) {
    if (!estTemple(d)) return;
    const g = this.game, e = this.etats[d.id];
    for (const s of d.salles) {
      const m = g.world.maps[s.carte]; if (!m) continue;
      const P = m.donjon.plan, D = this.dt(d, s.id);
      if (s.cle && P.objets.K) {
        const [x, y] = P.objets.K[0], pris = D[`cle:${this.moi}`] || (s.branche === 'groupe' && Object.keys(D).some((k) => k.startsWith('cle:')));
        this.decoSol(m, x, y, pris ? null : IMG_CLE[s.cle]);
      }
      if (P.objets.Q) P.objets.Q.forEach(([x, y], i) => this.decor(m, x, y, D.porte ? null : i === 1 ? 'porte_grande' : 'porte_vide'));
      // la porte ouverte, la carte se redessine en entier : le passage derrière elle était caché par la porte
      if (P.objets.Q && P.suivante && g.mapObj === m && (this.porteVue ||= {})[m.id] !== !!D.porte) { this.porteVue[m.id] = !!D.porte; if (D.porte) g.setMap(m.id); }
    }
    // les Poké Balls déjà données disparaissent de la table
    for (const s of d.salles.filter((q) => q.table)) {
      const m = g.world.maps[s.carte], P = m.donjon.plan, D = this.dt(d, s.id), A = D.attrib || {};
      for (const [c, l] of Object.entries(P.objets)) {
        const o = d.objets[c]; if (o.type !== 'starter' && o.type !== 'ct') continue;
        const vide = o.type === 'starter' ? Object.values(A).includes(o.n) : D[`ct:${this.moi}`] === this.ctDe(d, o.n);
        for (const [x, y] of l) { const dd = m.deco.find((q) => q.x === x && q.y === y && q.k === 'counter'); if (dd && dd.ball === vide) { dd.ball = !vide; if (g.mapObj === m) g.view.rebuildAt(x, y); } }
      }
    }
    // le compagnon attribué à la table : on le reçoit une fois par descente
    const g5 = d.salles.find((s) => s.table === 'starters'), A = this.dt(d, g5.id).attrib || {};
    if (A[this.moi] != null && this.recuTemple !== `${e.run}`) {
      this.recuTemple = `${e.run}`;
      this.taches.push(() => this.recevoirStarter(d, A[this.moi]));
    }
  },

  /** après un pas : dalle d'or, clé ; en solo, la grille de la salle d'avant s'ouvre quand on arrive dans une deuxième salle */
  async apresPasTemple() {
    const g = this.game, d = this.defs.get('temple'); if (!d || !this.estDans(d) || g.busy) return;
    const m = g.mapObj, P = m.donjon?.plan, p = g.player, s = this.salleTemple(d); if (!P || !s) return;
    const ici = (c) => P.objets[c]?.some(([x, y]) => x === p.x && y === p.y);
    g.busy = true;
    try {
      if (await this.regardNageurs()) return;
      if (p.surf && m.courants?.has(cle(p.x, p.y))) await this.courant(m);
      else if (ici('X')) await this.dalleOr(d, m);
      else if (ici('K') && s.cle) await this.ramasserCle(d, s);
      if (s.branche === 'solo' && s.chemin && s.id[2] === '2' && !g.state.flags[`TS:verrou:${s.id.slice(0, 2)}1`]) {
        const s1 = d.salles.find((q) => q.id === s.id.slice(0, 2) + '1');
        g.state.flags[`TS:verrou:${s1.id}`] = true; this.syncSolo(d, g.world.maps[s1.carte]);
        g.sound.sfx('door'); await g.ui.say('Derrière toi, une lourde grille de pierre se lève. Le chemin vers la salle d\'avant est ouvert.');
      }
    } finally { g.busy = false; }
  },

  /* ---------------- salle des dalles : la dalle d'or et la grande porte ---------------- */
  async dalleOr(d, m) {
    const g = this.game, ui = g.ui;
    if (this.grandeOuverte === m.id) return;
    this.resetSolo(d);
    g.sound.sfx('badge'); g.view.shake = 0.25;
    this.grandePorte(d, m, true);
    await ui.say(['La dalle d\'or s\'illumine !', 'La grande porte s\'ouvre... pour toi seul. Elle se refermera derrière toi.']);
    if (!g.state.bag[CARTE_TEMPLE]) { g.give(CARTE_TEMPLE, 1); g.sound.sfx('item'); await ui.say([`Au pied de la porte, un vieux parchemin : la Carte du Temple.`, `${g.state.name} range la Carte du Temple dans le Sac. Les trois chemins y sont dessinés, et les passages qui les relient.`]); }
  },
  /** la grande porte, ouverte pour ce joueur seulement : sa case du milieu mène au temple en solo */
  grandePorte(d, m, ouvert) {
    const g = this.game, [x, y] = m.donjon.plan.objets.G[1], k = cle(x, y);
    this.decor(m, x, y, ouvert ? 'porte_grande_o' : 'porte_grande');
    if (ouvert) {
      const s2 = d.salles.find((q) => q.id === 's2'), cm = g.world.maps[s2.carte], [sx, sy] = cm.donjon.plan.depart;
      m.set(x, y, T.CAVEDOOR); m.warp(x, y, { map: cm.id, x: sx, y: sy, dir: 'up' });
      this.grandeOuverte = m.id;
    } else { m.warps.delete(k); this.grandeOuverte = null; }
    if (g.mapObj === m) g.view.rebuildAt(x, y);
  },

  /* ---------------- chemins : clés, portes du solo ---------------- */
  async ramasserCle(d, s) {
    const g = this.game, D = this.dt(d, s.id);
    if (D[`cle:${this.moi}`] || (s.branche === 'groupe' && Object.keys(D).some((k) => k.startsWith('cle:')))) return;
    const r = await this.demande(d.id, { a: 'maj', salle: s.id, donnees: { [`cle:${this.moi}`]: true } });
    if (!r.ok) { await g.ui.say('L\'hôte du salon ne répond pas...'); return; }
    g.sound.sfx('item');
    await g.ui.say(`${g.state.name} ramasse la ${NOM_CLE[s.cle]} !\nElle ouvre la porte de la Salle des Clés.`);
  },
  /** les clés de ce joueur, dans sa branche : f, e, p */
  mesCles(d, branche) { return d.salles.filter((s) => s.cle && s.branche === branche && this.dt(d, s.id)[`cle:${this.moi}`]).map((s) => s.cle); },
  async porteCles(d, s) {
    const g = this.game, ui = g.ui, D = this.dt(d, s.id);
    if (D.porte) return;
    const miennes = this.mesCles(d, s.branche).filter((c) => !D[`ins:${c}`]);
    const poser = Object.fromEntries(miennes.map((c) => [`ins:${c}`, this.moi]));
    const apres = { ...D, ...poser }, n = ['f', 'e', 'p'].filter((c) => apres[`ins:${c}`]).length;
    // mode test, seul dans le temple à trois : on retourne prendre un autre chemin
    const retourTest = async () => {
      if (!g.modeTest || s.branche !== 'groupe' || !(await ui.yesNo('Mode test : retourner à la Salle des Trois Portes pour prendre un autre chemin ?'))) return;
      const cm = g.world.maps[d.salles.find((q) => q.id === 'g2').carte], [x, y] = cm.donjon.plan.depart;
      await g.warp({ map: cm.id, x, y, dir: 'up' }, 'exit');
    };
    if (!miennes.length) { await ui.say(n ? `Une grande porte à trois serrures. ${n}/3 clés y sont déjà.` : 'Une grande porte à trois serrures : feu, eau et plante. Il faut les trois clés des chemins.'); await retourTest(); return; }
    if (n === 3) poser.porte = true;
    const r = await this.demande(d.id, { a: 'maj', salle: s.id, donnees: poser });
    if (!r.ok) { await ui.say('L\'hôte du salon ne répond pas...'); return; }
    g.sound.sfx('bang');
    await ui.say(`${g.state.name} met ${miennes.map((c) => `la ${NOM_CLE[c]}`).join(', ')} dans ${miennes.length > 1 ? 'les serrures' : 'sa serrure'}.${poser.porte ? '\nLes trois gemmes s\'illuminent : la porte s\'ouvre !' : `\n${n}/3 clés.`}`);
    if (!poser.porte) await retourTest();
  },
  async porteSolo(d, o) {
    const g = this.game, ui = g.ui, nom = d.voies[o.chemin];
    await ui.say(d.inscriptions[o.chemin]);
    if (!(await ui.yesNo(`Franchir la Porte ${d.voiesDe[o.chemin]}${nom} ?`))) return;
    const cible = d.salles.find((q) => q.branche === 'solo' && q.chemin === o.chemin), cm = g.world.maps[cible.carte], [x, y] = cm.donjon.plan.depart;
    g.sound.sfx('bang');
    await g.warp({ map: cm.id, x, y, dir: 'up' }, 'door');
  },

  async objetTemple(d, m, c, x, y) {
    const o = d.objets[c], s = this.salleTemple(d, m), g = this.game;
    switch (o.type) {
      case 'grandePorte': return g.ui.say(this.grandeOuverte === m.id ? 'La grande porte est ouverte.' : ['Une grande porte, ornée de trois gemmes.', 'Elle ne s\'ouvre que pour qui marche sur la dalle d\'or.']);
      case 'porteHall': return o.moine ? this.moineTemple(d) : this.versSalle(d, o.vers);
      case 'arbuste': return this.couperArbuste(d, m, c, x, y);
      case 'ronces': return g.ui.say(`D'épaisses ronces à fleurs ${o.couleur}. Elles viennent d'un arbuste, pas loin d'ici.`);
      case 'porteSolo': return this.porteSolo(d, o);
      case 'porteCles': return this.porteCles(d, s);
      case 'starter': return this.balleStarter(d, s, o.n);
      case 'ct': return this.prendreCt(d, s, o.n);
    }
  },

  /* ---------------- le hall ---------------- */
  async versSalle(d, sid) {
    const g = this.game, cm = g.world.maps[d.salles.find((q) => q.id === sid).carte], [x, y] = cm.donjon.plan.depart;
    g.sound.sfx('bang');
    await g.warp({ map: cm.id, x, y, dir: 'up' }, 'door');
  },
  /** le moine du hall : dix badges pour le temple en solo (dans le labo, on peut passer quand même pour tester) */
  async moineTemple(d) {
    const g = this.game, ui = g.ui, sp = { speaker: 'Moine' }, n = (g.state.badges || []).filter(Boolean).length;
    if (n >= d.badgesSolo) { await ui.say(`${d.badgesSolo} badges... Tu es digne de l'épreuve. Entre, et que les éléments te soient cléments.`, sp); return this.versSalle(d, 'eo'); }
    await ui.say(['Halte. Derrière cette porte, l\'épreuve ne pardonne pas.', `Reviens me voir quand tu auras ${d.badgesSolo} badges.`], sp);
    if (await ui.yesNo(`Labo : tu as ${n} badge${n > 1 ? 's' : ''}. Entrer quand même pour tester le temple en solo ?`)) return this.versSalle(d, 'eo');
  },

  /* ---------------- le Talisman des Éléments (temple à trois) ---------------- */
  /** le moine de la Salle des Dalles prête le talisman (Coupe, Force, Éclate-Roc et Surf, sans CS ni badge) et un sac de
   *  quête : le sac habituel reste à l'entrée, on n'a plus que ce qu'on trouve dans le temple */
  async talismanTemple(d) {
    const g = this.game, ui = g.ui, sp = { speaker: 'Moine' }, st = g.state;
    if (st.sacNormal) { await ui.say(st.bag[TALISMAN] ? ['Garde bien le Talisman des Éléments.', 'Ses trois pierres tranchent les arbustes, poussent les rochers, brisent la roche et portent sur l\'eau.'] : 'Le Gardien a repris le Talisman. Ton sac t\'attend à la sortie du temple.', sp); return; }
    await ui.say(['Les chemins du temple ne s\'ouvrent pas à mains nues.', 'Prends ce Talisman des Éléments. Grâce à lui, tes Pokémon pourront couper les arbustes, pousser les rochers, briser la roche fissurée et surfer, même sans les CS ni les badges.',
      'Ton sac, laisse-le ici. Dans le temple, on ne compte que sur ce qu\'on y trouve. Voici un sac de quête, vide.', 'Tu me rendras le Talisman... enfin, tu le rendras au Gardien, quand tu l\'auras vaincu.'], sp);
    st.sacNormal = st.bag; st.bag = {};
    g.give('sac-quete', 1); g.give(TALISMAN, 1); g.sound.sfx('item');
    // une nouvelle épreuve : les dresseurs des chemins sont là de nouveau
    this.remiseDresseurs?.(d);
    await ui.say([`${st.name} laisse son sac au moine.`, `${st.name} reçoit le Talisman des Éléments et un Sac de Quête !`]);
  },
  /** le talisman se rend au Gardien après sa défaite ; en quittant le temple, on perd le sac de quête et l'on reprend le sien */
  tickTalisman(d) {
    const g = this.game, st = g.state; if (!st || g.busy || this.talismanRendu) return;
    const id = g.mapObj?.id || '', dehors = id === d.carte + ':dehors' || (id !== d.carte && !id.startsWith(d.carte + ':'));
    if (dehors) {
      if (st.bag?.[CARTE_TEMPLE]) delete st.bag[CARTE_TEMPLE];
      if (st.sacNormal) { st.bag = st.sacNormal; delete st.sacNormal; g.ui.toast?.('Tu laisses le Sac de Quête au temple et tu reprends ton sac.', 2600); }
      else if (st.bag?.[TALISMAN]) { delete st.bag[TALISMAN]; g.ui.toast?.('Le Talisman des Éléments retourne au temple.', 2200); }
      return;
    }
    if (!st.bag?.[TALISMAN]) return;
    const g5 = d.salles.find((q) => q.table === 'starters'), ici = g.mapObj?.id === g5.carte;
    if (ici && this.vaincu(d, 'M')) {
      this.talismanRendu = true;
      this.taches.push(async () => {
        try { delete st.bag[TALISMAN]; g.sound.sfx('item'); await g.ui.say(['Le Gardien tend la main.', `${st.name} rend le Talisman des Éléments.`], { speaker: 'Gardien des Éléments' }); }
        finally { this.talismanRendu = false; }
      });
    }
  },
  /** le Gardien battu : il invite à choisir sur la table ; une fois la récompense prise, il ramène au Grand Hall */
  async resteGardien(d, k) {
    const g = this.game, ui = g.ui, p = d.pnj[k], sp = { speaker: `${p.cls} ${p.nom}`.trim() };
    const s = d.salles.find((q) => q.pnj?.includes(k)), D = this.dt(d, s.id);
    const pris = s.table === 'starters' ? (D.attrib || {})[this.moi] != null : !!D[`ct:${this.moi}`];
    if (!pris) { await ui.say(p.reste, sp); return; }
    await ui.say(p.retour, sp);
    const h = g.world.maps[d.salles[0].carte], [x, y] = h.donjon.plan.depart;
    g.sound.sfx('heal');
    await g.warp({ map: h.id, x, y: y - 1, dir: 'up' }, 'exit');
  },

  /* ---------------- chemin de l'Eau : les rivières ---------------- */
  /** le courant emporte le surfeur jusqu'à la fin de la rivière (ou jusqu'à un obstacle) */
  async courant(m) {
    const g = this.game, p = g.player;
    for (let k = 0; k < 400; k++) {
      const dir = m.courants.get(cle(p.x, p.y)); if (!dir || !p.surf) break;
      const [dx, dy] = DIRS[dir], tx = p.x + dx, ty = p.y + dy;
      if (!m.in(tx, ty) || m.get(tx, ty) !== T.WATER || g.occupied(tx, ty)) break;
      p.dir = dir; p.walking = true;
      p.move = { fx: p.x, fy: p.y, tx, ty, t: 0, dur: 0.09, scripted: true };
      while (p.move) await attendre(16);
    }
    p.walking = false;
  },

  /* ---------------- chemin de la Plante : arbustes et ronces ---------------- */
  async couperArbuste(d, m, c, x, y) {
    const g = this.game, ui = g.ui, o = d.objets[c], f = `TPB:${m.id}:${c}`;
    if (g.state.flags[f]) return;
    await ui.say(`Un arbuste couvert de fleurs ${o.couleur}. De grosses ronces en partent et s'enfoncent sous la haie.`);
    if (!(await ui.yesNo('Le couper ?'))) return;
    g.state.flags[f] = true;
    g.sound.sfx('cut'); g.view.shake = 0.12;
    this.syncVegetal(d, m);
    await ui.say(`${g.state.name} coupe l'arbuste. Pas loin de là, ses ronces se dessèchent et tombent !`);
  },
  /** arbustes coupés et ronces tombées, d'après ce que le joueur a déjà fait */
  syncVegetal(d, m) {
    const g = this.game, P = m.donjon.plan, fl = g.state?.flags || {};
    const maj = (x, y, ferme, k) => {
      const c = cle(x, y), etait = m.get(x, y) === T.BLOCK;
      if (ferme === etait) return;
      if (ferme) fermer(m, x, y, k); else ouvrir(m, x, y);
      if (g.mapObj === m) { const dd = m.deco.find((q) => q.x === x && q.y === y); if (dd) g.view.decoAt.set(c, dd); else g.view.decoAt.delete(c); g.view.rebuildAt(x, y); }
    };
    for (const [c, l] of Object.entries(P.objets)) {
      const o = d.objets[c]; if (o.type !== 'arbuste') continue;
      const coupe = !!fl[`TPB:${m.id}:${c}`];
      for (const [x, y] of l) maj(x, y, !coupe, o.decor);
      for (const [x, y] of P.objets[o.ouvre] || []) maj(x, y, !coupe, d.objets[o.ouvre].decor);
    }
  },

  /* ---------------- le solo : passages entre les chemins, objets, verrous ---------------- */
  /** case libre à côté d'un recoin : là où l'on arrive par un passage */
  pres(m, [x, y]) {
    for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) if (m.in(x + dx, y + dy) && walkable(m.get(x + dx, y + dy)) && !m.objectAt?.(x + dx, y + dy)) return [x + dx, y + dy];
    for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) if (m.in(x + dx, y + dy) && walkable(m.get(x + dx, y + dy))) return [x + dx, y + dy];
    return m.donjon.plan.depart;
  },
  /** un recoin du solo suit ce que le joueur a fait : objet pris, liane déroulée… */
  syncSolo(d, m) {
    const g = this.game, S = d.salles.find((q) => q.carte === m.id), P = m.donjon.plan, fl = g.state?.flags || {};
    const maj = (x, y, k) => {
      const c = cle(x, y), dd0 = m.deco.find((q) => q.x === x && q.y === y);
      if ((dd0?.k || null) === k && (m.get(x, y) === T.BLOCK) === !!k) return;
      ouvrir(m, x, y); if (k) fermer(m, x, y, k);
      if (g.mapObj === m) { const dd = m.deco.find((q) => q.x === x && q.y === y); if (dd) g.view.decoAt.set(c, dd); else g.view.decoAt.delete(c); g.view.rebuildAt(x, y); }
    };
    for (const [c, R] of Object.entries(S.recoins || {})) {
      const [x, y] = P.objets[c][0];
      if (R.type === 'objet') maj(x, y, fl[`TS:objet:${R.objet}`] ? null : d.tresors[R.objet].decor);
    }
    if (S.verrou) { const [vx, vy] = devantSortie(P); maj(vx, vy, fl[`TS:verrou:${S.id}`] ? null : DECOR_VERROU[S.verrou.type]); }
    for (const B of S.bouches || []) if (B.verrou) maj(B.garde[0] + 1, B.garde[1] + 1, fl[`TS:verrou:${S.id}:passage`] ? null : DECOR_VERROU[B.verrou.type]);
    this.syncVegetal(d, m);
  },
  /** nouvelle descente en solo : tout revient comme au début */
  resetSolo(d) {
    const g = this.game, st = g.state;
    for (const k of Object.keys(st.flags)) if (k.startsWith('TS:')) delete st.flags[k];
    for (const k of Object.values(SAC)) delete st.bag[k];
    this.remiseDresseurs(d, 'solo');
    for (const s of d.salles.filter((q) => q.branche === 'solo' && q.carte)) {
      for (const k of Object.keys(st.flags)) if (k.startsWith(`TPB:${s.carte}:`)) delete st.flags[k];
      delete st.tiles?.[s.carte];
      this.syncSolo(d, g.world.maps[s.carte]);
    }
  },
  async recoinTemple(d, S, c) {
    const g = this.game, ui = g.ui, st = g.state, fl = st.flags, R = S.recoins[c], m = g.world.maps[S.carte];
    if (R.type !== 'objet') return;
    const tr = d.tresors[R.objet]; if (fl[`TS:objet:${R.objet}`]) return;
    await ui.say(tr.vu);
    fl[`TS:objet:${R.objet}`] = true; g.give(tr.objet, 1); g.sound.sfx('item'); this.syncSolo(d, m);
    await ui.say([`${st.name} trouve : ${itemName(tr.objet)} !`, ITEMS_DESC(tr.objet)]);
  },
  /** un verrou du solo : la sortie d'une salle (S.verrou), ou l'obstacle devant un passage secret */
  async verrouTemple(d, S, V = S.verrou, k = S.id) {
    const g = this.game, ui = g.ui, st = g.state, fl = st.flags, m = g.world.maps[S.carte];
    if (fl[`TS:verrou:${k}`]) return;
    if (V.type === 'grille') { await ui.say(['Une lourde grille de pierre ferme la sortie.', 'Elle ne bouge pas d\'un pouce. On dirait qu\'elle se manœuvre de l\'autre côté.']); return; }
    const T_ = {
      ronces: { vu: ['Des ronces géantes, épaisses comme le bras, ferment le passage.', 'Aucune lame n\'en viendrait à bout. Le feu, peut-être...'], q: 'Approcher la Braise Éternelle ?', fait: 'Les ronces s\'embrasent d\'un coup et tombent en cendres. La voie est libre !' },
      vapeur: { vu: ['Une vapeur brûlante jaillit d\'une fissure, juste devant le creux. Impossible de passer.', 'Il faudrait boucher la fissure... avec quelque chose qui pousse vite ?'], q: 'Planter la Graine Géante dans la fissure ?', fait: 'La graine germe aussitôt. Ses racines bouchent la fissure, et la vapeur s\'éteint. La voie est libre !' },
      flammes: { vu: ['Un mur de flammes barre le tunnel. Il ne faiblit jamais.', 'Une eau ordinaire s\'évaporerait avant de le toucher...'], q: 'Verser la Fiole d\'Eau Pure sur les flammes ?', fait: 'L\'eau pure étouffe les flammes dans un nuage de vapeur. La voie est libre !' },
      glace: { vu: ['Un mur de glace bouche la sortie. Il est froid comme au fond d\'un lac.', 'Rien ici n\'est assez chaud pour le faire fondre...'], q: 'Poser la Pierre Ardente contre la glace ?', fait: 'La glace fond en sifflant et s\'écoule dans les bassins. La voie est libre !' },
      arbre: { vu: ['Un grand arbre mort, tordu, barre la sortie de ses branches sèches.', 'Il a l\'air d\'avoir eu soif pendant très longtemps.'], q: 'Verser la Rosée Éternelle au pied de l\'arbre ?', fait: 'L\'arbre reverdit d\'un coup et relève ses branches. La voie est libre !' },
      gouffre: { vu: ['Un gouffre s\'ouvre devant la sortie. Tout au fond, la lave rougeoie.', 'Pas moyen de sauter par-dessus. Avec une corde, peut-être...'], q: 'Lancer la Corde de Liane par-dessus le gouffre ?', fait: 'La liane s\'accroche de l\'autre côté et se tend comme un pont. La voie est libre !' },
    }[V.type];
    await ui.say(T_.vu);
    if (!fl[`TS:objet:${V.objet}`]) return;
    if (!(await ui.yesNo(T_.q))) return;
    fl[`TS:verrou:${k}`] = true; delete st.bag[SAC[V.objet]];
    g.sound.sfx('badge'); g.view.shake = 0.25; this.syncSolo(d, m);
    await ui.say(T_.fait);
  },

  /* ---------------- la table, à trois ---------------- */
  /** l'image d'un Pokémon par-dessus l'écran, le temps d'une question */
  montrer(sp) {
    const S = SPECIES[sp], pic = el('div', 'box starter-pic');
    pic.innerHTML = `<img src="${ASSETS.front(sp)}" alt=""><div class="temple-nom">${esc(S.n)}<small>${S.t.map((t) => TYPE_FR[t] || t).join(' / ')}</small></div>`;
    this.game.ui.root.appendChild(pic);
    this.game.sound.cry(ASSETS.cry(sp));
    return pic;
  },
  async balleStarter(d, s, n) {
    const g = this.game, ui = g.ui, e = this.etats[d.id], S = e.salles[s.id], D = S.donnees;
    if (!S.faite) { await ui.say('Le Gardien veille encore sur la table.'); return; }
    const A = D.attrib || {}, C = D.choix || {}, sp = STARTERS_TEMPLE[n], nom = SPECIES[sp].n;
    if (A[this.moi] != null) { await ui.say(A[this.moi] === n ? `La Poké Ball de ${nom} est vide : c'est ton compagnon.` : 'Tu as déjà ton compagnon.'); return; }
    const pris = Object.keys(A).find((q) => A[q] === n);
    if (pris) { await ui.say(`Cette Poké Ball est vide : ${this.nomDe(pris)} a reçu ${nom}.`); return; }
    if (D.duel) { await ui.say('Un duel est en cours pour départager deux choix.'); return; }
    const autres = Object.keys(C).filter((q) => C[q] === n && q !== this.moi).map((q) => this.nomDe(q));
    const pic = this.montrer(sp);
    try {
      const txt = `Dans cette Poké Ball : ${nom}.${autres.length ? `\n${autres.join(' et ')} l${autres.length > 1 ? 'e veulent' : 'e veut'} aussi.` : ''}`;
      const opts = C[this.moi] === n ? ['Changer d\'avis', 'La garder'] : ['Choisir ce Pokémon', 'Reposer la Poké Ball'];
      const r = await ui.ask(txt, opts);
      if (C[this.moi] === n ? r !== 0 : r !== 0) return;
      const res = await this.demande(d.id, { a: 'choixStarter', salle: s.id, n: C[this.moi] === n ? null : n });
      if (!res.ok) { await ui.say(res.why === 'exclu' ? 'Tu as perdu le duel pour ce Pokémon : choisis-en un autre.' : res.why === 'pris' ? 'Trop tard, il vient d\'être attribué.' : res.why === 'reseau' ? 'L\'hôte du salon ne répond pas...' : '...'); return; }
    } finally { pic.remove(); }
    if (C[this.moi] !== n) await ui.say(`Tu as choisi ${nom}. Quand tout le monde aura choisi, chacun reçoit le sien. Deux joueurs qui veulent le même se départagent en duel.`);
  },
  /** l'hôte : chaque demi-seconde, attribue les Poké Balls ou lance un duel */
  verifierStarters(d) {
    const s = d.salles.find((q) => q.table === 'starters'), S = this.etats[d.id].salles[s.id];
    if (!S.faite) return;
    const presents = this.presentsIds(d, s), D = S.donnees;
    // un duelliste est parti : l'autre gagne
    if (D.duel && D.duel.ids.some((q) => !presents.includes(q))) { this.traiter(d.id, this.moi, { a: 'starterDuelFin', salle: s.id, gagnant: D.duel.ids.find((q) => presents.includes(q)) || null }); return; }
    const r = resoudreStarters(D, presents, () => (Math.random() * 2 ** 32) >>> 0);
    if (!r) return;
    this.traiter(d.id, this.moi, { a: 'maj', salle: s.id, donnees: r });
    if (r.duel) for (const q of r.duel.ids) {
      const msg = { t: 'djTemple', d: d.id, salle: s.id, ...r.duel };
      if (q === this.moi) setTimeout(() => this.recevoirTemple(msg), 0); else this.H?.send(q, msg);
    }
  },
  recevoirTemple(m) { const d = this.defs.get(m.d); if (d) this.taches.push(() => this.duelTemple(d, m)); },
  async duelTemple(d, m) {
    const g = this.game, ui = g.ui, adv = m.ids.find((q) => q !== this.moi), nom = SPECIES[STARTERS_TEMPLE[m.n]].n;
    for (const q of g.state.party) healFull(q);
    await ui.say([`${this.nomDe(adv)} veut aussi ${nom} !`, 'Vos Pokémon sont soignés : un duel va vous départager.']);
    const res = await this.duelPyr({ ...m, salle: `temple-${m.salle}` });
    const gagnant = res === 'win' ? this.moi : res === 'lose' ? adv : m.ids[0];
    await this.demande(d.id, { a: 'starterDuelFin', salle: m.salle, gagnant });
    for (const q of g.state.party) healFull(q);
    await ui.say(gagnant === this.moi ? `Tu remportes le duel : ${nom} est pour toi.` : `${this.nomDe(adv)} remporte le duel. Choisis une autre Poké Ball.`);
  },
  async recevoirStarter(d, n) {
    const g = this.game, ui = g.ui, sp = STARTERS_TEMPLE[n];
    g.sound.play('victory');
    await ui.say(`Tout le monde est d'accord : ${SPECIES[sp].n} est ton compagnon !`);
    await g.api().giveMon(sp, NIVEAU_STARTER, { met: d.nom });
    await this.trophee(d);
  },

  /* ---------------- la table, en solo : trois CT ---------------- */
  ctDe(d, n) { return d.cts[d.ctsChoix || 'fin'][n]; },
  async prendreCt(d, s, n) {
    const g = this.game, ui = g.ui, e = this.etats[d.id], D = this.dt(d, s.id), objet = this.ctDe(d, n);
    if (!battu(e, d, 'Z')) { await ui.say('Le Gardien veille encore sur la table.'); return; }
    const deja = D[`ct:${this.moi}`];
    if (deja) { await ui.say(deja === objet ? 'Son socle est vide : tu l\'as prise.' : `Elle ne bouge plus de son socle : tu as déjà pris la ${itemName(deja)}.`); return; }
    await ui.say([`${itemName(objet)}.`, ITEMS_DESC(objet)]);
    if (!(await ui.yesNo(`La prendre ? Les deux autres resteront sur la table.`))) return;
    const r = await this.demande(d.id, { a: 'maj', salle: s.id, donnees: { [`ct:${this.moi}`]: objet } });
    if (!r.ok) { await ui.say('L\'hôte du salon ne répond pas...'); return; }
    g.give(objet, 1); g.sound.sfx('item');
    await ui.say(`${g.state.name} reçoit la ${itemName(objet)} !\nElle est rangée dans le Sac.`);
    await this.trophee(d);
  },

  /* ---------------- à chaque image ---------------- */
  tickTemple(dt) {
    const g = this.game, d = this.defs.get('temple'); if (!d) return;
    if (this.hote) { this.templeT = (this.templeT || 0) - dt; if (this.templeT <= 0) { this.templeT = 0.5; this.verifierStarters(d); } }
    // les rivières du chemin de l'Eau, et les eaux tumultueuses de la Mer Intérieure
    const mc = g.state && g.mapObj?.courants ? g.mapObj : null;
    if (mc || g.view.__courants) dessinerCourants(g.view, mc, performance.now());
    if ((mc?.remous || g.view.__remous)) dessinerRemous(g.view, mc?.remous ? mc : null, performance.now());
    this.tickTalisman(d);
    if (this.estDans(d)) { this.dessinerStatues(d); this.spritesTemple(); this.tickDresseurs(dt); }
    // la grande porte se referme derrière celui qui l'a passée
    if (this.grandeOuverte && g.mapObj?.id !== this.grandeOuverte) { const m = g.world.maps[this.grandeOuverte]; if (m) this.grandePorte(d, m, false); }
  },
  /** l'encadré du donjon */
  texteTemple(d, s) {
    if (!estTemple(d)) return null;
    const D = this.dt(d, s.id), S = this.etats[d.id].salles[s.id];
    if (s.cle) return D[`cle:${this.moi}`] ? 'clé ramassée' : s.branche === 'groupe' && Object.keys(D).some((k) => k.startsWith('cle:')) ? 'clé ramassée' : 'clé à trouver';
    if (s.ouvertPar) return D.porte ? 'porte ouverte' : `${['f', 'e', 'p'].filter((c) => D[`ins:${c}`]).length}/3 clés`;
    if (s.table === 'starters' && S.faite) { const A = D.attrib || {}; return D.duel ? 'duel en cours' : `${Object.keys(A).length} compagnon${Object.keys(A).length > 1 ? 's' : ''} attribué${Object.keys(A).length > 1 ? 's' : ''}`; }
    return null;
  },
  /** une salle se montre-t-elle dans l'encadré ? (seulement celles de sa branche) */
  salleVisibleTemple(d, s) { return !estTemple(d) || !s.branche || s.branche === this.brancheIci(d); },
  /** journal : où en est ce joueur */
  queteTemple(d, q) {
    if (!estTemple(d)) return null;
    const e = this.etats[d.id], b = this.brancheIci(d);
    const porte = b && this.dt(d, d.salles.find((s) => s.ouvertPar && s.branche === b).id).porte;
    if (q.id === 'dalles') return { faite: !!b || e.salles.e1.faite, txt: b === 'solo' ? 'Tu as passé la grande porte.' : b ? 'La petite porte est ouverte.' : q.but };
    if (q.id === 'cles' && b === 'solo' && !porte) { const fl = this.game.state.flags, a = Object.keys(d.tresors).filter((k) => fl[`TS:objet:${k}`]).map((k) => itemName(d.tresors[k].objet)); return { faite: false, txt: `${q.but}\nTes clés : ${this.mesCles(d, b).length}.${a.length ? `\nTrouvé en chemin : ${a.join(', ')}.` : ''}` }; }
    if (q.id === 'cles') return { faite: !!porte, txt: porte ? 'La porte de la Salle des Clés est ouverte.' : b ? `${q.but}\nTes clés : ${this.mesCles(d, b).length}.` : q.but };
    if (q.id === 'gardien') { const ok = b === 'solo' ? battu(e, d, 'Z') : b === 'groupe' ? battu(e, d, 'M') : false; return { faite: ok, txt: ok ? 'Le Gardien est vaincu.' : q.but }; }
    return null;
  },
  objetsTemple(d) {
    if (!estTemple(d)) return [];
    const b = this.brancheIci(d); if (!b) return [];
    const s4 = d.salles.find((q) => q.ouvertPar && q.branche === b), D = this.dt(d, s4.id);
    return this.mesCles(d, b).filter((c) => !D[`ins:${c}`]).map((c) => ({ label: NOM_CLE[c], right: '×1', txt: 'Elle ouvre la porte de la Salle des Clés, avec les deux autres.' }));
  },
};
