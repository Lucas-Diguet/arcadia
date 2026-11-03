// testodyssee/js/donjons/didier.js — le donjon de Didier : un petit donjon à trois pour essayer les questions,
// les clés, le journal, l'ascenseur et le combat à plusieurs contre un boss.
//
// Salle des Adeptes : un grand panneau à l'entrée, un ascenseur à trois serrures au centre, et trois Adeptes de l'X
// aux extrémités. Chacun pose une question sur un grec ; une bonne réponse ouvre un combat, et la victoire donne
// une clé. Une mauvaise réponse coûte la moitié des PV de toute l'équipe (puis tout sauf 1 PV, puis plus rien).
// Bureau de Pierre : on y monte par l'ascenseur. Quand tous les joueurs présents ont parlé au personnage masqué,
// le combat à plusieurs contre le Spectre de Pierre Chartier commence (barre de vie à trois blocs).
// Dehors : une grande bâtisse grise derrière une cour pavée.
import { SPECTRE_PIERRE } from '../contenu.js';
import { GameMap, rng } from '../../../odyssee/js/world/mapgen.js';
import { T } from '../../../odyssee/js/world/tiles.js';

/** l'extérieur : carte d'Odyssée ordinaire (comme les lieux annexes de odyssee/js/world/quetes.js) */
function exterieur() {
  const m = new GameMap('labo:didier:dehors', 34, 26, { outdoor: true, fill: T.TREE, name: 'Cour de Didier', music: 'city' });
  m.blob(17, 13, 13.5, 10.5, T.GRASS, rng(2007));
  m.rect(5, 3, 28, 22, T.GRASS, [T.TREE]);
  const b = m.building('bighouse', 14, 4, { roof: 'gray', name: 'Donjon de Didier' });
  // cour pavée devant la façade, allée jusqu'en bas
  m.rect(9, b.doorY + 1, 24, 18, T.PAVE);
  for (let y = 19; y <= 23; y++) { m.set(b.doorX, y, T.PAVE); m.set(b.doorX + 1, y, T.PAVE); }
  // massifs de fleurs de part et d'autre de la façade, haies devant
  m.rect(9, 5, 12, 6, T.FLOWER, [T.GRASS]); m.rect(21, 5, 24, 6, T.FLOWER, [T.GRASS]);
  for (const x of [8, 10, 12]) m.prop('bush', x, 8);
  for (const x of [21, 23, 25]) m.prop('bush', x, 8);
  // fontaine au milieu, lampadaires aux coins, bancs
  m.prop('fontaine', b.doorX, 14);
  for (const [x, y] of [[9, 11], [24, 11], [9, 18], [24, 18]]) m.prop('lamp', x, y);
  m.prop('banc', 12, 16); m.prop('banc', 21, 16);
  m.zone(0, 0, 33, 25, { name: 'Cour de Didier', music: 'city' });
  return { carte: m, porte: [b.doorX, b.doorY], panneau: [b.doorX + 3, 20] };
}

export default {
  id: 'didier',
  carte: 'labo:didier',
  nom: 'Donjon de Didier',
  niveau: 'niv. 45',
  entree: 'Ici, une mauvaise réponse coûte plus cher qu\'une mauvaise position.',
  joueurs: { mode: 'groupe', n: 3 },
  exterieur,
  musique: 'tower',
  equipe: 'didier',
  plan: [
    '##########################',
    '#######..............#####',
    '#####..X.....B......X..###',
    '#####..T............T..###',
    '#####..................###',
    '######..C....U....C...####',
    '#######..............#####',
    '##########################',
    '##########################',
    '############...###########',
    '############.y.###########',
    '###########.....##########',
    '########.............#####',
    '######..T....C....T..#####',
    '###...................####',
    '#.x......................z.#',
    '###..........E..........###',
    '######..................###',
    '######..T...PPP.....T..####',
    '########.............######',
    '##########.....###########',
    '##########.....###########',
    '############S#############',
    '############D#############',
  ],
  decor: { T: 'brasero', C: 'colonne', X: 'squelette' },
  objets: {
    P: { type: 'panneau', texte: 'Bienvenue, nobles aventuriers, dans le donjon de Didier.\nUne grande récompense sera offerte aux valeureux qui complèteront cette mission.' },
    E: { type: 'ascenseur', vers: 'U', salle: 's1', serrures: 3 },
    U: { type: 'ascenseur', vers: 'E' },
  },
  pnj: {
    x: { id: 'delta', cls: 'Adepte', nom: 'de l\'X', sprite: 'spectrel', dir: 'right', bs: 'brume', quiz: 'delta', cle: 'Clé du Delta', equipe: [[92, 30], [353, 30]] },
    y: { id: 'gamma', cls: 'Adepte', nom: 'de l\'X', sprite: 'spectrel', dir: 'down', bs: 'brume', quiz: 'gamma', cle: 'Clé du Gamma', equipe: [[355, 31], [200, 30]] },
    z: { id: 'vega', cls: 'Adepte', nom: 'de l\'X', sprite: 'spectrel', dir: 'left', bs: 'brume_f', quiz: 'vega', cle: 'Clé du Vega', equipe: [[425, 30], [93, 31]] },
    B: { id: 'pierre', cls: '', nom: 'Pierre Chartier', sprite: 'nocturne', dir: 'down', raid: true, espece: SPECTRE_PIERRE, niveau: 48 },
  },
  salles: [
    { id: 's1', nom: 'Salle des Adeptes', type: 'serrures', repere: 'S', pnj: ['x', 'y', 'z'] },
    { id: 'boss', nom: 'Bureau de Pierre', type: 'raid', pnj: ['B'] },
  ],
  journal: [
    { id: 'ascenseur', nom: 'Débloquer l\'ascenseur', salle: 's1', but: 'Trois Adeptes de l\'X gardent les clés de l\'ascenseur. Réponds à leur question, bats-les, puis mets les clés dans les serrures.' },
  ],
  // la bonne réponse est toujours la première : l'ordre est mélangé à l'affichage
  questions: {
    delta: {
      q: 'Qu\'est-ce que le delta d\'une option ?',
      r: ['La variation du prix de l\'option quand le prix du sous-jacent varie de 1', 'La probabilité exacte que l\'option finisse dans la monnaie', 'La variation du prix de l\'option quand la volatilité implicite varie de 1 point', 'L\'écart entre le prix du sous-jacent et le prix d\'exercice'],
    },
    gamma: {
      q: 'Qu\'est-ce que le gamma d\'une option ?',
      r: ['La variation du delta quand le prix du sous-jacent varie de 1', 'La variation du delta quand la volatilité varie', 'La variation du prix de l\'option quand le taux sans risque varie de 1 %', 'La perte de valeur de l\'option en un jour, toutes choses égales par ailleurs'],
    },
    vega: {
      q: 'Qu\'est-ce que le vega d\'une option ?',
      r: ['La variation du prix de l\'option pour une hausse de 1 point de la volatilité implicite', 'L\'écart-type annualisé des rendements du sous-jacent', 'La variation du vega quand la volatilité varie', 'La variation du prix de l\'option quand il reste un jour de moins avant l\'échéance'],
      bonus: 'Et vega n\'est même pas une lettre grecque...',
    },
  },
  textes: {
    adepte: 'Halte. Nul ne prend ma clé sans connaître les grecs.',
    juste: 'Exact. Voyons maintenant si tes Pokémon sont aussi savants que toi !',
    faux: 'Faux ! Les marchés ne pardonnent pas l\'ignorance...',
    cleDonnee: 'Tu as gagné ma clé. Ton équipe est soignée : va, et ouvre l\'ascenseur.',
    ascenseur: 'Un vieil ascenseur. Sa grille est fermée par trois serrures.',
    masque: 'Un personnage masqué te tourne le dos. Il attend que tout le monde soit là.',
    cri: 'PIERRE, PIERRE CHARTIER X2007 HEAD OF TRADING VOL ET HYBRIDE !!!',
    apres: 'ok guyyyyysss...',
    perdu: ['Tes Pokémon n\'en peuvent plus...', 'Tu te réveilles à l\'entrée du donjon. Ton équipe a été soignée.'],
  },
  recompense: { objets: { 'panini-chateauroux': 1 } },
};
