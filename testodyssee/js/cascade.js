// testodyssee/js/cascade.js — la capacité Cascade du labo : en surfant, on remonte une cascade (cases m.cascades),
// et on la descend. Sans Cascade, on ne fait que la descendre. Marche dans les donjons et sur les Routes Victoire.
import { DIRS } from '../../odyssee/js/world/tiles.js';
import { monName } from '../../odyssee/js/core/mon.js';

const k = (x, y) => `${x},${y}`;
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

/** avant un pas : true si la cascade s'occupe du pas (bloqué, montée ou descente) */
export function pasCascade(g, d) {
  const m = g.mapObj, C = m?.cascades, p = g.player;
  if (!C?.size || p.move || g.busy || !p.surf) return false;
  const [dx, dy] = DIRS[d], ici = C.has(k(p.x, p.y)), la = C.has(k(p.x + dx, p.y + dy));
  if (!ici && !la) return false;
  const bute = () => { p.dir = d; p.walking = false; if (p.bumpT <= 0) { g.sound.sfx('bump'); p.bumpT = 0.3; } return true; };
  if (d === 'left' || d === 'right') return bute();
  if (d === 'up' && !g.state.bag['cs-cascade']) { g.busy = true; g.ui.say('Une cascade dévale la paroi. Il faudrait la capacité Cascade pour la remonter.').finally(() => { g.busy = false; }); return bute(); }
  p.dir = d;
  g.busy = true;
  (async () => {
    try {
      if (d === 'up' && !ici) { const mon = g.fieldUser(); await g.ui.say(`${monName(mon)} utilise Cascade !`, { auto: 700 }); }
      // on suit la cascade jusqu'à l'eau calme, en haut ou en bas
      for (let n = 0; n < 40; n++) {
        const tx = p.x + dx, ty = p.y + dy;
        if (!C.has(k(tx, ty)) && !C.has(k(p.x, p.y))) break;
        if (!m.in(tx, ty) || g.occupied(tx, ty)) break;
        p.move = { fx: p.x, fy: p.y, tx, ty, t: 0, dur: d === 'up' ? 0.22 : 0.12, scripted: true }; p.walking = true;
        while (p.move) await attendre(16);
        if (!C.has(k(p.x, p.y))) break;
      }
      p.walking = false;
    } finally { g.busy = false; }
  })();
  return true;
}
