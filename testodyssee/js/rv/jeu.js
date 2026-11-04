// testodyssee/js/rv/jeu.js — les règles des Routes Victoire recopiées de la génération 3 : hauteurs (plateaux et ponts),
// cases fermées d'un côté, rochers qui tombent dans les trous, boutons qui ouvrent les barrières, maître des capacités.
import { T, DIRS } from '../../../odyssee/js/world/tiles.js';
import { MOVES } from '../../../odyssee/js/data/moves.js';
import { monName } from '../../../odyssee/js/core/mon.js';
import { partyScreen } from '../../../odyssee/js/ui/screens.js';
import { RV } from './donnees.js';

import { hauteur, changeNiveau, fermee, idCarte } from './routes.js';

const k = (x, y) => `${x},${y}`;

export class RoutesVictoire {
  constructor(g) { this.g = g; }
  ici() { return this.g.mapObj?.rv ? this.g.mapObj : null; }

  /** avant un pas : true si le pas est bloqué ou déjà joué (rocher poussé dans un trou) */
  avantPas(d) {
    const m = this.ici(); if (!m) return false;
    const g = this.g, p = g.player; if (p.move) return false;
    const [dx, dy] = DIRS[d], tx = p.x + dx, ty = p.y + dy, t = m.get(tx, ty);
    // la cascade : on la descend en surfant ; pour la remonter, il faudra Cascade (pas encore dans Odyssée)
    if (p.surf) {
      if (d !== 'down' && (m.rv.cascades.has(k(tx, ty)) || m.rv.cascades.has(k(p.x, p.y)))) { p.dir = d; if (p.bumpT <= 0) { g.sound.sfx('bump'); p.bumpT = 0.3; } return true; }
      return false;
    }
    if (t === T.BOULDER && (g.strengthOn === m.id || m.pushFree)) {
      const trou = m.rv.trous.find((q) => q.x === tx + dx && q.y === ty + dy);
      if (trou && !g.occupied(trou.x, trou.y)) { p.dir = d; this.tombe(m, tx, ty, trou); return true; }
    }
    const saut = (t === T.LEDGE && d === 'down') || (t === T.LEDGE_E && d === 'right') || (t === T.LEDGE_W && d === 'left');
    if (!saut && (fermee(m, p.x, p.y, d, tx, ty) || changeNiveau(p.z, hauteur(m, tx, ty)))) {
      p.dir = d; p.walking = false;
      if (p.bumpT <= 0) { g.sound.sfx('bump'); p.bumpT = 0.3; }
      return true;
    }
    return false;
  }
  /** après un pas : le joueur prend la hauteur de sa case, sauf sur un pont ou en le quittant (0 : il peut aller partout) */
  apresPas(mv) {
    const m = this.ici(); if (!m) return;
    const p = this.g.player, h = hauteur(m, p.x, p.y), avant = mv?.fx != null ? hauteur(m, mv.fx, mv.fy) : 0;
    if (h !== 15 && avant !== 15) p.z = h;
  }
  /** arrivée sur une carte : la hauteur donnée par l'échelle, sinon celle de la case */
  arrivee(to) {
    const p = this.g.player; p.z = to?.z ?? 0;
    const m = this.g.world.maps[to?.map]; if (!m?.rv) return;
    const h = hauteur(m, to.x, to.y); if (h !== 15 && to.z == null) p.z = h;
  }

  /** un rocher posé sur un bouton : la barrière tombe */
  rocherPose(x, y) {
    const m = this.ici(); if (!m) return;
    const b = m.rv.boutons.find((q) => q.x === x && q.y === y), st = this.g.state;
    if (!b || st.flags[`RVB:${m.id}:${k(x, y)}`]) return;
    st.flags[`RVB:${m.id}:${k(x, y)}`] = true;
    for (const [bx, by] of b.ouvre) this.g.setTile(bx, by, T.CAVE);
    this.g.sound.sfx('bang'); this.g.view.shake = 0.15;
  }
  /** le rocher tombe à l'étage du dessous, là où il apparaît dans le jeu d'origine */
  async tombe(m, x, y, trou) {
    const g = this.g, st = g.state;
    g.busy = true;
    try {
      g.setTile(x, y, T.CAVE); g.sound.sfx('ledge'); g.view.shake = 0.1;
      const dest = g.world.maps[trou.vers.includes(':') ? trou.vers : idCarte(m.rv.pre, trou.vers)];
      const E = RV[m.rv.route].etages.find((q) => q.id === trou.vers);
      const cache = E?.rochers.find((r) => r[2]);
      if (dest && cache) { st.tiles = st.tiles || {}; (st.tiles[dest.id] = st.tiles[dest.id] || {})[k(cache[0], cache[1])] = T.BOULDER; }
      await g.ui.say('Le rocher est tombé dans le trou !');
    } finally { g.busy = false; }
  }

  /** maître des capacités : apprend l'attaque à un Pokémon de l'équipe */
  async apprendre(cle) {
    const g = this.g, mv = Object.values(MOVES).find((q) => q.key === cle); if (!mv) return false;
    const i = await partyScreen(g, { mode: 'pick', prompt: `Apprendre ${mv.n} à quel Pokémon ?`, filter: (m) => (m.moves.some((x) => x.id === mv.id) ? 'Déjà appris' : null) });
    if (i < 0) return false;
    const m = g.state.party[i];
    if (m.moves.length < 4) { m.moves.push({ id: mv.id, pp: mv.pp }); g.sound.sfx('learn'); await g.ui.say(`${monName(m)} apprend ${mv.n} !`); }
    else await g.askLearn(m, mv.id);
    return m.moves.some((x) => x.id === mv.id);
  }
}
