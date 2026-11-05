// testodyssee/js/donjon/tombeau.js — mécaniques du Tombeau du Roi Sans Nom, ajoutées à la classe Donjons (jeu.js).
//
// Deux artefacts, tenus par l'hôte (action « artefact » d'etat.js) : le Pendentif Maudit (pend) et le Monocle de
// Vérité (lun). Chacun est porté par un joueur, posé au sol, à sa place d'origine (sarcophage, socle), volé ou rendu.
// Le porteur les a dans son Sac (on s'en sert pour les poser ou les donner à un voisin).
//   pendentif : chaque pas retire un peu de PV à chaque Pokémon de son porteur ; si toute l'équipe tombe, il lâche le
//               pendentif et se réveille à l'entrée de la salle. On ne passe à la salle suivante qu'avec lui en main.
//   monocle   : son porteur voit le chemin invisible au-dessus des gouffres et les pièges cachés.
//   distance  : les deux porteurs ne peuvent pas s'approcher à moins de DISTANCE cases l'un de l'autre.
// Pilleurs : ils attaquent qui passe dans leur champ de vision, celui qui porte le pendentif de bien plus loin.
// Nef du Guet-apens : quand quelqu'un franchit la ligne du guet, la bande vole le pendentif ; on la poursuit (pilleurs
// qui s'enfuient, salles piégées) jusqu'au repaire, où le pendentif réapparaît quand leur chef est battu.
import { T } from '../../../odyssee/js/world/tiles.js';
import { ITEMS, itemName } from '../../../odyssee/js/core/items.js';
import { createMon, monName, healFull } from '../../../odyssee/js/core/mon.js';
import { ASSETS } from '../../../odyssee/js/assets.js';
import { el, esc } from '../../../odyssee/js/ui/ui.js';
import { DISTANCE, PERIODE } from '../donjons/tombeau.js';
import { dessinerZones, dessinerZzz } from '../rendu.js';
import { HPX } from '../../../odyssee/js/render/world3d.js';
import { artVide, prisPar, battu } from './etat.js';

/** les salles que montre la carte du ruinemaniac (du -1 au -4 ; plus tard, un peu plus bas) */
const CARTE = ['s1', 's2', 'b3', 'b4a', 'b4b', 'b4c', 's3'];

const cle = (x, y) => x + ',' + y;
const estTombeau = (d) => !!d?.tombeau;
const ITEM = { pend: 'pendentif-maudit', lun: 'lunettes-verite' };
const NOM = { pend: 'le Pendentif Maudit', lun: 'le Monocle de Vérité' };
const SOL = { pend: 'pendentif_sol', lun: 'lunettes_sol' };
const AUTRE = { pend: 'lun', lun: 'pend' };
/** part des PV max qu'un pas avec le pendentif retire à chaque Pokémon */
// (à zéro pour l'instant, le temps d'essayer le donjon : il sera rééquilibré)
export const MORSURE = 0;
const PIEGE = 0.12, CHUTE = 0.1;
const DIRV = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
const cheb = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));

export const Tombeau = {
  tombeauIci() { return [...this.defs.values()].find((d) => estTombeau(d) && this.estDans(d)); },
  art(d) { const e = this.etats[d.id]; return e.salles[d.salles[0].id].donnees.art || artVide(); },
  salleTombeau(d, m = this.game.mapObj) { return m && d.salles.find((s) => s.carte === m.id); },
  dTombeau(d, sid) { return this.etats[d.id].salles[sid].donnees || {}; },
  /** où est un joueur : { map, x, y } (soi-même ou un autre, d'après les positions du salon) */
  posDe(id) {
    const g = this.game;
    if (String(id) === this.moi) return g.state ? { map: g.mapObj.id, x: g.player.x, y: g.player.y } : null;
    const o = g.link?.others.get(String(id)); return o ? { map: o.map, x: o.x, y: o.y } : null;
  },

  /* ---------------- carte ---------------- */
  poserObjetsTombeau(d, m) {
    if (!estTombeau(d)) return;
    const P = m.donjon.plan, s = d.salles.find((q) => q.carte === m.id);
    const set = (c) => new Set((P.objets[c] || []).map(([x, y]) => cle(x, y)));
    m.tomb = { gouffres: set('_'), caches: set(':'), pieges: set('x'), piegesCaches: set('?'), guet: set('g'), fuyards: P.objets.f?.[0], retour: P.objets.j?.[0] };
    for (const [c, l] of Object.entries(P.objets)) {
      const o = d.objets[c];
      for (const [x, y] of l) {
        if (o.type === 'sarcophage') m.object(x, y, { use: () => this.sarcophage(d) });
        else if (o.type === 'socleLunettes') m.object(x, y, { use: () => this.socleLunettes(d) });
        else if (o.type === 'autel') m.object(x, y, { use: () => this.autel(d) });
      }
    }
    // la bande du guet-apens n'apparaît que pendant la scène du vol
    for (const n of m.npcs) { const k = Object.keys(d.pnj).find((q) => `${d.id}:${d.pnj[q].id}` === n.id); if (k && d.pnj[k].scene) n.when = () => this.sceneVol === m.id; }
    // les pilleurs qui s'enfuient avec le pendentif, devant la sortie des salles de la poursuite
    if (m.tomb.fuyards) {
      const [x, y] = m.tomb.fuyards;
      m.npc({ id: `${d.id}:fuyards:${s.id}`, x, y, dir: 'down', sprite: 'voleur', move: 'static', when: () => this.art(d).pend.vole && !this.fuis?.[m.id], talk: () => this.fuite(d, m) });
    }
    // gardiens (leur parler : les endormir, ou se faire prendre), brigands (bavards, certains se battent), le marchand
    for (const n of m.npcs) {
      const k = Object.keys(d.pnj).find((q) => `${d.id}:${d.pnj[q].id}` === n.id), P = k && d.pnj[k]; if (!P) continue;
      if (P.garde) { n.talk = (api, vivant) => { if (vivant) vivant.dir = this.regardGardien(P); return this.parlerGardien(d, m, k); }; n.when = () => true; }
      else if (P.brigand) { n.talk = () => this.brigand(d, k); n.when = () => true; }
      else if (P.boutique) { n.talk = () => this.boutique(d); n.when = () => true; }
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
    // les artefacts se posent et se donnent depuis le Sac
    for (const k of ['pend', 'lun']) if (ITEMS[ITEM[k]]) ITEMS[ITEM[k]].use = async () => { await this.menuArtefact(d, k); return true; };
    if (ITEMS['carte-tombeau']) ITEMS['carte-tombeau'].use = async () => { await this.carteTombeau(d); return true; };
  },

  /** le décor suit l'état : sarcophage, socle, artefacts posés, chemin révélé ; le Sac suit qui porte quoi */
  appliquerTombeau(d) {
    if (!estTombeau(d)) return;
    const g = this.game, e = this.etats[d.id], A = this.art(d), st = g.state;
    if (this.runTombeau !== e.run) { this.runTombeau = e.run; this.fuis = {}; this.pasMaudits = 0; this.volVu = !!this.dTombeau(d, 's5').vol; this.rendVu = !A.pend.vole; this.reveles = new Set(); }
    // le Sac : on a l'artefact si on le porte (et seulement dans le tombeau)
    if (st) for (const k of ['pend', 'lun']) { const a = A[k].p === this.moi && this.estDans(d); if (a) st.bag[ITEM[k]] = 1; else delete st.bag[ITEM[k]]; }
    for (const s of d.salles) {
      const m = g.world.maps[s.carte]; if (!m?.tomb) continue;
      const P = m.donjon.plan;
      if (P.objets.P) for (const [x, y] of P.objets.P) this.propTombeau(m, x, y, !A.pend.p && !A.pend.sol && !A.pend.vole && !A.pend.fin ? 'sarcophage' : 'sarcophage_vide');
      if (P.objets.L) for (const [x, y] of P.objets.L) this.propTombeau(m, x, y, !A.lun.p && !A.lun.sol ? 'socle_lunettes' : 'socle_vide');
      if (P.objets.A) for (const [x, y] of P.objets.A) this.propTombeau(m, x, y, A.pend.fin ? 'autel_soleil_on' : 'autel_soleil');
    }
    // artefacts posés au sol : un dessin, et on les ramasse en les regardant
    this.solsVus ||= {};
    for (const k of ['pend', 'lun']) {
      const ou = A[k].sol, cleOu = ou ? ou.join() : null, avant = this.solsVus[k];
      if (avant === cleOu) continue;
      if (avant) { const [mid, x, y] = avant.split(','), m = g.world.maps[mid]; if (m) { this.decoSol(m, +x, +y, null); m.objects.delete(cle(+x, +y)); } }
      if (ou) { const [mid, x, y] = ou, m = g.world.maps[mid]; if (m) { this.decoSol(m, x, y, SOL[k]); m.object(x, y, { use: () => this.ramasser(d, k) }); } }
      this.solsVus[k] = cleOu;
    }
    this.reveler(d, A.lun.p === this.moi || (g.modeTest && A.lun.p != null));
    this.ouvrirTrou(d, !!this.dTombeau(d, 's1').trou);
    // le vol : la scène pour ceux qui sont dans la nef, une annonce pour les autres
    const s5 = d.salles.find((q) => q.id === 's5'), D5 = this.dTombeau(d, 's5');
    if (D5.vol && !this.volVu) {
      this.volVu = true;
      if (g.mapObj?.id === s5.carte) this.taches.push(() => this.scene(d, s5));
      else if (this.estDans(d)) g.ui.toast('Des pilleurs ont volé le Pendentif Maudit !', 3000);
    }
    // le repaire est tombé : le pendentif réapparaît (l'hôte le rend, au milieu du repaire)
    const s8 = d.salles.find((q) => q.id === 's8');
    if (this.hote && e.salles[s8.id].faite && A.pend.vole && !this.renduDemande) {
      this.renduDemande = true;
      const m8 = g.world.maps[s8.carte], [x, y] = m8.tomb.retour;
      setTimeout(() => { this.renduDemande = false; this.demande(d.id, { a: 'artefact', k: 'pend', op: 'rendre', ou: [m8.id, x, y] }); }, 0);
    }
    if (!A.pend.vole && !this.rendVu) { this.rendVu = true; if (this.estDans(d)) this.taches.push(() => g.ui.say('Sable-Noir a lâché le Pendentif Maudit au milieu du repaire. Il faut le reprendre et le porter jusqu\'à l\'autel !')); }
  },
  /** un décor qui bloque (sarcophage, socle, autel) : change de dessin */
  propTombeau(m, x, y, k) {
    const g = this.game, dd = m.deco.find((q) => q.x === x && q.y === y);
    if (!dd || dd.k === k) return;
    dd.k = k;
    if (g.mapObj === m) { g.view.decoAt.set(cle(x, y), dd); g.view.rebuildAt(x, y); }
  },
  /** le chemin invisible et les pièges cachés : montrés au seul porteur du monocle */
  reveler(d, voit) {
    if (this.voitTombeau === voit) return;
    this.voitTombeau = voit;
    const g = this.game;
    for (const s of d.salles) {
      const m = g.world.maps[s.carte]; if (!m?.tomb) continue;
      for (const c of m.tomb.caches) { const [x, y] = c.split(',').map(Number); this.decoSol(m, x, y, voit ? 'revele' : 'gouffre'); }
      for (const c of m.tomb.piegesCaches) { if (this.reveles?.has(`${m.id}:${c}`)) continue; const [x, y] = c.split(',').map(Number); this.decoSol(m, x, y, voit ? 'piege_degats3' : null); }
    }
    if (this.tombeauIci()) g.ui.toast(voit ? 'À travers le monocle, tu vois ce qui est caché : le regard des gardiens, le chemin au-dessus du vide, les pièges.' : 'Sans le monocle, ce qui était caché disparaît.', 2600);
  },

  /* ---------------- les artefacts ---------------- */
  /** on peut prendre l'artefact k d'ici ? (pas les deux à la fois, pas trop près du porteur de l'autre) */
  peutPrendre(d, k) {
    const g = this.game, A = this.art(d), o = A[AUTRE[k]];
    if (g.modeTest) return null;
    if (o.p === this.moi) return `Tu portes déjà ${NOM[AUTRE[k]]}. Pose-les d'abord.`;
    if (o.p) {
      const q = this.posDe(o.p);
      if (q && q.map === g.mapObj.id && cheb(q.x, q.y, g.player.x, g.player.y) < DISTANCE) return `${k === 'pend' ? 'Le pendentif' : 'Le monocle'} te repousse : ${this.nomDe(o.p)}, qui porte ${NOM[AUTRE[k]]}, est trop près.`;
    }
    return null;
  },
  async ramasser(d, k, intro) {
    const g = this.game, ui = g.ui, A = this.art(d);
    if (A[k].p) { await ui.say(`${this.nomDe(A[k].p)} les a déjà.`); return; }
    const non = this.peutPrendre(d, k); if (non) { await ui.say(non); return; }
    if (intro) await ui.say(intro);
    if (!(await ui.yesNo(k === 'pend' ? 'Prendre le Pendentif Maudit ?' : 'Prendre le Monocle de Vérité ?'))) return;
    const r = await this.demande(d.id, { a: 'artefact', k, op: 'prendre', test: !!g.modeTest });
    if (!r.ok) { await ui.say(r.why === 'reseau' ? 'L\'hôte du salon ne répond pas...' : r.why === 'pris' ? 'Quelqu\'un vient de le prendre !' : 'Impossible pour l\'instant.'); return; }
    g.sound.sfx('item');
    if (k === 'pend') await ui.say(`${g.state.name} prend le Pendentif Maudit.`);
    else await ui.say([`${g.state.name} prend le Monocle de Vérité.`, 'À travers son verre violet, tu vois ce qui est caché. Guide les autres !', 'Pour le poser ou le donner à un voisin : Sac, Monocle de Vérité.']);
  },
  async sarcophage(d) {
    const A = this.art(d), ui = this.game.ui;
    if (A.pend.fin) { await ui.say('Le sarcophage du Roi Sans Nom. La malédiction est levée.'); return; }
    if (A.pend.p || A.pend.sol || A.pend.vole) { await ui.say('Le sarcophage du Roi Sans Nom. Son pendentif n\'y est plus.'); return; }
    if (await this.garde(d, 'pend')) return;
    await this.ramasser(d, 'pend', ['Le sarcophage du Roi Sans Nom.', 'Un pendentif noir est posé sur sa poitrine de pierre. Il palpite, comme un cœur.']);
  },
  async socleLunettes(d) {
    const A = this.art(d), ui = this.game.ui;
    if (A.lun.p || A.lun.sol) { await ui.say('Un socle vide. Il gardait le Monocle de Vérité.'); return; }
    if (await this.garde(d, 'lun')) return;
    await this.ramasser(d, 'lun', ['Sur un socle, un monocle au verre violet.', 'Une inscription : « Qui le porte voit la vérité. Qui voit la vérité ne peut approcher le pendentif. »']);
  },
  /** depuis le Sac : poser l'artefact ici, ou le donner à un joueur à côté */
  async menuArtefact(d, k) {
    const g = this.game, ui = g.ui, A = this.art(d), p = g.player, m = g.mapObj;
    if (A[k].p !== this.moi) return;
    const voisins = [...(g.link?.others || new Map()).entries()].filter(([, o]) => o.map === m.id && Math.abs(o.x - p.x) + Math.abs(o.y - p.y) === 1);
    const opts = ['Poser ici', ...voisins.map(([, o]) => `Donner à ${o.name || 'ce joueur'}`), 'Annuler'];
    const c = await ui.ask(`${k === 'pend' ? 'Le Pendentif Maudit' : 'Le Monocle de Vérité'} : qu'en faire ?`, opts);
    if (c === 0) {
      const ici = cle(p.x, p.y);
      if (m.tomb?.gouffres.has(ici) || m.tomb?.caches.has(ici) || m.tomb?.pieges.has(ici) || m.tomb?.piegesCaches.has(ici) || m.deco.some((q) => q.x === p.x && q.y === p.y) || m.warpAt(p.x, p.y)) { await ui.say('Pas ici : trouve un coin de sol libre.'); return; }
      const r = await this.demande(d.id, { a: 'artefact', k, op: 'poser', ou: [m.id, p.x, p.y] });
      if (r.ok) { g.sound.sfx('select'); await ui.say(`${g.state.name} pose ${NOM[k]} à ses pieds.`); }
      return;
    }
    if (c > 0 && c <= voisins.length) {
      const [id, o] = voisins[c - 1], autre = A[AUTRE[k]];
      if (autre.p === id && !g.modeTest) { await ui.say(`${o.name} porte ${NOM[AUTRE[k]]} : impossible.`); return; }
      if (autre.p && autre.p !== id && !g.modeTest) { const q = this.posDe(autre.p); if (q && q.map === m.id && cheb(q.x, q.y, o.x, o.y) < DISTANCE) { await ui.say(`${o.name} est trop près de ${this.nomDe(autre.p)}, qui porte ${NOM[AUTRE[k]]}.`); return; } }
      const r = await this.demande(d.id, { a: 'artefact', k, op: 'donner', a2: id, test: !!g.modeTest });
      if (r.ok) { g.sound.sfx('select'); await ui.say(`${g.state.name} donne ${NOM[k]} à ${o.name}.`); }
    }
  },
  async autel(d) {
    const g = this.game, ui = g.ui, A = this.art(d);
    if (A.pend.fin) { await ui.say('L\'Autel du Soleil. Le pendentif y dort pour toujours.'); return; }
    if (A.pend.p !== this.moi) { await ui.say(['L\'Autel du Soleil. Un creux en forme de pendentif attend au milieu.', A.pend.p ? `C'est ${this.nomDe(A.pend.p)} qui porte le pendentif.` : 'Il faut y poser le Pendentif Maudit.']); return; }
    if (!(await ui.yesNo('Poser le Pendentif Maudit sur l\'autel ?'))) return;
    const r = await this.demande(d.id, { a: 'artefact', k: 'pend', op: 'fin' });
    if (!r.ok) { await ui.say('L\'hôte du salon ne répond pas...'); return; }
    g.sound.sfx('badge'); g.view.shake = 0.3;
    await this.demande(d.id, { a: 'maj', salle: 's10', faite: true, fini: true });
  },

  /* ---------------- déplacements ---------------- */
  /** avant un pas : la sortie sans le pendentif, la distance entre les deux porteurs. true : le pas est refusé */
  avantPasTombeau(tx, ty) {
    const g = this.game, d = this.tombeauIci(); if (!d || g.busy) return false;
    const m = g.mapObj, P = m.donjon?.plan, A = this.art(d), p = g.player, s = this.salleTombeau(d);
    if (!P || !s) return false;
    if (s.pendentif && P.suivante && P.suivante[0] === tx && P.suivante[1] === ty && m.get(tx, ty) === T.CAVEDOOR && !A.pend.vole && !A.pend.fin && !A.pend.p) {
      g.busy = true; g.ui.say('Une force invisible te retient. Le tombeau ne laisse passer personne tant que le pendentif reste derrière.').finally(() => { g.busy = false; });
      return true;
    }
    if (g.modeTest) return false;
    const mien = A.pend.p === this.moi ? 'lun' : A.lun.p === this.moi ? 'pend' : null, autre = mien && A[mien].p;
    if (autre && autre !== this.moi) {
      const q = this.posDe(autre);
      if (q && q.map === m.id) {
        const apres = cheb(tx, ty, q.x, q.y);
        if (apres < DISTANCE && apres < cheb(p.x, p.y, q.x, q.y)) {
          if ((p.bumpT || 0) <= 0) { g.sound.sfx('bump'); p.bumpT = 0.4; }
          if (!this.repousseT || performance.now() - this.repousseT > 2500) { this.repousseT = performance.now(); g.ui.toast(`Le pendentif et le monocle se repoussent : ${this.nomDe(autre)} est trop près.`, 2200); }
          return true;
        }
      }
    }
    return false;
  },
  /** après un pas : gouffres, pièges, morsure du pendentif, guet-apens, fuyards, regard des pilleurs */
  async apresPasTombeau() {
    const g = this.game, d = this.tombeauIci(); if (!d || g.busy) return;
    const m = g.mapObj, p = g.player, s = this.salleTombeau(d), A = this.art(d), T0 = m.tomb; if (!T0 || !s) return;
    const ici = cle(p.x, p.y);
    if (!T0.gouffres.has(ici) && !T0.caches.has(ici)) this.sur = [m.id, p.x, p.y];
    g.busy = true;
    try {
      if (T0.gouffres.has(ici)) { await this.chute(d); return; }
      if (T0.pieges.has(ici) || T0.piegesCaches.has(ici)) await this.piege(d, m, ici);
      if (MORSURE && A.pend.p === this.moi && !(await this.morsure(d))) return;
      if (s.id === 's5' && T0.guet.has(ici) && !this.dTombeau(d, 's5').vol && !A.pend.vole) await this.guetApens(d);
      if (T0.fuyards && A.pend.vole && !this.fuis?.[m.id] && cheb(p.x, p.y, ...T0.fuyards) <= 5) await this.fuite(d, m);
      const k = this.pilleurQuiVoit(d, m); if (k) await this.engager(d, k);
    } finally { g.busy = false; }
  },
  async chute(d) {
    const g = this.game, m = g.mapObj, [mid, x, y] = this.sur?.[0] === m.id ? this.sur : [m.id, ...m.donjon.plan.depart];
    g.sound.sfx('ledge'); g.view.shake = 0.25;
    this.blesser(CHUTE);
    await g.ui.say(['Le sol se dérobe : tu tombes dans le vide !', 'Tu te rattrapes de justesse au bord, et tu te hisses. Tes Pokémon ont été secoués.']);
    await g.warp({ map: mid, x, y, dir: g.player.dir }, 'exit');
  },
  async piege(d, m, ici) {
    const g = this.game, cache = m.tomb.piegesCaches.has(ici);
    g.sound.sfx('bang'); g.view.shake = 0.15;
    this.blesser(PIEGE);
    if (cache && !this.reveles.has(`${m.id}:${ici}`)) { this.reveles.add(`${m.id}:${ici}`); const [x, y] = ici.split(',').map(Number); this.decoSol(m, x, y, 'piege_degats3'); }
    await g.ui.say(cache ? 'Clac ! Des pointes jaillissent d\'une dalle qui semblait sûre !' : 'Aïe ! Des pointes sortent du sol !');
  },
  /** retire une part des PV max à chaque Pokémon debout ; renvoie le nombre de Pokémon encore debout */
  blesser(part) {
    let debout = 0;
    for (const mon of this.game.state.party) {
      if (mon.hp <= 0) continue;
      mon.hp = Math.max(0, mon.hp - Math.max(1, Math.ceil(mon.stats[0] * part)));
      if (mon.hp > 0) debout++;
    }
    return debout;
  },
  /** un pas avec le pendentif ; false si toute l'équipe est tombée (on a été ramené à l'entrée de la salle) */
  async morsure(d) {
    const g = this.game, party = g.state.party, avant = party.filter((q) => q.hp > 0);
    const debout = this.blesser(MORSURE);
    for (const mon of avant) if (mon.hp <= 0) g.ui.toast(`${monName(mon)} est terrassé par la malédiction !`, 2200);
    this.pasMaudits = (this.pasMaudits || 0) + 1;
    if (this.pasMaudits % 20 === 0 && debout) g.ui.toast('Le pendentif te ronge... Pense à le passer à quelqu\'un.', 2200);
    if (debout) return true;
    // toute l'équipe est tombée : le pendentif reste là, on se réveille à l'entrée de la salle
    const m = g.mapObj, p = g.player, ici = cle(p.x, p.y), sur = this.sur && this.sur[0] === m.id ? this.sur : [m.id, p.x, p.y];
    const libre = !m.tomb.gouffres.has(ici) && !m.tomb.caches.has(ici) && !m.tomb.piegesCaches.has(ici) && !m.tomb.pieges.has(ici) && !m.deco.some((q) => q.x === p.x && q.y === p.y);
    await this.demande(d.id, { a: 'artefact', k: 'pend', op: 'poser', ou: libre ? [m.id, p.x, p.y] : sur });
    await g.ui.say(['Tes Pokémon s\'effondrent l\'un après l\'autre...', 'Le pendentif glisse de tes mains. Tu perds connaissance.']);
    await this.reveil(d);
    return false;
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

  /* ---------------- pilleurs ---------------- */
  /** le pilleur qui voit le joueur (en ligne droite devant lui) : de 3 cases, de 7 pour le porteur du pendentif */
  pilleurQuiVoit(d, m) {
    const g = this.game, p = g.player, e = this.etats[d.id], A = this.art(d), loin = A.pend.p === this.moi ? 7 : 3;
    for (const n of m.npcs) {
      const k = Object.keys(d.pnj).find((q) => `${d.id}:${d.pnj[q].id}` === n.id), P = k && d.pnj[k];
      if (!P?.pilleur || battu(e, d, k) || (n.when && !n.when())) continue;
      const pris = prisPar(e, d, k); if (pris && pris !== this.moi) continue;
      const [dx, dy] = DIRV[n.dir] || [0, 1];
      for (let i = 1; i <= loin; i++) {
        const x = n.x + dx * i, y = n.y + dy * i;
        if (x === p.x && y === p.y) return k;
        const t = m.get(x, y);
        if (t === T.CAVEWALL || t === T.BLOCK || m.tomb.gouffres.has(cle(x, y))) break;
      }
    }
    return null;
  },
  async engager(d, k) {
    const g = this.game, ui = g.ui, P = d.pnj[k], A = this.art(d);
    g.sound.sfx('encounter');
    await ui.say(A.pend.p === this.moi ? [`${P.cls} ${P.nom} : « Le pendentif ! Donne-le-moi ! »`] : [`${P.cls} ${P.nom} : « ${P.defi} »`]);
    const r = await this.demande(d.id, { a: 'prendre', pnj: k });
    if (!r.ok) return;
    const party = P.equipe.map(([sp, lvl]) => createMon(sp, lvl, { iv: Array(6).fill(Math.min(31, 10 + lvl / 2 | 0)), shiny: false }));
    const res = await this.combat(P, party);
    if (res === 'win') await this.demande(d.id, { a: 'gagne', pnj: k });
    else { await this.demande(d.id, { a: 'lacher', pnj: k }); await this.defaite(d); }
  },

  /* ---------------- le vol et la poursuite ---------------- */
  async guetApens(d) {
    const r = await this.demande(d.id, { a: 'artefact', k: 'pend', op: 'voler' });
    if (r.ok) await this.demande(d.id, { a: 'maj', salle: 's5', donnees: { vol: true } });
  },
  async scene(d, s) {
    const g = this.game, ui = g.ui, m = g.world.maps[s.carte];
    this.sceneVol = m.id; g.refreshNpcs();
    g.sound.sfx('encounter'); g.view.shake = 0.2;
    await ui.say(['Des silhouettes surgissent des alcôves !'], {});
    await ui.say(['Merci de l\'avoir porté jusqu\'ici. Il nous revient.', 'Fumée !'], { speaker: 'Sable-Noir' });
    g.sound.sfx('bang'); g.view.shake = 0.4;
    this.sceneVol = null; g.refreshNpcs();
    await ui.say(['Quand la fumée retombe, la bande a disparu... avec le Pendentif Maudit.', 'Un passage s\'est ouvert au fond de la nef. Ils sont partis par là : rattrapez-les !']);
  },
  async fuite(d, m) {
    const g = this.game;
    (this.fuis ||= {})[m.id] = true; g.refreshNpcs();
    g.sound.sfx('exit');
    await g.ui.say(['Deux pilleurs détalent devant toi, le pendentif à la main !', '« Trop lents ! Le chef vous attend au repaire... si vous y arrivez ! »']);
  },

  /* ---------------- la place : le ruinemaniac et l'entrée des pilleurs ---------------- */
  async ruinemaniac(d) {
    const g = this.game, ui = g.ui, st = g.state, qui = { speaker: 'Ruinemaniac' };
    if (st.bag['cle-ruinemaniac']) {
      await ui.say(this.dTombeau(d, 's1').trou
        ? ['Le passage est ouvert ? Parfait.', 'Rappelle-toi : le Monocle au -1, le Pendentif au -2. Sans eux, la dernière salle ne s\'ouvrira pas.', 'Et rapporte-moi le trésor. Tu ne le regretteras pas.']
        : ['Alors, cette roche ? Elle est au bord est de la place. Celle qui est fissurée.', 'Pas besoin de clé pour elle : un Pokémon costaud avec Force, et elle roulera.'], qui);
      return;
    }
    await ui.say(['Psst, gamin ! Viens par là.', 'Je vois que t\'as l\'air d\'un dresseur drôlement costaud. J\'ai un plan à te proposer.',
      'L\'entrée du tombeau est bien gardée : impossible d\'y entrer par là. Mais il existe un autre accès, connu seulement des pilleurs.',
      'Une roche fissurée, au bord est de la place. Pousse-la avec Force : dessous, il y a un trou qui descend au -3, dans le repaire des brigands.',
      'Le trésor du Roi Sans Nom dort tout au fond, dans une salle scellée. Pour l\'ouvrir, il faut deux reliques.',
      'Le Monocle de Vérité, au -1, et le Pendentif Maudit, au -2. Il faudra remonter les chercher, puis redescendre avec.',
      'Du -3, une porte de fer mène au -2. Voici sa clé : je l\'ai gardée de ma jeunesse.',
      'Va me chercher le trésor. En échange, je te donnerai une récompense qui va te plaire, crois-moi.'], qui);
    if (!(await ui.yesNo('Marché conclu ?', qui))) { await ui.say('Réfléchis bien. Je ne bouge pas d\'ici.', qui); return; }
    g.give('cle-ruinemaniac', 1); g.give('carte-tombeau', 1); g.sound.sfx('item');
    await ui.say([`${st.name} reçoit la Clé de Fer !`, `${st.name} reçoit la Carte du Tombeau !`]);
    st.money += 5000;
    await ui.say(['Sur la carte, j\'ai noté ce que je connais : du -1 au -4. Plus bas, personne n\'est revenu pour me le dire.',
      'Et tiens, quelques billets pour les frais. Au -3, il y a un marchand... arrangeant.', `${st.name} reçoit 5 000 ₽ !`], qui);
    await ui.say('Méfie-toi des moines qui gardent les reliques : s\'ils te voient, ils te jettent dehors.', qui);
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
  /** une salle sur la carte : sol, passages (avec leur destination), reliques, joueurs */
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
      else if (o.type === 'sarcophage') marque(l[0][0], l[0][1], '#a050c8', 'Pendentif Maudit');
      else if (o.type === 'socleLunettes') marque(l[0][0], l[0][1], '#a050c8', 'Monocle de Vérité');
    }
    if (P.suivante) marque(P.suivante[0], P.suivante[1], '#e0a040', '→ plus bas');
    if (s === d.salles[0]) marque(P.depart[0], P.depart[1], '#e8c840', 'Trou des pilleurs');
    const points = [...(g.link?.others.values() || [])].filter((o) => o.map === m.id).map((o) => [o.dx ?? o.x, o.dy ?? o.y, o.color || '#5a88c8']);
    if (g.mapObj === m) points.push([g.player.x, g.player.y, '#ffffff']);
    for (const [i, j, col] of points) { x.fillStyle = col; x.beginPath(); x.arc(i * Z + Z / 2, j * Z + Z / 2, Z * 0.7, 0, 7); x.fill(); x.strokeStyle = '#000'; x.lineWidth = 2; x.stroke(); }
    titre.innerHTML = `<b>${esc(s.nom)}</b> · <span class="mine-leg"><i style="background:#e0a040"></i>passage <i style="background:#7a8090"></i>porte de fer <i style="background:#a050c8"></i>relique <i style="background:#fff"></i>toi</span>`;
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

  /* ---------------- les gardiens ---------------- */
  /** où regarde un gardien en ce moment (même horloge pour tous les joueurs) ; un gardien des reliques ne tourne pas */
  regardGardien(P) {
    const G = P.garde, i = Math.floor((Date.now() / 1000 + (G.decal || 0) * 0.25) / PERIODE) % G.tourne.length;
    return G.tourne[i];
  },
  dorment(d, s) { return this.dTombeau(d, s.id).dorment || []; },
  /** la vue d'un gardien : une ligne droite devant lui, comme un dresseur, arrêtée par les murs, le décor et les personnages */
  vueGardien(m, n, R, npcs) {
    const [dx, dy] = DIRV[n.dir], out = [];
    for (let k = 1; k <= R; k++) {
      const x = n.x + dx * k, y = n.y + dy * k, t = m.get(x, y);
      if (t === T.CAVEWALL || t === T.BLOCK || npcs.some((q) => q !== n && q.x === x && q.y === y)) break;
      out.push([x, y]);
    }
    return out;
  },
  /** à chaque image : les gardiens tournent la tête ; qui passe devant l'un d'eux se fait courir dessus et jeter dehors ;
   *  le porteur du monocle voit leurs regards ; les gardiens endormis ronflent ; quitter la salle les réveille tous */
  /** le tombeau est sombre : on voit bien près des torches (et un peu autour de soi), de moins en moins en s'en éloignant */
  eclairerTombeau(s, m) {
    const g = this.game, v = g.view, root = g.ui.root;
    let cv = this.nuit;
    if (!s || !v?.camera) { if (cv) cv.style.display = 'none'; return; }
    if (!cv) { cv = this.nuit = document.createElement('canvas'); cv.className = 'tombeau-nuit'; }
    // juste au-dessus de l'image du jeu, sous l'interface : la toile s'y multiplie (mix-blend-mode)
    if (cv.parentElement !== root.parentElement) root.parentElement.insertBefore(cv, root);
    cv.style.display = '';
    const C = v.renderer.domElement.getBoundingClientRect(), R = C, dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.round(C.width * dpr), H = Math.round(C.height * dpr);
    Object.assign(cv.style, { left: C.left + 'px', top: C.top + 'px', width: C.width + 'px', height: C.height + 'px' });
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const V = v.camera.position.constructor, proj = (x, y, h) => {
      const p = new V(x + 0.5, h * HPX, y + 0.55).project(v.camera);
      return [((C.left - R.left) + (p.x + 1) / 2 * C.width) * dpr, ((C.top - R.top) + (1 - p.y) / 2 * C.height) * dpr];
    };
    const px = g.player, a = proj(px.x, px.y, 0), b = proj(px.x + 1, px.y, 0), case_ = Math.hypot(b[0] - a[0], b[1] - a[1]) || 32 * dpr;
    const x = cv.getContext('2d'), t = performance.now() / 1000;
    // la toile se multiplie avec l'image (mix-blend-mode) : une pénombre brun-orangé partout, plus claire et plus chaude près des flammes
    x.globalCompositeOperation = 'source-over'; x.fillStyle = 'rgb(74, 36, 18)'; x.fillRect(0, 0, W, H);
    const feux = (m.deco || []).filter((q) => q.k === 'torche' || q.k === 'brasero' || q.k === 'lanterne');
    const lum = [];
    feux.forEach((q, i) => lum.push([...proj(q.x, q.y, 6), case_ * 4.6 * (1 + 0.035 * Math.sin(t * 7.3 + i * 1.7) + 0.02 * Math.sin(t * 13.1 + i)), [170, 112, 70]]));
    lum.push([...proj(v.focus.x - 0.5, v.focus.z - 0.5, 10), case_ * 2.4, [70, 50, 36]]);
    for (const o of g.link?.others?.values() || []) if (o.map === m.id) lum.push([...proj(o.dx ?? o.x, o.dy ?? o.y, 10), case_ * 2.4, [70, 50, 36]]);
    x.globalCompositeOperation = 'lighter';
    for (const [cx, cy, r, [cr, cg, cb]] of lum) {
      if (cx < -r || cy < -r || cx > W + r || cy > H + r) continue;
      const gr = x.createRadialGradient(cx, cy, 0, cx, cy, r);
      gr.addColorStop(0, `rgb(${cr},${cg},${cb})`); gr.addColorStop(0.3, `rgba(${cr},${cg},${cb},0.8)`); gr.addColorStop(0.65, `rgba(${cr},${cg},${cb},0.32)`); gr.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      x.fillStyle = gr; x.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    }
  },
  tickTombeau(dt) {
    const g = this.game, d = this.tombeauIci() || [...this.defs.values()].find(estTombeau), m = g.mapObj, s = d && g.state && this.salleTombeau(d);
    this.eclairerTombeau(s, m);
    // on vient de quitter une salle de gardiens : ils se réveillent tous
    if (this.salleGardiens && this.salleGardiens !== m?.id) {
      const q = d && d.salles.find((x) => x.carte === this.salleGardiens);
      if (q && this.dorment(d, q).length) this.demande(d.id, { a: 'maj', salle: q.id, donnees: { dorment: [] } });
      this.salleGardiens = null;
    }
    if (!s?.gardiens) { if (this.zonesVues) { this.zonesVues = null; dessinerZones(g.view, []); } dessinerZzz(g.view, []); return; }
    this.salleGardiens = m.id;
    const dort = new Set(this.dorment(d, s)), gardes = [], vue = [];
    for (const n of g.npcs) {
      const k = Object.keys(d.pnj).find((q) => `${d.id}:${d.pnj[q].id}` === n.id), P = k && d.pnj[k]; if (!P?.garde) continue;
      if (dort.has(k)) { if (!n.move) n.dir = 'down'; continue; }
      if (!g.busy && !n.move) n.dir = this.regardGardien(P);
      gardes.push([n, k, P]);
      for (const c of this.vueGardien(m, n, P.garde.portee || 6, g.npcs)) vue.push(c);
    }
    dessinerZzz(g.view, g.npcs.filter((n) => [...dort].some((k) => `${d.id}:${d.pnj[k].id}` === n.id)));
    // les regards : seulement à travers le monocle
    const montre = (this.voitTombeau ? vue.map((c) => c.join()).sort().join(';') : '') + '@' + m.id;
    if (montre !== this.zonesVues) { this.zonesVues = montre; const l = montre.split('@')[0]; dessinerZones(g.view, l ? l.split(';').map((c) => c.split(',').map(Number)) : []); }
    const p = g.player;
    if (g.busy || g.bv.alive || !g.input.free) return;
    for (const [n, k, P] of gardes) {
      const v = this.vueGardien(m, n, P.garde.portee || 6, g.npcs);
      if (v.some(([x, y]) => (x === p.x && y === p.y) || (p.move && x === p.move.tx && y === p.move.ty))) {
        g.busy = true; this.repere(d, n).catch((e) => console.error(e)).finally(() => { g.busy = false; });
        return;
      }
    }
  },
  /** un gardien t'a vu : il te court dessus, puis te jette dehors */
  async repere(d, n) {
    const g = this.game, p = g.player;
    if (p.move) await new Promise((res) => { const t = setInterval(() => { if (!p.move) { clearInterval(t); res(); } }, 20); });
    n.bang = true; g.sound.sfx('bang'); await new Promise((r) => setTimeout(r, 650)); n.bang = false;
    const pas = Math.abs(p.x - n.x) + Math.abs(p.y - n.y) - 1;
    if (pas > 0) await g.npcWalk(n, n.dir, pas);
    p.dir = { up: 'down', down: 'up', left: 'right', right: 'left' }[n.dir];
    await this.expulser(d);
  },
  /** parler à un gardien : l'endormir avec une seringue (en s'approchant sans être vu), sinon se faire prendre */
  async parlerGardien(d, m, k) {
    const g = this.game, ui = g.ui, s = this.salleTombeau(d, m);
    if (this.dorment(d, s).includes(k)) { await ui.say('Le gardien ronfle profondément. Zzz...'); return; }
    if (g.state.bag['seringue-somnifere'] && await ui.yesNo('Le gardien ne t\'a pas encore vu. Lui planter une Seringue Somnifère ?')) {
      g.take('seringue-somnifere'); g.sound.sfx('select');
      await this.demande(d.id, { a: 'maj', salle: s.id, donnees: { dorment: [...this.dorment(d, s), k] } });
      await ui.say('Le gardien vacille... et s\'endort debout, en ronflant.');
      return;
    }
    await this.expulser(d);
  },
  /** jeté dehors : les reliques qu'on portait retournent à leur place */
  async expulser(d) {
    const g = this.game, ui = g.ui, A = this.art(d), E = g.world.maps[d.carte].donjon.exterieur, qui = { speaker: 'Gardien du tombeau' };
    g.sound.sfx('encounter'); g.view.shake = 0.2;
    await ui.say(['Halte, scélérat !', 'Maudit pilleur de tombe !'], qui);
    const pris = ['pend', 'lun'].filter((k) => A[k].p === this.moi);
    for (const k of pris) await this.demande(d.id, { a: 'artefact', k, op: 'origine' });
    if (pris.length) await ui.say(`Le gardien t'arrache ${pris.map((k) => NOM[k]).join(' et ')}.`);
    await g.warp({ map: E.carte.id, x: E.devant[0], y: E.devant[1], dir: 'down' }, 'exit');
    await ui.say('Et ne reviens pas ici, maudit profanateur !', qui);
  },
  /** une relique sous la garde de son gardien éveillé : on se fait prendre */
  async garde(d, k) {
    const s = this.salleTombeau(d), m = this.game.mapObj;
    const gk = Object.keys(d.pnj).find((q) => d.pnj[q].garde?.relique === k && m.donjon.plan.pnj[q]);
    if (!gk || this.dorment(d, s).includes(gk)) return false;
    await this.expulser(d);
    return true;
  },

  /* ---------------- les brigands du -3 et du -4 ---------------- */
  async brigand(d, k) {
    const g = this.game, ui = g.ui, P = d.pnj[k], B = P.brigand, qui = { speaker: `${P.cls} ${P.nom}`.trim() };
    if (!B.combat) { await ui.say(B.dit, qui); return; }
    await ui.say(B.dit, qui);
    if (!(await ui.yesNo('Accepter le combat ?'))) { await ui.say(B.refus || 'Comme tu veux. Je ne bouge pas d\'ici.', qui); return; }
    const party = B.combat.map(([sp, lvl]) => createMon(sp, lvl, { iv: Array(6).fill(Math.min(31, 10 + lvl / 2 | 0)), shiny: false }));
    const res = await this.combat({ ...P, perd: B.perd || 'Pas mal du tout !' }, party);
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
    const A = this.art(d), qui = (o, k) => (o.p ? (o.p === this.moi ? 'toi' : this.nomDe(o.p)) : k === 'pend' && o.vole ? 'volé !' : k === 'pend' && o.fin ? 'sur l\'autel' : o.sol ? 'au sol' : k === 'pend' ? 'sur le sarcophage' : 'sur son socle');
    return `<div class="dj-l"><span>Pendentif</span><b>${qui(A.pend, 'pend')}</b></div><div class="dj-l"><span>Monocle</span><b>${qui(A.lun, 'lun')}</b></div>`;
  },
  texteTombeau(d, s) {
    if (!estTombeau(d)) return '';
    if (s.id === 's5') return this.dTombeau(d, 's5').vol ? 'pendentif volé' : 'méfiance';
    if (s.poursuite && this.art(d).pend.vole) return 'poursuite';
    if (s.id === 's10') return this.art(d).pend.fin ? 'fait' : 'l\'autel attend';
    return '';
  },
};
