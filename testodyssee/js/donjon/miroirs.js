// testodyssee/js/donjon/miroirs.js — mécaniques du donjon des miroirs, ajoutées à la classe Donjons (jeu.js) :
// énigme aux miroirs muraux, sol glacé, miroirs de poche et miroirs piégés, robot, brasier et rencontres de la salle
// du brasier, faisceaux de lumière et soleils, et Copycat qui refait nos pas en miroir.
// Tout ce qui tient de l'état passe par l'action « maj » d'etat.js (donnees de chaque salle).
import { createMon, healFull } from '../../../odyssee/js/core/mon.js';
import { itemName } from '../../../odyssee/js/core/items.js';
import { T, walkable, DIRS } from '../../../odyssee/js/world/tiles.js';
import { loadImg } from '../../../odyssee/js/assets.js';
import { el } from '../../../odyssee/js/ui/ui.js';
import { MOVES } from '../../../odyssee/js/data/moves.js';
import { glisser, faisceau, refleter, cle, cheminGlace } from './casse-tetes.js';
import { ouvrir } from './plan.js';
import { IMAGES } from '../contenu.js';
import { dessinerFaisceaux } from '../rendu.js';

const estMiroirs = (d) => d.salles.some((s) => s.type === 'reflet' || s.type === 'lumiere');
const TYPES = new Set(['enigme', 'miroirMural', 'miroirPoche', 'robot', 'brasier', 'soleil', 'miroirFixe', 'socle', 'plaque', 'pc']);
const idAttaque = (key) => Object.values(MOVES).find((m) => m.key === key).id;
const copieSoignee = (party) => party.map((m) => { const c = JSON.parse(JSON.stringify(m)); healFull(c); delete c._ko; return c; });

export const Miroirs = {
  /* ---------------- installation ---------------- */
  poserObjetsMiroirs(d, m) {
    if (!estMiroirs(d)) return;
    for (const [c, l] of Object.entries(m.donjon.plan.objets)) {
      const o = d.objets[c];
      if (!TYPES.has(o.type)) continue;
      for (const [x, y] of l) m.object(x, y, { use: () => this.objetMiroirs(d, c, x, y) });
    }
    // la glace d'origine, pour défaire une simplification quand le donjon recommence
    if (m.glace) m.glaceOrigine = new Set(m.glace);
  },
  dm(d, salle) { return this.etats[d.id].salles[salle].donnees || {}; },
  salleDe(d, type) { return d.salles.find((s) => s.type === type); },
  /** carte d'une salle (une carte par salle ; sinon la carte du donjon) */
  carteDe(d, s) { return this.game.world.maps[s?.carte || d.carte]; },
  maj(d, salle, donnees, o = {}) { return this.demande(d.id, { a: 'maj', salle, donnees, ...o }); },
  /** décor d'une case (k = null : la case se libère) ; la vue suit si on est sur la carte */
  decor(m, x, y, k) {
    const g = this.game, ici = g.mapObj === m, c = cle(x, y);
    if (k == null) { if (ouvrir(m, x, y) && ici) { g.view.decoAt.delete(c); g.view.rebuildAt(x, y); } return; }
    let dd = m.deco.find((q) => q.x === x && q.y === y);
    if (dd && dd.k === k && m.get(x, y) === T.BLOCK) return;
    if (m.get(x, y) !== T.BLOCK) { m.set(x, y, T.CAVE); m.prop(k, x, y); dd = m.deco.find((q) => q.x === x && q.y === y); }
    else if (dd) dd.k = k; else { m.deco.push({ k, x, y }); dd = m.deco[m.deco.length - 1]; }
    if (ici) { g.view.decoAt.set(c, dd); g.view.rebuildAt(x, y); }
  },
  /** le décor de toute la carte selon l'état (aussi pour tout remettre en place quand on recommence) */
  appliquerMiroirs(d) {
    if (!estMiroirs(d)) return;
    const s1 = this.salleDe(d, 'enigme'), D1 = this.dm(d, s1.id), fait1 = this.etats[d.id].salles[s1.id].faite;
    const D2 = this.dm(d, 's2'), D4 = this.dm(d, this.salleDe(d, 'lumiere').id);
    for (const id of d.cartes || [d.carte]) {
    const m = this.game.world.maps[id], P = m.donjon.plan;
    for (const [c, l] of Object.entries(P.objets)) {
      const o = d.objets[c];
      for (const [x, y] of l) {
        const k = cle(x, y);
        if (o.type === 'miroirMural') this.decor(m, x, y, o.juste && fait1 ? null : (D1.brises || []).includes(c) ? 'miroir_brise' : 'miroir_mur');
        else if (o.type === 'miroirPoche') this.decor(m, x, y, D2.pris?.[k] ? null : 'miroir_poche');
        else if (o.type === 'miroirFixe') this.decor(m, x, y, (D4.orient?.[k] ?? o.sens) === '/' ? 'miroir_d' : 'miroir_g');
        else if (o.type === 'socle') { const s = D4.socles?.[k]; this.decor(m, x, y, s ? (s === '/' ? 'miroir_d' : 'miroir_g') : 'socle'); }
        else if (o.type === 'brasier') this.decor(m, x, y, (D4.feux || 0) >= 5 ? 'brasier_on' : 'brasier');
        else if (o.type === 'soleil') this.decor(m, x, y, (D4.soleils || []).includes(k) ? 'soleil_on' : 'soleil');
      }
    }
    }
    // salles simplifiées par le PC : cases où l'on s'arrête en plus (sol ou cristal)
    for (const s of d.salles) {
      if (!s.aide?.simplifier || !s.carte) continue;
      const m = this.game.world.maps[s.carte], on = !!this.dm(d, s.id).simple, ici = this.game.mapObj === m;
      for (const [px, py, c] of s.aide.simplifier) {
        const x = px + 1, y = py + 1, k = cle(x, y);
        if (c === 'X') this.decor(m, x, y, on ? 'cristal' : null);
        const glace = !on && m.glaceOrigine.has(k);
        if (glace !== m.glace.has(k)) { if (glace) m.glace.add(k); else m.glace.delete(k); if (ici) this.game.view.rebuildAt(x, y); }
      }
    }
    // le reflet revient à sa place quand le donjon recommence
    if (!this.reflet || this.reflet.run !== this.etats[d.id].run) { this.placerReflet(d); this.indice = null; }
    this.lumiereVue = null;
  },

  /* ---------------- interactions ---------------- */
  async objetMiroirs(d, c, x, y) {
    const o = d.objets[c];
    switch (o.type) {
      case 'enigme': return this.lireEnigme(d);
      case 'miroirMural': return this.miroirMural(d, c);
      case 'miroirPoche': return this.miroirPoche(d, x, y, o.piege);
      case 'robot': return this.robot(d);
      case 'brasier': return this.brasier(d);
      case 'soleil': { const D4 = this.dm(d, 's4'); return this.game.ui.say((D4.soleils || []).includes(cle(x, y)) ? d.textes.soleilOn : d.textes.soleil); }
      case 'miroirFixe': return this.miroirFixe(d, x, y);
      case 'socle': return this.socle(d, x, y);
      case 'plaque': return this.plaque(d);
      case 'pc': return this.pcAide(d, d.salles.find((s) => s.id === o.salle));
    }
  },

  async lireEnigme(d) {
    const ui = this.game.ui, img = el('div', 'box starter-pic testody-horloge', `<img src="${new URL('../../img/' + d.enigme.image, import.meta.url).href}" alt="">`);
    ui.root.appendChild(img);
    try { await ui.say(d.enigme.texte); } finally { img.remove(); }
  },
  async miroirMural(d, c) {
    const g = this.game, ui = g.ui, o = d.objets[c], s1 = this.salleDe(d, 'enigme'), D1 = this.dm(d, s1.id);
    if ((D1.brises || []).includes(c)) { await ui.say(d.textes.brise); return; }
    if (!(await ui.yesNo(d.textes.miroirMur))) return;
    if (o.juste) {
      g.sound.sfx('learn'); await ui.flash(1, '#ffffff', 120);
      await this.maj(d, s1.id, {}, { faite: true });
      await ui.say(d.textes.juste);
      return;
    }
    g.sound.sfx('hitstrong'); g.view.shake = 0.3; await ui.flash(1, '#d0e8ff', 90);
    await this.maj(d, s1.id, { brises: [...(D1.brises || []), c] });
    await ui.say(d.textes.faux);
    await this.penalite(d);
  },
  /** miroirs de poche gardés : ramassés moins ceux posés sur un socle */
  miroirsEnPoche(d) {
    const pris = Object.values(this.dm(d, 's2').pris || {}).filter((v) => v === 'poche').length;
    return pris - Object.keys(this.dm(d, 's4').socles || {}).length;
  },
  async miroirPoche(d, x, y, piege) {
    const g = this.game, ui = g.ui, k = cle(x, y), D2 = this.dm(d, 's2');
    if (D2.pris?.[k]) return;
    if (!piege) {
      g.sound.sfx('item');
      await this.maj(d, 's2', { pris: { ...(D2.pris || {}), [k]: 'poche' } });
      this.effacerIndice();
      await ui.say(`${g.state.name} ramasse un Miroir de poche !\nIl est rangé dans le journal du donjon. (${this.miroirsEnPoche(d)} en poche)`);
      return;
    }
    await ui.say(d.textes.piege);
    const res = await this.combat({ cls: 'Miroir', nom: 'piégé', bs: 'miroir_piege' }, copieSoignee([g.state.party.find((m) => m.hp > 0) || g.state.party[0]]));
    if (res !== 'win') { await this.defaite(d); return; }
    await this.maj(d, 's2', { pris: { ...(this.dm(d, 's2').pris || {}), [k]: 'piege' } });
    g.sound.sfx('hitstrong');
    await ui.say('Le miroir piégé vole en éclats.');
  },
  async robot(d) {
    const g = this.game, ui = g.ui, R = d.robot, D3 = this.dm(d, 's3');
    if (D3.robot) { await ui.say(d.textes.robotBattu, { speaker: R.nom }); return; }
    await ui.say(d.textes.robot, { speaker: R.nom });
    const party = R.equipe.map(([sp, lvl, mv]) => createMon(sp, lvl, { moves: mv.map(idAttaque), iv: Array(6).fill(24), shiny: false }));
    const res = await this.combat({ cls: R.cls, nom: R.nom, bs: R.bs }, party);
    if (res !== 'win') { await this.defaite(d); return; }
    await this.maj(d, 's3', { robot: true });
    if (!g.state.bag['ct-voile-miroir']) { g.give('ct-voile-miroir'); g.sound.sfx('item'); await ui.say(`${g.state.name} reçoit la ${itemName('ct-voile-miroir')} !\nElle est rangée dans les Objets rares du Sac.`); }
  },

  /* ---------------- salle du brasier ---------------- */
  async brasier(d) {
    const g = this.game, ui = g.ui, s = this.salleDe(d, 'lumiere'), D4 = this.dm(d, s.id);
    let n = D4.feux || 0, tenus = D4.tenus || 0;
    if (n >= 5) { await ui.say(d.textes.brasier[5]); return; }
    if (!tenus) { await ui.say(d.textes.brasier[n]); return; }
    // un feu après l'autre : chaque stade du brasier a son texte
    while (tenus > 0 && n < 5) {
      n++; tenus--;
      await this.maj(d, s.id, { feux: n, tenus });
      g.sound.sfx('hitweak'); await ui.say(d.textes.jeter(n));
      if (n >= 5) { g.sound.sfx('bang'); g.view.shake = 0.3; await ui.flash(2, '#fff6c0', 90); }
      await ui.say(d.textes.brasier[n]);
    }
    this.lumiere(d);
  },
  async miroirFixe(d, x, y) {
    const g = this.game, k = cle(x, y), o = d.objets[this.lettre(d, x, y)], D4 = this.dm(d, 's4');
    const sens = D4.orient?.[k] ?? o.sens;
    if (!(await g.ui.yesNo(`Un miroir sur pied, tourné « ${sens} ».\nLe faire pivoter ?`))) return;
    g.sound.sfx('select');
    await this.maj(d, 's4', { orient: { ...(D4.orient || {}), [k]: sens === '/' ? '\\' : '/' } });
    this.lumiere(d);
  },
  async socle(d, x, y) {
    const g = this.game, ui = g.ui, k = cle(x, y), D4 = this.dm(d, 's4'), s = D4.socles?.[k];
    const socles = { ...(D4.socles || {}) };
    if (s) {
      const r = await ui.ask(`Un miroir de poche est posé ici, tourné « ${s} ».`, ['Le faire pivoter', 'Le reprendre', 'Rien']);
      if (r === 0) socles[k] = s === '/' ? '\\' : '/'; else if (r === 1) delete socles[k]; else return;
    } else {
      if (this.miroirsEnPoche(d) <= 0) { await ui.say(d.textes.socleSans); return; }
      const r = await ui.ask(`${d.textes.socleVide} (${this.miroirsEnPoche(d)} en poche)`, ['Poser un miroir « / »', 'Poser un miroir « \\ »', 'Rien']);
      if (r === 0) socles[k] = '/'; else if (r === 1) socles[k] = '\\'; else return;
    }
    g.sound.sfx('select');
    await this.maj(d, 's4', { socles });
    this.lumiere(d);
  },
  lettre(d, x, y) { const P = this.carteDe(d, this.salleDe(d, 'lumiere')).donjon.plan; return Object.entries(P.objets).find(([, l]) => l.some(([a, b]) => a === x && b === y))?.[0]; },
  /** les deux faisceaux du brasier allumé : cases traversées et soleils touchés */
  calculLumiere(d) {
    const m = this.carteDe(d, this.salleDe(d, 'lumiere')), P = m.donjon.plan, D4 = this.dm(d, 's4');
    if ((D4.feux || 0) < 5) return { traits: [], soleils: [] };
    const miroirs = new Map();
    for (const [c, l] of Object.entries(P.objets)) for (const [x, y] of l) {
      const o = d.objets[c], k = cle(x, y);
      if (o.type === 'miroirFixe') miroirs.set(k, D4.orient?.[k] ?? o.sens);
      if (o.type === 'socle' && D4.socles?.[k]) miroirs.set(k, D4.socles[k]);
    }
    const cibles = new Set((P.objets.L || []).map(([x, y]) => cle(x, y)));
    const socles = new Set((P.objets.o || []).map(([x, y]) => cle(x, y)));
    // la lumière passe au-dessus des socles vides ; murs, portes et décor l'arrêtent
    const bloque = (x, y) => { const t = m.get(x, y); return t === T.CAVEWALL || (t === T.BLOCK && !socles.has(cle(x, y))); };
    const [bx, by] = P.objets.F[0], traits = [], soleils = [];
    for (const [dx, dy] of [[-1, 0], [1, 0]]) {
      const r = faisceau(bx, by, dx, dy, miroirs, bloque, cibles);
      traits.push([[bx, by], ...r.cases]);
      if (r.touche) soleils.push(r.touche);
    }
    return { traits, soleils };
  },
  /** recalcule la lumière, éclaire les soleils, ouvre la grande porte */
  lumiere(d) {
    const s = this.salleDe(d, 'lumiere'), D4 = this.dm(d, s.id), L = this.calculLumiere(d);
    this.lumiereVue = null;
    const avant = (D4.soleils || []).slice().sort().join('|'), apres = L.soleils.slice().sort().join('|');
    const tous = L.soleils.length >= (this.carteDe(d, s).donjon.plan.objets.L || []).length && L.soleils.length > 0;
    if (avant !== apres || (tous && !this.etats[d.id].salles[s.id].faite)) {
      this.maj(d, s.id, { soleils: L.soleils }, tous ? { faite: true } : {}).then(() => {
        if (L.soleils.length > (D4.soleils || []).length) this.game.sound.sfx('pc');
      });
    }
  },
  /** à chaque image : faisceaux dessinés (refaits quand la carte ou l'état change) */
  dessinerLumiere(d, dessiner = dessinerFaisceaux) {
    const v = this.game.view;
    if (this.game.mapObj !== this.carteDe(d, this.salleDe(d, 'lumiere'))) { this.lumiereVue = null; return; }
    if (this.lumiereVue && v.__faisceauxRoot === v.root) return;
    this.lumiereVue = true;
    dessiner(v, this.calculLumiere(d).traits);
  },

  /** après un pas dans la salle du brasier : rencontres de Feu (Feu Follet) et de Glace (Eau Fraîche, brasier éteint) */
  async rencontreMiroirs(d) {
    const g = this.game, p = g.player, m = g.mapObj, s = this.salleDe(d, 'lumiere');
    // plus aucune rencontre une fois le brasier allumé
    if (m !== this.carteDe(d, s) || (this.dm(d, s.id).feux || 0) >= 5) return;
    if (m.get(p.x, p.y) !== T.CAVE || g.bv.alive || Math.random() > 0.08) return;
    const tot = d.rencontres.reduce((a, e) => a + e[3], 0); let r = Math.random() * tot, e = d.rencontres[0];
    for (const x of d.rencontres) { r -= x[3]; if (r <= 0) { e = x; break; } }
    const wild = createMon(e[0], e[1] + Math.floor(Math.random() * (e[2] - e[1] + 1)), { met: d.nom });
    g.busy = true;
    try {
      const res = await g.runBattle({ wild, noWhiteout: true });
      if (res === 'lose') { await this.defaite(d); return; }
      if (res !== 'win') return;
      const D4 = this.dm(d, s.id);
      if (d.feu.includes(e[0])) {
        await this.maj(d, s.id, { tenus: (D4.tenus || 0) + 1 });
        g.sound.sfx('item'); await g.ui.say(d.textes.feuFollet);
      } else if (d.glace.includes(e[0])) {
        g.give('eau-fraiche'); g.sound.sfx('item');
        await g.ui.say([d.textes.froid, d.textes.eauFraiche]);
        const n = D4.feux || 0;
        if (n > 0 && n < 5) { await this.maj(d, s.id, { feux: 0 }); g.sound.sfx('run'); await g.ui.say(d.textes.eteint); this.lumiere(d); }
      }
    } finally { g.busy = false; }
  },

  /* ---------------- salle du reflet ---------------- */
  zoneReflet(d) { const s = this.salleDe(d, 'reflet'); return { s, m: this.carteDe(d, s), ligne: s.ligne + 1 }; },
  placerReflet(d) {
    const [x, y] = this.zoneReflet(d).m.donjon.plan.objets.K[0];
    this.reflet = { x, y, move: null, run: this.etats[d.id].run, d };
  },
  refletActif(d) { const g = this.game; return !!this.reflet && !!g.state && g.mapObj === this.zoneReflet(d).m && !this.etats[d.id].salles[this.zoneReflet(d).s.id].faite; },
  /** le joueur ne passe pas la ligne du miroir ; renvoie true si le pas est refusé */
  barriereReflet(d, tx, ty) { return this.refletActif(d) && ty < this.zoneReflet(d).ligne; },
  /** le joueur vient de partir dans la direction dir : le reflet fait le pas symétrique */
  refleterPas(d, dir) {
    if (!this.refletActif(d)) return;
    const g = this.game, m = g.mapObj, R = this.reflet, Z = this.zoneReflet(d), p = g.player;
    const [dx, dy] = DIRS[refleter(dir)], tx = R.x + dx, ty = R.y + dy;
    const libre = m.in(tx, ty) && walkable(m.get(tx, ty)) && ty <= Z.ligne
      && !(p.move && p.move.tx === tx && p.move.ty === ty) && !(p.x === tx && p.y === ty);
    R.dir = refleter(dir);
    if (!libre) return;
    R.move = { fx: R.x, fy: R.y, t: 0, dur: p.move?.dur || 0.26 }; R.x = tx; R.y = ty;
  },
  occupeReflet(x, y) { const R = this.reflet; return !!R && this.refletActif(R.d) && ((R.x === x && R.y === y) || (R.move && R.move.fx === x && R.move.fy === y)); },
  async dessinerReflet(dt) {
    const R = this.reflet, g = this.game, v = g.view;
    if (!R || !this.refletActif(R.d)) { if (v.actors.has('copycat')) v.removeActor('copycat'); return; }
    if (!this.imgCopycat) { if (!this.chargeCopycat) this.chargeCopycat = loadImg(IMAGES.copycat).then((im) => { this.imgCopycat = im; }); return; }
    let x = R.x, y = R.y;
    if (R.move) { R.move.t += dt / R.move.dur; const u = Math.min(1, R.move.t); x = R.move.fx + (R.x - R.move.fx) * u; y = R.move.fy + (R.y - R.move.fy) * u; if (R.move.t >= 1) R.move = null; }
    const a = v.imageActor('copycat', this.imgCopycat, 1.2);
    v.place(a, x, y, R.move ? Math.abs(Math.sin(R.move.t * Math.PI)) * 0.08 : 0);
  },
  /** un pas plus loin : Copycat est-il sur la case visée ? */
  async parlerReflet(d) {
    const g = this.game, ui = g.ui, p = g.player, [dx, dy] = DIRS[p.dir], R = this.reflet;
    if (!this.refletActif(d) || R.x !== p.x + dx || R.y !== p.y + dy || R.move) return false;
    g.busy = true;
    try {
      await ui.say(d.textes.copycat, { speaker: 'Copycat' });
      const res = await this.combat({ cls: 'Mime', nom: 'Copycat', bs: 'copycat_combat' }, copieSoignee(g.state.party));
      if (res !== 'win') { await ui.say(d.textes.copycatGagne); this.placerReflet(d); await this.defaite(d); return true; }
      await ui.say(d.textes.copycatBattu, { speaker: 'Copycat' });
      await this.trophee(d);
      for (const [k, n] of Object.entries(d.recompense.objets)) { g.give(k, n); g.sound.sfx('item'); await ui.say(`${g.state.name} reçoit ${n > 1 ? n + ' × ' : ''}${itemName(k)} !`); }
      await this.maj(d, this.zoneReflet(d).s.id, {}, { faite: true, fini: true });
      g.sound.play('victory');
      await ui.say(d.textes.fin);
      const [x, y] = g.world.maps[d.carte].donjon.plan.depart;
      await g.warp({ map: d.carte, x, y, dir: 'up' }, 'exit');
    } finally { g.busy = false; }
    return true;
  },
  async plaque(d) {
    const g = this.game;
    await g.ui.say(d.textes.plaque);
    if (this.etats[d.id].salles[this.zoneReflet(d).s.id].faite) return;
    if (!(await g.ui.yesNo('Revenir à l\'entrée de la salle et recommencer ?'))) return;
    await this.recommencerReflet(d);
  },
  async recommencerReflet(d) {
    const g = this.game, m = this.zoneReflet(d).m, [x, y] = m.donjon.plan.depart;
    this.placerReflet(d);
    await g.warp({ map: m.id, x, y, dir: 'up' }, 'exit');
  },

  /* ---------------- PC d'aide (salles à casse-tête, posé quand on le demande) ---------------- */
  async pcAide(d, s) {
    const g = this.game, ui = g.ui, A = s.aide || {}, D = this.dm(d, s.id);
    const opts = [];
    if (A.indice) opts.push(['Un indice', 'indice']);
    if (A.simplifier) opts.push([D.simple ? 'Remettre la salle comme avant' : 'Simplifier la salle', 'simplifier']);
    if (A.resoudre) opts.push(['Résoudre et passer à la salle suivante', 'resoudre']);
    opts.push(['Rien', 'rien']);
    const r = opts[await ui.ask('Un vieux PC. L\'écran affiche : « Besoin d\'aide pour cette salle ? »', opts.map(([l]) => l))][1];
    if (r === 'rien') return;
    const aides = [...(D.aides || [])];
    if (r === 'indice') {
      const ch = this.indiceGlace(d, s);
      if (!ch) { await ui.say('« Plus rien à trouver ici. Le passage est en haut de la salle. »'); return; }
      aides.push('indice');
      await this.maj(d, s.id, { aides });
      g.sound.sfx('pc');
      await ui.say(ch.but === 'sortie' ? '« Tu as tous les miroirs de poche. Voici le chemin vers la sortie. »' : '« Voici le chemin vers le miroir de poche le plus proche. Il reste tracé au sol jusqu\'à ce que tu le ramasses. »');
      return;
    }
    if (r === 'simplifier') {
      const on = !D.simple;
      if (on) aides.push('simplifier');
      await this.maj(d, s.id, { simple: on, aides });
      this.effacerIndice();
      g.sound.sfx('pc'); g.view.shake = 0.15;
      await ui.say(on ? '« La salle a été simplifiée : de nouvelles prises sont apparues sur la glace. »' : '« La salle est revenue comme avant. »');
      return;
    }
    if (!(await ui.yesNo('Passer directement à la salle suivante ? Le PC te donnera les miroirs de poche qui te manquent.'))) return;
    const m = this.carteDe(d, s), P = m.donjon.plan, pris = { ...(D.pris || {}) };
    for (const [c, l] of Object.entries(P.objets)) if (d.objets[c].type === 'miroirPoche' && !d.objets[c].piege) for (const [x, y] of l) if (!pris[cle(x, y)]) pris[cle(x, y)] = 'poche';
    aides.push('résolu');
    await this.maj(d, s.id, { pris, aides });
    this.effacerIndice();
    g.sound.sfx('item');
    await ui.say(`« Salle résolue. » ${g.state.name} a maintenant ${this.miroirsEnPoche(d)} miroirs de poche.`);
    const w = m.donjon.versSuivante;
    if (w) await g.warp(w, 'exit');
  },
  /** chemin en glissant vers le miroir de poche le plus proche (ou la sortie), tracé au sol */
  indiceGlace(d, s) {
    const g = this.game, m = this.carteDe(d, s), P = m.donjon.plan, D = this.dm(d, s.id), p = g.player;
    const buts = new Set();
    for (const [c, l] of Object.entries(P.objets)) if (d.objets[c].type === 'miroirPoche' && !d.objets[c].piege) for (const [x, y] of l) if (!D.pris?.[cle(x, y)]) for (const [dx, dy] of Object.values(DIRS)) buts.add(cle(x + dx, y + dy));
    const but = buts.size ? 'miroir' : 'sortie';
    if (!buts.size) { if (!P.suivante) return null; buts.add(cle(...P.suivante)); }
    const libre = (x, y) => m.in(x, y) && walkable(m.get(x, y));
    const ch = cheminGlace(m.glace, libre, p.x, p.y, buts);
    if (!ch) return null;
    this.indice = { carte: m.id, traits: [ch], dessine: false };
    return { but, ch };
  },
  effacerIndice() { if (this.indice) { this.indice = null; if (this.game.view.__faisceaux) dessinerFaisceaux(this.game.view, []); } },
  /** journal : la quête des miroirs de poche (et l'aide reçue du PC) */
  queteJournal(d, q) {
    if (q.id !== 'poche') return null;
    const D = this.dm(d, q.salle), n = Object.values(D.pris || {}).filter((v) => v === 'poche').length;
    const aides = D.aides || [], note = aides.length ? `\nAide du PC : ${[...new Set(aides)].join(', ')}.` : '';
    return { faite: n >= 3, txt: (n >= 3 ? 'Terminée.' : `${q.but} (${n}/3)`) + note };
  },

  /* ---------------- branchements (jeu.js du labo et classe Donjons) ---------------- */
  /** le donjon des miroirs où se trouve le joueur, s'il y est */
  miroirsIci() { for (const d of this.defs.values()) if (estMiroirs(d) && this.estDans(d)) return d; return null; },
  tickMiroirs(dt) {
    const d = this.miroirsIci(), g = this.game;
    // la salle du reflet se voit de plus haut
    const vue = d && g.mapObj?.salle ? d.salles.find((s) => s.id === g.mapObj.salle)?.vue || 1 : 1;
    if (g.state && vue !== this.vueVoulue) { this.vueVoulue = vue; g.onVue?.(vue); }
    if (!d) { if (g.view.actors.has('copycat')) g.view.removeActor('copycat'); return; }
    // indice du PC : tracé au sol tant qu'on est dans sa salle
    if (this.indice && g.mapObj.id === this.indice.carte && (!this.indice.dessine || g.view.__faisceauxRoot !== g.view.root)) { dessinerFaisceaux(g.view, this.indice.traits); this.indice.dessine = true; }
    if (this.salleDe(d, 'lumiere')) this.dessinerLumiere(d);
    if (this.salleDe(d, 'reflet')) this.dessinerReflet(dt);
  },
  /** pas pris en charge ici (glissade sur la glace, ligne du miroir) : renvoie true si le pas est traité */
  pasSpecial(dir) {
    const d = this.miroirsIci(); if (!d) return false;
    const g = this.game, p = g.player, m = g.mapObj, [dx, dy] = DIRS[dir];
    if (this.barriereReflet(d, p.x + dx, p.y + dy)) {
      p.dir = dir; p.walking = false;
      if (p.bumpT <= 0) { g.sound.sfx('bump'); p.bumpT = 0.3; }
      return true;
    }
    if (!m.glace?.size || !(m.glace.has(cle(p.x, p.y)) || m.glace.has(cle(p.x + dx, p.y + dy)))) return false;
    const libre = (x, y) => m.in(x, y) && walkable(m.get(x, y)) && !g.occupied(x, y) && m.height(x, y) === m.height(p.x, p.y);
    const ch = glisser(m.glace, libre, p.x, p.y, dx, dy);
    if (ch.length < 2) return false;
    const [tx, ty] = ch[ch.length - 1];
    p.dir = dir; p.walking = false;
    p.move = { fx: p.x, fy: p.y, tx, ty, t: 0, dur: Math.max(0.14, 0.085 * ch.length), glisse: true };
    g.sound.sfx('ledge');
    return true;
  },
  apresDepart(dir) { const d = this.miroirsIci(); if (d && this.salleDe(d, 'reflet')) this.refleterPas(d, dir); },
  occupe(x, y) { return this.occupeReflet(x, y); },
  async interagir() { const d = this.miroirsIci(); return !!d && !!this.salleDe(d, 'reflet') && this.parlerReflet(d); },
  async apresPas(mv) { const d = this.miroirsIci(); if (d && !mv?.glisse && this.salleDe(d, 'lumiere')) await this.rencontreMiroirs(d); },
  /** dans la salle du reflet : on peut revenir à l'entrée de la salle depuis le menu */
  dansLeReflet() { const d = this.miroirsIci(); return !!d && !!this.salleDe(d, 'reflet') && this.refletActif(d); },
  async recommencerSalle() { const d = this.miroirsIci(); if (d) await this.recommencerReflet(d); },
  /** objets de quête du donjon des miroirs (journal) */
  objetsJournal(d) {
    if (!estMiroirs(d)) return [];
    const l = [], n = this.miroirsEnPoche(d), f = this.dm(d, 's4').tenus || 0;
    if (n > 0) l.push({ label: 'Miroir de poche', right: '×' + n, txt: 'Un petit miroir intact. Il se pose sur un socle de la Salle du Brasier. Il disparaît si tu quittes le donjon.' });
    if (f > 0) l.push({ label: 'Feu Follet', right: '×' + f, txt: 'Une petite flamme qui ne brûle pas les doigts. Elle se jette dans le brasier.' });
    return l;
  },
};
