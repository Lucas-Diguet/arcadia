// testodyssee/js/donjon/barrage.js — mécaniques du Barrage de Roche-Haute, ajoutées à la classe Donjons (jeu.js).
//
// Le niveau du réservoir (haut ou bas, changé aux pupitres) décide de chaque case marquée dans les plans
// (barrage-salles.js, tools/barrage.py) : fond des bassins (eau ou vase), murets (eau ou mur), rampes (eau ou sol),
// conduites (courant qui emporte le surfeur, ou galerie sèche ; celles qui montent à pic sont infranchissables à sec).
// Leviers et grilles, courant électrique (grilles bleues, monte-charge), tuyautage du local, rocher du canal,
// vannes de crue du couronnement, Anselme dans la salle de contrôle. Le donjon est solo : son état est dans la salle
// « hall » (action « maj » d'etat.js), remis à zéro en sortant.
import { T, walkable } from '../../../odyssee/js/world/tiles.js';
import { itemName } from '../../../odyssee/js/core/items.js';
import { createMon, healFull } from '../../../odyssee/js/core/mon.js';
import { MOVES } from '../../../odyssee/js/data/moves.js';
import { battu } from './etat.js';
import { SALLES_BARRAGE, TUYAUX, ORDRE_VANNES } from '../donjons/barrage-salles.js';
import { BUTIN_BARRAGE } from '../donjons/barrage.js';

const cle = (x, y) => x + ',' + y;
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const COURANT = { '<': 'left', '>': 'right', A: 'up', V: 'down', 'ᐊ': 'left', 'ᐅ': 'right', 'ᐃ': 'up', 'ᐁ': 'down' };
const A_PIC = new Set(['ᐊ', 'ᐅ', 'ᐃ', 'ᐁ']);
const VASE = ['barrage_vase', 'barrage_vase2', 'barrage_vase3'];
const OUV = { d: [[1, 0, 1, 0], [0, 1, 0, 1]], c: [[1, 1, 0, 0], [0, 1, 1, 0], [0, 0, 1, 1], [1, 0, 0, 1]], t: [[1, 1, 1, 0], [0, 1, 1, 1], [1, 0, 1, 1], [1, 1, 0, 1]], x: [[1, 1, 1, 1]] };
const VEC = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const NOM_COULEUR = { rouge: 'rouge', jaune: 'jaune', bleue: 'bleue' };
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
const estBarrage = (d) => d?.id === 'barrage';
const CLE_CONTROLE = 'cle-controle';

/** l'eau arrive-t-elle à la turbine ? cases remplies (« x,y ») et réponse */
export function fluxTuyaux(rot) {
  const P = TUYAUX.pieces, plein = new Set(), vu = new Set(), f = [[0, TUYAUX.entree, 3]];
  let ok = false;
  while (f.length) {
    const [x, y, de] = f.pop();
    if (x < 0 || y < 0 || x >= TUYAUX.w || y >= TUYAUX.h || vu.has(`${x},${y},${de}`)) continue;
    const o = OUV[P[`${x},${y}`]][rot[`${x},${y}`] % OUV[P[`${x},${y}`]].length];
    if (!o[de]) continue;
    vu.add(`${x},${y},${de}`); plein.add(`${x},${y}`);
    for (let v = 0; v < 4; v++) {
      if (!o[v] || v === de) continue;
      if (x === TUYAUX.w - 1 && y === TUYAUX.sortie && v === 1) { ok = true; continue; }
      f.push([x + VEC[v][0], y + VEC[v][1], (v + 2) % 4]);
    }
  }
  return { plein, ok };
}

export const Barrage = {
  barrageIci() { const d = this.defs.get('barrage'); return d && this.estDans(d) ? d : null; },
  /** l'état du donjon (salle « hall ») */
  eb(d) { return this.etats[d.id]?.salles.hall?.donnees || {}; },
  async majB(d, donnees) { return this.demande(d.id, { a: 'maj', salle: 'hall', donnees }); },
  niveauHaut(d) { return (this.eb(d).niveau || 'H') === 'H'; },
  rotations(d) { return { ...TUYAUX.rotations, ...(this.eb(d).rot || {}) }; },

  /* ---------------- la carte ---------------- */
  poserObjetsBarrage(d, m) {
    if (!estBarrage(d)) return;
    const S = d.salles.find((q) => q.carte === m.id), src = SALLES_BARRAGE[S.id];
    m.barrage = { S, src, objets: new Map() };
    m.surf = S.id !== 'couronnement'; m.encounter = null; m.surfEnc = null;   // le lac du couronnement se regarde, il ne se traverse pas
    m.solArene = new Map();
    // passages vers les autres salles
    for (const [x, y, vers, arr] of src.passages) {
      const S2 = d.salles.find((q) => q.id === vers), [ax, ay, dir] = SALLES_BARRAGE[vers].arrivees[arr];
      m.set(x + 1, y + 1, T.CAVEDOOR); m.warp(x + 1, y + 1, { map: S2.carte, x: ax + 1, y: ay + 1, dir }); m.deco.push({ k: 'exitlight', x: x + 1, y: y + 1 });
    }
    for (const o of src.objets) {
      const X = o.x + 1, Y = o.y + 1;
      m.barrage.objets.set(cle(X, Y), o);
      if (o.t !== 'tuyau' && o.t !== 'marque') m.object(X, Y, { use: () => this.objetBarrage(d, m, o) });
    }
    this.appliquerBarrage(d, m, false, true);
  },
  /** chaque case suit l'état (niveau de l'eau, leviers, courant...) ; vue : la carte est à l'écran */
  appliquerBarrage(d, m, vue = false, rochers = false) {
    if (!m?.barrage) return;
    const g = this.game, E = this.eb(d), H = (E.niveau || 'H') === 'H', P = m.barrage.src.plan;
    const changes = [];
    const set = (x, y, t) => { if (m.get(x, y) !== t) { m.set(x, y, t); changes.push([x, y]); } };
    const sol = (x, y, k) => { const c = cle(x, y), avant = m.solArene.get(c); if (k) m.solArene.set(c, k); else m.solArene.delete(c); if (avant !== k) changes.push([x, y]); };
    const deco = (x, y, k) => {
      const i = m.deco.findIndex((q) => q.x === x && q.y === y && q.barrage);
      if (!k) { if (i >= 0) { m.deco.splice(i, 1); changes.push([x, y]); } return; }
      if (i >= 0) { if (m.deco[i].k !== k) { m.deco[i].k = k; changes.push([x, y]); } return; }
      m.deco.push({ k, x, y, barrage: true }); changes.push([x, y]);
    };
    // les rochers restent où ils sont (au départ : à leur place du plan)
    const roc = new Set();
    if (rochers) for (const [x, y] of m.barrage.src.rochers || []) roc.add(cle(x + 1, y + 1));
    else for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.get(x, y) === T.BOULDER) roc.add(cle(x, y));
    m.courants = H ? new Map() : null;
    for (let y = 0; y < P.length; y++) for (let x = 0; x < P[y].length; x++) {
      const c = P[y][x], X = x + 1, Y = y + 1;
      if (roc.has(cle(X, Y))) { set(X, Y, T.BOULDER); if (COURANT[c]) sol(X, Y, H ? null : 'barrage_conduite'); continue; }
      if (c === '~') { set(X, Y, H ? T.WATER : T.CAVE); sol(X, Y, H ? null : VASE[(X * 7 + Y * 13) % 3]); }
      else if (c === '.' || c === ',' || c === 'S') {
        // le bord des quais : une bande jaune et noire ; quelques flaques
        const bord = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => '~re'.includes(P[y + b]?.[x + a] || '#'));
        sol(X, Y, bord ? 'barrage_bord' : c === ',' ? 'barrage_flaque' : null);
      }
      else if (c === 'r') { set(X, Y, H ? T.WATER : T.CAVEWALL); }
      else if (c === 'e') { set(X, Y, H ? T.WATER : T.CAVE); sol(X, Y, H ? null : 'barrage_rampe'); }
      else if (COURANT[c]) {
        if (H) { set(X, Y, T.WATER); m.courants.set(cle(X, Y), COURANT[c]); sol(X, Y, null); }
        else { set(X, Y, A_PIC.has(c) ? T.CAVEWALL : T.CAVE); sol(X, Y, A_PIC.has(c) ? null : 'barrage_conduite'); }
      } else if (c === 'L') set(X, Y, T.LEDGE);
      else if (c === 'w') set(X, Y, T.WATER);
      else if (c === 'f') set(X, Y, T.FENCE);
    }
    const rot = this.rotations(d), flux = fluxTuyaux(rot);
    for (const o of m.barrage.src.objets) {
      const X = o.x + 1, Y = o.y + 1, sousEau = o.sous === '~' && H;
      if (roc.has(cle(X, Y))) continue;   // un rocher poussé dessus (la croix du canal) : il y reste
      const bloque = (k) => { set(X, Y, T.BLOCK); deco(X, Y, k); };
      // un objet au fond d'un bassin : sous l'eau quand le niveau est haut (on ne le voit pas, on ne l'atteint pas)
      if (sousEau && o.t !== 'tuyau') { set(X, Y, T.WATER); deco(X, Y, null); sol(X, Y, null); continue; }
      if (o.sous === '~' && o.t !== 'tuyau') sol(X, Y, VASE[(X * 7 + Y * 13) % 3]);
      switch (o.t) {
        case 'objet': if (E.pris?.[cle(X, Y)]) { set(X, Y, T.CAVE); deco(X, Y, null); } else bloque('barrage_objet_sol'); break;
        case 'levier': bloque(E.lev?.[o.id] ? 'barrage_levier_on' : 'barrage_levier'); break;
        case 'pupitre': bloque(H ? 'barrage_pupitre' : 'barrage_pupitre_bas'); break;
        case 'grille': if (E.lev?.[o.id]) { set(X, Y, T.CAVE); deco(X, Y, null); } else bloque('barrage_grille'); break;
        case 'grilleE': if (E.courant) { set(X, Y, T.CAVE); deco(X, Y, null); } else bloque('barrage_grille_e'); break;
        case 'vanneConduite': {
          const ouverte = !!E.lev?.[o.id];
          if (ouverte && H) { set(X, Y, T.WATER); m.courants.set(cle(X, Y), COURANT[o.sous] || 'right'); deco(X, Y, null); }
          else bloque(ouverte ? 'barrage_vanne_conduite_o' : 'barrage_vanne_conduite');
          break;
        }
        case 'porteLocal': if (E.local) { set(X, Y, T.CAVE); deco(X, Y, null); sol(X, Y, 'barrage_rampe'); } else bloque('barrage_porte_local'); break;
        case 'porteControle': bloque(E.controle ? 'barrage_porte_controle_o' : 'barrage_porte_controle'); break;
        case 'tuyau': {
          const k = `${o.i},${o.j}`, p = TUYAUX.pieces[k], r = rot[k] % OUV[p].length;
          set(X, Y, T.CAVE); sol(X, Y, `barrage_tuyau_${p}${r}${H && flux.plein.has(k) ? '_eau' : ''}`); break;
        }
        case 'marque': if (H) { set(X, Y, T.WATER); m.courants.set(cle(X, Y), COURANT[o.sous] || 'right'); sol(X, Y, null); } else { set(X, Y, T.CAVE); sol(X, Y, 'barrage_marque'); } break;
        case 'arriveeEau': bloque('barrage_arrivee_eau'); break;
        case 'turbine': bloque(H && flux.ok ? 'barrage_turbine_pompe_on' : 'barrage_turbine_pompe'); break;
        case 'bouchon': bloque('barrage_bouchon'); break;
        case 'disjoncteur': bloque(E.courant ? 'barrage_disjoncteur_on' : 'barrage_disjoncteur'); break;
        case 'vanneCrue': bloque(`barrage_vanne_${o.couleur}${(E.crue || (E.seq || []).includes(o.couleur)) ? '_o' : ''}`); break;
        case 'monteCharge': bloque('barrage_monte_charge'); break;
        case 'echelle': bloque('barrage_echelle'); break;
        case 'trappe': bloque(E.crue ? 'barrage_trappe_o' : 'barrage_trappe'); break;
        case 'maquette': bloque('barrage_maquette'); break;
        default: bloque('barrage_plaque');
      }
    }
    if (vue && g.mapObj === m) for (const [x, y] of changes) g.view.rebuildAt(x, y);
  },
  /** en arrivant dans une salle : elle suit l'état ; le rocher du canal reprend sa place */
  remiseBarrage(to) {
    const g = this.game, d = this.defs?.get('barrage'), m = g.world.maps[to?.map];
    if (!d || !m?.barrage || g.mapObj === m) return;
    if (m.barrage.src.rochers?.length && g.state) {
      if (g.state.tiles) delete g.state.tiles[m.id];
      for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.get(x, y) === T.BOULDER) m.set(x, y, T.CAVE);
      this.appliquerBarrage(d, m, false, true);
    } else this.appliquerBarrage(d, m);
  },
  /** tout le donjon suit l'état (après une remise à zéro, ou un changement qui touche plusieurs salles) */
  appliquerToutBarrage(d) { for (const id of d.cartes || []) this.appliquerBarrage(d, this.game.world.maps[id], true); },

  /* ---------------- les objets ---------------- */
  async objetBarrage(d, m, o) {
    const g = this.game, ui = g.ui, E = this.eb(d), H = this.niveauHaut(d), X = o.x + 1, Y = o.y + 1;
    if (o.sous === '~' && H) return;
    switch (o.t) {
      case 'objet': {
        if (E.pris?.[cle(X, Y)]) return;
        await this.majB(d, { pris: { ...(E.pris || {}), [cle(X, Y)]: true } });
        g.give(o.objet, o.n || 1); g.sound.sfx('item');
        this.appliquerBarrage(d, m, true);
        await ui.say(`${g.state.name} trouve ${o.n > 1 ? o.n + ' × ' : ''}${itemName(o.objet)} !${o.objet.startsWith('carnet') ? '\nC\'est une page du carnet d\'Anselme. Elle se lit depuis le Sac.' : ''}`);
        return;
      }
      case 'pupitre': {
        const q = H ? 'Le réservoir est plein. Ouvrir les vannes de fond et le vider ?' : 'Le réservoir est vide. Fermer les vannes de fond et le remplir ?';
        await ui.say('Un pupitre de commande. Une grosse manette rouge, des voyants, et une étiquette : « RÉSERVOIR ».');
        if (!(await ui.yesNo(q))) return;
        await this.majB(d, { niveau: H ? 'B' : 'H' });
        g.sound.sfx('door'); g.view.shake = 0.25;
        await ui.say(H ? 'Un grondement sourd... L\'eau s\'écoule par les vannes de fond.' : 'Les vannes se referment. L\'eau remonte en bouillonnant.');
        this.appliquerToutBarrage(d);
        await ui.say(H ? 'Le réservoir est vide. Partout dans le barrage, les bassins sont à sec.' : 'Le réservoir est plein. Partout dans le barrage, les bassins sont pleins.');
        return;
      }
      case 'levier': {
        if (E.lev?.[o.id]) { await ui.say('Le levier est déjà baissé.'); return; }
        if (!(await ui.yesNo('Un levier de vanne, couvert de rouille. Le tirer ?'))) return;
        await this.majB(d, { lev: { ...(E.lev || {}), [o.id]: true } });
        g.sound.sfx('door'); g.view.shake = 0.15;
        this.appliquerToutBarrage(d);
        await ui.say(o.id === 'conduites' ? 'Clac ! Quelque part dans les conduites, une vanne s\'ouvre en grinçant.' : 'Clac ! Au loin, une grille se lève dans un bruit de chaînes.');
        return;
      }
      case 'grille': await ui.say('Une grille de fer, baissée. Elle se lève avec un levier, quelque part.'); return;
      case 'grilleE': await ui.say(E.courant ? '...' : 'Une grille électrique. Sans courant, elle reste baissée.'); return;
      case 'vanneConduite':
        await ui.say(E.lev?.[o.id] ? (H ? '...' : ['La vanne est ouverte, mais la conduite est à sec.', 'Derrière, elle monte à pic : impossible d\'y grimper.']) : ['Une vanne ferme la conduite.', 'Son volant est grippé : elle se commande ailleurs.']);
        return;
      case 'porteLocal':
        if (E.local) return;
        if (!g.state.bag['cle-local']) { await ui.say('Une porte blindée : « LOCAL DES POMPES ». Elle est fermée à clé.'); return; }
        await this.majB(d, { local: true }); g.sound.sfx('door');
        this.appliquerBarrage(d, m, true);
        await ui.say('Tu ouvres la porte blindée avec la Clé du Local.');
        return;
      case 'porteControle':
        if (!E.controle) {
          if (!g.state.bag[CLE_CONTROLE]) { await ui.say('Une lourde porte : « SALLE DE CONTRÔLE ». Fermée à clé.\nDerrière, on entend un bourdonnement.'); return; }
          await this.majB(d, { controle: true }); g.sound.sfx('door');
          this.appliquerBarrage(d, m, true);
          await ui.say('Tu ouvres la porte avec la Clé de Contrôle.');
        }
        {
          const S2 = d.salles.find((q) => q.id === 'controle'), [ax, ay, dir] = SALLES_BARRAGE.controle.arrivees.vannes;
          await g.warp({ map: S2.carte, x: ax + 1, y: ay + 1, dir }, 'door');
        }
        return;
      case 'tuyau': return;
      case 'arriveeEau': await ui.say(H ? 'L\'eau du réservoir arrive par ce gros tuyau.' : 'Le tuyau est sec : le réservoir est vide, rien n\'arrive.'); return;
      case 'bouchon': await ui.say('Un tuyau bouché. L\'eau n\'ira pas plus loin par là.'); return;
      case 'turbine': {
        const ok = H && fluxTuyaux(this.rotations(d)).ok;
        await ui.say(ok ? 'La turbine tourne ! Il ne reste qu\'à enclencher le disjoncteur.' : H ? 'Une petite turbine, immobile. L\'eau n\'arrive pas jusqu\'à elle.' : 'Une petite turbine, immobile. Le réservoir est vide : aucune eau dans les tuyaux.');
        return;
      }
      case 'disjoncteur': {
        if (E.courant) { await ui.say('Le disjoncteur est enclenché. Le barrage a du courant.'); return; }
        if (!(await ui.yesNo('Le disjoncteur général. L\'enclencher ?'))) return;
        if (!(H && fluxTuyaux(this.rotations(d)).ok)) { g.sound.sfx('bump'); await ui.say('Clac... Le disjoncteur saute aussitôt. La turbine ne tourne pas.'); return; }
        await this.majB(d, { courant: true }); g.sound.sfx('heal'); g.view.shake = 0.2;
        this.appliquerToutBarrage(d);
        await ui.say(['Le disjoncteur tient ! Les néons grésillent, puis s\'allument un à un.', 'Le courant est revenu dans tout le barrage.']);
        return;
      }
      case 'vanneCrue': return this.vanneCrue(d, m, o);
      case 'monteCharge': {
        if (!E.courant) { await ui.say('Un monte-charge. Il ne répond pas : pas de courant.'); return; }
        const vers = o.vers || 'couronnement';
        if (!(await ui.yesNo(vers === 'couronnement' ? 'Monter au couronnement ?' : 'Redescendre à la décantation ?'))) return;
        const S2 = d.salles.find((q) => q.id === vers), [ax, ay, dir] = SALLES_BARRAGE[vers].arrivees[vers === 'couronnement' ? 'decantation' : 'couronnement'];
        await g.warp({ map: S2.carte, x: ax + 1, y: ay + 1, dir }, 'door');
        return;
      }
      case 'trappe': {
        if (!E.crue) { await ui.say('Une trappe d\'acier dans la chaussée. Elle est coincée.'); return; }
        if (!(await ui.yesNo('La trappe est ouverte. Une échelle descend dans le noir. Descendre ?'))) return;
        const S2 = d.salles.find((q) => q.id === 'vannes'), [ax, ay, dir] = SALLES_BARRAGE.vannes.arrivees.couronnement;
        const premiere = !E.trappe;
        await this.majB(d, { trappe: true });
        await g.warp({ map: S2.carte, x: ax + 1, y: ay + 1, dir }, 'door');
        if (premiere && !g.state.bag[CLE_CONTROLE]) {
          g.give(CLE_CONTROLE, 1); g.sound.sfx('item');
          await ui.say(['Au bas de l\'échelle, une clé pend à un clou.', `${g.state.name} trouve la ${itemName(CLE_CONTROLE)} !`]);
        }
        return;
      }
      case 'echelle': {
        if (!E.trappe) { await ui.say('Une échelle monte tout droit vers une trappe fermée, très haut.'); return; }
        if (!(await ui.yesNo('Remonter au couronnement ?'))) return;
        const S2 = d.salles.find((q) => q.id === 'couronnement'), [ax, ay, dir] = SALLES_BARRAGE.couronnement.arrivees.trappe;
        await g.warp({ map: S2.carte, x: ax + 1, y: ay + 1, dir }, 'door');
        return;
      }
      case 'maquette': await ui.say(['Une maquette du barrage, sous une vitre poussiéreuse.', 'Au centre, le réservoir et ses quais. À l\'ouest, les turbines ; à l\'est, les conduites ; au nord-est, la décantation.', 'Tout en haut, la crête du barrage : le couronnement.']); return;
      case 'panneauHall': await ui.say(['« CONSIGNES DE SÉCURITÉ »', '« Ne jamais vider le réservoir sans prévenir la salle de contrôle. Ne jamais s\'approcher d\'une conduite en charge. »']); return;
      case 'plaque': await ui.say(o.texte === 'tuyaux' ? ['« LOCAL DES POMPES »', '« L\'eau entre à gauche et doit finir dans la turbine, à droite. Les deux sorties bouchées ne mènent nulle part. »', '« Pour tourner une pièce, place-toi face à elle. »'] : ['Une plaque gravée.']); return;
      case 'stele': await ui.say(o.texte === 'vannes' ? ['« VANNES DE CRUE »', '« Trois vannes, un seul ordre. Une fausse manœuvre bloque les vannes. »']
        : o.texte === 'controle' ? ['Un registre ouvert sur le pupitre. Douze ans de relevés, tous de la même écriture.', 'Dans la marge, au crayon : « Les néons se sont encore allumés tout seuls cette nuit. »']
          : ['« ÎLOT DE MESURE »', '« Profondeur du réservoir : 14 mètres. »']); return;
      default: return;
    }
  },
  /** se tourner vers une pièce du tuyautage et appuyer : elle tourne d'un quart de tour */
  async tournerTuyau(d, m, o) {
    const g = this.game, E = this.eb(d), k = `${o.i},${o.j}`, rot = this.rotations(d);
    const p = TUYAUX.pieces[k], n = OUV[p].length;
    if (n === 1) { await g.ui.say('Une croix : elle laisse passer l\'eau dans les deux sens, quoi qu\'on fasse.'); return; }
    const avant = fluxTuyaux(rot).ok;
    await this.majB(d, { rot: { ...(E.rot || {}), [k]: (rot[k] + 1) % n } });
    g.sound.sfx('select');
    this.appliquerBarrage(d, m, true);
    const apres = fluxTuyaux(this.rotations(d)).ok;
    if (apres && !avant && this.niveauHaut(d)) { g.sound.sfx('heal'); await g.ui.say('L\'eau file dans les tuyaux jusqu\'à la turbine, qui se met à tourner !'); }
  },
  /** les vannes de crue : trois vannes, un seul ordre (donné par les carnets d'Anselme) */
  async vanneCrue(d, m, o) {
    const g = this.game, ui = g.ui, E = this.eb(d), seq = E.seq || [];
    if (E.crue) { await ui.say('La vanne est grande ouverte. L\'eau gronde dans le déversoir.'); return; }
    if (seq.includes(o.couleur)) { await ui.say('Cette vanne est déjà ouverte.'); return; }
    if (!(await ui.yesNo(`La vanne ${NOM_COULEUR[o.couleur]}. L'ouvrir ?`))) return;
    const n = [...seq, o.couleur];
    g.sound.sfx('door');
    if (ORDRE_VANNES[n.length - 1] !== o.couleur) {
      await this.majB(d, { seq: [] });
      this.appliquerBarrage(d, m, true);
      g.view.shake = 0.35; g.sound.sfx('bang');
      for (const p of g.state.party) if (p.hp > 0) p.hp = Math.max(1, p.hp - Math.floor(p.stats[0] / 4));
      await ui.say(['Les vannes se bloquent avec un grand bruit de métal...', 'Une gerbe d\'eau te tombe dessus ! Tes Pokémon perdent un quart de leurs PV.', 'Les vannes se referment toutes seules.']);
      return;
    }
    const fini = n.length === ORDRE_VANNES.length;
    await this.majB(d, fini ? { seq: n, crue: true } : { seq: n });
    this.appliquerBarrage(d, m, true);
    if (!fini) { await ui.say('La vanne s\'ouvre en grinçant. Un filet d\'eau coule dans le déversoir.'); return; }
    g.view.shake = 0.4; g.sound.sfx('bang');
    await ui.say(['La troisième vanne s\'ouvre. L\'eau dévale le déversoir dans un grondement de tonnerre...', 'Le courant retombe. Sur la route de crête, la trappe d\'acier s\'est décoincée.']);
  },

  /* ---------------- après un pas : les conduites ---------------- */
  async apresPasBarrage() {
    const g = this.game, d = this.barrageIci(), m = g.mapObj, p = g.player;
    if (!d || !m?.barrage || g.busy) return;
    if (!(p.surf && m.courants?.has(cle(p.x, p.y)))) return;
    g.busy = true;
    try {
      for (let k = 0; k < 400; k++) {
        const dir = m.courants?.get(cle(p.x, p.y)); if (!dir || !p.surf) break;
        const [dx, dy] = DIRS[dir], tx = p.x + dx, ty = p.y + dy;
        if (!m.in(tx, ty) || m.get(tx, ty) !== T.WATER || g.occupied(tx, ty)) break;
        p.dir = dir; p.walking = true;
        p.move = { fx: p.x, fy: p.y, tx, ty, t: 0, dur: 0.08, scripted: true };
        while (p.move) await attendre(16);
      }
      p.walking = false;
      // plaqué contre le rocher sans eau calme à côté : on regagne le quai d'entrée à la nage
      const dir = m.courants?.get(cle(p.x, p.y));
      if (dir) {
        const [dx, dy] = DIRS[dir];
        if (m.get(p.x + dx, p.y + dy) === T.BOULDER) {
          const calme = Object.values(DIRS).some(([a, b]) => { const t = m.get(p.x + a, p.y + b); return (t === T.WATER && !m.courants.has(cle(p.x + a, p.y + b))) || (walkable(t) && t !== T.WATER); });
          if (!calme) {
            g.view.shake = 0.2;
            await g.ui.say(['Le courant te plaque contre le rocher !', 'Tu finis par t\'en dégager et regagnes le quai d\'entrée à la nage.']);
            const [ax, ay, dir2] = m.barrage.src.arrivees.vannes;
            if (g.state.tiles) delete g.state.tiles[m.id];
            for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.get(x, y) === T.BOULDER) m.set(x, y, T.CAVE);
            this.appliquerBarrage(d, m, false, true);
            await g.warp({ map: m.id, x: ax + 1, y: ay + 1, dir: dir2 }, 'exit');
          }
        }
      }
    } finally { g.busy = false; }
  },
  /** tourner une pièce du tuyautage : on la regarde (elle est au sol) et on appuie */
  async interagirBarrage() {
    const g = this.game, d = this.barrageIci(), m = g.mapObj; if (!d || !m?.barrage) return false;
    const [dx, dy] = DIRS[g.player.dir], o = m.barrage.objets.get(cle(g.player.x + dx, g.player.y + dy));
    if (o?.t !== 'tuyau') return false;
    await this.tournerTuyau(d, m, o);
    return true;
  },

  /* ---------------- dresseurs, PNJ ---------------- */
  async butinBarrage(d, k) {
    if (!estBarrage(d) || !/^[ⓐ-ⓩ]$/.test(k)) return;
    const g = this.game, total = BUTIN_BARRAGE.reduce((a, [, p]) => a + p, 0);
    let r = Math.random() * total, objet = BUTIN_BARRAGE[0][0];
    for (const [o, p] of BUTIN_BARRAGE) { if ((r -= p) < 0) { objet = o; break; } }
    g.give(objet, 1); g.sound.sfx('item');
    await g.ui.say(`${d.pnj[k].cls} ${d.pnj[k].nom} te donne ${itemName(objet)}.`);
  },
  async pnjBarrage(d, k) {
    const g = this.game, ui = g.ui, p = d.pnj[k], E = this.eb(d), qui = `${p.cls} ${p.nom}`;
    if (p.barrage === 'solene') {
      if (E.fini) { await ui.say(['Anselme m\'a tout raconté. Les turbines seront équipées de grilles, et ses Lanturn ne risqueront plus rien.', 'Merci. Sans toi, on se serait battus pendant encore douze ans.'], { speaker: qui }); return; }
      await ui.say(['Bonjour ! Solène, ingénieure de la compagnie. On doit remettre ce barrage en marche.', 'Le problème, c\'est Anselme, l\'ancien barragiste. Il vit encore là-dedans, il a tout arrêté il y a douze ans. Depuis qu\'on est revenus, il a tout reverrouillé : grilles, vannes, courant.', 'Il s\'est enfermé dans la salle de contrôle, tout au nord de la Salle des Vannes.',
        'Les pupitres de commande vident ou remplissent le réservoir. Plein, on surfe dessus ; vide, on marche au fond des bassins.', 'Tu veux bien aller lui parler ? Mes ouvriers n\'osent plus entrer.'], { speaker: qui });
      return;
    }
    if (p.barrage === 'anselme') return this.anselme(d, k);
  },
  async anselme(d, k) {
    const g = this.game, ui = g.ui, p = d.pnj[k], E = this.eb(d), qui = `${p.cls} ${p.nom}`;
    if (E.fini) { await ui.say(['Prends soin de Néon. Il a toujours aimé les gens qui ne lâchent rien.', 'Moi, je reste. Il faudra bien quelqu\'un pour surveiller les grilles des turbines.'], { speaker: qui }); return; }
    if (!battu(this.etats[d.id], d, k)) {
      await ui.say(['Tu as fait tout le chemin jusqu\'ici. Les grilles, le courant, les vannes de crue... Je n\'aurais jamais cru.', 'La compagnie veut rallumer les turbines. Tu sais ce qui arrivait, quand elles tournaient ?', 'Les Lanturn du réservoir se faisaient aspirer dans les prises d\'eau. Des dizaines, chaque hiver.', 'Alors, il y a douze ans, j\'ai tout arrêté. La compagnie est partie, et moi je suis resté.', 'Maintenant qu\'elle revient, j\'ai tout reverrouillé. Je ne rouvrirai rien tant qu\'on ne m\'aura pas prouvé qu\'on peut le faire proprement.', 'Montre-moi de quoi tu es capable !'], { speaker: qui });
      if (!(await ui.yesNo('Affronter Anselme ?'))) return;
      const r = await this.demande(d.id, { a: 'prendre', pnj: k }); if (!r.ok) return;
      const idm = (q) => (typeof q === 'string' ? Object.values(MOVES).find((x) => x.key === q)?.id : q);
      const party = p.equipe.map(([sp, lvl, item, moves, ability, extra]) => Object.assign(createMon(sp, lvl, { iv: Array(6).fill(31), shiny: false, item: item || null, moves: moves?.map(idm), ability }), extra || {}));
      const res = await this.combat({ ...p, perd: 'Bien... Tu es plus têtu que moi.' }, party);
      if (res !== 'win') { await this.demande(d.id, { a: 'lacher', pnj: k }); await this.defaite(d); return; }
      await this.demande(d.id, { a: 'gagne', pnj: k });
    }
    await ui.say(['Bien. Écoute-moi, alors.', 'Si la compagnie pose des grilles devant les prises d\'eau, les Lanturn ne risqueront plus rien. Je le lui ai écrit dix fois. Personne ne m\'a répondu.', 'Toi, tu leur diras. Ils t\'écouteront.'], { speaker: qui });
    g.sound.sfx('bang'); g.view.shake = 0.2;
    await ui.say(['Bzzzt ! Le pupitre maître crépite...', 'Un petit Pokémon orange s\'en échappe et tourne autour de toi en grésillant.']);
    await ui.say(['C\'est Motisma. C\'est lui qui allume les néons la nuit. Il vit dans ce pupitre depuis la fermeture.', 'On dirait qu\'il veut te suivre. Emmène-le : il s\'ennuie, avec moi.'], { speaker: qui });
    // un Motisma qu'on ne trouve nulle part ailleurs : chromatique, élevé par Anselme, avec son Aimant
    const st = g.state, idm = (q) => Object.values(MOVES).find((x) => x.key === q)?.id;
    const mon = createMon(479, 62, { ot: 'Anselme', met: d.nom, shiny: true, iv: Array(6).fill(31), nat: 15, item: 'magnet', ability: 'levitate',
      moves: ['thunderbolt', 'shadow-ball', 'will-o-wisp', 'nasty-plot'].map(idm) });
    mon.nick = 'Néon';
    g.markCaught?.(mon.sp); g.sound.sfx('caught');
    await ui.say(`${st.name} reçoit Motisma ! Anselme l'appelait Néon.`);
    if (st.party.length < 6) st.party.push(mon); else { st.box.push(mon); await ui.say('Néon a été envoyé dans le PC.'); }
    await this.majB(d, { fini: true });
    await this.trophee?.(d);
  },

  /* ---------------- l'encadré ---------------- */
  texteBarrage(d, s) {
    if (!estBarrage(d)) return null;
    const E = this.eb(d);
    return `réservoir ${this.niveauHaut(d) ? 'plein' : 'vide'} · ${E.courant ? 'courant rétabli' : 'pas de courant'}`;
  },
};
