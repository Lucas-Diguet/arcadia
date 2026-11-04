// testodyssee/js/ile/jeu.js — l'île privée dans le labo : chargement et sauvegarde (dans ce navigateur, sous le nom du
// joueur), la carte reconstruite à chaque changement, la mairie (l'adjointe), le musée, le capitaine du ponton, les
// statues des trophées, le mode construction (on survole l'île et on pose case par case), la borne d'arcade (points
// d'usine), l'usine à pièges (achats, statues piégées, salles d'entraînement), la caserne (gardes), et l'essai d'une
// salle d'entraînement en intrus : là seulement, pièges, statues et gardes se déclenchent sur le propriétaire.
import * as THREE from 'three';
import { T, DIRS, walkable } from '../../../odyssee/js/world/tiles.js';
import { el, esc, wait } from '../../../odyssee/js/ui/ui.js';
import { itemName } from '../../../odyssee/js/core/items.js';
import { createMon, healFull, monName } from '../../../odyssee/js/core/mon.js';
import { SPECIES } from '../../../odyssee/js/data/species.js';
import { Raid } from '../combat/raid.js';
import { CombatMiroir, brancher } from '../combat/vue.js';
import { casseBriques } from './casse-briques.js';
import {
  ILE, MUSEE, USINE, CASERNE, SALLE, ARRIVEE, PONTON, CLE_STOCKAGE, FIXES, TROPHEES, TROPHEE, CATALOGUE, ARTICLE, nouvelleIle, etatIle,
  debloques, trophePlace, posable, poser, reprendre, articleEn, fixeEn, construire, construireSalle, sallesMusee, liste, dansZone,
  sorteZone, emprise, collage, collable, coller, besoins, enregistrerDisposition, chargerDisposition, MAX_DISPOSITIONS, ENTREE_SALLE, ESCALIER_SALLE, SALLE_W, SALLE_H, MAX_SALLES, MAX_PLANS,
} from './modele.js';
import {
  PIEGES, PIEGE, STATUES, STATUE, GARDE, MODES, TYPE, VUE, MAX_STATUE, enStock, acheter, ameliorer, prixAmelioration, prix,
  typesOuverts, niveauGarde, equipeGarde, nbBadges, pointsPartie, nomGarde,
} from './usine.js';

export { ILE, ARRIVEE, SALLE };
const LIBRE = new Set([T.GRASS, T.PATH, T.PAVE, T.SAND, T.FLOWER, T.TALL, T.BRIDGE, T.FLOOR]);
const VERS = { up: 'le haut', down: 'le bas', left: 'la gauche', right: 'la droite' };
const TOURNE = { up: 'right', right: 'down', down: 'left', left: 'up' };
const FLECHE = { up: '↑', right: '→', down: '↓', left: '←' };
const copie = (o) => JSON.parse(JSON.stringify(o));
const MOI = 'moi';

export class Ile {
  constructor(game) { this.game = game; this.ile = null; this.pour = null; this.essai = null; this.edition = false; }

  /* ---------------- la donnée ---------------- */
  get cle() { return CLE_STOCKAGE + (this.game.state?.name || 'Testeur'); }
  charger() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(this.cle) || 'null'); } catch (e) { d = null; }
    this.ile = etatIle(d || nouvelleIle(`Île de ${this.game.state?.name || 'Testeur'}`));
    this.pour = this.cle;
    return this.ile;
  }
  sauver() { try { localStorage.setItem(this.cle, JSON.stringify(this.ile)); } catch (e) { /* stockage plein ou interdit */ } }
  donnee() { if (!this.ile || this.pour !== this.cle) this.charger(); return this.ile; }
  get badges() { return nbBadges(this.game.state); }
  /** les pièges se dessinent : pendant la construction, ou si le propriétaire l'a demandé */
  get voir() { return this.edition || this.donnee().voirPieges; }

  /** reconstruit l'île et ses intérieurs (au premier passage, et après chaque changement) */
  preparer() {
    const g = this.game, ile = this.donnee(), maps = g.world.maps;
    const m = construire(maps, ile, { salles: this.salles(), voir: this.voir });
    m.sign(ARRIVEE[0] - 2, ARRIVEE[1], `${ile.nom.toUpperCase()}\nTon île privée. Personne d'autre ne peut y venir... pour l'instant.\nL'adjointe de la mairie t'explique comment la construire.`);
    m.npc({ id: 'ile:capitaine', x: PONTON[0], y: PONTON[1], dir: 'up', sprite: 'capitaine', move: 'static', talk: () => this.capitaine() });
    const parle = (id, carte, fn) => { const n = maps[carte]?.npcs.find((q) => q.id === id); if (n) n.talk = fn; };
    parle('ile:adjoint', `${ILE}:mairie`, () => this.adjointe());
    parle('ile:contremaitresse', USINE, () => this.contremaitresse());
    parle('ile:technicien', USINE, () => this.technicien());
    parle('ile:recruteur', CASERNE, () => this.recruteur());
    return m;
  }
  /** salles du musée ouvertes (selon les trophées débloqués) */
  salles() { return sallesMusee(debloques(this.donnee(), this.game.state).length); }
  /** zone de construction de la carte où l'on est : dehors, au musée, ou dans une salle d'entraînement (hors essai) */
  zoneIci() {
    const m = this.game.mapObj, id = m?.id;
    if (id === SALLE) return this.essai || !m.salle ? null : `salle:${m.salle.pi}:${m.salle.k}`;
    return id === ILE ? 'ile' : id === MUSEE ? 'musee' : null;
  }
  /** redessine la carte où l'on est, sans bouger le joueur */
  refaire() {
    const g = this.game, p = g.player, q = { x: p.x, y: p.y, dir: p.dir }, busy = g.busy, m = g.mapObj, id = m.id;
    if (id === SALLE) g.world.maps[SALLE] = this.carteSalle(m.salle.pi, m.salle.k);
    else this.preparer();
    g.setMap(id); Object.assign(p, q); g.view.update(0, p.x, p.y);
    g.busy = busy;
  }
  /** un donjon fini : sa statue rejoint les trophées de l'île */
  debloquer(id) {
    const ile = this.donnee(), t = TROPHEES.find((q) => q.donjon === id);
    if (!t || ile.donjons.includes(id)) return null;
    ile.donjons.push(id); this.sauver();
    return t;
  }
  sur() { return this.game.mapObj?.id === ILE; }
  dedans() { const id = this.game.mapObj?.id; return !!id && (id === ILE || id.startsWith(ILE + ':')); }
  /** on change de carte : quitter une salle pendant un essai, c'est l'abandonner */
  surCarte(id) { if (this.essai && id !== SALLE && !this.essai.fin) this.finEssai('abandon'); }

  /* ---------------- les habitants ---------------- */
  async capitaine() {
    const g = this.game, ui = g.ui, sp = { speaker: 'Capitaine' };
    const r = await ui.ask('On largue les amarres ?', ['Changer de lieu', 'Rester sur l\'île'], sp);
    if (r === 0) g.onChangerLieu?.();
  }
  async adjointe() {
    const g = this.game, ui = g.ui, ile = this.donnee(), sp = { speaker: 'Adjointe' };
    if (!ile.vuAdjointe) {
      ile.vuAdjointe = true; this.sauver();
      await ui.say(['Bienvenue sur ton île ! Je suis l\'adjointe de la mairie.', 'Ici, tout est à toi : tu poses ce que tu veux, case par case, depuis le mode construction (CONSTRUIRE dans le menu, ou moi).', 'Tes aventures te rapporteront des trophées : une statue par arène et par donjon. Pose-les dehors, ou au musée : là aussi, le mode construction marche. Le musée s\'agrandit d\'une salle tous les quatre trophées.', 'Approche-toi d\'une statue pour savoir ce qui te l\'a rapportée. Pour l\'instant, tout est gratuit. Profites-en !'], sp);
    }
    if (!ile.vuUsine) {
      ile.vuUsine = true; this.sauver();
      await ui.say(['Du nouveau : l\'usine à pièges et la caserne sont dans le catalogue, avec les Bâtiments, et la borne d\'arcade dans les Loisirs.', 'La borne rapporte des points d\'usine. Avec eux, tu achètes des pièges à l\'usine et tu engages des gardes à la caserne.', 'Les pièges ne se déclenchent jamais sur toi, sauf dans la salle d\'entraînement de l\'usine. Le bouton « Pièges », en bas à droite de l\'écran, les montre ou les cache.'], sp);
    }
    for (;;) {
      const n = debloques(ile, g.state).length;
      const k0 = await ui.list({ title: ile.nom, items: [{ label: 'Mode construction' }, { label: 'Mes trophées', right: `${n}/${TROPHEES.length}` }, { label: 'Dispositions de l\'île', right: `${ile.dispositions.length}/${MAX_DISPOSITIONS}` }, { label: 'Renommer l\'île' }, { label: 'Remettre l\'île à zéro' }, { label: 'Au revoir' }], cls: 'shop', cancel: 5 });
      if (k0 === 2) { if (await this.dispositions()) return; continue; }
      const k = k0 > 2 ? k0 - 1 : k0;
      if (k === 0) {
        const f = FIXES.mairie, [x, y] = ile.fixes.mairie;
        await g.warp({ map: ILE, x: x + 2, y: y + f.taille[1], dir: 'down' }, 'exit');
        await this.construction();
        return;
      }
      if (k === 1) await this.listeTrophees();
      else if (k === 2) { const nom = await ui.nameEntry('Nom de ton île', ile.nom); if (nom) { ile.nom = nom.slice(0, 24); this.sauver(); this.refaire(); } }
      else if (k === 3) {
        if (!(await ui.yesNo('Tout effacer et retrouver l\'île du premier jour ? Les trophées débloqués, les points, le stock, les dispositions et les salles d\'entraînement restent.'))) continue;
        if (ile.dispositions.length < MAX_DISPOSITIONS && await ui.yesNo('Garder d\'abord l\'île actuelle dans les dispositions ? Tu pourras la remettre quand tu veux.')) { enregistrerDisposition(ile, `Avant la remise à zéro`); this.sauver(); }
        const neuve = nouvelleIle(ile.nom);
        // ce qui était posé sur l'île retourne au stock
        for (const t of ile.travaux) if (ARTICLE[t.a].stock) neuve.stock[t.a] = (neuve.stock[t.a] || 0) + 1;
        for (const [id, q] of Object.entries(ile.stock)) neuve.stock[id] = (neuve.stock[id] || 0) + q;
        Object.assign(neuve, { donjons: ile.donjons, vuAdjointe: true, vuUsine: true, points: ile.points, statues: ile.statues, plans: ile.plans, voirPieges: ile.voirPieges, dispositions: ile.dispositions, coffre: ile.coffre });
        this.ile = neuve; this.sauver(); this.refaire();
        await ui.say('C\'est fait : ton île est comme au premier jour.', sp);
      } else return;
    }
  }
  /** les dispositions : garder l'île telle qu'elle est, et la remettre plus tard ; true si l'île a changé */
  async dispositions() {
    const g = this.game, ui = g.ui, ile = this.donnee(), sp = { speaker: 'Adjointe' };
    for (;;) {
      const L = ile.dispositions, items = L.map((d) => ({ label: d.nom, right: `${d.travaux.length + (d.musee?.length || 0)} objets` }));
      if (L.length < MAX_DISPOSITIONS) items.push({ label: '+ Garder l\'île actuelle' });
      items.push({ label: 'Retour' });
      const i = await ui.list({ title: 'Dispositions de l\'île', items, cls: 'shop', cancel: items.length - 1 });
      if (i < 0 || i === items.length - 1) return false;
      if (i === L.length) {
        const nom = (await ui.nameEntry('Nom de la disposition', `Disposition ${L.length + 1}`)) || `Disposition ${L.length + 1}`;
        enregistrerDisposition(ile, nom.slice(0, 20)); this.sauver(); g.sound.sfx('save');
        await ui.say(`C'est noté : « ${nom.slice(0, 20)} ». Tu pourras remettre l'île ainsi quand tu voudras.`, sp);
        continue;
      }
      const d = L[i];
      const r = await ui.list({ title: d.nom, items: [{ label: 'Remettre l\'île ainsi' }, { label: 'Remplacer par l\'île actuelle' }, { label: 'Renommer' }, { label: 'Supprimer' }, { label: 'Retour' }], cls: 'shop', cancel: 4 });
      if (r === 0) {
        if (!(await ui.yesNo(`Remettre l'île comme dans « ${d.nom} » ? Ce qui est posé maintenant sera rangé (pense à garder l'île actuelle d'abord si tu y tiens).`))) continue;
        const { manque } = chargerDisposition(ile, d, new Set(debloques(ile, g.state)));
        this.sauver(); this.refaire(); g.sound.sfx('levelup');
        const m = Object.entries(manque);
        await ui.say(m.length ? [`L'île est comme dans « ${d.nom} ».`, 'Il manquait : ' + m.map(([id, n]) => `${n} × ${ARTICLE[id].nom}`).join(', ') + '. Ils restent de côté.'] : `L'île est comme dans « ${d.nom} ».`, sp);
        return true;
      }
      if (r === 1 && await ui.yesNo(`Remplacer « ${d.nom} » par l'île telle qu'elle est maintenant ?`)) { enregistrerDisposition(ile, d.nom, i); this.sauver(); g.sound.sfx('save'); }
      else if (r === 2) { const nom = await ui.nameEntry('Nom de la disposition', d.nom); if (nom) { d.nom = nom.slice(0, 20); this.sauver(); } }
      else if (r === 3 && await ui.yesNo(`Supprimer « ${d.nom} » ?`)) { L.splice(i, 1); this.sauver(); }
    }
  }
  /* ---------------- le dernier étage de la mairie : la base secrète ---------------- */
  async drapeau() { await this.game.ui.say(['Le drapeau de ton île.', 'Garde-le bien : un jour, d\'autres viendront peut-être le chercher.']); }
  /** le coffre-fort : des points d'usine et des objets mis à l'abri */
  async coffreFort() {
    const g = this.game, ui = g.ui, ile = this.donnee(), C = ile.coffre, bag = g.state.bag;
    for (;;) {
      const n = Object.values(C.objets).reduce((a, q) => a + q, 0);
      const k = await ui.list({ title: `Coffre-fort · ${C.points} points · ${n} objet${n > 1 ? 's' : ''}`, items: [{ label: 'Déposer des points d\'usine', right: `${ile.points}` }, { label: 'Reprendre des points d\'usine', right: `${C.points}` }, { label: 'Déposer un objet du Sac' }, { label: 'Reprendre un objet' }, { label: 'Fermer' }], cls: 'shop', cancel: 4 });
      if (k < 0 || k === 4) return;
      if (k === 0 || k === 1) {
        const de = k === 0 ? ile.points : C.points; if (!de) { await ui.say('Il n\'y a rien à déplacer.'); continue; }
        const q = [10, 50, de].filter((v, j, a) => v <= de && a.indexOf(v) === j);
        const r = await ui.ask('Combien ?', q.map((v) => (v === de ? `Tout (${v})` : String(v))).concat(['Annuler']));
        if (r < 0 || r >= q.length) continue;
        if (k === 0) { ile.points -= q[r]; C.points += q[r]; } else { C.points -= q[r]; ile.points += q[r]; }
        this.sauver(); g.sound.sfx('select');
      } else {
        const src = k === 2 ? bag : C.objets, l = Object.entries(src).filter(([, v]) => v > 0);
        if (!l.length) { await ui.say(k === 2 ? 'Ton Sac est vide.' : 'Il n\'y a aucun objet dans le coffre.'); continue; }
        const i = await ui.list({ title: k === 2 ? 'Déposer quel objet ?' : 'Reprendre quel objet ?', items: l.map(([id, v]) => ({ label: itemName(id), right: `× ${v}` })).concat([{ label: 'Retour' }]), cls: 'shop', cancel: l.length });
        if (i < 0 || i >= l.length) continue;
        const [id, v] = l[i], r = v > 1 ? await ui.ask(`${itemName(id)} : combien ?`, ['Un', `Tout (${v})`, 'Annuler']) : 0;
        if (r < 0 || r > 1) continue;
        const q = r === 0 ? 1 : v, dst = k === 2 ? C.objets : bag;
        src[id] -= q; if (!src[id]) delete src[id];
        dst[id] = (dst[id] || 0) + q;
        this.sauver(); g.sound.sfx('item');
      }
    }
  }
  async listeTrophees() {
    const g = this.game, ile = this.donnee(), ok = new Set(debloques(ile, g.state));
    const items = TROPHEES.map((t) => ({ label: `${ok.has(t.id) ? '✔' : '·'} ${t.nom}`, right: !ok.has(t.id) ? (t.badge != null ? `badge ${t.badge + 1}` : 'donjon à finir') : { ile: 'sur l\'île', musee: 'au musée' }[trophePlace(ile, t.id)] || 'à poser' }));
    for (;;) {
      const k = await g.ui.list({ title: `Trophées · ${ok.size}/${TROPHEES.length} · musée : ${this.salles()} salle${this.salles() > 1 ? 's' : ''}`, items: items.concat([{ label: 'Fermer' }]), cls: 'shop', cancel: items.length });
      if (k < 0 || k >= TROPHEES.length) return;
      const t = TROPHEES[k];
      await g.ui.say(ok.has(t.id) ? [`${t.nom}.`, t.origine] : [`${t.nom} : pas encore débloquée.`, t.badge != null ? `Elle viendra avec le badge de l'arène n°${t.badge + 1}.` : t.origine.replace('En récompense pour avoir terminé', 'Elle viendra quand tu auras terminé')]);
    }
  }

  /* ---------------- la borne d'arcade ---------------- */
  async borne() {
    const g = this.game, ui = g.ui, ile = this.donnee();
    const choix = ['Jouer au casse-briques', 'Les règles'];
    if (g.modeTest) choix.push('+500 points (mode test)');
    choix.push('Partir');
    const r = await ui.ask(`Borne d'arcade · ${ile.points} points d'usine`, choix);
    if (choix[r] === 'Les règles') { await ui.say(['Casse-briques : renvoie la Poké Ball avec la raquette pour casser le mur. Trois balles par partie.', 'Chaque brique cassée rapporte 1 point d\'usine, chaque mur fini 15 points de plus. Certaines briques lâchent un bonus : L (raquette large) ou M (deux balles de plus).', 'Les points se dépensent à l\'usine à pièges et à la caserne.']); return; }
    if (choix[r] === '+500 points (mode test)') { ile.points += 500; this.sauver(); g.sound.sfx('item'); await ui.say(`+500 points d'usine. Tu en as ${ile.points}.`); return; }
    if (choix[r] !== 'Jouer au casse-briques') return;
    g.busy = true;
    const pop = g.input.push(() => {});
    if (g.hud?.root) g.hud.root.style.visibility = 'hidden';
    let res;
    try { res = await casseBriques(ui.root, { son: (k) => g.sound.sfx(k) }); }
    finally { pop(); if (g.hud?.root) g.hud.root.style.visibility = ''; g.input.clearDirs(); }
    const pts = pointsPartie(res.briques, res.murs);
    ile.points += pts; ile.recordBorne = Math.max(ile.recordBorne || 0, pts); this.sauver();
    if (pts) g.sound.sfx('item');
    await ui.say(`${res.briques} brique${res.briques > 1 ? 's' : ''} cassée${res.briques > 1 ? 's' : ''}${res.murs ? `, ${res.murs} mur${res.murs > 1 ? 's' : ''} fini${res.murs > 1 ? 's' : ''}` : ''} : +${pts} point${pts > 1 ? 's' : ''} d'usine.\nTu en as ${ile.points}. Record : ${ile.recordBorne}.`);
    g.busy = false;
  }

  /* ---------------- l'usine à pièges ---------------- */
  async contremaitresse() {
    const g = this.game, ui = g.ui, ile = this.donnee(), sp = { speaker: 'Contremaîtresse' };
    if (!ile.vuContremaitresse) {
      ile.vuContremaitresse = true; this.sauver();
      await ui.say(['Bienvenue à l\'usine ! Ici, on fabrique des pièges, et on les paie en points d\'usine.', 'Les points, tu les gagnes à la borne d\'arcade. Un piège acheté va dans ton stock : tu le poses sur l\'île en mode construction.', 'Pour concevoir des salles de pièges et les essayer toi-même, va voir le technicien.'], sp);
    }
    for (;;) {
      const k = await ui.list({ title: `Usine · ${ile.points} points`, items: [{ label: 'Pièges' }, { label: 'Statues piégées' }, { label: 'Mon stock' }, { label: 'Au revoir' }], cls: 'shop', cancel: 3 });
      if (k === 0) await this.vitrine(PIEGES.map((p) => ({ id: p.id, nom: p.nom, desc: p.desc })));
      else if (k === 1) await this.vitrineStatues();
      else if (k === 2) await this.monStock();
      else return;
    }
  }
  /** une liste d'articles à acheter un par un ou par cinq */
  async vitrine(arts, titre = 'Pièges') {
    const g = this.game, ui = g.ui, ile = this.donnee();
    let start = 0;
    for (;;) {
      const items = arts.map((a) => ({ label: a.nom, right: `${prix(a.id, this.badges)} pts · ${enStock(ile, a.id)} en stock` }));
      const i = await ui.list({ title: `${titre} · ${ile.points} points`, items: items.concat([{ label: 'Retour' }]), cls: 'shop', cancel: arts.length, start });
      if (i < 0 || i >= arts.length) return;
      start = i;
      const a = arts[i], p = prix(a.id, this.badges);
      const r = await ui.ask(`${a.nom} : ${a.desc}`, [`Acheter 1 (${p} pts)`, `Acheter 5 (${p * 5} pts)`, 'Retour']);
      if (r < 0 || r > 1) continue;
      let n = 0, why = null;
      for (let q = 0; q < (r === 0 ? 1 : 5); q++) { const res = acheter(ile, a.id, this.badges); if (!res.ok) { why = res.why; break; } n++; }
      this.sauver();
      if (n) { g.sound.sfx('item'); await ui.say(`${n} × ${a.nom} : dans ton stock (${enStock(ile, a.id)}). Il te reste ${ile.points} points.`); }
      if (why) { g.sound.sfx('bump'); await ui.say(why); }
    }
  }
  async vitrineStatues() {
    const g = this.game, ui = g.ui, ile = this.donnee();
    for (;;) {
      const items = STATUES.map((s) => ({ label: s.nom, right: `niv. ${ile.statues[s.id]} · ${enStock(ile, s.id)} en stock` }));
      const i = await ui.list({ title: `Statues piégées · ${ile.points} points`, items: items.concat([{ label: 'Retour' }]), cls: 'shop', cancel: STATUES.length });
      if (i < 0 || i >= STATUES.length) return;
      const s = STATUES[i], niv = ile.statues[s.id];
      const opts = [`Acheter (${s.prix} pts)`, niv < MAX_STATUE ? `Niveau ${niv} → ${niv + 5} (${prixAmelioration(niv)} pts)` : 'Niveau maximal', 'Retour'];
      const r = await ui.ask(`${s.nom}, niveau ${niv}. ${s.desc} Toutes tes statues de ${SPECIES[s.sp].n} ont ce niveau.`, opts);
      if (r === 0) { const res = acheter(ile, s.id); this.sauver(); g.sound.sfx(res.ok ? 'item' : 'bump'); await ui.say(res.ok ? `${s.nom} : dans ton stock (${enStock(ile, s.id)}). Il te reste ${ile.points} points.` : res.why); }
      else if (r === 1 && niv < MAX_STATUE) { const res = ameliorer(ile, s.id); this.sauver(); g.sound.sfx(res.ok ? 'levelup' : 'bump'); await ui.say(res.ok ? `${s.nom} passe au niveau ${res.niveau}. Il te reste ${ile.points} points.` : res.why); }
    }
  }
  async monStock() {
    const g = this.game, ile = this.donnee();
    const l = Object.entries(ile.stock).filter(([, n]) => n > 0).map(([id, n]) => ({ label: ARTICLE[id]?.nom || id, right: `× ${n}`, disabled: true }));
    await g.ui.list({ title: `Mon stock · ${ile.points} points`, items: (l.length ? l : [{ label: 'Rien pour l\'instant', disabled: true }]).concat([{ label: 'Fermer' }]), cls: 'shop', cancel: l.length || 1, start: l.length || 1 });
  }

  /* ---------------- la caserne ---------------- */
  async recruteur() {
    const g = this.game, ui = g.ui, ile = this.donnee(), sp = { speaker: 'Recruteur' }, b = this.badges;
    if (!ile.vuRecruteur) {
      ile.vuRecruteur = true; this.sauver();
      await ui.say(['Garde à vous ! Ici, tu engages des dresseurs pour défendre ton île.', 'Celui qui guette surveille droit devant lui et défie l\'intrus qui passe. Le garde de combat attend qu\'un piège de combat l\'appelle : il est plus cher, mais plus fort.', 'Chaque badge ouvre une nouvelle spécialité et fait monter le niveau des gardes.'], sp);
    }
    const ouverts = typesOuverts(b);
    const arts = ouverts.flatMap((t) => Object.keys(MODES).map((m) => GARDE[`gd:${t.t}:${m}`]));
    let start = 0;
    for (;;) {
      const items = arts.map((a) => ({ label: a.nom, right: `niv. ${niveauGarde(a.mode, b)} · ${prix(a.id, b)} pts · ${enStock(ile, a.id)}` }));
      const i = await ui.list({ title: `Caserne · ${ile.points} points · ${ouverts.length}/12 spécialités`, items: items.concat([{ label: 'Au revoir' }]), cls: 'shop', cancel: arts.length, start });
      if (i < 0 || i >= arts.length) return;
      start = i;
      const a = arts[i], p = prix(a.id, b), eq = equipeGarde(a.id, b).map(([s, l]) => `${SPECIES[s].n} niv. ${l}`).join(', ');
      const r = await ui.ask(`${a.nom}. ${a.mode === 'guet' ? `Il guette ${VUE} cases droit devant lui.` : 'Il vient quand un piège de combat de la même salle se déclenche.'} Équipe : ${eq}.`, [`Engager (${p} pts)`, 'Retour'], sp);
      if (r !== 0) continue;
      const res = acheter(ile, a.id, b); this.sauver();
      g.sound.sfx(res.ok ? 'item' : 'bump');
      await ui.say(res.ok ? `Engagé ! ${a.nom} : ${enStock(ile, a.id)} prêt${enStock(ile, a.id) > 1 ? 's' : ''} à poser. Il te reste ${ile.points} points.` : res.why, sp);
    }
  }
  /** parler à un garde ou à une statue posée */
  async parlerDefense(t) {
    const g = this.game, a = ARTICLE[t.a];
    if (this.essai && !this.essai.battus.has(`${this.essai.k}:${t.x},${t.y}`)) {
      const n = g.npcs.find((q) => q.x === t.x && q.y === t.y) || null;
      if (a.garde) return this.combatDefense({ ...t, garde: a.garde, id: a.id }, n);
      return this.combatDefense({ ...t, statue: a.statue, id: a.id }, null);
    }
    if (a.statue) { await g.ui.say(`${a.nom}, niveau ${this.donnee().statues[a.id]}. Elle regarde vers ${VERS[t.dir || 'down']}.`); return; }
    const eq = equipeGarde(a.id, this.badges).map(([s, l]) => `${SPECIES[s].n} (${l})`).join(', ');
    await g.ui.say(this.essai ? '« Bien joué. Je reprends ma garde. »' : `« ${nomGarde(t.x, t.y)}, ${MODES[a.garde.mode].nom.toLowerCase()}, à vos ordres ! »\nÉquipe : ${eq}.`, { speaker: `${MODES[a.garde.mode].cls} ${nomGarde(t.x, t.y)}` });
  }

  /* ---------------- les salles d'entraînement ---------------- */
  async technicien() {
    const g = this.game, ui = g.ui, ile = this.donnee(), sp = { speaker: 'Technicien' };
    if (!ile.vuTechnicien) {
      ile.vuTechnicien = true; this.sauver();
      await ui.say(['La salle d\'entraînement, c\'est mon domaine. Tu y conçois des parcours : une salle, puis une autre, jusqu\'à cinq.', 'Dans une salle, tu poses librement tout ce que tu as débloqué : ça ne coûte rien, c\'est pour s\'entraîner.', 'Ensuite, tu essaies ton parcours en intrus : les pièges, les statues et les gardes se déclenchent sur toi.', 'Une salle qui te plaît, tu la colles d\'un bloc sur ton île, depuis le mode construction (il faudra les pièges en stock).'], sp);
    }
    for (;;) {
      const items = ile.plans.map((p) => ({ label: p.nom, right: `${p.salles.length} salle${p.salles.length > 1 ? 's' : ''}` }));
      if (ile.plans.length < MAX_PLANS) items.push({ label: '+ Nouveau parcours' });
      items.push({ label: 'Au revoir' });
      const i = await ui.list({ title: 'Salles d\'entraînement', items, cls: 'shop', cancel: items.length - 1 });
      if (i < 0 || i === items.length - 1) return;
      if (i === ile.plans.length) {
        const nom = (await ui.nameEntry('Nom du parcours', `Parcours ${ile.plans.length + 1}`)) || `Parcours ${ile.plans.length + 1}`;
        ile.plans.push({ nom: nom.slice(0, 20), salles: [[]] }); this.sauver();
        if (await this.unParcours(ile.plans.length - 1)) return;
        continue;
      }
      if (await this.unParcours(i)) return;
    }
  }
  /** le menu d'un parcours ; true si l'on part dans une salle */
  async unParcours(pi) {
    const g = this.game, ui = g.ui, ile = this.donnee();
    for (;;) {
      const p = ile.plans[pi], n = p.salles.length;
      const opts = [['Modifier une salle', 'mod'], ['Essayer le parcours en intrus', 'essai']];
      if (n < MAX_SALLES) opts.push(['Ajouter une salle', 'plus']);
      if (n > 1) opts.push(['Retirer la dernière salle', 'moins']);
      opts.push(['Renommer', 'nom'], ['Supprimer le parcours', 'suppr'], ['Retour', 'ret']);
      const r = await ui.list({ title: `${p.nom} · ${n} salle${n > 1 ? 's' : ''}`, items: opts.map(([l]) => ({ label: l })), cls: 'shop', cancel: opts.length - 1 });
      const k = r < 0 ? 'ret' : opts[r][1];
      if (k === 'ret') return false;
      if (k === 'mod') {
        const s = n === 1 ? 0 : await ui.list({ title: 'Quelle salle ?', items: p.salles.map((q, j) => ({ label: `Salle ${j + 1}`, right: `${q.length} objet${q.length > 1 ? 's' : ''}` })), cls: 'shop', cancel: -1 });
        if (s < 0) continue;
        await this.entrerSalle(pi, s, { edition: true });
        return true;
      }
      if (k === 'essai') {
        if (!p.salles.some((q) => q.length)) { await ui.say('Ce parcours est vide : pose d\'abord quelques pièges.'); continue; }
        await ui.say(['Tu entres en intrus : les pièges sont cachés (le bouton « Pièges », en bas à droite, les montre), les statues et les gardes te surveillent.', 'Monte l\'escalier de chaque salle pour passer à la suivante. Un combat perdu, et l\'essai s\'arrête. Tes Pokémon sont soignés avant et après.']);
        await this.lancerEssai(pi);
        return true;
      }
      if (k === 'plus') { p.salles.push([]); this.sauver(); await ui.say(`Salle ${p.salles.length} ajoutée.`); }
      else if (k === 'moins') { if (await ui.yesNo(`Retirer la salle ${n} et ce qu'elle contient ?`)) { p.salles.pop(); this.sauver(); } }
      else if (k === 'nom') { const nom = await ui.nameEntry('Nom du parcours', p.nom); if (nom) { p.nom = nom.slice(0, 20); this.sauver(); } }
      else if (k === 'suppr') { if (await ui.yesNo(`Supprimer « ${p.nom} » ?`)) { ile.plans.splice(pi, 1); this.sauver(); return false; } }
    }
  }
  /** la carte d'une salle : l'escalier (géré au pas) et la sortie vers l'usine */
  carteSalle(pi, k) {
    const ile = this.donnee(), vus = new Set();
    if (this.essai) for (const c of this.essai.vus) { const [kk, xy] = c.split(':'); if (+kk === k) vus.add(xy); }
    const m = construireSalle(ile, pi, k, { voir: this.voir, vus });
    m.warp(m.exitX, m.exitY, { map: USINE, x: 10, y: 5, dir: 'up' });
    // les gardes déjà battus pendant l'essai ne bougent plus
    for (const n of m.npcs) n.talk = (api) => { const [x, y] = n.id.split(':').pop().split(',').map(Number), t = ile.plans[pi].salles[k].find((q) => q.x === x && q.y === y); if (t) return this.parlerDefense(t); };
    return m;
  }
  async entrerSalle(pi, k, o = {}) {
    const g = this.game;
    g.world.maps[SALLE] = this.carteSalle(pi, k);
    await g.warp({ map: SALLE, x: ENTREE_SALLE[0], y: ENTREE_SALLE[1], dir: 'up' }, 'exit');
    if (o.edition) await this.construction();
  }
  async lancerEssai(pi) {
    const g = this.game;
    for (const m of g.state.party) healFull(m);
    this.essai = { pi, k: 0, vus: new Set(), battus: new Set(), pieges: 0, combats: 0, debut: performance.now() };
    await this.entrerSalle(pi, 0);
  }
  /** fin de l'essai : 'reussi', 'perdu' ou 'abandon' */
  async finEssai(comment) {
    const g = this.game, E = this.essai; if (!E || E.fin) return;
    E.fin = comment;
    this.colleJusqua = 0; this.brume?.remove(); this.brume = null;
    for (const m of g.state.party) healFull(m);
    if (comment === 'abandon') { this.essai = null; return; }
    const s = Math.round((performance.now() - E.debut) / 1000);
    const bilan = `${E.pieges} piège${E.pieges > 1 ? 's' : ''} déclenché${E.pieges > 1 ? 's' : ''}, ${E.combats} combat${E.combats > 1 ? 's' : ''} gagné${E.combats > 1 ? 's' : ''}, en ${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s.`;
    if (comment === 'reussi') { g.sound.play('victory'); await g.ui.say([`Parcours réussi !`, bilan]); }
    else await g.ui.say(['L\'intrus a été arrêté : essai perdu.', bilan, 'Tes Pokémon sont soignés.']);
    this.essai = null;
    await this.retourUsine();
    g.updateZone?.();
  }
  /** devant le technicien (ou au débarcadère, si l'usine n'est plus sur l'île) */
  async retourUsine() {
    const g = this.game;
    if (!this.donnee().travaux.some((t) => t.a === 'usine')) return g.warp({ map: ILE, x: ARRIVEE[0], y: ARRIVEE[1], dir: 'up' }, 'exit');
    if (!g.world.maps[USINE]) this.preparer();
    return g.warp({ map: USINE, x: 10, y: 5, dir: 'up' }, 'exit');
  }
  /** la colle : on avance deux fois moins vite */
  colle() { return this.essai && performance.now() < (this.colleJusqua || 0); }

  /** après chaque pas, dans une salle : l'escalier, les pièges, le regard des statues et des gardes */
  async apresPas() {
    const g = this.game, m = g.mapObj, p = g.player;
    if (m?.id !== SALLE || !m.salle || g.busy) return;
    const { pi, k, n } = m.salle;
    if (p.x === ESCALIER_SALLE[0] && p.y === ESCALIER_SALLE[1]) {
      g.busy = true;
      try {
        if (k + 1 < n) { if (this.essai) this.essai.k = k + 1; await this.entrerSalle(pi, k + 1); }
        else if (this.essai) await this.finEssai('reussi');
        else { await g.ui.say('C\'est la dernière salle du parcours.'); await this.retourUsine(); }
      } finally { g.busy = false; }
      return;
    }
    const E = this.essai; if (!E) return;
    const cle = `${k}:${p.x},${p.y}`, pg = m.pieges.find((q) => q.x === p.x && q.y === p.y);
    if (pg && !E.vus.has(cle)) {
      E.vus.add(cle); E.pieges++;
      g.busy = true;
      try { await this.declencher(PIEGE[pg.id], m); } finally { g.busy = false; }
      if (!this.essai) return;
      if (g.mapObj?.id === SALLE) this.refaire();
      return;
    }
    await this.regards();
  }
  async declencher(P, m) {
    const g = this.game, ui = g.ui, p = g.player;
    switch (P.effet) {
      case 'trou':
        g.sound.sfx('ledge'); g.view.shake = 0.25; await ui.say('Tu tombes dans un trou !'); await wait(1200); await ui.say('… et tu en ressors à grand-peine.'); break;
      case 'roche':
        g.sound.sfx('bump'); g.view.shake = 0.5; await ui.say('Des cailloux te tombent dessus ! Te voilà coincé.'); await wait(2200); break;
      case 'brume': {
        g.sound.sfx('cancel'); await ui.say('Une brume épaisse se lève !');
        this.brume?.remove(); const b = this.brume = el('div', 'ile-brume'); ui.root.appendChild(b);
        setTimeout(() => { b.classList.add('part'); setTimeout(() => b.remove(), 900); if (this.brume === b) this.brume = null; }, 8000);
        break;
      }
      case 'colle': g.sound.sfx('bump'); this.colleJusqua = performance.now() + 10000; await ui.say('Tes pieds collent au sol : tu avances deux fois moins vite !'); break;
      case 'renvoi': {
        g.sound.sfx('exit'); await ui.say('Un tourbillon t\'emporte…');
        await g.warp({ map: SALLE, x: ENTREE_SALLE[0], y: ENTREE_SALLE[1], dir: 'up' }, 'exit');
        break;
      }
      case 'degats': {
        const mon = g.state.party.find((q) => q.hp > 0); if (!mon) break;
        const perte = Math.min(mon.hp - 1, Math.max(1, Math.round(mon.stats[0] * P.part)));
        mon.hp -= Math.max(0, perte); g.sound.sfx('bump'); g.view.shake = 0.3;
        await ui.say(`Des pointes jaillissent du sol ! ${monName(mon)} perd ${perte} PV (${Math.round(P.part * 100)} %).`);
        g.hud?.update(true);
        break;
      }
      case 'alarme': case 'combat': {
        g.sound.sfx('bang'); await ui.say(P.effet === 'alarme' ? 'Une alarme retentit !' : 'Un signal rouge clignote : on appelle un garde de combat !');
        const E = this.essai, libres = m.defenses.filter((d) => d.garde && !E.battus.has(`${E.k}:${d.x},${d.y}`) && (P.effet === 'alarme' || d.garde.mode === 'combat'));
        if (!libres.length) { await ui.say(P.effet === 'alarme' ? 'Personne ne répond : il n\'y a aucun garde dans cette salle.' : 'Personne ne vient : il n\'y a aucun garde de combat dans cette salle.'); break; }
        const d = libres.sort((a, b) => Math.abs(a.x - p.x) + Math.abs(a.y - p.y) - Math.abs(b.x - p.x) - Math.abs(b.y - p.y))[0];
        const n = g.npcs.find((q) => q.id === `ile:garde:${d.x},${d.y}`);
        // il accourt à côté de l'intrus
        if (n) {
          const place = [[0, -1], [1, 0], [-1, 0], [0, 1]].map(([dx, dy]) => [p.x + dx, p.y + dy]).find(([x, y]) => walkable(g.mapObj.get(x, y)) && !g.occupied(x, y, n));
          if (place) { [n.x, n.y] = place; n.dir = p.x > n.x ? 'right' : p.x < n.x ? 'left' : p.y > n.y ? 'down' : 'up'; p.dir = { up: 'down', down: 'up', left: 'right', right: 'left' }[n.dir]; }
          n.bang = true; await wait(600); n.bang = false;
        }
        await this.combatDefense(d, n);
        break;
      }
    }
  }
  /** une statue ou un garde qui guette voit l'intrus droit devant lui */
  async regards() {
    const g = this.game, m = g.mapObj, p = g.player, E = this.essai; if (!E || g.busy) return;
    for (const d of m.defenses || []) {
      if (E.battus.has(`${E.k}:${d.x},${d.y}`) || (d.garde && d.garde.mode !== 'guet')) continue;
      const n = d.garde ? g.npcs.find((q) => q.id === `ile:garde:${d.x},${d.y}`) : null;
      const ox = n ? n.x : d.x, oy = n ? n.y : d.y, dir = n ? n.dir : d.dir, [dx, dy] = DIRS[dir];
      for (let s = 1; s <= VUE; s++) {
        const x = ox + dx * s, y = oy + dy * s;
        if (x === p.x && y === p.y) {
          g.busy = true;
          try {
            g.sound.sfx('bang');
            if (n) {
              n.bang = true; await wait(650); n.bang = false;
              if (s > 1) await g.npcWalk(n, n.dir, s - 1);
              p.dir = { up: 'down', down: 'up', left: 'right', right: 'left' }[n.dir];
            } else { g.view.shake = 0.4; await g.ui.flash?.(1, '#ffffff', 60); }
            await this.combatDefense(d, n);
          } finally { g.busy = false; }
          return;
        }
        if (!walkable(m.get(x, y)) || g.npcs.some((q) => q !== n && q.x === x && q.y === y)) break;
      }
    }
  }
  /** le combat contre une défense ; une défaite arrête l'essai */
  async combatDefense(d, n) {
    const g = this.game, ui = g.ui, E = this.essai, ile = this.donnee();
    let res;
    if (d.statue) {
      await ui.say(`La statue de ${SPECIES[d.statue.sp].n} s'anime !`);
      res = await this.combatStatue(d.statue, ile.statues[d.id]);
    } else {
      const M = MODES[d.garde.mode], nom = nomGarde(d.x, d.y);
      await ui.say(d.garde.mode === 'guet' ? '« Halte ! Un intrus ! »' : '« On m\'a appelé ? Tu ne passeras pas ! »', { speaker: `${M.cls} ${nom}` });
      const party = equipeGarde(d.id, this.badges).map(([sp, lvl]) => createMon(sp, lvl, { iv: Array(6).fill(Math.min(31, 10 + lvl / 2 | 0)), shiny: false }));
      g.musicLock = true;
      try { res = await g.runBattle({ trainer: { cls: M.cls, name: nom, prize: 0, bs: d.garde.sprite, ai: 'smart', items: {}, lose: 'Tu es passé… pour cette fois.' }, party, music: 'trainer', noWhiteout: true }); }
      finally { g.musicLock = false; g.updateZone(); }
    }
    if (!this.essai) return;
    if (res === 'win') { E.battus.add(`${E.k}:${d.x},${d.y}`); E.combats++; }
    else await this.finEssai('perdu');
  }
  /** une statue piégée : un boss à trois blocs, joué sur place */
  async combatStatue(S, niveau) {
    const g = this.game;
    if (g.modeTest && await g.ui.yesNo('Mode test : passer ce combat (compté comme gagné) ?')) return 'win';
    const boss = createMon(S.sp, niveau, { iv: Array(6).fill(31), shiny: false });
    const infos = { cls: 'Statue', nom: SPECIES[S.sp].n };
    const raid = new Raid({ joueurs: [{ id: MOI, nom: g.state.name, party: copie(g.state.party) }], boss: { mon: boss, ...infos }, blocs: 3 });
    const intro = { etape: 'debut', evs: raid.start(), photo: raid.photo(), boss: infos };
    const miroir = new CombatMiroir({ moi: MOI, party: g.state.party, intro, boss: infos });
    const envoyer = (action) => { const evs = raid.action(MOI, action); if (evs) setTimeout(() => miroir.recevoir({ etape: 'tour', evs, photo: raid.photo() }), 0); };
    g.musicLock = true; g.sound.play('legend');
    const curtain = await g.encounterIntro('legend'); curtain.remove();
    const defaire = brancher(g.bv, miroir, MOI);
    let res;
    try { res = await g.bv.runPvp(miroir, miroir.duel(envoyer), { bg: 'cave' }); }
    finally { defaire(); g.bv.close(); g.musicLock = false; }
    g.sound.stopMusic(0.1); g.sound.current = null; g.updateZone();
    return res === 'win' ? 'win' : 'lose';
  }

  /* ---------------- à chaque image : statues, bouton des pièges ---------------- */
  tick() {
    const g = this.game, D = g.donjons, dedans = this.dedans();
    this.boutonPieges(dedans && !this.edition && [ILE, SALLE].includes(g.mapObj?.id) && g.mode !== 'battle');
    if (!D || !dedans) return;
    D.imgStatues ||= {};
    for (const s of g.mapObj.statues || []) D.statue(g, `ile:${s.x},${s.y}`, s.sp, s.x, s.y, s.grand ? 0.6 : 0.45);
  }
  /** le bouton du HUD qui montre ou cache les pièges (cachés par défaut) */
  boutonPieges(montrer) {
    const g = this.game;
    if (!montrer || g.bv?.open) { this.btnPieges?.remove(); this.btnPieges = null; return; }
    const ile = this.donnee(), txt = ile.voirPieges ? '👁 Pièges : visibles' : '👁 Pièges : cachés';
    if (!this.btnPieges) {
      const b = this.btnPieges = el('button', 'ile-voir'); b.type = 'button';
      b.onclick = (e) => { e.stopPropagation(); if (g.busy) return; ile.voirPieges = !ile.voirPieges; this.sauver(); this.refaire(); b.blur(); };
      g.ui.root.appendChild(b);
    }
    if (this.btnPieges.textContent !== txt) { this.btnPieges.textContent = txt; this.btnPieges.classList.toggle('on', ile.voirPieges); }
  }

  /* ---------------- le mode construction ---------------- */
  async construction() {
    const g = this.game, ui = g.ui, zone = this.zoneIci(); if (!zone) { await ui.say(this.essai ? 'Pas pendant un essai.' : 'Le mode construction marche dehors, sur ton île, au musée, et dans les salles d\'entraînement.'); return; }
    const ile = this.donnee(), p = g.player, depart = { x: p.x, y: p.y }, salles = this.salles(), L = () => liste(ile, zone), sorte = sorteZone(zone);
    const pose = (t) => posable(ile, t, zone, { salles });
    const ouverts = new Set(typesOuverts(this.badges).map((t) => t.t));
    const visible = (a) => dansZone(a, zone) && (!a.garde || ouverts.has(a.garde.type));
    g.busy = true; this.edition = true; this.refaire(); g.busy = true;
    let art = sorte === 'musee' ? ARTICLE[CATALOGUE.find((a) => a.tr && debloques(ile, g.state).includes(a.tr) && !trophePlace(ile, a.tr))?.id || 'plante'] : sorte === 'salle' ? ARTICLE['pg:trou'] : ARTICLE.arbre;
    let mode = 'poser', enMain = null, occupe = false, regard = 'down', done;
    const fini = new Promise((r) => { done = r; });
    if (g.hud?.root) g.hud.root.style.visibility = 'hidden';
    const bar = el('div', 'chantier');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'edit-cursor');
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon'); svg.appendChild(poly);
    ui.root.appendChild(bar); ui.root.appendChild(svg);
    const nomEnMain = () => (enMain.coller ? `Salle ${enMain.k + 1} de « ${ile.plans[enMain.pi].nom} »` : enMain.fixe ? FIXES[enMain.fixe].nom : ARTICLE[enMain.a].nom);
    const stockTxt = (a) => (a.stock && sorte === 'ile' ? ` · ${enStock(ile, a.id)} en stock` : '');
    const majBar = (msg) => {
      const quoi = mode === 'ranger' ? '🧹 <b>Ranger</b> <small>clique sur un objet pour le reprendre</small>'
        : enMain?.coller ? `📋 <b>${esc(nomEnMain())}</b> <small>choisis où la coller (coin en haut à gauche)</small>`
          : mode === 'deplacer' ? (enMain ? `✋ <b>${esc(nomEnMain())}</b> <small>choisis sa nouvelle place</small>` : '✋ <b>Déplacer</b> <small>choisis ce que tu veux déplacer</small>')
            : `🔨 <b>${esc(art.nom)}</b> <small>${esc(art.cat)}${esc(stockTxt(art))}</small>`;
      const aRegard = (enMain && !enMain.coller && !enMain.fixe ? ARTICLE[enMain.a] : mode === 'poser' ? art : null)?.dir;
      const titre = sorte === 'salle' ? `<div class="ch-argent">${esc(ile.plans[g.mapObj.salle.pi].nom)} · salle ${g.mapObj.salle.k + 1}</div>` : sorte === 'ile' ? `<div class="ch-argent">${ile.points} points d'usine</div>` : '';
      bar.innerHTML = `<div class="ch-art">${quoi}</div>${msg ? `<div class="ch-argent">${esc(msg)}</div>` : titre}
        <div class="ch-btns"><button type="button" data-c>📖 Catalogue</button>${aRegard ? `<button type="button" data-o>↻ Regard ${FLECHE[regard]}</button>` : ''}<button type="button" data-d class="${mode === 'deplacer' ? 'on' : ''}">✋ Déplacer</button><button type="button" data-r class="${mode === 'ranger' ? 'on' : ''}">🧹 Ranger</button><button type="button" data-f>✔ Terminer</button></div>
        <div class="ch-aide">Flèches : se déplacer · Entrée ou clic : poser · Échap : catalogue${aRegard ? ' · R : tourner le regard' : ''}</div>`;
      bar.querySelector('[data-c]').onclick = (e) => { e.stopPropagation(); if (!occupe) { occupe = true; catalogue().finally(() => { occupe = false; }); } };
      const o = bar.querySelector('[data-o]'); if (o) o.onclick = (e) => { e.stopPropagation(); regard = TOURNE[regard]; majBar(); };
      bar.querySelector('[data-d]').onclick = (e) => { e.stopPropagation(); if (enMain) return; mode = mode === 'deplacer' ? 'poser' : 'deplacer'; majBar(); };
      bar.querySelector('[data-r]').onclick = (e) => { e.stopPropagation(); if (enMain) return; mode = mode === 'ranger' ? 'poser' : 'ranger'; majBar(); };
      bar.querySelector('[data-f]').onclick = (e) => { e.stopPropagation(); fermer(); };
    };
    majBar();
    const cv = g.view.renderer.domElement, ray = new THREE.Raycaster(), plan = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const essai = () => {
      if (enMain?.coller) return null;
      const t = enMain ? { ...enMain, x: p.x, y: p.y } : { a: art.id, x: p.x, y: p.y };
      if (!t.fixe && ARTICLE[t.a]?.dir) t.dir = regard;
      return t;
    };
    const itemsColles = () => ile.plans[enMain.pi].salles[enMain.k];
    const cadre = () => {
      const cam = g.view.camera, r = cv.getBoundingClientRect();
      const pt = (x, z) => { const v = new THREE.Vector3(x, 0, z).project(cam); return `${r.left + (v.x + 1) / 2 * r.width},${r.top + (1 - v.y) / 2 * r.height}`; };
      if (enMain?.coller) {
        poly.setAttribute('points', [pt(p.x, p.y), pt(p.x + SALLE_W, p.y), pt(p.x + SALLE_W, p.y + SALLE_H), pt(p.x, p.y + SALLE_H)].join(' '));
        if (!cadre.k || cadre.k !== p.x + ',' + p.y) { cadre.k = p.x + ',' + p.y; cadre.ok = collable(ile, itemsColles(), p.x, p.y).ok; }
        poly.setAttribute('class', cadre.ok ? '' : 'non');
        return;
      }
      const a = enMain ? (enMain.fixe ? FIXES[enMain.fixe] : ARTICLE[enMain.a]) : mode === 'poser' ? art : null;
      const c = a ? emprise(a, p.x, p.y) : [[p.x, p.y]], xs = c.map((q) => q[0]), ys = c.map((q) => q[1]);
      const [x0, y0, x1, y1] = [Math.min(...xs), Math.min(...ys), Math.max(...xs) + 1, Math.max(...ys) + 1];
      poly.setAttribute('points', [pt(x0, y0), pt(x1, y0), pt(x1, y1), pt(x0, y1)].join(' '));
      poly.setAttribute('class', !a ? 'ret' : pose(essai()).ok && (!a.tr || debloques(ile, g.state).includes(a.tr)) ? '' : 'non');
    };
    let raf = requestAnimationFrame(function f() { cadre(); raf = requestAnimationFrame(f); });
    const changer = () => { this.sauver(); this.refaire(); g.busy = true; cadre.k = null; };

    const agir = async () => {
      if (enMain?.coller) {
        const items = itemsColles(), r = collable(ile, items, p.x, p.y);
        if (!r.ok) { g.sound.sfx('bump'); majBar(r.why); return; }
        coller(ile, items, p.x, p.y); const n = items.length; enMain = null; mode = 'poser';
        g.sound.sfx('levelup'); changer(); majBar(`Salle collée : ${n} objet${n > 1 ? 's' : ''} posé${n > 1 ? 's' : ''}.`); return;
      }
      if (mode === 'ranger') {
        const i = articleEn(ile, p.x, p.y, zone);
        if (i < 0) { g.sound.sfx('bump'); majBar(sorte === 'ile' && fixeEn(ile, p.x, p.y) ? 'La maison, la mairie et le musée se déplacent mais ne se rangent pas.' : 'Rien à ranger ici.'); return; }
        const t = reprendre(ile, i, zone); g.sound.sfx('cancel'); changer(); majBar(`${ARTICLE[t.a].nom} : rangé${ARTICLE[t.a].stock && sorte === 'ile' ? ' (de retour dans le stock)' : ''}.`); return;
      }
      if (mode === 'deplacer' && !enMain) {
        const fixe = sorte === 'ile' ? fixeEn(ile, p.x, p.y) : null, i = fixe ? -1 : articleEn(ile, p.x, p.y, zone);
        if (fixe) { enMain = { fixe, depuis: [...ile.fixes[fixe]] }; ile.cache = fixe; }
        else if (i >= 0) { const t = reprendre(ile, i, zone); enMain = { ...t, depuis: t }; if (t.dir) regard = t.dir; }
        else { g.sound.sfx('bump'); majBar('Rien à déplacer ici.'); return; }
        g.sound.sfx('select'); changer(); majBar(); return;
      }
      const trav = essai(), a = trav.fixe ? FIXES[trav.fixe] : ARTICLE[trav.a];
      if (a.tr && !debloques(ile, g.state).includes(a.tr)) { g.sound.sfx('bump'); majBar('Ce trophée n\'est pas encore débloqué.'); return; }
      const r = pose(trav);
      if (!r.ok) { g.sound.sfx('bump'); majBar(r.why); return; }
      if (trav.fixe) { ile.fixes[trav.fixe] = [p.x, p.y]; delete ile.cache; enMain = null; }
      else {
        if (a.s && !trav.texte) { occupe = true; trav.texte = (await ui.nameEntry('Texte du panneau', ile.nom.toUpperCase())) || 'PANNEAU'; occupe = false; }
        const { depuis, ...t } = trav; poser(ile, t, zone); enMain = null;
      }
      g.sound.sfx(a.b || a.kind ? 'levelup' : 'select'); changer(); majBar();
    };
    const catalogue = async () => {
      if (enMain) { majBar(enMain.coller ? 'Colle d\'abord la salle, ou range-la avec Terminer.' : 'Pose d\'abord ce que tu as en main.'); return; }
      const ok = new Set(debloques(ile, g.state));
      const cats = [...new Set(CATALOGUE.filter(visible).map((c) => c.cat))];
      const extra = [{ label: '✋ Déplacer un objet' }, { label: '🧹 Ranger un objet' }];
      const plans = sorte === 'ile' ? ile.plans.filter((q) => q.salles.some((s) => s.length)) : [];
      if (plans.length) extra.push({ label: '📋 Coller une salle d\'entraînement' });
      extra.push({ label: '✔ Terminer' });
      const c = await ui.list({ title: 'Catalogue', items: cats.map((k) => ({ label: k })).concat(extra), cls: 'shop', cancel: -1 });
      if (c < 0) return;
      const ex = extra[c - cats.length]?.label;
      if (ex?.startsWith('✋')) { mode = 'deplacer'; majBar(); return; }
      if (ex?.startsWith('🧹')) { mode = 'ranger'; majBar(); return; }
      if (ex?.startsWith('✔')) { fermer(); return; }
      if (ex?.startsWith('📋')) { await choisirSalle(); return; }
      const L2 = CATALOGUE.filter((a) => a.cat === cats[c] && visible(a));
      const etat = (a) => (a.tr ? (!ok.has(a.tr) ? '🔒' : trophePlace(ile, a.tr) ? { ile: 'sur l\'île', musee: 'au musée' }[trophePlace(ile, a.tr)] : 'à poser') : a.stock && sorte === 'ile' ? `× ${enStock(ile, a.id)}` : a.unique && ile.travaux.some((t) => t.a === a.id) ? 'posé' : '');
      const i = await ui.list({ title: cats[c], items: L2.map((a) => ({ label: (a.tr && !ok.has(a.tr) ? '🔒 ' : '') + a.nom, right: etat(a) })), cls: 'shop', cancel: -1 });
      if (i < 0) return;
      const a = L2[i];
      if (a.tr && !ok.has(a.tr)) { const t = TROPHEE[a.tr]; await ui.say(t.badge != null ? `Elle se débloque avec le badge n°${t.badge + 1}.` : 'Elle se débloque en finissant ce donjon du labo.'); return; }
      art = a; mode = 'poser'; majBar(a.stock && sorte === 'ile' && !enStock(ile, a.id) ? (a.garde ? 'Aucun en stock : engage-le à la caserne.' : 'Aucun en stock : il s\'achète à l\'usine à pièges.') : null);
    };
    const choisirSalle = async () => {
      const plans = ile.plans.map((q, pi) => [q, pi]).filter(([q]) => q.salles.some((s) => s.length));
      const j = await ui.list({ title: 'Quel parcours ?', items: plans.map(([q]) => ({ label: q.nom, right: `${q.salles.length} salle${q.salles.length > 1 ? 's' : ''}` })), cls: 'shop', cancel: -1 });
      if (j < 0) return;
      const [q, pi] = plans[j];
      const k = q.salles.length === 1 ? 0 : await ui.list({ title: 'Quelle salle ?', items: q.salles.map((s, kk) => ({ label: `Salle ${kk + 1}`, right: `${s.length} objet${s.length > 1 ? 's' : ''}`, disabled: !s.length })), cls: 'shop', cancel: -1 });
      if (k < 0) return;
      const manque = Object.entries(besoins(q.salles[k])).filter(([id, n]) => enStock(ile, id) < n);
      enMain = { coller: true, pi, k }; mode = 'poser'; cadre.k = null;
      majBar(manque.length ? 'Attention, il te manque : ' + manque.map(([id, n]) => `${n - enStock(ile, id)} × ${ARTICLE[id].nom}`).join(', ') + '.' : null);
    };
    const pop = g.input.push((k) => {
      if (occupe) return;
      const dd = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[k];
      const m0 = g.mapObj;
      if (dd) { p.x = Math.max(1, Math.min(m0.w - 2, p.x + dd[0])); p.y = Math.max(1, Math.min(m0.h - 2, p.y + dd[1])); p.dir = k; return; }
      if (k === 'a') { occupe = true; agir().finally(() => { occupe = false; }); }
      else if (k === 'b') { occupe = true; catalogue().finally(() => { occupe = false; }); }
      else if (k === 'autorun') { regard = TOURNE[regard]; majBar(); }
    });
    const clic = (e) => {
      if (occupe || e.target !== cv) return;
      const r = cv.getBoundingClientRect(), ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      g.view.camera.updateMatrixWorld(); ray.setFromCamera(ndc, g.view.camera);
      const q = new THREE.Vector3(); if (!ray.ray.intersectPlane(plan, q)) return;
      const x = Math.floor(q.x), y = Math.floor(q.z); if (!g.mapObj.in(x, y)) return;
      p.x = x; p.y = y; occupe = true; agir().finally(() => { occupe = false; });
    };
    cv.addEventListener('pointerdown', clic);
    const fermer = () => {
      // ce qui est encore en main retourne à sa place
      if (enMain && !enMain.coller) { if (enMain.fixe) { ile.fixes[enMain.fixe] = enMain.depuis; delete ile.cache; } else { poser(ile, { ...enMain.depuis }, zone); } }
      enMain = null;
      pop(); cancelAnimationFrame(raf); cv.removeEventListener('pointerdown', clic); bar.remove(); svg.remove();
      if (g.hud?.root) g.hud.root.style.visibility = '';
      this.edition = false; this.sauver(); this.refaire();
      // on se pose sur une case praticable, au plus près
      const m = g.mapObj;
      if (!LIBRE.has(m.get(p.x, p.y)) || g.npcs.some((n) => n.x === p.x && n.y === p.y)) {
        let best = null;
        for (let r = 1; r < 25 && !best; r++) for (let dy = -r; dy <= r && !best; dy++) for (let dx = -r; dx <= r; dx++) {
          const x = p.x + dx, y = p.y + dy; if (LIBRE.has(m.get(x, y)) && !m.warpAt(x, y) && !g.npcs.some((n) => n.x === x && n.y === y)) { best = [x, y]; break; }
        }
        [p.x, p.y] = best || [depart.x, depart.y];
      }
      g.busy = false; g.hud?.update(true);
      done();
    };
    await fini;
  }
}
