// testodyssee/js/donjon/temple.js — mécaniques du Temple des Éléments, ajoutées à la classe Donjons (jeu.js) :
// la dalle d'or et la grande porte (pour un seul joueur), les décors des chemins, les clés et la porte aux trois
// gemmes, le téléporteur du solo, et la table derrière le Gardien : trois Poké Balls à se partager (deux joueurs qui
// veulent la même se départagent en duel), ou Évoli du Temple et une pierre au choix.
// L'avancée passe par les actions d'etat.js (« maj », « choixStarter », « starterDuelFin ») : l'hôte fait autorité.
import { T } from '../../../odyssee/js/world/tiles.js';
import { ASSETS } from '../../../odyssee/js/assets.js';
import { el, esc } from '../../../odyssee/js/ui/ui.js';
import { SPECIES } from '../../../odyssee/js/data/species.js';
import { healFull } from '../../../odyssee/js/core/mon.js';
import { itemName } from '../../../odyssee/js/core/items.js';
import { battu, resoudreStarters } from './etat.js';
import { STARTERS_TEMPLE, TEMPLE } from '../formes.js';

const cle = (x, y) => x + ',' + y;
const estTemple = (d) => d.id === 'temple';
const TYPES = new Set(['grandePorte', 'porteSolo', 'porteCles', 'starter', 'evoli', 'pierre']);
const TYPE_FR = { fire: 'Feu', water: 'Eau', grass: 'Plante', normal: 'Normal', steel: 'Acier', flying: 'Vol', poison: 'Poison' };
const NOM_CLE = { f: 'Clé du Feu', e: 'Clé de l\'Eau', p: 'Clé de la Plante' };
const IMG_CLE = { f: 'cle_feu', e: 'cle_eau', p: 'cle_plante' };
/** niveau à atteindre (au moins un Pokémon) pour la dalle d'or */
export const NIVEAU_DALLE = 40;
const NIVEAU_STARTER = 15, NIVEAU_EVOLI = 45;

export const Temple = {
  poserObjetsTemple(d, m) {
    if (!estTemple(d)) return;
    const P = m.donjon.plan;
    for (const [c, l] of Object.entries(P.objets)) {
      const o = d.objets[c];
      for (const [x, y] of l) {
        if (o.type === 'tuile') m.set(x, y, T[o.t]);
        if (TYPES.has(o.type)) m.object(x, y, { use: () => this.objetTemple(d, m, c, x, y) });
      }
    }
    // la table : un comptoir, avec une Poké Ball dessus là où il y a quelque chose à prendre
    const balles = new Set(Object.entries(P.objets).filter(([c]) => ['starter', 'evoli', 'pierre'].includes(d.objets[c].type)).flatMap(([, l]) => l.map(([x, y]) => cle(x, y))));
    for (const dd of m.deco) if (dd.k === 'counter') { dd.front = 'counterfront'; dd.top = 'lab'; dd.ball = balles.has(cle(dd.x, dd.y)); }
    // la grande porte : un seul dessin, au milieu de ses trois cases
    if (P.objets.G) { const [x, y] = P.objets.G[1]; const dd = m.deco.find((q) => q.x === x && q.y === y); if (dd) dd.k = 'porte_grande'; }
    if (P.objets.Q) { const [x, y] = P.objets.Q[1]; const dd = m.deco.find((q) => q.x === x && q.y === y); if (dd) dd.k = 'porte_grande'; }
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
    }
    // les Poké Balls déjà données disparaissent de la table
    for (const s of d.salles.filter((q) => q.table)) {
      const m = g.world.maps[s.carte], P = m.donjon.plan, D = this.dt(d, s.id), A = D.attrib || {};
      for (const [c, l] of Object.entries(P.objets)) {
        const o = d.objets[c]; if (!['starter', 'evoli', 'pierre'].includes(o.type)) continue;
        const vide = o.type === 'starter' ? Object.values(A).includes(o.n) : o.type === 'evoli' ? !!D[`evoli:${this.moi}`] : D[`pierre:${this.moi}`] === o.objet;
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
      if (ici('X')) await this.dalleOr(d, m);
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
    const g = this.game, ui = g.ui, haut = Math.max(0, ...g.state.party.map((q) => q.lvl || 0));
    if (haut < NIVEAU_DALLE && !g.modeTest) { await ui.say(`La dalle d'or ne réagit pas. Il faudrait un Pokémon au niveau ${NIVEAU_DALLE} au moins.`); return; }
    if (this.grandeOuverte === m.id) return;
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
    if (!miennes.length) { await ui.say(n ? `Une grande porte à trois serrures. ${n}/3 clés y sont déjà.` : 'Une grande porte à trois serrures : feu, eau et plante. Il faut les trois clés des chemins.'); return; }
    if (n === 3 || g.modeTest) poser.porte = true;
    const r = await this.demande(d.id, { a: 'maj', salle: s.id, donnees: poser });
    if (!r.ok) { await ui.say('L\'hôte du salon ne répond pas...'); return; }
    g.sound.sfx('bang');
    await ui.say(`${g.state.name} met ${miennes.map((c) => `la ${NOM_CLE[c]}`).join(', ')} dans ${miennes.length > 1 ? 'les serrures' : 'sa serrure'}.${poser.porte ? '\nLes trois gemmes s\'illuminent : la porte s\'ouvre !' : `\n${n}/3 clés.`}`);
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
      case 'grandePorte': return g.ui.say(this.grandeOuverte === m.id ? 'La grande porte est ouverte.' : ['Une grande porte, ornée de trois gemmes.', `Elle ne s'ouvre que pour qui marche sur la dalle d'or avec un Pokémon au niveau ${NIVEAU_DALLE}.`]);
      case 'porteSolo': return this.porteSolo(d, o);
      case 'porteCles': return this.porteCles(d, s);
      case 'starter': return this.balleStarter(d, s, o.n);
      case 'evoli': return this.balleEvoli(d, s);
      case 'pierre': return this.pierre(d, s, o.objet);
    }
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

  /* ---------------- la table, en solo ---------------- */
  async balleEvoli(d, s) {
    const g = this.game, ui = g.ui, e = this.etats[d.id], D = this.dt(d, s.id);
    if (!battu(e, d, 'Z')) { await ui.say('Le Gardien veille encore sur la table.'); return; }
    if (D[`evoli:${this.moi}`]) { await ui.say('La Poké Ball est vide.'); return; }
    const pic = this.montrer(TEMPLE.evoli);
    let ok;
    try { ok = await ui.yesNo(`Dans cette Poké Ball : ${SPECIES[TEMPLE.evoli].n}. Le prendre ?`); } finally { pic.remove(); }
    if (!ok) return;
    const r = await this.demande(d.id, { a: 'maj', salle: s.id, donnees: { [`evoli:${this.moi}`]: true } });
    if (!r.ok) { await ui.say('L\'hôte du salon ne répond pas...'); return; }
    await g.api().giveMon(TEMPLE.evoli, NIVEAU_EVOLI, { met: d.nom });
    await ui.say('Sur la table, trois pierres. Elles ne servent qu\'à lui... et tu n\'en prendras qu\'une.');
    await this.trophee(d);
  },
  async pierre(d, s, objet) {
    const g = this.game, ui = g.ui, e = this.etats[d.id], D = this.dt(d, s.id);
    if (!battu(e, d, 'Z')) { await ui.say('Le Gardien veille encore sur la table.'); return; }
    const deja = D[`pierre:${this.moi}`];
    if (deja) { await ui.say(deja === objet ? 'Son socle est vide : tu l\'as prise.' : 'La pierre ne bouge plus de son socle : tu en as déjà pris une.'); return; }
    if (!(await ui.yesNo(`${itemName(objet)}. Elle ne fait évoluer qu'Évoli du Temple. La prendre ? Les deux autres resteront sur la table.`))) return;
    const r = await this.demande(d.id, { a: 'maj', salle: s.id, donnees: { [`pierre:${this.moi}`]: objet } });
    if (!r.ok) { await ui.say('L\'hôte du salon ne répond pas...'); return; }
    g.give(objet, 1); g.sound.sfx('item');
    await ui.say(`${g.state.name} reçoit la ${itemName(objet)} !\nElle est rangée dans le Sac.`);
  },

  /* ---------------- à chaque image ---------------- */
  tickTemple(dt) {
    const g = this.game, d = this.defs.get('temple'); if (!d) return;
    if (this.hote) { this.templeT = (this.templeT || 0) - dt; if (this.templeT <= 0) { this.templeT = 0.5; this.verifierStarters(d); } }
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
