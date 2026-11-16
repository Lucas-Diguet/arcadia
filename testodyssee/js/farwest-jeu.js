// testodyssee/js/farwest-jeu.js — le stand de tir de Poussière-Ville (farwest.js) dans le jeu du labo : la touche de tir
// (choisie par chacun en arrivant, gardée dans le navigateur), les balles qui filent droit devant, les cibles qui
// tombent, l'épreuve chronométrée du shérif et son record.
import { DIRS } from '../../odyssee/js/world/tiles.js';
import { el } from '../../odyssee/js/ui/ui.js';
import { FARWEST, CIBLES, trajet } from './farwest.js';

const TOUCHE = 'testodyssee:farwest:touche', RECORD = 'testodyssee:farwest:record';
const VITESSE = 22, CADENCE = 0.3, RELEVE = 3;   // cases par seconde, secondes entre deux tirs, une cible retombée se relève (hors épreuve)
const ACTION = new Set(['KeyF', 'Space', 'Enter', 'NumpadEnter', 'KeyE', 'KeyK']);   // touches qui servent aussi à parler
const cle = (x, y) => x + ',' + y;
const lire = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const ecrire = (k, v) => { try { localStorage.setItem(k, v); } catch { /* navigation privée */ } };
const nomTouche = (code) => (code ? code.replace(/^Key/, '').replace(/^Digit/, '').replace('Space', 'Espace').replace('Enter', 'Entrée').replace('ShiftLeft', 'Maj gauche').replace('ShiftRight', 'Maj droite').replace('ControlLeft', 'Ctrl gauche') : '?');
const temps = (ms) => (ms / 1000).toFixed(2) + ' s';

export class FarWest {
  constructor(game) {
    this.game = game; this.balles = []; this.n = 0; this.attente = 0; this.tombees = new Map(); this.epreuve = null;
    addEventListener('keydown', (ev) => this.touche(ev), true);
  }
  ici() { return this.game.mapObj?.id === FARWEST && this.game.state ? this.game.mapObj : null; }
  get code() { return lire(TOUCHE); }
  /** une touche : si c'est celle du tir, on tire (sauf si elle sert aussi à parler et qu'il y a quelqu'un devant) */
  touche(ev) {
    const g = this.game, m = this.ici();
    if (!m || ev.repeat || ev.code !== this.code || this.choix) return;
    if (ev.target?.closest?.('input, textarea, [contenteditable]')) return;
    if (g.busy || g.bv?.alive || g.player.surf) return;
    const p = g.player, [dx, dy] = DIRS[p.dir], fx = p.x + dx, fy = p.y + dy;
    const devant = g.npcs.some((n) => n.x === fx && n.y === fy) || m.objectAt(fx, fy) || m.signs.has(cle(fx, fy));
    if (ACTION.has(ev.code) && devant) return;
    ev.preventDefault(); ev.stopImmediatePropagation();
    this.tirer();
  }
  tirer() {
    const g = this.game, m = this.ici(), p = g.player;
    if (this.attente > 0) return;
    this.attente = CADENCE;
    const debout = new Set(CIBLES.filter(([x, y]) => !this.tombees.has(cle(x, y))).map(([x, y]) => cle(x, y)));
    const t = trajet(m, p.x, p.y, DIRS[p.dir], debout);
    const id = 'balle:' + (++this.n);
    this.balles.push({ id, x0: p.x, y0: p.y, d: DIRS[p.dir], fin: t.cases.length, t: 0, touche: t.touche });
    if (this.epreuve) this.epreuve.tirs++;
    g.sound.sfx('bump');
  }
  imageBalle() {
    if (this.img) return this.img;
    const c = document.createElement('canvas'); c.width = c.height = 6;
    const x = c.getContext('2d'); x.fillStyle = '#3a2a10'; x.fillRect(1, 1, 4, 4); x.fillStyle = '#f0c040'; x.fillRect(2, 1, 2, 3); x.fillStyle = '#fff4c0'; x.fillRect(2, 1, 1, 1);
    return (this.img = c);
  }
  /** à chaque image : les balles avancent, les cibles tombent (et se relèvent hors épreuve), le choix de la touche */
  tick(dt) {
    const g = this.game, m = this.ici(), v = g.view;
    if (!m) { if (this.hud) this.hud.style.display = 'none'; if (this.balles.length) { for (const b of this.balles) if (v.actors.has(b.id)) v.removeActor(b.id); this.balles = []; } return; }
    if (!this.code && !this.choix && !g.busy) this.choisirTouche();
    this.attente = Math.max(0, this.attente - dt);
    for (const b of [...this.balles]) {
      b.t += dt * VITESSE;
      const k = Math.min(b.t, b.fin), a = v.imageActor(b.id, this.imageBalle(), 1);
      v.place(a, b.x0 + b.d[0] * k, b.y0 + b.d[1] * k - 0.1, 0.45);
      if (b.t >= b.fin) {
        v.removeActor(b.id); this.balles = this.balles.filter((q) => q !== b);
        if (b.touche) this.abattre(...b.touche);
      }
    }
    // hors épreuve, les cibles tombées se relèvent
    if (!this.epreuve) for (const [k, t] of [...this.tombees]) if (performance.now() - t > RELEVE * 1000) { this.tombees.delete(k); this.dessinerCible(...k.split(',').map(Number)); }
    // le chrono de l'épreuve, en haut de l'écran
    const E = this.epreuve, txt = E && !E.fini ? (E.attend ? 'Entre dans l\'enclos' : `${temps(performance.now() - E.t0)} · cibles ${this.tombees.size}/${CIBLES.length}`) : '';
    if (!this.hud) { this.hud = el('div', 'box'); this.hud.style.cssText = 'position:absolute;left:50%;top:10px;transform:translateX(-50%);z-index:30;padding:4px 12px;font-weight:600;pointer-events:none'; g.ui.root.appendChild(this.hud); }
    this.hud.style.display = txt ? '' : 'none'; if (txt && this.hud.textContent !== txt) this.hud.textContent = txt;
  }
  abattre(x, y) {
    const g = this.game, k = cle(x, y); if (this.tombees.has(k)) return;
    this.tombees.set(k, performance.now());
    g.sound.sfx('select');
    this.dessinerCible(x, y);
    if (this.epreuve && this.tombees.size === CIBLES.length) this.finEpreuve();
  }
  dessinerCible(x, y) {
    const g = this.game, m = g.world.maps[FARWEST], d = m.deco.find((q) => q.x === x && q.y === y && (q.k === 'cible' || q.k === 'cible_tombee'));
    if (!d) return;
    d.k = this.tombees.has(cle(x, y)) ? 'cible_tombee' : 'cible';
    if (g.mapObj === m) { g.view.decoAt.set(cle(x, y), d); g.view.rebuildAt(x, y); }
  }
  /** le choix de la touche de tir : la prochaine touche pressée (Échap : garder l'actuelle) */
  async choisirTouche() {
    const g = this.game, ui = g.ui;
    this.choix = true; g.busy = true;
    const box = el('div', 'box');
    box.style.cssText = 'position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);z-index:45;padding:14px 18px;text-align:center;max-width:420px';
    box.innerHTML = `<div style="font-weight:600;margin-bottom:6px">Touche de tir</div><div>Appuie sur la touche avec laquelle tu veux tirer.</div><div style="opacity:.75;font-size:13px;margin-top:6px">Actuelle : ${nomTouche(this.code) || 'aucune'} · Échap : garder celle-ci</div>`;
    ui.root.appendChild(box);
    await new Promise((res) => {
      const f = (ev) => {
        ev.preventDefault(); ev.stopImmediatePropagation();
        if (ev.code === 'Escape') { if (!this.code) ecrire(TOUCHE, 'Space'); }
        else if (/^Arrow/.test(ev.code)) return;   // les flèches servent à marcher
        else ecrire(TOUCHE, ev.code);
        removeEventListener('keydown', f, true); res();
      };
      addEventListener('keydown', f, true);
    });
    box.remove();
    g.busy = false; this.choix = false;
    ui.toast(`Tu tires avec : ${nomTouche(this.code)}`, 1800);
  }
  /** le shérif : l'épreuve chronométrée, ou changer de touche */
  async sherif() {
    const g = this.game, ui = g.ui, qui = { speaker: 'Shérif' }, rec = +lire(RECORD) || 0;
    await ui.say(['Salut, l\'étranger. Bienvenue au stand de tir de Poussière-Ville.', 'Dix cibles. Tu tires droit devant toi. Le chrono part dès que tu entres dans l\'enclos.'], qui);
    const r = await ui.ask(rec ? `Ton record : ${temps(rec)}. Alors ?` : 'Alors ?', ['Tenter l\'épreuve', `Changer de touche (${nomTouche(this.code)})`, 'Rien'], qui);
    if (r === 1) { await this.choisirTouche(); return; }
    if (r !== 0) return;
    // toutes les cibles se relèvent ; le chrono part à l'entrée de l'enclos
    this.tombees.clear(); for (const [x, y] of CIBLES) this.dessinerCible(x, y);
    this.epreuve = { t0: 0, tirs: 0, fini: false, attend: true };
    await ui.say('Entre dans l\'enclos quand tu es prêt.', qui);
  }
  /** après un pas : le chrono de l'épreuve part quand on entre dans l'enclos */
  apresPas() {
    const E = this.epreuve, p = this.game.player; if (!this.ici() || !E?.attend) return;
    if (p.y > 12) { E.attend = false; E.t0 = performance.now(); this.game.ui.toast('C\'est parti !', 1000); this.game.sound.sfx('bang'); }
  }
  async finEpreuve() {
    const g = this.game, E = this.epreuve; E.fini = true;
    const t = performance.now() - E.t0, rec = +lire(RECORD) || 0, nouveau = !rec || t < rec;
    if (nouveau) ecrire(RECORD, String(Math.round(t)));
    this.epreuve = null;
    g.busy = true;
    try { await g.ui.say([`Dix cibles en ${temps(t)}, avec ${E.tirs} balle${E.tirs > 1 ? 's' : ''}.`, nouveau ? 'Nouveau record !' : `Ton record reste ${temps(rec)}.`], { speaker: 'Shérif' }); } finally { g.busy = false; }
  }
}
