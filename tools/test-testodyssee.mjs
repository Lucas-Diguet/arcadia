// tools/test-testodyssee.mjs — TestOdyssée : plans des donjons et règles partagées du groupe.
// node tools/test-testodyssee.mjs
import { DONJONS } from '../testodyssee/js/donjons/index.js';
import { construireCarte, construireSalles, passageSuivant, lirePlan, regionDe, ouvrir, aCote, relierExterieur, texteJoueurs } from '../testodyssee/js/donjon/plan.js';
import { installerContenu } from '../testodyssee/js/contenu.js';
import { Raid } from '../testodyssee/js/combat/raid.js';
import { Groupe } from '../testodyssee/js/combat/groupe.js';
import { nouvelEtat, appliquer, ouverte, battu, prisPar, requisDalles, requisSalle, clesDe, serrures, actifs, attendusArene, attendusSommet, areneEnCours } from '../testodyssee/js/donjon/etat.js';
import { createMon, isFainted } from '../odyssee/js/core/mon.js';
import { MOVES } from '../odyssee/js/data/moves.js';
import { SPECIES } from '../odyssee/js/data/species.js';
import { ITEMS } from '../odyssee/js/core/items.js';
import { buildWorld } from '../odyssee/js/world/region.js';
import { listerLieux } from '../testodyssee/js/lieux.js';
import { EQUIPES } from '../testodyssee/js/equipes.js';
import { walkable, T } from '../odyssee/js/world/tiles.js';
import { cle, explorerGlace, faisceau, resoudreReflet, cheminGlace } from '../testodyssee/js/donjon/casse-tetes.js';

installerContenu();
let fails = 0, checks = 0;
const ok = (c, msg) => { checks++; if (!c) { fails++; console.log('ÉCHEC :', msg); } };
const compte = (seen) => { let n = 0; for (const v of seen) n += v; return n; };

/* ---------------- plans ---------------- */
for (const d of DONJONS) {
  if (!d.plan) continue;   // donjon en salles séparées : vérifié plus bas
  const m = construireCarte(d), P = m.donjon.plan;
  ok(m.id === d.carte, `${d.id} : identifiant de carte`);
  for (const s of d.salles) {
    ok(regionDe(m, P, s).length > 0, `${d.id} : la salle ${s.id} a des cases`);
    if (s.porte) ok(P.portes[s.porte]?.length, `${d.id} : la porte ${s.porte} de ${s.id} est dessinée`);
    for (const k of s.pnj || []) ok(P.pnj[k] && d.pnj[k], `${d.id} : le PNJ ${k} de ${s.id} est posé`);
    if (s.type === 'dalles') ok(P.dalles.length > 0, `${d.id} : des dalles dans ${s.id}`);
  }
  for (const k of Object.keys(P.portes)) ok(d.salles.some((s) => s.porte === k), `${d.id} : la porte ${k} appartient à une salle`);
  for (const p of Object.values(d.pnj || {})) for (const [sp, lvl] of p.equipe || []) ok(SPECIES[sp] && lvl > 0 && lvl <= 100, `${d.id} : ${p.nom} a des Pokémon valides`);
  for (const k of Object.keys(d.recompense?.objets || {})) ok(ITEMS[k], `${d.id} : l'objet ${k} existe`);
  // portes fermées : on ne quitte pas l'entrée ; ouvertes : tout le sol est atteint, chaque PNJ a une case libre à côté
  const ferme = compte(m.reach(...P.depart));
  ok(ferme === regionDe(m, P, d.salles[0]).filter(([x, y]) => walkable(m.get(x, y))).length, `${d.id} : portes fermées, seule l'entrée est accessible (${ferme})`);
  for (const l of Object.values(P.portes)) for (const [x, y] of l) ok(ouvrir(m, x, y), `${d.id} : la porte en ${x},${y} s'ouvre`);
  // passage ouvert par un objet (le bon miroir de l'énigme)
  for (const s of d.salles) if (s.porteObjet) for (const [x, y] of P.objets[s.porteObjet]) ok(ouvrir(m, x, y), `${d.id} : le passage ${s.porteObjet} s'ouvre`);
  // on part de l'entrée et de chaque arrivée d'ascenseur
  const seen = m.reach(...P.depart);
  for (const [c, o] of Object.entries(d.objets || {})) if (o.type === 'ascenseur') { const s2 = m.reach(...aCote(m, P, c)); for (let i = 0; i < seen.length; i++) seen[i] |= s2[i]; }
  const sol = P.sol.filter(([x, y]) => walkable(m.get(x, y)));
  ok(sol.every(([x, y]) => seen[y * m.w + x]), `${d.id} : portes ouvertes, tout le sol est accessible`);
  for (const [k, [[x, y]]] of Object.entries(P.pnj)) ok([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen[(y + dy) * m.w + x + dx]), `${d.id} : on peut parler à ${k}`);
  // extérieur : de l'arrivée devant la porte, on atteint la porte ; elle mène à S, et la sortie D ramène devant
  const dehors = relierExterieur(d, m);
  if (d.exterieur) {
    const [px, py] = m.donjon.exterieur.porte, vu = dehors.reach(px, py + 2);
    ok(walkable(dehors.get(px, py + 2)) && vu[py * dehors.w + px], `${d.id} : la porte de l'extérieur est accessible`);
    ok(dehors.warpAt(px, py)?.map === m.id && dehors.warpAt(px, py).x === P.depart[0], `${d.id} : la porte mène à l'arrivée du donjon`);
    ok(P.sortie && m.warpAt(...P.sortie)?.map === dehors.id && m.reach(...P.depart)[P.sortie[1] * m.w + P.sortie[0]], `${d.id} : la sortie ramène dehors`);
  }
}
/* ---------------- donjon des miroirs : salles séparées et casse-têtes ---------------- */
{
  const d = DONJONS.find((q) => q.id === 'miroirs'), cartes = construireSalles(d), dehors = relierExterieur(d, cartes[0]);
  const carte = (id) => cartes[d.salles.findIndex((s) => s.id === id)];
  const V = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const objet = (m, x, y) => Object.entries(m.donjon.plan.objets).find(([, l]) => l.some(([a, b]) => a === x && b === y))?.[0];
  // chaînage : N mène à S de la salle suivante, D ramène sous N de la précédente, la première sort dehors
  cartes.forEach((m, i) => {
    const P = m.donjon.plan, s = d.salles[i];
    ok(m.id === s.carte && m.salle === s.id, `miroirs : carte de ${s.id}`);
    if (i < cartes.length - 1) {
      passageSuivant(m, true);
      const w = m.warpAt(...P.suivante), Q = cartes[i + 1].donjon.plan;
      ok(w && w.map === cartes[i + 1].id && w.x === Q.depart[0] && w.y === Q.depart[1], `miroirs : ${s.id} mène à la salle suivante`);
      const r = cartes[i + 1].warpAt(...Q.sortie);
      ok(r && r.map === m.id && r.x === P.suivante[0] && r.y === P.suivante[1] + 1 && (walkable(m.get(r.x, r.y)) || Object.values(P.portes).flat().some(([a, b]) => a === r.x && b === r.y) || objet(m, r.x, r.y) === s.porteObjet), `miroirs : on revient de ${d.salles[i + 1].id} devant la sortie de ${s.id}`);
    }
  });
  ok(dehors && cartes[0].warpAt(...cartes[0].donjon.plan.sortie)?.map === dehors.id, 'miroirs : la première salle sort dehors');
  // salle 1 : le passage est muré tant que l'énigme n'est pas résolue, et le bon miroir est à gauche
  {
    const m = construireSalles(d)[0], P = m.donjon.plan;
    const vu = m.reach(...P.depart);
    ok(!vu[P.suivante[1] * m.w + P.suivante[0]] && m.get(...P.suivante) === T.CAVEWALL, 'miroirs : salle 1, le passage reste muré');
    const xs = ['A', 'B', 'C'].map((c) => P.objets[c][0][0]);
    ok(d.objets.A.juste && xs[0] < xs[1] && xs[1] < xs[2] && !d.objets.B.juste && !d.objets.C.juste, 'miroirs : le bon miroir est celui de gauche');
    ok(P.objets.A[0][0] === P.suivante[0] && P.objets.A[0][1] === P.suivante[1] + 1, 'miroirs : le passage est derrière le bon miroir');
    const [px, py] = P.objets.P[0], xs2 = P.sol.map(([x]) => x), ys2 = P.sol.map(([, y]) => y);
    ok(Math.abs(px - (Math.min(...xs2) + Math.max(...xs2)) / 2) <= 1 && py > P.objets.A[0][1] + 1 && py < P.depart[1] - 1, 'miroirs : le panneau est au centre de la salle');
    ouvrir(m, ...P.objets.A[0]); passageSuivant(m, true);
    ok(m.reach(...P.depart)[P.suivante[1] * m.w + P.suivante[0]], 'miroirs : salle 1, le bon miroir ouvre le passage');
  }
  // salles de glace : grandes, la sortie et chaque objet accessibles quels que soient ceux déjà pris, jamais coincé
  for (const [id, lettres, mini] of [['s2', ['p', 'q'], 8], ['s3', ['u', 'v', 'w', 'x', 'y'], 8]]) {
    const m = carte(id), P = m.donjon.plan, N = P.suivante, S = P.depart;
    ok(P.sol.length >= 4 * 250, `miroirs : ${id} est une grande salle (${P.sol.length} cases)`);
    const cases = lettres.flatMap((c) => P.objets[c]), fixes = (P.objets.R || []);
    let bon = true, coince = 0, sortieMin = Infinity, objMin = Infinity;
    for (let mask = 0; mask < 1 << cases.length; mask++) {
      const pris = new Set(cases.filter((_, i) => mask >> i & 1).map(([x, y]) => cle(x, y)));
      const objets = new Set([...cases, ...fixes].map(([x, y]) => cle(x, y)));
      const libre = (x, y) => m.in(x, y) && (pris.has(cle(x, y)) || (walkable(m.get(x, y)) && !objets.has(cle(x, y))) || (x === N[0] && y === N[1]));
      const vu = explorerGlace(m.glace, libre, ...S);
      if (!vu.has(cle(...N))) bon = false; else if (mask === 0) sortieMin = vu.get(cle(...N));
      for (const [x, y] of [...cases, ...fixes]) {
        if (pris.has(cle(x, y))) continue;
        const ds = V.map(([dx, dy]) => vu.get(cle(x + dx, y + dy))).filter((v) => v != null);
        if (!ds.length) bon = false; else if (mask === 0) objMin = Math.min(objMin, ...ds);
      }
      for (const k of [...vu.keys(), cle(N[0], N[1] + 1)]) { if (k === cle(...N)) continue; const [x, y] = k.split(',').map(Number); if (!explorerGlace(m.glace, libre, x, y).has(cle(...S))) coince++; }
      if (!bon) break;
    }
    ok(bon, `miroirs : ${id}, la sortie et chaque objet sont accessibles en glissant`);
    ok(coince === 0, `miroirs : ${id}, on ne reste jamais coincé sur la glace (${coince})`);
    ok(sortieMin >= 15 && objMin >= mini, `miroirs : ${id}, assez difficile (sortie en ${sortieMin} glissades, objet le plus proche en ${objMin})`);
  }
  // PC d'aide de la Galerie : à l'entrée, la salle simplifiée reste sans piège et devient plus courte
  {
    const m = carte('s2'), P = m.donjon.plan, S2 = d.salles.find((s) => s.id === 's2'), [pcx, pcy] = P.objets.c[0];
    ok(Math.abs(pcx - P.depart[0]) <= 2 && Math.abs(pcy - P.depart[1]) <= 1 && walkable(m.get(pcx, pcy - 1)), 'miroirs : le PC est à l\'entrée de la Galerie');
    const cases = ['p', 'q'].flatMap((c) => P.objets[c]), reels = P.objets.p;
    const mesure = (glace, bloc) => {
      let pire = 0, coince = 0, sortie = 0;
      for (let mask = 0; mask < 1 << cases.length; mask++) {
        const pris = new Set(cases.filter((_, i) => mask >> i & 1).map(([x, y]) => cle(x, y)));
        const objets = new Set(cases.map(([x, y]) => cle(x, y)));
        const libre = (x, y) => m.in(x, y) && !bloc.has(cle(x, y)) && (pris.has(cle(x, y)) || (walkable(m.get(x, y)) && !objets.has(cle(x, y))));
        const vu = explorerGlace(glace, libre, ...P.depart);
        if (!vu.has(cle(...P.suivante))) return null;
        if (mask === 0) { sortie = vu.get(cle(...P.suivante)); for (const [x, y] of reels) pire = Math.max(pire, Math.min(...[[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => vu.get(cle(x + dx, y + dy)) ?? Infinity))); }
        for (const k of vu.keys()) { if (k === cle(...P.suivante)) continue; const [x, y] = k.split(',').map(Number); if (!explorerGlace(glace, libre, x, y).has(cle(...P.depart))) coince++; }
      }
      return { pire, coince, sortie };
    };
    const avant = mesure(m.glace, new Set()), glace = new Set(m.glace), bloc = new Set();
    for (const [x, y, c] of S2.aide.simplifier) { glace.delete(cle(x + 1, y + 1)); if (c === 'X') bloc.add(cle(x + 1, y + 1)); }
    const apres = mesure(glace, bloc);
    ok(apres && apres.coince === 0, 'miroirs : Galerie simplifiée, on ne reste jamais coincé');
    ok(apres && apres.sortie < avant.sortie && apres.pire < avant.pire, `miroirs : Galerie simplifiée plus courte (sortie ${avant.sortie} → ${apres?.sortie}, miroir le plus loin ${avant.pire} → ${apres?.pire})`);
    const buts = new Set(reels.flatMap(([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => cle(x + dx, y + dy))));
    const ch = cheminGlace(m.glace, (x, y) => m.in(x, y) && walkable(m.get(x, y)), pcx, pcy - 1, buts);
    ok(ch && ch.length > 1, `miroirs : l'indice du PC trouve un chemin vers un miroir de poche (${ch ? ch.length - 1 : 0} glissades)`);
  }
  // salle du brasier : rien d'éclairé au départ ; une seule solution, avec les 3 miroirs de poche et au moins 4 miroirs tournés
  {
    const m = carte('s4'), P = m.donjon.plan;
    const [bx, by] = P.objets.F[0], cibles = new Set(P.objets.L.map(([x, y]) => cle(x, y))), socles = P.objets.o;
    const bloque = (x, y) => m.get(x, y) === T.CAVEWALL || (m.get(x, y) === T.BLOCK && objet(m, x, y) !== 'o');
    const fixes = [...(P.objets.f || []).map((c) => [c, '/']), ...(P.objets.g || []).map((c) => [c, '\\'])];
    const essai = (mm) => [[-1, 0], [1, 0]].map(([dx, dy]) => faisceau(bx, by, dx, dy, mm, bloque, cibles).touche);
    const t0 = essai(new Map(fixes.map(([[x, y], o]) => [cle(x, y), o])));
    ok(!t0[0] && !t0[1], 'miroirs : au départ, la lumière n\'éclaire aucun soleil');
    const poche = P.objets.p ? P.objets.p.length : 3;
    let n = 0, moins = 0, tours = 0;
    const pose = [];
    const parSocle = (i) => {
      if (i === socles.length) {
        for (let f = 0; f < 1 << fixes.length; f++) {
          const mm = new Map(fixes.map(([[x, y]], j) => [cle(x, y), (f >> j) & 1 ? '\\' : '/']));
          for (const [[x, y], o] of pose) mm.set(cle(x, y), o);
          const t = essai(mm);
          if (t[0] && t[1] && t[0] !== t[1]) { n++; if (pose.length < 3) moins++; tours = fixes.filter(([[x, y], o], j) => ((f >> j) & 1 ? '\\' : '/') !== o).length; }
        }
        return;
      }
      parSocle(i + 1);
      if (pose.length < 3) for (const o of ['/', '\\']) { pose.push([socles[i], o]); parSocle(i + 1); pose.pop(); }
    };
    parSocle(0);
    ok(n >= 1 && moins === 0, `miroirs : la lumière a une solution, avec les 3 miroirs de poche (${n} réglages, ${moins} avec moins)`);
    ok(tours >= 4 || n > 1, `miroirs : il faut tourner plusieurs miroirs (${tours})`);
    // tout ce qu'on manipule est à portée
    const vu = m.reach(...P.depart);
    for (const [x, y] of [...socles, ...fixes.map(([c]) => c), P.objets.F[0]]) ok(V.some(([dx, dy]) => vu[(y + dy) * m.w + x + dx]), `miroirs : on atteint l'objet en ${x},${y}`);
  }
  // salle du reflet : Copycat est rejoignable, mais pas en quelques pas
  {
    const m = carte('s5'), P = m.donjon.plan, S5 = d.salles.find((s) => s.type === 'reflet'), L = S5.ligne + 1;
    const libre5 = (x, y) => m.in(x, y) && walkable(m.get(x, y)) && m.get(x, y) !== T.CAVEDOOR;
    const r = resoudreReflet(P.depart, P.objets.K[0], (x, y) => libre5(x, y) && y >= L, (x, y) => libre5(x, y) && y <= L, 2e6);
    ok(r.n >= 40, `miroirs : on rejoint Copycat, en ${r.n} pas au mieux`);
  }
}

/* ---------------- Sanctuaire des Trois Voies ---------------- */
{
  const d = DONJONS.find((q) => q.id === 'voies'), cartes = construireSalles(d), M = Object.fromEntries(cartes.map((m) => [m.salle, m]));
  const V4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  // chaînage des salles : N mène à S de la salle suivante, les trois chemins se rejoignent dans le couloir
  const vers = (a) => M[a].donjon.versSuivante?.map;
  ok(vers('s1') === M.s2.id && !M.s2.donjon.versSuivante, 'voies : salle 1 → salle 2, pas de passage direct après la salle 2');
  ok(vers('s3s') === M.s4s.id && vers('s3f1') === M.s3f2.id && vers('s3f2') === M.s4f.id && vers('s3c') === M.s4c.id, 'voies : chaque épreuve mène à sa salle des codes');
  ok(['s4s', 's4f', 's4c'].every((k) => vers(k) === M.s5.id) && vers('s5') === M.s6.id, 'voies : les trois salles des codes mènent au couloir, puis au gardien');
  ok(!M.s3s.donjon.plan.sortie && !M.s3f1.donjon.plan.sortie && !M.s3c.donjon.plan.sortie && !M.s5.donjon.plan.sortie, 'voies : pas de demi-tour après une porte, ni depuis le couloir commun');
  ok(Object.values(d.salles.find((x) => x.id === 's2').voies).every((id) => M[id]), 'voies : chaque porte mène à une épreuve');
  // dans chaque salle, portes et passage ouverts, objets retirés : on va de S à N
  for (const m of cartes) {
    const P = m.donjon.plan;
    for (const l of Object.values(P.portes)) for (const [x, y] of l) ouvrir(m, x, y);
    for (const c of ['K', 'V', 'J', 'O', 'T', 'L']) for (const [x, y] of P.objets[c] || []) ouvrir(m, x, y);
    if (P.suivante) passageSuivant(m, true);
    const vu = m.reach(...P.depart);
    if (P.suivante) ok(vu[P.suivante[1] * m.w + P.suivante[0]], `voies : ${m.salle}, on va de l'entrée à la sortie`);
    for (const [k, [[x, y]]] of Object.entries(P.pnj)) ok(V4.some(([dx, dy]) => vu[(y + dy) * m.w + x + dx]), `voies : ${m.salle}, on peut parler à ${k}`);
  }
  // salle 1 : trois dalles, un donjon à trois
  const s1 = construireSalles(d)[0];
  ok(s1.donjon.plan.dalles.length === 3 && requisSalle(d, d.salles[0], 3, 1) === 3 && texteJoueurs(d) === 'Donjon à 3 joueurs', 'voies : trois dalles, trois joueurs');
  // les portes des voies : une par joueur
  {
    const e = nouvelEtat(d), r1 = appliquer(d, e, 'a', { a: 'voie', salle: 's2', voie: 'Z' }), r2 = appliquer(d, e, 'b', { a: 'voie', salle: 's2', voie: 'Z' }), r3 = appliquer(d, e, 'a', { a: 'voie', salle: 's2', voie: 'Y' });
    ok(r1.ok && !r2.ok && r2.why === 'prise' && !r3.ok && r3.why === 'deja', 'voies : une porte prise se ferme aux autres, et on ne prend qu\'une porte');
    ok(ouverte(d, e, 's3s') && !ouverte(d, e, 's4s') && !ouverte(d, e, 's3f2') && !ouverte(d, e, 's5'), 'voies : chaque chemin s\'ouvre de son côté');
  }
  // l'énigme des menteurs : une seule solution, et aucune phrase n'est de trop
  {
    const R = d.menteurs.regles, sols = (sauf) => { const out = []; for (let k = 0; k < 32; k++) { const v = [0, 1, 2, 3, 4].map((i) => !!(k >> i & 1)); if (R.every((f, i) => i === sauf || f(v) === v[i])) out.push(v); } return out; };
    const s = sols(-1);
    ok(s.length === 1 && s[0].every((x, i) => x === d.menteurs.sinceres.includes(i)), 'voies : l\'énigme des menteurs a une seule solution, celle du jeu');
    ok([0, 1, 2, 3, 4].every((k) => sols(k).length > 1), 'voies : sans n\'importe laquelle des phrases, l\'énigme n\'a plus une seule solution');
  }
  // Courage : la croix, ses grilles, ses interrupteurs et ses caisses
  {
    const m = construireSalles(d).find((q) => q.salle === 's3c'), P = m.donjon.plan, N = P.suivante, O = P.objets;
    const sw = (c) => d.objets[c], grilles = new Set(['J', 'O', 'T'].flatMap((c) => O[c].map(([x, y]) => cle(x, y))));
    // chaque interrupteur rouvre la grille de son bras (pour en sortir) et ouvre la suivante
    ok(sw('I').ouvre.join() === 'J' && sw('C').ouvre.join() === 'J,O' && sw('U').ouvre.join() === 'O,T', 'voies : Courage, les interrupteurs s\'enchaînent (bas → gauche → droite → haut)');
    // les caisses barrent la grille de droite ; on y arrive en les poussant
    const caisses0 = new Set(O.L.map(([x, y]) => cle(x, y)));
    const mur = (x, y) => !m.in(x, y) || m.get(x, y) === T.CAVEWALL || grilles.has(cle(x, y)) || (m.get(x, y) === T.BLOCK && !caisses0.has(cle(x, y)));
    const devantO = new Set(O.O.map(([x, y]) => cle(x - 1, y)));
    const resoudre = (pousser) => {
      const k0 = cle(...P.depart) + '|' + [...caisses0].sort().join(';'), vu = new Set([k0]), file = [[P.depart, caisses0]];
      while (file.length) {
        const [[x, y], cs] = file.shift();
        if (devantO.has(cle(x, y))) return true;
        for (const [dx, dy] of V4) {
          const nx = x + dx, ny = y + dy; if (mur(nx, ny)) continue;
          let ncs = cs;
          if (cs.has(cle(nx, ny))) { if (!pousser) continue; const bx = nx + dx, by = ny + dy; if (mur(bx, by) || cs.has(cle(bx, by))) continue; ncs = new Set(cs); ncs.delete(cle(nx, ny)); ncs.add(cle(bx, by)); }
          const kk = cle(nx, ny) + '|' + [...ncs].sort().join(';'); if (!vu.has(kk)) { vu.add(kk); file.push([[nx, ny], ncs]); }
        }
      }
      return false;
    };
    ok(!resoudre(false) && resoudre(true), 'voies : Courage, les caisses barrent la grille de droite, on passe en les poussant');
    // temps : la course passe, la marche non (grilles ouvertes, caisses ôtées)
    for (const [x, y] of O.L) ouvrir(m, x, y);
    const dist = (a, buts) => { const D = new Map([[cle(...a), 0]]), f = [a]; while (f.length) { const [x, y] = f.shift(); for (const [dx, dy] of V4) { const k = cle(x + dx, y + dy); if (D.has(k) || (!walkable(m.get(x + dx, y + dy)) && !grilles.has(k))) continue; D.set(k, D.get(cle(x, y)) + 1); f.push([x + dx, y + dy]); } } return Math.min(...buts.map(([x, y]) => D.get(cle(x, y)) ?? Infinity)); };
    for (const [c, cible] of [['C', 'O'], ['U', 'T']]) {
      const n = dist(O[c][0], O[cible]), t = sw(c).duree;
      ok(n * 0.2 > t && n * 0.1 < t, `voies : Courage, de l'interrupteur ${c} à la grille ${cible} il faut courir (${n} cases, ${t} s)`);
    }
    ok(dist(O.I[0], O.J) * 0.2 < sw('I').duree, 'voies : Courage, la première grille se rejoint en marchant');
    ok(P.pnj.r && O['!'].length === 5 && O['!'].every(([x]) => x > O.J[0][0] && x < P.pnj.r[0][0]), 'voies : Courage, le dresseur attaque quand on passe devant lui, du bon côté de la grille');
    ok(['J', 'O', 'T'].every((c) => O[c].length === 5), 'voies : Courage, chaque grille ferme tout le couloir');
    // les caisses : un peu plus de poussées qu'avant (au moins 8)
    {
      const minPoussees = () => { const k0 = [cle(...P.depart), [...caisses0].sort().join(';')].join('|'), D = new Map([[k0, 0]]), dq = [[P.depart, caisses0, 0]];
        while (dq.length) { const [[x, y], cs, n] = dq.shift(); if (devantO.has(cle(x, y))) return n;
          for (const [dx, dy] of V4) { const nx = x + dx, ny = y + dy; if (mur(nx, ny)) continue; let ncs = cs, c = 0;
            if (cs.has(cle(nx, ny))) { const bx = nx + dx, by = ny + dy; if (mur(bx, by) || cs.has(cle(bx, by))) continue; ncs = new Set(cs); ncs.delete(cle(nx, ny)); ncs.add(cle(bx, by)); c = 1; }
            const kk = cle(nx, ny) + '|' + [...ncs].sort().join(';'); if (D.has(kk) && D.get(kk) <= n + c) continue; D.set(kk, n + c); if (c) dq.push([[nx, ny], ncs, n + c]); else dq.unshift([[nx, ny], ncs, n]); } }
        return -1; };
      const n = minPoussees(); ok(n >= 8, `voies : Courage, il faut au moins 8 poussées pour passer (${n})`);
    }
  }
  // salles des codes : grandes, dans le noir, le coffre au centre
  for (const k of ['s4s', 's4f', 's4c']) {
    const m = M[k], P = m.donjon.plan, [hx, hy] = P.objets.H[0];
    ok(m.dark === 'arene' && P.sol.length > 700 && hx === P.suivante[0] && Math.abs(hy - m.h / 2) <= 1, `voies : ${k}, grande salle dans le noir, coffre au centre`);
  }
  // codes : chaque grande porte n'a qu'une bonne combinaison parmi les quatre de son coffre
  for (let k = 0; k < 50; k++) {
    let r = k + 1; const rnd = () => { r = (r * 1664525 + 1013904223) >>> 0; return r / 4294967296; };
    const sec = d.preparer(rnd), tous = Object.values(sec.codes).flat();
    let bon = new Set(tous).size === 6 && tous.every((n) => n >= 10 && n <= 99);
    for (const v of ['s', 'f', 'c']) {
      const mot = sec.motifs[v], autres = ['s', 'f', 'c'].filter((q) => q !== v);
      bon &&= mot.length === 4 && autres.every((q) => mot.filter((x) => x === q).length === 2);
      const combos = new Set();
      for (const oa of [[0, 1], [1, 0]]) for (const ob of [[0, 1], [1, 0]]) { const vu = { [autres[0]]: 0, [autres[1]]: 0 }, o = { [autres[0]]: oa, [autres[1]]: ob }; combos.add(mot.map((q) => String(sec.codes[q][o[q][vu[q]++]])).join('')); }
      bon &&= combos.size === 4 && combos.has(sec.portes[v]);
    }
    if (!bon) { ok(false, `voies : codes de la descente ${k}`); break; }
  }
  ok(true, 'voies : codes tirés au sort, une seule bonne combinaison par porte');
  let r0 = 7; const e0 = nouvelEtat(d, { rng: () => { r0 = (r0 * 1664525 + 1013904223) >>> 0; return r0 / 4294967296; } });
  ok(e0.secret?.portes?.s?.length === 8, 'voies : l\'état d\'une descente porte ses codes');
}


/* ---------------- Pyramide de l'Ascension ---------------- */
{
  const d = DONJONS.find((q) => q.id === 'pyramide'), cartes = construireSalles(d), M = Object.fromEntries(cartes.map((m) => [m.salle, m]));
  const V4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], S = (id) => d.salles.find((q) => q.id === id);
  ok(texteJoueurs(d) === 'Donjon à 3 ou 4 joueurs' && M.s1.donjon.plan.dalles.length === 4, 'pyramide : quatre dalles, à 3 ou 4 joueurs');
  ok(requisSalle(d, S('s1'), 4, 1) === 3 && requisSalle(d, S('s1'), 4, 3) === 3 && requisSalle(d, S('s1'), 4, 4) === 4 && requisSalle(d, S('s1'), 4, 6) === 4, 'pyramide : les dalles demandent autant de joueurs que présents, entre 3 et 4');
  // chaque salle : de l'entrée on atteint la sortie (passage N, escaliers, portes), les dresseurs, les objets, la fontaine
  for (const m of cartes) {
    const P = m.donjon.plan;
    for (const l of Object.values(P.portes)) for (const [x, y] of l) ouvrir(m, x, y);
    if (P.suivante) passageSuivant(m, true);
    const vu = m.reach(...P.depart), at = (x, y) => vu[y * m.w + x], pres = ([x, y]) => V4.some(([dx, dy]) => at(x + dx, y + dy));
    if (P.suivante) ok(at(...P.suivante), `pyramide : ${m.salle}, on va de l'entrée à la sortie`);
    for (const [k, [[x, y]]] of Object.entries(P.pnj)) ok(pres([x, y]), `pyramide : ${m.salle}, on peut parler à ${k}`);
    for (const [c, l] of Object.entries(P.objets)) for (const p of l) ok(d.objets[c].type === 'escalier' ? at(...p) : pres(p) || at(...p), `pyramide : ${m.salle}, on atteint l'objet ${c}`);
  }
  // étages : le bon nombre de dresseurs et de Pokémon à 3 et à 4 joueurs, et 3 ou 4 emplacements pour l'escalier
  const e = nouvelEtat(d);
  const compter = (id, nb) => { e.nb = nb; const l = actifs(d, e, S(id)); return { duos: l.filter((k) => d.pnj[k].duo).map((k) => d.pnj[k].equipe.length), seuls: l.filter((k) => !d.pnj[k].duo).map((k) => d.pnj[k].equipe.length) }; };
  const egal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  ok(egal(compter('s2', 3), { duos: [4, 4], seuls: [4, 4] }) && egal(compter('s2', 4), { duos: [4, 4, 4, 4], seuls: [] }), 'pyramide : premier étage, 2 duos et 2 dresseurs à 3 joueurs, 4 duos à 4 joueurs (4 Pokémon chacun)');
  ok(egal(compter('s3', 3), { duos: [6, 6, 6], seuls: [5, 5, 5, 5, 5] }) && egal(compter('s3', 4), { duos: [6, 6, 6, 6, 6, 6], seuls: [] }), 'pyramide : deuxième étage, 3 duos et 5 dresseurs à 3 joueurs, 6 duos à 4 joueurs');
  ok(M.s2.donjon.plan.objets.E.length === 3 && M.s3.donjon.plan.objets.E.length === 4, 'pyramide : 3 puis 4 emplacements possibles pour l\'escalier');
  ok(!M.s2.donjon.plan.suivante && !M.s3.donjon.plan.suivante && !M.s3.donjon.plan.sortie, 'pyramide : on quitte les étages par l\'escalier, et on ne redescend pas');
  const tirages = new Set(); for (let k = 0; k < 40; k++) { const q = nouvelEtat(d); tirages.add(q.secret.escaliers.s3); }
  ok(tirages.size === 4, 'pyramide : l\'escalier change de place d\'une ascension à l\'autre');
  for (const p of Object.values(d.pnj)) for (const [sp, lvl] of p.equipe || []) ok(SPECIES[sp] && lvl >= 28 && lvl <= 36, `pyramide : ${p.cls} ${p.nom}, ${sp} niveau ${lvl}`);
  // les grottes : une par porte, chacune mène à son arène
  const vers = (a) => M[a].donjon.versSuivante?.map;
  ok(['a', 'b', 'c', 'd'].every((v) => vers('s5' + v) === M['s6' + v].id && vers('s6' + v) === M['s7' + v].id), 'pyramide : chaque chemin a ses trois grottes');
  ok(vers('s7a') === M.s8a.id && vers('s7b') === M.s8a.id && vers('s7c') === M.s8b.id && vers('s7d') === M.s8b.id, 'pyramide : portes I et II vers l\'Arène du Levant, III et IV vers celle du Couchant');
  ok(Object.values(S('s4').voies).every((id) => M[id]) && d.salles.filter((q) => q.rencontres).length === 12, 'pyramide : quatre portes, douze grottes avec des Pokémon sauvages');
  // règles : dalles, nombre de joueurs, objets partagés, duos
  const A = '1', B = '2', C = '3', D = '4';
  const q = nouvelEtat(d);
  appliquer(d, q, A, { a: 'dalles', salle: 's1', n: 4, requis: 4 });
  ok(q.salles.s1.faite && q.nb === 4 && actifs(d, q, S('s2')).length === 4, 'pyramide : les dalles comptent les joueurs');
  const r1 = appliquer(d, q, A, { a: 'ramasse', salle: 's2', objet: '$:0' }), r2 = appliquer(d, q, B, { a: 'ramasse', salle: 's2', objet: '$:0' });
  ok(r1.ok && !r2.ok && r2.why === 'deja', 'pyramide : un objet ramassé disparaît pour les autres');
  const c1 = appliquer(d, q, A, { a: 'couple', pnj: 'A' }), c2 = appliquer(d, q, B, { a: 'couple', pnj: 'A' }), c3 = appliquer(d, q, C, { a: 'couple', pnj: 'A' });
  ok(c1.ok && c2.ok && !c3.ok && q.salles.s2.donnees.attente.A.join() === '1,2', 'pyramide : un duo se combat à deux joueurs');
  appliquer(d, q, A, { a: 'coupleDebut', pnj: 'A' });
  ok(!appliquer(d, q, C, { a: 'couple', pnj: 'A' }).ok && !q.salles.s2.donnees.attente.A, 'pyramide : un duo en plein combat n\'attend plus personne');
  appliquer(d, q, A, { a: 'coupleFin', pnj: 'A', result: 'win' });
  for (const k of actifs(d, q, S('s2')).filter((x) => x !== 'A')) { appliquer(d, q, A, { a: 'couple', pnj: k, test: true }); appliquer(d, q, A, { a: 'coupleDebut', pnj: k }); appliquer(d, q, A, { a: 'coupleFin', pnj: k, result: 'win' }); }
  ok(q.salles.s2.faite && ouverte(d, q, 's3'), 'pyramide : tous les duos battus, l\'étage est fini');
  // arènes et sommet : les portes décident de qui s'affronte
  appliquer(d, q, A, { a: 'voie', salle: 's4', voie: 'w' }); appliquer(d, q, B, { a: 'voie', salle: 's4', voie: 'x' }); appliquer(d, q, C, { a: 'voie', salle: 's4', voie: 'y' });
  ok(attendusArene(d, q, S('s8a')).join() === '1,2' && attendusArene(d, q, S('s8b')).join() === '3', 'pyramide : deux joueurs dans une arène, un seul dans l\'autre');
  appliquer(d, q, B, { a: 'elimine' });
  ok(attendusArene(d, q, S('s8a')).join() === '1', 'pyramide : un joueur éliminé dans sa grotte n\'est plus attendu dans l\'arène');
  appliquer(d, q, A, { a: 'duelDebut', salle: 's8a', ids: [A] }); appliquer(d, q, A, { a: 'duelFin', salle: 's8a', gagnant: A });
  ok(areneEnCours(d, q) && attendusSommet(d, q).join() === '1', 'pyramide : le sommet attend l\'issue de l\'autre arène');
  appliquer(d, q, C, { a: 'duelDebut', salle: 's8b', ids: [C] }); appliquer(d, q, C, { a: 'duelFin', salle: 's8b', gagnant: null });
  ok(!areneEnCours(d, q) && q.dehors.includes(C) && attendusSommet(d, q).join() === '1', 'pyramide : perdre contre le reflet, c\'est redescendre');
  appliquer(d, q, A, { a: 'duelDebut', salle: 's9', ids: [A] }); appliquer(d, q, A, { a: 'duelFin', salle: 's9', gagnant: A });
  ok(q.fini && q.vainqueurs.join() === '1', 'pyramide : le sommet a son vainqueur');
  const q2 = nouvelEtat(d);
  for (const [k, v] of [[A, 'w'], [B, 'x'], [C, 'y'], [D, 'z']]) appliquer(d, q2, k, { a: 'voie', salle: 's4', voie: v });
  appliquer(d, q2, A, { a: 'duelDebut', salle: 's8a', ids: [A, B] }); appliquer(d, q2, B, { a: 'duelFin', salle: 's8a', gagnant: A }); appliquer(d, q2, A, { a: 'duelFin', salle: 's8a', gagnant: B });
  ok(q2.salles.s8a.donnees.gagnant === A && q2.dehors.includes(B) && !q2.dehors.includes(A), 'pyramide : le duel d\'arène a un seul gagnant, le perdant redescend');
}

/* ---------------- panneau d'entrée (standard de tous les donjons) ---------------- */
ok(texteJoueurs({ joueurs: { mode: 'solo' } }) === 'Donjon solo' && texteJoueurs({ joueurs: { mode: 'exact', n: 4 } }) === 'Donjon à 4 joueurs' && /solo ou en groupe \(3 joueurs recommandés\)/.test(texteJoueurs({ joueurs: { mode: 'groupe', n: 3 } })), 'panneau : les trois façons de dire le nombre de joueurs');
for (const d of DONJONS) {
  ok(d.entree && d.joueurs && ['solo', 'groupe', 'exact', 'entre'].includes(d.joueurs.mode), `${d.id} : phrase et nombre de joueurs du panneau d'entrée`);
  const m = d.plan ? construireCarte(d) : construireSalles(d)[0], dehors = relierExterieur(d, m);
  const [px, py] = dehors ? m.donjon.exterieur.porte : [0, 0];
  const panneaux = dehors ? [...dehors.signs].filter(([, t]) => t.startsWith(d.nom + '\n')) : [];
  ok(panneaux.length === 1 && panneaux[0][1].split('\n').length === 3 && panneaux[0][1].split('\n')[2] === texteJoueurs(d), `${d.id} : un panneau d'entrée de trois pages dehors`);
  if (panneaux.length) {
    const [x, y] = panneaux[0][0].split(',').map(Number), vu = dehors.reach(px, py + 2);
    ok(Math.abs(x - px) <= 2 && y - py >= 1 && y - py <= 3 && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => vu[(y + dy) * dehors.w + x + dx]), `${d.id} : le panneau est près de la porte et on peut le lire`);
  }
}

let erreur = null;
try { lirePlan({ id: 'x', plan: ['#Z#', '#S#'], pnj: {}, decor: {} }); } catch (e) { erreur = e.message; }
ok(/lettre inconnue/.test(erreur || ''), 'une lettre inconnue du plan est signalée');

/* ---------------- règles du groupe ---------------- */
const d = DONJONS.find((q) => q.id === 'crypte');
const boss = Object.values(d.pnj).find((p) => p.boss), base = createMon(boss.equipe[0][0], boss.equipe[0][1]).stats[0];
const e = nouvelEtat(d);
const A = '1', B = '2', C = '3';
ok(!appliquer(d, e, A, { a: 'prendre', pnj: 'a' }).ok, 'crypte fermée : pas de combat');
ok(appliquer(d, e, A, { a: 'ouvrir' }, { joueurs: 3, bossPv: base }).ok, 'le gardien ouvre la crypte');
ok(e.salles.entree.faite && e.boss.max === base * 4 && e.joueurs === 3, 'à 3 joueurs, le boss a 4 fois ses PV');
ok(!appliquer(d, e, B, { a: 'ouvrir' }, { joueurs: 3, bossPv: base }).ok, 'on n\'ouvre pas deux fois');
ok(appliquer(d, e, A, { a: 'prendre', pnj: 'a' }).ok && prisPar(e, d, 'a') === A, 'A engage l\'âme a');
const r = appliquer(d, e, B, { a: 'prendre', pnj: 'a' });
ok(!r.ok && r.why === 'occupe', 'B ne peut pas engager une âme déjà prise');
ok(appliquer(d, e, B, { a: 'prendre', pnj: 'b' }).ok && appliquer(d, e, C, { a: 'prendre', pnj: 'c' }).ok, 'B et C engagent les deux autres');
ok(!appliquer(d, e, A, { a: 'prendre', pnj: 'd' }).ok, 'la salle suivante est fermée');
ok(appliquer(d, e, A, { a: 'gagne', pnj: 'a' }).ok && battu(e, d, 'a') && !e.salles.s1.faite, 'A bat son âme, la salle continue');
ok(appliquer(d, e, B, { a: 'lacher', pnj: 'b' }).ok && prisPar(e, d, 'b') === null, 'B perd : l\'âme se libère');
ok(!appliquer(d, e, B, { a: 'gagne', pnj: 'c' }).ok, 'B ne peut pas déclarer la victoire de C');
ok(appliquer(d, e, A, { a: 'prendre', pnj: 'b' }).ok && appliquer(d, e, A, { a: 'gagne', pnj: 'b' }).ok, 'A reprend et bat l\'âme b');
appliquer(d, e, C, { a: 'parti' });
ok(prisPar(e, d, 'c') === null, 'un joueur qui part libère son adversaire');
ok(appliquer(d, e, A, { a: 'prendre', pnj: 'c' }).ok && appliquer(d, e, A, { a: 'gagne', pnj: 'c' }).ok && e.salles.s1.faite, 'trois âmes battues : la salle 1 est terminée');
ok(ouverte(d, e, 's2') && !ouverte(d, e, 's3'), 'la salle 2 s\'ouvre, pas la 3');
for (const k of ['d', 'e', 'f']) { appliquer(d, e, B, { a: 'prendre', pnj: k }); appliquer(d, e, B, { a: 'gagne', pnj: k }); }
ok(e.salles.s2.faite, 'salle 2 terminée');
ok(requisSalle({ joueurs: { mode: 'exact', n: 4 } }, {}, 4, 1) === 4 && requisSalle({ joueurs: { mode: 'exact', n: 4 } }, {}, 4, 6) === 4 && requisSalle({}, { requis: 2 }, 4, 1) === 2 && requisSalle({ joueurs: { mode: 'groupe', n: 3 } }, {}, 3, 2) === 2, 'dalles : nombre fixe pour un donjon à n joueurs');
ok(requisDalles(3, 1) === 1 && requisDalles(3, 2) === 2 && requisDalles(3, 5) === 3 && requisDalles(3, 0) === 1, 'dalles requises selon le groupe');
appliquer(d, e, A, { a: 'dalles', n: 1, requis: 2 });
ok(!e.salles.s3.faite && e.salles.s3.dalles === 1, 'une dalle sur deux : rien ne s\'ouvre');
appliquer(d, e, A, { a: 'dalles', n: 2, requis: 2 });
ok(e.salles.s3.faite && ouverte(d, e, 'boss'), 'deux joueurs sur les dalles : le tombeau s\'ouvre');
const v0 = e.v;
ok(appliquer(d, e, A, { a: 'degats', n: 50 }).ok && e.boss.pv === base * 4 - 50 && e.v === v0 + 1, 'les dégâts de A comptent pour tous');
appliquer(d, e, B, { a: 'degats', n: -40 });
ok(e.boss.pv === base * 4 - 50, 'des dégâts négatifs sont ignorés');
appliquer(d, e, B, { a: 'degats', n: 1e9 });
ok(e.boss.pv === 0 && e.fini && e.salles.boss.faite && e.vainqueurs.join() === '1,2', 'B achève le boss : donjon terminé, vainqueurs notés');
const run = e.run;
appliquer(d, e, C, { a: 'recommencer' });
ok(e.run === run + 1 && !e.fini && !e.salles.entree.faite && !e.boss, 'recommencer : tout se referme');
ok(!appliquer(d, e, A, { a: 'zzz' }).ok, 'une demande inconnue est refusée');


/* ---------------- donjon de Didier : clés, serrures, boss à plusieurs ---------------- */
{
  const D = DONJONS.find((q) => q.id === 'didier'), e = nouvelEtat(D);
  ok(appliquer(D, e, A, { a: 'prendre', pnj: 'x' }).ok && !appliquer(D, e, B, { a: 'prendre', pnj: 'x' }).ok, 'un seul joueur à la fois face à un Adepte');
  ok(appliquer(D, e, A, { a: 'cle', pnj: 'x' }).ok && clesDe(D, e, A).join() === 'x' && prisPar(e, D, 'x') === null, 'A reçoit la clé du delta');
  ok(!appliquer(D, e, B, { a: 'prendre', pnj: 'x' }).ok, 'un Adepte qui a donné sa clé ne se combat plus');
  ok(!appliquer(D, e, C, { a: 'inserer' }).ok, 'sans clé, rien à mettre dans les serrures');
  appliquer(D, e, B, { a: 'prendre', pnj: 'y' }); appliquer(D, e, B, { a: 'cle', pnj: 'y' });
  appliquer(D, e, B, { a: 'sortie' });
  ok(!e.salles.s1.cles.y && clesDe(D, e, B).length === 0, 'B quitte le donjon : sa clé retourne à l\'Adepte');
  appliquer(D, e, B, { a: 'cle', pnj: 'y' }); appliquer(D, e, C, { a: 'cle', pnj: 'z' });
  ok(appliquer(D, e, A, { a: 'inserer' }).ok && serrures(D, e) === 1 && !e.salles.s1.faite, 'une serrure remplie sur trois');
  ok(!appliquer(D, e, B, { a: 'pret' }).ok, 'le boss attend que l\'ascenseur soit ouvert');
  appliquer(D, e, B, { a: 'inserer' }); appliquer(D, e, C, { a: 'inserer' });
  ok(e.salles.s1.faite && serrures(D, e) === 3, 'trois clés : l\'ascenseur se déverrouille');
  appliquer(D, e, B, { a: 'sortie' });
  ok(serrures(D, e) === 3, 'une clé posée reste posée');
  ok(appliquer(D, e, A, { a: 'pret' }).ok && appliquer(D, e, B, { a: 'pret' }).ok && e.salles.boss.prets.length === 2, 'deux joueurs prêts devant le boss');
  appliquer(D, e, B, { a: 'pasPret' });
  ok(e.salles.boss.prets.join() === A, 'un joueur peut se retirer avant le combat');
  appliquer(D, e, A, { a: 'raid', etape: 'debut' });
  ok(e.salles.boss.combat && !appliquer(D, e, A, { a: 'pasPret' }).change, 'combat lancé : plus de retrait');
  appliquer(D, e, A, { a: 'raid', etape: 'fin', result: 'lose' });
  ok(!e.salles.boss.combat && !e.fini && !e.salles.boss.prets.length, 'défaite : le boss attend une nouvelle tentative');
  appliquer(D, e, A, { a: 'raid', etape: 'debut' }); appliquer(D, e, A, { a: 'raid', etape: 'fin', result: 'win', vainqueurs: [A, B] });
  ok(e.fini && e.salles.boss.faite && e.vainqueurs.join() === '1,2', 'victoire : donjon terminé');
  ok(D.questions && Object.values(D.pnj).filter((p) => p.quiz).every((p) => D.questions[p.quiz]?.r.length === 4), 'chaque Adepte a une question à 4 réponses');
}
{
  // combat à plusieurs : trois joueurs contre le Spectre, barre à trois blocs
  const rnd = (seed) => { let x = seed >>> 0; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; };
  let fins = { win: 0, lose: 0 }, depasse = 0, vitesse = 0, blocs = 0, bloque = 0;
  for (let k = 0; k < 120; k++) {
    const R = rnd(k + 3), n = 1 + (k % 3);
    const boss = createMon(2001, 48, { rng: R }); boss.stats[0] *= n; boss.hp = boss.stats[0];
    const joueurs = Array.from({ length: n }, (_, i) => ({ id: String(i + 1), nom: ['Lucas', 'Amiel', 'Éva'][i], party: [createMon(197, 30 + (k % 20), { rng: R }), createMon(94, 35, { rng: R })] }));
    const raid = new Raid({ joueurs, boss: { mon: boss, cls: '', nom: 'Pierre Chartier' }, rng: R });
    const seg = boss.stats[0] / 3;
    raid.start();
    let t = 0;
    while (raid.state !== 'over' && t++ < 400) {
      for (const id of raid.attendus()) {
        const j = joueurs.find((q) => q.id === id);
        const evs = raid.action(id, raid.state === 'switch' ? { type: 'switch', idx: j.party.findIndex((m) => m.hp > 0) } : k % 17 === 0 && t === 2 && id === '1' ? { type: 'forfeit' } : { type: 'move', idx: Math.floor(R() * 4) });
        for (const e of evs || []) {
          if (e.t === 'hp' && e.side === 1 && e.from - e.hp > Math.ceil(seg)) depasse++;
          if (e.t === 'bloc') blocs++;
        }
      }
    }
    if (raid.state !== 'over') bloque++;
    fins[raid.result] = (fins[raid.result] || 0) + 1;
    vitesse += raid.manches[0].sides[1].v.st[5];
  }
  ok(!bloque, `les combats à plusieurs se terminent (${bloque} bloqués)`);
  ok(depasse === 0, `un coup ne casse jamais plus d'un bloc (${depasse})`);
  ok(blocs > 0 && vitesse > 0, `les blocs cassés augmentent la Vitesse du boss (${blocs} blocs)`);
  ok(fins.win > 0 && fins.lose > 0, `victoires et défaites possibles (${JSON.stringify(fins)})`);
  // un joueur qui part pendant le combat ne bloque pas les autres
  const boss = createMon(2001, 48); boss.stats[0] *= 2; boss.hp = boss.stats[0];
  const raid = new Raid({ joueurs: [{ id: '1', nom: 'Lucas', party: [createMon(197, 60)] }, { id: '2', nom: 'Amiel', party: [createMon(94, 60)] }], boss: { mon: boss, nom: 'Pierre' } });
  raid.start();
  ok(raid.action('1', { type: 'move', idx: 0 }) === null, 'on attend le choix de tout le monde');
  raid.retirer('2', 'Amiel a quitté le combat.');
  ok(raid.avancer() && raid.turn === 1, 'le départ d\'un joueur débloque le tour');
  // gardien de la Force : immunisé aux attaques physiques tant que son premier bloc tient, Attaque en hausse à chaque bloc
  {
    const mv = (k) => Object.values(MOVES).find((m) => m.key === k).id;
    const essai = (attaque) => {
      const b = createMon(68, 25, { shiny: false }); b.moves = [{ id: mv('splash'), pp: 40 }];
      const j = createMon(65, 60, { shiny: false }); j.moves = [{ id: mv(attaque), pp: 30 }];
      const r = new Raid({ joueurs: [{ id: '1', nom: 'Lucas', party: [j] }], boss: { mon: b, nom: 'Gardien' }, blocs: 3, immunite: 'speciale', boost: 2, rng: () => 0.5 });
      r.start(); const avant = b.hp; r.action('1', { type: 'move', idx: 0 });
      return { degats: avant - b.hp, r };
    };
    const phys = essai('mega-punch'), spe = essai('psychic');
    ok(spe.degats === 0 && phys.degats > 0, `gardien de la Force : les attaques spéciales ne passent pas, les physiques si (${spe.degats}, ${phys.degats})`);
    ok(phys.r.bloc() < 3 ? phys.r.manches[0].sides[1].v.st[1] > 0 : true, 'gardien de la Force : son Attaque monte quand un bloc casse');
    ok(!phys.r.immunise() || phys.r.bloc() === 3, 'gardien de la Force : l\'immunité tombe avec le premier bloc');
  }
}

/* ---------------- gardien des Trois Voies : cinq blocs, effets une seule fois, soin de deux blocs ---------------- */
{
  const d = DONJONS.find((q) => q.id === 'voies'), P = d.pnj.M, mv = (k) => Object.values(MOVES).find((m) => m.key === k).id;
  const boss = createMon(P.espece, P.niveau, { shiny: false }); boss.stats[0] *= 3; boss.hp = boss.stats[0];
  boss.moves = P.moves.map((id) => ({ id, pp: MOVES[id].pp }));
  const joueurs = ['1', '2', '3'].map((id) => ({ id, nom: 'J' + id, party: [createMon(143, 60, { shiny: false }), createMon(76, 60, { shiny: false })] }));
  const r = new Raid({ joueurs, boss: { mon: boss, nom: 'Gardien' }, blocs: P.blocs, boost: P.boost, effets: P.effets, soin: P.soinBlocs, rng: () => 0.3 });
  r.start();
  const t = r.seuils(), m0 = r.manches[0];
  const casser = (k) => { r.dans(m0, () => { m0.hp(1, -(boss.hp - t[k] + 1)); }); r.bilan(); };
  casser(4);
  ok(r.roc && [2, 3, 4, 5, 6].every((s) => m0.sides[1].v.st[s - 1] === 1), 'gardien : premier bloc brisé, toutes ses stats montent et les pièges de roc sont posés');
  casser(3);
  const ko1 = [...r.koJoueurs];
  ok(ko1.length === 1 && r.manches.filter((q) => !isFainted(q.act(0))).every((q) => q.sides[0].v.st[1] === -2 && q.sides[0].v.st[3] === -2), 'gardien : deuxième bloc, Attaques baissées de deux crans et un Pokémon mis K.O.');
  // soin : deux blocs reviennent, mais les effets ne se rejouent pas
  const avantSoin = boss.hp; r.dans(m0, () => m0.hp(1, 10));
  ok(Math.abs(boss.hp - avantSoin - 2 * boss.stats[0] / P.blocs) <= 1, 'gardien : son soin rend deux blocs');
  casser(4); casser(3);
  ok(r.koJoueurs.size === 1 && m0.sides[1].v.st[1] === 1, 'gardien : les effets des blocs ne se rejouent pas après un soin');
  casser(2); casser(1);
  ok(r.koJoueurs.size === 3, 'gardien : chaque joueur perd un Pokémon, jamais deux fois le même joueur');
  // pièges de roc : le Pokémon qui entre est blessé
  const q = r.manches.find((x) => isFainted(x.act(0))), j = r.joueur(q.pid), entre = j.party.findIndex((x) => x.hp > 0), pv = j.party[entre].hp;
  r.dans(q, () => q.doSwitch(0, entre, true));
  ok(j.party[entre].hp < pv, 'gardien : les pièges de roc blessent le Pokémon qui entre');
  // gardien de la Force : le message classique
  const b = createMon(68, 25, { shiny: false }); b.moves = [{ id: mv('splash'), pp: 40 }];
  const jj = createMon(65, 60, { shiny: false }); jj.moves = [{ id: mv('psychic'), pp: 30 }];
  const rf = new Raid({ joueurs: [{ id: '1', nom: 'Lucas', party: [jj] }], boss: { mon: b, nom: 'Gardien' }, blocs: 3, immunite: 'speciale', boost: 2, rng: () => 0.5 });
  rf.start(); const evs = rf.action('1', { type: 'move', idx: 0 });
  ok(evs.some((e) => e.t === 'msg' && /^Ça n'affecte pas/.test(e.text)) && !evs.some((e) => e.t === 'msg' && /bouclier|immunis/i.test(e.text)), 'gardien de la Force : « Ça n\'affecte pas… », sans parler d\'immunité');
}

/* ---------------- un joueur à plusieurs places (mode test, duo de Karatékas) ---------------- */
{
  let bloque = 0, fins = {}, doublon = false;
  for (let t = 0; t < 60; t++) {
    const party = [[156, 30], [159, 30], [25, 30], [17, 29], [42, 29], [75, 30]].map(([sp, l]) => createMon(sp, l, { shiny: false }));
    const reserve = [[60, 22], [72, 22], [118, 22], [129, 21], [116, 21], [54, 22]].map(([sp, l]) => createMon(sp, l, { shiny: false }));
    const G = new Groupe({ joueurs: [{ id: '1', nom: 'Lucas', party, places: 3 }], dresseur: { nom: 'Sentinelle' }, reserve, places: 3, rng: Math.random });
    G.start();
    let n = 0;
    while (G.state !== 'over' && n++ < 300) {
      const actives = G.joueurs.filter((j) => j.etat !== 'dehors').map((j) => G.manche(j.id).sides[0].active);
      if (new Set(actives).size !== actives.length) doublon = true;
      const att = G.attendus(); if (!att.length) break;
      G.action('1', { type: 'multi', actions: G.joueurs.map((j) => (G.state === 'switch' ? { type: 'switch', idx: 0 } : { type: 'move', idx: Math.floor(Math.random() * 4), cible: Math.floor(Math.random() * 3) })) });
    }
    if (G.state !== 'over') bloque++;
    fins[G.result] = (fins[G.result] || 0) + 1;
  }
  ok(!bloque && !doublon, `seul à trois places : les combats finissent, jamais deux fois le même Pokémon en jeu (${bloque} bloqués)`);
  ok(fins.win > 0, `seul à trois places : on peut gagner (${JSON.stringify(fins)})`);
}

/* ---------------- combat de groupe (couples de la Pyramide, sentinelles des Trois Voies) ---------------- */
{
  let fins = {}, bloque = 0, envoisOk = true;
  for (let t = 0; t < 120; t++) {
    const n = t % 2 ? 2 : 3;
    const joueurs = Array.from({ length: n }, (_, i) => ({ id: String(i + 1), nom: 'J' + i, party: [createMon(6, 30), createMon(9, 30), createMon(3, 30)] }));
    const reserve = Array.from({ length: n === 2 ? 4 : 9 }, (_, i) => createMon([16, 19, 41, 66, 74, 92, 95, 129, 52][i % 9], 30));
    const G = new Groupe({ joueurs, dresseur: { cls: 'Duo', nom: 'Lise et Léo' }, reserve, rng: Math.random });
    const evs = G.start();
    envoisOk &&= evs.filter((e) => e.t === 'send' && e.side === 1).length === n && G.ciblesAdverses().length === n;
    for (let k = 0; k < 400 && G.state !== 'over'; k++) for (const id of G.attendus()) G.action(id, G.state === 'switch' ? { type: 'switch', idx: -1 } : { type: 'move', idx: k % 4, cible: k % 3 });
    if (G.state !== 'over') bloque++;
    fins[G.result] = (fins[G.result] || 0) + 1;
  }
  ok(envoisOk, 'combat de groupe : autant de Pokémon adverses en jeu que de joueurs');
  ok(!bloque && fins.win > 0, `combat de groupe : les combats se terminent (${JSON.stringify(fins)})`);
  // un joueur part : les autres continuent
  const G = new Groupe({ joueurs: [{ id: '1', nom: 'A', party: [createMon(6, 40)] }, { id: '2', nom: 'B', party: [createMon(9, 40)] }], dresseur: { nom: 'Duo' }, reserve: [createMon(16, 20), createMon(19, 20)] });
  G.start(); G.action('1', { type: 'move', idx: 0, cible: 1 }); G.retirer('2', 'B part.');
  ok(G.avancer() && G.turn === 1, 'combat de groupe : le départ d\'un joueur débloque le tour');
}

/* ---------------- lieux et équipes ---------------- */
const world = buildWorld();
for (const dd of DONJONS) { const cs = dd.plan ? [construireCarte(dd)] : construireSalles(dd); for (const c of cs) world.maps[c.id] = c; const e = relierExterieur(dd, cs[0]); if (e) world.maps[e.id] = e; }
const lieux = listerLieux(world, DONJONS);
ok(lieux.labo.length === DONJONS.length && lieux.villes.length >= 10 && lieux.routes.length >= 10 && lieux.grottes.length >= 5, 'liste des lieux');
for (const l of Object.values(lieux).flat()) {
  const m = world.maps[l.map];
  ok(m && walkable(m.get(l.x, l.y)) && !m.warpAt(l.x, l.y), `on apparaît sur une case libre : ${l.nom}`);
}
for (const E of EQUIPES) for (const [sp, lvl] of E.pokemon) ok(SPECIES[sp] && lvl > 0, `équipe ${E.id} : Pokémon ${sp}`);
for (const E of EQUIPES) for (const k of Object.keys(E.sac)) ok(ITEMS[k], `équipe ${E.id} : objet ${k}`);

console.log(fails ? `${fails} échec(s) sur ${checks} vérifications` : `TestOdyssée : ${checks} vérifications, tout est bon.`);
process.exit(fails ? 1 : 0);
