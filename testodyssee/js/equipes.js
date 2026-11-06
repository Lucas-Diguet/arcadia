// testodyssee/js/equipes.js — équipes prêtes à l'emploi : on entre dans un lieu sans refaire l'aventure.
// Chaque équipe vient avec ses badges, toutes les CS et un sac de départ.
import { createMon } from '../../odyssee/js/core/mon.js';

export const EQUIPES = [
  {
    id: 'debut', nom: 'Début d\'aventure', note: 'niv. 20, 2 badges',
    badges: 2, argent: 5000,
    pokemon: [[156, 20], [159, 20], [25, 20], [17, 19], [42, 19], [75, 20]],
    sac: { potion: 10, 'super-potion': 5, revive: 3, antidote: 3, 'paralyze-heal': 3, 'poke-ball': 10, 'great-ball': 5, 'escape-rope': 2 },
  },
  {
    id: 'milieu', nom: 'Milieu d\'aventure', note: 'niv. 35, 5 badges',
    badges: 5, argent: 15000,
    pokemon: [[157, 36], [160, 35], [26, 35], [65, 35], [59, 35], [76, 36]],
    sac: { 'super-potion': 10, 'hyper-potion': 5, revive: 5, 'full-heal': 5, 'great-ball': 10, 'ultra-ball': 5, 'escape-rope': 3 },
  },
  {
    id: 'didier', nom: 'Donjon de Didier', note: 'niv. 45, Ténèbres et Spectre',
    badges: 6, argent: 20000,
    pokemon: [[197, 45], [229, 45], [248, 45], [94, 45], [65, 44], [59, 44]],
    sac: { 'hyper-potion': 10, 'max-potion': 3, revive: 5, 'full-heal': 5, 'ultra-ball': 5, 'escape-rope': 2 },
  },
  {
    id: 'fin', nom: 'Fin de jeu', note: 'niv. 60, 8 badges',
    badges: 8, argent: 50000,
    pokemon: [[149, 60], [248, 60], [131, 60], [212, 60], [94, 60], [154, 60]],
    sac: { 'hyper-potion': 10, 'max-potion': 10, 'full-restore': 5, revive: 10, 'full-heal': 10, 'ultra-ball': 20, 'escape-rope': 5, 'max-repel': 5 },
  },
];

const CS = ['cs-coupe', 'cs-surf', 'cs-eclate', 'cs-vol', 'cs-flash', 'cs-force', 'cs-cascade'];
// drapeaux d'histoire levés d'office : pas de rival ni de scène d'introduction qui coupe un test
const DEJA_VU = ['intro', 'metProf', 'dex', 'rival1', 'rival2', 'rival3', 'rival4', 'rival5', 'rivalB1', 'rivalB2', 'rivalB3', 'rivalB4', 'passe', 'granitDock'];

/** partie prête : nom, équipe, sac, badges, position de départ */
export function partieTest(game, { nom, genre, equipe, lieu }) {
  const st = game.newState(nom, genre);
  const E = EQUIPES.find((q) => q.id === equipe) || EQUIPES[0];
  st.party = E.pokemon.map(([sp, lvl]) => createMon(sp, lvl, { ot: nom, met: 'TestOdyssée', shiny: false }));
  st.badges = Array.from({ length: 8 }, (_, i) => i < E.badges);
  st.money = E.argent;
  st.bag = { ...E.sac, 'town-map': 1 };
  for (const k of CS) st.bag[k] = 1;
  st.bag['cle-miroirs'] = 1;
  for (const k of DEJA_VU) st.flags[k] = true;
  st.flags.starter = st.party[0].sp; st.flags.rivalSp = st.party[0].sp;
  for (const m of st.party) { if (!st.dex.caught.includes(m.sp)) st.dex.caught.push(m.sp); if (!st.dex.seen.includes(m.sp)) st.dex.seen.push(m.sp); }
  st.visited = Object.values(game.world.towns).map((t) => t.id);
  Object.assign(st, { map: lieu.map, x: lieu.x, y: lieu.y, dir: lieu.dir || 'down' });
  st.lastCenter = { map: lieu.map, x: lieu.x, y: lieu.y, dir: lieu.dir || 'down' };
  st.equipeTest = E.id;
  return st;
}
