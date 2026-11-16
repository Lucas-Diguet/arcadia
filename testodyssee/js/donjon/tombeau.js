// testodyssee/js/donjon/tombeau.js — mécaniques du Tombeau du Roi Sans Nom, ajoutées à la classe Donjons (jeu.js).
//
// Un donjon solo d'infiltration. Les moines (gardes des salles -2 et -1) font leur ronde à l'heure de tous
// (donjons/tombeau-gardes.js) ; leur lanterne éclaire ce qu'ils voient ; qui y passe se fait courir dessus et jeter
// dehors (le sceptre retourne sur son socle). On endort un moine en lui parlant sans être vu, une Seringue Somnifère en
// poche ; ils se réveillent tous quand on quitte la salle. Le sceptre est au -1 (état : s1.sceptre) ; les deux brigands
// du passage du -4 ne laissent passer qu'un dresseur qui l'a et qui les bat (état : b3.duel, b3.passe).
// Toutes les salles sont dans la pénombre : une toile multipliée par-dessus l'image, éclaircie autour des flammes.
import { T, walkable } from '../../../odyssee/js/world/tiles.js';
import { ITEMS, itemName } from '../../../odyssee/js/core/items.js';
import { createMon, monName, healFull } from '../../../odyssee/js/core/mon.js';
import { ASSETS } from '../../../odyssee/js/assets.js';
import { el, esc } from '../../../odyssee/js/ui/ui.js';
import { ronde, auPas, vueGarde, PAS } from '../donjons/tombeau-gardes.js';
import { dessinerZones, dessinerZzz } from '../rendu.js';
import { HPX } from '../../../odyssee/js/render/world3d.js';
import { prisPar, battu } from './etat.js';
import { equipeRoi } from '../champions.js';
import { JEUX_SEPULTURE, SIMPLIFIES } from './jeux-tombeau.js';
import { jouerCasseTete } from './jeux-tombeau-ecran.js';

/** les salles que montre la carte du ruinemaniac (du -1 au -4 ; plus tard, un peu plus bas) */
const CARTE = ['s1', 's2', 'b3', 'b4a', 'p4'];
const SCEPTRE = 'sceptre-roi', JUMEAU = 'sceptre-jumeau';
/** ce que murmurent les mourants (un fragment chacun, selon la case) */
const MOURANTS = [['Argh... Ces monstres...', '... d\'où sortent-ils...'], ['Le chef... il a posé... le sceptre...', '... et le tombeau... a hurlé...'], ['J\'ai froid... si froid...'], ['Ne... descends pas...'], ['Ils sortaient... des murs...', '... des murs...'], ['Le trésor... ça valait pas... ça...'], ['Maman...'], ['Cours... cours...']];
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
/** ce que disent les pilleurs déjà battus */
const VAINCUS = ['Ça va, ça va... Garde-le, ton sceptre.', 'Laisse-moi tranquille. J\'ai mon compte.', 'Le chef va me tuer quand il saura...', 'T\'as eu de la chance, c\'est tout.'];
/** brasier, inscription, torche de la sépulture : son numéro (0 à 4) selon sa place sur le cercle autour du sarcophage c, en partant du haut */
const numeroCercle = (x, y, [cx, cy]) => { const a = Math.atan2(y - cy, x - cx) + Math.PI / 2; return ((Math.round(a / (2 * Math.PI / 5)) % 5) + 5) % 5; };
/** la pénombre de la sépulture : noire, puis un cran plus claire à chaque brasier rallumé */
const lumiereSepulture = (n, t) => {
  const mix = (a, b, u) => a.map((v, i) => Math.round(v + (b[i] - v) * u)), u = n / 5;
  return { fond: mix(mix([3, 2, 1], [30, 15, 8], u), [84, 44, 22], t / 5), r: 4.6, feu: [200, 120, 64], soi: 1.6 + 0.4 * u + 0.2 * t / 5 };
};
/** ce que disent les inscriptions, en attendant les casse-têtes */
const INSCRIPTIONS = [
  '« Rends au roi le visage de son royaume. »',
  '« Les billes sautent leurs sœurs. Qu\'il n\'en reste qu\'une. »',
  '« Jamais le grand ne repose sur le petit. »',
  '« Libère le sarcophage d\'or de la pierre qui l\'enferme. »',
  '« Que tous les soleils brillent ensemble. »',
];

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
      else if (Q.pilleur) { n.talk = () => this.parlerPilleur(d, k); n.when = () => true; }
      else if (Q.mortvivant) n.talk = () => this.attaqueMort(d, k);
      else if (Q.lutteur) n.talk = () => this.parlerLutteur(d, k);
      else if (Q.chef) { n.talk = () => this.chef(d); n.when = () => !this.dTombeau(d, 'g11').khamsin; }   // parti voir le trésor
      // ce qui n'arrive qu'après le vol du sceptre (la lutte du -6 et du -7)
      if (Q.apres) { const w = n.when; n.when = () => this.etape(d) >= 2 && (!w || w()); }
    }
    // les corps, les mourants, la grille du -7, la porte scellée du -10
    m.tomb.apres = [];
    for (const [c, l] of Object.entries(P.objets)) {
      const o = d.objets[c];
      if (o.type === 'corps' || o.type === 'mourant') l.forEach(([x, y], i) => {
        const dd = m.deco.find((q) => q.x === x && q.y === y), brig = ['voleur', 'brume', 'brume_f', 'brutus'][(x * 7 + y * 3) % 4];
        if (dd) dd.k = `gisant_${brig}${(x + y) % 2 ? '_2' : ''}`;
        if (s.id === 'p6' || s.id === 'p7') m.tomb.apres.push([x, y, dd?.k]);
        m.object(x, y, { use: () => this.gisant(d, m, x, y, o.type) });
      });
      if (o.type === 'verrou') for (const [x, y] of l) m.object(x, y, { use: () => this.grille(d) });
      if (o.type === 'porte_scellee') for (const [x, y] of l) m.object(x, y, { use: () => this.porteScellee(d) });
      if (o.type === 'sarcophage_roi') for (const [x, y] of l) m.object(x, y, { use: () => this.sarcophageRoi(d) });
      if (o.type === 'brasier_roi') for (const [x, y] of l) m.object(x, y, { use: () => this.brasierRoi(d, numeroCercle(x, y, P.objets['ǂ'][0])) });
      if (o.type === 'inscription_roi') for (const [x, y] of l) m.object(x, y, { use: () => this.inscriptionRoi(d, numeroCercle(x, y, P.objets['ǂ'][0])) });
    }
    // la sépulture : l'escalier du bas remonte devant la porte scellée
    if (s.id === 'g11' && P.sortie) {
      const s10 = d.salles.find((q) => q.id === 'g10'), [sx, sy] = P.sortie, [px, py] = this.porteG10(d);
      m.set(sx, sy, T.CAVEDOOR); m.warp(sx, sy, { map: s10.carte, x: px, y: py + 1, dir: 'down' }); m.deco.push({ k: 'exitlight', x: sx, y: sy });
    }
    // la sépulture : Khamsin, qui vient aider après le troisième brasier (sa place : à côté du sarcophage), et le roi
    // qui se dresse hors du sarcophage le temps de sa colère
    if (s.id === 'g11') {
      const [cx, cy] = P.objets['ǂ'][0], pris = new Set(m.deco.map((q) => cle(q.x, q.y)));
      const place = [[cx - 1, cy], [cx + 1, cy], [cx, cy + 1], [cx - 1, cy + 1], [cx + 1, cy + 1]].find(([x, y]) => walkable(m.get(x, y)) && !pris.has(cle(x, y))) || [cx, cy + 1];
      m.khamsinPlace = place;
      m.npc({ id: `${d.id}:khamsin-11`, x: place[0], y: place[1], dir: 'down', sprite: 'nox', move: 'static', name: 'Khamsin',
        when: () => !!this.sceneKhamsin || !!this.dTombeau(d, 'g11').khamsin, talk: () => this.aideKhamsin(d) });
      m.npc({ id: `${d.id}:roi-11`, x: cx, y: cy, dir: 'down', sprite: 'pharaon', move: 'static', name: 'Roi Sans Nom', when: () => !!this.roiDebout, talk: () => {} });
    }
    // le sous-chef : au -7 pour la scène du vol, puis au -4, devant l'éboulement
    if (s.id === 'p4') {
      const [sx, sy] = P.sortie || P.depart;
      m.npc({ id: `${d.id}:souschef-4`, x: sx + 1, y: sy - 2, dir: 'down', sprite: 'corbin', move: 'static', name: 'Sous-chef Vipère', when: () => this.etape(d) >= 1, talk: () => this.sousChef(d) });
    }
    if (s.id === 'p7') m.npc({ id: `${d.id}:souschef-7`, x: P.depart[0], y: P.depart[1], dir: 'up', sprite: 'corbin', move: 'static', name: 'Sous-chef Vipère', when: () => !!this.sceneVol, talk: () => {} });
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
    const E7 = this.dTombeau(d, 'p7'), E10 = this.dTombeau(d, 'g10'), dedans = this.estDans(d);
    if (st) {
      const garde = (k, v) => { if (v && dedans) st.bag[k] = 1; else delete st.bag[k]; };
      garde(SCEPTRE, pris && E7.vol !== 1 && !E10.ouverte); garde(JUMEAU, !!E10.jumeau && !E10.ouverte);
    }
    this.appliquerProfondeurs(d);
    for (const s of d.salles) {
      const m = g.world.maps[s.carte]; if (!m?.tomb) continue;
      for (const [x, y] of m.donjon.plan.objets.L || []) this.propTombeau(m, x, y, pris ? 'socle_vide' : 'socle_sceptre');
    }
    this.ouvrirTrou(d, !!this.dTombeau(d, 's1').trou);
    this.appliquerSepulture(d);
  },
  /** la sépulture : brasiers rallumés, torches de l'autel, sarcophage ouvert */
  appliquerSepulture(d) {
    const s = d.salles.find((q) => q.id === 'g11'), m = s && this.game.world.maps[s.carte]; if (!m?.tomb || this.cinematique) return;
    const E = this.dTombeau(d, 'g11'), feux = E.feux || [], O = m.donjon.plan.objets, c = O['ǂ'][0];
    for (const [x, y] of O['Ϙ'] || []) this.propTombeau(m, x, y, feux[numeroCercle(x, y, c)] ? 'brasier_on' : 'brasier');
    for (const [x, y] of O['ȶ'] || []) this.propTombeau(m, x, y, E.torches ? 'torche' : 'torche_off');
    for (const [x, y] of O['ǂ'] || []) this.propTombeau(m, x, y, E.ouvert ? 'sarcophage_ouvert' : 'sarcophage');
  },
  porteG10(d) { const m = this.game.world.maps[d.salles.find((q) => q.id === 'g10').carte]; return m.donjon.plan.objets['Ж'][0]; },
  /** un décor qui bloque (le socle) : change de dessin */
  propTombeau(m, x, y, k) {
    const g = this.game, dd = m.deco.find((q) => q.x === x && q.y === y);
    if (!dd || dd.k === k) return;
    dd.k = k;
    if (g.mapObj === m) { g.view.decoAt.set(cle(x, y), dd); g.view.rebuildAt(x, y); }
  },

  /* ---------------- les profondeurs : l'éboulement, le vol, les morts-vivants, la porte scellée ---------------- */
  /** 0 : rien ; 1 : le sous-chef a volé le sceptre ; 2 : on l'a repris (la lutte contre les morts-vivants a commencé) */
  etape(d) { return this.dTombeau(d, 'p7').vol || 0; },
  aLeSceptre(d) { return !!this.game.state?.bag[SCEPTRE]; },
  /** un décor qui bloque, ou rien (la case redevient du sol) */
  decorTombeau(m, x, y, k) {
    const g = this.game, dd = m.deco.find((q) => q.x === x && q.y === y && q.k !== 'exitlight' && q.k !== 'ladder');
    if ((dd?.k || null) === (k || null)) return;
    m.deco = m.deco.filter((q) => !(q.x === x && q.y === y));
    if (k) { m.set(x, y, T.BLOCK); m.deco.push({ k, x, y }); } else m.set(x, y, T.CAVE);
    if (g.mapObj === m) { const nd = m.deco.find((q) => q.x === x && q.y === y); if (nd) g.view.decoAt.set(cle(x, y), nd); else g.view.decoAt.delete(cle(x, y)); g.view.rebuildAt(x, y); }
  },
  appliquerProfondeurs(d) {
    const g = this.game, M = (id) => g.world.maps[d.salles.find((q) => q.id === id)?.carte];
    const passe = !!this.dTombeau(d, 'b3').passe, etape = this.etape(d), E7 = this.dTombeau(d, 'p7'), E10 = this.dTombeau(d, 'g10');
    // les morts-vivants sont là : leurs salles changent de musique
    const musique = etape >= 2 && d.musiqueMorts ? d.musiqueMorts : d.musique;
    for (const id of d.sallesMorts || []) for (const z of M(id)?.zones || []) if (z.music !== musique) { z.music = musique; if (g.mapObj === M(id)) g.updateZone(); }
    // l'éboulement : le passage du -3 au -4 est bouché, des deux côtés
    const m4 = M('p4'), m3 = M('b3');
    if (m4?.donjon.plan.sortie) {
      const [x, y] = m4.donjon.plan.sortie, k = cle(x, y);
      if (passe && m4.warps.has(k)) { m4.warps.delete(k); m4.deco = m4.deco.filter((q) => !(q.x === x && q.y === y)); }
      if (passe) this.decorTombeau(m4, x, y, 'eboulement');
    }
    if (m3?.donjon.plan.suivante && passe) { const [x, y] = m3.donjon.plan.suivante; this.decorTombeau(m3, x, y + 1, 'eboulement'); this.decorTombeau(m3, x + 1, y + 1, 'caverock'); }
    // au -6 et au -7, les corps et les mourants n'apparaissent qu'avec la lutte
    for (const id of ['p6', 'p7']) { const m = M(id); for (const [x, y, k] of m?.tomb?.apres || []) this.decorTombeau(m, x, y, etape >= 2 ? k : null); }
    // la grille du -7
    const m7 = M('p7'); for (const [x, y] of m7?.donjon.plan.objets['¤'] || []) this.decorTombeau(m7, x, y, etape === 1 ? 'porte_grille' : null);
    // le sable mouvant du piège
    if (m7 && E7.sable && !m7.deco.some((q) => q.k === 'sable_mouvant')) { const [x, y] = E7.sable; m7.deco.push({ k: 'sable_mouvant', x, y }); if (g.mapObj === m7) { g.view.decoAt.set(cle(x, y), m7.deco[m7.deco.length - 1]); g.view.rebuildAt(x, y); } }
    // la porte scellée
    const m10 = M('g10'); for (const [x, y] of m10?.donjon.plan.objets['Ж'] || []) {
      this.decorTombeau(m10, x, y, E10.ouverte ? 'porte_grande_o' : 'porte_grande');
      // ouverte : on la franchit en marchant, et l'on descend à la sépulture
      if (E10.ouverte && !m10.warps.has(cle(x, y))) {
        const m11 = M('g11'), [sx, sy] = m11.donjon.plan.depart;
        m10.set(x, y, T.CAVEDOOR); m10.warp(x, y, { map: m11.id, x: sx, y: sy, dir: 'up' });
        if (g.mapObj === m10) g.view.rebuildAt(x, y);
      }
    }
  },
  /** un corps, un mourant */
  async gisant(d, m, x, y, type) {
    const g = this.game, ui = g.ui, s = this.salleTombeau(d, m);
    if ((s.id === 'p6' || s.id === 'p7') && this.etape(d) < 2) return;
    if (type === 'corps') { await ui.say((x + y) % 2 ? 'Un pilleur de Sable-Noir. Il ne bougera plus.' : 'Il ne respire plus.'); return; }
    await ui.say(MOURANTS[(x * 3 + y * 5) % MOURANTS.length], { speaker: 'Pilleur mourant' });
  },
  /** un pilleur de Sable-Noir : avec le sceptre, il attaque ; sans, il se moque */
  async parlerPilleur(d, k) {
    const P = d.pnj[k];
    // battu, il reste là, la mine basse
    if (battu(this.etats[d.id], d, k)) { await this.game.ui.say(VAINCUS[[...k].reduce((a, c) => a + c.charCodeAt(0), 0) % VAINCUS.length], { speaker: `${P.cls} ${P.nom}` }); return; }
    if (this.aLeSceptre(d)) return this.engager(d, k);
    await this.game.ui.say(MOQUE[[...k].reduce((a, c) => a + c.charCodeAt(0), 0) % MOQUE.length], { speaker: `${P.cls} ${P.nom}` });
  },
  async parlerLutteur(d, k) {
    const P = d.pnj[k], e = this.etats[d.id], adv = Object.keys(d.pnj).find((q) => d.pnj[q].lutte && d.pnj[q].id.startsWith(P.id.split('-')[0]) && this.mortVoisin(d, k, q));
    await this.game.ui.say(adv && !battu(e, d, adv) ? P.cris : ['Merci... Va-t\'en d\'ici...', '... tant que tu peux encore.'], { speaker: `${P.cls} ${P.nom}` });
  },
  /** le mort-vivant de la lutte : juste à droite du pilleur */
  mortVoisin(d, k, q) {
    const s = d.salles.find((x) => x.pnj?.includes(k)), m = s && this.game.world.maps[s.carte], P = m?.donjon.plan.pnj;
    return P?.[k] && P?.[q] && P[q][0][0] === P[k][0][0] + 1 && P[q][0][1] === P[k][0][1];
  },
  /** une abomination : un combat comme contre un Pokémon sauvage (sans capture possible) */
  async attaqueMort(d, k) {
    const g = this.game, P = d.pnj[k], e = this.etats[d.id];
    if (battu(e, d, k)) return;
    const r = await this.demande(d.id, { a: 'prendre', pnj: k });
    if (!r.ok) return;
    g.musicLock = true;
    const res = await g.runBattle({ wild: createMon(P.mortvivant.sp, P.mortvivant.lvl, { met: 'Tombeau du Roi Sans Nom' }), music: 'legend', noWhiteout: true });
    g.musicLock = false; g.updateZone();
    if (res === 'win') { await this.demande(d.id, { a: 'gagne', pnj: k }); await g.ui.say('L\'abomination s\'effondre en poussière.'); return; }
    await this.demande(d.id, { a: 'lacher', pnj: k });
    if (res === 'lose') await this.defaite(d);
    else (this.morts ||= {})[`${d.id}:${P.id}`] = { mode: 'repos', t: performance.now() + 4000 };
  },
  /** les morts-vivants avancent très lentement ; ils regardent autour d'eux, et marchent sur qui passe devant eux */
  tickMorts(d, m) {
    const g = this.game, p = g.player, now = performance.now(), e = this.etats[d.id];
    if (g.busy || g.bv.alive || !g.input.free) return;
    const occupe = (x, y) => (x === p.x && y === p.y) || g.npcs.some((n) => n.x === x && n.y === y);
    const libre = (x, y) => walkable(m.get(x, y)) && !occupe(x, y);
    for (const n of g.npcs) {
      const k = Object.keys(d.pnj).find((q) => `${d.id}:${d.pnj[q].id}` === n.id), P = k && d.pnj[k];
      if (!P?.mortvivant || P.lutte || battu(e, d, k) || n.move) continue;
      const S = ((this.morts ||= {})[n.id] ||= { mode: 'ronde', t: now + 1500 + Math.random() * 2000 });
      const dist = Math.abs(p.x - n.x) + Math.abs(p.y - n.y);
      if (S.mode === 'chasse' && dist === 1) {
        n.dir = p.x > n.x ? 'right' : p.x < n.x ? 'left' : p.y > n.y ? 'down' : 'up';
        g.busy = true; S.mode = 'repos'; S.t = now + 5000;
        (async () => { g.sound.sfx('encounter'); await g.ui.say('L\'abomination t\'attrape !'); await this.attaqueMort(d, k); })().catch((x) => console.error(x)).finally(() => { g.busy = false; });
        return;
      }
      if (S.mode === 'repos') { if (now > S.t) S.mode = 'ronde'; continue; }
      if (S.mode === 'ronde') {
        if (now > S.t) { S.t = now + 2200 + Math.random() * 2500; const l = ['down', 'up', 'left', 'right'].filter((q) => { const [a, b] = DIRV[q]; return walkable(m.get(n.x + a, n.y + b)); }); if (l.length) n.dir = l[Math.floor(Math.random() * l.length)]; }
        const [dx, dy] = DIRV[n.dir];
        for (let i = 1; i <= 5; i++) {
          const x = n.x + dx * i, y = n.y + dy * i;
          if (x === p.x && y === p.y) { S.mode = 'chasse'; S.t = now + 700; n.bang = true; g.sound.sfx('bang'); setTimeout(() => { n.bang = false; }, 650); break; }
          if (!walkable(m.get(x, y)) || g.npcs.some((o) => o.x === x && o.y === y)) break;
        }
        continue;
      }
      // la chasse : un pas toutes les 0,85 seconde, vers le joueur ; trop loin, il abandonne
      if (dist > 11) { S.mode = 'ronde'; continue; }
      if (now < S.t) continue;
      S.t = now + 850;
      const ax = Math.sign(p.x - n.x), ay = Math.sign(p.y - n.y);
      const essais = Math.abs(p.x - n.x) >= Math.abs(p.y - n.y) ? [[ax, 0], [0, ay]] : [[0, ay], [ax, 0]];
      for (const [a, b] of essais) {
        if (!a && !b) continue;
        if (!libre(n.x + a, n.y + b)) continue;
        n.move = { fx: n.x, fy: n.y, t: 0, dur: 0.8 }; n.x += a; n.y += b; n.step++;
        n.dir = a > 0 ? 'right' : a < 0 ? 'left' : b > 0 ? 'down' : 'up';
        break;
      }
    }
  },
  /** les luttes : le pilleur et le mort-vivant se rendent les coups */
  tickLuttes(d) {
    const g = this.game, t = Math.floor(performance.now() / 420);
    if (this.tLutte === t) return; this.tLutte = t;
    for (const n of g.npcs) {
      const k = Object.keys(d.pnj).find((q) => `${d.id}:${d.pnj[q].id}` === n.id), P = k && d.pnj[k];
      if (!P || !(P.lutteur || P.lutte) || n.move) continue;
      if ((t + (P.lutte ? 1 : 0)) % 3 === 0) { n.step++; n.bang = Math.random() < 0.08; }
    }
  },
  /** le piège du -7 : passé le milieu de la salle, le sable se dérobe ; le sous-chef vole le sceptre */
  async piegeSable(d) {
    const g = this.game, ui = g.ui, m = g.mapObj, p = g.player, qui = { speaker: 'Sous-chef Vipère' };
    await this.demande(d.id, { a: 'maj', salle: 'p7', donnees: { sable: [p.x, p.y] } });
    g.sound.sfx('ledge'); g.view.shake = 0.3;
    await ui.say(['Le sol se dérobe sous tes pieds !', 'Du sable mouvant ! Tu t\'enfonces jusqu\'à la taille !']);
    // il arrive d'en bas, se penche, prend le sceptre et repart
    // il sort de l'ombre, à quelques pas (plutôt du côté d'où l'on vient)
    const def = m.npcs.find((q) => q.id === `${d.id}:souschef-7`), loin = this.casesA(m, p.x, p.y, 6);
    const c = loin.sort((a, b) => b[1] - a[1])[0]; if (def && c) { def.x = c[0]; def.y = c[1]; }
    this.sceneVol = true; g.refreshNpcs();
    const n = g.npcs.find((q) => q.id === `${d.id}:souschef-7`);
    if (n) await this.marcherVers(n, m, p.x, p.y, 1);
    await ui.say(['Tiens, tiens... Regardez-moi ce qui s\'est pris dans mon sable.', 'Et qu\'est-ce que tu tiens là ? Le sceptre du Roi Sans Nom...', 'Le chef va être ravi. Merci pour le cadeau, gamin !'], qui);
    await this.demande(d.id, { a: 'maj', salle: 'p7', donnees: { vol: 1 } });
    g.sound.sfx('item');
    await ui.say('Le sous-chef t\'arrache le Sceptre du Roi Sans Nom !');
    await ui.say('Bon courage pour sortir de là ! Ha ha ha !', qui);
    if (n) { const [sx, sy] = m.donjon.plan.depart; await this.marcherVers(n, m, sx, sy, 0, 9); }
    this.sceneVol = false; g.refreshNpcs();
    await this.debattre();
    await ui.say(['Tu t\'extirpes du sable, à bout de souffle.', 'Le sous-chef est reparti vers le haut du tombeau. Il faut le rattraper !']);
  },
  /** se débattre : appuyer sur les flèches, dans tous les sens */
  debattre() {
    const g = this.game, box = el('div', 'box tombeau-sable');
    box.style.cssText = 'position:absolute;left:50%;bottom:120px;transform:translateX(-50%);padding:10px 18px;text-align:center;z-index:40;min-width:260px';
    box.innerHTML = '<b>Débats-toi !</b><br>Appuie sur les flèches, dans tous les sens.<div style="margin-top:8px;height:10px;background:#3a2a1c;border-radius:5px;overflow:hidden"><i style="display:block;height:100%;width:0;background:#e0a040"></i></div>';
    g.ui.root.appendChild(box);
    const barre = box.querySelector('i'), BUT = 16;
    return new Promise((res) => {
      let n = 0, der = null;
      const touche = (ev) => {
        const k = ev.key;
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'z', 'q', 's', 'd', 'w', 'a'].includes(k)) return;
        ev.preventDefault(); ev.stopPropagation();
        if (k === der) return;
        der = k; n++; g.view.shake = 0.08; barre.style.width = `${Math.min(100, (n / BUT) * 100)}%`;
        if (n >= BUT) { removeEventListener('keydown', touche, true); box.remove(); res(); }
      };
      addEventListener('keydown', touche, true);
    });
  },
  /** les cases à exactement r pas de (x, y), à pied */
  casesA(m, x0, y0, r) {
    const vus = new Map([[cle(x0, y0), 0]]), f = [[x0, y0]], out = [];
    while (f.length) {
      const [x, y] = f.shift(), k = vus.get(cle(x, y));
      if (k === r) { out.push([x, y]); continue; }
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const c = cle(x + a, y + b); if (!vus.has(c) && walkable(m.get(x + a, y + b))) { vus.set(c, k + 1); f.push([x + a, y + b]); } }
    }
    return out;
  },
  /** un PNJ marche vers une case (jusqu'à « pres » cases d'elle), par le plus court chemin ; max : nombre de pas */
  async marcherVers(n, m, tx, ty, pres = 0, max = 80) {
    const g = this.game, key = (x, y) => x + ',' + y, prev = new Map([[key(n.x, n.y), null]]), f = [[n.x, n.y]];
    let fin = null;
    while (f.length) {
      const [x, y] = f.shift();
      if (Math.abs(x - tx) + Math.abs(y - ty) <= pres) { fin = [x, y]; break; }
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const k = key(x + a, y + b);
        if (prev.has(k) || !walkable(m.get(x + a, y + b)) || (x + a === g.player.x && y + b === g.player.y && pres)) continue;
        prev.set(k, [x, y]); f.push([x + a, y + b]);
      }
    }
    if (!fin) return;
    const pas = []; for (let c = fin; prev.get(key(...c)); c = prev.get(key(...c))) pas.unshift(c);
    let [x, y] = [n.x, n.y];
    for (const [a, b] of pas.slice(0, max)) { await g.npcWalk(n, a > x ? 'right' : a < x ? 'left' : b > y ? 'down' : 'up', 1); [x, y] = [a, b]; }
    if (pres) n.dir = g.player.x > n.x ? 'right' : g.player.x < n.x ? 'left' : g.player.y > n.y ? 'down' : 'up';
  },
  /** au -4, devant l'éboulement : le sous-chef comprend qu'il est pris au piège */
  async sousChef(d) {
    const g = this.game, ui = g.ui, qui = { speaker: 'Sous-chef Vipère' }, n = g.npcs.find((q) => q.id === `${d.id}:souschef-4`);
    if (this.etape(d) >= 2) { await ui.say('Laisse-moi...', qui); return; }
    if (n) { n.dir = 'down'; }
    await ui.say(['Non... non, non, non !', 'Le passage... il est bouché ! Des tonnes de pierres !', 'On ne sortira jamais d\'ici... On va tous crever dans ce tombeau...'], qui);
    if (n) { n.bang = true; g.sound.sfx('bang'); await attendre(650); n.bang = false; n.dir = g.player.x > n.x ? 'right' : g.player.x < n.x ? 'left' : g.player.y > n.y ? 'down' : 'up'; }
    await ui.say(['TOI ! C\'est à cause de toi, tout ça !', 'Si je dois mourir ici, tu tomberas avec moi !'], qui);
    const P = d.pnj['Ҩ'];
    for (;;) {
      const res = await this.combat({ ...P, perd: 'Non... pas comme ça...' }, this.equipe(P.equipe));
      if (res === 'win') break;
      await this.defaite(d); return;
    }
    await ui.say(['C\'est fini... Prends-le, ton sceptre.', 'Mais ça ne te sert plus à rien maintenant. Tu ne sortiras jamais d\'ici...'], qui);
    await this.demande(d.id, { a: 'maj', salle: 'p7', donnees: { vol: 2 } });
    g.sound.sfx('item');
    await ui.say(`${g.state.name} reprend le Sceptre du Roi Sans Nom !`);
  },
  async grille(d) {
    const g = this.game, ui = g.ui;
    if (this.etape(d) !== 1) return;
    await ui.say('Je ne dois pas redescendre. Je dois me dépêcher de remonter reprendre le sceptre volé !');
  },
  /** au -10 : le chef de Sable-Noir devant la porte scellée */
  async chef(d) {
    const g = this.game, ui = g.ui, E = this.dTombeau(d, 'g10'), qui = { speaker: 'Khamsin' }, n = g.npcs.find((q) => q.id === `${d.id}:chef`);
    if (E.battu) { await ui.say('Vas-y... Ouvre-la.', qui); return; }
    if (n) n.dir = 'up';
    await ui.say(['Pourquoi... Pourquoi ne s\'ouvre-t-elle pas ?', 'J\'ai le sceptre. Le sceptre du roi, sous le nez de toute la ville...', 'Je l\'ai posé sur la porte, et le tombeau a grondé. Il a compris qu\'on était des pillards.', 'Et ces... choses sont sorties des murs pour le défendre.'], qui);
    if (n) { n.bang = true; g.sound.sfx('bang'); await attendre(650); n.bang = false; n.dir = 'down'; }
    await ui.say(['... Toi ?', 'Le gamin du musée...', 'Tu viens voir ce qui reste de Sable-Noir ? Il ne reste rien. Rien !', 'Mes hommes sont morts. Tués par des abominations. Pour une porte qui ne s\'ouvre pas...'], qui);
    g.sound.sfx('encounter');
    await ui.say(['... Attends.', 'Ce que tu tiens... Un deuxième sceptre ?!', 'Bien sûr... Il en fallait deux. Les deux ensemble.', 'Et moi, avec un seul, j\'ai réveillé les morts.', 'Donne-le-moi. DONNE-LE-MOI !'], qui);
    const P = d.pnj['Ѡ'];
    const res = await this.combat({ ...P, perd: 'C\'est... impossible...' }, this.equipe(P.equipe));
    if (res !== 'win') { await this.defaite(d); return; }
    await ui.say(['C\'est fini.', 'Je n\'ai plus d\'hommes, plus de forces. Fais ce que tu veux.', 'Ouvre-la, cette porte.', '... Mais je t\'en prie, une seule chose.', 'Le trésor du roi... Laisse-moi le voir. De mes yeux, au moins une fois.', 'Après tout ce que ça m\'a coûté, je ne peux pas repartir sans l\'avoir vu.'], qui);
    await this.demande(d.id, { a: 'maj', salle: 'g10', donnees: { battu: true, jumeau: true } });
    g.sound.sfx('item');
    await ui.say(['Le chef laisse tomber son sceptre à tes pieds.', `${g.state.name} ramasse le Sceptre Jumeau !`]);
  },
  async porteScellee(d) {
    const g = this.game, ui = g.ui, E = this.dTombeau(d, 'g10');
    if (E.ouverte) { await this.versSepulture(d); return; }
    await ui.say(['Une porte immense, couverte de hiéroglyphes.', 'Au centre, deux encoches en forme de sceptre, l\'une sur l\'autre.']);
    if (!E.battu) return;
    if (!(await ui.yesNo('Poser les deux sceptres dans les encoches ?'))) return;
    g.sound.sfx('select');
    await ui.say(['Tu poses le Sceptre du Roi Sans Nom, puis le Sceptre Jumeau par-dessus.', 'Ils s\'emboîtent dans un déclic.']);
    g.view.shake = 0.5; g.sound.sfx('bang');
    await this.demande(d.id, { a: 'maj', salle: 'g10', donnees: { ouverte: true } });
    await ui.say(['Le tombeau tout entier tremble...', 'La porte scellée s\'ouvre lentement.', 'Derrière, un escalier descend dans le noir.']);
  },
  async versSepulture(d) {
    const g = this.game, s = d.salles.find((q) => q.id === 'g11'), m = g.world.maps[s.carte], [x, y] = m.donjon.plan.depart;
    await g.warp({ map: m.id, x, y, dir: 'up' }, 'exit');
  },

  /* ---------------- -11 : la sépulture du Roi Sans Nom ---------------- */
  async sarcophageRoi(d) {
    const g = this.game, ui = g.ui, E = this.dTombeau(d, 'g11');
    if (!E.ouvert) { await ui.say(['Le sarcophage du Roi Sans Nom.', 'Il est scellé par une magie très puissante. Impossible de l\'ouvrir.']); return; }
    if (E.battu) { await ui.say(['Le sarcophage est vide.', 'Le Roi Sans Nom a retrouvé le sommeil.']); return; }
    await ui.say(['Le couvercle a glissé sur le côté.', 'Dans le noir du sarcophage, quelque chose bouge...', 'Une silhouette couronnée se redresse lentement.']);
    this.roiDebout = true; g.refreshNpcs(); g.sound.sfx('encounter'); g.view.shake = 0.3;
    await attendre(700);
    await ui.say(['Qui...', 'Qui ose rallumer les feux de mon tombeau ?'], { speaker: 'Roi Sans Nom' });
    const R = { cls: 'Roi', nom: 'Roi Sans Nom', sprite: 'roi_sans_nom', prix: 0, boss: true, perd: 'Le sommeil... enfin...' };
    let res;
    try { res = await this.combat(R, equipeRoi(g.state.name)); } finally { this.roiDebout = false; g.refreshNpcs(); }
    if (res !== 'win') { await this.defaite(d); return; }
    await this.demande(d.id, { a: 'maj', salle: 'g11', donnees: { battu: true } });
    await ui.say(['Le Roi Sans Nom s\'effondre dans son sarcophage.', 'Les flammes des brasiers vacillent, puis se calment.']);
  },
  async brasierRoi(d, k) {
    const ui = this.game.ui;
    await ui.say((this.dTombeau(d, 'g11').feux || [])[k] ? 'Le brasier brûle d\'une flamme haute et claire.' : 'Un brasier immense, éteint depuis des siècles. Une inscription est gravée devant.');
  },
  /** une inscription : son casse-tête (jeux-tombeau.js), puis le brasier s'allume */
  async inscriptionRoi(d, k) {
    const g = this.game, ui = g.ui, E = this.dTombeau(d, 'g11'), feux = (E.feux || []).slice();
    if (feux[k]) { await ui.say(['L\'inscription brille faiblement.', INSCRIPTIONS[k]]); return; }
    await ui.say(['Une inscription gravée dans la pierre :', INSCRIPTIONS[k]]);
    const id = JEUX_SEPULTURE[k].id, aide = SIMPLIFIES[id] && E.aide;
    let reussi = false;
    if (aide) reussi = await this.khamsinStele(d, k, aide);
    else if (g.modeTest && await ui.yesNo('Mode test : passer ce casse-tête (compté comme réussi) ?')) reussi = true;
    else {
      if (!(await ui.yesNo(`${JEUX_SEPULTURE[k].nom} : tenter le casse-tête ?`))) return;
      reussi = await jouerCasseTete(g, this.casseTete(d, k));
    }
    if (!reussi) { await ui.say('Tu t\'éloignes de l\'inscription. Le brasier reste éteint.'); return; }
    feux[k] = true;
    for (let i = 0; i < 5; i++) feux[i] = !!feux[i];
    g.sound.sfx('select');
    await this.demande(d.id, { a: 'maj', salle: 'g11', donnees: { feux } });
    g.sound.sfx('bang'); g.view.shake = 0.15;
    const n = feux.filter(Boolean).length;
    await ui.say(n < 5 ? ['Le brasier s\'embrase dans un grondement !', 'La salle s\'éclaire un peu.'] : ['Le dernier brasier s\'embrase !']);
    if (n === 5 && !E.ouvert) await this.cinematiqueSepulture(d);
    else if (n >= 3 && !this.dTombeau(d, 'g11').khamsin) await this.arriveeKhamsin(d);
  },
  /** le casse-tête d'une inscription : simplifié s'il l'a été par Khamsin */
  casseTete(d, k) {
    const J = JEUX_SEPULTURE[k], S = SIMPLIFIES[J.id];
    return S && (this.dTombeau(d, 'g11').simples || {})[J.id] ? { ...J, jeu: S, nom: `${J.nom} (simplifié)` } : J;
  },

  /* ---------------- -11 : l'aide de Khamsin ---------------- */
  // il arrive après le troisième brasier (par le chemin de l'entrée), se poste près du sarcophage ; on lui demande de
  // simplifier un des deux casse-têtes qu'il connaît (les billes, les dalles-soleils) ou de le résoudre ; à la stèle
  // suivante de ces deux-là, il apparaît à côté et fait ce qu'on lui a demandé
  khamsinDef(m) { return m.npcs.find((q) => q.id.endsWith(':khamsin-11')); },
  async arriveeKhamsin(d) {
    const g = this.game, ui = g.ui, m = g.mapObj, p = g.player, qui = { speaker: 'Khamsin' }, def = this.khamsinDef(m);
    if (!def) return;
    // il entre par où l'on est arrivé : on le voit sortir du bord de l'écran, sur le chemin de l'entrée
    const chemin = this.chemin(m, p.x, p.y, ...m.donjon.plan.depart), dep = chemin[Math.min(chemin.length - 1, 7)] || m.donjon.plan.depart;
    [def.x, def.y] = dep;
    this.sceneKhamsin = true; g.refreshNpcs();
    const n = g.npcs.find((q) => q.id === def.id);
    try {
      g.sound.sfx('door');
      if (n) await this.marcherVers(n, m, p.x, p.y, 1);
      p.dir = n ? (n.x > p.x ? 'right' : n.x < p.x ? 'left' : n.y > p.y ? 'down' : 'up') : p.dir;
      await ui.say(['Trois brasiers... Le tombeau s\'éveille.', 'Je t\'ai suivi. Je voulais seulement voir le trésor, je te le jure.',
        'Mais ces deux énigmes, je les connais : les billes du scribe, et les dalles-soleils.', 'J\'ai passé des années à étudier ce tombeau sur de vieux papyrus.',
        'Si tu bloques, viens me voir près du sarcophage. Je peux te les simplifier... ou les résoudre à ta place.'], qui);
      if (n) await this.marcherVers(n, m, ...m.khamsinPlace, 0);
      if (n) n.dir = 'down';
    } finally {
      [def.x, def.y] = m.khamsinPlace;
      await this.demande(d.id, { a: 'maj', salle: 'g11', donnees: { khamsin: true } });
      this.sceneKhamsin = false; g.refreshNpcs();
    }
  },
  /** le plus court chemin à pied de (x0, y0) à (x1, y1), départ compris */
  chemin(m, x0, y0, x1, y1) {
    const prev = new Map([[cle(x0, y0), null]]), f = [[x0, y0]];
    while (f.length) {
      const [x, y] = f.shift();
      if (x === x1 && y === y1) break;
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = cle(x + a, y + b); if (!prev.has(k) && walkable(m.get(x + a, y + b))) { prev.set(k, [x, y]); f.push([x + a, y + b]); } }
    }
    if (!prev.has(cle(x1, y1))) return [];
    const out = []; for (let c = [x1, y1]; c; c = prev.get(cle(...c))) out.unshift(c);
    return out;
  },
  async aideKhamsin(d) {
    const g = this.game, ui = g.ui, E = this.dTombeau(d, 'g11'), qui = { speaker: 'Khamsin' }, feux = E.feux || [];
    const restent = JEUX_SEPULTURE.map((J, k) => (SIMPLIFIES[J.id] && !feux[k] ? J.nom : null)).filter(Boolean);
    if (E.battu) { await ui.say(['Le roi... Je l\'ai vu. De mes yeux.', 'Ça me suffit. Va, maintenant.'], qui); return; }
    if (!restent.length) { await ui.say(['Les deux énigmes que je connaissais brûlent déjà.', 'Je n\'ai plus rien à t\'apprendre.'], qui); return; }
    if (E.aide) { await ui.say(['Va devant la stèle des billes ou celle des dalles-soleils.', 'Je te rejoins.'], qui); return; }
    const r = await ui.ask(`Je connais ${restent.join(' et ')}. Que veux-tu ?`, ['Simplifier le casse-tête', 'Le résoudre pour moi', 'Rien pour l\'instant'], qui);
    if (r !== 0 && r !== 1) { await ui.say('Comme tu veux. Je reste là.', qui); return; }
    await this.demande(d.id, { a: 'maj', salle: 'g11', donnees: { aide: r === 0 ? 'simple' : 'resout' } });
    await ui.say(['Bien. Va devant la stèle du casse-tête qui te pose problème.', 'Je te rejoins.'], qui);
  },
  /** à la stèle : un instant de noir, Khamsin est là, il simplifie ou résout ; puis il retourne près du sarcophage */
  async khamsinStele(d, k, aide) {
    const g = this.game, ui = g.ui, m = g.mapObj, p = g.player, qui = { speaker: 'Khamsin' }, def = this.khamsinDef(m), J = JEUX_SEPULTURE[k];
    if (!def) return false;
    const [sx, sy] = this.ciblesStele(m, k), ici = cle(p.x, p.y);
    const autour = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].map(([a, b]) => [p.x + a, p.y + b])
      .filter(([x, y]) => walkable(m.get(x, y)) && cle(x, y) !== ici && !(x === sx && y === sy))
      .sort((a, b) => Math.hypot(a[0] - sx, a[1] - sy) - Math.hypot(b[0] - sx, b[1] - sy));
    const place = autour[0] || m.khamsinPlace;
    let reussi = false;
    await ui.fade(true, 400); await attendre(700);
    [def.x, def.y] = place; g.refreshNpcs();
    const n = g.npcs.find((q) => q.id === def.id); if (n) n.dir = sx > n.x ? 'right' : sx < n.x ? 'left' : sy > n.y ? 'down' : 'up';
    await ui.fade(false, 400);
    try {
      await this.demande(d.id, { a: 'maj', salle: 'g11', donnees: { aide: null } });
      if (aide === 'resout') {
        await ui.say(['Laisse-moi faire.', '...'], qui);
        g.sound.sfx('select'); await attendre(450); g.sound.sfx('select'); await attendre(450); g.sound.sfx('select');
        await ui.say(['Voilà. Exactement comme sur les papyrus.'], qui);
        reussi = true;
      } else {
        const simples = { ...(this.dTombeau(d, 'g11').simples || {}), [J.id]: true };
        await this.demande(d.id, { a: 'maj', salle: 'g11', donnees: { simples } });
        await ui.say(J.id === 'billes' ? ['J\'ai retiré quelques billes, et avancé les premiers sauts.', 'Il n\'en reste que sept. À toi de jouer.'] : ['J\'ai retourné la plupart des dalles comme il faut.', 'Il n\'en reste que deux ou trois à remettre. À toi de jouer.'], qui);
        reussi = await jouerCasseTete(g, this.casseTete(d, k));
        if (reussi) await ui.say('Tu vois ? Ce n\'était pas si terrible.', qui);
      }
    } finally {
      await ui.fade(true, 400); await attendre(400);
      [def.x, def.y] = m.khamsinPlace; g.refreshNpcs();
      const n2 = g.npcs.find((q) => q.id === def.id); if (n2) n2.dir = 'down';
      await ui.fade(false, 400);
    }
    return reussi;
  },
  /** la case de la stèle (inscription) k */
  ciblesStele(m, k) {
    const O = m.donjon.plan.objets, c = O['ǂ'][0];
    return (O['Ϟ'] || []).find(([x, y]) => numeroCercle(x, y, c) === k) || [m.player?.x || 0, 0];
  },
  /** les cinq brasiers brûlent : la caméra regarde l'autel, les torches s'allument une à une, le sarcophage s'ouvre */
  async cinematiqueSepulture(d) {
    const g = this.game, ui = g.ui, m = g.mapObj, O = m.donjon.plan.objets, [cx, cy] = O['ǂ'][0];
    this.cinematique = true;
    try {
      await this.camera(cx, cy + 1, 1200);
      await attendre(500);
      const torches = (O['ȶ'] || []).slice().sort((a, b) => numeroCercle(...a, O['ǂ'][0]) - numeroCercle(...b, O['ǂ'][0]));
      for (const [x, y] of torches) { this.propTombeau(m, x, y, 'torche'); g.sound.sfx('select'); await attendre(650); }
      await attendre(400);
      g.view.shake = 0.5; g.sound.sfx('bang');
      for (const [x, y] of O['ǂ'] || []) this.propTombeau(m, x, y, 'sarcophage_ouvert');
      await attendre(700);
      await ui.say(['Les torches de l\'autel s\'allument d\'elles-mêmes...', 'Dans un raclement de pierre, le couvercle du sarcophage glisse.']);
      await this.camera(g.player.x, g.player.y, 900);
    } finally {
      this.finCamera(); this.cinematique = false;
    }
    await this.demande(d.id, { a: 'maj', salle: 'g11', donnees: { torches: true, ouvert: true } });
  },
  /** la caméra glisse vers une case (le joueur ne bouge pas) ; finCamera la rend au joueur */
  async camera(x, y, ms) {
    const v = this.game.view, p = this.game.player;
    if (!v.majOrigine) {
      v.majOrigine = v.update;
      v.update = (dt, fx, fy) => {
        const c = this.camVers; if (!c) return v.majOrigine.call(v, dt, fx, fy);
        const u = Math.min(1, (performance.now() - c.t0) / c.ms), e = u * u * (3 - 2 * u);
        c.ici = [c.de[0] + (c.vers[0] - c.de[0]) * e, c.de[1] + (c.vers[1] - c.de[1]) * e];
        return v.majOrigine.call(v, dt, ...c.ici);
      };
    }
    this.camVers = { de: this.camVers?.ici || [p.x, p.y], vers: [x, y], t0: performance.now(), ms };
    await attendre(ms);
  },
  finCamera() { const v = this.game.view; this.camVers = null; if (v.majOrigine) { v.update = v.majOrigine; delete v.majOrigine; } },

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
      // le piège du -7 : passé le milieu de la salle, avec le sceptre
      if (s.piege && this.etape(d) === 0 && this.aLeSceptre(d) && p.y < m.h / 2) { await this.piegeSable(d); return; }
      // au -4, le sous-chef devant l'éboulement
      if (s.id === 'p4' && this.etape(d) === 1) { const n = g.npcs.find((q) => q.id === `${d.id}:souschef-4`); if (n && Math.abs(n.x - p.x) + Math.abs(n.y - p.y) <= 4) { await this.sousChef(d); return; } }
      // au -10, le chef devant la porte
      if (s.id === 'g10' && !this.dTombeau(d, 'g10').battu) { const n = g.npcs.find((q) => q.id === `${d.id}:chef`); if (n && Math.abs(n.x - p.x) + Math.abs(n.y - p.y) <= 4) { await this.chef(d); return; } }
      const k = this.aLeSceptre(d) && this.pilleurQuiVoit(d, m); if (k) await this.engager(d, k);
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
  /** le plan du ruinemaniac ; dejaCle : il a déjà donné la clé (on lui demande de répéter) */
  planRuinemaniac(dejaCle) {
    return {
      avant: ['Le trésor du Roi Sans Nom dort tout au fond, dans la salle de sa sépulture. Elle est scellée.',
        'La première étape, c\'est d\'entrer dans le tombeau. Mais l\'entrée est fermée et pleine de gardes : impossible de passer par là.',
        'Heureusement, il existe un autre accès, connu seulement des pilleurs.',
        'Une roche fissurée, au bord est de la place. Pousse-la avec Force : dessous, il y a un trou qui descend au -3, dans le repaire des brigands.',
        'Eh oui, hé hé ! Les gardiens ne le savent pas : ils occupent les étages -1 et -2, mais sous leurs pieds, le tombeau est infesté de bandits et de pillards en tout genre !',
        'J\'ai fait partie de leur bande, dans le temps... Mais bon, ce n\'est pas le sujet !',
        'Passons au plan : tu dois descendre tout au fond du tombeau et trouver la sépulture. Le trésor se trouve sûrement dedans.',
        '« Mais c\'est super simple ! », tu vas me répondre. Hé hé, c\'est vrai. Mais il y a un petit problème.',
        'Pour ouvrir cette dernière salle, il te faut le sceptre du roi. Et malheureusement, il est dangereusement défendu par les gardiens, au -1.',
        'Il faudra donc d\'abord remonter les étages pour le voler, puis redescendre tout en bas.',
        dejaCle ? 'Mais ne t\'inquiète pas, j\'ai un atout dans ma manche : la clé que je t\'ai donnée.' : 'Mais ne t\'inquiète pas, j\'ai quand même un atout dans ma manche : tiens, prends cette clé.'],
      apres: ['Tu dois te demander comment les gardiens ne savent pas que des hordes de pillards se sont installées sous leurs pieds.',
        'Eh bien, c\'est très simple : le passage est fermé depuis une vingtaine d\'années, et personne à part toi n\'a le moyen de l\'ouvrir !',
        'Alors fais-toi discret. Des gardiens... et des bandits...', 'Allez, bon courage !'],
    };
  },
  async ruinemaniac(d) {
    const g = this.game, ui = g.ui, st = g.state, qui = { speaker: 'Ruinemaniac' };
    if (st.bag['cle-ruinemaniac']) {
      await ui.say(this.dTombeau(d, 's1').trou
        ? ['Le passage est ouvert ? Parfait.', 'Rappelle-toi : sans le sceptre du roi, la dernière salle ne s\'ouvrira pas. Il est au -1.', 'Et rapporte-moi le trésor. Tu ne le regretteras pas.']
        : ['Alors, cette roche ? Elle est au bord est de la place. Celle qui est fissurée.', 'Un Pokémon costaud avec Force, et elle roulera.'], qui);
      if (!(await ui.yesNo('Tu veux que je te rappelle le plan ?', qui))) return;
      const P = this.planRuinemaniac(true);
      await ui.say([...P.avant, ...P.apres], qui);
      return;
    }
    await ui.say(['Psst, gamin ! Viens par là.', 'T\'as l\'air d\'un dresseur drôlement costaud. J\'ai un plan à te proposer.',
      'Ce tombeau cache un trésor antique d\'une valeur inestimable !', 'Je suis trop vieux pour y aller maintenant, mais toi, je crois que tu as ce qu\'il faut pour le voler !',
      'Qu\'est-ce que t\'en dis ? Tu me rapportes ce trésor, et en échange, je t\'offre une récompense. Elle vaut le détour, crois-moi !'], qui);
    if (!(await ui.yesNo('Alors ? Marché conclu ?', qui))) { await ui.say('Réfléchis bien. Je ne bouge pas d\'ici.', qui); return; }
    const P = this.planRuinemaniac(false);
    await ui.say(P.avant, qui);
    g.give('cle-ruinemaniac', 1); g.sound.sfx('item');
    await ui.say(`${st.name} obtient la Clé Antique !`);
    await ui.say(P.apres, qui);
    g.give('carte-tombeau', 1); g.sound.sfx('item');
    await ui.say(`${st.name} reçoit la Carte du Tombeau !`);
  },
  async roche(d, x, y) {
    const g = this.game, ui = g.ui, E = g.world.maps[d.carte].donjon.exterieur, vraie = E.porte[0] === x && E.porte[1] === y;
    if (!vraie) return;
    if (this.dTombeau(d, 's1').trou) return;
    const look = 'Cette roche semble anormalement fissurée. Elle a l\'air de pouvoir bouger.';
    if (!g.hasField('force')) { await ui.say([look, 'Un Pokémon très costaud pourrait la pousser.']); return; }
    if (!(await ui.yesNo(`${look}\nUtiliser Force ?`))) return;
    const mon = g.fieldUser(); if (mon) g.sound.cry(ASSETS.cry(mon.sp));
    // la roche roule du côté où l'on pousse (s'il y a de la place), sinon sur le côté prévu (E.decale)
    const p = g.player, X = E.carte, sens = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[p.dir] || [0, 1];
    const libre = (u, v) => walkable(X.get(u, v)) && !X.deco.some((q) => q.x === u && q.y === v) && !X.npcs.some((n) => n.x === u && n.y === v) && !(u === p.x && v === p.y);
    const vers = [[x + sens[0], y + sens[1]], [x + sens[1], y + sens[0]], [x - sens[1], y - sens[0]], E.decale].find(([u, v]) => libre(u, v)) || E.decale;
    const r = await this.demande(d.id, { a: 'maj', salle: 's1', donnees: { trou: true, roche: vers } });
    if (!r.ok) { await ui.say('L\'hôte du salon ne répond pas...'); return; }
    g.sound.sfx('ledge'); g.view.shake = 0.3;
    await ui.say([`${mon ? monName(mon) : 'Ton Pokémon'} utilise Force !`, 'La roche roule plus loin : dessous, un trou ! Une vieille échelle descend dans le noir.']);
  },
  /** le trou des pilleurs : la roche fissurée laisse place à une échelle (on y descend en marchant dessus) */
  ouvrirTrou(d, ouvert) {
    if (this.trouOuvert === ouvert) return;
    this.trouOuvert = ouvert;
    const g = this.game, E = g.world.maps[d.carte].donjon.exterieur; if (!E) return;
    const X = E.carte, [x, y] = E.porte;
    // la roche roule d'une case sur le côté (E.decale) et laisse voir l'échelle
    // (à la remise à zéro, on rend sa place à la roche là où elle avait roulé)
    const [ax, ay] = ouvert ? (this.rochePos = this.dTombeau(d, 's1').roche || E.decale) : (this.rochePos || E.decale), roche = (u, v) => X.deco.some((q) => q.x === u && q.y === v && q.k === 'rocher_grand');
    if (ouvert) {
      X.set(x, y, T.SAND); X.under.delete(cle(x, y)); X.deco = X.deco.filter((q) => !(q.x === x && q.y === y)); X.deco.push({ k: 'ladder', x, y });
      if (!roche(ax, ay)) { E.solDecale ??= X.get(ax, ay); X.prop('rocher_grand', ax, ay); }
    } else {
      if (!roche(x, y)) { X.deco = X.deco.filter((q) => !(q.x === x && q.y === y)); X.prop('rocher_grand', x, y); }
      if (roche(ax, ay)) { X.deco = X.deco.filter((q) => !(q.x === ax && q.y === ay)); X.set(ax, ay, E.solDecale ?? T.SAND); X.under.delete(cle(ax, ay)); }
    }
    if (g.mapObj === X) for (const [u, v] of [[x, y], [ax, ay]]) { const dd = X.deco.find((q) => q.x === u && q.y === v); if (dd) g.view.decoAt.set(cle(u, v), dd); else g.view.decoAt.delete(cle(u, v)); g.view.rebuildAt(u, v); }
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
  /** la porte de fer entre le -3 et le -2 : la Clé Antique du ruinemaniac l'ouvre, dans les deux sens */
  async porteFer(d, m, c) {
    const g = this.game, ui = g.ui;
    if (!g.state.bag['cle-ruinemaniac']) { await ui.say('Une lourde porte de fer, fermée à clé.'); return; }
    // la première fois : la vieille serrure, la Clé Antique, la porte qui grince
    if (!this.dTombeau(d, 'b3').fer) {
      await ui.say(['Une lourde porte de fer, fermée à clé.', 'La rouille la ronge de partout. Personne ne l\'a ouverte depuis très, très longtemps.']);
      if (!(await ui.yesNo('Insérer la Clé Antique ?'))) return;
      g.sound.sfx('select');
      await ui.say(['La Clé Antique entre dans la serrure.', 'Tu forces un peu... Clac !']);
      g.view.shake = 0.3; g.sound.sfx('bang');
      await this.demande(d.id, { a: 'maj', salle: 'b3', donnees: { fer: true } });
      await ui.say('Dans un long grincement, la porte de fer s\'ouvre.');
    }
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
    const E11 = s.sepulture && this.dTombeau(this.tombeauIci(), 'g11'), x = cv.getContext('2d'), t = performance.now() / 1000;
    const L = E11 ? lumiereSepulture((E11.feux || []).filter(Boolean).length, (m.deco || []).filter((q) => q.k === 'torche').length) : LUMIERE[s.lumiere] || LUMIERE.normale;
    x.globalCompositeOperation = 'source-over'; x.fillStyle = `rgb(${L.fond.join(',')})`; x.fillRect(0, 0, W, H);
    const feux = (m.deco || []).filter((q) => q.k === 'torche' || q.k === 'brasero' || q.k === 'lanterne' || q.k === 'brasier_on'), lum = [];
    feux.forEach((q, i) => lum.push([...proj(q.x, q.y, 6), case_ * L.r * (q.k === 'brasier_on' ? 1.15 : 1) * (1 + 0.035 * Math.sin(t * 7.3 + i * 1.7) + 0.02 * Math.sin(t * 13.1 + i)), L.feu]));
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
    // au -3, le brigand qui dort contre le mur
    if (!s?.gardes) {
      const dort = s?.id === 'b3' ? g.npcs.filter((n) => Object.values(d.pnj).some((q) => q.dort && `${d.id}:${q.id}` === n.id)) : [];
      if (dort.length || this.zzzRepaire) { dessinerZzz(g.view, dort); this.zzzRepaire = dort.length > 0; }
    }
    this.eclairerTombeau(s, m, moines);
    if (s && !s.gardes) { this.tickMorts(d, m); this.tickLuttes(d); }
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
        'Surtout la bande de Sable-Noir. Ils ne font pas de cadeaux. Crois-moi, mon gars, c\'est mieux pour toi que tu restes ici.'], qui(P[0]));
      if (!g.state.bag[SCEPTRE]) { await ui.say('Allez, fais demi-tour. Personne ne passe. Personne.', qui(P[1])); return; }
      await ui.say(['Mais bon... Tu as l\'air de savoir ce que tu fais.', 'Prouve-nous que tu es assez fort pour survivre en bas. Un duel contre chacun de nous.'], qui(P[1]));
    } else if (!g.state.bag[SCEPTRE]) { await ui.say('Tu reviens ? Le passage reste fermé. Personne ne passe.', qui(P[0])); return; }
    else await ui.say('Tu reviens pour la suite ? On t\'attend.', qui(P[D.duel] || P[0]));
    for (let i = D.duel || 0; i < P.length; i++) {
      if (!(await ui.yesNo(`Affronter ${P[i].nom} ?`))) { await ui.say('Reviens quand tu seras prêt.', qui(P[i])); return; }
      const res = await this.combat({ ...P[i], perd: i ? 'Incroyable...' : 'Pas mal du tout...' }, this.equipe(P[i].equipe));
      if (res !== 'win') { for (const mon of g.state.party) healFull(mon); g.sound.sfx('heal'); await ui.say(['Trop faible. Je soigne tes Pokémon : reviens quand tu veux.'], qui(P[i])); return; }
      await this.demande(d.id, { a: 'maj', salle: 'b3', donnees: { duel: i + 1 } });
      if (i + 1 < P.length) await ui.say(['Ouah, t\'es vraiment pas un rigolo, toi !', `Mais ${P[i + 1].nom} est bien plus coriace que moi !`], qui(P[i]));
    }
    // la scène : ils voient le sceptre... et tout le repaire l'apprend
    await ui.say(['Bon sang... Tu es vraiment très fort.', 'Hé, attends. Qu\'est-ce que tu tiens là ?'], qui(P[0]));
    g.sound.sfx('encounter'); g.view.shake = 0.25;
    for (const n of g.npcs) if (P.some((q) => n.id === `${d.id}:${q.id}`)) n.bang = true;
    await attendre(700);
    await ui.say(['C\'est... c\'est le sceptre du roi !', 'Comment tu l\'as chopé ?!'], qui(P[1]));
    await ui.say(['IL A LE SCEPTRE ! LES GARS ! IL A LE SCEPTRE DU ROI !'], qui(P[0]));
    g.view.shake = 0.4; g.sound.sfx('bang');
    await ui.say(['Des cris éclatent dans tout le repaire. Des dizaines de brigands se tournent vers toi.', 'Pas le temps de discuter : tu fonces dans le passage !']);
    for (const n of g.npcs) n.bang = false;
    // ton premier Pokémon force le passage... et la voûte s'effondre derrière toi
    const mon = g.lead?.() || g.state.party.find((q) => q.hp > 0);
    if (mon) { g.sound.cry(ASSETS.cry(mon.sp)); await ui.say(`${monName(mon)} jaillit de sa Poké Ball et fonce dans le passage !`); }
    const p4 = d.salles.find((q) => q.id === 'p4'), m4 = g.world.maps[p4.carte], [x, y] = m4.donjon.plan.depart;
    g.sound.sfx('exit');
    await g.warp({ map: m4.id, x, y: y - 1, dir: 'up' }, 'exit');
    g.view.shake = 0.6; g.sound.sfx('bang');
    await this.demande(d.id, { a: 'maj', salle: 'b3', donnees: { passe: true } });
    await ui.say(['Dans la violence du passage, la voûte craque...', 'BRAOUM ! Des tonnes de pierres s\'effondrent derrière toi !']);
    if (mon) await ui.say(`${monName(mon)} revient dans sa Poké Ball.`);
    await ui.say(['Le passage est bouché. Impossible de revenir en arrière.', 'Le noir complet... De l\'autre côté des roches, les cris des brigands s\'étouffent.']);
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
    await ui.say('Bienvenue dans la Caverne d\'Ali Baba !', qui);
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
    if (s.sepulture) { const E = this.dTombeau(d, 'g11'); return E.battu ? 'le roi dort' : E.ouvert ? 'sarcophage ouvert' : `brasiers ${(E.feux || []).filter(Boolean).length}/5`; }
    if (s.gardes) { const n = this.dorment(d, s).length; return n ? `${n} moine${n > 1 ? 's' : ''} endormi${n > 1 ? 's' : ''}` : 'les moines veillent'; }
    return '';
  },
};
