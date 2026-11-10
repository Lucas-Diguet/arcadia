// testodyssee/js/donjon/defense.js — défense du cristal (Bastion du Cristal), sans DOM ni réseau.
//
// L'hôte fait avancer la défense d'un pas toutes les demi-secondes (pasDefense) : les pillards apparaissent aux
// entrées, marchent vers le cristal par le plus court chemin, et le frappent en arrivant à côté de lui. Un pillard
// qui arrive à côté d'un joueur libre l'engage : il s'arrête et le combat se joue chez ce joueur, qui renvoie l'issue
// (issueDefense). Une vague finie laisse un moment de répit ; après la dernière, le cristal est sauvé. S'il tombe,
// tout est à recommencer depuis la première vague.

const V = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const DIR = { '0,-1': 'up', '1,0': 'right', '0,1': 'down', '-1,0': 'left' };
const cle = (x, y) => x + ',' + y;

/**
 * carte de la défense : distance de chaque case au cristal (0 : case à côté du cristal, -1 : hors d'atteinte).
 * libre(x, y) : case où un pillard peut marcher
 */
export function preparerDefense(w, h, libre, cristal, entrees) {
  const dist = new Int16Array(w * h).fill(-1), file = [];
  for (const [cx, cy] of cristal) for (const [dx, dy] of V) {
    const x = cx + dx, y = cy + dy;
    if (x < 0 || y < 0 || x >= w || y >= h || !libre(x, y) || dist[y * w + x] === 0) continue;
    dist[y * w + x] = 0; file.push([x, y]);
  }
  for (let i = 0; i < file.length; i++) {
    const [x, y] = file[i], d = dist[y * w + x];
    for (const [dx, dy] of V) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || dist[ny * w + nx] >= 0 || !libre(nx, ny)) continue;
      dist[ny * w + nx] = d + 1; file.push([nx, ny]);
    }
  }
  return { w, h, dist, cristal, entrees };
}

export function nouvelleDefense(salle, run = 1) {
  return { run, etat: 'attente', vague: 0, cristal: salle.cristal, max: salle.cristal, joueurs: 1, ennemis: [], file: [], tic: 0, pause: 0, apparition: 0, n: 0 };
}

/** lance (ou relance) la défense pour k joueurs ; la première vague arrive après un court répit */
export function demarrerDefense(D, salle, k) {
  Object.assign(D, { etat: 'pause', vague: 0, cristal: D.max, joueurs: Math.max(1, k | 0), ennemis: [], file: [], tic: 0, pause: salle.repit || 6, apparition: 0 });
}

/** les pillards d'une vague, mélangés : salle.vagues[i] = { type: nombre par joueur } */
export function composerVague(salle, i, k, rng) {
  const out = [];
  for (const [t, n] of Object.entries(salle.vagues[i])) for (let j = 0; j < n * k; j++) out.push(t);
  for (let j = out.length - 1; j > 0; j--) { const r = Math.floor(rng() * (j + 1)); [out[j], out[r]] = [out[r], out[j]]; }
  return out;
}

/**
 * un pas de la défense. joueurs : [{ id, x, y }] présents dans la salle ; types : def.ennemis ;
 * renvoie les événements : ['vague', i], ['apparait', id], ['touche', degats], ['engage', id, joueur], ['fin', i],
 * ['gagne'], ['perdu']
 */
export function pasDefense(D, C, salle, types, joueurs, rng) {
  const ev = [];
  for (const e of D.ennemis) { e.ax = e.x; e.ay = e.y; }
  if (D.etat === 'pause') {
    if (--D.pause > 0) return ev;
    D.file = composerVague(salle, D.vague, D.joueurs, rng);
    D.vague++; D.etat = 'vague'; D.apparition = 0;
    ev.push(['vague', D.vague]);
    return ev;
  }
  if (D.etat !== 'vague') return ev;
  D.tic++;
  const pris = new Set(joueurs.map((j) => cle(j.x, j.y)));
  for (const e of D.ennemis) pris.add(cle(e.x, e.y));
  // une entrée libre pour le prochain pillard
  if (D.file.length && --D.apparition <= 0) {
    const libres = C.entrees.filter(([x, y]) => !pris.has(cle(x, y)));
    if (libres.length) {
      const [x, y] = libres[Math.floor(rng() * libres.length)], t = D.file.shift();
      const e = { id: ++D.n, t, x, y, ax: x, ay: y, dir: 'down', engage: null, v: Math.floor(rng() * 1000) };
      D.ennemis.push(e); pris.add(cle(x, y)); ev.push(['apparait', e.id]);
      D.apparition = salle.cadence || 4;
    }
  }
  // chacun avance d'une case vers le cristal, à son rythme
  for (const e of [...D.ennemis]) {
    if (e.engage || D.tic % (types[e.t].pas || 1)) continue;
    const ici = C.dist[e.y * C.w + e.x];
    const pas = V.filter(([dx, dy]) => {
      const x = e.x + dx, y = e.y + dy, d = x >= 0 && y >= 0 && x < C.w && y < C.h ? C.dist[y * C.w + x] : -1;
      return d >= 0 && (ici < 0 || d < ici) && !pris.has(cle(x, y));
    });
    if (!pas.length) continue;
    const [dx, dy] = pas[Math.floor(rng() * pas.length)];
    pris.delete(cle(e.x, e.y)); e.x += dx; e.y += dy; e.dir = DIR[dx + ',' + dy]; pris.add(cle(e.x, e.y));
  }
  // à côté du cristal : il frappe et disparaît
  for (const e of [...D.ennemis]) {
    if (e.engage || C.dist[e.y * C.w + e.x] !== 0) continue;
    const n = types[e.t].degats || 1;
    D.cristal = Math.max(0, D.cristal - n);
    D.ennemis = D.ennemis.filter((q) => q !== e);
    ev.push(['touche', n]);
  }
  // un pillard à côté d'un joueur libre l'engage
  for (const j of joueurs) {
    if (D.ennemis.some((e) => e.engage === j.id)) continue;
    const e = D.ennemis.find((q) => !q.engage && Math.abs(q.x - j.x) + Math.abs(q.y - j.y) <= 1);
    if (e) { e.engage = j.id; ev.push(['engage', e.id, j.id]); }
  }
  return ev.concat(finDePas(D, salle));
}

function finDePas(D, salle) {
  if (D.cristal <= 0) { D.etat = 'perdu'; D.ennemis = []; D.file = []; return [['perdu']]; }
  if (D.etat === 'vague' && !D.file.length && !D.ennemis.length) {
    if (D.vague >= salle.vagues.length) { D.etat = 'gagne'; return [['gagne']]; }
    D.etat = 'pause'; D.pause = salle.pause || 12;
    return [['fin', D.vague]];
  }
  return [];
}

/** issue d'un combat contre un pillard : battu, il disparaît ; sinon il reprend sa marche */
export function issueDefense(D, salle, id, gagne) {
  const e = D.ennemis.find((q) => q.id === id); if (!e) return [];
  if (gagne) D.ennemis = D.ennemis.filter((q) => q !== e); else e.engage = null;
  return finDePas(D, salle);
}

/** un joueur parti (ou sorti de la salle) libère le pillard qui l'avait engagé */
export function libererDefense(D, presents) {
  for (const e of D.ennemis) if (e.engage && !presents.has(e.engage)) e.engage = null;
}
