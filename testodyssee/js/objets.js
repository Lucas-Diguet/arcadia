// testodyssee/js/objets.js — ce que font les objets du labo quand on les utilise depuis le sac (navigateur seulement)
import { ITEMS } from '../../odyssee/js/core/items.js';
import { MOVES } from '../../odyssee/js/data/moves.js';
import { monName, refreshStats } from '../../odyssee/js/core/mon.js';
import { partyScreen } from '../../odyssee/js/ui/screens.js';
import { OBJETS, refusCt } from './contenu.js';

const idAttaque = (key) => Object.values(MOVES).find((m) => m.key === key).id;

export function brancherObjets() {
  for (const [k, o] of Object.entries(OBJETS)) {
    const it = ITEMS[k];
    if (o.lire) it.use = async (g) => { await g.ui.say(['Tu déroules le parchemin...', ...o.lire]); return false; };
    if (o.ct) it.use = async (g, item) => {
      const id = idAttaque(o.ct), mv = MOVES[id];
      const i = await partyScreen(g, { mode: 'pick', prompt: `Apprendre ${mv.n} à quel Pokémon ?`, filter: (m) => refusCt(k, m.sp) || (m.moves.some((x) => x.id === id) ? 'Déjà appris' : null) });
      if (i < 0) return false;
      const m = g.state.party[i];
      if (m.moves.length < 4) { m.moves.push({ id, pp: mv.pp }); g.sound.sfx('learn'); await g.ui.say(`${monName(m)} apprend ${mv.n} !`); }
      else await g.askLearn(m, id);
      // à usage unique : elle disparaît une fois l'attaque apprise
      if (o.unique && m.moves.some((x) => x.id === id)) { g.take(item || k); await g.ui.say(`La ${o.name} s'efface : elle ne servait qu'une fois.`); }
      return false;
    };
    // vitamines : 10 points d'effort dans une statistique, jusqu'à 100 (comme en quatrième génération)
    if (o.vitamine != null) it.use = async (g, item) => {
      const v = o.vitamine, noms = ['PV', 'Attaque', 'Défense', 'Attaque Spéciale', 'Défense Spéciale', 'Vitesse'];
      const i = await partyScreen(g, { mode: 'pick', prompt: `Utiliser ${o.name} sur quel Pokémon ?`, filter: (m) => (m.ev[v] >= 100 || m.ev.reduce((a, x) => a + x, 0) >= 510 ? 'Sans effet' : null) });
      if (i < 0) return false;
      const m = g.state.party[i];
      m.ev[v] = Math.min(100, m.ev[v] + 10); refreshStats(m, true);
      g.take(item); g.sound.sfx('levelup');
      await g.ui.say(`${noms[v]} de ${monName(m)} augmente !`);
      return false;
    };
    if (o.iv) it.use = async (g, item) => {
      const i = await partyScreen(g, { mode: 'pick', prompt: 'Utiliser le Bouchon d\'Or sur quel Pokémon ?', filter: (m) => (m.iv.every((v) => v >= 31) ? 'Déjà au maximum' : null) });
      if (i < 0) return false;
      const m = g.state.party[i];
      m.iv = m.iv.map(() => 31); refreshStats(m, true);
      g.take(item); g.sound.sfx('levelup');
      await g.ui.say(`Les valeurs cachées de ${monName(m)} sont au maximum !\nSes statistiques augmentent.`);
      return false;
    };
  }
}
