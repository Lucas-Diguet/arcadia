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
import { SAUVAGES_TEMPLE } from '../donjons/temple.js';
import { itemName, ITEMS } from '../../../odyssee/js/core/items.js';
const ITEMS_DESC = (k) => ITEMS[k]?.desc || '';

const cle = (x, y) => x + ',' + y;
const estTemple = (d) => d.id === 'temple';
const TYPES = new Set(['grandePorte', 'porteSolo', 'porteCles', 'starter', 'ct', 'porteHall', 'arbuste', 'ronces']);
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export const TALISMAN = 'talisman-elements';
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
// le solo : objets du Sac, décors des passages et des verrous
const SAC = { braise: 'braise-eternelle', graine: 'graine-geante', jarre: 'jarre-vide', eau: 'jarre-pleine' };
const DECOR_PASSAGE = { eau: 'passage_eau', lave: 'passage_lave', liane: 'passage_liane' };
const DECOR_VERROU = { ronces: 'ronces_geantes', torrent: 'torrent', flammes: 'mur_flammes' };
const TYPE_FR = { fire: 'Feu', water: 'Eau', grass: 'Plante', normal: 'Normal', steel: 'Acier', flying: 'Vol', poison: 'Poison' };
const NOM_CLE = { f: 'Clé du Feu', e: 'Clé de l\'Eau', p: 'Clé de la Plante' };
const IMG_CLE = { f: 'cle_feu', e: 'cle_eau', p: 'cle_plante' };
const NIVEAU_STARTER = 15;

export const Temple = {
  poserObjetsTemple(d, m) {
    if (!estTemple(d)) return;
    const P = m.donjon.plan, S = d.salles.find((q) => q.carte === m.id);
    // les chemins du solo : roche de leur élément, eau à surfer, Pokémon sauvages
    if (S?.biome) m.biome = S.biome;
    if (S?.sauvages) { const enc = SAUVAGES_TEMPLE[S.sauvages]; if (S.sauvages === 'e') { m.surf = true; m.surfEnc = enc; m.encounter = enc; } else m.encounter = enc; }
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
    if (S?.verrou) { const [nx, ny] = P.suivante; m.object(nx, ny + 1, { use: () => this.verrouTemple(d, S) }); }
    if (S?.branche === 'solo') this.syncSolo(d, m);
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
    // en solo : une porte scellée s'ouvre dès qu'on est arrivé derrière elle
    if (S.retour && S.branche === 'solo') g.state.flags[`TS:porte:${S.chemin}`] = true;
    const st = g.state, P = m.donjon.plan, t = (st.tiles ||= {})[m.id] = {};
    for (const [c, l] of Object.entries(P.objets)) {
      const o = d.objets[c]; if (o.type !== 'bouton' || !st.flags[`TPB:${m.id}:${c}`]) continue;
      for (const [bx, by] of P.objets[o.ouvre] || []) t[cle(bx, by)] = T.CAVE;
    }
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

  /** après un pas : dalle d'or, clé, téléporteur */
  async apresPasTemple() {
    const g = this.game, d = this.defs.get('temple'); if (!d || !this.estDans(d) || g.busy) return;
    const m = g.mapObj, P = m.donjon?.plan, p = g.player, s = this.salleTemple(d); if (!P || !s) return;
    const ici = (c) => P.objets[c]?.some(([x, y]) => x === p.x && y === p.y);
    g.busy = true;
    try {
      if (p.surf && m.courants?.has(cle(p.x, p.y))) await this.courant(m);
      else if (ici('X')) await this.dalleOr(d, m);
      else if (ici('K') && s.cle) await this.ramasserCle(d, s);
      else if (ici('T')) {
        const s2 = d.salles.find((q) => q.id === 's2'), cm = g.world.maps[s2.carte], [x, y] = cm.donjon.plan.depart;
        g.sound.sfx('exit'); await g.ui.say('Le téléporteur te ramène à la Salle des Trois Portes.');
        await g.warp({ map: cm.id, x, y, dir: 'up' }, 'exit');
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
    if (o.chemin !== 'p' && !g.state.flags[`TS:porte:${o.chemin}`]) { await ui.say([`Porte ${d.voiesDe[o.chemin]}${nom}.`, 'Elle est scellée de l\'intérieur. Il faudra trouver un autre chemin pour arriver derrière elle.']); return; }
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
  /** le moine de la Salle des Dalles prête le talisman : Coupe, Force, Éclate-Roc et Surf, sans CS ni badge */
  async talismanTemple() {
    const g = this.game, ui = g.ui, sp = { speaker: 'Moine' };
    if (g.state.bag[TALISMAN]) { await ui.say(['Garde bien le Talisman des Éléments.', 'Ses trois pierres tranchent les arbustes, poussent les rochers, brisent la roche et portent sur l\'eau.'], sp); return; }
    await ui.say(['Les chemins du temple ne s\'ouvrent pas à mains nues.', 'Prends ce Talisman des Éléments. Grâce à lui, tes Pokémon pourront couper les arbustes, pousser les rochers, briser la roche fissurée et surfer, même sans les CS ni les badges.', 'Tu me le rendras... enfin, tu le rendras au Gardien, quand tu l\'auras vaincu.'], sp);
    g.give(TALISMAN, 1); g.sound.sfx('item');
    await ui.say(`${g.state.name} reçoit le Talisman des Éléments !`);
  },
  /** le talisman se rend au Gardien après sa défaite, et se perd si l'on quitte le temple */
  tickTalisman(d) {
    const g = this.game, st = g.state; if (!st?.bag?.[TALISMAN] || this.talismanRendu || g.busy) return;
    const id = g.mapObj?.id || '', dehors = id !== d.carte && !id.startsWith(d.carte + ':');
    const g5 = d.salles.find((q) => q.table === 'starters'), ici = g.mapObj?.id === g5.carte;
    if (dehors) { delete st.bag[TALISMAN]; g.ui.toast?.('Le Talisman des Éléments retourne au temple.', 2200); return; }
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
      else if (R.type === 'source') maj(x, y, 'source_pure');
      else maj(x, y, R.lien && !R.maitre && !fl[`TS:lien:${R.lien}`] ? DECOR_PASSAGE[R.genre] + '_f' : DECOR_PASSAGE[R.genre]);
    }
    if (S.verrou) { const [nx, ny] = P.suivante; maj(nx, ny + 1, fl[`TS:verrou:${S.id}`] ? null : DECOR_VERROU[S.verrou.type]); }
    this.syncVegetal(d, m);
  },
  /** nouvelle descente en solo : tout revient comme au début */
  resetSolo(d) {
    const g = this.game, st = g.state;
    for (const k of Object.keys(st.flags)) if (k.startsWith('TS:')) delete st.flags[k];
    for (const k of Object.values(SAC)) delete st.bag[k];
    for (const s of d.salles.filter((q) => q.branche === 'solo' && q.carte)) {
      for (const k of Object.keys(st.flags)) if (k.startsWith(`TPB:${s.carte}:`)) delete st.flags[k];
      delete st.tiles?.[s.carte];
      this.syncSolo(d, g.world.maps[s.carte]);
    }
  },
  async recoinTemple(d, S, c) {
    const g = this.game, ui = g.ui, st = g.state, fl = st.flags, R = S.recoins[c], m = g.world.maps[S.carte];
    if (R.type === 'objet') {
      const tr = d.tresors[R.objet]; if (fl[`TS:objet:${R.objet}`]) return;
      await ui.say(tr.vu);
      fl[`TS:objet:${R.objet}`] = true; g.give(tr.objet, 1); g.sound.sfx('item'); this.syncSolo(d, m);
      await ui.say([`${st.name} trouve : ${itemName(tr.objet)} !`, ITEMS_DESC(tr.objet)]);
      return;
    }
    if (R.type === 'source') {
      if (fl['TS:objet:eau']) { await ui.say('La Source. Ta jarre est déjà pleine de son eau.'); return; }
      if (!fl['TS:objet:jarre']) { await ui.say(['La Source du temple : une eau si pure qu\'elle éteindrait n\'importe quel feu.', 'Il faudrait de quoi en emporter.']); return; }
      fl['TS:objet:eau'] = true; delete st.bag[SAC.jarre]; g.give(SAC.eau, 1); g.sound.sfx('heal');
      await ui.say([`${st.name} remplit la jarre à la Source.`, `${st.name} obtient : ${itemName(SAC.eau)} !`]);
      return;
    }
    // un passage vers un autre chemin
    const [sid, c2] = R.vers, S2 = d.salles.find((q) => q.id === sid), m2 = g.world.maps[S2.carte], nom2 = `${S2.nom} (chemin ${d.voiesDe[S2.chemin]}${d.voies[S2.chemin]})`;
    if (R.lien && !R.maitre && !fl[`TS:lien:${R.lien}`]) {
      await ui.say(R.genre === 'liane' ? ['Une liane pend d\'un puits, très haut dans la roche. On sent un air de jungle.', 'Elle est enroulée là-haut, hors d\'atteinte. Il faudrait la dérouler depuis l\'autre bout.']
        : ['Un bassin d\'eau claire. Au fond, une dalle de pierre bouche un conduit.', 'Elle ne se soulève que de l\'autre côté.']);
      return;
    }
    const quoi = { eau: ['Un point d\'eau profond. Un conduit s\'enfonce sous la roche.', 'Plonger ?'], lave: ['Un tunnel bordé de lave. L\'air y est brûlant.', 'S\'y engager ?'], liane: ['Une liane solide file dans un puits de roche.', 'L\'emprunter ?'] }[R.genre];
    await ui.say(quoi[0]);
    if (!(await ui.yesNo(quoi[1]))) return;
    if (R.lien && R.maitre && !fl[`TS:lien:${R.lien}`]) { fl[`TS:lien:${R.lien}`] = true; this.syncSolo(d, m2); await ui.say(R.genre === 'liane' ? 'Tu déroules la liane jusqu\'en bas : le passage servira dans les deux sens.' : 'Tu soulèves la dalle du fond : le passage servira dans les deux sens.'); }
    const [x, y] = this.pres(m2, m2.donjon.plan.objets[c2][0]);
    g.sound.sfx(R.genre === 'eau' ? 'heal' : 'ledge');
    await ui.fade?.(true, 250);
    await g.warp({ map: m2.id, x, y, dir: 'down' }, 'exit');
    await ui.fade?.(false, 250);
    await ui.say(`Tu ressors dans une autre partie du temple : ${nom2}.`);
  },
  async verrouTemple(d, S) {
    const g = this.game, ui = g.ui, st = g.state, fl = st.flags, V = S.verrou, m = g.world.maps[S.carte];
    if (fl[`TS:verrou:${S.id}`]) return;
    const T_ = {
      ronces: { vu: ['Des ronces géantes, épaisses comme le bras, ferment la sortie.', 'Aucune lame n\'en viendrait à bout. Le feu, peut-être...'], q: 'Approcher la Braise Éternelle ?', fait: 'Les ronces s\'embrasent d\'un coup et tombent en cendres. La voie est libre !' },
      torrent: { vu: ['Un torrent furieux tombe devant la sortie. Impossible de le traverser.', 'Il faudrait quelque chose d\'assez assoiffé pour le boire...'], q: 'Planter la Graine Géante au bord du torrent ?', fait: 'La graine germe aussitôt. Ses racines boivent le torrent jusqu\'à la dernière goutte. La voie est libre !' },
      flammes: { vu: ['Un mur de flammes barre la sortie. Il ne faiblit jamais.', 'Une eau ordinaire s\'évaporerait avant de le toucher...'], q: 'Verser l\'eau de la Source sur les flammes ?', fait: 'L\'eau de la Source étouffe les flammes dans un nuage de vapeur. La voie est libre !' },
    }[V.type];
    await ui.say(T_.vu);
    if (!fl[`TS:objet:${V.objet}`]) return;
    if (!(await ui.yesNo(T_.q))) return;
    fl[`TS:verrou:${S.id}`] = true; delete st.bag[SAC[V.objet]];
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
    if (q.id === 'cles' && b === 'solo' && !porte) { const fl = this.game.state.flags, a = [['braise', 'la Braise Éternelle'], ['graine', 'la Graine Géante'], ['jarre', 'une jarre'], ['eau', 'l\'eau de la Source']].filter(([k]) => fl[`TS:objet:${k}`]).map(([, n]) => n); return { faite: false, txt: `${q.but}\nTes clés : ${this.mesCles(d, b).length}.${a.length ? `\nTrouvé en chemin : ${a.join(', ')}.` : ''}` }; }
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
