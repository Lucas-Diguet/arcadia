// testodyssee/js/combat/vue.js — le combat à plusieurs vu par un joueur, dans l'écran de combat d'Odyssée.
//
// L'écran d'Odyssée sait jouer un combat dont les tours sont calculés ailleurs (combat entre joueurs : runPvp).
// On lui donne ici un « combat miroir » : chaque tour arrive de l'hôte (événements + photo de l'état), le miroir
// se met à jour, et les événements sont traduits du point de vue du joueur : son Pokémon est le camp 0, le boss
// le camp 1, et ce qui arrive à ses équipiers s'affiche dans un encadré à part.
import { createMon, monName } from '../../../odyssee/js/core/mon.js';
import { ASSETS } from '../../../odyssee/js/assets.js';
import { el, esc, wait } from '../../../odyssee/js/ui/ui.js';

const hpCol = (r) => (r > 0.5 ? '#48c848' : r > 0.2 ? '#f0c020' : '#e83030');

export class CombatMiroir {
  /**
   * @param o.moi     identifiant du joueur
   * @param o.party   son équipe (les objets de sa partie : le combat les met à jour)
   * @param o.intro   premier message de l'hôte { evs, photo }
   * @param o.boss    { cls, nom, bs }
   */
  constructor(o) {
    this.moi = String(o.moi); this.pvp = true; this.wild = false; this.raid = true;
    this.turn = 0; this.state = 'choose'; this.result = null; this.need = [false, true];
    this.file = []; this.attente = null;
    const b = o.intro.photo.boss, boss = createMon(b.sp, b.lvl, { shiny: false });
    this.sides = [
      { party: o.party, active: 0, v: {} },
      { party: [boss], active: 0, v: {}, trainer: { cls: o.boss.cls || '', name: o.boss.nom, bs: o.boss.bs } },
    ];
    this.intro = o.intro;
    this.photo(o.intro.photo);
  }
  get me() { return this.sides[0].party[this.sides[0].active]; }
  get foe() { return this.sides[1].party[0]; }
  act(i) { return this.sides[i].party[this.sides[i].active]; }
  usableMoves(i) { const m = this.act(i); return m.moves.map((x, k) => (x.pp > 0 ? k : -1)).filter((k) => k >= 0); }
  forcedAction(i) { return i === 0 && this.forced ? { type: 'move', idx: 0 } : null; }
  canSwitchTo(idx) { const m = this.sides[0].party[idx]; return m && m.hp > 0 && idx !== this.sides[0].active; }
  checksum() { return 0; }

  /** l'état envoyé par l'hôte devient celui du miroir */
  photo(p) {
    this.dernier = p;
    const b = p.boss, f = this.foe;
    f.stats[0] = b.max; f.hp = b.hp; f.status = b.status; f.nick = b.nick || null;
    const j = p.joueurs.find((q) => q.id === this.moi);
    if (j) {
      j.party.forEach((q, i) => { const m = this.sides[0].party[i]; if (!m) return; m.hp = q.hp; m.status = q.status; q.moves.forEach((x, k) => { if (m.moves[k]) m.moves[k].pp = x.pp; }); });
      this.sides[0].active = j.active; this.forced = !!j.forced;
      this.dehors = j.etat === 'dehors';
      this.need[0] = j.etat === 'remplacer';
    }
    this.turn = p.turn;
    if (p.state === 'over') { this.state = 'over'; this.result = p.result; }
    else if (this.dehors) { this.state = 'over'; this.result = 'out'; }
    else this.state = p.state === 'switch' ? 'switch' : 'choose';
    this.equipiers?.maj(p);
  }
  /** les événements du point de vue de ce joueur */
  traduire(evs) {
    const out = [];
    for (let k = 0; k < evs.length; k++) {
      const e = evs[k];
      if (e.t === 'end') { out.push(e); continue; }
      if (e.t === 'bloc' || e.t === 'out' || e.t === 'switch-prompt') { out.push({ ...e, t: 'raid-' + e.t }); continue; }
      if (e.side === 0 && e.own !== this.moi) {
        // ce qui arrive à un équipier : son encadré clignote, rien ne bouge sur notre Pokémon
        if (e.t === 'move') out.push({ t: 'move', side: 0, move: e.move, type: e.type });
        else out.push({ t: 'raid-equipier', own: e.own, k: e.t });
        continue;
      }
      // une attaque du boss sur un équipier : pas d'animation vers notre Pokémon
      if (e.t === 'move' && e.side === 1) {
        let cible = null;
        for (const q of evs.slice(k + 1)) { if (q.t === 'move') break; if ((q.t === 'hit' || q.t === 'hp') && q.side === 0) { cible = q.own; break; } }
        if (cible && cible !== this.moi) continue;
      }
      out.push(e);
    }
    return out;
  }
  start() { return this.traduire(this.intro.evs); }

  /* ---------------- échanges avec l'hôte ---------------- */
  recevoir(m) { if (this.attente) { const f = this.attente; this.attente = null; f(m); } else this.file.push(m); }
  prochain(ms = 600000) {
    if (this.file.length) return Promise.resolve(this.file.shift());
    return new Promise((res) => { const t = setTimeout(() => { this.attente = null; res({ timeout: true }); }, ms); this.attente = (m) => { clearTimeout(t); res(m); }; });
  }
  consommer() {
    const m = this.enCours; this.enCours = null;
    if (!m) return [];
    this.photo(m.photo);
    return this.traduire(m.evs);
  }
  playerAction() { return this.consommer(); }
  switchBoth() { return this.consommer(); }
  stop(result, texte) { this.state = 'over'; this.result = result; return [{ t: 'msg', text: texte }, { t: 'end', result }]; }

  /** objet attendu par runPvp pour échanger les choix */
  duel(envoyer) {
    const lire = async () => {
      const m = await this.prochain();
      // l'hôte ne répond plus : le combat s'arrête sans vainqueur
      if (m.timeout || m.parti) return { desync: true };
      this.enCours = m; return m;
    };
    return {
      foeName: 'tes équipiers',
      sendAct: (n, action) => envoyer({ type: action.type, idx: action.idx }),
      waitAct: async () => { const m = await lire(); return m.evs ? { action: {}, sum: 0 } : m; },
      sendSwitch: (n, idx) => { if (this.need[0]) envoyer({ type: 'switch', idx }); },
      waitSwitch: async () => { const m = await lire(); return m.evs ? { idx: 0 } : m; },
      sendQuit: () => envoyer({ type: 'forfeit' }),
    };
  }
}

/** encadré des équipiers, en haut à gauche de l'écran de combat */
export class Equipiers {
  constructor(root, moi) {
    this.moi = String(moi);
    this.el = el('div', 'raid-equipe'); root.appendChild(this.el);
  }
  maj(p) {
    const autres = p.joueurs.filter((j) => j.id !== this.moi);
    this.el.innerHTML = autres.map((j) => {
      const m = j.party[j.active], r = m ? Math.max(0, m.hp / m.max) : 0;
      return `<div class="raid-eq${j.etat === 'dehors' ? ' out' : ''}" data-id="${esc(j.id)}">
        <img src="${m ? ASSETS.icon(m.sp) : ''}" alt=""><div><b>${esc(j.nom)}</b><span>${m ? 'N.' + m.lvl : ''}</span>
        <i><u style="width:${r * 100}%;background:${hpCol(r)}"></u></i></div></div>`;
    }).join('');
    this.el.style.display = autres.length ? '' : 'none';
  }
  flash(id) { const q = this.el.querySelector(`[data-id="${CSS.escape(String(id))}"]`); if (!q) return; q.classList.remove('hit'); void q.offsetWidth; q.classList.add('hit'); }
}

/** branche le miroir sur l'écran de combat d'Odyssée pour la durée du combat */
export function brancher(bv, miroir, moi) {
  const play = bv.play.bind(bv);
  bv.play = async (evs) => {
    if (!miroir.equipiers && bv.root) {
      bv.root.classList.add('raid');
      miroir.equipiers = new Equipiers(bv.root, moi); miroir.equipiers.maj(miroir.dernier);
      marquerBlocs(bv, miroir);
    }
    for (const e of evs) {
      if (e.t === 'raid-equipier') { if (e.k === 'hp' || e.k === 'faint' || e.k === 'hit') miroir.equipiers?.flash(e.own); continue; }
      if (e.t === 'raid-bloc') { bv.sound.sfx('hitstrong'); bv.st.screenFlash = 0.7; await wait(120); bv.st.screenFlash = 0; marquerBlocs(bv, miroir, e.reste); continue; }
      if (e.t === 'raid-out' || e.t === 'raid-switch-prompt') continue;
      await play([e]);
    }
    miroir.equipiers?.maj(miroir.dernier);
  };
  return () => { bv.play = play; };
}
/** la barre de vie du boss découpée en blocs */
function marquerBlocs(bv, miroir, reste) {
  const bar = bv.root?.querySelector('.bhud.foe .bh-hp i'); if (!bar) return;
  const n = miroir.dernier.blocs || 3;
  bar.querySelectorAll('.raid-sep').forEach((q) => q.remove());
  for (let k = 1; k < n; k++) { const s = el('span', 'raid-sep'); s.style.left = (k * 100 / n) + '%'; bar.appendChild(s); }
  const hud = bv.root.querySelector('.bhud.foe');
  let cpt = hud.querySelector('.raid-blocs'); if (!cpt) { cpt = el('div', 'raid-blocs'); hud.appendChild(cpt); }
  const r = reste ?? miroir.dernier.bloc;
  cpt.innerHTML = Array.from({ length: n }, (_, k) => `<b class="${k < r ? 'on' : ''}"></b>`).join('');
}
export const nomBoss = (m) => monName(m);
