// testodyssee/js/donjon/jeux-tombeau.js — les cinq casse-têtes de la sépulture du Roi Sans Nom (sans DOM).
// Chaque jeu : nouveau(alea) → un état ; touche(état, k) avec k parmi up/down/left/right/a/b → l'état change sur place,
// renvoie 'fini' quand le casse-tête est résolu, 'quitter' quand le joueur abandonne, sinon rien ; resolu(état).
// L'écran (jeux-tombeau-ecran.js) ne fait que dessiner l'état.

const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const melanger = (l, alea) => { for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(alea() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l; };

/* ---------- 1. le puzzle à neuf pièces (comme ceux des Ruines d'Alpha) ----------
 * un plateau de 7 × 5 cases : le cadre de 3 × 3 au milieu, les pièces mélangées tout autour.
 * On prend une pièce (A), on la pose sur une case libre (A) ; B repose la pièce tenue là où elle était. */
export const PUZZLE = {
  W: 7, H: 5, cadre: [2, 1],
  dansCadre(x, y) { return x >= 2 && x <= 4 && y >= 1 && y <= 3; },
  nouveau(alea = Math.random) {
    const autour = [];
    for (let y = 0; y < 5; y++) for (let x = 0; x < 7; x++) if (!this.dansCadre(x, y)) autour.push([x, y]);
    const places = melanger(autour, alea).slice(0, 9), cases = Array(35).fill(null);
    places.forEach(([x, y], p) => { cases[y * 7 + x] = p; });
    return { cases, cur: [3, 2], tenue: null, depuis: null };
  },
  /** la pièce p va en (2 + p % 3, 1 + p / 3) */
  resolu(e) { for (let p = 0; p < 9; p++) if (e.cases[(1 + Math.floor(p / 3)) * 7 + 2 + (p % 3)] !== p) return false; return true; },
  touche(e, k) {
    if (DIRS[k]) { const [dx, dy] = DIRS[k]; e.cur = [(e.cur[0] + dx + 7) % 7, (e.cur[1] + dy + 5) % 5]; return; }
    const i = e.cur[1] * 7 + e.cur[0];
    if (k === 'a') {
      if (e.tenue == null) { if (e.cases[i] != null) { e.tenue = e.cases[i]; e.depuis = i; e.cases[i] = null; } return; }
      if (e.cases[i] != null) return;
      e.cases[i] = e.tenue; e.tenue = null; e.depuis = null;
      return this.resolu(e) ? 'fini' : undefined;
    }
    if (k === 'b') { if (e.tenue == null) return 'quitter'; e.cases[e.depuis] = e.tenue; e.tenue = null; e.depuis = null; }
  },
};

/* ---------- 2. le solitaire : des billes qui sautent par-dessus leurs voisines ----------
 * le plateau en croix de 33 trous, la « pyramide » de 16 billes ; il doit n'en rester qu'une.
 * A sur une bille la prend, A sur un trou à deux cases (une bille entre les deux) l'y fait sauter ; B lâche la bille,
 * Menu recommence. */
export const BILLES = {
  N: 7,
  trou(x, y) { return x >= 0 && y >= 0 && x < 7 && y < 7 && ((x >= 2 && x <= 4) || (y >= 2 && y <= 4)); },
  depart() {
    const s = new Set();
    s.add('3,1'); for (const x of [2, 3, 4]) s.add(x + ',2'); for (let x = 1; x <= 5; x++) s.add(x + ',3'); for (let x = 0; x <= 6; x++) s.add(x + ',4');
    return s;
  },
  nouveau() { return { billes: this.depart(), cur: [3, 3], prise: null, coups: 0 }; },
  resolu(e) { return e.billes.size === 1; },
  /** le saut de (x, y) vers (u, v) est-il permis ? */
  saut(e, [x, y], [u, v]) {
    const dx = u - x, dy = v - y;
    if (!((Math.abs(dx) === 2 && dy === 0) || (Math.abs(dy) === 2 && dx === 0))) return false;
    return this.trou(u, v) && e.billes.has(x + ',' + y) && !e.billes.has(u + ',' + v) && e.billes.has((x + dx / 2) + ',' + (y + dy / 2));
  },
  sauter(e, de, vers) {
    const [x, y] = de, [u, v] = vers;
    e.billes.delete(x + ',' + y); e.billes.delete((x + u) / 2 + ',' + (y + v) / 2); e.billes.add(u + ',' + v); e.coups++;
  },
  touche(e, k) {
    if (DIRS[k]) {
      const [dx, dy] = DIRS[k]; let [x, y] = e.cur;
      for (let n = 0; n < 7; n++) { x = (x + dx + 7) % 7; y = (y + dy + 7) % 7; if (this.trou(x, y)) break; }
      e.cur = [x, y]; return;
    }
    if (k === 'menu') { Object.assign(e, this.nouveau(), { cur: e.cur }); return; }
    if (k === 'b') { if (e.prise) { e.prise = null; return; } return 'quitter'; }
    if (k !== 'a') return;
    const ici = e.cur.join();
    if (e.billes.has(ici)) { e.prise = e.prise && e.prise.join() === ici ? null : e.cur.slice(); return; }
    if (e.prise && this.saut(e, e.prise, e.cur)) { this.sauter(e, e.prise, e.cur); e.prise = null; return this.resolu(e) ? 'fini' : undefined; }
  },
  /** encore un saut possible ? */
  bloque(e) {
    for (const b of e.billes) { const [x, y] = b.split(',').map(Number); for (const [dx, dy] of Object.values(DIRS)) if (this.saut(e, [x, y], [x + 2 * dx, y + 2 * dy])) return false; }
    return true;
  },
};

/* ---------- 3. les tours de Hanoï : les urnes du roi ----------
 * quatre disques sur le pilier de gauche, à empiler sur celui de droite, jamais un grand sur un petit.
 * Gauche / droite : le pilier ; A prend le disque du dessus, A le pose ; B le repose. */
export const HANOI = {
  N: 4,
  nouveau() { return { piliers: [[4, 3, 2, 1], [], []], cur: 0, tenu: null, depuis: null, coups: 0 }; },
  resolu(e) { return e.tenu == null && e.piliers[2].length === this.N; },
  touche(e, k) {
    if (k === 'left') { e.cur = (e.cur + 2) % 3; return; }
    if (k === 'right') { e.cur = (e.cur + 1) % 3; return; }
    if (k === 'b') { if (e.tenu == null) return 'quitter'; e.piliers[e.depuis].push(e.tenu); e.tenu = null; return; }
    if (k !== 'a') return;
    const p = e.piliers[e.cur];
    if (e.tenu == null) { if (p.length) { e.tenu = p.pop(); e.depuis = e.cur; } return; }
    if (p.length && p[p.length - 1] < e.tenu) return 'refus';
    p.push(e.tenu); if (e.cur !== e.depuis) e.coups++; e.tenu = null;
    return this.resolu(e) ? 'fini' : undefined;
  },
};

/* ---------- 4. le blocage (comme Rush Hour) : sortir le sarcophage d'or ----------
 * 6 × 6 cases ; des blocs de pierre couchés (h) ou debout (v), de 2 ou 3 cases ; le sarcophage d'or (bloc 0, couché,
 * ligne 2) sort par l'ouverture de droite. Le curseur choisit un bloc (A le saisit), les flèches le font glisser dans
 * son sens, A ou B le lâche ; B sans bloc saisi : abandonner. */
export const BLOCAGE = {
  N: 6,
  // [x, y, longueur, sens] ; le premier est le sarcophage d'or
  NIVEAU: [[0, 2, 2, 'h'], [5, 2, 2, 'v'], [3, 4, 2, 'v'], [2, 1, 3, 'v'], [0, 0, 2, 'h'], [3, 2, 2, 'v'], [0, 3, 2, 'v'], [1, 4, 2, 'h'], [5, 0, 2, 'v'], [4, 3, 3, 'v']],
  nouveau() { return { blocs: this.NIVEAU.map((b) => b.slice()), cur: [0, 2], saisi: null, coups: 0 }; },
  cases(b) { const [x, y, n, s] = b, l = []; for (let k = 0; k < n; k++) l.push(s === 'h' ? [x + k, y] : [x, y + k]); return l; },
  occupe(e, x, y, sauf) { return e.blocs.some((b, i) => i !== sauf && this.cases(b).some(([u, v]) => u === x && v === y)); },
  blocEn(e, x, y) { return e.blocs.findIndex((b) => this.cases(b).some(([u, v]) => u === x && v === y)); },
  resolu(e) { const [x, y] = e.blocs[0]; return y === 2 && x + e.blocs[0][2] === this.N; },
  /** fait glisser le bloc i d'une case ; vrai s'il a bougé */
  glisser(e, i, dx, dy) {
    const b = e.blocs[i]; if ((b[3] === 'h' && dy) || (b[3] === 'v' && dx)) return false;
    const [x, y] = b, nx = x + dx, ny = y + dy, l = this.cases([nx, ny, b[2], b[3]]);
    if (l.some(([u, v]) => u < 0 || v < 0 || u >= this.N || v >= this.N || this.occupe(e, u, v, i))) return false;
    b[0] = nx; b[1] = ny; return true;
  },
  touche(e, k) {
    if (DIRS[k]) {
      const [dx, dy] = DIRS[k];
      if (e.saisi != null) { if (this.glisser(e, e.saisi, dx, dy)) { e.coups++; e.cur = [e.cur[0] + dx, e.cur[1] + dy]; if (this.resolu(e)) { e.saisi = null; return 'fini'; } } return; }
      e.cur = [Math.max(0, Math.min(5, e.cur[0] + dx)), Math.max(0, Math.min(5, e.cur[1] + dy))]; return;
    }
    if (k === 'menu') { Object.assign(e, this.nouveau(), { cur: e.cur }); return; }
    if (k === 'a') { if (e.saisi != null) { e.saisi = null; return; } const i = this.blocEn(e, ...e.cur); if (i >= 0) e.saisi = i; return; }
    if (k === 'b') { if (e.saisi != null) { e.saisi = null; return; } return 'quitter'; }
  },
  /** le plus petit nombre de glissements d'une case pour sortir le sarcophage (pour les tests) */
  solution(blocs = this.NIVEAU) {
    const cle = (l) => l.map((b) => b[0] + ',' + b[1]).join(';');
    const vus = new Set([cle(blocs)]); let f = [blocs.map((b) => b.slice())], n = 0;
    while (f.length) {
      const g = [];
      for (const l of f) {
        const e = { blocs: l };
        if (this.resolu(e)) return n;
        l.forEach((b, i) => {
          for (const [dx, dy] of Object.values(DIRS)) {
            const c = { blocs: l.map((q) => q.slice()) };
            if (!this.glisser(c, i, dx, dy)) continue;
            const k = cle(c.blocs); if (vus.has(k)) continue; vus.add(k); g.push(c.blocs);
          }
        });
      }
      f = g; n++;
    }
    return -1;
  },
};

/* ---------- 5. les dalles-soleils (comme Lights Out) ----------
 * 5 × 5 dalles ; en toucher une la retourne avec ses quatre voisines. Il faut que tous les soleils brillent.
 * Le départ vient de quelques dalles touchées au hasard depuis la solution : il a toujours une solution. */
export const SOLEILS = {
  N: 5,
  nouveau(alea = Math.random, coups = 7) {
    const e = { allume: Array(25).fill(true), cur: [2, 2], coups: 0 }, faits = new Set();
    while (faits.size < coups) faits.add(Math.floor(alea() * 25));
    for (const i of faits) this.retourner(e, i % 5, Math.floor(i / 5));
    if (this.resolu(e)) this.retourner(e, 2, 2);
    return e;
  },
  retourner(e, x, y) { for (const [u, v] of [[x, y], [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) if (u >= 0 && v >= 0 && u < 5 && v < 5) e.allume[v * 5 + u] = !e.allume[v * 5 + u]; },
  resolu(e) { return e.allume.every(Boolean); },
  touche(e, k) {
    if (DIRS[k]) { const [dx, dy] = DIRS[k]; e.cur = [(e.cur[0] + dx + 5) % 5, (e.cur[1] + dy + 5) % 5]; return; }
    if (k === 'b') return 'quitter';
    if (k === 'a') { this.retourner(e, ...e.cur); e.coups++; return this.resolu(e) ? 'fini' : undefined; }
  },
};

/** les versions simplifiées par Khamsin (les billes et les dalles-soleils) : le solitaire repart d'une position prise au
 *  milieu de sa solution (7 billes, 6 sauts), les dalles ne sont mélangées que de 2 coups. Recommencer (Menu) repart
 *  de la version simplifiée. */
export const SIMPLIFIES = {
  billes: { ...BILLES, depart() { return new Set(['3,1', '2,2', '5,2', '0,2', '3,2', '3,4', '3,3']); } },
  soleils: { ...SOLEILS, nouveau(alea = Math.random) { return SOLEILS.nouveau.call(this, alea, 2); } },
};

/** un brasier, un casse-tête : dans l'ordre des brasiers autour de l'autel (en partant du haut) */
export const JEUX_SEPULTURE = [
  { id: 'puzzle', nom: 'La fresque brisée', jeu: PUZZLE, aide: 'Flèches : bouger · A : prendre / poser une pièce · B : reposer / quitter' },
  { id: 'billes', nom: 'Les billes du scribe', jeu: BILLES, aide: 'Flèches : bouger · A : prendre une bille, puis la faire sauter · Menu : recommencer · B : quitter' },
  { id: 'hanoi', nom: 'Les urnes du roi', jeu: HANOI, aide: 'Gauche / droite : choisir le pilier · A : prendre / poser · B : reposer / quitter' },
  { id: 'blocage', nom: 'Le sarcophage d\'or', jeu: BLOCAGE, aide: 'Flèches : bouger · A : saisir un bloc, flèches pour le glisser · Menu : recommencer · B : quitter' },
  { id: 'soleils', nom: 'Les dalles-soleils', jeu: SOLEILS, aide: 'Flèches : bouger · A : retourner une dalle et ses voisines · B : quitter' },
];
