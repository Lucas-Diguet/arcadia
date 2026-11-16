// testodyssee/js/donjons/course.js — la Grande Course : un donjon de 1 à 4 joueurs où l'on fait la course.
//
// Tout le monde part en même temps de la ligne de départ (l'arbitre lance le compte à rebours) et traverse les mêmes
// salles : les mêmes dresseurs, les mêmes casse-têtes (tirés de la même graine pour tous). Chacun avance pour lui :
// ses dresseurs battus, ses casse-têtes résolus, ses grilles ouvertes ne comptent que pour lui, et on ne voit pas les
// autres coureurs (pas question de les suivre). Le premier à franchir la ligne d'arrivée gagne. Chacun garde son
// équipe ; perdre un combat coûte du temps (l'équipe est soignée, on repart après une pénalité).
// Mécaniques dans js/donjon/course.js.

import { GameMap } from '../../../odyssee/js/world/mapgen.js';
import { T } from '../../../odyssee/js/world/tiles.js';

/** l'extérieur : un stade, sa piste en sable et ses drapeaux, la porte des coureurs au fond */
function exterieur() {
  const m = new GameMap('labo:course:dehors', 30, 22, { outdoor: true, fill: T.TREE, name: 'Stade de la Grande Course', music: 'route' });
  m.rect(3, 2, 26, 19, T.GRASS, [T.TREE]);
  m.rect(5, 8, 24, 17, T.SAND);
  m.rect(9, 11, 20, 14, T.GRASS);
  const b = m.building('gym', 11, 2, { name: 'La Grande Course', roof: 'red' });
  for (let y = b.doorY + 1; y <= 8; y++) m.set(b.doorX, y, T.PAVE);
  for (const [x, y] of [[6, 7], [23, 7], [6, 18], [23, 18]]) m.prop('lanterne', x, y);
  m.zone(0, 0, 29, 21, { name: 'Stade de la Grande Course', music: 'route' });
  return { carte: m, porte: [b.doorX, b.doorY], arrivee: [b.doorX, 16] };
}

const dres = (cls, nom, sprite, dir, defi, equipe) => ({ cls, nom, sprite, dir, defi, equipe });

export default {
  id: 'course',
  carte: 'labo:course',
  nom: 'La Grande Course',
  niveau: 'niv. 60',
  entree: 'Tout le monde part en même temps, mêmes dresseurs, mêmes énigmes. Le premier à franchir la ligne gagne.',
  joueurs: { mode: 'entre', min: 1, max: 4 },
  musique: 'route',
  equipe: 'fin',
  course: true,
  exterieur,
  decor: { '*': 'brasero', '%': 'colonne', '&': 'vase' },
  objets: {
    // départ : l'arbitre, la grille qui s'ouvre au top, le tableau des résultats
    A: { type: 'arbitre', sol: true },
    G: { type: 'grilleCourse', sol: true, cle: 'depart' },
    T: { type: 'tableauCourse', decor: 'panneau_bois' },
    // le Défilé : deux dresseurs qui barrent le passage
    u: { type: 'dresseurCourse', sol: true, cle: 'u', dresseur: dres('Coureur', 'Rapide', 'karateka', 'down', 'Tu ne passeras pas sans me battre !', [[178, 58], [65, 58], [428, 59]]) },
    v: { type: 'dresseurCourse', sol: true, cle: 'v', dresseur: dres('Coureuse', 'Véloce', 'randonneuse', 'down', 'Personne ne me double !', [[135, 59], [373, 58], [184, 59]]) },
    // la Salle des Urnes : les urnes du roi (la tour de Hanoï), puis la grille
    s: { type: 'steleCourse', decor: 'stele', jeu: 'hanoi', cle: 'urnes' },
    g: { type: 'grilleCourse', sol: true, cle: 'urnes' },
    // la Salle de la Fresque : un dresseur, puis la fresque à reconstituer, puis la grille
    w: { type: 'dresseurCourse', sol: true, cle: 'w', dresseur: dres('Marathonienne', 'Endurance', 'topdresseuse', 'down', 'Dernière ligne droite ? Pas pour toi.', [[248, 60], [282, 60], [468, 60], [609, 59]]) },
    f: { type: 'steleCourse', decor: 'stele', jeu: 'puzzle', cle: 'fresque' },
    h: { type: 'grilleCourse', sol: true, cle: 'fresque' },
    // l'arrivée
    z: { type: 'arrivee', sol: true, decor: 'carpet' },
  },
  textes: { perdu: 'Ton équipe est soignée... mais tu as perdu un temps précieux.' },
  salles: [
    { id: 'c0', nom: 'Ligne de départ', type: 'libre', plan: [
      '#################',
      '########N########',
      '########G########',
      '#...............#',
      '#..*.........*..#',
      '#.......A.......#',
      '#...............#',
      '#..T............#',
      '#...............#',
      '########S########',
      '########D########',
    ] },
    { id: 'c1', nom: 'Le Défilé', type: 'libre', plan: [
      '#################',
      '########N########',
      '########.########',
      '########v########',
      '########.########',
      '#...............#',
      '#...............#',
      '#....%.....%....#',
      '#...............#',
      '########.########',
      '########u########',
      '########.########',
      '#...............#',
      '#...............#',
      '########S########',
      '########D########',
    ] },
    { id: 'c2', nom: 'Salle des Urnes', type: 'libre', plan: [
      '#################',
      '########N########',
      '########g########',
      '#...............#',
      '#.......s.......#',
      '#...............#',
      '#..&.........&..#',
      '#...............#',
      '########S########',
      '########D########',
    ] },
    { id: 'c3', nom: 'Salle de la Fresque', type: 'libre', plan: [
      '#################',
      '########N########',
      '########h########',
      '#...............#',
      '#.......f.......#',
      '#...............#',
      '########.########',
      '########w########',
      '########.########',
      '#...............#',
      '#...............#',
      '########S########',
      '########D########',
    ] },
    { id: 'c4', nom: 'Arrivée', type: 'libre', plan: [
      '#################',
      '#...............#',
      '#..*....T....*..#',
      '#...............#',
      '#zzzzzzzzzzzzzzz#',
      '#...............#',
      '#...............#',
      '########S########',
      '########D########',
    ] },
  ],
};
