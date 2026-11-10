// testodyssee/js/donjon/fonderie.js — mécaniques de la Fonderie aux Plaques, ajoutées à la classe Donjons (jeu.js) :
// l'hôte regarde où sont les joueurs et ouvre les grilles des plaques occupées (règles dans plaques.js) ; chacun
// voit ses plaques s'allumer et les grilles se lever. L'état est dans les données de chaque salle :
// ouvertes (groupes ouverts en ce moment) et gardes (groupes enclenchés pour de bon).
import { T } from '../../../odyssee/js/world/tiles.js';
import { fermer, ouvrir } from './plan.js';
import { lirePlaques, grillesOuvertes } from './plaques.js';
import { dessinerPlaques } from '../rendu.js';

const cle = (x, y) => x + ',' + y;
const estFonderie = (d) => !!d?.plaques;

export const Fonderie = {
  poserObjetsFonderie(d, m) {
    if (!estFonderie(d)) return;
    const S = lirePlaques(d, m.donjon.plan);
    if (!S.plaques.length && !S.grilles.length) return;
    m.plaques = S;
    for (const q of S.grilles) fermer(m, q.x, q.y, 'porte_grille');
  },
  /** les grilles suivent l'état de leur salle */
  appliquerFonderie(d) {
    if (!estFonderie(d)) return;
    const g = this.game, e = this.etats[d.id];
    for (const s of d.salles) {
      const m = g.world.maps[s.carte]; if (!m?.plaques) continue;
      const D = e.salles[s.id].donnees || {}, ouv = new Set([...(D.ouvertes || []), ...(D.gardes || [])]);
      for (const q of m.plaques.grilles) {
        const k = cle(q.x, q.y);
        if (ouv.has(q.groupe)) { if (ouvrir(m, q.x, q.y) && g.mapObj === m) { g.view.decoAt.delete(k); g.view.rebuildAt(q.x, q.y); } }
        else if (m.get(q.x, q.y) !== T.BLOCK) {
          // l'hôte ne referme jamais une grille sur un joueur ; chez soi, on attend d'en être sorti
          if (g.mapObj === m && g.player.x === q.x && g.player.y === q.y) continue;
          fermer(m, q.x, q.y, 'porte_grille');
          if (g.mapObj === m) { g.view.decoAt.set(k, m.deco.find((z) => z.x === q.x && z.y === q.y)); g.view.rebuildAt(q.x, q.y); }
        }
      }
    }
  },
  /** cases occupées par les joueurs sur une carte (soi compris) */
  casesOccupees(carte) {
    const g = this.game, occ = new Set();
    if (g.state && g.mapObj?.id === carte) occ.add(cle(g.player.x, g.player.y));
    for (const o of g.link?.others.values() || []) if (o.map === carte) occ.add(cle(o.x, o.y));
    return occ;
  },
  /** chez l'hôte, quatre fois par seconde : les plaques occupées ouvrent leurs grilles */
  verifierPlaques(d) {
    if (!estFonderie(d)) return;
    const e = this.etats[d.id];
    for (const s of d.salles) {
      const m = this.game.world.maps[s.carte]; if (!m?.plaques) continue;
      const D = e.salles[s.id].donnees || {};
      const O = grillesOuvertes(d.plaques, m.plaques, this.casesOccupees(m.id), { gardes: D.gardes, avant: D.ouvertes, test: this.game.modeTest });
      if (O.ouvertes.join() === (D.ouvertes || []).join() && O.gardes.join() === (D.gardes || []).join()) continue;
      this.traiter(d.id, this.moi, { a: 'maj', salle: s.id, donnees: O });
    }
  },
  /** à chaque image : les plaques de la salle où l'on est, allumées sous les joueurs */
  tickFonderie() {
    const g = this.game, m = g.state && g.mapObj, d = m && [...this.defs.values()].find((q) => estFonderie(q) && this.estDans(q));
    if (!d || !m.plaques) { if (this.plaquesVues) { this.plaquesVues = null; dessinerPlaques(g.view, []); } return; }
    const occ = this.casesOccupees(m.id), s = d.salles.find((q) => q.carte === m.id), D = this.etats[d.id].salles[s.id].donnees || {};
    const ouv = new Set([...(D.ouvertes || []), ...(D.gardes || [])]);
    const liste = [
      ...m.plaques.plaques.map((p) => ({ x: p.x, y: p.y, couleurs: p.groupes.map((k) => d.plaques[k].couleur), on: occ.has(cle(p.x, p.y)) })),
      ...m.plaques.grilles.map((q) => ({ x: q.x, y: q.y, couleurs: [d.plaques[q.groupe].couleur], on: ouv.has(q.groupe), grille: true })),
    ];
    const k = m.id + '|' + liste.map((q) => q.x + ',' + q.y + (q.on ? '+' : '-')).join(';');
    if (k !== this.plaquesVues || g.view.__plaquesRoot !== g.view.root) { this.plaquesVues = k; dessinerPlaques(g.view, liste); }
  },
  texteFonderie(d, s) {
    if (!estFonderie(d)) return null;
    const m = this.game.world.maps[s.carte];
    if (s.type === 'libre' && m?.plaques) return 'plaques et grilles';
    return null;
  },
};
