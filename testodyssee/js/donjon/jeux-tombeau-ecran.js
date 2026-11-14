// testodyssee/js/donjon/jeux-tombeau-ecran.js — l'écran des casse-têtes de la sépulture : un cadre, un canvas,
// les touches d'Odyssée (flèches, A, B, Menu). Les règles sont dans jeux-tombeau.js.
import { el } from '../../../odyssee/js/ui/ui.js';
import { PUZZLE, BILLES, HANOI, BLOCAGE, SOLEILS } from './jeux-tombeau.js';

const IMG = new URL('../../img/tombeau/', import.meta.url).href;
let fresque = null;
const imageFresque = () => fresque || (fresque = Object.assign(new Image(), { src: IMG + 'fresque.png' }));

const SABLE = '#d8b878', SABLE2 = '#b89458', PIERRE = '#6c6470', PIERRE2 = '#8c8490', NOIR = '#1c1418', OR = '#f0c050', OR2 = '#a87020';
const rond = (x, cx, cy, r, f, t) => { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); if (f) { x.fillStyle = f; x.fill(); } if (t) { x.strokeStyle = t; x.lineWidth = 2; x.stroke(); } };
const curseur = (x, X, Y, w, h, c = '#ff5040') => { x.strokeStyle = c; x.lineWidth = 3; x.strokeRect(X + 1.5, Y + 1.5, w - 3, h - 3); };

const DESSINS = {
  puzzle(x, e) {
    const C = 44, img = imageFresque(), part = (p, X, Y) => { if (img.complete && img.naturalWidth) x.drawImage(img, (p % 3) * 32, Math.floor(p / 3) * 32, 32, 32, X, Y, C, C); else { x.fillStyle = OR; x.fillRect(X, Y, C, C); } x.strokeStyle = NOIR; x.lineWidth = 1; x.strokeRect(X + 0.5, Y + 0.5, C - 1, C - 1); };
    x.canvas.width = 7 * C; x.canvas.height = 5 * C;
    for (let y = 0; y < 5; y++) for (let X = 0; X < 7; X++) {
      x.fillStyle = PUZZLE.dansCadre(X, y) ? '#3a2c24' : (X + y) % 2 ? SABLE : SABLE2; x.fillRect(X * C, y * C, C, C);
      const p = e.cases[y * 7 + X]; if (p != null) part(p, X * C, y * C);
    }
    x.strokeStyle = OR2; x.lineWidth = 3; x.strokeRect(2 * C - 1.5, C - 1.5, 3 * C + 3, 3 * C + 3);
    if (e.tenue != null) { x.globalAlpha = 0.85; part(e.tenue, e.cur[0] * C + 6, e.cur[1] * C - 6); x.globalAlpha = 1; }
    curseur(x, e.cur[0] * C, e.cur[1] * C, C, C);
  },
  billes(x, e) {
    const C = 40; x.canvas.width = 7 * C; x.canvas.height = 7 * C;
    x.fillStyle = '#5a3c26'; x.fillRect(0, 0, 7 * C, 7 * C);
    for (let y = 0; y < 7; y++) for (let X = 0; X < 7; X++) {
      if (!BILLES.trou(X, y)) continue;
      const cx = X * C + C / 2, cy = y * C + C / 2;
      rond(x, cx, cy, 9, '#2a1a10');
      if (e.billes.has(X + ',' + y)) { const pr = e.prise && e.prise[0] === X && e.prise[1] === y; rond(x, cx, cy, 13, pr ? '#ffe890' : OR, OR2); rond(x, cx - 4, cy - 4, 3, '#fff6d0'); }
    }
    curseur(x, e.cur[0] * C, e.cur[1] * C, C, C);
  },
  hanoi(x, e) {
    const W = 3 * 120, H = 200; x.canvas.width = W; x.canvas.height = H;
    x.fillStyle = '#3a2c24'; x.fillRect(0, 0, W, H); x.fillStyle = SABLE2; x.fillRect(0, H - 20, W, 20);
    const COUL = ['#3070c0', '#40a0a0', '#e0b040', '#c05030'];
    e.piliers.forEach((p, i) => {
      const cx = i * 120 + 60; x.fillStyle = PIERRE2; x.fillRect(cx - 4, 50, 8, H - 70);
      p.forEach((n, k) => { x.fillStyle = COUL[n - 1]; x.fillRect(cx - 12 - n * 10, H - 20 - (k + 1) * 22, 24 + n * 20, 20); x.strokeStyle = NOIR; x.lineWidth = 1; x.strokeRect(cx - 12 - n * 10 + 0.5, H - 20 - (k + 1) * 22 + 0.5, 24 + n * 20 - 1, 19); });
    });
    const cx = e.cur * 120 + 60;
    if (e.tenu != null) { x.fillStyle = COUL[e.tenu - 1]; x.fillRect(cx - 12 - e.tenu * 10, 14, 24 + e.tenu * 20, 20); }
    x.fillStyle = '#ff5040'; x.beginPath(); x.moveTo(cx - 8, H - 14); x.lineTo(cx + 8, H - 14); x.lineTo(cx, H - 4); x.fill();
  },
  blocage(x, e) {
    const C = 44, N = BLOCAGE.N; x.canvas.width = N * C + 16; x.canvas.height = N * C;
    x.fillStyle = '#3a2c24'; x.fillRect(0, 0, N * C, N * C);
    for (let y = 0; y < N; y++) for (let X = 0; X < N; X++) { x.strokeStyle = '#4a3a30'; x.strokeRect(X * C + 0.5, y * C + 0.5, C - 1, C - 1); }
    x.fillStyle = OR; x.fillRect(N * C, 2 * C + 6, 16, C - 12);
    e.blocs.forEach((b, i) => {
      const l = BLOCAGE.cases(b), [x0, y0] = l[0], [x1, y1] = l[l.length - 1];
      x.fillStyle = i === 0 ? OR : e.saisi === i ? PIERRE2 : PIERRE; x.fillRect(x0 * C + 3, y0 * C + 3, (x1 - x0 + 1) * C - 6, (y1 - y0 + 1) * C - 6);
      x.strokeStyle = i === 0 ? OR2 : NOIR; x.lineWidth = 2; x.strokeRect(x0 * C + 4, y0 * C + 4, (x1 - x0 + 1) * C - 8, (y1 - y0 + 1) * C - 8);
      if (e.saisi === i) { x.strokeStyle = '#ffffff'; x.strokeRect(x0 * C + 1, y0 * C + 1, (x1 - x0 + 1) * C - 2, (y1 - y0 + 1) * C - 2); }
    });
    curseur(x, e.cur[0] * C, e.cur[1] * C, C, C);
  },
  soleils(x, e) {
    const C = 52; x.canvas.width = 5 * C; x.canvas.height = 5 * C;
    for (let y = 0; y < 5; y++) for (let X = 0; X < 5; X++) {
      const on = e.allume[y * 5 + X]; x.fillStyle = on ? '#a07838' : '#3a3036'; x.fillRect(X * C + 2, y * C + 2, C - 4, C - 4);
      if (on) { rond(x, X * C + C / 2, y * C + C / 2, 13, OR, OR2); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; x.strokeStyle = OR; x.lineWidth = 2; x.beginPath(); x.moveTo(X * C + C / 2 + Math.cos(a) * 16, y * C + C / 2 + Math.sin(a) * 16); x.lineTo(X * C + C / 2 + Math.cos(a) * 21, y * C + C / 2 + Math.sin(a) * 21); x.stroke(); } }
      else rond(x, X * C + C / 2, y * C + C / 2, 12, null, '#54484e');
    }
    curseur(x, e.cur[0] * C, e.cur[1] * C, C, C);
  },
};

/** joue un casse-tête (def de JEUX_SEPULTURE) ; vrai s'il est résolu, faux si le joueur abandonne */
export function jouerCasseTete(game, def) {
  const ui = game.ui, jeu = def.jeu, e = jeu.nouveau();
  const box = el('div', 'box tombeau-jeu');
  box.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:40;padding:10px 14px;text-align:center;display:flex;flex-direction:column;gap:6px;align-items:center';
  const titre = el('div'), cv = document.createElement('canvas'), aide = el('div');
  titre.style.cssText = 'font-weight:600'; aide.style.cssText = 'font-size:13px;opacity:.8;max-width:360px';
  cv.style.cssText = 'image-rendering:pixelated;max-width:80vw;max-height:60vh;border-radius:4px';
  aide.textContent = def.aide; box.append(titre, cv, aide); ui.root.appendChild(box);
  const x = cv.getContext('2d');
  const dessiner = () => { x.imageSmoothingEnabled = false; DESSINS[def.id](x, e); titre.textContent = def.nom + (e.coups != null ? ` — ${e.coups} coup${e.coups > 1 ? 's' : ''}` : ''); };
  const img = imageFresque(); if (!img.complete) img.onload = dessiner;
  dessiner();
  return new Promise((res) => {
    const pop = ui.input.push((k) => {
      const r = jeu.touche(e, k);
      if (r === 'refus') ui.sound.sfx('bump');
      else if (k === 'a' || k === 'menu') ui.sound.sfx('select');
      else if (['up', 'down', 'left', 'right'].includes(k)) ui.sound.sfx('blip');
      dessiner();
      if (r === 'fini' || r === 'quitter') {
        pop();
        setTimeout(() => { box.remove(); res(r === 'fini'); }, r === 'fini' ? 600 : 0);
      }
    });
  });
}
