// testodyssee/js/donjon/meubles.js — les salles à meubles (Bois des Contes) : des meubles lourds qu'on pousse avec Force
// pour se frayer un passage, et les autres épreuves de la maison de la sorcière (le seau du puits, les soufflets).
// Sans DOM : le solveur sert aux tests (la salle a-t-elle une solution ?).
import { BLOCAGE } from './jeux-tombeau.js';

/** le puits : le seau (le bloc doré) est coincé par des cales, il faut le faire glisser jusqu'à l'ouverture */
export const PUITS = { id: 'blocage', nom: 'Le seau coincé', jeu: { ...BLOCAGE, NIVEAU: [[0, 2, 2, 'h'], [5, 0, 3, 'v'], [3, 3, 3, 'h'], [1, 0, 2, 'h'], [3, 5, 3, 'h'], [1, 1, 2, 'h'], [0, 5, 2, 'h'], [1, 4, 2, 'h'], [2, 2, 2, 'v']] },
  aide: 'Flèches : bouger · A : saisir une cale ou le seau, flèches pour glisser · Menu : recommencer · B : quitter' };
/** les soufflets du four : celui de droite, celui de gauche, puis celui du milieu */
export const ORDRE_SOUFFLETS = [2, 0, 1];

/** lit une salle : `murs` (cases pleines), `meubles` (cases des meubles à pousser), `interdit` (cases où un meuble ne va pas) */
export function lireSalle(plan, { meubles, plein, interdit = '' }) {
  const S = { w: Math.max(...plan.map((r) => r.length)), h: plan.length, murs: new Set(), meubles: [], interdit: new Set(), marques: {} };
  plan.forEach((r, y) => [...r.padEnd(S.w, '#')].forEach((c, x) => {
    const k = x + ',' + y;
    if (c === '#' || plein.includes(c)) S.murs.add(k);
    else if (meubles.includes(c)) S.meubles.push(k);
    if (interdit.includes(c)) S.interdit.add(k);
    if (c !== '#' && c !== '.') (S.marques[c] ||= []).push([x, y]);
  }));
  return S;
}

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
/** les cases que le joueur atteint sans rien pousser */
function atteint(S, meubles, depart) {
  const vu = new Set([depart]), f = [depart];
  while (f.length) {
    const [x, y] = f.pop().split(',').map(Number);
    for (const [dx, dy] of DIRS) { const k = (x + dx) + ',' + (y + dy); if (vu.has(k) || S.murs.has(k) || meubles.has(k) || x + dx < 0 || y + dy < 0 || x + dx >= S.w || y + dy >= S.h) continue; vu.add(k); f.push(k); }
  }
  return vu;
}
/** le plus petit nombre de poussées pour arriver à côté de la case `but` depuis `depart` ; -1 s'il n'y en a pas */
export function resoudreMeubles(S, depart, but, limite = 400000) {
  const d0 = depart.join(','), [bx, by] = but;
  const pres = (vu) => DIRS.some(([dx, dy]) => vu.has((bx + dx) + ',' + (by + dy)));
  const cle = (meubles, vu) => [...meubles].sort().join(';') + '|' + [...vu].sort()[0];
  let f = [new Set(S.meubles)], n = 0; const vus = new Set();
  { const vu = atteint(S, f[0], d0); if (pres(vu)) return 0; vus.add(cle(f[0], vu)); }
  const pos = new Map([[f[0], d0]]);
  while (f.length && vus.size < limite) {
    const g = [];
    for (const M of f) {
      const vu = atteint(S, M, pos.get(M));
      for (const m of M) {
        const [x, y] = m.split(',').map(Number);
        for (const [dx, dy] of DIRS) {
          const derriere = (x - dx) + ',' + (y - dy), devant = (x + dx) + ',' + (y + dy);
          if (!vu.has(derriere) || S.murs.has(devant) || M.has(devant) || S.interdit.has(devant) || x + dx < 0 || y + dy < 0 || x + dx >= S.w || y + dy >= S.h) continue;
          const N = new Set(M); N.delete(m); N.add(devant);
          const v2 = atteint(S, N, m), k = cle(N, v2);
          if (vus.has(k)) continue; vus.add(k);
          if (pres(v2)) return n + 1;
          pos.set(N, m); g.push(N);
        }
      }
    }
    f = g; n++;
  }
  return -1;
}
