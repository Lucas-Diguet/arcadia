// testodyssee/js/donjon/mine.js — mécaniques de la Mine Effondrée, ajoutées à la classe Donjons (jeu.js) :
// poste de contrôle (un seul joueur à la fois : plan en direct, barrières, cage), barrières de bois, aiguillages,
// plafonds fissurés qui s'effondrent, cage qui fait descendre d'un niveau, Pokémon sauvages des galeries.
// Tout passe par l'état du donjon (l'hôte fait autorité) : actions « poste », « maj » (barrières, cages) et
// « ramasse » (éboulements, partagés : une galerie effondrée l'est pour tout le monde).
import { T } from '../../../odyssee/js/world/tiles.js';
import { createMon } from '../../../odyssee/js/core/mon.js';
import { el, esc } from '../../../odyssee/js/ui/ui.js';

const cle = (x, y) => x + ',' + y;
const estMine = (d) => !!d?.mine;
const V4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const court = (s) => (s.carreau ? 'carreau' : s.niveau ? `niveau ${s.niveau}` : 'fond');

/** groupes de cases fissurées qui se touchent : un groupe s'effondre d'un coup */
function groupesFissures(m, P) {
  const l = P.objets['~'] || [], vus = new Set(), out = [], dans = new Set(l.map(([x, y]) => cle(x, y)));
  for (const [x, y] of l) {
    if (vus.has(cle(x, y))) continue;
    const g = [], f = [[x, y]]; vus.add(cle(x, y));
    while (f.length) { const [a, b] = f.pop(); g.push([a, b]); for (const [dx, dy] of V4) { const k = cle(a + dx, b + dy); if (dans.has(k) && !vus.has(k)) { vus.add(k); f.push([a + dx, b + dy]); } } }
    out.push(g);
  }
  return out;
}

export const Mine = {
  mineIci() { return [...this.defs.values()].find((d) => estMine(d) && this.estDans(d)); },
  carreau(d) { return d.salles.find((s) => s.carreau); },
  dMine(d) { return this.etats[d.id].salles[this.carreau(d).id].donnees || {}; },

  poserObjetsMine(d, m) {
    if (!estMine(d)) return;
    const P = m.donjon.plan;
    for (const [c, l] of Object.entries(P.objets)) {
      const o = d.objets[c];
      for (const [x, y] of l) {
        if (o.type === 'poste') m.object(x, y, { use: () => this.poste(d) });
        else if (o.type === 'barriere') m.object(x, y, { use: () => this.game.ui.say(d.textes.barriere.replace('{l}', c)) });
      }
    }
    m.fissures = groupesFissures(m, P);
  },

  /** le décor suit l'état : barrières ouvertes ou fermées, galeries effondrées, cages envoyées */
  appliquerMine(d) {
    if (!estMine(d)) return;
    const g = this.game, e = this.etats[d.id], D = this.dMine(d), B = D.barrieres || {};
    for (const s of d.salles) {
      const m = g.world.maps[s.carte]; if (!m) continue;
      const P = m.donjon.plan, eb = e.salles[s.id].donnees.ramasses || [];
      for (const [c, l] of Object.entries(P.objets)) {
        if (d.objets[c].type !== 'barriere') continue;
        const ouverte = !!B[c];
        // une barrière ne se referme jamais sur quelqu'un
        if (!ouverte && l.some(([x, y]) => this.quelquunSur(m, x, y))) continue;
        for (const [x, y] of l) this.decor(m, x, y, ouverte ? null : 'barriere');
      }
      (m.fissures || []).forEach((grp, i) => {
        const tombe = eb.includes(`e:${i}`);
        for (const [x, y] of grp) {
          if (tombe) { if (m.get(x, y) !== T.BLOCK && !this.quelquunSur(m, x, y)) this.decor(m, x, y, 'caverock'); }
          else if (m.get(x, y) === T.BLOCK) { this.decor(m, x, y, null); m.deco.push({ k: 'fissure', x, y }); if (g.mapObj === m) { g.view.decoAt.set(cle(x, y), m.deco[m.deco.length - 1]); g.view.rebuildAt(x, y); } }
        }
      });
    }
    // la cage d'une salle a été envoyée : ceux qui sont dedans descendent
    const cages = D.cages || {}, premier = !this.cagesVues, vues = (this.cagesVues ||= {});
    for (const [sid, n] of Object.entries(cages)) {
      if (premier) { vues[sid] = n; continue; }
      if ((vues[sid] ?? 0) === n) continue;
      vues[sid] = n;
      const s = d.salles.find((q) => q.id === sid), m = g.world.maps[s.carte];
      if (g.state && g.mapObj === m && this.dansLaCage(m, g.player.x, g.player.y)) this.taches.push(() => this.descendre(d, s));
    }
  },
  quelquunSur(m, x, y) {
    const g = this.game;
    if (g.state && g.mapObj === m && ((g.player.x === x && g.player.y === y) || (g.player.move && g.player.move.tx === x && g.player.move.ty === y))) return true;
    for (const o of g.link?.others.values() || []) if (o.map === m.id && o.x === x && o.y === y) return true;
    return false;
  },
  dansLaCage(m, x, y) { return (m.donjon.plan.objets.c || []).some(([a, b]) => a === x && b === y); },
  async descendre(d, s) {
    const g = this.game, cible = d.salles.find((q) => q.id === s.cageVers), m = g.world.maps[cible.carte], [x, y] = m.donjon.plan.depart;
    g.sound.sfx('door'); g.view.shake = 0.3;
    await g.ui.say(cible.type === 'raid' ? 'La cage descend, descend encore... jusqu\'au fond.' : `La cage descend au ${cible.nom.toLowerCase()}.`);
    await g.warp({ map: m.id, x, y: y - 1, dir: 'up' }, 'exit');
  },

  /* ---------------- plafonds fissurés ---------------- */
  async apresPasMine() {
    // les Pokémon sauvages valent aussi pour le train (voie ferrée)
    const d = [...this.defs.values()].find((q) => (q.mine || q.train) && this.estDans(q)); if (!d) return;
    const g = this.game, m = g.mapObj, p = g.player, s = d.salles.find((q) => q.carte === m.id); if (!s) return;
    const i = (m.fissures || []).findIndex((grp) => grp.some(([x, y]) => x === p.x && y === p.y));
    if (i >= 0 && !(this.etats[d.id].salles[s.id].donnees.ramasses || []).includes(`e:${i}`)) {
      g.busy = true;
      try {
        g.sound.sfx('hitstrong'); g.view.shake = 0.6; await g.ui.flash(1, '#8a6a4a', 120);
        for (const q of g.state.party) if (q.hp > 0) q.hp = Math.max(1, q.hp - Math.ceil(q.stats[0] / 5));
        await g.ui.say(d.textes.eboulement);
        // on recule d'un pas : la galerie effondrée est bouchée pour tout le monde
        const retour = { up: 'down', down: 'up', left: 'right', right: 'left' }[p.dir];
        await g.playerWalk(retour, 1); p.dir = { up: 'down', down: 'up', left: 'right', right: 'left' }[retour];
        await this.demande(d.id, { a: 'ramasse', salle: s.id, objet: `e:${i}` });
      } finally { g.busy = false; }
      return;
    }
    // Pokémon sauvages des galeries
    if (!s.rencontres || m.get(p.x, p.y) !== T.CAVE || g.bv.alive || Math.random() > (s.taux || 0.03)) return;
    const tot = s.rencontres.reduce((a, x) => a + x[3], 0); let r = Math.random() * tot, e = s.rencontres[0];
    for (const x of s.rencontres) { r -= x[3]; if (r <= 0) { e = x; break; } }
    const wild = createMon(e[0], e[1] + Math.floor(Math.random() * (e[2] - e[1] + 1)), { met: d.nom });
    g.busy = true;
    try { const res = await g.runBattle({ wild, noWhiteout: true }); if (res === 'lose') await this.defaite(d); }
    finally { g.busy = false; }
  },

  /* ---------------- poste de contrôle ---------------- */
  /** niveaux qu'on peut voir depuis le poste : ceux où quelqu'un est déjà allé */
  niveauxAtteints(d) {
    const g = this.game, l = d.salles.filter((s) => s.niveau), ou = new Set([...(g.link?.others.values() || [])].map((o) => o.map));
    const D = this.dMine(d);
    return l.filter((s) => (D.atteints || []).includes(s.id) || ou.has(s.carte) || s.niveau === 1);
  },
  async poste(d) {
    const g = this.game, ui = g.ui, s0 = this.carreau(d), D = this.dMine(d);
    if (D.poste && D.poste !== this.moi && !g.modeTest) { await ui.say(`${this.nomDe(D.poste)} tient le poste de contrôle.`); return; }
    const r = await this.demande(d.id, { a: 'poste', salle: s0.id, test: !!g.modeTest });
    if (!r.ok) { await ui.say(r.why === 'pris' ? 'Quelqu\'un vient de prendre le poste.' : 'L\'hôte du salon ne répond pas...'); return; }
    g.sound.sfx('pc');
    let vue = this.niveauxAtteints(d).slice(-1)[0];
    const plan = el('div', 'box mine-plan'); ui.root.appendChild(plan);
    const cv = document.createElement('canvas'); plan.appendChild(cv);
    const titre = el('div', 'mine-titre'); plan.prepend(titre);
    const dessiner = () => this.dessinerPlan(d, vue, cv, titre);
    dessiner(); const iv = setInterval(dessiner, 250);
    try {
      for (;;) {
        const E = this.dMine(d), B = E.barrieres || {}, m = g.world.maps[vue.carte];
        const lettres = Object.keys(m.donjon.plan.objets).filter((c) => d.objets[c].type === 'barriere').sort();
        const items = [], actions = [];
        for (const c of lettres) { const o = d.objets[c]; items.push({ label: `Barrière ${c}${o.lien ? ` ⇄ ${o.lien}` : ''}`, right: B[c] ? 'ouverte' : 'fermée' }); actions.push(['barriere', c]); }
        const dansCage = (s) => { const mm = g.world.maps[s.carte]; return [...(g.link?.others.values() || [])].filter((o) => o.map === mm.id && this.dansLaCage(mm, o.x, o.y)).length + (g.mapObj === mm && this.dansLaCage(mm, g.player.x, g.player.y) ? 1 : 0); };
        for (const s of [s0, ...this.niveauxAtteints(d)]) { const n = dansCage(s); items.push({ label: `Cage : ${court(s)} → ${court(d.salles.find((q) => q.id === s.cageVers))}`, right: n ? `${n} dedans` : 'vide' }); actions.push(['cage', s.id]); }
        for (const s of this.niveauxAtteints(d)) if (s !== vue) { items.push({ label: `Voir le plan : ${court(s)}` }); actions.push(['vue', s.id]); }
        const fond = d.salles.find((q) => q.type === 'raid');
        if ((E.atteints || []).includes(fond.id) || g.modeTest) { items.push({ label: 'Descendre au fond' }); actions.push(['fond']); }
        if (g.modeTest) { items.push({ label: `Test : aller au ${court(vue)}` }); actions.push(['test']); }
        items.push({ label: 'Quitter le poste' }); actions.push(['quitter']);
        const k = await ui.list({ title: `Poste de contrôle · ${vue.nom}`, items, cls: 'shop mine-menu', cancel: items.length - 1, start: 0 });
        const [a, v] = actions[k < 0 ? actions.length - 1 : k];
        if (a === 'barriere') {
          const nb = { ...(this.dMine(d).barrieres || {}) }, o = d.objets[v];
          nb[v] = !nb[v]; if (nb[v] && o.lien) nb[o.lien] = false;
          g.sound.sfx('select'); await this.demande(d.id, { a: 'maj', salle: s0.id, donnees: { barrieres: nb } });
        } else if (a === 'cage') {
          const s = d.salles.find((q) => q.id === v), cages = { ...(this.dMine(d).cages || {}) }, cible = s.cageVers;
          cages[v] = (cages[v] || 0) + 1;
          const atteints = [...new Set([...(this.dMine(d).atteints || []), cible])];
          g.sound.sfx('door'); await this.demande(d.id, { a: 'maj', salle: s0.id, donnees: { cages, atteints } });
          const c = d.salles.find((q) => q.id === cible); if (c.niveau) vue = c;
        } else if (a === 'vue') vue = d.salles.find((q) => q.id === v);
        else if (a === 'fond' || a === 'test') {
          const s = a === 'fond' ? fond : vue, mm = g.world.maps[s.carte], [x, y] = mm.donjon.plan.depart;
          if (a === 'fond') await this.demande(d.id, { a: 'poste', salle: s0.id, lacher: true });
          await g.warp({ map: mm.id, x, y: y - 1, dir: 'up' }, 'exit');
          return;
        } else { await this.demande(d.id, { a: 'poste', salle: s0.id, lacher: true }); return; }
      }
    } finally { clearInterval(iv); plan.remove(); }
  },
  /** le plan d'un niveau, vu du poste : galeries, barrières, cages, coéquipiers (pas les fissures ni les dresseurs) */
  dessinerPlan(d, s, cv, titre) {
    const g = this.game, m = g.world.maps[s.carte], P = m.donjon.plan, B = this.dMine(d).barrieres || {}, Z = 9;
    if (cv.width !== m.w * Z) { cv.width = m.w * Z; cv.height = m.h * Z; }
    const x = cv.getContext('2d');
    x.fillStyle = '#1c140e'; x.fillRect(0, 0, cv.width, cv.height);
    const sol = new Set(P.sol.map(([a, b]) => cle(a, b)));
    for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) if (sol.has(cle(i, j))) { x.fillStyle = '#c9b58e'; x.fillRect(i * Z, j * Z, Z, Z); }
    for (const [c, l] of Object.entries(P.objets)) {
      const o = d.objets[c];
      if (o.type === 'cage') for (const [i, j] of l) { x.fillStyle = '#5a7fb0'; x.fillRect(i * Z, j * Z, Z, Z); }
      if (o.type !== 'barriere') continue;
      for (const [i, j] of l) { x.fillStyle = B[c] ? '#58b060' : '#c04838'; x.fillRect(i * Z, j * Z, Z, Z); }
      const [i, j] = l[l.length >> 1]; x.fillStyle = '#fff'; x.font = `bold ${Z + 4}px sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.strokeStyle = '#000'; x.lineWidth = 3; x.strokeText(c, i * Z + Z / 2, j * Z + Z / 2); x.fillText(c, i * Z + Z / 2, j * Z + Z / 2);
    }
    const [sx, sy] = P.depart; x.fillStyle = '#e8c840'; x.fillRect(sx * Z, sy * Z, Z, Z);
    const points = [...(g.link?.others.values() || [])].filter((o) => o.map === m.id).map((o) => [o.dx ?? o.x, o.dy ?? o.y, o.color || '#5a88c8', o.name]);
    if (g.mapObj === m) points.push([g.player.x, g.player.y, '#ffffff', g.state.name]);
    x.font = 'bold 11px sans-serif'; x.textAlign = 'left';
    for (const [i, j, col, nom] of points) {
      x.fillStyle = col; x.beginPath(); x.arc(i * Z + Z / 2, j * Z + Z / 2, Z * 0.7, 0, 7); x.fill(); x.strokeStyle = '#000'; x.lineWidth = 2; x.stroke();
      x.strokeText(nom, i * Z + Z + 2, j * Z + Z / 2); x.fillStyle = '#fff'; x.fillText(nom, i * Z + Z + 2, j * Z + Z / 2);
    }
    const n = points.length;
    titre.innerHTML = `<b>${esc(s.nom)}</b> · ${n ? `${n} mineur${n > 1 ? 's' : ''} dans ce niveau` : 'personne dans ce niveau'} · <span class="mine-leg"><i style="background:#c04838"></i>fermée <i style="background:#58b060"></i>ouverte <i style="background:#5a7fb0"></i>cage <i style="background:#e8c840"></i>arrivée</span>`;
  },
  /** texte de l'encadré pour les salles de la mine */
  texteMine(d, s) {
    if (!estMine(d)) return null;
    if (s.carreau) { const p = this.dMine(d).poste; return p ? `poste : ${this.nomDe(p)}` : 'poste libre'; }
    return null;
  },
  /** à chaque image : un joueur qui part lâche le poste */
  tickMine(dt) {
    // éboulements et barrières qui attendaient que la case se libère
    this.mineT = (this.mineT || 0) - dt;
    if (this.mineT <= 0) { this.mineT = 0.4; const d = this.mineIci(); if (d) this.appliquerMine(d); }
    if (!this.hote) return;
    for (const d of this.defs.values()) {
      if (!estMine(d)) continue;
      const p = this.dMine(d).poste; if (!p || p === this.moi) continue;
      if (this.H && !this.H.players.some((q) => String(q.id) === String(p))) this.traiter(d.id, p, { a: 'poste', salle: this.carreau(d).id, lacher: true });
    }
  },
};
