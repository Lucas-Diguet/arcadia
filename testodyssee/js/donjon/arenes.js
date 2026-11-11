// testodyssee/js/donjon/arenes.js — les arènes du labo (prototypes Insecte et Poison) et la Place des Champions, ajoutées
// à la classe Donjons (jeu.js). Arènes solo : l'état de chaque salle est gardé dans la partie (state.arenes[carte]),
// les cases changées (cocons poussés, galeries effondrées) dans state.tiles, comme les rochers d'Odyssée.
// Règles sans écran : arene-regles.js. Les cases spéciales sont des objets d'Odyssée (flèches pour les fourmis, glace
// pour la rosée, téléporteurs pour les fils de traction), le sol de chaque case est dessiné par m.solArene (rendu.js).
import { T, walkable } from '../../../odyssee/js/world/tiles.js';
import { createMon, healFull } from '../../../odyssee/js/core/mon.js';
import { megaFormOf } from '../../../odyssee/js/core/mega.js';
import { loadImg, ASSETS } from '../../../odyssee/js/assets.js';
import { el } from '../../../odyssee/js/ui/ui.js';
import { fermer, ouvrir } from './plan.js';
import { cle, DIRS, casesParType, colonnes, etatInitial, presserPot, sensFourmi, sorteToile, sensFleur, lumiere, SOUFFLE, sorteMarais, cout, douche } from './arene-regles.js';
import { dessinerFaisceaux, dessinerCases } from '../rendu.js';
import { recadrer } from './miroirs.js';
import { CHAMPIONS, equipeChampion, nomChampion } from '../champions.js';
import { equipeLabo } from '../equipes.js';

const estArene = (d) => !!d?.arene;
const SOL_MARAIS = { pierre: 'pierres', vase: 'vase', profonde: 'vase_profonde', lys: 'lys', bulles: 'bulles' };
const NOM_COULEUR = { violet: 'violette', vert: 'verte', jaune: 'jaune', rose: 'rose' };
const maintenant = () => performance.now() / 1000;

export const Arenes = {
  /* ---------------- carte ---------------- */
  poserObjetsArenes(d, m) {
    if (!estArene(d)) return;
    const s = d.salles.find((q) => q.carte === m.id) || d.salles[0], P = m.donjon.plan;
    m.labo = { d, salle: s, P, T: casesParType(d, P), cols: colonnes(d, P), parCase: new Map() };
    for (const [c, l] of Object.entries(P.objets)) for (const [x, y] of l) m.labo.parCase.set(cle(x, y), d.objets[c]);
    m.solArene = new Map();
    if (d.fondCombat) m.fondCombat = d.fondCombat;
    m.pushFree = true;   // les cocons se poussent sans Force
    const fond = s.toile ? 'fil' : s.marais ? 'pierres' : s.sol;
    if (fond) for (const [x, y] of P.sol) m.solArene.set(cle(x, y), fond);
    for (const q of m.labo.T.cocon || []) m.set(q.x, q.y, T.BOULDER);
  },
  /** état de la salle (créé au premier passage) */
  ea(m) {
    const st = this.game.state; if (!st || !m?.labo) return null;
    const A = (st.arenes ||= {});
    if (!A[m.id]) { A[m.id] = etatInitial(m.labo.salle); if (m.labo.salle.marais) Object.assign(A[m.id], { souffle: SOUFFLE, lys: m.donjon.plan.depart }); }
    return A[m.id];
  },
  /** applique l'état de la salle à la carte (sens des fourmis, fils, fleurs, chrysalides…) et redessine ce qui change */
  syncArene(m) {
    if (!m?.labo || !this.game.state) return;
    const g = this.game, A = m.labo, e = this.ea(m), S = m.solArene, chg = new Set(), s = A.salle;
    const fond = s.toile ? 'fil' : s.marais ? 'pierres' : s.sol;
    const sol = (x, y, k) => { const c = cle(x, y); if (S.get(c) !== k) { S.set(c, k); chg.add(c); } };
    const obj = (x, y, o) => { const c = cle(x, y); if (o) m.objects.set(c, o); else m.objects.delete(c); };
    const bloc = (x, y, k, ferme) => {
      const c = cle(x, y);
      if (ferme) { if (m.get(x, y) !== T.BLOCK) { fermer(m, x, y, k); chg.add(c); } else { const dd = m.deco.find((q) => q.x === x && q.y === y); if (dd && dd.k !== k) { dd.k = k; chg.add(c); } } }
      else if (ouvrir(m, x, y)) chg.add(c);
    };
    for (const q of A.T.fourmis || []) { const dir = sensFourmi(A.cols, e, q.c, q.x, q.y); obj(q.x, q.y, { type: 'fleche', dir }); sol(q.x, q.y, 'fourmis_' + dir); }
    for (const q of A.T.eboulis || []) sol(q.x, q.y, 'eboulis');
    for (const q of A.T.puits || []) sol(q.x, q.y, e.combles.includes(cle(q.x, q.y)) ? 'dec_fosse_pleine' : 'dec_fosse');
    // la toile
    m.vide = new Set();
    for (const t of ['vide', 'fil', 'rosee', 'noeud', 'traction', 'araignee']) for (const q of A.T[t] || []) {
      const k = sorteToile(q.o, e);
      if (k === 'vide') { m.vide.add(cle(q.x, q.y)); sol(q.x, q.y, 'vide_toile'); obj(q.x, q.y, null); }
      else if (k === 'rosee') { sol(q.x, q.y, 'rosee'); obj(q.x, q.y, { type: 'glace' }); }
      else if (k === 'traction') { const to = (A.T.traction || []).find((r) => r.c === q.o.vers); sol(q.x, q.y, 'traction'); obj(q.x, q.y, to ? { type: 'tp', to: [to.x, to.y] } : null); }
      else { sol(q.x, q.y, k === 'noeud' ? 'noeud' : 'fil'); obj(q.x, q.y, null); }
    }
    // la mue : papillons posés le jour, chrysalides, haie du champion, fleurs-miroirs
    for (const q of A.T.papillons || []) { bloc(q.x, q.y, 'buisson_rose', e.jour); sol(q.x, q.y, e.jour ? fond : 'dec_parterre'); }
    for (const q of A.T.chrysalide || []) bloc(q.x, q.y, 'cristal_cible', !e.eclos.includes(cle(q.x, q.y)));
    const toutes = (A.T.chrysalide || []).every((q) => e.eclos.includes(cle(q.x, q.y)));
    for (const q of A.T.haie || []) bloc(q.x, q.y, 'haie', !toutes);
    for (const q of A.T.fleur || []) bloc(q.x, q.y, sensFleur(q.o, e, cle(q.x, q.y)) === '/' ? 'miroir_a' : 'miroir_b', true);
    // le sas et le marais
    for (const q of A.T.sas || []) bloc(q.x, q.y, 'grille_marais', !e.sasOuvert);
    for (const q of A.T.douche || []) sol(q.x, q.y, 'douche_' + q.o.couleur);
    if (s.marais) for (const [x, y] of A.P.sol) { const so = sorteMarais(A.parCase.get(cle(x, y)), e); if (so) sol(x, y, SOL_MARAIS[so]); }
    if (g.mapObj === m && g.view.map === m) for (const c of chg) {
      const [x, y] = c.split(',').map(Number), dd = m.deco.find((q) => q.x === x && q.y === y);
      if (dd) g.view.decoAt.set(c, dd); else g.view.decoAt.delete(c);
      g.view.rebuildAt(x, y);
    }
    this.lumiereVue = null;
  },
  /** en entrant dans une arène depuis ailleurs : tout reprend comme au début */
  entreeArene(d) {
    if (!estArene(d) || !d.salles[0].carte) return;
    const g = this.game, st = g.state; if (!st) return;
    for (const s of d.salles) { delete st.arenes?.[s.carte]; delete st.tiles?.[s.carte]; delete this.araigneeE?.[s.carte]; }
    if (g.mapObj && d.salles.some((s) => s.carte === g.mapObj.id)) g.setMap(g.mapObj.id);
  },
  async remettreSalle(m) {
    const g = this.game, [x, y] = m.donjon.plan.depart;
    delete g.state.arenes?.[m.id]; delete g.state.tiles?.[m.id]; delete this.araigneeE?.[m.id];
    await g.warp({ map: m.id, x, y, dir: 'up' }, 'exit');
  },

  /* ---------------- pas ---------------- */
  /** pas refusé : le vide sous la toile, un puits pas encore bouché */
  pasArene(dir) {
    const g = this.game, m = g.mapObj, p = g.player; if (!m?.labo || p.move) return false;
    const [dx, dy] = DIRS[dir], x = p.x + dx, y = p.y + dy, c = cle(x, y);
    const puits = m.labo.parCase.get(c)?.type === 'puits' && !this.ea(m).combles.includes(c);
    if (!m.vide?.has(c) && !puits) return false;
    p.dir = dir; p.walking = false;
    if (p.bumpT <= 0) { g.sound.sfx('bump'); p.bumpT = 0.3; }
    return true;
  },
  /** au départ d'un pas : la galerie s'effondre derrière soi ; la vase profonde ralentit */
  apresDepartArene(dir, [x0, y0]) {
    const g = this.game, m = g.mapObj, p = g.player; if (!m?.labo) return;
    if (m.labo.parCase.get(cle(x0, y0))?.type === 'eboulis' && m.get(x0, y0) !== T.CAVEWALL) { g.setTile(x0, y0, T.CAVEWALL); g.sound.sfx('bang'); g.view.shake = 0.12; }
    if (m.labo.salle.marais && p.move && this.sorteIci(m, p.move.tx, p.move.ty) === 'profonde') p.move.dur *= 2;
  },
  /** un cocon tombe dans un puits : le puits est bouché */
  rocherArene(x, y) {
    const g = this.game, m = g.mapObj, c = cle(x, y); if (!m?.labo || m.labo.parCase.get(c)?.type !== 'puits') return;
    const e = this.ea(m); if (e.combles.includes(c)) return;
    e.combles.push(c); g.setTile(x, y, T.CAVE); this.syncArene(m);
    g.sound.sfx('bang'); g.view.shake = 0.15;
    this.taches.push(() => g.ui.say('Le cocon roule dans le puits et le bouche.'));
  },
  async apresPas() {
    const g = this.game, m = g.mapObj; if (!m?.labo || !g.state) return;
    const p = g.player, s = m.labo.salle;
    if (m.vide?.has(cle(p.x, p.y))) { await this.chute(m); return; }
    if (s.toile) this.pasAraignee(m);
    if (s.marais) await this.pasMarais(m);
    const o = m.labo.parCase.get(cle(p.x, p.y));
    if (o?.type === 'douche') await this.passerDouche(m, o);
  },
  async chute(m) {
    const g = this.game, d = m.labo.d, s = d.salles.find((q) => q.id === d.chute.salle);
    g.busy = true;
    try {
      g.sound.sfx('ledge'); g.view.shake = 0.25;
      await g.ui.say('Tu glisses sur la rosée... et tu tombes de la toile !');
      this.araigneeAuNid(m);
      await g.warp({ map: s.carte, x: d.chute.x, y: d.chute.y, dir: 'down' }, 'exit');
    } finally { g.busy = false; }
  },

  /* ---------------- objets qu'on utilise ---------------- */
  async interagirArene() {
    const g = this.game, m = g.mapObj; if (!m?.labo || !g.state) return false;
    const p = g.player, [dx, dy] = DIRS[p.dir], x = p.x + dx, y = p.y + dy, k = cle(x, y), o = m.labo.parCase.get(k);
    if (!o) return false;
    const e = this.ea(m), ui = g.ui;
    switch (o.type) {
      case 'pot':
        presserPot(e, o); this.syncArene(m); g.sound.sfx('select'); g.view.shake = 0.06;
        await ui.say(`Tu renverses ${o.nom}. L'odeur se répand : des colonnes de fourmis font demi-tour !`); return true;
      case 'levier':
        e.leviers[o.id] = 1 - (e.leviers[o.id] || 0); this.syncArene(m); g.sound.sfx('select'); g.view.shake = 0.08;
        await ui.say(`Tu actionnes ${o.nom}. Des fils se tendent, d'autres se relâchent.`);
        this.verifierAraignee(m); return true;
      case 'fleur':
        e.fleurs[k] = (e.fleurs[k] || 0) + 1; this.syncArene(m); g.sound.sfx('select');
        await this.majLumiere(m); return true;
      case 'jour':
        e.jour = !e.jour; this.syncArene(m); g.sound.sfx('select'); g.view.shake = 0.06;
        await ui.say(e.jour ? 'Tu tournes la manivelle : le toit s\'ouvre, le soleil entre. Les papillons se posent.' : 'Tu tournes la manivelle : le toit se ferme. Les papillons s\'envolent, les lucioles s\'allument.');
        await this.majLumiere(m); return true;
      case 'vanne':
        e.vannes[o.id] = !e.vannes[o.id]; this.syncArene(m); g.sound.sfx('select'); g.view.shake = 0.12;
        await ui.say(e.vannes[o.id] ? `Tu ouvres ${o.nom}. Une partie du marais se vide... et une autre se remplit.` : `Tu refermes ${o.nom}. Le marais reprend sa place.`); return true;
      case 'remise':
        if (await ui.yesNo(o.texte)) await this.remettreSalle(m);
        return true;
      case 'chrysalide': await ui.say('Une chrysalide. Elle attend la lumière pour éclore.'); return true;
      case 'haie': await ui.say('Une haie de feuillage serré. Elle s\'ouvrira quand toutes les chrysalides auront éclos.'); return true;
      case 'source': await ui.say(e.jour ? 'Le soleil entre par cette ouverture du toit.' : 'L\'ouverture du toit est fermée. Il fait nuit dans la serre.'); return true;
      case 'luciole': await ui.say(e.jour ? 'Un nid de lucioles. Elles dorment, le jour.' : 'Les lucioles brillent dans la nuit.'); return true;
      case 'sas': await ui.say(e.sasOuvert ? 'Le sas est ouvert.' : 'Le sas est verrouillé. Il faut d\'abord passer sous les douches, dans le bon ordre.'); return true;
      default: return false;
    }
  },

  /* ---------------- la lumière (la Mue) ---------------- */
  calculLumiereArene(m) {
    return lumiere(m.labo.d, m.labo.P, this.ea(m), (x, y) => !m.in(x, y) || !walkable(m.get(x, y)));
  },
  /** la lumière a changé : les chrysalides touchées éclosent (l'une peut en libérer une autre) */
  async majLumiere(m) {
    if (!(m.labo.T.chrysalide || []).length) return;
    const g = this.game, e = this.ea(m);
    let n = 0;
    for (let k = 0; k < 10; k++) {
      const neuves = [...this.calculLumiereArene(m).touchees].filter((c) => !e.eclos.includes(c));
      if (!neuves.length) break;
      e.eclos.push(...neuves); n += neuves.length; this.syncArene(m);
    }
    if (!n) return;
    g.sound.sfx('badge'); g.view.shake = 0.15;
    const reste = (m.labo.T.chrysalide || []).filter((q) => !e.eclos.includes(cle(q.x, q.y))).length;
    await g.ui.say(n > 1 ? 'Deux chrysalides éclosent dans la lumière ! Des papillons s\'envolent.' : 'La chrysalide éclot dans la lumière ! Un papillon s\'envole.');
    if (!reste && (m.labo.T.haie || []).length) await g.ui.say('La haie du champion s\'écarte dans un froissement de feuilles.');
  },

  /* ---------------- l'araignée (la Grande Toile) ---------------- */
  araignee(m) {
    const A = (this.araigneeE ||= {});
    if (!A[m.id]) { const q = (m.labo.T.araignee || [])[0]; if (!q) return null; A[m.id] = { x: q.x, y: q.y, nid: [q.x, q.y], fx: q.x, fy: q.y, u: 1 }; }
    return A[m.id];
  },
  araigneeAuNid(m) { const a = this.araignee(m); if (a) { [a.x, a.y] = a.nid; a.fx = a.x; a.fy = a.y; a.u = 1; } },
  /** l'araignée marche sur les fils et les nœuds, jamais sur la rosée, le vide ou un fil de traction */
  marcheAraignee(m, x, y) {
    const c = cle(x, y); if (!m.in(x, y) || !walkable(m.get(x, y)) || m.vide?.has(c)) return false;
    const o = m.objects.get(c); if (o?.type === 'glace' || o?.type === 'tp') return false;
    return !this.game.npcs.some((n) => n.x === x && n.y === y);
  },
  /** son fil a été coupé sous elle : elle tombe et remonte à son nid */
  verifierAraignee(m) { const a = this.araignee(m); if (a && !this.marcheAraignee(m, a.x, a.y)) this.araigneeAuNid(m); },
  /** à chaque pas du joueur, l'araignée avance d'une case vers lui (si un chemin de fils les relie) */
  pasAraignee(m) {
    const g = this.game, a = this.araignee(m), p = g.player; if (!a || g.noEnc) return;
    this.verifierAraignee(m);
    const prev = new Map([[cle(a.x, a.y), null]]), file = [[a.x, a.y]];
    let fin = null;
    while (file.length) {
      const [x, y] = file.shift();
      if (Math.abs(x - p.x) + Math.abs(y - p.y) <= 1) { fin = [x, y]; break; }
      for (const [dx, dy] of Object.values(DIRS)) {
        const nx = x + dx, ny = y + dy, k = cle(nx, ny);
        if (prev.has(k) || (nx === p.x && ny === p.y) || !this.marcheAraignee(m, nx, ny)) continue;
        prev.set(k, [x, y]); file.push([nx, ny]);
      }
    }
    if (!fin) return;
    let cur = fin;
    while (prev.get(cle(...cur)) && cle(...prev.get(cle(...cur))) !== cle(a.x, a.y)) cur = prev.get(cle(...cur));
    if (cle(...cur) !== cle(a.x, a.y)) { a.fx = a.x; a.fy = a.y; [a.x, a.y] = cur; a.u = 0; }
    if (Math.abs(a.x - p.x) + Math.abs(a.y - p.y) <= 1 && !this.combatPrevu) { this.combatPrevu = true; this.taches.push(() => this.combatAraignee(m)); }
  },
  async combatAraignee(m) {
    const g = this.game, d = m.labo.d;
    try {
      await g.ui.say('L\'araignée a senti tes pas sur sa toile... Elle te rattrape !');
      const wild = createMon(d.araignee.sp, d.araignee.niveau, { met: d.nom });
      const res = await g.runBattle({ wild, noWhiteout: true });
      if (res === 'lose') for (const mon of g.state.party) healFull(mon);
      this.araigneeAuNid(m);
      await g.ui.say('Elle te ramène au bord de sa toile, et remonte à son nid.');
      const [x, y] = m.donjon.plan.depart;
      await g.warp({ map: m.id, x, y, dir: 'up' }, 'exit');
    } finally { this.combatPrevu = false; }
  },

  /* ---------------- le marais ---------------- */
  sorteIci(m, x, y) { return sorteMarais(m.labo.parCase.get(cle(x, y)), this.ea(m)) || (walkable(m.get(x, y)) ? 'pierre' : null); },
  /** les bulles crachent à tour de rôle : 1,2 s toutes les 4 s */
  crache(x, y, t = maintenant()) { return ((t + ((x * 7 + y * 13) % 8) / 2) % 4) < 1.2; },
  toxique(m, x, y) { const G = this.grot; return !!G && G.carte === m.id && (G.trace.get(cle(x, y)) || 0) > maintenant(); },
  async pasMarais(m) {
    const g = this.game, p = g.player, e = this.ea(m), so = this.sorteIci(m, p.x, p.y);
    if (so === 'lys') { if (e.souffle < SOUFFLE) g.sound.sfx('heal'); e.souffle = SOUFFLE; e.lys = [p.x, p.y]; this.majJauge(m); return; }
    const n = cout(so, { crache: so === 'bulles' && this.crache(p.x, p.y), toxique: this.toxique(m, p.x, p.y) });
    if (!n) return;
    e.souffle -= n; this.majJauge(m);
    if (n >= 3) { g.sound.sfx('bump'); g.view.shake = 0.1; }
    if (e.souffle > 0) return;
    g.busy = true;
    try {
      await g.ui.say('Tu n\'as plus de souffle... Tu reviens au dernier lys pour respirer.');
      e.souffle = SOUFFLE; this.majJauge(m);
      const [x, y] = e.lys; await g.warp({ map: m.id, x, y, dir: 'down' }, 'exit');
    } finally { g.busy = false; }
  },
  majJauge(m) {
    const g = this.game, e = m && this.ea(m), on = !!(e && m.labo?.salle.marais && g.mapObj === m);
    if (!this.jauge) { this.jauge = el('div', 'box dj-souffle'); Object.assign(this.jauge.style, { position: 'absolute', left: '50%', top: '8px', transform: 'translateX(-50%)', padding: '4px 12px', zIndex: 5, fontSize: 'calc(var(--px) * 6)', whiteSpace: 'nowrap' }); g.ui.root.appendChild(this.jauge); }
    this.jauge.style.display = on ? '' : 'none';
    if (!on) return;
    const n = Math.max(0, e.souffle);
    this.jauge.innerHTML = `Souffle <span style="color:#7cd64a">${'●'.repeat(n)}</span><span style="opacity:.35">${'●'.repeat(SOUFFLE - n)}</span>`;
  },
  /** Grotadmorv fait sa ronde : une case toutes les 0,9 s, et laisse une traînée toxique pendant 6 s */
  tickGrot(m, dt) {
    const d = m.labo.d, R = d.grotadmorv; if (!R) return;
    let G = this.grot;
    if (!G || G.carte !== m.id) {
      const chemin = [];
      R.ronde.forEach(([x, y], i) => {
        const [nx, ny] = R.ronde[(i + 1) % R.ronde.length];
        for (let k = 0; k < Math.max(Math.abs(nx - x), Math.abs(ny - y)); k++) chemin.push([x + Math.sign(nx - x) * k, y + Math.sign(ny - y) * k]);
      });
      G = this.grot = { carte: m.id, chemin, i: 0, x: chemin[0][0], y: chemin[0][1], fx: chemin[0][0], fy: chemin[0][1], u: 1, t: 0.9, trace: new Map() };
    }
    G.u = Math.min(1, G.u + dt / 0.9);
    if ((G.t -= dt) > 0 || this.game.bv.alive) return;
    G.t = 0.9;
    const [nx, ny] = G.chemin[(G.i + 1) % G.chemin.length], p = this.game.player;
    if (nx === p.x && ny === p.y) return;   // il attend qu'on lui laisse la place
    G.trace.set(cle(G.x, G.y), maintenant() + 6);
    G.fx = G.x; G.fy = G.y; G.x = nx; G.y = ny; G.i = (G.i + 1) % G.chemin.length; G.u = 0;
  },
  occupeArene(x, y) {
    const m = this.game.mapObj; if (!m?.labo) return false;
    const a = this.araigneeE?.[m.id], G = this.grot;
    return (!!a && a.x === x && a.y === y) || (!!G && G.carte === m.id && G.x === x && G.y === y);
  },

  /* ---------------- le sas ---------------- */
  async passerDouche(m, o) {
    const g = this.game, e = this.ea(m), d = m.labo.d;
    if (e.sasOuvert) return;
    const r = douche(e, o.couleur, d.sas);
    if (r === 'suite') { g.sound.sfx('select'); g.ui.toast(`Douche ${NOM_COULEUR[o.couleur] || o.couleur}`, 1200); return; }
    g.busy = true;
    try {
      if (r === 'faux') { g.sound.sfx('bump'); g.view.shake = 0.2; await g.ui.say('BIIIP ! Une alarme retentit : ce n\'est pas le bon ordre. Le sas se remet à zéro.'); return; }
      e.sasOuvert = true; this.syncArene(m); g.sound.sfx('badge'); g.view.shake = 0.15;
      await g.ui.say('Pschhh... Le sas siffle et s\'ouvre. Te voilà décontaminé !');
    } finally { g.busy = false; }
  },

  /* ---------------- à chaque image ---------------- */
  tickArenes(dt) {
    const g = this.game, m = g.state && g.mapObj, v = g.view;
    const ici = m?.labo ? m : null;
    this.majJauge(ici);
    if (!ici) { this.dessinerActeurs(null); if (this.casesVues) { this.casesVues = null; dessinerCases(v, []); } return; }
    // la lumière
    if ((ici.labo.T.source || ici.labo.T.luciole) && (this.lumiereVue !== ici.id || v.__faisceauxRoot !== v.root)) { this.lumiereVue = ici.id; dessinerFaisceaux(v, this.calculLumiereArene(ici).traits); }
    // le marais : Grotadmorv, bulles qui crachent, traînée toxique
    if (ici.labo.salle.marais) {
      this.tickGrot(ici, dt);
      const t = maintenant(), liste = [];
      for (const [x, y] of ici.labo.P.sol) if (this.sorteIci(ici, x, y) === 'bulles' && this.crache(x, y, t)) liste.push({ x, y, c: 0xb8f060, o: 0.6 });
      for (const [c, fin] of this.grot?.trace || []) if (fin > t) { const [x, y] = c.split(',').map(Number); liste.push({ x, y, c: 0xb040ff, o: 0.35 * Math.min(1, fin - t) }); }
      const k = liste.map((q) => q.x + ',' + q.y + (q.o * 10 | 0)).join(';');
      if (k !== this.casesVues || v.__casesRoot !== v.root) { this.casesVues = k; dessinerCases(v, liste); }
    } else if (this.casesVues) { this.casesVues = null; dessinerCases(v, []); }
    for (const a of Object.values(this.araigneeE || {})) a.u = Math.min(1, a.u + dt / 0.25);
    this.dessinerActeurs(ici);
  },
  /** l'araignée et Grotadmorv, dessinés comme les Pokémon qui se promènent */
  dessinerActeurs(m) {
    const v = this.game.view, liste = [];
    const a = m && this.araigneeE?.[m.id], G = m && this.grot?.carte === m.id ? this.grot : null;
    if (a) liste.push(['arene:araignee', m.labo.d.araignee.sp, a]);
    if (G) liste.push(['arene:grot', m.labo.d.grotadmorv.sp, G]);
    for (const k of ['arene:araignee', 'arene:grot']) if (!liste.some((q) => q[0] === k) && v.actors.has(k)) v.removeActor(k);
    for (const [k, sp, e] of liste) {
      const im = (this.imgActeur ||= {})[sp];
      if (!im) { this.imgActeur[sp] = 'charge'; loadImg(ASSETS.front(sp)).then((x) => { this.imgActeur[sp] = recadrer(x); }); continue; }
      if (im === 'charge') continue;
      const act = v.imageActor(k, im, 0.7);
      if (!act.petit) { act.petit = true; act.shadow.scale.set(0.55, 1, 0.65); }
      const u = e.u ?? 1;
      v.place(act, e.fx + (e.x - e.fx) * u, e.fy + (e.y - e.fy) * u, u < 1 ? Math.abs(Math.sin(u * Math.PI)) * 0.1 : 0);
    }
  },

  /* ---------------- la Place des Champions ---------------- */
  async champion(d, k) {
    const g = this.game, ui = g.ui, c = d.pnj[k].champion, titre = nomChampion(c);
    if (!c.equipe) { await ui.say(c.cls === 'Maître' ? 'Mon équipe n\'est pas encore prête. Le Maître ne se bat qu\'avec ses meilleurs Pokémon !' : 'Mon équipe n\'est pas encore prête. Reviens plus tard !', { speaker: titre }); return; }
    if (!(await ui.yesNo(`${titre} (${c.rang === 1 ? '1re' : c.rang + 'e'} arène, type ${c.type}).\nL'affronter au niveau 100 ?`))) return;
    const st = g.state, objets = st.party.map((m) => m.item);
    st.bag['mega-ring'] = 1;
    const party = equipeChampion(c);
    const tr = { cls: c.cls, name: c.nom === 'à nommer' ? c.type : c.nom, prize: 0, bs: c.sprite, ai: 'smart', items: {}, lose: '...', megaSp: 'copie', mega: party.some((m) => megaFormOf(m)), champion: true };
    g.musicLock = true;
    try { await g.runBattle({ trainer: tr, party, music: 'trainer', noWhiteout: true }); }
    finally {
      g.musicLock = false; g.updateZone();
      // soigné sans un mot, avec ses objets tenus
      st.party.forEach((m, i) => { healFull(m); m.item = objets[i] ?? null; delete m._ko; });
    }
  },
  async organisatrice() {
    const g = this.game, ui = g.ui, sp = { speaker: 'Organisatrice Pia' }, nom = g.state.name;
    const choix = [{ label: 'Fin de jeu (niv. 100)', f: () => equipeLabo('fin100', nom) },
      ...CHAMPIONS.filter((c) => c.equipe).map((c) => ({ label: `Équipe de ${nomChampion(c)}`, right: c.type, f: () => equipeChampion(c, nom) }))];
    await ui.say('Bienvenue sur la Place des Champions ! Je peux te prêter une équipe, au niveau 100.', { ...sp, keep: true });
    const r = await ui.list({ title: 'Quelle équipe ?', items: choix.map((q) => ({ label: q.label, right: q.right || '' })).concat([{ label: 'Garder la mienne' }]), cls: 'shop', cancel: choix.length });
    if (r < 0 || r >= choix.length) { await ui.say('Comme tu veux. Bonne chance !', sp); return; }
    g.state.party = choix[r].f(); g.state.bag['mega-ring'] = 1;
    for (const m of g.state.party) { if (!g.state.dex.caught.includes(m.sp)) g.state.dex.caught.push(m.sp); if (!g.state.dex.seen.includes(m.sp)) g.state.dex.seen.push(m.sp); }
    g.resetFollower?.(); g.hud?.update(true);
    await ui.say(`Voilà ton équipe : ${choix[r].label.replace(/^Équipe de /, 'celle de ')}. Bonne chance !`, sp);
  },
};
