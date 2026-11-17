// testodyssee/js/donjon/chateau.js — mécaniques du Château de Noirval (donjons/chateau.js), ajoutées à la classe
// Donjons (jeu.js). Les passages entre salles et les bâtiments de la cour passent par le code commun des liens
// (donjon/contes.js, `liens` du donjon). Ici : la scène du Grand Hall (le seigneur monte dans la tour centrale et
// ferme derrière lui), les sceaux des tours (état partagé de la salle gh : sceau_<tour>), la porte à quatre serrures,
// la porte du chemin de ronde, et les gardes qui restent là une fois battus.
import { battu } from './etat.js';

const estChateau = (d) => d?.id === 'chateau';
const TOURS = { A: 'Faucon', B: 'Loup', C: 'Corbeau', D: 'Cerf' };
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

export const Chateau = {
  chateauIci() { const d = this.defs.get('chateau'); return d && this.estDans(d) ? d : null; },
  dChateau(d, sid) { return this.etats[d.id]?.salles[sid]?.donnees || {}; },
  sceauxChateau(d) { const H = this.dChateau(d, 'gh'); return Object.keys(TOURS).filter((t) => H['sceau_' + t]); },

  poserObjetsChateau(d, m) {
    if (!estChateau(d)) return;
    const P = m.donjon.plan;
    for (const [c, l] of Object.entries(P.objets)) {
      const o = d.objets[c];
      for (const [x, y] of l) {
        if (o.type === 'porteCentrale') m.object(x, y, { use: () => this.porteCentrale(d) });
        else if (o.type === 'sceau') m.object(x, y, { use: () => this.prendreSceau(d, o) });
        else if (o.type === 'rempart') m.object(x, y, { use: () => this.game.ui.say(['Une porte basse donne sur le chemin de ronde, vers la Tour du Loup.', 'Elle est barricadée de l\'autre côté. Il faudra trouver comment l\'ouvrir.']) });
      }
    }
    for (const n of m.npcs) {
      const k = Object.keys(d.pnj).find((q) => `${d.id}:${d.pnj[q].id}` === n.id), Q = k && d.pnj[k]; if (!Q) continue;
      // la scène du hall : tant qu'elle n'est pas jouée, le seigneur et les siens sont là
      if (Q.scene === 'hall') { n.when = () => !this.dChateau(d, 'gh').scene || this.sceneHall; n.talk = () => this.game.ui.say('...'); }
      // les gardes restent à leur poste une fois battus
      else if (Q.chateau) {
        n.when = () => true;
        const talk = n.talk; n.talk = () => (battu(this.etats[d.id], d, k) ? this.game.ui.say(Q.battu || 'Fais ce que tu veux. Je ne bouge plus d\'ici.', { speaker: `${Q.cls} ${Q.nom}` }) : talk());
      }
    }
  },
  appliquerChateau(d) {
    if (estChateau(d) && this.chateauIci() === d) this.game.refreshNpcs?.();
  },

  /** après un pas : la première entrée dans le Grand Hall joue la scène du seigneur */
  async apresPasChateau() {
    const g = this.game, d = this.chateauIci(); if (!d || g.busy) return;
    const s = d.salles.find((q) => q.carte === g.mapObj?.id);
    if (s?.id === 'gh' && !this.dChateau(d, 'gh').scene && !this.sceneHall) await this.sceneSeigneur(d);
  },

  async sceneSeigneur(d) {
    const g = this.game, ui = g.ui, m = g.mapObj, p = g.player;
    this.sceneHall = true; g.busy = true;
    const qui = (id) => g.npcs.find((n) => n.id === `chateau:${id}`);
    try {
      const S = qui('seigneur'), E = qui('elise'), gardes = [1, 2, 3, 4].map((i) => qui('elite-' + i)).filter(Boolean);
      p.dir = 'up';
      g.view.shake = 0.15; g.sound.sfx('bump');
      await ui.say('Tiens donc. Un visiteur.', { speaker: 'Seigneur Malvoran' });
      await ui.say(['Au secours ! Il veut me...', 'Prévenez ma mère ! Mon père est dans les cachots !'], { speaker: 'Élise' });
      await ui.say(['Silence.', 'Tu arrives trop tard, petit dresseur. Ce soir, au sommet de la tour, le dragon de Noirval se réveillera.',
        'Gardes, avec moi. Que les tours s\'occupent de l\'intrus.'], { speaker: 'Seigneur Malvoran' });
      // ils montent tous vers la porte de la tour centrale
      const [dx, dy] = m.donjon.plan.objets['Ш'][1];
      await Promise.all([S, E, ...gardes].filter(Boolean).map((n, i) => attendre(i * 140).then(() => this.marcherVers(n, m, dx, dy + 1, 0))));
      g.sound.sfx('door');
      await this.demande(d.id, { a: 'maj', salle: 'gh', donnees: { scene: true } });
      this.sceneHall = false; g.refreshNpcs();
      await attendre(300);
      g.sound.sfx('bang'); g.view.shake = 0.2;
      await ui.say(['Un lourd verrou claque. La porte de la tour centrale est fermée.', 'Elle porte quatre serrures en forme de sceau : le Faucon, le Loup, le Corbeau et le Cerf.', 'Il y a une tour à chaque angle de la cour...']);
    } finally {
      this.sceneHall = false; g.busy = false; g.refreshNpcs();
    }
  },

  async porteCentrale(d) {
    const ui = this.game.ui, n = this.sceauxChateau(d);
    if (!this.dChateau(d, 'gh').scene) { await ui.say('Une porte massive mène à la tour centrale.'); return; }
    if (n.length < 4) {
      await ui.say(['La porte de la tour centrale. Quatre serrures en forme de sceau.', `Sceaux posés : ${n.length}/4${n.length ? ` (${n.map((t) => TOURS[t]).join(', ')})` : ''}.`]);
      return;
    }
    await ui.say(['Les quatre sceaux sont en place. Le verrou cède dans un grondement.', 'Là-haut, quelque chose rugit... La suite de l\'ascension arrive bientôt.']);
  },

  async prendreSceau(d, o) {
    const g = this.game, ui = g.ui;
    if (this.dChateau(d, 'gh')['sceau_' + o.tour]) { await ui.say(`Le socle est vide : le ${o.nom} est déjà dans la serrure de la tour centrale.`); return; }
    const capitaine = Object.keys(d.pnj).find((k) => d.pnj[k].sceau === o.tour);
    if (capitaine && !battu(this.etats[d.id], d, capitaine) && !g.modeTest) { await ui.say('Le capitaine ne te laissera pas approcher du socle.'); return; }
    await this.demande(d.id, { a: 'maj', salle: 'gh', donnees: { ['sceau_' + o.tour]: true } });
    g.sound.sfx('item');
    const n = this.sceauxChateau(d).length;
    await ui.say([`${g.state.name} prend le ${o.nom} !`, `Il ira dans une des serrures de la tour centrale. Sceaux : ${n}/4.`]);
  },

  texteChateau(d, s) {
    if (!estChateau(d)) return null;
    const n = this.sceauxChateau(d).length;
    if (s.id === 'gh') return this.dChateau(d, 'gh').scene ? `sceaux ${n}/4` : 'entre dans le hall';
    if (s.tour) return this.dChateau(d, 'gh')['sceau_' + s.tour] ? 'sceau pris' : `sceau au sommet · ${n}/4`;
    if (s.id === 'c0') return `sceaux ${n}/4`;
    return null;
  },
};
