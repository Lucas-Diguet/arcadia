// testodyssee/js/donjons/crypte.js — la Crypte des Murmures : petit donjon à faire à plusieurs, sur le modèle des
// donjons de début de partie des MMO (une salle, un groupe d'adversaires, une porte qui s'ouvre, un boss au bout).
//
// Entrée : le gardien ouvre la crypte quand le groupe est prêt.
// Salles des Murmures et Ossuaire : trois esprits par salle, chacun se combat par un seul joueur à la fois.
// Salle des Dalles : tout le groupe doit se tenir sur les dalles en même temps (seul : une dalle suffit).
// Tombeau : Ossarion a des PV partagés ; chaque combat lui retire ce qu'on lui a infligé.
// Dehors : le Cimetière des Murmures, une clairière aux stèles dont la grotte mène à la crypte.
import { GameMap, rng } from '../../../odyssee/js/world/mapgen.js';
import { T } from '../../../odyssee/js/world/tiles.js';

/** l'extérieur : carte d'Odyssée ordinaire (comme les lieux annexes de odyssee/js/world/quetes.js) */
function exterieur() {
  const m = new GameMap('labo:crypte:dehors', 32, 26, { outdoor: true, fill: T.TREE, name: 'Cimetière des Murmures', music: 'mystic' });
  const r = rng(4417);
  m.blob(16, 13, 12.5, 10, T.GRASS, r);
  m.rect(5, 4, 26, 22, T.GRASS, [T.TREE]);
  // l'entrée de la crypte, au fond, et l'allée qui y mène
  const b = m.building('cave', 13, 3, { name: 'Crypte des Murmures' });
  for (let y = b.doorY + 1; y <= 23; y++) m.set(b.doorX, y, T.PATH);
  m.rect(14, 7, 16, 7, T.PATH);
  // clôture du cimetière, ouverte sur l'allée
  for (let x = 5; x <= 26; x++) if (x !== b.doorX) m.set(x, 18, T.FENCE);
  // stèles en rangées de part et d'autre de l'allée
  for (const y of [9, 12, 15]) for (const x of [8, 10, 12, 18, 20, 22]) m.prop('stele', x, y);
  m.prop('lanterne', b.doorX - 1, 10); m.prop('lanterne', b.doorX + 1, 10); m.prop('lanterne', b.doorX - 1, 15); m.prop('lanterne', b.doorX + 1, 15);
  for (const [x, y] of [[6, 8], [25, 9], [6, 15], [25, 15], [9, 21], [23, 21]]) m.prop('deadtree', x, y);
  m.prop('gargouille', b.x - 1, b.doorY); m.prop('gargouille', b.x + b.w, b.doorY);
  m.zone(0, 0, 31, 25, { name: 'Cimetière des Murmures', music: 'mystic' });
  return { carte: m, porte: [b.doorX, b.doorY], panneau: [b.doorX + 2, 19] };
}

export default {
  id: 'crypte',
  carte: 'labo:crypte',
  nom: 'Crypte des Murmures',
  niveau: 'niv. 20 à 30',
  // panneau d'entrée : nom, phrase, nombre de joueurs (plan.js, texteJoueurs)
  entree: 'On y descend à plusieurs. On en remonte... parfois.',
  joueurs: { mode: 'groupe', n: 3 },
  exterieur,
  musique: 'tower',
  plan: [
    '##########################',
    '#######............#######',
    '#####..X.....B....X..#####',
    '####..T............T..####',
    '####..................####',
    '#####..C..........C..#####',
    '#######............#######',
    '###########....###########',
    '############33############',
    '############..############',
    '#######............#######',
    '#####..T....o.....T..#####',
    '####..................####',
    '####..o............o..####',
    '#####.......X........#####',
    '#######............#######',
    '###########....###########',
    '############22############',
    '############..############',
    '#######.d..........#######',
    '#####..R..........R..#####',
    '####..e..........f....####',
    '####..................####',
    '#####..G..........G..#####',
    '#######............#######',
    '###########....###########',
    '############11############',
    '############..############',
    '#######..a.........#######',
    '#####..X..........X..#####',
    '####..b..........c....####',
    '####..................####',
    '#####..T..........T..#####',
    '#######............#######',
    '###########....###########',
    '############00############',
    '############..############',
    '#########..........#######',
    '########..C......C..######',
    '########...g........######',
    '########.....S......######',
    '#########..........#######',
    '#############D############',
  ],
  decor: { T: 'brasero', C: 'colonne', X: 'squelette', G: 'gargouille', R: 'caverock' },
  pnj: {
    g: { id: 'gardien', nom: 'Fossoyeur Anselme', sprite: 'vieil_homme', dir: 'right', gardien: true },
    a: { id: 'ame1', cls: 'Âme', nom: 'errante', sprite: 'medium', dir: 'down', equipe: [[92, 18], [353, 19]] },
    b: { id: 'ame2', cls: 'Âme', nom: 'errante', sprite: 'medium', dir: 'right', equipe: [[355, 20]] },
    c: { id: 'ame3', cls: 'Âme', nom: 'errante', sprite: 'medium', dir: 'left', equipe: [[104, 19], [92, 19]] },
    d: { id: 'os1', cls: 'Veilleur', nom: 'd\'os', sprite: 'pretre', dir: 'down', equipe: [[93, 23], [105, 22]] },
    e: { id: 'os2', cls: 'Veilleur', nom: 'd\'os', sprite: 'pretre', dir: 'right', equipe: [[354, 23], [355, 22]] },
    f: { id: 'os3', cls: 'Veilleur', nom: 'd\'os', sprite: 'pretre', dir: 'left', equipe: [[607, 22], [425, 23]] },
    B: { id: 'ossarion', cls: 'Gardien', nom: 'Ossarion', sprite: 'spectrel', dir: 'down', boss: true, equipe: [[105, 27]], bs: 'nox' },
  },
  salles: [
    { id: 'entree', nom: 'Entrée de la crypte', type: 'accueil', repere: 'S', porte: '0' },
    { id: 's1', nom: 'Salle des Murmures', type: 'combat', pnj: ['a', 'b', 'c'], porte: '1' },
    { id: 's2', nom: 'Ossuaire', type: 'combat', pnj: ['d', 'e', 'f'], porte: '2' },
    { id: 's3', nom: 'Salle des Dalles', type: 'dalles', repere: 'o', porte: '3' },
    { id: 'boss', nom: 'Tombeau d\'Ossarion', type: 'boss', pnj: ['B'], musique: 'sanctuary' },
  ],
  textes: {
    gardien: ['Halte. Derrière cette porte dort la Crypte des Murmures.', 'Trois salles et un tombeau. Les esprits ne se laissent affronter que par un dresseur à la fois : partagez-vous le travail.', 'Dans la Salle des Dalles, il faudra que tout le groupe tienne les dalles en même temps.', 'Et au fond, Ossarion. Chaque coup que vous lui portez compte pour tout le groupe.'],
    ouverture: ['Le fossoyeur tourne une vieille clé dans la pierre...', 'La porte de la crypte s\'ouvre !'],
    dalles: 'Une dalle de pierre usée. Elle bouge légèrement sous le pied.',
    victoire: ['Ossarion s\'effondre dans un nuage de poussière...', 'La crypte retombe dans le silence.'],
    perdu: ['Tes Pokémon n\'en peuvent plus...', 'Tu ressors de la crypte en titubant. Le fossoyeur soigne ton équipe.'],
  },
  recompense: { argent: 3000, objets: { 'rare-candy': 2, 'revive': 2 } },
};
