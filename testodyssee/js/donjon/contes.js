// testodyssee/js/donjon/contes.js — mécaniques du Bois des Contes (donjons/contes.js), ajoutées à la classe Donjons
// (jeu.js). Seul ou à plusieurs, sans mécanique de groupe : l'avancée de chaque conte est partagée par le salon (état
// des salles, action « maj »), le reste (chutes, bruit, souffle de la baleine) se joue chez chaque joueur.
//
// Hansel et Gretel : la sorcière demande quatre services (des objets cachés dans sa maison), puis attend à la cuisine.
// Le Petit Chaperon rouge : la forêt sombre, puis Mère-Grand... qui n'est pas Mère-Grand.
// Jack : la tige (feuilles fragiles qui tombent une fois quittées, le vide, les paliers), les nuages, le château du
// géant endormi (le plancher qui grince le réveille), la poule aux œufs d'or.
// Pinocchio : la gorge de la baleine (son souffle repousse qui n'est pas à l'abri), l'estomac (les épaves s'enfoncent
// si l'on s'y arrête), l'épave (des matelots de bois, un menteur, la clé), la cabine de Geppetto (le grand feu).
import { T, walkable } from '../../../odyssee/js/world/tiles.js';
import { BUILDINGS } from '../../../odyssee/js/world/mapgen.js';
import { SPECIES } from '../../../odyssee/js/data/species.js';
import { monName } from '../../../odyssee/js/core/mon.js';
import { dessinerZzz } from '../rendu.js';
import { battu } from './etat.js';

const cle = (x, y) => x + ',' + y;
const estContes = (d) => !!d?.contes;
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
/** ce que la sorcière demande */
const SERVICES = ['grimoire', 'lunettes', 'louche', 'sucre'];
/** l'épave : le menteur et le coffre de la clé */
const MATELOTS = [
  { dit: 'La clé de la cabine ? Elle n\'est pas dans mon coffre, ça je peux te le jurer.', ment: false },
  { dit: 'Le capitaine l\'a cachée dans le coffre de Petit-Louis. Je l\'ai vu faire.', ment: false },
  { dit: 'Moi ? Il n\'y a rien du tout dans mon coffre. Rien de rien !', ment: true },
  { dit: 'Sardine ne ment jamais. Moi, je ne dis rien de plus.', ment: false },
];
const COFFRE_CLE = 2;
/** le souffle de la baleine : un cycle, l'avertissement, la vague */
const SOUFFLE = { cycle: 8, alerte: 5, vague: 6.5 };
const ENFONCE = 1.6;

export const Contes = {
  contesIci() { return [...this.defs.values()].find((d) => estContes(d) && this.estDans(d)); },
  salleContes(d, m = this.game.mapObj) { return m && d.salles.find((s) => s.carte === m.id); },
  dContes(d, sid) { return this.etats[d.id]?.salles[sid]?.donnees || {}; },
  majContes(d, sid, donnees) { return this.demande(d.id, { a: 'maj', salle: sid, donnees }); },
  carteContes(d, sid) { return this.game.world.maps[d.salles.find((s) => s.id === sid)?.carte]; },

  /** où l'on arrive en passant par la marque c : à côté de la marque d'en face (devant la porte d'une maison) */
  arriveeContes(d, c) {
    const o = d.objets[c], s = d.salles.find((q) => q.id === o.vers), m = this.game.world.maps[s.carte], P = m.donjon.plan, [x, y] = P.objets[o.cible][0];
    if (d.objets[o.cible].type === 'maison') return { map: m.id, x, y: y + 1, dir: 'down' };
    const sol = new Set(P.sol.map(([a, b]) => cle(a, b)));
    const bloque = new Set([...P.decor.map(([, a, b]) => cle(a, b)), ...Object.values(P.pnj).flat().map(([a, b]) => cle(a, b)),
      ...Object.entries(P.objets).filter(([k]) => !d.objets[k].sol || ['vide', 'lien', 'maison'].includes(d.objets[k].type)).flatMap(([, l]) => l.map(([a, b]) => cle(a, b)))]);
    for (const [dx, dy, dir] of [[0, 1, 'down'], [0, -1, 'up'], [1, 0, 'right'], [-1, 0, 'left']]) {
      const k = cle(x + dx, y + dy);
      if (sol.has(k) && !bloque.has(k)) return { map: m.id, x: x + dx, y: y + dy, dir };
    }
    return { map: m.id, x: P.depart[0], y: P.depart[1], dir: 'up' };
  },

  poserObjetsContes(d, m) {
    if (!estContes(d)) return;
    const g = this.game, P = m.donjon.plan, s = this.salleContes(d, m);
    m.contes = { vide: new Set(), fragiles: new Set(), paliers: new Set(), abris: new Set(), epaves: new Set(), grince: new Set() };
    for (const [c, l] of Object.entries(P.objets)) {
      const o = d.objets[c];
      for (const [x, y] of l) {
        if (o.type === 'tuile') m.set(x, y, T[o.t]);
        else if (o.type === 'vide') m.contes.vide.add(cle(x, y));
        else if (o.type === 'fragile') { m.contes.fragiles.add(cle(x, y)); m.set(x, y, T.DARKTALL); }
        else if (o.type === 'palier') m.contes.paliers.add(cle(x, y));
        else if (o.type === 'abri') m.contes.abris.add(cle(x, y));
        else if (o.type === 'epave') m.contes.epaves.add(cle(x, y));
        else if (o.type === 'grince') m.contes.grince.add(cle(x, y));
        else if (o.type === 'service') m.object(x, y, { use: () => this.service(d, o) });
        else if (o.type === 'cage') m.object(x, y, { use: () => this.cage(d) });
        else if (o.type === 'poule') m.object(x, y, { use: () => this.poule(d) });
        else if (o.type === 'coffrePn') m.object(x, y, { use: () => this.coffrePn(d, o.n) });
        else if (o.type === 'bucher') m.object(x, y, { use: () => this.bucher(d) });
      }
    }
    // passages : en plein air, un chemin ; dedans, une sortie ou un escalier ; la cabine de Geppetto est fermée à clé
    for (const [c, l] of Object.entries(P.objets)) {
      const o = d.objets[c]; if (o.type !== 'lien') continue;
      const [x, y] = l[0];
      if (o.bloque) { m.set(x, y, T.CAVE); m.prop('porte_hall', x, y); m.object(x, y, { use: () => this.porteCabine(d, c) }); continue; }
      if (m.outdoor) {
        m.set(x, y, T.PATH);
        if (o.liane) m.deco.push({ k: 'liane', x, y });
        if (o.gueule) m.deco.push({ k: 'entree_mine', x, y });
      } else if (o.escalier) { m.set(x, y, T.CAVE); m.deco.push({ k: 'ladder', x, y }); }
      else { m.set(x, y, T.CAVEDOOR); m.deco.push({ k: 'exitlight', x, y }); }
      m.warp(x, y, { ...this.arriveeContes(d, c), step: true });
      // le labyrinthe : une pancarte dans la haie, à côté de chaque sortie
      if (o.conte) this.pancarteSortie(m, x, y, o.conte);
    }
    // maisons : le bâtiment posé sur la marque (sa porte), qui mène à la salle `vers`
    for (const [c, l] of Object.entries(P.objets)) {
      const o = d.objets[c]; if (o.type !== 'maison') continue;
      const [x, y] = l[0], B = BUILDINGS[o.batiment];
      m.building(o.batiment, x - B.door, y - (B.d - 1), { roof: o.toit, name: o.nom });
      if (o.ferme) { m.set(x, y, T.BUILD); m.object(x, y, { use: () => this.game.ui.say(['La porte est fermée.', 'Derrière, on entend trois grosses voix qui se disputent à propos d\'une soupe trop chaude.']) }); continue; }
      m.warp(x, y, { ...this.arriveeContes(d, c), dir: 'up' });
    }
    // l'entrée du labyrinthe : on y entre en marchant
    if (m.id === d.carte && m.donjon.exterieur) {
      const E = m.donjon.exterieur, w = E.carte.warpAt(...E.porte); if (w) w.step = true;
      if (P.sortie) { m.set(...P.sortie, T.PATH); m.deco = m.deco.filter((q) => !(q.k === 'exitlight' && q.x === P.sortie[0] && q.y === P.sortie[1])); const ws = m.warpAt(...P.sortie); if (ws) ws.step = true; }
    }
    // le labyrinthe : de vraies haies, hautes, à la place des buissons
    if (s.haies) for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (m.get(x, y) !== T.BUSH) continue;
      m.set(x, y, T.BLOCK); m.deco.push({ k: 'haie' + ((x * 7 + y * 13) % 3), x, y });
    }
    // les PNJ des contes
    for (const n of m.npcs) {
      const k = Object.keys(d.pnj).find((q) => `${d.id}:${d.pnj[q].id}` === n.id), Q = k && d.pnj[k]; if (!Q) continue;
      if (Q.sorciere === 'hall') { n.talk = () => this.sorciereHall(d); n.when = () => !this.dContes(d, 'hg1').cuisine; }
      else if (Q.sorciere === 'cuisine') { n.talk = () => this.sorciereCuisine(d); n.when = () => !!this.dContes(d, 'hg1').cuisine && !this.dContes(d, 'hg1').battue; }
      else if (Q.enfant) n.talk = () => this.enfants(d);
      else if (Q.chaperon) n.talk = () => this.chaperon(d);
      else if (Q.loup) { n.talk = () => this.loup(d); n.when = () => !this.dContes(d, 'cr4').loup; }
      else if (Q.mereGrand) { n.talk = () => this.mereGrand(d); n.when = () => !!this.dContes(d, 'cr4').loup; }
      else if (Q.jack) n.talk = () => this.jack(d);
      else if (Q.geant) n.talk = () => this.reveilGeant(d, true);
      else if (Q.pecheur) n.talk = () => this.pecheur(d);
      else if (Q.matelot != null) n.talk = () => this.matelot(d, Q.matelot, Q);
      else if (Q.marionnette) { n.talk = () => this.marionnette(d); n.when = () => !this.dContes(d, 'pn3').marionnette; }
      else if (Q.geppetto) n.talk = () => this.geppetto(d);
      else if (Q.pinocchio) n.talk = () => this.pinocchio(d);
      else if (Q.equipe && !Q.boss) {
        // les dresseurs de la forêt : ils restent là une fois battus
        n.when = () => true;
        const talk = n.talk; n.talk = () => (battu(this.etats[d.id], d, k) ? g.ui.say(Q.battu || 'Ce bois est trop sombre pour moi...', { speaker: `${Q.cls} ${Q.nom}` }) : talk());
      }
    }
  },
  /** une pancarte dans la haie, à côté du couloir qui mène à la sortie */
  pancarteSortie(m, x, y, conte) {
    const ix = x === 1 ? 2 : x === m.w - 2 ? m.w - 3 : x, iy = y === 1 ? 2 : y;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = ix + dx, b = iy + dy;
      if ((a === x && b === y) || m.get(a, b) !== T.BUSH) continue;
      m.sign(a, b, conte); return;
    }
  },

  /** l'état partagé change : les PNJ qui apparaissent ou s'en vont */
  appliquerContes(d) {
    if (estContes(d) && this.contesIci() === d) this.game.refreshNpcs?.();
  },

  /* ---------------- chaque pas ---------------- */
  async apresPasContes() {
    const g = this.game, d = this.contesIci(); if (!d || g.busy) return;
    const m = g.mapObj, p = g.player, s = this.salleContes(d), C = m.contes; if (!C || !s) return;
    const ici = cle(p.x, p.y);
    g.busy = true;
    try {
      // la tige : paliers, feuilles fragiles, le vide
      if (C.paliers.has(ici) || (s.id === 'jk1' && p.x === m.donjon.plan.depart[0] && p.y === m.donjon.plan.depart[1])) this.palier = [m.id, p.x, p.y];
      if (this.fragileQuittee && this.fragileQuittee[0] === m.id && this.fragileQuittee[1] !== ici) this.tomberFeuille(m, this.fragileQuittee[1]);
      this.fragileQuittee = C.fragiles.has(ici) ? [m.id, ici] : null;
      if (C.vide.has(ici)) { await this.chuteTige(d, m); return; }
      // la gorge : l'abri où l'on revient quand le souffle repousse
      if (C.abris.has(ici) || (s.id === 'pn1' && p.x === m.donjon.plan.depart[0] && p.y === m.donjon.plan.depart[1])) this.abri = [m.id, p.x, p.y];
      // le château : le plancher qui grince
      if (C.grince.has(ici) && !this.dContes(d, 'jk3').poule) await this.grincement(d);
      // la cuisine de la sorcière : elle t'attend
      if (s.id === 'hg1' && this.dContes(d, 'hg1').cuisine && !this.dContes(d, 'hg1').battue) {
        const n = g.npcs.find((q) => q.id === `${d.id}:sorciere-cuisine`);
        if (n && Math.abs(n.x - p.x) + Math.abs(n.y - p.y) <= 3) await this.sorciereCuisine(d);
      }
    } finally { g.busy = false; }
  },
  tickContes(dt) {
    const g = this.game, d = this.contesIci(), m = g.mapObj, s = d && this.salleContes(d);
    if (!s) { if (this.zzzGeant) { dessinerZzz(g.view, []); this.zzzGeant = false; } this.bruit = 0; return; }
    // le géant ronfle
    const geant = s.id === 'jk3' ? g.npcs.filter((n) => n.id === `${d.id}:geant`) : [];
    if (geant.length || this.zzzGeant) { dessinerZzz(g.view, geant); this.zzzGeant = geant.length > 0; }
    if (s.id !== 'jk3') this.bruit = 0;
    if (g.busy || g.bv.alive || !g.state) return;
    // la gorge de la baleine : elle inspire, puis son souffle repousse qui n'est pas à l'abri
    if (s.id === 'pn1') {
      const t0 = this.souffleT || 0, t = (this.souffleT = (t0 + dt) % SOUFFLE.cycle);
      const passe = (v) => (t0 < v && t >= v) || (t < t0 && (t0 < v || t >= v));
      if (passe(SOUFFLE.alerte)) { g.view.shake = 0.12; g.sound.sfx('ledge'); this.alerteSouffle = true; this.majPanneau?.(); }
      if (passe(SOUFFLE.vague)) { this.alerteSouffle = false; this.majPanneau?.(); this.vagueSouffle(d, m); }
    }
    // l'estomac : une épave où l'on reste s'enfonce
    if (s.id === 'pn2') {
      const p = g.player;
      if (m.contes.epaves.has(cle(p.x, p.y)) && !p.move) { this.surEpave = (this.surEpave || 0) + dt; if (this.surEpave > ENFONCE) { this.surEpave = 0; this.coulerEpave(d, m); } }
      else this.surEpave = 0;
    }
  },

  /* ---------------- Hansel et Gretel ---------------- */
  async sorciereHall(d) {
    const g = this.game, ui = g.ui, H = this.dContes(d, 'hg1'), qui = { speaker: 'Vieille dame' };
    if (!H.accepte) {
      // le scénario de l'entrée dans la maison viendra ici
      await ui.say(['Oh ! De la visite ! Ça faisait si longtemps...', 'Entre, entre, mon petit. N\'aie pas peur d\'une pauvre vieille.',
        'Ma vue baisse, mes jambes ne me portent plus, et j\'ai perdu tant de choses dans cette grande maison.',
        'Tu voudrais bien m\'aider ? Il me faut mon grimoire de recettes, mes lunettes, ma louche d\'argent et un sac de sucre.',
        'Ils sont quelque part dans la maison : à l\'étage, au grenier, à la cave...'], qui);
      await this.majContes(d, 'hg1', { accepte: true, trouves: [] });
      await ui.say('Rapporte-moi tout ça, et je te ferai un gâteau comme tu n\'en as jamais mangé. Hi hi hi...', qui);
      return;
    }
    const t = H.trouves || [], reste = SERVICES.filter((k) => !t.includes(k));
    if (reste.length) {
      const nom = (k) => d.objets[Object.keys(d.objets).find((c) => d.objets[c].objet === k)].nom;
      await ui.say([`Il me manque encore ${reste.map(nom).join(', ')}.`, 'Cherche bien, mon petit. Cette maison a plus de recoins qu\'on ne croit.'], qui);
      return;
    }
    await ui.say(['Tout ! Tu as tout retrouvé ! Quel enfant serviable...', 'Viens, viens dans la cuisine. Le four est déjà chaud.'], qui);
    await this.majContes(d, 'hg1', { cuisine: true });
  },
  async service(d, o) {
    const g = this.game, ui = g.ui, H = this.dContes(d, 'hg1');
    const t = H.trouves || [];
    if (!H.accepte) { await ui.say('Rien d\'intéressant... pour l\'instant.'); return; }
    if (t.includes(o.objet)) { await ui.say('Il n\'y a plus rien ici.'); return; }
    await ui.say(o.trouve);
    g.sound.sfx('item');
    await this.majContes(d, 'hg1', { trouves: [...t, o.objet] });
    await ui.say(`Tu prends ${o.nom}. (${t.length + 1}/${SERVICES.length})`);
  },
  async sorciereCuisine(d) {
    const g = this.game, ui = g.ui, H = this.dContes(d, 'hg1'), qui = { speaker: 'Grisemine' };
    if (H.battue) return;
    // le scénario entre la fin des services et l'attaque viendra ici
    await ui.say(['Pose tout ça sur la table, mon petit. Là. Parfait.', 'Tu sais ce qui manque encore à ma recette ?', '...', 'Un enfant bien dodu.'], qui);
    g.sound.sfx('encounter'); g.view.shake = 0.3;
    await ui.say(['HI HI HI ! Ces deux-là dans la cage ne sont pas encore assez gras...', 'Mais toi, tu feras très bien l\'affaire !'], qui);
    const P = d.pnj['ŵ'];
    const res = await this.combat({ ...P, perd: 'Non... mon four... mon beau four...' }, this.equipeContes(P.equipe));
    if (res !== 'win') { await this.defaite(d); return; }
    await this.majContes(d, 'hg1', { battue: true });
    g.view.shake = 0.4; g.sound.sfx('bang');
    await ui.say(['La sorcière recule, trébuche... et bascule dans son propre four !', 'Un nuage de suie noire envahit la cuisine. Quand il retombe, il ne reste d\'elle qu\'un chapeau fumant.']);
  },
  async cage(d) {
    const g = this.game, ui = g.ui, H = this.dContes(d, 'hg1');
    if (H.liberes) { await ui.say('La cage est vide, sa porte grande ouverte.'); return; }
    if (!H.battue) { await ui.say(['Une cage de fer, fermée par un gros cadenas.', 'La clé doit être sur la sorcière.']); return; }
    g.sound.sfx('door');
    await this.majContes(d, 'hg1', { liberes: true });
    await ui.say(['Dans le chapeau fumant, une grosse clé noire.', 'Le cadenas cède. La porte de la cage s\'ouvre !']);
    await ui.say(['Merci ! Merci ! Elle voulait nous manger, tu sais. Gretel d\'abord, puis moi.', 'On rentre à la maison. Par le chemin, cette fois. Pas par la forêt.'], { speaker: 'Hansel' });
  },
  async enfants(d) {
    const ui = this.game.ui, H = this.dContes(d, 'hg1');
    if (H.liberes) { await ui.say('On n\'oubliera jamais ce que tu as fait pour nous.', { speaker: 'Gretel' }); return; }
    await ui.say(['Chut ! Elle va t\'entendre !', 'Elle nous donne des gâteaux toute la journée pour nous engraisser... Et après, elle allume le four.'], { speaker: 'Gretel' });
    await ui.say('Ne fais pas confiance à la vieille ! Ne lui rapporte rien !', { speaker: 'Hansel' });
  },

  /* ---------------- le Petit Chaperon rouge ---------------- */
  async chaperon(d) {
    const ui = this.game.ui, qui = { speaker: 'Chaperon rouge' };
    if (this.dContes(d, 'cr4').loup) { await ui.say(['Tu as sauvé Mère-Grand ? Le loup était chez elle ?!', 'Je ne m\'écarterai plus jamais du chemin. Promis.'], qui); return; }
    await ui.say(['Maman m\'envoie porter une galette et un petit pot de beurre à Mère-Grand.', 'Elle habite de l\'autre côté du bois, dans une petite maison au fond d\'une clairière.',
      'Mais il fait si noir... et on dit qu\'un loup rôde. Tu veux bien passer devant ? Je te suis.'], qui);
  },
  async loup(d) {
    const g = this.game, ui = g.ui, Q = d.pnj['ł'];
    await ui.say(['Une voix grave et rauque s\'élève du lit :', '« Entre, mon enfant. Approche... »']);
    const r = [['Mère-Grand, comme vous avez de grands bras !', 'C\'est pour mieux t\'embrasser, mon enfant.'], ['Mère-Grand, comme vous avez de grandes oreilles !', 'C\'est pour mieux t\'écouter, mon enfant.'],
      ['Mère-Grand, comme vous avez de grands yeux !', 'C\'est pour mieux te voir, mon enfant.']];
    for (const [moi, elle] of r) { await ui.say(moi); await ui.say(elle, { speaker: 'Mère-Grand' }); }
    await ui.say('Mère-Grand, comme vous avez de grandes dents !');
    g.sound.sfx('encounter'); g.view.shake = 0.4;
    await ui.say('C\'EST POUR MIEUX TE MANGER !', { speaker: 'Grand méchant loup' });
    const res = await this.combat({ ...Q, nom: 'le loup', perd: 'Grr... Ce n\'est que partie remise...' }, this.equipeContes(Q.equipe));
    if (res !== 'win') { await this.defaite(d); return; }
    await this.majContes(d, 'cr4', { loup: true });
    g.sound.sfx('bang');
    await ui.say(['Le loup bondit par la fenêtre et s\'enfuit dans les bois en hurlant.', 'Dans l\'armoire, quelqu\'un frappe faiblement...']);
  },
  async mereGrand() {
    await this.game.ui.say(['Merci, mon enfant... Il m\'avait enfermée dans l\'armoire.', 'Il disait qu\'il me garderait pour le dessert.', 'Prends donc une part de galette, tu l\'as bien méritée.'], { speaker: 'Mère-Grand' });
  },

  /* ---------------- Jack et le haricot magique ---------------- */
  async jack(d) {
    const ui = this.game.ui, qui = { speaker: 'Jack' };
    if (this.dContes(d, 'jk3').poule) { await ui.say(['La poule aux œufs d\'or ! Tu l\'as ramenée ?!', 'Maman ne me grondera plus jamais pour la vache.'], qui); return; }
    await ui.say(['J\'ai échangé notre vache contre cinq haricots magiques. Maman les a jetés par la fenêtre...', 'Et cette nuit, la tige a poussé jusqu\'au ciel !',
      'Là-haut, il paraît qu\'un géant garde une poule qui pond des œufs d\'or. Mais moi, j\'ai le vertige.', 'Attention aux feuilles sombres : elles ne tiennent qu\'une fois.'], qui);
  },
  /** une feuille fragile qu'on vient de quitter tombe dans le vide */
  tomberFeuille(m, k) {
    const g = this.game, C = m.contes; if (!C.fragiles.has(k) || C.vide.has(k)) return;
    const [x, y] = k.split(',').map(Number);
    C.vide.add(k); (C.tombees ||= new Set()).add(k);
    m.set(x, y, T.GRASS); m.deco.push({ k: 'gouffre', x, y });
    if (g.mapObj === m) { g.view.decoAt.set(k, m.deco[m.deco.length - 1]); g.view.rebuildAt(x, y); }
  },
  /** les feuilles fragiles repoussent (après une chute) */
  repousserFeuilles(m) {
    const g = this.game, C = m.contes;
    for (const k of C.tombees || []) {
      const [x, y] = k.split(',').map(Number);
      C.vide.delete(k); m.set(x, y, T.DARKTALL); m.deco = m.deco.filter((q) => !(q.x === x && q.y === y && q.k === 'gouffre'));
      if (g.mapObj === m) { g.view.decoAt.delete(k); g.view.rebuildAt(x, y); }
    }
    C.tombees = new Set();
  },
  async chuteTige(d, m) {
    const g = this.game, ui = g.ui, [id, x, y] = this.palier && this.palier[0] === m.id ? this.palier : [m.id, ...m.donjon.plan.depart];
    g.sound.sfx('ledge'); g.view.shake = 0.3;
    await ui.say(['Le vide !', 'Tu dégringoles de feuille en feuille...'], { auto: 900 });
    this.fragileQuittee = null;
    this.repousserFeuilles(m);
    await g.warp({ map: id, x, y, dir: 'up' }, 'exit');
    await ui.say('Une grande feuille amortit ta chute. Ouf.', { auto: 900 });
  },
  async grincement(d) {
    const g = this.game, ui = g.ui;
    this.bruit = (this.bruit || 0) + 1;
    g.sound.sfx('bump');
    if (this.bruit === 1) await ui.say('Crrrrr... Le plancher grince sous tes pieds.', { auto: 900 });
    else if (this.bruit === 2) await ui.say('Le géant grogne et se retourne dans son sommeil...', { auto: 1100 });
    else await this.reveilGeant(d, false);
  },
  /** le géant se réveille (trop de bruit, ou on l'a secoué) */
  async reveilGeant(d, expres) {
    const g = this.game, ui = g.ui, Q = d.pnj['Ǵ'], qui = { speaker: 'Géant' };
    if (expres && !(await ui.yesNo('Le géant ronfle comme un orage. Le réveiller ?'))) return;
    g.sound.sfx('encounter'); g.view.shake = 0.5;
    await ui.say(['Grrraaah... Qui ose... ?', 'Je sens la chair fraîche ! Qu\'il soit vivant ou qu\'il soit mort, j\'en ferai mon pain !'], qui);
    const res = await this.combat({ ...Q, perd: 'Grrr... Zzz...' }, this.equipeContes(Q.equipe));
    this.bruit = 0;
    if (res !== 'win') { await this.defaite(d); return; }
    await ui.say('Le géant vacille, s\'écroule sur son trône... et se remet à ronfler.');
  },
  async poule(d) {
    const g = this.game, ui = g.ui;
    if (this.dContes(d, 'jk3').poule) { await ui.say('Le panier est vide.'); return; }
    await ui.say(['Dans un panier doré, une poule dort sur un œuf qui brille comme le soleil.', 'La poule aux œufs d\'or !']);
    if (!(await ui.yesNo('L\'emporter ?'))) return;
    g.sound.sfx('item');
    await this.majContes(d, 'jk3', { poule: true });
    await ui.say('Tu glisses la poule sous ton bras. Elle n\'a même pas ouvert un œil.');
  },

  /* ---------------- Pinocchio ---------------- */
  async pecheur(d) {
    const ui = this.game.ui, qui = { speaker: 'Pêcheur' };
    if (this.dContes(d, 'pn4').sortis) { await ui.say(['La baleine a éternué si fort que les vagues sont arrivées jusqu\'au village !', 'Et Geppetto est revenu, avec son petit. Quelle histoire...'], qui); return; }
    await ui.say(['Cette baleine dort là depuis des semaines. Un Wailord grand comme une montagne.', 'Elle a avalé le bateau du vieux Geppetto. Avec Geppetto dedans.',
      'Il cherchait son fils, une marionnette qui s\'était enfuie... Si tu entres par sa gueule, garde la tête froide.'], qui);
  },
  /** le souffle de la baleine dans la gorge : qui n'est pas à l'abri est repoussé au dernier abri */
  async vagueSouffle(d, m) {
    const g = this.game, p = g.player; if (g.busy) return;
    if (m.contes.abris.has(cle(p.x, p.y))) return;
    const [id, x, y] = this.abri && this.abri[0] === m.id ? this.abri : [m.id, ...m.donjon.plan.depart];
    g.busy = true;
    try {
      g.view.shake = 0.4; g.sound.sfx('exit');
      await g.ui.say('FWOOOOSH ! Le souffle de la baleine te repousse !', { auto: 900 });
      await g.warp({ map: id, x, y, dir: 'up' }, 'exit');
    } finally { g.busy = false; }
  },
  async coulerEpave(d, m) {
    const g = this.game; if (g.busy) return;
    g.busy = true;
    try {
      g.sound.sfx('ledge');
      await g.ui.say(['L\'épave s\'enfonce dans le suc bouillonnant !', 'Tu sautes en arrière juste à temps.'], { auto: 1000 });
      const [x, y] = m.donjon.plan.depart;
      await g.warp({ map: m.id, x, y, dir: 'up' }, 'exit');
    } finally { g.busy = false; }
  },
  async matelot(d, i, Q) {
    const g = this.game, ui = g.ui, M = MATELOTS[i], qui = { speaker: `${Q.cls} ${Q.nom}` };
    if (this.dContes(d, 'pn3').cle) { await ui.say('Tu as trouvé la clé ? Alors va, Geppetto t\'attend.', qui); return; }
    if (!this.matelotsVus) { this.matelotsVus = true; await ui.say('Ce matelot n\'est pas fait de chair : c\'est une marionnette de bois, aux joints qui grincent.'); }
    await ui.say(M.dit, qui);
    if (!(await ui.yesNo('« Tu es sûr ? »'))) return;
    if (M.ment) { await ui.say('Évidemment que j\'en suis sûr !', qui); g.sound.sfx('bump'); await ui.say('Son nez de bois s\'allonge d\'un coup !'); }
    else await ui.say('Sûr et certain.', qui);
  },
  async coffrePn(d, n) {
    const g = this.game, ui = g.ui, E = this.dContes(d, 'pn3');
    if (E.cle) { await ui.say('Un coffre vide.'); return; }
    if (n !== COFFRE_CLE) { await ui.say(['Le coffre est vide.', 'Quelqu\'un, sur ce bateau, a menti.']); return; }
    await ui.say('Au fond du coffre, sous de vieilles voiles, une clé de laiton !');
    g.sound.sfx('item');
    await this.majContes(d, 'pn3', { cle: true });
    await ui.say('Tu prends la clé de la cabine de Geppetto.');
  },
  async marionnette(d) {
    const g = this.game, ui = g.ui, Q = d.pnj['ḃ'], qui = { speaker: 'Fil-de-Fer' };
    await ui.say(['Ha ! Encore un visiteur. Je suis un vrai garçon, tu sais. En chair et en os.', '... Tu ne me crois pas ? Personne ne me croit jamais !'], qui);
    const res = await this.combat({ ...Q, perd: 'Mes fils... mes fils sont coupés...' }, this.equipeContes(Q.equipe));
    if (res !== 'win') { await this.defaite(d); return; }
    await this.majContes(d, 'pn3', { marionnette: true });
    await ui.say('La marionnette s\'effondre en un tas de bois et de ficelles.');
  },
  async porteCabine(d, c) {
    const g = this.game, ui = g.ui, E = this.dContes(d, 'pn3');
    if (!E.marionnette) { await ui.say('La marionnette te barre le passage.'); return; }
    if (!E.cle) { await ui.say('La porte de la cabine est fermée à clé.'); return; }
    g.sound.sfx('door');
    await g.warp(this.arriveeContes(d, c), 'door');
  },
  async geppetto(d) {
    const g = this.game, ui = g.ui, E = this.dContes(d, 'pn4'), qui = { speaker: 'Geppetto' };
    if (E.plan) { await ui.say('Allume le bûcher, vite ! Un grand feu, et elle nous recrachera !', qui); return; }
    await ui.say(['Quelqu\'un ! Enfin quelqu\'un !', 'Je suis Geppetto. Et voici mon fils, Pinocchio. Je l\'ai cherché sur toutes les mers...', '... et c\'est dans le ventre de cette baleine que je l\'ai retrouvé.',
      'J\'ai un plan pour sortir d\'ici : faire éternuer la bête.', 'Avec les planches de mon bateau, j\'ai monté un bûcher. Il suffit d\'y mettre le feu.'], qui);
    await this.majContes(d, 'pn4', { plan: true });
  },
  async pinocchio(d) {
    const ui = this.game.ui, qui = { speaker: 'Pinocchio' };
    if (this.dContes(d, 'pn4').sortis) { await ui.say('Je ne mentirai plus jamais. Enfin... presque jamais.', qui); return; }
    await ui.say(['Je n\'ai pas peur du tout. Pas du tout !', '... Mon nez vient de s\'allonger, hein ?'], qui);
  },
  async bucher(d) {
    const g = this.game, ui = g.ui, E = this.dContes(d, 'pn4');
    if (E.sortis) { await ui.say('Il ne reste que des cendres.'); return; }
    if (!E.plan) { await ui.say('Un tas de planches arrachées à un bateau.'); return; }
    if (!(await ui.yesNo('Mettre le feu au bûcher ?'))) return;
    const feu = g.state.party.find((m) => m.hp > 0 && SPECIES[m.sp]?.t.includes('fire'));
    if (feu) await ui.say(`${monName(feu)} crache une gerbe de flammes sur le bûcher !`);
    else await ui.say('Geppetto craque une allumette et la jette sur les planches.');
    g.sound.sfx('bang'); g.view.shake = 0.3;
    await ui.say(['Le feu prend. La fumée monte, épaisse, noire...', 'Tout le ventre de la baleine se met à trembler.']);
    await attendre(400);
    g.view.shake = 0.8; g.sound.sfx('exit');
    await ui.say('AAAAH... AAAAH... ATCHOUM !!!');
    await this.majContes(d, 'pn4', { sortis: true });
    const m0 = this.carteContes(d, 'pn0'), [x, y] = m0.donjon.plan.depart;
    await g.warp({ map: m0.id, x, y: y - 2, dir: 'up' }, 'exit');
    await ui.say(['Tu es projeté hors de la gueule et tu retombes dans le sable, trempé jusqu\'aux os.', 'Geppetto et Pinocchio ont réussi à sortir eux aussi. La baleine, elle, s\'éloigne au large.']);
  },

  equipeContes(l) { return this.equipe(l); },

  /* ---------------- encadré ---------------- */
  texteContes(d, s) {
    if (!estContes(d)) return null;
    const H = this.dContes(d, 'hg1');
    if (s.conte === 'hg') return H.liberes ? 'conte terminé' : H.battue ? 'libère les enfants' : H.cuisine ? 'la cuisine' : H.accepte ? `services ${(H.trouves || []).length}/${SERVICES.length}` : 'frappe à la porte';
    if (s.conte === 'cr') return this.dContes(d, 'cr4').loup ? 'conte terminé' : 'trouve la maison de Mère-Grand';
    if (s.conte === 'jk') return this.dContes(d, 'jk3').poule ? 'conte terminé' : s.id === 'jk3' ? `bruit ${this.bruit || 0}/3` : 'monte jusqu\'au géant';
    if (s.conte === 'pn') { const E3 = this.dContes(d, 'pn3'); return this.dContes(d, 'pn4').sortis ? 'conte terminé' : s.id === 'pn1' ? (this.alerteSouffle ? 'elle inspire : à l\'abri !' : 'avance entre deux souffles') : E3.cle ? 'la cabine de Geppetto' : 'trouve la clé'; }
    if (s.conte === 'bo') return 'bientôt';
    if (s.id === 'lab') return 'cinq sorties';
    return null;
  },
};
