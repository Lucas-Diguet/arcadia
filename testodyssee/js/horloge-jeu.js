// testodyssee/js/horloge-jeu.js — les règles de la Salle de l'Horloge (horloge.js) dans le jeu du labo : les pas
// (pas de changement de hauteur), les leviers, la vis, le joueur emporté par l'aiguille sur laquelle il se tient, le
// joueur monté à la hauteur de sa case, et le dessin (horloge-vue.js) à la place du sol et des murs de la carte.
import { DIRS } from '../../odyssee/js/world/tiles.js';
import { HORLOGE, NIV_MAX, C, LEVIERS, COFFRE, appliquer, caseHorloge, passage, casesAiguille, placeLevier, milieu } from './horloge.js';
import { creerHorloge, poserHorloge, ETAGE } from './horloge-vue.js';

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
const cle = (x, y) => x + ',' + y;

export class Horloge {
  constructor(game) {
    this.game = game;
    const v = game.view;
    // le joueur (et tout personnage) se tient à la hauteur de sa case
    const place = v.place.bind(v);
    v.place = (a, x, y, hop = 0, herbe = false) => {
      const h = this.ici() ? this.hauteur(Math.round(x), Math.round(y)) : 0;
      place(a, x, y, hop + h, herbe);
      if (h) a.shadow.position.y += h;
    };
    // la caméra suit le joueur à sa hauteur (sinon, tout en haut de la vis, il sortirait par le haut de l'écran)
    const update = v.update.bind(v);
    v.update = (dt, x, y, ...r) => { update(dt, x, y, ...r); if (this.ici() && y != null) { v.camera.position.y += this.hauteur(Math.round(x), Math.round(y)); v.camera.updateMatrixWorld(); } };
    // le sol et les murs de la carte ne se dessinent pas : seulement les volumes de l'horloge
    const render = v.render.bind(v);
    v.render = () => { if (this.ici()) for (const c of v.chunks?.values() || []) c.visible = false; render(); };
  }
  ici() { const m = this.game.mapObj; return m?.id === HORLOGE ? m : null; }
  get E() { return this.game.world.maps[HORLOGE]?.horloge; }
  /** hauteur affichée (unités du monde) de la case (x, y) */
  hauteur(x, y) {
    const c = caseHorloge(this.E, x, y); if (!c) return 0;
    return (c.quoi === 'pf' ? c.niv : (this.D || this.E).niv) * ETAGE;
  }
  /** avant un pas : pas de marche entre deux hauteurs ; true : le pas est refusé */
  avantPas(d) {
    const g = this.game, p = g.player, m = this.ici(); if (!m || p.move) return false;
    if (this.anim) return true;
    const [dx, dy] = DIRS[d], tx = p.x + dx, ty = p.y + dy;
    if (caseHorloge(this.E, tx, ty) && !passage(this.E, p.x, p.y, tx, ty)) {
      p.dir = d; p.walking = false;
      if (p.bumpT <= 0) { g.sound.sfx('bump'); p.bumpT = 0.3; g.ui.toast(caseHorloge(this.E, tx, ty).niv > caseHorloge(this.E, p.x, p.y).niv ? 'C\'est plus haut.' : 'C\'est plus bas.', 900); }
      return true;
    }
    return false;
  }
  /** à chaque image : l'horloge dessinée, les aiguilles qui tournent vers leur place */
  tick(dt) {
    const g = this.game, v = g.view, m = this.ici();
    if (!m || !v.root) return;
    if (!this.D) this.D = { ...this.E };
    if (this.vue?.root !== v.root) {
      const H = creerHorloge(); v.root.add(H.G); this.vue = { root: v.root, H };
      v.scene.background?.set?.('#07060a');
    }
    if (this.anim) {
      const A = this.anim; A.t = Math.min(1, A.t + dt / A.duree);
      const u = A.t < 0.5 ? 2 * A.t * A.t : 1 - (-2 * A.t + 2) ** 2 / 2;
      for (const k of ['grande', 'petite', 'niv']) this.D[k] = A.de[k] + (A.vers[k] - A.de[k]) * u;
      if (A.t >= 1) { this.anim = null; A.fin(); }
    }
    poserHorloge(this.vue.H, this.D);
    if (!this.vu && !g.busy) this.arrivee();
  }
  /** fait tourner (et monter) l'horloge jusqu'à l'état E2, en emportant le joueur qui se tient sur une aiguille */
  async bouger(E2, duree) {
    const g = this.game, p = g.player, m = this.ici(), E = this.E;
    const sous = caseHorloge(E, p.x, p.y);
    let place = null;
    if (sous && (sous.quoi === 'grande' || sous.quoi === 'petite') && E2[sous.quoi] !== E[sous.quoi]) {
      // sa distance au centre, gardée sur l'aiguille à sa nouvelle place
      const r = Math.hypot(p.x - C[0], p.y - C[1]), cases = [...casesAiguille(sous.quoi, E2[sous.quoi])].map((k) => k.split(',').map(Number));
      place = cases.sort((a, b) => Math.abs(Math.hypot(a[0] - C[0], a[1] - C[1]) - r) - Math.abs(Math.hypot(b[0] - C[0], b[1] - C[1]) - r))[0];
    }
    const de = { ...this.D }, vers = { ...E2 };
    // le chemin le plus court sur le cadran
    for (const k of ['grande', 'petite']) { let d = vers[k] - de[k]; while (d > 6) d -= 12; while (d < -6) d += 12; vers[k] = de[k] + d; }
    g.sound.sfx('door');
    await new Promise((fin) => { this.anim = { de, vers, t: 0, duree, fin }; });
    Object.assign(E, { grande: ((E2.grande % 12) + 12) % 12, petite: ((E2.petite % 12) + 12) % 12, niv: E2.niv });
    this.D = { ...E };
    appliquer(m, E);
    if (place) { p.x = place[0]; p.y = place[1]; g.view.update(0, p.x, p.y); }
  }
  /** E devant un levier, le mécanisme du pivot ou le coffre */
  async utiliser(x, y) {
    const g = this.game, ui = g.ui, m = this.ici(); if (!m || this.anim) return false;
    const L = LEVIERS.find((q) => { const [a, b] = placeLevier(q); return a === x && b === y; });
    const [cx, cy] = milieu(COFFRE.pf);
    if (!L && !(x === cx && y === cy)) return false;
    {
      if (!L) { await ui.say(['Un coffre doré, tout en haut de l\'horloge.', 'Bravo : tu as trouvé le chemin !']); return true; }
      const E = this.E;
      if (L.quoi === 'vis') {
        const r = await ui.ask(`${L.nom}. Les deux aiguilles sont au niveau ${E.niv} sur ${NIV_MAX}.\nFaire tourner la vis ?`, ['Monter (sens des aiguilles)', 'Descendre (sens inverse)', 'Ne rien faire']);
        if (r === 0 && E.niv >= NIV_MAX) await ui.say('La vis est en butée : les aiguilles ne montent pas plus haut.');
        else if (r === 1 && E.niv <= 0) await ui.say('La vis est en butée : les aiguilles ne descendent pas plus bas.');
        else if (r === 0 || r === 1) { const s = r === 0 ? 1 : -1; await this.bouger({ grande: E.grande + s, petite: E.petite + s, niv: E.niv + s }, 1.6); }
        return true;
      }
      const nom = L.quoi === 'grande' ? 'la grande aiguille' : 'la petite aiguille';
      const r = await ui.ask(`${L.nom}. Faire tourner ${nom} d'une heure ?`, ['Sens des aiguilles', 'Sens inverse', 'Ne rien faire']);
      if (r === 0 || r === 1) await this.bouger({ ...E, [L.quoi]: E[L.quoi] + (r === 0 ? 1 : -1) }, 1.1);
      return true;
    }
  }
  /** en arrivant dans la salle : où l'on est, et à quoi servent les leviers */
  async arrivee() {
    if (!this.ici() || this.vu) return;
    this.vu = true;
    const g = this.game; g.busy = true;
    await attendre(300);
    try { await g.ui.say(['Une horloge gigantesque, suspendue dans le vide. Ses aiguilles sont des passerelles.',
      'Sur le quai : le levier bleu fait tourner la petite aiguille, le rouge la grande.',
      'Au centre, le grand mécanisme fait tourner la vis : les deux aiguilles tournent ensemble et montent (ou descendent) d\'un niveau.',
      'On ne passe d\'une aiguille à une plateforme que s\'ils sont à la même hauteur. Le coffre est tout en haut, à midi.']); } finally { g.busy = false; }
  }
}

