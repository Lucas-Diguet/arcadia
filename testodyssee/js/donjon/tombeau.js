// testodyssee/js/donjon/tombeau.js — mécaniques du Tombeau du Roi Sans Nom, ajoutées à la classe Donjons (jeu.js).
//
// Deux artefacts, tenus par l'hôte (action « artefact » d'etat.js) : le Pendentif Maudit (pend) et les Lunettes de
// Vérité (lun). Chacun est porté par un joueur, posé au sol, à sa place d'origine (sarcophage, socle), volé ou rendu.
// Le porteur les a dans son Sac (on s'en sert pour les poser ou les donner à un voisin).
//   pendentif : chaque pas retire un peu de PV à chaque Pokémon de son porteur ; si toute l'équipe tombe, il lâche le
//               pendentif et se réveille à l'entrée de la salle. On ne passe à la salle suivante qu'avec lui en main.
//   lunettes  : leur porteur voit le chemin invisible au-dessus des gouffres et les pièges cachés.
//   distance  : les deux porteurs ne peuvent pas s'approcher à moins de DISTANCE cases l'un de l'autre.
// Pilleurs : ils attaquent qui passe dans leur champ de vision, celui qui porte le pendentif de bien plus loin.
// Nef du Guet-apens : quand quelqu'un franchit la ligne du guet, la bande vole le pendentif ; on la poursuit (pilleurs
// qui s'enfuient, salles piégées) jusqu'au repaire, où le pendentif réapparaît quand leur chef est battu.
import { T } from '../../../odyssee/js/world/tiles.js';
import { ITEMS, itemName } from '../../../odyssee/js/core/items.js';
import { createMon, monName } from '../../../odyssee/js/core/mon.js';
import { DISTANCE, PERIODE } from '../donjons/tombeau.js';
import { dessinerZones } from '../rendu.js';
import { artVide, prisPar, battu } from './etat.js';

const cle = (x, y) => x + ',' + y;
const estTombeau = (d) => !!d?.tombeau;
const ITEM = { pend: 'pendentif-maudit', lun: 'lunettes-verite' };
const NOM = { pend: 'le Pendentif Maudit', lun: 'les Lunettes de Vérité' };
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
    // les gardiens : leur parler, c'est se faire prendre
    for (const n of m.npcs) { const k = Object.keys(d.pnj).find((q) => `${d.id}:${d.pnj[q].id}` === n.id); if (k && d.pnj[k].garde) n.talk = () => this.attrape(d, k); }
    // la place : la roche fissurée (l'entrée des pilleurs), les autres roches, le ruinemaniac
    if (m.id === d.carte && m.donjon.exterieur) {
      const E = m.donjon.exterieur, X = E.carte, [px, py] = E.porte;
      const w = X.warpAt(px, py); if (w) w.step = true;
      for (const [x, y] of E.roches) X.object(x, y, { use: () => this.roche(d, x, y) });
      const r = X.npcs.find((n) => n.id === 'tombeau-ruinemaniac'); if (r) r.talk = () => this.ruinemaniac(d);
    }
    // les artefacts se posent et se donnent depuis le Sac
    for (const k of ['pend', 'lun']) if (ITEMS[ITEM[k]]) ITEMS[ITEM[k]].use = async () => { await this.menuArtefact(d, k); return true; };
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
  /** le chemin invisible et les pièges cachés : montrés au seul porteur des lunettes */
  reveler(d, voit) {
    if (this.voitTombeau === voit) return;
    this.voitTombeau = voit;
    const g = this.game;
    for (const s of d.salles) {
      const m = g.world.maps[s.carte]; if (!m?.tomb) continue;
      for (const c of m.tomb.caches) { const [x, y] = c.split(',').map(Number); this.decoSol(m, x, y, voit ? 'revele' : 'gouffre'); }
      for (const c of m.tomb.piegesCaches) { if (this.reveles?.has(`${m.id}:${c}`)) continue; const [x, y] = c.split(',').map(Number); this.decoSol(m, x, y, voit ? 'piege_degats3' : null); }
    }
    if (this.tombeauIci()) g.ui.toast(voit ? 'À travers les lunettes, tu vois ce qui est caché : le regard des gardiens, le chemin au-dessus du vide, les pièges.' : 'Sans les lunettes, ce qui était caché disparaît.', 2600);
  },

  /* ---------------- les artefacts ---------------- */
  /** on peut prendre l'artefact k d'ici ? (pas les deux à la fois, pas trop près du porteur de l'autre) */
  peutPrendre(d, k) {
    const g = this.game, A = this.art(d), o = A[AUTRE[k]];
    if (g.modeTest) return null;
    if (o.p === this.moi) return `Tu portes déjà ${NOM[AUTRE[k]]}. Pose-les d'abord.`;
    if (o.p) {
      const q = this.posDe(o.p);
      if (q && q.map === g.mapObj.id && cheb(q.x, q.y, g.player.x, g.player.y) < DISTANCE) return `${k === 'pend' ? 'Le pendentif' : 'Les lunettes'} te repousse : ${this.nomDe(o.p)}, qui porte ${NOM[AUTRE[k]]}, est trop près.`;
    }
    return null;
  },
  async ramasser(d, k, intro) {
    const g = this.game, ui = g.ui, A = this.art(d);
    if (A[k].p) { await ui.say(`${this.nomDe(A[k].p)} les a déjà.`); return; }
    const non = this.peutPrendre(d, k); if (non) { await ui.say(non); return; }
    if (intro) await ui.say(intro);
    if (!(await ui.yesNo(k === 'pend' ? 'Prendre le Pendentif Maudit ? Il rongera tes Pokémon à chaque pas.' : 'Mettre les Lunettes de Vérité ?'))) return;
    const r = await this.demande(d.id, { a: 'artefact', k, op: 'prendre', test: !!g.modeTest });
    if (!r.ok) { await ui.say(r.why === 'reseau' ? 'L\'hôte du salon ne répond pas...' : r.why === 'pris' ? 'Quelqu\'un vient de le prendre !' : 'Impossible pour l\'instant.'); return; }
    g.sound.sfx('item');
    if (k === 'pend') await ui.say([`${g.state.name} prend le Pendentif Maudit.`, 'Un froid terrible te traverse. Tes Pokémon frissonnent.', 'Pour le poser ou le donner à un voisin : Sac, Pendentif Maudit.']);
    else await ui.say([`${g.state.name} met les Lunettes de Vérité.`, 'Le monde se teinte de violet : tu vois ce qui est caché. Guide les autres !', 'Pour les poser ou les donner à un voisin : Sac, Lunettes de Vérité.']);
  },
  async sarcophage(d) {
    const A = this.art(d), ui = this.game.ui;
    if (A.pend.fin) { await ui.say('Le sarcophage du Roi Sans Nom. La malédiction est levée.'); return; }
    if (A.pend.p || A.pend.sol || A.pend.vole) { await ui.say('Le sarcophage du Roi Sans Nom. Son pendentif n\'y est plus.'); return; }
    await this.ramasser(d, 'pend', ['Le sarcophage du Roi Sans Nom.', 'Un pendentif noir est posé sur sa poitrine de pierre. Il palpite, comme un cœur.']);
  },
  async socleLunettes(d) {
    const A = this.art(d), ui = this.game.ui;
    if (A.lun.p || A.lun.sol) { await ui.say('Un socle vide. Il gardait les Lunettes de Vérité.'); return; }
    await this.ramasser(d, 'lun', ['Sur un socle, des lunettes aux verres violets.', 'Une inscription : « Qui les porte voit la vérité. Qui voit la vérité ne peut approcher le pendentif. »']);
  },
  /** depuis le Sac : poser l'artefact ici, ou le donner à un joueur à côté */
  async menuArtefact(d, k) {
    const g = this.game, ui = g.ui, A = this.art(d), p = g.player, m = g.mapObj;
    if (A[k].p !== this.moi) return;
    const voisins = [...(g.link?.others || new Map()).entries()].filter(([, o]) => o.map === m.id && Math.abs(o.x - p.x) + Math.abs(o.y - p.y) === 1);
    const opts = ['Poser ici', ...voisins.map(([, o]) => `Donner à ${o.name || 'ce joueur'}`), 'Annuler'];
    const c = await ui.ask(`${k === 'pend' ? 'Le Pendentif Maudit' : 'Les Lunettes de Vérité'} : qu'en faire ?`, opts);
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
    if (P.suivante && P.suivante[0] === tx && P.suivante[1] === ty && m.get(tx, ty) === T.CAVEDOOR && s.id !== 's1' && !A.pend.vole && !A.pend.fin && !A.pend.p) {
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
          if (!this.repousseT || performance.now() - this.repousseT > 2500) { this.repousseT = performance.now(); g.ui.toast(`Le pendentif et les lunettes se repoussent : ${this.nomDe(autre)} est trop près.`, 2200); }
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
    if (this.dTombeau(d, 's1').trou) { await ui.say('Le passage est ouvert ? Bonne chance là-dessous... Et n\'oublie pas ma part du trésor !', qui); return; }
    if (st.bag['cle-ruinemaniac']) { await ui.say(['Alors, cette roche ? Elle est au bord de la place, quelque part.', 'Cherche celle qui est fissurée.'], qui); return; }
    await ui.say(['Psst, gamin ! Viens par là.', 'Je vois que t\'as l\'air d\'un dresseur drôlement costaud. J\'ai un plan à te proposer.',
      'L\'entrée du tombeau est bien gardée : impossible d\'y entrer par là. Mais il existe un autre accès, connu seulement des pilleurs.',
      'Faisons un marché : je t\'indique cette entrée, avec la clé qui l\'ouvre. Toi, tu descends au fond du tombeau, et on partage le trésor.'], qui);
    if (!(await ui.yesNo('Marché conclu ?', qui))) { await ui.say('Réfléchis bien. Je ne bouge pas d\'ici.', qui); return; }
    g.give('cle-ruinemaniac', 1); g.sound.sfx('item');
    await ui.say(`${st.name} reçoit la Clé du Ruinemaniac !`);
    await ui.say(['L\'entrée est cachée sous une roche, au bord de la place. Une roche fissurée, tu verras.',
      'En bas, méfie-toi des gardiens : s\'ils te voient, ils te jettent dehors. Et ne te fais pas prendre avec le butin !'], qui);
  },
  async roche(d, x, y) {
    const g = this.game, ui = g.ui, E = g.world.maps[d.carte].donjon.exterieur, vraie = E.porte[0] === x && E.porte[1] === y;
    if (!vraie) { await ui.say('Une grosse roche. Rien de particulier.'); return; }
    if (this.dTombeau(d, 's1').trou) return;
    if (!g.state.bag['cle-ruinemaniac']) { await ui.say(['Cette roche semble anormalement fissurée.', 'Au milieu des fissures, on dirait... une serrure ?']); return; }
    if (!(await ui.yesNo('Cette roche semble anormalement fissurée. Y insérer la clé du ruinemaniac ?'))) return;
    const r = await this.demande(d.id, { a: 'maj', salle: 's1', donnees: { trou: true } });
    if (!r.ok) { await ui.say('L\'hôte du salon ne répond pas...'); return; }
    g.sound.sfx('bang'); g.view.shake = 0.3;
    await ui.say(['La clé tourne. Un déclic sourd...', 'La roche se fend et s\'effondre : un trou s\'ouvre dans le sol ! Une vieille échelle descend dans le noir.']);
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

  /* ---------------- les gardiens ---------------- */
  /** où regarde un gardien en ce moment (même horloge pour tous les joueurs) */
  regardGardien(P) {
    const G = P.garde, i = Math.floor((Date.now() / 1000 + (G.decal || 0) * 0.25) / PERIODE) % G.tourne.length;
    return G.tourne[i];
  },
  /** cases que voit un gardien : un cône devant lui (portée, puis une case de large en plus toutes les deux cases), arrêté par les murs et le décor */
  champGardien(m, gx, gy, dir, R, gardes) {
    const [dx, dy] = DIRV[dir], out = [], bloque = (x, y) => { const t = m.get(x, y); return t === T.CAVEWALL || t === T.BLOCK || gardes.has(cle(x, y)); };
    for (let f = 1; f <= R; f++) for (let l = -(f >> 1); l <= f >> 1; l++) {
      const x = gx + dx * f - dy * l, y = gy + dy * f + dx * l;
      if (x < 0 || y < 0 || x >= m.w || y >= m.h || bloque(x, y)) continue;
      const n = Math.max(Math.abs(x - gx), Math.abs(y - gy));
      let vu = true;
      for (let k = 1; k < n; k++) { const ix = Math.round(gx + (x - gx) * k / n), iy = Math.round(gy + (y - gy) * k / n); if (bloque(ix, iy)) { vu = false; break; } }
      if (vu) out.push(cle(x, y));
    }
    return out;
  },
  /** à chaque image : les gardiens tournent la tête ; qui est dans leur champ de vision est pris ; le porteur des lunettes voit leurs regards */
  tickTombeau(dt) {
    const g = this.game, d = this.tombeauIci(), m = g.mapObj, s = d && this.salleTombeau(d);
    if (!s?.gardiens || !g.state) { if (this.zonesVues) { this.zonesVues = null; dessinerZones(g.view, []); } return; }
    const gardes = new Set(), champ = new Set();
    for (const n of g.npcs) { const P = n.def && Object.values(d.pnj).find((q) => `${d.id}:${q.id}` === n.id); if (P?.garde) gardes.add(cle(n.x, n.y)); }
    for (const n of g.npcs) {
      const P = Object.values(d.pnj).find((q) => `${d.id}:${q.id}` === n.id); if (!P?.garde) continue;
      if (!g.busy) n.dir = this.regardGardien(P);
      for (const c of this.champGardien(m, n.x, n.y, n.dir, P.garde.portee || 6, gardes)) champ.add(c);
    }
    // les regards : seulement à travers les lunettes
    const montre = (this.voitTombeau ? [...champ].sort().join(';') : '') + '@' + m.id;
    if (montre !== this.zonesVues) { this.zonesVues = montre; const l = montre.split('@')[0]; dessinerZones(g.view, l ? l.split(';').map((c) => c.split(',').map(Number)) : []); }
    const p = g.player;
    if (g.busy || g.bv.alive || !g.input.free) return;
    if (champ.has(cle(p.x, p.y)) || (p.move && champ.has(cle(p.move.tx, p.move.ty)))) { g.busy = true; this.attrape(d).catch((e) => console.error(e)).finally(() => { g.busy = false; }); }
  },
  /** pris par un gardien : ce qu'on portait retourne à sa place, et on est jeté dehors, devant l'entrée officielle */
  async attrape(d) {
    const g = this.game, ui = g.ui, A = this.art(d), E = g.world.maps[d.carte].donjon.exterieur;
    g.sound.sfx('encounter'); g.view.shake = 0.2;
    await ui.say(['Halte, scélérat !', 'Maudit pilleur de tombe !'], { speaker: 'Gardien du tombeau' });
    const pris = ['pend', 'lun'].filter((k) => A[k].p === this.moi);
    for (const k of pris) await this.demande(d.id, { a: 'artefact', k, op: 'origine' });
    if (pris.length) await ui.say(`Le gardien t'arrache ${pris.map((k) => NOM[k]).join(' et ')} et ${pris.length > 1 ? 'les remet' : 'le remet'} à sa place.`);
    await g.warp({ map: E.carte.id, x: E.devant[0], y: E.devant[1], dir: 'down' }, 'exit');
    await ui.say('Les gardiens te jettent dehors, devant l\'entrée officielle du tombeau.');
  },

  /* ---------------- encadré ---------------- */
  panneauTombeau(d) {
    if (!estTombeau(d)) return '';
    const A = this.art(d), qui = (o, k) => (o.p ? (o.p === this.moi ? 'toi' : this.nomDe(o.p)) : k === 'pend' && o.vole ? 'volé !' : k === 'pend' && o.fin ? 'sur l\'autel' : o.sol ? 'au sol' : k === 'pend' ? 'sur le sarcophage' : 'sur son socle');
    return `<div class="dj-l"><span>Pendentif</span><b>${qui(A.pend, 'pend')}</b></div><div class="dj-l"><span>Lunettes</span><b>${qui(A.lun, 'lun')}</b></div>`;
  },
  texteTombeau(d, s) {
    if (!estTombeau(d)) return '';
    if (s.id === 's5') return this.dTombeau(d, 's5').vol ? 'pendentif volé' : 'méfiance';
    if (s.poursuite && this.art(d).pend.vole) return 'poursuite';
    if (s.id === 's10') return this.art(d).pend.fin ? 'fait' : 'l\'autel attend';
    return '';
  },
};
