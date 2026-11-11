// testodyssee/js/donjons/champions.js — la Place des Champions : les 23 champions de fin de jeu alignés dans l'ordre
// (18 champions d'arène, le Conseil 4, le Maître). On parle à l'un d'eux pour l'affronter, tout le monde au niveau 100 ;
// on est soigné après chaque combat, sans message. Ceux qui n'ont pas encore d'équipe ne se combattent pas.
// L'organisatrice donne une équipe : la « fin de jeu » du labo au niveau 100, ou celle d'un champion.
// Équipes : js/champions.js ; combats et choix d'équipe : js/donjon/arenes.js.
import { CHAMPIONS, nomChampion } from '../champions.js';

const LETTRES = 'ABCEFGHIJKLMOPQRTUVWXYZ';
const largeur = CHAMPIONS.length * 2 + 3;
const ligne = (f) => '#' + Array.from({ length: largeur - 2 }, (_, i) => f(i)).join('') + '#';
const rang = ligne((i) => (i % 2 === 1 && (i >> 1) < CHAMPIONS.length ? LETTRES[i >> 1] : '.'));
const sous = ligne((i) => (i % 2 === 1 && (i >> 1) < CHAMPIONS.length ? 'n' : '.'));
const milieu = largeur >> 1;
const avec = (l, x, c) => l.slice(0, x) + c + l.slice(x + 1);

export default {
  id: 'champions',
  carte: 'labo:champions',
  nom: 'Place des Champions',
  niveau: 'niv. 100',
  joueurs: { mode: 'solo' },
  solo: true,
  arene: true,
  style: 'clair',
  musique: 'league',
  equipe: 'fin100',
  textes: { perdu: '' },
  decor: {},
  objets: {
    n: { type: 'tapis', sol: true, decor: 'carpet' },
    q: { type: 'panneau', texte: 'Place des Champions.\nParle à un champion pour l\'affronter. Tout le monde est au niveau 100.\nL\'organisatrice te prête une équipe.' },
  },
  pnj: {
    ...Object.fromEntries(CHAMPIONS.map((c, i) => [LETTRES[i], { id: 'champion-' + c.rang, champion: c, toujours: true, cls: '', nom: nomChampion(c), sprite: c.sprite, dir: 'down' }])),
    a: { id: 'organisatrice', organisatrice: true, toujours: true, cls: 'Organisatrice', nom: 'Pia', sprite: 'scientifique', dir: 'up' },
  },
  salles: [
    { id: 'place', nom: 'Place des Champions', type: 'libre', repere: 'S', plan: [
      // des rangées de mur au-dessus : la caméra peut montrer les champions en entier
      '#'.repeat(largeur), '#'.repeat(largeur), '#'.repeat(largeur),
      rang,
      sous,
      ligne(() => '.'),
      avec(avec(ligne(() => '.'), milieu - 2, 'a'), milieu + 2, 'q'),
      avec(ligne(() => '.'), milieu, 'S'),
      ligne(() => '.'),
      ligne(() => '.'),
      '#'.repeat(largeur),
    ] },
  ],
};
