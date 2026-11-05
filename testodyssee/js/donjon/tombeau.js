// testodyssee/js/donjon/tombeau.js — mécaniques du Tombeau du Roi Sans Nom, ajoutées à la classe Donjons (jeu.js).
//
// Un donjon solo d'infiltration. Les moines (gardes des salles -2 et -1) font leur ronde à l'heure de tous
// (donjons/tombeau-gardes.js) ; leur lanterne éclaire ce qu'ils voient ; qui y passe se fait courir dessus et jeter
// dehors (le sceptre retourne sur son socle). On endort un moine en lui parlant sans être vu, une Seringue Somnifère en
// poche ; ils se réveillent tous quand on quitte la salle. Le sceptre est au -1 (état : s1.sceptre) ; les deux brigands
// du passage du -4 ne laissent passer qu'un dresseur qui l'a et qui les bat (état : b3.duel, b3.passe).
// Toutes les salles sont dans la pénombre : une toile multipliée par-dessus l'image, éclaircie autour des flammes.
import { T } from '../../../odyssee/js/world/tiles.js';
import { ITEMS, itemName } from '../../../odyssee/js/core/items.js';
import { createMon, monName, healFull } from '../../../odyssee/js/core/mon.js';
import { ASSETS } from '../../../odyssee/js/assets.js';
import { el, esc } from '../../../odyssee/js/ui/ui.js';
import { ronde, auPas, vueGarde, PAS } from '../donjons/tombeau-gardes.js';
import { dessinerZones, dessinerZzz } from '../rendu.js';
import { HPX } from '../../../odyssee/js/render/world3d.js';
import { prisPar, battu } from './etat.js';

/** les salles que montre la carte du ruinemaniac (du -1 au -4 ; plus tard, un peu plus bas) */
const CARTE = ['s1', 's2', 'b3', 'b4a', 'b4b', 'b4c', 's3'];
const SCEPTRE = 'sceptre-roi';
const cle = (x, y) => x + ',' + y;
const estTombeau = (d) => !!d?.tombeau;
const PIEGE = 0.12, CHUTE = 0.1;
const DIRV = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
/** la pénombre de chaque salle : fond (multiplié avec l'image), rayon et couleur des flammes */
const LUMIERE = {
  normale: { fond: [74, 36, 18], r: 4.6, feu: [170, 112, 70], soi: 2.4 },
  vive: { fond: [92, 48, 24], r: 5, feu: [150, 104, 64], soi: 2.6 },
  noire: { fond: [26, 12, 6], r: 3.4, feu: [190, 120, 70], soi: 2.2 },
};
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

export const Tombeau = {
  tombeauIci() { return [...this.defs.values()].find((d) => estTombeau(d) && this.estDans(d)); },
  salleTombeau(d, m = this.game.mapObj) { return m && d.salles.find((s) => s.carte === m.id); },
  dTombeau(d, sid) { return this.etats[d.id]?.salles[sid]?.donnees || {}; },
  idGarde(d, s, i) { return `${d.id}:moine:${s.id}:${i}`; },

  /* ---------------- carte ---------------- */
  poserObjetsTombeau(d, m) {
    if (!estTombeau(d)) return;
    const P = m.donjon.plan, s = d.salles.find((q) => q.carte === m.id);
    const set = (c) => new Set((P.objets[c] || []).map(([x, y]) => cle(x, y)));
    m.tomb = { gouffres: set('_'), pieges: set('x') };
    for (const [c, l] of Object.entries(P.objets)) if (d.objets[c].type === 'relique') for (const [x, y] of l) m.object(x, y, { use: () => this.relique(d) });
    // les moines : un PNJ par ronde (sa place suit l'heure, tickTombeau)
    (s.gardes || []).forEach((G, i) => {
      const frames = ronde(G.ronde), f = auPas(frames, 0, G.decal || 0), id = this.idGarde(d, s, i);
      (this.rondes ||= {})[id] = { frames, decal: G.decal || 0, portee: G.portee || 5, relique: !!G.relique };
      m.npc({ id, x: f.x + 1, y: f.y + 1, dir: f.dir, sprite: 'pretre', move: 'static', name: G.relique ? 'Gardien du sceptre' : 'Moine gardien',
        talk: (api, vivant) => { if (vivant) this.placerMoine(vivant, true); return this.parlerGardien(d, m, id); } });
    });
    // brigands (bavards, certains se battent), les portiers du -4, le marchand
    for (const n of m.npcs) {
      const k = Object.keys(d.pnj).find((q) => `${d.id}:${d.pnj[q].id}` === n.id), Q = k && d.pnj[k]; if (!Q) continue;
      if (Q.brigand) { n.talk = () => this.brigand(d, k); n.when = () => true; }
      else if (Q.portier != null) { n.talk = () => this.portiers(d); n.when = () => !this.dTombeau(d, 'b3').passe; }
      else if (Q.boutique) { n.talk = () => this.boutique(d); n.when = () => true; }
    }
    // passages entre les étages : bords de la carte, escaliers, porte de fer fermée à clé
    for (const [c, l] of Object.entries(P.objets)) {
      const o = d.objets[c]; if (o.type !== 'lien') continue;
      const [x, y] = l[0];
      if (o.porte) { m.set(x, y, T.CAVE); m.prop('porte_grille', x, y); m.object(x, y, { use: () => this.porteFer(d, m, c) }); continue; }
      const bord = x === 0 || y === 0 || x === m.w - 1 || y === m.h - 1;
      m.set(x, y, bord ? T.CAVEDOOR : T.CAVE);
      m.deco.push({ k: bord ? 'exitlight' : 'ladder', x, y });
      m.warp(x, y, { ...this.arriveeLien(d, c), step: true });
    }
    // la place : la roche fissurée (l'entrée des pilleurs), les autres roches, le ruinemaniac
    if (m.id === d.carte && m.donjon.exterieur) {
      const E = m.donjon.exterieur, X = E.carte, [px, py] = E.porte;
      const w = X.warpAt(px, py); if (w) w.step = true;
      for (const [x, y] of E.roches) X.object(x, y, { use: () => this.roche(d, x, y) });
      const r = X.npcs.find((n) => n.id === 'tombeau-ruinemaniac'); if (r) r.talk = () => this.ruinemaniac(d);
    }
    if (ITEMS['carte-tombeau']) ITEMS['carte-tombeau'].use = async () => { await this.carteTombeau(d); return true; };
  },

  /** le décor suit l'état : le socle du sceptre, le trou des pilleurs ; le Sac suit le sceptre */
  appliquerTombeau(d) {
    if (!estTombeau(d)) return;
    const g = this.game, e = this.etats[d.id], st = g.state, pris = !!this.dTombeau(d, 's1').sceptre;
    if (this.runTombeau !== e.run) { this.runTombeau = e.run; this.reveles = new Set(); }
    if (st) { if (pris && this.estDans(d)) st.bag[SCEPTRE] = 1; else delete st.bag[SCEPTRE]; }
    for (const s of d.salles) {
      const m = g.world.maps[s.carte]; if (!m?.tomb) continue;
      for (const [x, y] of m.donjon.plan.objets.L || []) this.propTombeau(m, x, y, pris ? 'socle_vide' : 'socle_sceptre');
    }
    this.ouvrirTrou(d, !!this.dTombeau(d, 's1').trou);
  },
  /** un décor qui bloque (le socle) : change de dessin */
  propTombeau(m, x, y, k) {
    const g = this.game, dd = m.deco.find((q) => q.x === x && q.y === y);
    if (!dd || dd.k === k) return;
    dd.k = k;
    if (g.mapObj === m) { g.view.decoAt.set(cle(x, y), dd); g.view.rebuildAt(x, y); }
  },

  /* ---------------- déplacements ---------------- */
  avantPasTombeau() { return false; },
  /** après un pas : gouffres, pièges, regard des pilleurs */
  async apresPasTombeau() {
    const g = this.game, d = this.tombeauIci(); if (!d || g.busy) return;
    const m = g.mapObj, p = g.player, s = this.salleTombeau(d), T0 = m.tomb; if (!T0 || !s) return;
    const ici = cle(p.x, p.y);
    if (!T0.gouffres.has(ici)) this.sur = [m.id, p.x, p.y];
    g.busy = true;
    try {
      if (T0.gouffres.has(ici)) { await this.chute(d); return; }
      if (T0.pieges.has(ici)) await this.piege();
      const k = this.pilleurQuiVoit(d, m); if (k) await this.engager(d, k);
    } finally { g.busy = false; }
  },
  async chute() {
    const g = this.game, m = g.mapObj, [mid, x, y] = this.sur?.[0] === m.id ? this.sur : [m.id, ...m.donjon.plan.depart];
    g.sound.sfx('ledge'); g.view.shake = 0.25;
    this.blesser(CHUTE);
    await g.ui.say(['Le sol se dérobe : tu tombes dans le vide !', 'Tu te rattrapes de justesse au bord, et tu te hisses. Tes Pokémon ont été secoués.']);
    await g.warp({ map: mid, x, y, dir: g.player.dir }, 'exit');
  },
  async piege() {
    const g = this.game;
    g.sound.sfx('bang'); g.view.shake = 0.15;
    this.blesser(PIEGE);
    await g.ui.say('Aïe ! Des pointes sortent du sol !');
  },
  /** retire une part des PV max à chaque Pokémon debout */
  blesser(part) {
    for (const mon of this.game.state.party) if (mon.hp > 0) mon.hp = Math.max(1, mon.hp - Math.max(1, Math.ceil(mon.stats[0] * part)));
  },
  /** à l'entrée de la salle, l'équipe à un tiers de ses PV */
  async reveil(d) {
    const g = this.game, m = d.cartes.includes(g.mapObj?.id) ? g.mapObj : g.world.maps[d.carte], [x, y] = m.donjon.plan.depart;
    for (const mon of g.state.party) { mon.hp = Math.max(mon.hp, Math.ceil(mon.stats[0] / 3)); mon.status = null; }
    await g.warp({ map: m.id, x, y, dir: 'up' }, 'exit');
    await g.ui.say('Tu reprends tes esprits à l\'entrée de la salle. Tes Pokémon ont retrouvé un peu de forces.');
  },
  /** perdre un combat dans le tombeau : pas de soin complet */
  async defaiteTombeau(d) { await this.game.ui.say('Tes Pokémon n\'en peuvent plus...'); await this.reveil(d); },

  /* ---------------- pilleurs (-4) ---------------- */
  /** le pilleur qui voit le joueur (en ligne droite devant lui, trois cases) */
  pilleurQuiVoit(d, m) {
    const g = this.game, p = g.player, e = this.etats[d.id];
    for (const n of m.npcs) {
      const k = Object.keys(d.pnj).find((q) => `${d.id}:${d.pnj[q].id}` === n.id), P = k && d.pnj[k];
      if (!P?.pilleur || battu(e, d, k) || (n.when && !n.when())) continue;
      const pris = prisPar(e, d, k); if (pris && pris !== this.moi) continue;
      const [dx, dy] = DIRV[n.dir] || [0, 1];
      for (let i = 1; i <= 3; i++) {
        const x = n.x + dx * i, y = n.y + dy * i;
        if (x === p.x && y === p.y) return k;
        const t = m.get(x, y);
        if (t === T.CAVEWALL || t === T.BLOCK || m.tomb.gouffres.has(cle(x, y))) break;
      }
    }
    return null;
  },
  async engager(d, k) {
    const g = this.game, P = d.pnj[k];
    g.sound.sfx('encounter');
    await g.ui.say(`${P.cls} ${P.nom} : « ${P.defi} »`);
    const r = await this.demande(d.id, { a: 'prendre', pnj: k });
    if (!r.ok) return;
    const res = await this.combat(P, this.equipe(P.equipe));
    if (res === 'win') await this.demande(d.id, { a: 'gagne', pnj: k });
    else { await this.demande(d.id, { a: 'lacher', pnj: k }); await this.defaite(d); }
  },
  equipe(l) { return l.map(([sp, lvl]) => createMon(sp, lvl, { iv: Array(6).fill(Math.min(31, 10 + lvl / 2 | 0)), shiny: false })); },

  /* ---------------- la place : le ruinemaniac et l'entrée des pilleurs ---------------- */
  async ruinemaniac(d) {
    const g = this.game, ui = g.ui, st = g.state, qui = { speaker: 'Ruinemaniac' };
    if (st.bag['cle-ruinemaniac']) {
      await ui.say(this.dTombeau(d, 's1').trou
        ? ['Le passage est ouvert ? Parfait.', 'Rappelle-toi : sans le sceptre du roi, la dernière salle ne s\'ouvrira pas. Il est au -1.', 'Et rapporte-moi le trésor. Tu ne le regretteras pas.']
        : ['Alors, cette roche ? Elle est au bord est de la place. Celle qui est fissurée.', 'Un Pokémon costaud avec Force, et elle roulera.'], qui);
      return;
    }
    await ui.say(['Psst, gamin ! Viens par là.', 'Je vois que t\'as l\'air d\'un dresseur drôlement costaud. J\'ai un plan à te proposer.',
      'L\'entrée du tombeau est bien gardée : impossible d\'y entrer par là. Mais il existe un autre accès, connu seulement des pilleurs.',
      'Une roche fissurée, au bord est de la place. Pousse-la avec Force : dessous, il y a un trou qui descend au -3, dans le repaire des brigands.',
      'Le trésor du Roi Sans Nom dort tout au fond, dans la salle de sa sépulture. Elle est scellée.',
      'Pour l\'ouvrir, il faut absolument son sceptre. Il est gardé tout en haut, au -1. Il faudra remonter le chercher, puis redescendre avec.',
      'Du -3, une porte de fer mène au -2. Voici sa clé : je l\'ai gardée de ma jeunesse.',
      'Va me chercher le trésor. En échange, je te donnerai une récompense qui va te plaire, crois-moi.'], qui);
    if (!(await ui.yesNo('Marché conclu ?', qui))) { await ui.say('Réfléchis bien. Je ne bouge pas d\'ici.', qui); return; }
    g.give('cle-ruinemaniac', 1); g.give('carte-tombeau', 1); g.sound.sfx('item');
    await ui.say([`${st.name} reçoit la Clé de Fer !`, `${st.name} reçoit la Carte du Tombeau !`]);
    await ui.say('Sur la carte, j\'ai noté ce que je connais : du -1 au -4. Plus bas, personne n\'est revenu pour me le dire.', qui);
  },
  async roche(d, x, y) {
    const g = this.game, ui = g.ui, E = g.world.maps[d.carte].donjon.exterieur, vraie = E.porte[0] === x && E.porte[1] === y;
    if (!vraie) return;
    if (this.dTombeau(d, 's1').trou) return;
    const look = 'Cette roche semble anormalement fissurée. Elle a l\'air de pouvoir bouger.';
    if (!g.hasField('force')) { await ui.say([look, 'Un Pokémon très costaud pourrait la pousser.']); return; }
    if (!(await ui.yesNo(`${look}\nUtiliser Force ?`))) return;
    const mon = g.fieldUser(); if (mon) g.sound.cry(ASSETS.cry(mon.sp));
    const r = await this.demande(d.id, { a: 'maj', salle: 's1', donnees: { trou: true } });
    if (!r.ok) { await ui.say('L\'hôte du salon ne répond pas...'); return; }
    g.sound.sfx('ledge'); g.view.shake = 0.3;
    await ui.say([`${mon ? monName(mon) : 'Ton Pokémon'} utilise Force !`, 'La roche roule sur le côté : dessous, un trou ! Une vieille échelle descend dans le noir.']);
  },
  /** le trou des pilleurs : la roche fissurée laisse place à une échelle (on y descend en marchant dessus) */
  ouvrirTrou(d, ouvert) {
    if (this.trouOuvert === ouvert) return;
    this.trouOuvert = ouvert;
    const g = this.game, E = g.world.maps[d.carte].donjon.exterieur; if (!E) return;
    const X = E.carte, [x, y] = E.porte;
    if (ouvert) { X.set(x, y, T.SAND); X.under.delete(cle(x, y)); X.deco = X.deco.filter((q) => !(q.x === x && q.y === y)); X.deco.push({ k: 'ladder', x, y }); }
    else if (!X.deco.some((q) => q.x === x && q.y === y && q.k === 'rocher_grand')) { X.deco = X.deco.filter((q) => !(q.x === x && q.y === y)); X.prop('rocher_grand', x, y); }
    if (g.mapObj === X) { g.view.decoAt.set(cle(x, y), X.deco.find((q) => q.x === x && q.y === y)); g.view.rebuildAt(x, y); }
  },

  /* ---------------- la carte du ruinemaniac : du -1 au -4 ---------------- */
  async carteTombeau(d) {
    const g = this.game, ui = g.ui, salles = CARTE.map((id) => d.salles.find((s) => s.id === id)).filter(Boolean);
    let vue = salles.find((s) => g.world.maps[s.carte] === g.mapObj) || salles[0];
    const box = el('div', 'box mine-plan'); ui.root.appendChild(box);
    const titre = el('div', 'mine-titre'), cv = document.createElement('canvas'); box.append(titre, cv);
    const dessiner = () => this.dessinerCarte(d, vue, cv, titre);
    dessiner(); const iv = setInterval(dessiner, 300);
    try {
      for (;;) {
        const items = salles.map((s) => { const e = /\((-\d+)\)/.exec(s.nom); return { label: `${e ? e[1] + ' · ' : ''}${s.nom.replace(/\s*\(.*\)/, '')}` }; });
        items.push({ label: 'Ranger la carte' });
        const k = await ui.list({ title: 'Carte du Tombeau', items, cls: 'shop mine-menu', cancel: items.length - 1, start: salles.indexOf(vue) });
        if (k < 0 || k >= salles.length) return;
        vue = salles[k]; g.sound.sfx('select');
      }
    } finally { clearInterval(iv); box.remove(); }
  },
  /** une salle sur la carte : sol, passages (avec leur destination), le sceptre, toi */
  dessinerCarte(d, s, cv, titre) {
    const g = this.game, m = g.world.maps[s.carte], P = m.donjon.plan, Z = 9;
    if (cv.width !== m.w * Z) { cv.width = m.w * Z; cv.height = m.h * Z; }
    const x = cv.getContext('2d');
    x.fillStyle = '#1a0f08'; x.fillRect(0, 0, cv.width, cv.height);
    for (const [i, j] of P.sol) { x.fillStyle = '#b98a56'; x.fillRect(i * Z, j * Z, Z, Z); }
    const marque = (i, j, col, txt) => {
      x.fillStyle = col; x.fillRect(i * Z - 1, j * Z - 1, Z + 2, Z + 2);
      if (!txt) return;
      x.font = 'bold 11px sans-serif'; x.textBaseline = 'middle'; x.textAlign = i > m.w / 2 ? 'right' : 'left';
      const tx = i > m.w / 2 ? i * Z - 3 : i * Z + Z + 3;
      x.strokeStyle = '#000'; x.lineWidth = 3; x.strokeText(txt, tx, j * Z + Z / 2); x.fillStyle = '#fff'; x.fillText(txt, tx, j * Z + Z / 2);
    };
    const court = (id) => (d.salles.find((q) => q.id === id)?.nom || '').replace(/\s*\(.*\)/, '');
    for (const [c, l] of Object.entries(P.objets)) {
      const o = d.objets[c];
      if (o.type === 'lien') marque(l[0][0], l[0][1], o.porte ? '#7a8090' : '#e0a040', `${o.porte ? 'Porte de fer → ' : '→ '}${court(o.vers)}`);
      else if (o.type === 'relique') marque(l[0][0], l[0][1], '#a050c8', 'Sceptre du Roi');
    }
    if (P.suivante) marque(P.suivante[0], P.suivante[1], '#e0a040', '→ plus bas');
    if (s === d.salles[0]) marque(P.depart[0], P.depart[1], '#e8c840', 'Trou des pilleurs');
    if (g.mapObj === m) { x.fillStyle = '#fff'; x.beginPath(); x.arc(g.player.x * Z + Z / 2, g.player.y * Z + Z / 2, Z * 0.7, 0, 7); x.fill(); x.strokeStyle = '#000'; x.lineWidth = 2; x.stroke(); }
    titre.innerHTML = `<b>${esc(s.nom)}</b> · <span class="mine-leg"><i style="background:#e0a040"></i>passage <i style="background:#7a8090"></i>porte de fer <i style="background:#a050c8"></i>sceptre <i style="background:#fff"></i>toi</span>`;
  },

  /* ---------------- passages entre les étages ---------------- */
  /** où l'on arrive par le passage c : à côté du passage d'en face, dans l'autre salle */
  arriveeLien(d, c) {
    const o = d.objets[c], s = d.salles.find((q) => q.id === o.vers), m = this.game.world.maps[s.carte], P = m.donjon.plan, [x, y] = P.objets[o.cible][0];
    const sol = new Set(P.sol.map(([a, b]) => a + ',' + b)), bloque = new Set([...P.decor.map(([, a, b]) => a + ',' + b), ...Object.values(P.pnj).flat().map(([a, b]) => a + ',' + b), ...Object.entries(P.objets).filter(([k]) => !d.objets[k].sol).flatMap(([, l]) => l.map(([a, b]) => a + ',' + b))]);
    for (const [dx, dy, dir] of [[0, 1, 'down'], [0, -1, 'up'], [1, 0, 'right'], [-1, 0, 'left']]) {
      const k = (x + dx) + ',' + (y + dy);
      if (sol.has(k) && !bloque.has(k)) return { map: m.id, x: x + dx, y: y + dy, dir };
    }
    return { map: m.id, x: P.depart[0], y: P.depart[1], dir: 'up' };
  },
  /** la porte de fer entre le -3 et le -2 : la Clé de Fer du ruinemaniac l'ouvre, dans les deux sens */
  async porteFer(d, m, c) {
    const g = this.game, ui = g.ui;
    if (!g.state.bag['cle-ruinemaniac']) { await ui.say('Une lourde porte de fer, fermée à clé.'); return; }
    g.sound.sfx('door');
    await g.warp(this.arriveeLien(d, c), 'door');
  },

  /* ---------------- les moines ---------------- */
  dorment(d, s) { return this.dTombeau(d, s.id).dorment || []; },
  pasMoines() { return Math.floor(Date.now() / 1000 / PAS); },
  /** le moine à sa place de la ronde ; en marchant, il glisse d'une case à la suivante */
  placerMoine(n, fige) {
    const R = this.rondes?.[n.id]; if (!R) return;
    const f = auPas(R.frames, this.pasMoines(), R.decal), x = f.x + 1, y = f.y + 1;
    if (fige || (n.x === x && n.y === y)) { n.dir = f.dir; return; }
    if (n.move) return;
    if (Math.abs(n.x - x) + Math.abs(n.y - y) === 1) { n.move = { fx: n.x, fy: n.y, t: 0, dur: PAS * 0.92 }; n.x = x; n.y = y; n.step++; }
    else { n.x = x; n.y = y; }
    n.dir = f.dir;
  },
  solideTombeau(m) { return (x, y) => { const t = m.get(x, y); return t === T.CAVEWALL || t === T.BLOCK || t === T.CAVEDOOR; }; },
  /** le tombeau est sombre : on voit bien près des flammes (et un peu autour de soi), de moins en moins en s'en éloignant ;
   *  les lanternes des moines éclairent ce qu'ils voient */
  eclairerTombeau(s, m, moines) {
    const g = this.game, v = g.view, root = g.ui.root;
    let cv = this.nuit;
    if (!s || !v?.camera) { if (cv) cv.style.display = 'none'; return; }
    if (!cv) { cv = this.nuit = document.createElement('canvas'); cv.className = 'tombeau-nuit'; }
    // juste au-dessus de l'image du jeu, sous l'interface : la toile s'y multiplie (mix-blend-mode)
    if (cv.parentElement !== root.parentElement) root.parentElement.insertBefore(cv, root);
    cv.style.display = '';
    const C = v.renderer.domElement.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.round(C.width * dpr), H = Math.round(C.height * dpr);
    Object.assign(cv.style, { left: C.left + 'px', top: C.top + 'px', width: C.width + 'px', height: C.height + 'px' });
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const V = v.camera.position.constructor, proj = (x, y, h) => {
      const p = new V(x + 0.5, h * HPX, y + 0.55).project(v.camera);
      return [(p.x + 1) / 2 * C.width * dpr, (1 - p.y) / 2 * C.height * dpr];
    };
    const px = g.player, a = proj(px.x, px.y, 0), b = proj(px.x + 1, px.y, 0), case_ = Math.hypot(b[0] - a[0], b[1] - a[1]) || 32 * dpr;
    const x = cv.getContext('2d'), t = performance.now() / 1000, L = LUMIERE[s.lumiere] || LUMIERE.normale;
    x.globalCompositeOperation = 'source-over'; x.fillStyle = `rgb(${L.fond.join(',')})`; x.fillRect(0, 0, W, H);
    const feux = (m.deco || []).filter((q) => q.k === 'torche' || q.k === 'brasero' || q.k === 'lanterne'), lum = [];
    feux.forEach((q, i) => lum.push([...proj(q.x, q.y, 6), case_ * L.r * (1 + 0.035 * Math.sin(t * 7.3 + i * 1.7) + 0.02 * Math.sin(t * 13.1 + i)), L.feu]));
    lum.push([...proj(v.focus.x - 0.5, v.focus.z - 0.5, 10), case_ * L.soi, [70, 50, 36]]);
    // la lanterne d'un moine : un halo sur lui, et la lumière jaune de son regard
    for (const [n, vue] of moines) {
      const mx = n.move ? n.move.fx + (n.x - n.move.fx) * Math.min(1, n.move.t) : n.x, my = n.move ? n.move.fy + (n.y - n.move.fy) * Math.min(1, n.move.t) : n.y;
      lum.push([...proj(mx, my, 14), case_ * 1.8, [120, 96, 50]]);
      for (const [cx, cy] of vue) lum.push([...proj(cx, cy, 0), case_ * 1.05, [130, 104, 34]]);
    }
    x.globalCompositeOperation = 'lighter';
    for (const [cx, cy, r, [cr, cg, cb]] of lum) {
      if (cx < -r || cy < -r || cx > W + r || cy > H + r) continue;
      const gr = x.createRadialGradient(cx, cy, 0, cx, cy, r);
      gr.addColorStop(0, `rgb(${cr},${cg},${cb})`); gr.addColorStop(0.3, `rgba(${cr},${cg},${cb},0.8)`); gr.addColorStop(0.65, `rgba(${cr},${cg},${cb},0.32)`); gr.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      x.fillStyle = gr; x.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    }
  },
  /** à chaque image : les moines font leur ronde et regardent devant eux ; qui passe dans leur regard se fait courir dessus et
   *  jeter dehors ; les moines endormis ronflent ; quitter la salle les réveille tous */
  tickTombeau() {
    const g = this.game, d = this.tombeauIci() || [...this.defs.values()].find(estTombeau), m = g.mapObj, s = d && g.state && this.salleTombeau(d);
    // on vient de quitter une salle de moines : ils se réveillent tous
    if (this.salleGardiens && this.salleGardiens !== m?.id) {
      const q = d && d.salles.find((x) => x.carte === this.salleGardiens);
      if (q && this.dorment(d, q).length) this.demande(d.id, { a: 'maj', salle: q.id, donnees: { dorment: [] } });
      this.salleGardiens = null;
    }
    const moines = [];
    if (s?.gardes) {
      this.salleGardiens = m.id;
      const dort = new Set(this.dorment(d, s)), sol = this.solideTombeau(m), fige = g.busy || g.bv.alive;
      for (const n of g.npcs) {
        const R = this.rondes?.[n.id]; if (!R) continue;
        if (dort.has(n.id)) continue;
        if (!fige) this.placerMoine(n, false);
        moines.push([n, vueGarde(sol, n.x, n.y, n.dir, R.portee)]);
      }
      dessinerZzz(g.view, g.npcs.filter((n) => dort.has(n.id)));
      const zones = moines.flatMap(([, v]) => v), cleZ = zones.map((c) => c.join()).join(';') + '@' + m.id;
      if (cleZ !== this.zonesVues) { this.zonesVues = cleZ; dessinerZones(g.view, zones); }
    } else if (this.zonesVues) { this.zonesVues = null; dessinerZones(g.view, []); dessinerZzz(g.view, []); }
    this.eclairerTombeau(s, m, moines);
    if (!moines.length || g.busy || g.bv.alive || !g.input.free) return;
    const p = g.player;
    for (const [n, v] of moines) {
      const ici = (x, y) => (x === p.x && y === p.y) || (p.move && x === p.move.tx && y === p.move.ty);
      if (ici(n.x, n.y) || v.some(([x, y]) => ici(x, y))) {
        g.busy = true; this.repere(d, n).catch((e) => console.error(e)).finally(() => { g.busy = false; });
        return;
      }
    }
  },
  /** un moine t'a vu : il te court dessus, puis te jette dehors */
  async repere(d, n) {
    const g = this.game, p = g.player;
    if (p.move) await new Promise((res) => { const t = setInterval(() => { if (!p.move) { clearInterval(t); res(); } }, 20); });
    while (n.move) await attendre(20);
    n.bang = true; g.sound.sfx('bang'); await attendre(650); n.bang = false;
    // il marche vers toi : d'abord dans l'axe où il regarde, puis de côté
    const [dx, dy] = DIRV[n.dir], devant = dx ? (p.x - n.x) * dx : (p.y - n.y) * dy;
    if (devant > 1) await g.npcWalk(n, n.dir, devant - 1);
    const cote = dx ? p.y - n.y : p.x - n.x;
    if (cote && Math.abs(p.x - n.x) + Math.abs(p.y - n.y) > 1) await g.npcWalk(n, dx ? (cote > 0 ? 'down' : 'up') : (cote > 0 ? 'right' : 'left'), Math.abs(cote));
    p.dir = { up: 'down', down: 'up', left: 'right', right: 'left' }[n.dir];
    await this.expulser(d);
  },
  /** parler à un moine : l'endormir avec une seringue (on est à côté de lui sans être vu) */
  async parlerGardien(d, m, id) {
    const g = this.game, ui = g.ui, s = this.salleTombeau(d, m);
    if (this.dorment(d, s).includes(id)) { await ui.say('Le moine ronfle profondément. Zzz...'); return; }
    if (!g.state.bag['seringue-somnifere']) { await ui.say('Le moine ne t\'a pas vu. Mieux vaut ne pas lui taper sur l\'épaule...'); return; }
    if (!(await ui.yesNo('Le moine ne t\'a pas vu. Lui planter une Seringue Somnifère ?'))) return;
    g.take('seringue-somnifere'); g.sound.sfx('select');
    await this.demande(d.id, { a: 'maj', salle: s.id, donnees: { dorment: [...this.dorment(d, s), id] } });
    await ui.say('Le moine vacille... et s\'endort debout, en ronflant.');
  },
  /** jeté dehors : le sceptre retourne sur son socle */
  async expulser(d) {
    const g = this.game, ui = g.ui, E = g.world.maps[d.carte].donjon.exterieur, qui = { speaker: 'Moine gardien' };
    g.sound.sfx('encounter'); g.view.shake = 0.2;
    await ui.say(['Halte, scélérat !', 'Maudit pilleur de tombe !'], qui);
    if (this.dTombeau(d, 's1').sceptre) {
      await this.demande(d.id, { a: 'maj', salle: 's1', donnees: { sceptre: false } });
      await ui.say('Le moine t\'arrache le Sceptre du Roi Sans Nom.');
    }
    await g.warp({ map: E.carte.id, x: E.devant[0], y: E.devant[1], dir: 'down' }, 'exit');
    await ui.say('Et ne reviens pas ici, maudit profanateur !', qui);
  },
  /** le socle du sceptre : il faut que son gardien dorme */
  async relique(d) {
    const g = this.game, ui = g.ui, s = d.salles.find((q) => q.id === 's1');
    if (this.dTombeau(d, 's1').sceptre) { await ui.say('Un socle vide. Il gardait le Sceptre du Roi Sans Nom.'); return; }
    const gardien = (s.gardes || []).findIndex((q) => q.relique), id = this.idGarde(d, s, gardien);
    await ui.say(['Sur le socle, un sceptre d\'or et de lapis.', 'Une inscription : « Que nul ne trouble le sommeil du roi. »']);
    if (gardien >= 0 && !this.dorment(d, s).includes(id)) {
      g.sound.sfx('bang');
      await ui.say('Le gardien du sceptre se retourne d\'un bond !');
      await this.expulser(d);
      return;
    }
    if (!(await ui.yesNo('Prendre le Sceptre du Roi Sans Nom ?'))) return;
    const r = await this.demande(d.id, { a: 'maj', salle: 's1', donnees: { sceptre: true } });
    if (!r.ok) { await ui.say('L\'hôte du salon ne répond pas...'); return; }
    g.sound.sfx('item');
    await ui.say(`${g.state.name} prend le Sceptre du Roi Sans Nom !`);
  },

  /* ---------------- le passage du -4 et ses deux portiers ---------------- */
  async portiers(d) {
    const g = this.game, ui = g.ui, D = this.dTombeau(d, 'b3'), P = Object.values(d.pnj).filter((q) => q.portier != null).sort((a, b) => a.portier - b.portier);
    const qui = (q) => ({ speaker: `${q.cls} ${q.nom}` });
    if (!D.duel) {
      await ui.say(['Halte. Personne ne descend au -4 en ce moment.', 'En bas, c\'est une chasse gardée. Des bandes de pilleurs dangereux s\'allient pour rafler tous les trésors du tombeau.',
        'Surtout la bande de Sable-Noir. Ils essaient d\'ouvrir la dernière salle, celle du roi. Et ils ne font pas de cadeaux.'], qui(P[0]));
      if (!g.state.bag[SCEPTRE]) { await ui.say('Alors tu fais demi-tour. Personne ne passe. Personne.', qui(P[1])); return; }
      await ui.say(['Mais bon... Tu as l\'air de savoir ce que tu fais.', 'Prouve-nous que tu es assez fort pour survivre en bas. Un duel contre chacun de nous.'], qui(P[1]));
    } else if (!g.state.bag[SCEPTRE]) { await ui.say('Tu reviens ? Le passage reste fermé. Personne ne passe.', qui(P[0])); return; }
    else await ui.say('Tu reviens pour la suite ? On t\'attend.', qui(P[D.duel] || P[0]));
    for (let i = D.duel || 0; i < P.length; i++) {
      if (!(await ui.yesNo(`Affronter ${P[i].nom} ?`))) { await ui.say('Reviens quand tu seras prêt.', qui(P[i])); return; }
      const res = await this.combat({ ...P[i], perd: i ? 'Incroyable...' : 'Pas mal du tout...' }, this.equipe(P[i].equipe));
      for (const mon of g.state.party) healFull(mon);
      if (res !== 'win') { g.sound.sfx('heal'); await ui.say(['Trop faible. Je soigne tes Pokémon : reviens quand tu veux.'], qui(P[i])); return; }
      await this.demande(d.id, { a: 'maj', salle: 'b3', donnees: { duel: i + 1 } });
      if (i + 1 < P.length) { g.sound.sfx('heal'); await ui.say(['Joli combat. Je soigne tes Pokémon.', `Mais ${P[i + 1].nom} est bien plus coriace que moi.`], qui(P[i])); }
    }
    // la scène : ils voient le sceptre... et tout le repaire l'apprend
    await ui.say(['Bon sang... Tu es vraiment très fort.', 'Hé, attends. Qu\'est-ce que tu tiens là ?'], qui(P[0]));
    g.sound.sfx('encounter'); g.view.shake = 0.25;
    for (const n of g.npcs) if (P.some((q) => n.id === `${d.id}:${q.id}`)) n.bang = true;
    await attendre(700);
    await ui.say(['C\'est... c\'est le SCEPTRE DU ROI SANS NOM !'], qui(P[1]));
    await ui.say(['IL A LE SCEPTRE ! TOUT LE MONDE ! IL A LE SCEPTRE DU ROI !'], qui(P[0]));
    g.view.shake = 0.4; g.sound.sfx('bang');
    await ui.say(['Des cris éclatent dans tout le repaire. Des dizaines de brigands se tournent vers toi.', 'Pas le temps de discuter : tu fonces dans le passage !']);
    for (const n of g.npcs) n.bang = false;
    await this.demande(d.id, { a: 'maj', salle: 'b3', donnees: { passe: true } });
    const s3 = d.salles.find((q) => q.id === 's3'), m3 = g.world.maps[s3.carte], [x, y] = m3.donjon.plan.depart;
    g.sound.sfx('exit');
    await g.warp({ map: m3.id, x, y: y - 1, dir: 'up' }, 'exit');
    await ui.say('Le noir complet... Derrière toi, les cris des brigands s\'éloignent.');
  },

  /* ---------------- les brigands du -3 ---------------- */
  async brigand(d, k) {
    const g = this.game, ui = g.ui, P = d.pnj[k], B = P.brigand, qui = { speaker: `${P.cls} ${P.nom}`.trim() };
    await ui.say(B.dit, qui);
    if (!B.combat) return;
    if (!(await ui.yesNo('Accepter le combat ?'))) { await ui.say(B.refus || 'Comme tu veux. Je ne bouge pas d\'ici.', qui); return; }
    const res = await this.combat({ ...P, perd: B.perd || 'Pas mal du tout !' }, this.equipe(B.combat));
    for (const mon of g.state.party) healFull(mon);
    g.sound.sfx('heal');
    await ui.say(res === 'win' ? ['Bien joué ! Allez, je soigne tes Pokémon. Reviens quand tu veux, on remet ça.'] : ['Ha ! Pas mal quand même. Je soigne tes Pokémon, va. Reviens quand tu veux.'], qui);
  },

  /* ---------------- la Caverne d'Ali Baba ---------------- */
  async boutique(d) {
    const g = this.game, ui = g.ui, st = g.state, qui = { speaker: 'Ali Baba', keep: true };
    await ui.say(['Bienvenue dans la Caverne d\'Ali Baba !', 'Ici, tout est parfaitement légal. Enfin, tout a une utilisation parfaitement légale.'], qui);
    for (;;) {
      const r = await ui.ask('Qu\'est-ce qui te ferait plaisir ?', ['Acheter', 'Vendre', 'Au revoir'], qui);
      if (r === 1) {
        const l = Object.keys(st.bag).filter((k) => st.bag[k] > 0 && ITEMS[k] && !ITEMS[k].key && ITEMS[k].price > 0);
        if (!l.length) { await ui.say('Tu n\'as rien qui m\'intéresse. Reviens avec du butin.', qui); continue; }
        const i = await ui.list({ title: 'Vendre', items: l.map((k) => ({ label: itemName(k), right: `× ${st.bag[k]}` })).concat([{ label: 'Annuler' }]), cls: 'shop', cancel: l.length });
        if (i < 0 || i >= l.length) continue;
        const k = l[i], prix = Math.floor(ITEMS[k].price / 2), q = await ui.quantity(st.bag[k], { price: prix }); if (!q) continue;
        if (await ui.yesNo(`Je t'en donne ${(q * prix).toLocaleString('fr-FR')} ₽. Et je ne demande pas d'où ça vient. D'accord ?`, qui)) { g.take(k, q); st.money += q * prix; ui.sound.sfx('buy'); }
        continue;
      }
      if (r !== 0) break;
      const stock = d.boutique, argent = el('div', 'box money'), fiche = el('div', 'box tombeau-fiche');
      fiche.style.cssText = 'position:absolute;left:12px;bottom:150px;width:min(420px,45%);padding:10px 14px;font-size:15px;line-height:1.35;z-index:40';
      ui.root.appendChild(argent); ui.root.appendChild(fiche);
      const montrer = (i) => { const k = stock[i]; fiche.innerHTML = k ? `<b>${esc(itemName(k))}</b><br>${esc(ITEMS[k].desc || '')}` : ''; };
      for (;;) {
        argent.innerHTML = `Argent<br><b>${st.money.toLocaleString('fr-FR')} ₽</b>`;
        const i = await ui.list({ title: 'Acheter', items: stock.map((k) => ({ html: `<img class="itm" src="${ASSETS.item(k)}" alt="">${esc(itemName(k))}${ITEMS[k].lot ? ` (lot de ${ITEMS[k].lot})` : ''}`, right: `${ITEMS[k].price.toLocaleString('fr-FR')} ₽` })).concat([{ label: 'Annuler' }]), cls: 'shop', cancel: stock.length, start: this.boutiqueIdx || 0, onMove: (j) => { this.boutiqueIdx = j; montrer(j); } });
        if (i < 0 || i >= stock.length) break;
        const k = stock[i], prix = ITEMS[k].price, max = Math.min(99, Math.floor(st.money / prix));
        if (max < 1) { await ui.say('Pas d\'argent, pas de marchandise. C\'est la seule règle de la maison.', qui); continue; }
        const q = await ui.quantity(max, { price: prix }); if (!q) continue;
        if (!(await ui.yesNo(`${itemName(k)} × ${q}, ça fera ${(q * prix).toLocaleString('fr-FR')} ₽. D'accord ?`, qui))) continue;
        st.money -= q * prix; g.give(k, q * (ITEMS[k].lot || 1)); ui.sound.sfx('buy');
        await ui.say(ITEMS[k].replique || 'Et voilà ! Un plaisir de faire affaire avec toi.', qui);
      }
      argent.remove(); fiche.remove();
    }
    await ui.say('Reviens quand tu veux. Et si on te demande, tu ne m\'as jamais vu.', { speaker: 'Ali Baba' });
  },

  /* ---------------- encadré ---------------- */
  panneauTombeau(d) {
    if (!estTombeau(d)) return '';
    return `<div class="dj-l"><span>Sceptre</span><b>${this.dTombeau(d, 's1').sceptre ? 'avec toi' : 'sur son socle'}</b></div>`;
  },
  texteTombeau(d, s) {
    if (!estTombeau(d)) return '';
    if (s.id === 'b3') return this.dTombeau(d, 'b3').passe ? 'passage ouvert' : 'passage gardé';
    if (s.gardes) { const n = this.dorment(d, s).length; return n ? `${n} moine${n > 1 ? 's' : ''} endormi${n > 1 ? 's' : ''}` : 'les moines veillent'; }
    return '';
  },
};
