// testodyssee/js/donjon/etat.js — état d'un donjon partagé par le groupe (sans DOM ni réseau).
// L'hôte du salon le tient : chaque joueur lui envoie des demandes, il applique les règles et renvoie l'état à tous.
//
// Salles (def.salles), dans l'ordre :
//   accueil : terminée quand un joueur demande au gardien d'ouvrir le donjon (le groupe est alors compté)
//   combat  : terminée quand tous ses adversaires sont battus ; un adversaire ne se combat que par un joueur à la fois
//   dalles  : terminée quand assez de joueurs se tiennent sur les dalles en même temps (autant que de joueurs présents, au plus le nombre de dalles)
//   boss    : PV partagés par le groupe ; chaque combat retire ce qu'il a infligé
//   serrures : chaque PNJ (s.pnj) donne une clé à qui le bat ; la salle est terminée quand toutes les clés sont dans
//             les serrures. Une clé pas encore posée retourne à son PNJ si son porteur quitte le donjon
//   libre   : rien à faire (salle de passage, casse-tête sans porte)
//   autres  : leur avancée est notée par le jeu avec l'action « maj » (donjon des miroirs)
//   raid    : le combat contre le boss se lance quand tous les joueurs présents sont prêts (l'hôte en décide)

export function nouvelEtat(def, o = {}) {
  const joueurs = Math.max(1, o.joueurs || 1);
  const salles = {};
  for (const s of def.salles) salles[s.id] = { faite: s.type === 'libre', battus: [], pris: {}, dalles: 0, cles: {}, prets: [], combat: false, donnees: {} };
  return {
    id: def.id, run: o.run || 1, v: 0, joueurs, fini: false,
    salles,
    boss: o.bossPv ? { pv: o.bossPv * (joueurs + 1), max: o.bossPv * (joueurs + 1) } : null,
    vainqueurs: [],
  };
}

const salleDe = (def, pnj) => def.salles.find((s) => s.pnj?.includes(pnj));

/** une salle est accessible quand toutes celles d'avant sont terminées */
export function ouverte(def, e, salleId) {
  for (const s of def.salles) { if (s.id === salleId) return true; if (!e.salles[s.id].faite) return false; }
  return false;
}
export const battu = (e, def, pnj) => { const s = salleDe(def, pnj); return !!s && e.salles[s.id].battus.includes(pnj); };
export const prisPar = (e, def, pnj) => { const s = salleDe(def, pnj); return s ? e.salles[s.id].pris[pnj] ?? null : null; };

/**
 * applique la demande `m` du joueur `qui` ; renvoie { ok, change, why? }.
 * Toute modification incrémente e.v (l'hôte renvoie alors l'état à tous).
 */
export function appliquer(def, e, qui, m, o = {}) {
  const res = (ok, change, why) => { if (change) e.v++; return { ok, change, why }; };
  qui = String(qui);
  switch (m.a) {
    case 'ouvrir': {
      const s = def.salles.find((q) => q.type === 'accueil');
      if (!s || e.salles[s.id].faite) return res(false, false, 'deja');
      const fresh = nouvelEtat(def, { joueurs: o.joueurs, bossPv: o.bossPv, run: e.run + 1 });
      Object.assign(e, fresh, { v: e.v });
      e.salles[s.id].faite = true;
      return res(true, true);
    }
    case 'prendre': {
      const s = salleDe(def, m.pnj); if (!s) return res(false, false, 'inconnu');
      const S = e.salles[s.id];
      if (!ouverte(def, e, s.id)) return res(false, false, 'ferme');
      if (S.battus.includes(m.pnj)) return res(false, false, 'battu');
      if (S.cles[m.pnj]) return res(false, false, 'donnee');
      if (S.pris[m.pnj] && S.pris[m.pnj] !== qui) return res(false, false, 'occupe');
      if (S.pris[m.pnj] === qui) return res(true, false);
      S.pris[m.pnj] = qui;
      return res(true, true);
    }
    case 'lacher': {
      const s = salleDe(def, m.pnj); if (!s) return res(false, false, 'inconnu');
      const S = e.salles[s.id];
      if (S.pris[m.pnj] !== qui) return res(false, false);
      delete S.pris[m.pnj];
      return res(true, true);
    }
    case 'gagne': {
      const s = salleDe(def, m.pnj); if (!s || s.type !== 'combat') return res(false, false, 'inconnu');
      const S = e.salles[s.id];
      if (S.battus.includes(m.pnj)) return res(false, false, 'battu');
      if (S.pris[m.pnj] && S.pris[m.pnj] !== qui) return res(false, false, 'occupe');
      delete S.pris[m.pnj];
      S.battus.push(m.pnj);
      if (s.pnj.every((p) => S.battus.includes(p))) S.faite = true;
      return res(true, true);
    }
    case 'degats': {
      const s = def.salles.find((q) => q.type === 'boss');
      if (!s || !e.boss || e.fini || !ouverte(def, e, s.id)) return res(false, false, 'ferme');
      const n = Math.max(0, Math.min(e.boss.pv, Math.floor(+m.n || 0)));
      if (!n) return res(true, false);
      e.boss.pv -= n;
      if (!e.vainqueurs.includes(qui)) e.vainqueurs.push(qui);
      if (e.boss.pv <= 0) { e.boss.pv = 0; e.salles[s.id].faite = true; e.fini = true; }
      return res(true, true);
    }
    case 'dalles': {
      // décidé par l'hôte à partir des positions : m.n joueurs sur les dalles, m.requis joueurs nécessaires
      const s = def.salles.find((q) => q.type === 'dalles' && q.id === (m.salle || q.id));
      if (!s || e.salles[s.id].faite || !ouverte(def, e, s.id)) return res(false, false);
      const S = e.salles[s.id], n = Math.max(0, m.n | 0);
      let change = S.dalles !== n; S.dalles = n;
      if (m.requis > 0 && n >= m.requis) { S.faite = true; change = true; }
      return res(true, change);
    }
    case 'cle': {
      const s = salleDe(def, m.pnj); if (!s || s.type !== 'serrures') return res(false, false, 'inconnu');
      const S = e.salles[s.id];
      if (S.cles[m.pnj]) return res(false, false, 'donnee');
      if (S.pris[m.pnj] && S.pris[m.pnj] !== qui) return res(false, false, 'occupe');
      delete S.pris[m.pnj];
      S.cles[m.pnj] = { a: qui, mise: false };
      return res(true, true);
    }
    case 'inserer': {
      const s = def.salles.find((q) => q.type === 'serrures' && (!m.salle || q.id === m.salle)); if (!s) return res(false, false, 'inconnu');
      const S = e.salles[s.id];
      const miennes = Object.values(S.cles).filter((c) => c.a === qui && !c.mise);
      if (!miennes.length) return res(false, false, 'aucune');
      for (const c of miennes) c.mise = true;
      if (s.pnj.every((p) => S.cles[p]?.mise)) S.faite = true;
      return res(true, true);
    }
    case 'pret': case 'pasPret': {
      const s = def.salles.find((q) => q.type === 'raid');
      if (!s || e.salles[s.id].faite || !ouverte(def, e, s.id)) return res(false, false, 'ferme');
      const S = e.salles[s.id], dedans = S.prets.includes(qui);
      if (m.a === 'pret' && !dedans) { S.prets.push(qui); return res(true, true); }
      if (m.a === 'pasPret' && dedans && !S.combat) { S.prets = S.prets.filter((q) => q !== qui); return res(true, true); }
      return res(true, false);
    }
    case 'raid': {
      // décidé par l'hôte : début (m.etape 'debut') ou fin du combat (m.etape 'fin', m.result)
      const s = def.salles.find((q) => q.type === 'raid'); if (!s) return res(false, false);
      const S = e.salles[s.id];
      if (m.etape === 'debut') { S.combat = true; return res(true, true); }
      S.combat = false; S.prets = [];
      if (m.result === 'win') { S.faite = true; e.fini = true; for (const q of m.vainqueurs || []) if (!e.vainqueurs.includes(String(q))) e.vainqueurs.push(String(q)); }
      return res(true, true);
    }
    case 'maj': {
      // avancée propre à un donjon : m.donnees est fusionné dans la salle, m.faite la termine, m.fini termine le donjon
      const S = e.salles[m.salle]; if (!S) return res(false, false, 'inconnu');
      if (m.donnees && typeof m.donnees === 'object') S.donnees = { ...S.donnees, ...m.donnees };
      if (m.faite) S.faite = true;
      if (m.fini) e.fini = true;
      return res(true, true);
    }
    case 'parti': case 'sortie': {
      let change = false;
      for (const S of Object.values(e.salles)) {
        for (const [p, q] of Object.entries(S.pris)) if (q === qui) { delete S.pris[p]; change = true; }
        for (const [p, c] of Object.entries(S.cles)) if (c.a === qui && !c.mise) { delete S.cles[p]; change = true; }
        if (!S.combat && S.prets.includes(qui)) { S.prets = S.prets.filter((q) => q !== qui); change = true; }
      }
      return res(true, change);
    }
    case 'recommencer': {
      Object.assign(e, nouvelEtat(def, { run: e.run + 1 }), { v: e.v });
      return res(true, true);
    }
  }
  return res(false, false, 'inconnu');
}

/** nombre de joueurs requis sur les dalles */
export const requisDalles = (nbDalles, presents) => Math.max(1, Math.min(nbDalles, presents));

/** clés qu'un joueur a sur lui (pas encore posées) */
export const clesDe = (def, e, qui) => {
  const out = [];
  for (const s of def.salles) if (s.type === 'serrures') for (const [p, c] of Object.entries(e.salles[s.id].cles)) if (c.a === String(qui) && !c.mise) out.push(p);
  return out;
};
/** nombre de serrures remplies */
export const serrures = (def, e) => { const s = def.salles.find((q) => q.type === 'serrures'); return s ? Object.values(e.salles[s.id].cles).filter((c) => c.mise).length : 0; };
