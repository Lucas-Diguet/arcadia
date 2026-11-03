// testodyssee/js/ile/jeu.js — l'île privée dans le labo : chargement et sauvegarde (dans ce navigateur, sous le nom du
// joueur), la carte reconstruite à chaque changement, la mairie (l'adjoint), le musée (ses socles), le capitaine du
// ponton, les statues des trophées, et le mode construction (on survole l'île et on pose case par case).
import * as THREE from 'three';
import { T } from '../../../odyssee/js/world/tiles.js';
import { el, esc } from '../../../odyssee/js/ui/ui.js';
import {
  ILE, ARRIVEE, PONTON, CLE_STOCKAGE, FIXES, TROPHEES, TROPHEE, CATALOGUE, ARTICLE, nouvelleIle, etatIle, debloques,
  trophePlace, posable, poser, articleEn, fixeEn, construire, SOCLES,
} from './modele.js';

export { ILE, ARRIVEE };
const LIBRE = new Set([T.GRASS, T.PATH, T.PAVE, T.SAND, T.FLOWER, T.TALL, T.BRIDGE]);

export class Ile {
  constructor(game) { this.game = game; this.ile = null; this.pour = null; }

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

  /** reconstruit l'île et ses intérieurs (au premier passage, et après chaque changement) */
  preparer() {
    const g = this.game, ile = this.donnee(), maps = g.world.maps;
    const m = construire(maps, ile);
    m.sign(ARRIVEE[0] - 2, ARRIVEE[1], `${ile.nom.toUpperCase()}\nTon île privée. Personne d'autre ne peut y venir... pour l'instant.\nL'adjointe de la mairie t'explique comment la construire.`);
    m.npc({ id: 'ile:capitaine', x: PONTON[0], y: PONTON[1], dir: 'up', sprite: 'capitaine', move: 'static', talk: () => this.capitaine() });
    const mairie = maps[`${ILE}:mairie`];
    const adj = mairie.npcs.find((n) => n.id === 'ile:adjoint'); if (adj) { delete adj.script; adj.talk = () => this.adjointe(); }
    const musee = maps[`${ILE}:musee`];
    for (const [i] of SOCLES.entries()) { const [x, y] = SOCLES[i]; musee.object(x, y, { use: () => this.socle(i) }); }
    musee.sign(7, 9, 'MUSÉE DE L\'ÎLE\nLes trophées de tes aventures. Approche-toi d\'un socle pour y exposer une statue.');
    this.statues = m.statues;
    return m;
  }
  /** redessine la carte où l'on est, sans bouger le joueur */
  refaire() {
    const g = this.game, p = g.player, q = { x: p.x, y: p.y, dir: p.dir }, busy = g.busy, id = g.mapObj.id;
    this.preparer();
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
      await ui.say(['Bienvenue sur ton île ! Je suis l\'adjointe de la mairie.', 'Ici, tout est à toi : tu poses ce que tu veux, case par case, depuis le mode construction (le menu, ou moi).', 'Tes aventures te rapporteront des trophées : une statue par arène et par donjon. Tu peux les poser dehors ou les exposer au musée.', 'Pour l\'instant, tout est gratuit. Profites-en !'], sp);
    }
    for (;;) {
      const n = debloques(ile, g.state).length;
      const k = await ui.list({ title: ile.nom, items: [{ label: 'Mode construction' }, { label: 'Mes trophées', right: `${n}/${TROPHEES.length}` }, { label: 'Renommer l\'île' }, { label: 'Remettre l\'île à zéro' }, { label: 'Au revoir' }], cls: 'shop', cancel: 4 });
      if (k === 0) {
        const f = FIXES.mairie, [x, y] = ile.fixes.mairie;
        await g.warp({ map: ILE, x: x + 2, y: y + f.taille[1], dir: 'down' }, 'exit');
        await this.construction();
        return;
      }
      if (k === 1) await this.listeTrophees();
      else if (k === 2) { const nom = await ui.nameEntry('Nom de ton île', ile.nom); if (nom) { ile.nom = nom.slice(0, 24); this.sauver(); this.refaire(); } }
      else if (k === 3) {
        if (!(await ui.yesNo('Tout effacer et retrouver l\'île du premier jour ? Les trophées débloqués restent.'))) continue;
        const neuve = nouvelleIle(ile.nom); neuve.donjons = ile.donjons; neuve.vuAdjointe = true; this.ile = neuve; this.sauver(); this.refaire();
        await ui.say('C\'est fait : ton île est comme au premier jour.', sp);
      } else return;
    }
  }
  async listeTrophees() {
    const g = this.game, ile = this.donnee(), ok = new Set(debloques(ile, g.state));
    const items = TROPHEES.map((t) => ({ label: `${ok.has(t.id) ? '✔' : '·'} ${t.nom}`, right: !ok.has(t.id) ? (t.badge != null ? `badge ${t.badge + 1}` : 'donjon à finir') : { ile: 'sur l\'île', musee: 'au musée' }[trophePlace(ile, t.id)] || 'à poser' }));
    await g.ui.list({ title: `Trophées · ${ok.size}/${TROPHEES.length}`, items: items.concat([{ label: 'Fermer' }]), cls: 'shop', cancel: items.length });
  }
  async socle(i) {
    const g = this.game, ui = g.ui, ile = this.donnee(), ici = TROPHEE[ile.musee[i]];
    if (ici) {
      await ui.say(`${ici.nom}.`);
      if (await ui.yesNo('La ranger ? Elle restera dans tes trophées.')) { delete ile.musee[i]; this.sauver(); this.refaire(); }
      return;
    }
    const libres = debloques(ile, g.state).filter((id) => !trophePlace(ile, id));
    if (!libres.length) { await ui.say('Un socle vide. Tu n\'as pas de trophée à y exposer : finis une arène ou un donjon, ou range une statue de l\'île.'); return; }
    const k = await ui.list({ title: 'Exposer quel trophée ?', items: libres.map((id) => ({ label: TROPHEE[id].nom })).concat([{ label: 'Retour' }]), cls: 'shop', cancel: libres.length });
    if (k < 0 || k >= libres.length) return;
    ile.musee[i] = libres[k]; this.sauver(); g.sound.sfx('levelup'); this.refaire();
  }

  /* ---------------- à chaque image : les statues ---------------- */
  tick() {
    const g = this.game, D = g.donjons; if (!D || !this.statues || !this.dedans()) return;
    D.imgStatues ||= {};
    for (const s of this.statues) if (s.carte === g.mapObj.id) D.statue(g, `ile:${s.x},${s.y}`, s.sp, s.x, s.y, s.grand ? 0.6 : 0.45);
  }

  /* ---------------- le mode construction ---------------- */
  async construction() {
    const g = this.game, ui = g.ui; if (!this.sur()) { await ui.say('Le mode construction ne marche que dehors, sur ton île.'); return; }
    const ile = this.donnee(), p = g.player, depart = { x: p.x, y: p.y };
    g.busy = true;
    let art = ARTICLE.arbre, mode = 'poser', enMain = null, occupe = false, done;
    const fini = new Promise((r) => { done = r; });
    if (g.hud?.root) g.hud.root.style.visibility = 'hidden';
    const bar = el('div', 'chantier');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'edit-cursor');
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon'); svg.appendChild(poly);
    ui.root.appendChild(bar); ui.root.appendChild(svg);
    const nomEnMain = () => (enMain.fixe ? FIXES[enMain.fixe].nom : ARTICLE[enMain.a].nom);
    const majBar = (msg) => {
      const quoi = mode === 'ranger' ? '🧹 <b>Ranger</b> <small>clique sur un objet pour le reprendre</small>'
        : mode === 'deplacer' ? (enMain ? `✋ <b>${esc(nomEnMain())}</b> <small>choisis sa nouvelle place</small>` : '✋ <b>Déplacer</b> <small>choisis ce que tu veux déplacer</small>')
          : `🔨 <b>${esc(art.nom)}</b> <small>${esc(art.cat)}</small>`;
      bar.innerHTML = `<div class="ch-art">${quoi}</div>${msg ? `<div class="ch-argent">${esc(msg)}</div>` : ''}
        <div class="ch-btns"><button type="button" data-c>📖 Catalogue</button><button type="button" data-d class="${mode === 'deplacer' ? 'on' : ''}">✋ Déplacer</button><button type="button" data-r class="${mode === 'ranger' ? 'on' : ''}">🧹 Ranger</button><button type="button" data-f>✔ Terminer</button></div>
        <div class="ch-aide">Flèches : se déplacer · Entrée ou clic : poser · Échap : catalogue</div>`;
      bar.querySelector('[data-c]').onclick = (e) => { e.stopPropagation(); if (!occupe) { occupe = true; catalogue().finally(() => { occupe = false; }); } };
      bar.querySelector('[data-d]').onclick = (e) => { e.stopPropagation(); if (enMain) return; mode = mode === 'deplacer' ? 'poser' : 'deplacer'; majBar(); };
      bar.querySelector('[data-r]').onclick = (e) => { e.stopPropagation(); if (enMain) return; mode = mode === 'ranger' ? 'poser' : 'ranger'; majBar(); };
      bar.querySelector('[data-f]').onclick = (e) => { e.stopPropagation(); fermer(); };
    };
    majBar();
    const cv = g.view.renderer.domElement, ray = new THREE.Raycaster(), plan = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const essai = () => (enMain ? { ...enMain, x: p.x, y: p.y } : { a: art.id, x: p.x, y: p.y });
    const cadre = () => {
      const cam = g.view.camera, r = cv.getBoundingClientRect();
      const pt = (x, z) => { const v = new THREE.Vector3(x, 0, z).project(cam); return `${r.left + (v.x + 1) / 2 * r.width},${r.top + (1 - v.y) / 2 * r.height}`; };
      const a = enMain ? (enMain.fixe ? FIXES[enMain.fixe] : ARTICLE[enMain.a]) : mode === 'poser' ? art : null;
      const [w, h] = a && (a.b || a.kind) ? [a.taille[0], a.taille[1] + 1] : [1, 1];
      poly.setAttribute('points', [pt(p.x, p.y), pt(p.x + w, p.y), pt(p.x + w, p.y + h), pt(p.x, p.y + h)].join(' '));
      poly.setAttribute('class', !a ? 'ret' : posable(ile, essai()).ok && (!a.tr || debloques(ile, g.state).includes(a.tr)) ? '' : 'non');
    };
    let raf = requestAnimationFrame(function f() { cadre(); raf = requestAnimationFrame(f); });
    const changer = () => { this.sauver(); this.refaire(); g.busy = true; };

    const agir = async () => {
      if (mode === 'ranger') {
        const i = articleEn(ile, p.x, p.y);
        if (i < 0) { g.sound.sfx('bump'); majBar(fixeEn(ile, p.x, p.y) ? 'La maison, la mairie et le musée se déplacent mais ne se rangent pas.' : 'Rien à ranger ici.'); return; }
        const [t] = ile.travaux.splice(i, 1); g.sound.sfx('cancel'); changer(); majBar(`${ARTICLE[t.a].nom} : rangé.`); return;
      }
      if (mode === 'deplacer' && !enMain) {
        const fixe = fixeEn(ile, p.x, p.y), i = fixe ? -1 : articleEn(ile, p.x, p.y);
        if (fixe) { enMain = { fixe, depuis: [...ile.fixes[fixe]] }; ile.cache = fixe; }
        else if (i >= 0) { const [t] = ile.travaux.splice(i, 1); enMain = { ...t, depuis: t }; }
        else { g.sound.sfx('bump'); majBar('Rien à déplacer ici.'); return; }
        g.sound.sfx('select'); changer(); majBar(); return;
      }
      const trav = essai(), a = trav.fixe ? FIXES[trav.fixe] : ARTICLE[trav.a];
      if (a.tr && !debloques(ile, g.state).includes(a.tr)) { g.sound.sfx('bump'); majBar('Ce trophée n\'est pas encore débloqué.'); return; }
      const r = posable(ile, trav);
      if (!r.ok) { g.sound.sfx('bump'); majBar(r.why); return; }
      if (trav.fixe) { ile.fixes[trav.fixe] = [p.x, p.y]; delete ile.cache; enMain = null; }
      else {
        if (a.s && !trav.texte) { occupe = true; trav.texte = (await ui.nameEntry('Texte du panneau', ile.nom.toUpperCase())) || 'PANNEAU'; occupe = false; }
        const { depuis, ...t } = trav; poser(ile, t); enMain = null;
      }
      g.sound.sfx(a.b || a.kind ? 'levelup' : 'select'); changer(); majBar();
    };
    const catalogue = async () => {
      if (enMain) { majBar('Pose d\'abord ce que tu as en main.'); return; }
      const ok = new Set(debloques(ile, g.state));
      const cats = [...new Set(CATALOGUE.map((c) => c.cat))];
      const c = await ui.list({ title: 'Catalogue', items: cats.map((k) => ({ label: k })).concat([{ label: '✋ Déplacer un objet' }, { label: '🧹 Ranger un objet' }, { label: '✔ Terminer' }]), cls: 'shop', cancel: -1 });
      if (c < 0) return;
      if (c === cats.length) { mode = 'deplacer'; majBar(); return; }
      if (c === cats.length + 1) { mode = 'ranger'; majBar(); return; }
      if (c === cats.length + 2) { fermer(); return; }
      const L = CATALOGUE.filter((a) => a.cat === cats[c]);
      const etat = (a) => (!a.tr ? '' : !ok.has(a.tr) ? '🔒' : trophePlace(ile, a.tr) ? { ile: 'sur l\'île', musee: 'au musée' }[trophePlace(ile, a.tr)] : 'à poser');
      const i = await ui.list({ title: cats[c], items: L.map((a) => ({ label: (a.tr && !ok.has(a.tr) ? '🔒 ' : '') + a.nom, right: etat(a) })), cls: 'shop', cancel: -1 });
      if (i < 0) return;
      const a = L[i];
      if (a.tr && !ok.has(a.tr)) { const t = TROPHEE[a.tr]; await ui.say(t.badge != null ? `Elle se débloque avec le badge n°${t.badge + 1}.` : 'Elle se débloque en finissant ce donjon du labo.'); return; }
      art = a; mode = 'poser'; majBar();
    };
    const pop = g.input.push((k) => {
      if (occupe) return;
      const dd = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[k];
      const m0 = g.mapObj;
      if (dd) { p.x = Math.max(1, Math.min(m0.w - 2, p.x + dd[0])); p.y = Math.max(1, Math.min(m0.h - 2, p.y + dd[1])); p.dir = k; return; }
      if (k === 'a') { occupe = true; agir().finally(() => { occupe = false; }); }
      else if (k === 'b') { occupe = true; catalogue().finally(() => { occupe = false; }); }
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
      if (enMain) { if (enMain.fixe) { ile.fixes[enMain.fixe] = enMain.depuis; delete ile.cache; } else { const { depuis, ...t } = enMain; ile.travaux.push({ ...depuis }); } enMain = null; this.sauver(); this.refaire(); }
      pop(); cancelAnimationFrame(raf); cv.removeEventListener('pointerdown', clic); bar.remove(); svg.remove();
      if (g.hud?.root) g.hud.root.style.visibility = '';
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
