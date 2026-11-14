// tools/test-testodyssee.mjs — TestOdyssée : plans des donjons et règles partagées du groupe.
// node tools/test-testodyssee.mjs
import fs from 'node:fs';
import { DONJONS } from '../testodyssee/js/donjons/index.js';
import { DRESSEURS } from '../testodyssee/js/donjons/temple-chemins.js';
import { OBJETS_SALLES, DRESSEURS_TEMPLE, POKEMON_TEMPLE, BUTIN_TEMPLE } from '../testodyssee/js/donjons/temple.js';
import { construireCarte, construireSalles, passageSuivant, lirePlan, regionDe, ouvrir, aCote, relierExterieur, texteJoueurs } from '../testodyssee/js/donjon/plan.js';
import { installerContenu, STARTERS, refusCt, OBJETS } from '../testodyssee/js/contenu.js';
import { Raid } from '../testodyssee/js/combat/raid.js';
import { Battle as BattleT } from '../odyssee/js/core/battle.js';
import { Groupe } from '../testodyssee/js/combat/groupe.js';
import { nouvelEtat, appliquer, ouverte, battu, prisPar, requisDalles, requisSalle, clesDe, serrures, actifs, attendusArene, attendusSommet, areneEnCours, resoudreStarters } from '../testodyssee/js/donjon/etat.js';
import { TEMPLE, STARTERS_TEMPLE } from '../testodyssee/js/formes.js';
import { existsSync } from 'node:fs';
import { construireRoutes, ROUTES, FUSION } from '../testodyssee/js/rv/routes.js';
import * as RVR from '../testodyssee/js/rv/routes.js';
import { RV } from '../testodyssee/js/rv/donnees.js';
import { createMon, isFainted } from '../odyssee/js/core/mon.js';
import { MOVES } from '../odyssee/js/data/moves.js';
import { SPECIES } from '../odyssee/js/data/species.js';
import { ITEMS } from '../odyssee/js/core/items.js';
import { buildWorld } from '../odyssee/js/world/region.js';
import { listerLieux } from '../testodyssee/js/lieux.js';
import { construireMont, idSalle } from '../testodyssee/js/mont/mont.js';
import { SALLES as MONT_SALLES, LIENS as MONT_LIENS } from '../testodyssee/js/mont/plans.js';
import * as ILE_M from '../testodyssee/js/ile/modele.js';
import * as USINE_M from '../testodyssee/js/ile/usine.js';
const { construire: construireIle, nouvelleIle } = ILE_M;
import { EQUIPES } from '../testodyssee/js/equipes.js';
import { walkable, T } from '../odyssee/js/world/tiles.js';
import { ronde, vueGarde, sansEtreVu } from '../testodyssee/js/donjons/tombeau-gardes.js';
import { lirePlaques, grillesOuvertes, traversable } from '../testodyssee/js/donjon/plaques.js';
import { preparerDefense, nouvelleDefense, demarrerDefense, pasDefense, issueDefense } from '../testodyssee/js/donjon/defense.js';
import { cle, explorerGlace, faisceau, resoudreReflet, cheminGlace, reponseJuste } from '../testodyssee/js/donjon/casse-tetes.js';

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
    const m = construireSalles(d)[d.salles.findIndex((s) => s.id === 's1')], P = m.donjon.plan;
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
  // salle 0 : le miroir qui parle, même taille que la salle 1 ; la réponse tapée au clavier
  {
    const C = construireSalles(d), i0 = d.salles.findIndex((s) => s.id === 's0'), m = C[i0], P = m.donjon.plan;
    const m1 = C[d.salles.findIndex((s) => s.id === 's1')];
    ok(i0 === 0 && m.w === m1.w && m.h === m1.h, `miroirs : la Salle du Secret ouvre le donjon, à la taille de la salle 1 (${m.w} × ${m.h})`);
    ok(!m.reach(...P.depart)[P.suivante[1] * m.w + P.suivante[0]], 'miroirs : salle 0, le passage reste muré');
    ok(P.objets.M[0][0] === P.suivante[0] && P.objets.M[0][1] === P.suivante[1] + 1, 'miroirs : salle 0, le passage est derrière le miroir');
    ouvrir(m, ...P.objets.M[0]); passageSuivant(m, true);
    ok(m.reach(...P.depart)[P.suivante[1] * m.w + P.suivante[0]], 'miroirs : salle 0, le miroir effacé ouvre le passage');
    const R = d.objets.M.reponses;
    for (const t of ['secret', 'Silence', 'le SILENCE !', 'C\'est un secret', 'Tes secrets', 'un sécret', 'secre', 'silense']) ok(reponseJuste(t, R), `miroirs : « ${t} » est accepté`);
    for (const t of ['miroir', 'reflet', '', 'sel', 'ombre']) ok(!reponseJuste(t, R), `miroirs : « ${t} » est refusé`);
  }
  // salle 1 bis : cinq miroirs, deux fois la taille de la salle 1 ; les indices ne désignent que le cadre noir
  {
    const C = construireSalles(d), m = C[d.salles.findIndex((s) => s.id === 's1b')], P = m.donjon.plan, m1 = C[d.salles.findIndex((s) => s.id === 's1')];
    ok(m.w >= 2 * m1.w - 3 && P.sol.length >= 2 * m1.donjon.plan.sol.length, `miroirs : la Salle des Cinq Miroirs est au moins deux fois plus grande (${m.w} × ${m.h} contre ${m1.w} × ${m1.h})`);
    const ordre = ['H', 'I', 'J', 'O', 'U'].sort((a, b) => P.objets[a][0][0] - P.objets[b][0][0]);
    const coul = ordre.map((c) => d.objets[c].decor.replace('miroir_mur_', ''));
    ok(coul.join() === 'jaune,rouge,bleu,noir,vert', `miroirs : cadres de gauche à droite (${coul.join(', ')})`);
    const bons = coul.map((c, i) => i > 0 && i < 4 && coul[i - 1] !== 'rouge' && coul[i + 1] !== 'rouge' && !['rouge', 'jaune'].includes(c));
    ok(bons.filter(Boolean).length === 1 && d.objets[ordre[bons.indexOf(true)]].juste, 'miroirs : les trois indices ne laissent qu\'un miroir, le bon');
    ok(['H', 'I', 'J', 'O', 'U'].filter((c) => d.objets[c].juste).length === 1, 'miroirs : un seul bon miroir');
    const [ox, oy] = P.objets.O[0];
    ok(ox === P.suivante[0] && oy === P.suivante[1] + 1, 'miroirs : salle 1 bis, le passage est derrière le cadre noir');
    ok(!m.reach(...P.depart)[P.suivante[1] * m.w + P.suivante[0]], 'miroirs : salle 1 bis, le passage reste muré');
    ouvrir(m, ox, oy); passageSuivant(m, true);
    ok(m.reach(...P.depart)[P.suivante[1] * m.w + P.suivante[0]], 'miroirs : salle 1 bis, le bon miroir ouvre le passage');
  }
  // salles de glace : grandes, la sortie et chaque objet accessibles quels que soient ceux déjà pris, jamais coincé
  for (const [id, lettres, mini] of [['s2', ['p', 'q'], 8]]) {
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
  // les grottes sont grandes, pas en ligne droite : tout s'y atteint (rebords v pris en descendant seulement), deux dresseurs, des objets
  for (const n of [5, 6, 7]) {
    const s = S(`s${n}a`), P = s.plan, at = (x, y) => P[y]?.[x] ?? '#', bloque = new Set(['#', '%', '&', '|', 'l', ...s.pnj]);
    let dep; P.forEach((r, y) => { const x = r.indexOf('S'); if (x >= 0) dep = [x, y]; });
    const vus = new Set([dep.join()]), file = [dep];
    while (file.length) {
      const [x, y] = file.pop();
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        let tx = x + dx, ty = y + dy; const ch = at(tx, ty);
        if (bloque.has(ch)) continue;
        if (ch === 'v') { if (dy !== 1) continue; ty++; if (bloque.has(at(tx, ty))) continue; }
        if (!vus.has(`${tx},${ty}`)) { vus.add(`${tx},${ty}`); file.push([tx, ty]); }
      }
    }
    const ou = (chs) => { const l = []; P.forEach((r, y) => [...r].forEach((ch, x) => { if (chs.includes(ch)) l.push([x, y]); })); return l; };
    const proche = ([x, y]) => [[0, -1], [0, 1], [-1, 0], [1, 0]].some(([dx, dy]) => vus.has(`${x + dx},${y + dy}`));
    ok(P.length >= 36 && P[0].length >= 50 && vus.has(ou('N')[0].join()) && ou('hrfuem').length >= 6 && ou('hrfuem').every((q) => vus.has(q.join())) && s.pnj.every((k) => ou(k).length === 1 && proche(ou(k)[0])), `pyramide : ${s.nom} est grande, et sa sortie, ses objets et ses deux dresseurs s'atteignent`);
  }
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

/* ---------------- Mine Effondrée ---------------- */
{
  const d = DONJONS.find((q) => q.id === 'mine'), cartes = construireSalles(d), V4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  ok(texteJoueurs(d) === 'Donjon de 2 à 4 joueurs', 'mine : de 2 à 4 joueurs');
  for (const m of cartes) {
    const s = d.salles.find((q) => q.carte === m.id); if (!s.niveau) continue;
    const P = m.donjon.plan, O = P.objets, lettres = Object.keys(O).filter((c) => d.objets[c].type === 'barriere');
    const fiss = new Set((O['~'] || []).map(([x, y]) => cle(x, y)));
    const atteint = (ouvertes, eviter) => {
      const ferme = new Set(lettres.filter((c) => !ouvertes.has(c)).flatMap((c) => O[c].map(([x, y]) => cle(x, y))));
      const sol = new Set(P.sol.map(([x, y]) => cle(x, y))), vu = new Set([cle(...P.depart)]), f = [P.depart];
      const bloque = (x, y) => !sol.has(cle(x, y)) || ferme.has(cle(x, y)) || (eviter && fiss.has(cle(x, y))) || P.decor.some(([, a, b]) => a === x && b === y) || Object.values(P.pnj).some(([[a, b]]) => a === x && b === y);
      while (f.length) { const [x, y] = f.shift(); for (const [dx, dy] of V4) { const k = cle(x + dx, y + dy); if (vu.has(k) || bloque(x + dx, y + dy)) continue; vu.add(k); f.push([x + dx, y + dy]); } }
      return vu;
    };
    const cage = (vu) => O.c.some(([x, y]) => vu.has(cle(x, y)));
    ok(!cage(atteint(new Set(), true)), `mine : ${s.nom}, barrières fermées, la cage est hors d'atteinte (sans passer sous un plafond fissuré)`);
    ok(cage(atteint(new Set(lettres), false)), `mine : ${s.nom}, barrières ouvertes, on atteint la cage`);
    // un réglage des barrières (aiguillages compris) mène à la cage sans passer sous un plafond fissuré
    const permis = (set) => [...set].every((c) => !d.objets[c].lien || !set.has(d.objets[c].lien));
    let sur = 0, fissuresUtiles = false;
    for (let k = 0; k < 1 << lettres.length; k++) {
      const set = new Set(lettres.filter((_, i) => k & (1 << i))); if (!permis(set)) continue;
      if (cage(atteint(set, true))) sur++;
      else if (cage(atteint(set, false))) fissuresUtiles = true;
    }
    ok(sur > 0, `mine : ${s.nom}, il existe un chemin sûr avec les bonnes barrières (${sur} réglages)`);
    ok(fissuresUtiles, `mine : ${s.nom}, certains chemins passent sous un plafond fissuré`);
    ok(lettres.some((c) => d.objets[c].lien), `mine : ${s.nom}, au moins un aiguillage`);
    const tout = atteint(new Set(lettres), false);
    for (const [k, [[x, y]]] of Object.entries(P.pnj)) ok(V4.some(([dx, dy]) => tout.has(cle(x + dx, y + dy))), `mine : ${s.nom}, on peut atteindre ${k}`);
    ok(m.dark === 'arene' && P.sol.length > 600, `mine : ${s.nom}, grand niveau dans le noir`);
  }
  ok(d.salles.filter((q) => q.cageVers).every((q) => d.salles.some((x) => x.id === q.cageVers)), 'mine : chaque cage mène quelque part');
  const e = nouvelEtat(d);
  const r1 = appliquer(d, e, '1', { a: 'poste', salle: 'm0' }), r2 = appliquer(d, e, '2', { a: 'poste', salle: 'm0' });
  appliquer(d, e, '1', { a: 'sortie' });
  ok(r1.ok && !r2.ok && r2.why === 'pris' && !e.salles.m0.donnees.poste, 'mine : un seul joueur au poste, qui le lâche en partant');
}

/* ---------------- Train Fantôme ---------------- */
{
  const d = DONJONS.find((q) => q.id === 'train'), cartes = construireSalles(d), M = Object.fromEntries(cartes.map((m) => [m.salle, m])), V4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const voitures = d.salles.filter((q) => /^v\d/.test(q.id)).map((q) => q.id);
  ok(d.horloge.decroche.flat().every((id, i, l) => voitures.indexOf(id) === i), 'train : les voitures se décrochent par la queue, dans l\'ordre');
  ok(d.horloge.decroche.length * d.horloge.gare < d.horloge.terminus && d.gares.length >= d.horloge.decroche.length, 'train : chaque gare a son nom, le terminus vient après la dernière');
  ok(voitures.every((id, i) => (i < voitures.length - 1 ? M[id].donjon.versSuivante?.map === M[voitures[i + 1]].id : M[id].donjon.versSuivante?.map === M.loco.id)), 'train : chaque voiture mène à la suivante, la dernière à la locomotive');
  ok(!M.voie.donjon.versSuivante && M.voie.donjon.plan.objets.M?.length === 1, 'train : la voie ferrée se quitte par le marchepied');
  for (const m of cartes) {
    const P = m.donjon.plan;
    for (const l of Object.values(P.portes)) for (const [x, y] of l) ouvrir(m, x, y);
    if (P.suivante) passageSuivant(m, true);
    const caisses = new Set((P.objets.L || []).map(([x, y]) => cle(x, y)));
    for (const k of caisses) ouvrir(m, ...k.split(',').map(Number));
    const vu = m.reach(...P.depart), at = (x, y) => vu[y * m.w + x];
    if (P.suivante) ok(at(...P.suivante), `train : ${m.salle}, on va de l'entrée à la sortie`);
    for (const [k, [[x, y]]] of Object.entries(P.pnj)) ok(V4.some(([dx, dy]) => at(x + dx, y + dy)), `train : ${m.salle}, on peut parler à ${k}`);
    for (const c of ['K', 'M', 'R']) for (const [x, y] of P.objets[c] || []) ok(V4.some(([dx, dy]) => at(x + dx, y + dy)), `train : ${m.salle}, on atteint ${c}`);
  }
  // fourgon à bagages : les caisses barrent la route, on passe en les poussant
  {
    const m = construireSalles(d).find((q) => q.salle === 'v5'), P = m.donjon.plan, c0 = new Set(P.objets.L.map(([x, y]) => cle(x, y)));
    passageSuivant(m, true);
    const mur = (x, y) => !m.in(x, y) || !walkable(m.get(x, y)) && !c0.has(cle(x, y));
    const but = cle(...P.suivante);
    const resoudre = (pousser) => {
      const vu = new Set([cle(...P.depart) + '|' + [...c0].sort()]), f = [[P.depart, c0]];
      while (f.length) {
        const [[x, y], cs] = f.shift(); if (cle(x, y) === but) return true;
        for (const [dx, dy] of V4) {
          const nx = x + dx, ny = y + dy; if (mur(nx, ny)) continue; let n = cs;
          if (cs.has(cle(nx, ny))) { if (!pousser) continue; const bx = nx + dx, by = ny + dy; if (mur(bx, by) || cs.has(cle(bx, by)) || cle(bx, by) === but) continue; n = new Set(cs); n.delete(cle(nx, ny)); n.add(cle(bx, by)); }
          const k = cle(nx, ny) + '|' + [...n].sort(); if (!vu.has(k)) { vu.add(k); f.push([[nx, ny], n]); }
        }
      }
      return false;
    };
    ok(!resoudre(false) && resoudre(true), 'train : fourgon à bagages, il faut pousser les caisses pour passer');
  }
  ok(requisSalle(d, d.salles.find((q) => q.id === 'v4'), 2, 1) === 1 && requisSalle(d, d.salles.find((q) => q.id === 'v4'), 2, 3) === 2, 'train : la voiture verrouillée demande deux voyageurs (un seul s\'il est seul)');
  for (const p of Object.values(d.pnj)) for (const [sp] of p.equipe || []) ok(!!SPECIES[sp], `train : ${p.nom}, espèce ${sp}`);
}

/* ---------------- panneau d'entrée (standard de tous les donjons) ---------------- */
ok(texteJoueurs({ joueurs: { mode: 'solo' } }) === 'Donjon solo' && texteJoueurs({ joueurs: { mode: 'exact', n: 4 } }) === 'Donjon à 4 joueurs' && /solo ou en groupe \(3 joueurs recommandés\)/.test(texteJoueurs({ joueurs: { mode: 'groupe', n: 3 } })), 'panneau : les trois façons de dire le nombre de joueurs');
for (const d of DONJONS.filter((q) => !q.arene)) {
  ok(d.entree && d.joueurs && ['solo', 'groupe', 'exact', 'entre'].includes(d.joueurs.mode), `${d.id} : phrase et nombre de joueurs du panneau d'entrée`);
  const m = d.plan ? construireCarte(d) : construireSalles(d)[0], dehors = relierExterieur(d, m);
  const [px, py] = dehors ? m.donjon.exterieur.porte : [0, 0];
  const panneaux = dehors ? [...dehors.signs].filter(([, t]) => t.startsWith(d.nom + '\n')) : [];
  ok(panneaux.length === 1 && panneaux[0][1].split('\n').length === 3 && panneaux[0][1].split('\n')[2] === texteJoueurs(d), `${d.id} : un panneau d'entrée de trois pages dehors`);
  if (panneaux.length) {
    const [x, y] = panneaux[0][0].split(',').map(Number), vu = dehors.reach(px, py + 2);
    const Ep = m.donjon.exterieur.panneau;
    if (Ep) ok(x === Ep[0] && y === Ep[1] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => vu[(y + dy) * dehors.w + x + dx]), `${d.id} : le panneau est là où le donjon le pose, et on peut le lire`);
    else ok(Math.abs(x - px) <= 2 && y - py >= 1 && y - py <= 3 && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => vu[(y + dy) * dehors.w + x + dx]), `${d.id} : le panneau est près de la porte et on peut le lire`);
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

/* ---------------- île privée ---------------- */
{
  const M = ILE_M, ile = M.nouvelleIle('Île de Test'), maps = {};
  const m = M.construire(maps, ile);
  ok(maps[M.ILE] && maps[`${M.ILE}:mairie`] && maps[`${M.ILE}:musee`] && maps[`${M.ILE}:maison`], 'île : la carte et ses trois intérieurs');
  ok(walkable(m.get(...M.ARRIVEE)) && M.cheminLibre(ile), 'île : du débarcadère, on rejoint la maison, la mairie et le musée');
  ok(JSON.stringify(M.forme()) === JSON.stringify(M.forme()) && M.construire({}, M.nouvelleIle('Autre'), { seul: true }).t.join() === M.construire({}, M.nouvelleIle('Encore'), { seul: true }).t.join(), 'île : la même forme pour tout le monde');
  // les règles de pose
  const [mx, my] = ile.fixes.maison, porte = M.portes(ile)[0];
  ok(!M.posable(ile, { a: 'arbre', x: 2, y: 2 }).ok, 'île : rien dans l\'eau');
  ok(!M.posable(ile, { a: 'arbre', x: mx + 1, y: my + 1 }).ok, 'île : rien sur un bâtiment');
  ok(!M.posable(ile, { a: 'arbre', x: M.ARRIVEE[0], y: M.ARRIVEE[1] }).ok, 'île : le débarcadère reste libre');
  ok(M.posable(ile, { a: 'chemin', x: porte[0], y: porte[1] }).ok, 'île : on peut paver devant une porte');
  // entourer la porte de la maison d'arbres : le dernier qui fermerait le passage est refusé
  const essai = M.nouvelleIle('Mur');
  const [px, py] = M.portes(essai)[0];
  for (const [x, y] of [[px - 1, py], [px + 1, py], [px - 1, py + 1], [px + 1, py + 1], [px - 1, py + 2], [px + 1, py + 2]]) M.poser(essai, { a: 'arbre', x, y });
  ok(M.cheminLibre(essai) && !M.posable(essai, { a: 'arbre', x: px, y: py + 1 }).ok && /chemin/.test(M.posable(essai, { a: 'arbre', x: px, y: py + 1 }).why), 'île : on ne peut pas couper le chemin vers un bâtiment');
  // un sol remplace l'ancien, un bâtiment occupe toute son emprise
  const s2 = M.nouvelleIle('Sols'); M.poser(s2, { a: 'chemin', x: 20, y: 20 }); M.poser(s2, { a: 'paves', x: 20, y: 20 });
  ok(s2.travaux.length === 1 && s2.travaux[0].a === 'paves', 'île : un sol remplace le sol de la case');
  M.poser(s2, { a: 'house', x: 10, y: 18 });
  ok(!M.posable(s2, { a: 'banc', x: 12, y: 21 }).ok && M.articleEn(s2, 13, 20) === 1 && M.articleEn(s2, 13, 21) === -1, 'île : un bâtiment occupe son emprise et la case devant sa porte');
  // trophées : badges et donjons finis, un exemplaire chacun
  const st = { badges: [true, true, false, false, false, false, false, false] };
  const t0 = M.debloques(ile, st);
  ile.donjons.push('pyramide');
  ok(t0.length === 2 && M.debloques(ile, st).includes('pyramide'), 'île : les trophées viennent des badges et des donjons finis');
  M.poser(ile, { a: 'tr:pyramide', x: 22, y: 20 });
  ok(M.trophePlace(ile, 'pyramide') === 'ile' && !M.posable(ile, { a: 'tr:pyramide', x: 24, y: 20 }).ok, 'île : un trophée posé ne se pose pas deux fois');
  ok(DONJONS.filter((d) => !d.arene).every((d) => M.TROPHEES.some((t) => t.donjon === d.id)) && M.TROPHEES.every((t) => SPECIES[t.sp]), 'île : une statue pour chaque donjon du labo');
  ok(M.CATALOGUE.every((a) => a.t != null || a.p || a.s || a.b || a.tr || a.piege || a.statue || a.garde), 'île : chaque article du catalogue sait se poser');
  // déplacer un bâtiment fixe : il ne bloque plus sa place pendant qu'on le porte
  const d2 = M.nouvelleIle('Déplacer'); d2.cache = 'mairie';
  const [ax, ay] = d2.fixes.mairie;
  ok(M.posable(d2, { a: 'arbre', x: ax + 1, y: ay + 1 }).ok && M.posable(d2, { fixe: 'mairie', x: ax - 4, y: ay + 6 }).ok, 'île : on déplace la mairie ailleurs sur l\'herbe');
  // portique torii : on passe entre ses poteaux, pas à travers
  {
    const t = M.nouvelleIle('Torii'); M.poser(t, { a: 'torii', x: 20, y: 20 });
    const m = M.construire({}, t, { seul: true });
    ok(!walkable(m.get(19, 20)) && !walkable(m.get(21, 20)) && walkable(m.get(20, 20)) && !M.posable(t, { a: 'banc', x: 21, y: 20 }).ok, 'île : le portique torii bloque ses poteaux et laisse passer au milieu');
  }
  // le musée : on y pose librement, il s'agrandit, ses passages restent libres
  {
    const mu = M.nouvelleIle('Musée'); mu.donjons.push('crypte');
    ok(M.sallesMusee(0) === 1 && M.sallesMusee(4) === 2 && M.sallesMusee(40) === 4, 'île : le musée gagne une salle tous les quatre trophées');
    ok(M.posable(mu, { a: 'tr:crypte', x: 4, y: 4 }, 'musee').ok && !M.posable(mu, { a: 'arbre', x: 4, y: 4 }, 'musee').ok && !M.posable(mu, { a: 'plante', x: 20, y: 20 }).ok, 'île : chaque article a ses zones (le musée, dehors)');
    ok(!M.posable(mu, { a: 'tr:crypte', x: 14, y: 6 }, 'musee', { salles: 2 }).ok && M.posable(mu, { a: 'tr:crypte', x: 16, y: 3 }, 'musee', { salles: 2 }).ok && !M.posable(mu, { a: 'tr:crypte', x: 16, y: 3 }, 'musee', { salles: 1 }).ok, 'île : une salle de plus ouvre de la place, pas les passages');
    M.poser(mu, { a: 'tr:crypte', x: 4, y: 4 }, 'musee');
    const mm = M.construireMusee(mu, 1);
    ok(M.trophePlace(mu, 'crypte') === 'musee' && mm.statues.length === 1 && mm.objectAt(4, 4)?.trophee === 'crypte', 'île : une statue posée au musée');
    // une ligne de vases qui fermerait la salle est refusée
    const bloc = M.nouvelleIle('Bloc'); let refuse = false;
    for (let x = 1; x <= 13 && !refuse; x++) { const r = M.posable(bloc, { a: 'vase', x, y: 8 }, 'musee'); if (r.ok) M.poser(bloc, { a: 'vase', x, y: 8 }, 'musee'); else refuse = /passage|entrée/.test(r.why); }
    ok(refuse && M.musseeRelie(bloc, 1), 'île : on ne ferme pas le musée sur lui-même');
  }
  ok(M.TROPHEES.every((t) => /^En récompense pour avoir (triomphé de l'arène|terminé) /.test(t.origine)) && M.TROPHEE.badge0.origine.includes('Sylvebourg'), 'île : chaque trophée dit ce qui l\'a rapporté');
  ok(M.etatIle({ nom: 'v1', fixes: {}, travaux: [], donjons: ['crypte'], musee: { 0: 'crypte' } }).musee.travaux[0]?.a === 'tr:crypte', 'île : les statues de l\'ancien musée sont gardées');
  ok(M.etatIle(JSON.parse(JSON.stringify(ile))).travaux.length === ile.travaux.length && M.etatIle(null).fixes.maison, 'île : la donnée se relit telle quelle');
}

/* ---------------- Temple des Éléments ---------------- */
{
  const d = DONJONS.find((q) => q.id === 'temple');
  const cartes = construireSalles(d), par = Object.fromEntries(d.salles.map((s, i) => [s.id, cartes[i]]));
  // le hall, ses deux portes, les salles des dalles
  {
    const Ph = par.h0.donjon.plan;
    ok(d.salles[0].id === 'h0' && Ph.objets.e?.length === 1 && Ph.objets.p?.length === 1 && Ph.pnj['!'] && Ph.pnj['@'] && Object.keys(Ph.pnj).length >= 9 && par.h0.w >= 30, 'temple : un grand hall, le vieil homme, le moine, des dresseurs et deux portes');
    const [px, py] = Ph.objets.p[0], [[mx, my]] = Ph.pnj['@'];
    ok(mx === px && my === py + 1 && d.objets.p.moine && d.badgesSolo === 10 && d.pnj['@'].moine, 'temple : le moine garde la porte du solo et demande 10 badges');
    ok(d.pnj['!'].dit.length >= 4 && d.pnj['!'].dit.some((t) => /trois/.test(t)) && d.pnj['!'].dit.some((t) => /dix badges/.test(t)), 'temple : le vieil homme explique les deux épreuves');
    ok(par.e1.donjon.plan.dalles.length === 3 && !par.e1.donjon.plan.objets.X && d.salles.find((s) => s.id === 'e1').requis === 3 && par.eo.donjon.plan.objets.X?.length === 1 && par.eo.donjon.plan.objets.G?.length === 3, 'temple : trois dalles d\'un côté, la dalle d\'or et la grande porte de l\'autre');
    ok(d.salles.find((s) => s.id === 'e1').retour.join() === 'h0,e' && d.salles.find((s) => s.id === 'eo').retour.join() === 'h0,p' && par.e1.donjon.versSuivante?.map === par.g2.id, 'temple : les deux salles ramènent au hall');
  }
  ok(par.g2.donjon.versSuivante == null && ['f', 'e', 'p'].every((c) => ['g', 's'].every((b) => par[`${b}${c}1`].donjon.versSuivante?.map === par[`${b}${c}2`].id && par[`${b}${c}2`].donjon.versSuivante?.map === par[`${b}${c}3`].id && (c === 'e' ? par[`${b}e3`].donjon.versSuivante?.map === par[`${b}e4`].id && par[`${b}e4`].donjon.versSuivante?.map === par[`${b}4`].id : par[`${b}${c}3`].donjon.versSuivante?.map === par[`${b}4`].id))) && par.g4.donjon.versSuivante?.map === par.g5.id && par.s4.donjon.versSuivante?.map === par.s5.id, 'temple : les chemins se rejoignent à la Salle des Clés, puis le Gardien');
  ok(['f', 'e', 'p'].every((c) => ['g', 's'].every((b) => (c === 'e' ? [2, 3, 4] : [2, 3]).every((n) => par[`${b}${c}${n}`].warpAt(...par[`${b}${c}${n}`].donjon.plan.sortie)?.map === par[`${b}${c}${n - 1}`].id))), 'temple : dans un chemin, on peut revenir à la salle d\'avant');
  // les chemins : trois grandes salles par élément, chacune avec sa mécanique (les mêmes plans à trois et en solo)
  {
    const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], K = (x, y) => x + ',' + y;
    const lire = (s) => { const P = s.plan, at = (x, y) => P[y]?.[x] ?? '#'; const ou = (chs) => { const l = []; P.forEach((r, y) => [...r].forEach((ch, x) => { if (chs.includes(ch)) l.push([x, y]); })); return l; }; return { P, at, ou, S: ou('S')[0], N: ou('N')[0] }; };
    const flot = (dep, passe) => { const vus = new Set([K(...dep)]), f = [dep]; while (f.length) { const [x, y] = f.pop(); for (const [dx, dy] of D4) { const t = [x + dx, y + dy]; if (!vus.has(K(...t)) && passe(t[0], t[1], x, y)) { vus.add(K(...t)); f.push(t); } } } return vus; };
    const pres = (vus, [x, y]) => vus.has(K(x, y)) || D4.some(([dx, dy]) => vus.has(K(x + dx, y + dy)));
    for (const c of ['f', 'e', 'p']) for (const n of [1, 2, 3]) {
      const s = d.salles.find((q) => q.id === `g${c}${n}`), { P, at, ou, S, N } = lire(s);
      const so = d.salles.find((q) => q.id === `s${c}${n}`), memePlan = n <= 2 ? so.plan.length === P.length && so.plan[0].length === P[0].length : so.plan === s.plan;
      ok((c === 'e' ? P.length === 61 && P[0].length === 80 : P.length === 45 && P[0].length === 60) && memePlan && ou('x').length === 1 && ou('z').length === 1 && ou('I').length === (n === 1 ? 2 : 3) && !ou('JOPV').length && OBJETS_SALLES[n].length === ou('I').length, `temple : ${s.id} (${s.nom}) est grande, sert aussi en solo, avec ${ou('I').length} objets et ses deux recoins`);
      // ses dresseurs : 5 ou 6, sur le sol (ou sur l'eau, pour les nageurs), loin les uns des autres
      const dr = DRESSEURS[`${c.toUpperCase()}${n}`];
      ok(dr.length >= 5 && dr.length <= 6 && dr.every(([x, y, dir, ou2]) => (ou2 === 'eau' ? at(x, y) === '~' : at(x, y) === '.') && ['up', 'down', 'left', 'right'].includes(dir)) && dr.every((a, i) => dr.every((b, j) => i === j || Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) >= 9)) && (c !== 'e' || dr.some((q) => q[3] === 'eau')), `temple : ${s.id} a ${dr.length} dresseurs${c === 'e' ? ', dont des nageurs sur l\'eau' : ''}`);
      ok((n === 3 && c !== 'e') === !!s.cle && (n !== 3 || c === 'e' || ou('K').length === 1) && (c !== 'e' || !ou('K').length) && s.biome && s.voie === c, `temple : ${s.id} a sa roche, et la clé est dans la troisième salle`);
      let zA, zB;
      if (c === 'f') {
        // Feu : à pied, barrières fermées ; chaque interrupteur a son rocher, loin, qu'on amène en 12 poussées au moins
        const SOLJ = '.=*^ixzSN', SOLR = '.=*^i';
        const marche = (dep, mur, g = at) => flot(dep, (x, y) => SOLJ.includes(g(x, y)) && !mur.has(K(x, y)));
        const poussees = (but, roc) => {
          const g = (x, y) => (x === roc[0] && y === roc[1] ? '.' : at(x, y));
          const cout = new Map(), file = [[], []], e = (b, k) => K(...b) + '|' + k;
          D4.forEach(([dx, dy], k) => { if (SOLJ.includes(g(but[0] + dx, but[1] + dy))) { cout.set(e(but, k), 0); file[0].push([but, k]); } });
          const faits = new Set(); let niveau = 0;
          while (file[0].length || file[1].length) {
            if (!file[0].length) { file[0] = file[1]; file[1] = []; niveau++; }
            const [b, k] = file[0].pop(), id = e(b, k); if (faits.has(id) || cout.get(id) !== niveau) continue; faits.add(id);
            const [dx, dy] = D4[k], j = [b[0] + dx, b[1] + dy], zone = marche(j, new Set([K(...b)]), g);
            D4.forEach(([ax, ay], k2) => { if (k2 !== k && zone.has(K(b[0] + ax, b[1] + ay)) && !(cout.get(e(b, k2)) <= niveau)) { cout.set(e(b, k2), niveau); file[0].push([b, k2]); } });
            const j2 = [j[0] + dx, j[1] + dy];
            if (SOLR.includes(g(...j)) && SOLJ.includes(g(...j2)) && !(cout.get(e(j, k)) <= niveau + 1)) { cout.set(e(j, k), niveau + 1); file[1].push([j, k]); }
          }
          return cout;
        };
        const paires = [['*', '+'], ['^', '-'], ['i', 's']].filter(([b]) => ou(b).length);
        ok(paires.length === (n === 3 ? 3 : 2) && ou('B').length === paires.length && ou('m').length >= 1, `temple : ${s.id} a ${paires.length} barrières, autant d'interrupteurs et de rochers, et des rochers fissurés`);
        if (n === 3) {
          // la clé : loin de la sortie, derrière la troisième barrière
          const [k] = ou('K'), sans = flot(S, (x, y) => (SOLJ + '+-').includes(at(x, y)));
          ok(!pres(sans, k) && Math.abs(k[0] - N[0]) + Math.abs(k[1] - N[1]) >= 25, `temple : dans ${s.id}, la clé est loin de la sortie, derrière sa propre barrière`);
        }
        zA = marche(S, new Set()); zB = marche([N[0], N[1] + 1], new Set());
        ok(!zA.has(K(N[0], N[1] + 1)), `temple : ${s.id} ne se traverse pas barrières fermées`);
        for (const [b, bar] of paires) {
          const [but] = ou(b), [porte] = ou(bar);
          // la barrière se voit avant l'interrupteur : à moins de dix pas l'un de l'autre, du même côté
          const cote = D4.map(([dx, dy]) => [porte[0] + dx, porte[1] + dy]).filter((t) => SOLJ.includes(at(...t))).map((t) => marche(t, new Set())).find((z) => z.has(K(...but)));
          const pas = (() => { const dist = new Map(), f = []; for (const [dx, dy] of D4) { const t = [porte[0] + dx, porte[1] + dy]; if (cote?.has(K(...t))) { dist.set(K(...t), 1); f.push(t); } } for (let i = 0; i < f.length; i++) { const [x, y] = f[i]; for (const [dx, dy] of D4) { const t = [x + dx, y + dy]; if (cote.has(K(...t)) && !dist.has(K(...t))) { dist.set(K(...t), dist.get(K(x, y)) + 1); f.push(t); } } } return dist.get(K(...but)); })();
          ok(cote && pas <= 9, `temple : dans ${s.id}, l'interrupteur ${b} est tout près de sa barrière (${pas} pas)`);
          // le rocher de ce côté-là, et le nombre de poussées
          const roc = ou('B').find((r) => pres(cote, r));
          const cout = roc && poussees(but, roc), acces = roc && marche([...cote].map((q) => q.split(',').map(Number)).find((q) => !(q[0] === roc[0] && q[1] === roc[1])), new Set([K(...roc)]));
          const possibles = roc ? D4.map(([dx, dy], k) => (acces.has(K(roc[0] + dx, roc[1] + dy)) ? cout.get(K(...roc) + '|' + k) : undefined)).filter((v) => v != null) : [];
          const mini = Math.min(...possibles);
          ok(possibles.length && mini >= 12, `temple : dans ${s.id}, le rocher s'amène sur l'interrupteur ${b}, en ${mini} poussées au moins`);
        }
      } else if (c === 'e') {
        // Eau : à pied sur la terre, emporté par le courant sur l'eau
        const EAU = '~<>()', TERRE = '.SNKxz', DIR = { '<': [-1, 0], '>': [1, 0], '(': [0, -1], ')': [0, 1] };
        const pas = ([x, y]) => { const out = []; for (const [dx, dy] of D4) { let n = [x + dx, y + dy]; const ch = at(...n); if (TERRE.includes(ch)) { out.push(n); continue; } if (!EAU.includes(ch)) continue; for (let k = 0; k < 400 && DIR[at(...n)]; k++) { const [ax, ay] = DIR[at(...n)], m = [n[0] + ax, n[1] + ay]; if (!EAU.includes(at(...m))) break; n = m; } out.push(n); } return out; };
        const vus = new Map([[K(...S), S]]), arcs = new Map(), f = [S];
        while (f.length) { const q = f.pop(), l = pas(q); arcs.set(K(...q), l); for (const t of l) if (!vus.has(K(...t))) { vus.set(K(...t), t); f.push(t); } }
        const inv = new Map(); for (const [a, l] of arcs) for (const t of l) { if (!inv.has(K(...t))) inv.set(K(...t), []); inv.get(K(...t)).push(a); }
        const bons = new Set([K(...N)]), g = [K(...N)]; while (g.length) for (const a of inv.get(g.pop()) || []) if (!bons.has(a)) { bons.add(a); g.push(a); }
        const sec = flot(S, (x, y) => TERRE.includes(at(x, y)) || at(x, y) === '~');
        ok(vus.has(K(...N)) && ou('IJOPVKxz').every((b) => pres(vus, b)) && ou('<>()').length >= 40, `temple : ${s.id} est un labyrinthe de rivières, la sortie et tous les objets s'y atteignent`);
        ok([...vus.keys()].every((q) => bons.has(q)), `temple : dans ${s.id}, aucune rivière ne mène à un piège (de partout, la sortie reste atteignable)`);
        ok(!sec.has(K(...N)), `temple : ${s.id} ne se traverse pas sans se laisser porter par les rivières`);
        zA = flot(S, (x, y) => TERRE.includes(at(x, y))); zB = flot(N, (x, y) => TERRE.includes(at(x, y)));
      } else {
        // Plante : les ronces tombent quand on coupe l'arbuste de leur couleur
        const MURS = '#Yu', ARB = n === 3 ? 'ryqv' : 'ryq', RON = n === 3 ? 'tdgn' : 'tdg';
        ok(ou('C').length >= 5 && ou('C').length <= 10, `temple : dans ${s.id}, ${ou('C').length} petits arbres à couper barrent des passages`);
        const marche = (ouverts, dep = S) => flot(dep, (x, y) => { const ch = at(x, y); return !MURS.includes(ch) && !'IJOPV'.includes(ch) && !((ARB + RON).includes(ch) && !ouverts.includes(ch)); });
        let ouverts = '', bon = [...ARB].every((q) => ou(q).length === 1) && [...RON].every((q) => ou(q).length === 4);
        for (let k = 0; k < ARB.length && bon; k++) {
          const v = marche(ouverts), [arb] = ou(ARB[k]), ronces = ou(RON[k]);
          bon = (k === 3 ? !pres(v, ou('K')[0]) : !v.has(K(...N))) && pres(v, arb) && !v.has(K(...arb)) && ronces.some((q) => pres(v, q))
            && ronces.every(([x, y]) => Math.abs(x - arb[0]) <= 7 && Math.abs(y - arb[1]) <= 5);
          ouverts += ARB[k] + RON[k];
        }
        ok(bon, `temple : dans ${s.id}, ${ARB.length} ronces ferment le chemin${n === 3 ? ' et la clé' : ''} ; chacune se voit avec son arbuste, tout près, et tombe quand on le coupe`);
        if (n === 3) { const [k] = ou('K'); ok(Math.abs(k[0] - N[0]) + Math.abs(k[1] - N[1]) >= 25, `temple : dans ${s.id}, la clé est loin de la sortie`); }
        ok(marche(ouverts).has(K(...N)) && ou('IJOPVKxz').every((b) => pres(marche(ouverts), b)), `temple : ${s.id}, ronces tombées, mène à la sortie et à tous ses objets`);
        // l'arbuste n'est pas à côté : il faut un détour
        const detours = [...ARB].map((_, k) => {
          const [arb] = ou(ARB[k]), v = marche(ARB.slice(0, k) + RON.slice(0, k)), dist = new Map(), f = [];
          for (const [x, y] of ou(RON[k])) for (const [dx, dy] of D4) { const t = [x + dx, y + dy]; if (v.has(K(...t)) && !dist.has(K(...t))) { dist.set(K(...t), 0); f.push(t); } }
          for (let i = 0; i < f.length; i++) { const [x, y] = f[i]; for (const [dx, dy] of D4) { const t = [x + dx, y + dy]; if (v.has(K(...t)) && !dist.has(K(...t))) { dist.set(K(...t), dist.get(K(x, y)) + 1); f.push(t); } } }
          return Math.min(...D4.map(([dx, dy]) => dist.get(K(arb[0] + dx, arb[1] + dy)) ?? Infinity));
        });
        ok(detours.every((q) => q >= 20 && q < Infinity), `temple : dans ${s.id}, il faut un détour pour atteindre chaque arbuste (${detours.join(', ')} pas)`);
        zA = marche(''); zB = marche('', [N[0], N[1] + 1]);
      }
      // recoins : x dans la première zone de la salle, z dans la dernière
      ok(pres(zA, ou('x')[0]) && pres(zB, ou('z')[0]), `temple : dans ${s.id}, le recoin x est au début et le recoin z à la fin`);
    }
  }
  // la Mer Intérieure : des courants d'une case, l'îlot de la clé au centre
  {
    const s = d.salles.find((q) => q.id === 'ge4'), P = s.plan, at = (x, y) => P[y]?.[x] ?? '#', K = (x, y) => x + ',' + y;
    const ou = (chs) => { const l = []; P.forEach((r, y) => [...r].forEach((ch, x) => { if (chs.includes(ch)) l.push([x, y]); })); return l; };
    const [S] = ou('S'), [N] = ou('N'), [cle] = ou('K'), D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const EAU = '~<>()', TERRE = '.SNK', DIR = { '<': [-1, 0], '>': [1, 0], '(': [0, -1], ')': [0, 1] };
    const pas = ([x, y]) => { const out = []; for (const [dx, dy] of D4) { let n = [x + dx, y + dy]; const ch = at(...n); if (TERRE.includes(ch)) { out.push([n, 0]); continue; } if (!EAU.includes(ch)) continue; let w = 0; for (let k = 0; k < 600 && DIR[at(...n)]; k++) { const [ax, ay] = DIR[at(...n)], m = [n[0] + ax, n[1] + ay]; if (!EAU.includes(at(...m))) break; n = m; w = 1; } out.push([n, w]); } return out; };
    const graphe = new Map(), f = [S]; graphe.set(K(...S), null);
    for (let i = 0; i < f.length; i++) for (const [n] of pas(f[i])) if (!graphe.has(K(...n))) { graphe.set(K(...n), null); f.push(n); }
    const inv = new Map(); for (const q of f) for (const [n] of pas(q)) { if (!inv.has(K(...n))) inv.set(K(...n), []); inv.get(K(...n)).push(K(...q)); }
    const vers = (b) => { const ok2 = new Set([K(...b)]), g2 = [K(...b)]; while (g2.length) for (const a of inv.get(g2.pop()) || []) if (!ok2.has(a)) { ok2.add(a); g2.push(a); } return ok2; };
    const vc = vers(cle), vn = vers(N);
    const courants = (a, b) => { const c = new Map([[K(...a), 0]]), q = [a]; for (let i = 0; i < q.length; i++) for (const [n, w] of pas(q[i])) { const v = c.get(K(...q[i])) + w; if (!c.has(K(...n)) || c.get(K(...n)) > v) { c.set(K(...n), v); q.push(n); } } return c.get(K(...b)); };
    // l'îlot : 3 × 3 cases de terre au centre, entouré d'eau
    const ile = ou('.').filter(([x, y]) => Math.abs(x - cle[0]) <= 1 && Math.abs(y - cle[1]) <= 1);
    ok(P.length === 57 && P[0].length === 72 && ile.length === 8 && Math.abs(cle[0] - P[0].length / 2) <= 4 && Math.abs(cle[1] - P.length / 2) <= 4 && ou('E').length > 1000, 'temple : la Mer Intérieure, une grande étendue d\'eau avec un îlot de 3 × 3 cases au centre');
    ok(ou('<>()').every(([x, y]) => D4.filter(([dx, dy]) => '<>()'.includes(at(x + dx, y + dy))).length <= 2) && ou('<>()').length >= 300, 'temple : ses courants n\'ont qu\'une case de large');
    ok(graphe.has(K(...cle)) && graphe.has(K(...N)) && f.every((q) => vc.has(K(...q)) && vn.has(K(...q))), 'temple : de partout dans la Mer Intérieure, on peut encore rejoindre l\'îlot et la sortie');
    const a = courants(S, cle), b = courants(cle, N);
    // plusieurs courants partent de presque chaque anse : il faut choisir
    // chaque anse (eau calme d'un seul tenant) : combien de courants en partent ?
    const anses = [], vu = new Set();
    for (const [x0, y0] of ou('~')) {
      if (vu.has(K(x0, y0))) continue;
      const A = [[x0, y0]]; vu.add(K(x0, y0));
      for (let i = 0; i < A.length; i++) for (const [dx, dy] of D4) { const t = [A[i][0] + dx, A[i][1] + dy]; if (at(...t) === '~' && !vu.has(K(...t))) { vu.add(K(...t)); A.push(t); } }
      anses.push(new Set(A.flatMap(([x, y]) => pas([x, y]).filter(([, w]) => w).map(([n]) => K(...n)))).size);
    }
    const choix = anses.filter((k) => k >= 2).length;
    ok(a >= 6 && b >= 5 && choix >= 8 && !ou('I').length && !DRESSEURS.E4.length, `temple : il faut prendre ${a} courants dans le bon ordre pour l'îlot, puis ${b} pour la sortie, avec des choix partout ; ni objet ni dresseur`);
    ok(d.salles.find((q) => q.id === 'se4').plan === P && d.salles.find((q) => q.id === 'se4').cle === 'e' && s.cle === 'e', 'temple : la clé de l\'Eau est sur l\'îlot, à trois comme en solo');
  }
  // le Talisman des Éléments, et le Gardien qui ramène au hall
  ok(par.e1.donjon.plan.pnj['|'] && d.pnj['|'].talisman && ITEMS['talisman-elements']?.key && !par.eo.donjon.plan.pnj['|'], 'temple : le moine de la Salle des Dalles prête le Talisman des Éléments (pas dans le solo)');
  ok(d.pnj.M.retour && d.pnj.Z.retour, 'temple : les Gardiens ramènent au Grand Hall une fois la récompense prise');
  // les musiques en fichiers (odyssee/musiques/) : chaque fichier déclaré existe, et chaque musique choisie existe
  {
    const { MUSIQUES } = await import('../odyssee/musiques/musiques.js');
    const { THEMES } = await import('../odyssee/js/audio.js');
    ok(Object.values(MUSIQUES).every((M) => fs.existsSync(new URL('../odyssee/musiques/' + M.fichier, import.meta.url))), `musiques : les ${Object.keys(MUSIQUES).length} fichiers déclarés sont dans odyssee/musiques/`);
    const voulues = DONJONS.flatMap((D) => [D.musique, ...(D.salles || []).map((q) => q.musique)]).filter(Boolean);
    ok(voulues.every((k) => THEMES[k]), 'musiques : chaque musique choisie par un donjon ou une salle existe');
  }
  // les dresseurs des chemins : leurs Pokémon sont du type du chemin, ce qu'ils donnent fait 100 %
  {
    const T_ = { f: ['fire'], roche: ['rock'], e: ['water'], p: ['grass', 'bug'] };
    ok(Object.entries(POKEMON_TEMPLE).every(([k, P]) => [...P.trois, ...P.solo].every((sp) => SPECIES[sp]?.t.some((t) => T_[k].includes(t)))), 'temple : les dresseurs du Feu ont des Pokémon Feu ou Roche, ceux de l\'Eau des Pokémon Eau, ceux de la Plante des Pokémon Plante ou Insecte');
    ok(BUTIN_TEMPLE.reduce((a, [, p]) => a + p, 0) === 100 && BUTIN_TEMPLE.every(([k]) => ITEMS[k]) && Object.values(OBJETS_SALLES).flat().every((k) => ITEMS[k]), 'temple : le butin des dresseurs et les objets des salles existent, et les chances font 100 %');
    ok(['f', 'e', 'p'].every((c) => { const D = DRESSEURS_TEMPLE[c], n = D.theme.length + D.autres.length; return n >= 6 && D.theme.length >= 3 && [...D.theme, ...D.autres, ...(D.nage || [])].every((q) => q.intro && q.lose && q.after); }) && DRESSEURS_TEMPLE.e.nage.length >= 3, 'temple : assez de dresseurs pour chaque salle, montagnards, marins et nageurs, scouts en tête');
    ok(d.objets['`'].sp === 9 && d.objets['{'].sp === 6 && d.objets['}'].sp === 3 && par.h0.donjon.plan.objets['`']?.length === 1, 'temple : les statues de Tortank, Dracaufeu et Florizarre au centre du hall');
    ok(ITEMS['sac-quete']?.key && ITEMS['rawst-berry']?.cure, 'temple : le Sac de Quête du moine, et la Baie Fraive');
  }
  // le solo : les trois chemins se mêlent
  {
    const solo = d.salles.filter((s) => s.branche === 'solo' && s.chemin), par2 = Object.fromEntries(solo.map((s) => [s.id, s])), D4c = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    // les passages secrets : trois, chacun de la première salle d'un chemin à la deuxième d'un autre, dans les deux sens ;
    // une sortie de grotte percée dans un mur (de la roche à gauche, à droite et au-dessus), on y arrive dès l'entrée
    const bouches = solo.flatMap((s) => (s.bouches || []).map((B) => ({ s, B })));
    const paire = { sp1: 'se2', se2: 'sp1', se1: 'sf2', sf2: 'se1', sf1: 'sp2', sp2: 'sf1' };
    ok(bouches.length === 6 && bouches.every(({ s, B }) => paire[s.id] === B.vers && s.plan[B.y][B.x] === 'ç'), 'temple en solo : trois passages secrets, de la salle 1 d\'un chemin à la salle 2 d\'un autre, dans les deux sens');
    const MURS = '#YuL%&';
    ok(bouches.every(({ s, B }) => { const P = s.plan, at = (x, y) => P[y]?.[x] ?? '#'; return [[-1, 0], [1, 0], [0, -1]].every(([dx, dy]) => MURS.includes(at(B.x + dx, B.y + dy))) && B.devant[0] === B.x && B.devant[1] === B.y + 1 && !MURS.includes(at(...B.devant)); }), 'temple en solo : chaque passage est une porte contre un mur, avec une case devant');
    const flot = (P) => {
      const at = (x, y) => P[y]?.[x] ?? '#', sy = P.findIndex((r) => r.includes('S')), S = [P[sy].indexOf('S'), sy], DV = { '<': [-1, 0], '>': [1, 0], '(': [0, -1], ')': [0, 1] };
      const v = new Set([S.join()]), f = [S], OK = '.SNxzI"fh=~à<>()';
      while (f.length) {
        const [x, y] = f.pop();
        for (const [ax, ay] of D4c) {
          let t = [x + ax, y + ay];
          if (!OK.includes(at(...t))) continue;
          for (let k = 0; k < 400 && DV[at(...t)]; k++) { const [ux, uy] = DV[at(...t)], u = [t[0] + ux, t[1] + uy]; if (!'~<>()'.includes(at(...u))) break; t = u; }
          if (!v.has(t.join())) { v.add(t.join()); f.push(t); }
        }
      }
      return v;
    };
    ok(bouches.every(({ s, B }) => flot(s.plan).has(B.devant.join())), 'temple en solo : on atteint chaque passage dès l\'entrée de la salle, sans rien résoudre');
    const lac = par2.sp1.plan.join('').split('~').length - 1, sec = par2.se1.plan.join('').split('à').length - 1;
    ok(lac >= 24 && sec >= 6 && par2.se1.teintes.length && par2.sf1.teintes.length, `temple en solo : le petit lac de la Plante (${lac} cases), le creux asséché de l'Eau (${sec} cases), la roche rougie et grise`);
    // les verrous : une grille au bout des premières salles (elle s'ouvre de la salle 2), un obstacle devant chaque passage
    // côté salle 1 (l'objet de la première salle d'un troisième chemin), un verrou au bout des deuxièmes salles
    ok(['p', 'e', 'f'].every((c) => par2[`s${c}1`].verrou.type === 'grille' && par2[`s${c}2`].verrou.objet && par2[`s${c}1`].bouches[0].verrou?.objet), 'temple en solo : grilles, obstacles des passages et verrous des deuxièmes salles');
    const source = (objet) => solo.find((q) => q.recoins?.z?.objet === objet);
    ok(['p', 'e', 'f'].every((c) => { const B = par2[`s${c}1`].bouches[0], src = source(B.verrou.objet); return src.id[2] === '1' && src.chemin !== c && src.chemin !== par2[B.vers].chemin; }), 'temple en solo : chaque passage demande l\'objet de la première salle du troisième chemin');
    ok(['p', 'e', 'f'].every((c) => { const src = source(par2[`s${c}2`].verrou.objet); return src.id[2] === '2' && src.chemin !== c; }), 'temple en solo : la sortie d\'une deuxième salle demande l\'objet de la deuxième salle d\'un autre chemin');
    ok(Object.keys(d.tresors).every((k) => ITEMS[d.tresors[k].objet]?.key) && ITEMS['carte-temple']?.key, 'temple en solo : les objets qui ouvrent les verrous, et la Carte du Temple');
    // parcours abstrait : chaque salle a un début (a) et une fin (b) ; les trois portes sont ouvertes
    const jouer = (sans) => {
      const lieux = new Set(['s2']), a = new Set(), ouverts = new Set(), cles = new Set();
      for (let tour = 0; tour < 80; tour++) {
        const n0 = lieux.size + a.size + ouverts.size + cles.size;
        if (lieux.has('s2')) for (const c of ['p', 'e', 'f']) lieux.add(`s${c}1:a`);
        for (const s of solo) {
          const A = s.id + ':a', B = s.id + ':b', n = +s.id[2], suiv = par2[s.id.slice(0, 2) + (n + 1)];
          if (lieux.has(A)) { lieux.add(B); if (n === 1) lieux.add('s2'); }
          // un passage : on ouvre l'obstacle (d'un côté ou de l'autre) avec l'objet, puis on passe dans les deux sens
          for (const Bo of s.bouches || []) {
            const k = Bo.verrou ? s.id : Bo.vers, V = Bo.verrou || par2[Bo.vers].bouches[0].verrou;
            if (lieux.has(A) && V && a.has(V.objet)) ouverts.add('passage:' + k);
            if (lieux.has(A) && (!V || ouverts.has('passage:' + k))) lieux.add(Bo.vers + ':a');
          }
          // arrivé dans une deuxième salle, la grille de la première se lève
          if (n === 2 && lieux.has(A)) { ouverts.add(s.id.slice(0, 2) + '1'); lieux.add(s.id.slice(0, 2) + '1:b'); }
          if (lieux.has(B)) {
            if (s.cle) cles.add(s.cle);
            const z = s.recoins?.z; if (z?.type === 'objet' && z.objet !== sans) a.add(z.objet);
            if (s.verrou && s.verrou.objet && a.has(s.verrou.objet)) ouverts.add(s.id);
            if (suiv && (!s.verrou || ouverts.has(s.id))) lieux.add(suiv.id + ':a');
          }
        }
        if (lieux.size + a.size + ouverts.size + cles.size === n0) break;
      }
      return { fini: cles.size === 3, lieux, a };
    };
    const tout = jouer(null);
    ok(tout.fini && solo.every((s) => tout.lieux.has(s.id + ':a') && tout.lieux.has(s.id + ':b')), 'temple en solo : on trouve les trois clés et on passe par toutes les salles');
    ok(Object.keys(d.tresors).every((k) => !jouer(k).fini), 'temple en solo : sans un seul des six objets, on ne finit pas');
    ok(!d.salles.find((q) => q.id === 's4').plan.join('').includes('T'), 'temple en solo : plus de téléporteur dans la Salle des Clés');
    ok(['sp1', 'se1', 'sf1'].every((id) => par2[id].retour[0] === 's2') && !d.salles.find((q) => q.id === 's2').plan.join('').includes('D'), 'temple en solo : les premières salles ramènent à la Salle des Trois Portes');
  }
  // les Gardiens
  {
    const M = d.pnj.M, Z = d.pnj.Z;
    ok(M.equipe.length === 4 && M.equipe.slice(0, 3).every(([sp, n]) => [512, 514, 516].includes(sp) && n === 30) && M.equipe[3][0] === 128 && M.equipe[3][1] === 45 && M.equipe[3][2].blocs === 5 && M.equipe[3][2].attend && M.reste, 'temple : le Gardien à trois a ses trois singes niveau 30, puis Tauros niveau 45 à cinq blocs, et il reste après sa défaite');
    ok(Z.equipe.map((q) => q[0] + ':' + q[1]).join() === '31:60,34:60,143:63,392:65,389:65,395:65' && Z.equipe.slice(3).every((q) => q[5]?.blocs === 3) && Z.equipe.slice(0, 2).every((q) => q[4] === 'sheer-force') && Z.equipe[2][4] === 'thick-fat' && Z.equipe.map((q) => q[2]).slice(3).join() === 'charcoal,miracle-seed,mystic-water' && Z.equipe.every((q) => q[3].length === 4 && q[3].every((k) => Object.values(MOVES).some((x) => x.key === k))) && Z.reste, 'temple : le Gardien du solo a ses six Pokémon, leurs objets, leurs attaques, et trois blocs pour les trois derniers');
    // Tauros n'entre que quand les trois singes sont K.O.
    const { Groupe } = await import('../testodyssee/js/combat/groupe.js');
    const mk = (sp, n, x) => Object.assign(createMon(sp, n, { shiny: false }), x || {});
    const g = new Groupe({ joueurs: [1, 2, 3].map((id) => ({ id, nom: 'J' + id, party: [mk(149, 100), mk(149, 100)] })), dresseur: { cls: 'Gardien', nom: 'T' }, reserve: M.equipe.map(([sp, n, x]) => mk(sp, n, x)) });
    g.start();
    const enJeu = () => g.places.map((_, k) => g.adverse(k)?.sp).filter(Boolean);
    g.reserve[0].hp = 0; g.bilan();
    const un = enJeu().join();
    g.reserve[1].hp = 0; g.bilan(); g.reserve[2].hp = 0; g.bilan();
    ok(un === '514,516' && enJeu().join() === '128' && g.state !== 'over', 'temple : Tauros n\'entre pas tant qu\'un singe tient debout ; il entre quand ils sont tous K.O.');
    // cinq blocs : un coup ne fait tomber qu'un bloc
    const t = mk(128, 45, { blocs: 5 }), b = new BattleT({ player: { name: 'T', party: [mk(149, 100)] }, foe: { name: 'G', party: [t], trainer: { cls: 'G', name: 'T', items: {}, ai: 'smart' } } });
    b.start(); const M0 = t.stats[0]; b.hp(1, -9999);
    const un2 = t.hp; b.hp(1, -9999);
    ok(un2 === Math.round(4 * M0 / 5) && t.hp === Math.round(3 * M0 / 5) && [1, 2, 3].every(() => { b.hp(1, -9999); return true; }) && t.hp === 0, 'temple : un coup ne fait jamais tomber plus d\'un bloc de vie');
  }
  ok(!par.s4.donjon.plan.objets.T && !par.g4.donjon.plan.objets.T && par.g5.donjon.plan.objets.a && par.s5.donjon.plan.objets.j && par.s5.donjon.plan.objets.l && !par.s5.donjon.plan.objets.a, 'temple : pas de téléporteur ; trois Poké Balls à trois, trois CT en solo');
  // la table à trois
  let e = nouvelEtat(d, { joueurs: 3 });
  ok(appliquer(d, e, '1', { a: 'choixStarter', salle: 'g5', n: 0 }).ok && appliquer(d, e, '2', { a: 'choixStarter', salle: 'g5', n: 0 }).ok, 'temple : deux joueurs peuvent vouloir la même Poké Ball');
  ok(resoudreStarters(e.salles.g5.donnees, ['1', '2', '3']) === null, 'temple : rien ne se décide tant que tout le monde n\'a pas choisi');
  appliquer(d, e, '3', { a: 'choixStarter', salle: 'g5', n: 2 });
  let r = resoudreStarters(e.salles.g5.donnees, ['1', '2', '3'], () => 7);
  ok(r && r.attrib['3'] === 2 && r.duel?.ids.join() === '1,2' && r.duel.n === 0, 'temple : un choix seul est attribué, deux choix pareils font un duel');
  appliquer(d, e, '0', { a: 'maj', salle: 'g5', donnees: r });
  ok(!appliquer(d, e, '1', { a: 'choixStarter', salle: 'g5', n: 1 }).ok && !appliquer(d, e, '3', { a: 'choixStarter', salle: 'g5', n: 1 }).ok, 'temple : pendant un duel, les duellistes et les servis ne changent plus');
  appliquer(d, e, '1', { a: 'starterDuelFin', salle: 'g5', gagnant: '1' });
  ok(e.salles.g5.donnees.duel === null && e.salles.g5.donnees.choix['1'] === 0 && e.salles.g5.donnees.choix['2'] == null && !appliquer(d, e, '2', { a: 'choixStarter', salle: 'g5', n: 0 }).ok && !appliquer(d, e, '2', { a: 'choixStarter', salle: 'g5', n: 2 }).ok, 'temple : le perdant ne peut reprendre ni celle du duel, ni une déjà donnée');
  appliquer(d, e, '2', { a: 'choixStarter', salle: 'g5', n: 1 });
  r = resoudreStarters(e.salles.g5.donnees, ['1', '2', '3']); appliquer(d, e, '0', { a: 'maj', salle: 'g5', donnees: r });
  ok(e.salles.g5.donnees.attrib['1'] === 0 && e.salles.g5.donnees.attrib['2'] === 1 && e.salles.g5.donnees.attrib['3'] === 2 && !e.salles.g5.donnees.duel, 'temple : à la fin, chacun a le sien');
  // à trois sur la même : le gagnant affronte le troisième
  e = nouvelEtat(d, { joueurs: 3 });
  for (const q of ['1', '2', '3']) appliquer(d, e, q, { a: 'choixStarter', salle: 'g5', n: 1 });
  r = resoudreStarters(e.salles.g5.donnees, ['1', '2', '3']); appliquer(d, e, '0', { a: 'maj', salle: 'g5', donnees: r });
  appliquer(d, e, '1', { a: 'starterDuelFin', salle: 'g5', gagnant: '2' });
  appliquer(d, e, '1', { a: 'choixStarter', salle: 'g5', n: 0 });
  r = resoudreStarters(e.salles.g5.donnees, ['1', '2', '3']);
  ok(r.attrib['1'] === 0 && r.duel?.ids.includes('2') && r.duel.ids.includes('3'), 'temple : à trois sur la même, le gagnant du premier duel affronte le troisième');
  // les formes du Temple
  const tp = (k) => SPECIES[TEMPLE[k]].t.join('/');
  ok(tp('carapuce') === 'fire' && tp('salameche') === 'grass' && tp('bulbizarre') === 'water' && STARTERS_TEMPLE.every((q) => SPECIES[SPECIES[SPECIES[q].ev[0].to].ev[0].to]?.base), 'temple : Carapuce passe au feu, Salamèche à la plante, Bulbizarre à l\'eau, et leurs lignées entières');
  ok(Object.values(TEMPLE).every((id) => { const S = SPECIES[id]; return S.ls.length && S.ls.every(([, m]) => MOVES[m]) && ['f', 'b', 'i'].every((c) => existsSync(new URL(`../testodyssee/img/${S.img}-${c}.png`, import.meta.url))); }), 'temple : chaque forme a ses attaques et ses images');
  ok(Object.values(TEMPLE).filter((id) => SPECIES[id].base && SPECIES[SPECIES[id].base].t[0] !== SPECIES[id].t[0]).every((id) => SPECIES[id].ls.every(([, m]) => MOVES[m].t !== SPECIES[SPECIES[id].base].t[0])), 'temple : une forme n\'apprend plus d\'attaques de son type d\'origine');
  // les CT du solo
  const idm = (k) => Object.values(MOVES).find((m) => m.key === k)?.id;
  ok(['fin', 'tot'].every((q) => d.cts[q].length === 3 && d.cts[q].every((k) => ITEMS[k]?.unique && ITEMS[k].starters && idm(ITEMS[k].ct))) && d.cts.fin.map((k) => MOVES[idm(ITEMS[k].ct)].t).sort().join() === 'fire,grass,water' && d.cts.tot.map((k) => MOVES[idm(ITEMS[k].ct)].t).sort().join() === 'fire,grass,water', 'temple : trois CT par jeu (feu, eau, plante), à usage unique et pour les starters');
  ok(STARTERS.has(9) && STARTERS.has(TEMPLE.tortank) && STARTERS.has(1003) && STARTERS.has(906) && !STARTERS.has(25) && !STARTERS.has(133), 'temple : les starters, ceux des jeux, du Temple et d\'Odyssée, et toute leur lignée');
  ok(!refusCt('ct-eruption-temple', 6) && refusCt('ct-gicledo-temple', 6) && !refusCt('ct-eruption-temple', TEMPLE.tortank) && refusCt('ct-gicledo-temple', TEMPLE.tortank) && !refusCt('ct-jaillisseve-temple', TEMPLE.dracaufeu) && refusCt('ct-eruption-temple', 25), 'temple : la CT va au starter de son type (le Tortank du Temple prend Éruption, pas Giclédo), même s\'il ne l\'apprend pas d\'habitude');
  OBJETS['ct-test-eruption'] = { ct: 'eruption' };
  ok(refusCt('ct-test-eruption', 6) && !refusCt('ct-test-eruption', 157), 'temple : une autre CT Éruption ne va qu\'à ceux qui l\'apprennent d\'habitude (Typhlosion, pas Dracaufeu)');
  delete OBJETS['ct-test-eruption'];
  {
    const b = new BattleT({ player: { name: 'A', party: [createMon(6, 50)] }, foe: { name: 'B', party: [createMon(9, 50)] } });
    const lanceur = b.act(0), mv = MOVES[idm('eruption')], plein = b.movePower(0, 1, mv);
    lanceur.hp = Math.floor(lanceur.stats[0] / 3);
    ok(plein === 150 && b.movePower(0, 1, mv) <= 51 && b.movePower(0, 1, MOVES[idm('jaillisseve')]) <= 51, 'temple : Éruption, Giclédo et Jaillissève frappent moins fort quand les PV baissent');
  }
  ok(SPECIES[TEMPLE.arceus].t.length === 3, 'temple : le Gardien a un Pokémon à trois types');
}

/* ---------------- île : borne, usine à pièges, caserne, salles d'entraînement ---------------- */
{
  const M = ILE_M, U = USINE_M, ile = M.nouvelleIle('Usine');
  ok(ile.points === 0 && ile.statues['st:dialga'] === 20 && Array.isArray(ile.plans) && !ile.voirPieges, 'usine : une île neuve a ses points, ses statues au niveau 20, et les pièges cachés');
  ok(U.pointsPartie(37, 2) === 67 && U.pointsPartie(-3, 0) === 0, 'borne : une brique = 1 point, un mur fini = 15 de plus');
  ok(!U.acheter(ile, 'pg:trou').ok && ile.points === 0, 'usine : sans points, on n\'achète rien');
  ile.points = 100;
  ok(U.acheter(ile, 'pg:degats3').ok && ile.points === 50 && U.enStock(ile, 'pg:degats3') === 1, 'usine : un achat coûte des points et remplit le stock');
  ok(U.PIEGES.filter((p) => p.effet === 'degats').map((p) => p.part).join() === '0.1,0.3,0.5', 'usine : pièges à dégâts de 10, 30 et 50 %');
  ok(!M.posable(ile, { a: 'pg:trou', x: 20, y: 20 }, 'ile').ok && M.posable(ile, { a: 'pg:degats3', x: 20, y: 20 }, 'ile').ok, 'usine : un piège ne se pose sur l\'île que s\'il est en stock');
  M.poser(ile, { a: 'pg:degats3', x: 20, y: 20 });
  ok(U.enStock(ile, 'pg:degats3') === 0 && M.reprendre(ile, M.articleEn(ile, 20, 20), 'ile') && U.enStock(ile, 'pg:degats3') === 1, 'usine : poser vide le stock, ranger le remplit');
  ile.points = 10000;
  let n = 0; while (U.ameliorer(ile, 'st:palkia').ok) n++;
  ok(n === 10 && ile.statues['st:palkia'] === U.MAX_STATUE && ile.statues['st:dialga'] === 20, 'usine : une statue piégée monte de 5 en 5 niveaux, jusqu\'à 70');
  ok(U.typesOuverts(0).length === 2 && U.typesOuverts(8).length === 10 && U.niveauGarde('combat', 2) > U.niveauGarde('guet', 2), 'caserne : les badges ouvrent des spécialités, les gardes de combat sont plus forts');
  ok(!U.acheter(ile, 'gd:dragon:guet', 0).ok && U.acheter(ile, 'gd:plante:combat', 0).ok, 'caserne : on n\'engage que dans les spécialités ouvertes');
  ok(U.GARDES.every((g) => [0, 4, 8].every((b) => { const e = U.equipeGarde(g.id, b); return e.length === U.MODES[g.mode].n && e.every(([sp, l]) => SPECIES[sp] && l > 0); })), 'caserne : chaque garde a une équipe faite d\'après son niveau');
  M.poser(ile, { a: 'usine', x: 38, y: 18 });
  ok(!M.posable(ile, { a: 'usine', x: 10, y: 20 }, 'ile').ok && M.portes(ile).length === 4, 'usine : un seul bâtiment, et le chemin jusqu\'à sa porte reste libre');
  const maps = {}; M.construire(maps, ile, {});
  ok(maps[M.USINE]?.npcs.some((q) => q.id === 'ile:technicien') && [...maps[M.ILE].warps.values()].some((w) => w.map === M.USINE), 'usine : on y entre, le technicien y attend');
  // une salle d'entraînement
  ile.plans.push({ nom: 'Test', salles: [[]] });
  const S = ile.plans[0].salles[0], z = 'salle:0:0';
  ok(M.posable(ile, { a: 'gd:feu:guet', x: 3, y: 5, dir: 'right' }, z).ok && !M.posable(ile, { a: 'arbre', x: 3, y: 5 }, z).ok, 'salle : tout ce qui est débloqué s\'y pose, sans stock ; les arbres restent dehors');
  ok(!M.posable(ile, { a: 'caisse', x: M.ENTREE_SALLE[0], y: M.ENTREE_SALLE[1] }, z).ok, 'salle : l\'entrée reste libre');
  for (let x = 1; x <= 15; x++) if (x !== 4) M.poser(ile, { a: 'caisse', x, y: 7 }, z);
  ok(!M.posable(ile, { a: 'tonneau', x: 4, y: 7 }, z).ok && M.posable(ile, { a: 'pg:trou', x: 4, y: 7 }, z).ok, 'salle : un mur complet est refusé, un piège non (on marche dessus)');
  M.poser(ile, { a: 'pg:trou', x: 4, y: 7 }, z); M.poser(ile, { a: 'st:dialga', x: 12, y: 4, dir: 'left' }, z);
  const cs = M.construireSalle(ile, 0, 0, {}), cv = M.construireSalle(ile, 0, 0, { voir: true });
  ok(cs.pieges.length === 1 && !cs.deco.some((d) => d.k === 'piege_trou') && cv.deco.some((d) => d.k === 'piege_trou') && cs.defenses.length === 1 && cs.get(...M.ESCALIER_SALLE) === T.STAIRS, 'salle : les pièges sont cachés sauf si on les montre ; la statue surveille ; l\'escalier est en haut');
  // la coller sur l'île
  const b = M.besoins(S);
  ok(b.caisse === undefined && b['pg:trou'] === 1 && b['st:dialga'] === 1, 'salle : collée sur l\'île, elle demande ses pièges et ses défenses en stock');
  const avant = M.collable(ile, S, 6, 18);
  ok(!avant.ok && avant.manque.length === 2, 'salle : sans le stock, on ne la colle pas');
  ile.stock['pg:trou'] = 1; ile.stock['st:dialga'] = 1;
  const libre = [[6, 18], [8, 16], [10, 18], [36, 23]].find(([x, y]) => M.collable(ile, S, x, y).ok);
  ok(libre && !M.collable(ile, S, 1, 1).ok, 'salle : collée sur l\'herbe libre, pas dans l\'eau');
  if (libre) { const t0 = ile.travaux.length; M.coller(ile, S, ...libre); ok(ile.travaux.length === t0 + S.length && !U.enStock(ile, 'pg:trou') && M.cheminLibre(ile), 'salle : collée d\'un bloc, le stock baisse et les chemins restent libres'); }
  // les dispositions
  {
    const di = M.nouvelleIle('Dispo'); di.stock['pg:trou'] = 2;
    M.poser(di, { a: 'arbre', x: 20, y: 20 }); M.poser(di, { a: 'pg:trou', x: 21, y: 20 }); M.poser(di, { a: 'pg:trou', x: 22, y: 20 });
    di.donjons.push('crypte'); M.poser(di, { a: 'tr:crypte', x: 4, y: 4 }, 'musee');
    M.enregistrerDisposition(di, 'Première');
    const neuve = M.nouvelleIle('Dispo'); Object.assign(neuve, { stock: { ...di.stock }, dispositions: di.dispositions, donjons: di.donjons });
    for (const t of di.travaux) if (M.ARTICLE[t.a].stock) U.ajouterStock(neuve, t.a, 1);
    ok(neuve.travaux.length === 0 && U.enStock(neuve, 'pg:trou') === 2, 'île : remise à zéro, les pièges posés retournent au stock');
    const r1 = M.chargerDisposition(neuve, neuve.dispositions[0], new Set(['crypte']));
    ok(neuve.travaux.length === 3 && neuve.musee.travaux.length === 1 && U.enStock(neuve, 'pg:trou') === 0 && !Object.keys(r1.manque).length, 'île : une disposition gardée se remet telle quelle');
    U.ajouterStock(neuve, 'pg:trou', 0); neuve.stock = {};
    const r2 = M.chargerDisposition(neuve, neuve.dispositions[0], new Set());
    ok(r2.manque['pg:trou'] === undefined && U.enStock(neuve, 'pg:trou') === 0 && r2.manque['tr:crypte'] === 1 && neuve.travaux.filter((t) => t.a === 'pg:trou').length === 2, 'île : en la remettant, les pièges déjà posés comptent, un trophée verrouillé reste de côté');
    neuve.stock = {}; neuve.travaux = neuve.travaux.filter((t) => t.a !== 'pg:trou');
    const r3 = M.chargerDisposition(neuve, neuve.dispositions[0], new Set(['crypte']));
    ok(r3.manque['pg:trou'] === 2 && neuve.travaux.length === 1, 'île : sans le stock, les pièges restent de côté');
    const mp = {}; M.construire(mp, M.nouvelleIle('Mairie'), {});
    const ws = (id) => [...mp[id].warps.values()].map((w) => w.map);
    ok(ws(`${M.ILE}:mairie`).includes(M.ETAGE1) && ws(M.ETAGE1).includes(M.BASE) && mp[M.BASE].objectAt(8, 2)?.coffre && mp[M.BASE].objectAt(10, 2)?.drapeau, 'île : la mairie a ses étages, le dernier garde le coffre-fort et le drapeau');
    ok(M.ARTICLE.usine.b === 'house2' && M.ARTICLE.caserne.b === 'bighouse', 'île : l\'usine et la caserne ont échangé leurs bâtiments');
  }
  const vieille = M.etatIle({ nom: 'ancienne', fixes: {}, travaux: [], donjons: [], musee: { travaux: [] } });
  ok(vieille.points === 0 && vieille.stock && vieille.plans.length === 0, 'usine : une île d\'avant l\'usine se relit');
}

/* ---------------- lieux et équipes ---------------- */
const world = buildWorld();
for (const dd of DONJONS) { const cs = dd.plan ? [construireCarte(dd)] : construireSalles(dd); for (const c of cs) world.maps[c.id] = c; const e = relierExterieur(dd, cs[0]); if (e) world.maps[e.id] = e; }
construireIle(world.maps, nouvelleIle('Test'));
const lieux = listerLieux(world, DONJONS);
ok(lieux.labo.length === DONJONS.length + 1 + ROUTES.length + 1 + 1 && lieux.labo.some((l) => l.nom === 'Mont Givrécime') && lieux.villes.length >= 10 && lieux.routes.length >= 10 && lieux.grottes.length >= 5, 'liste des lieux');
for (const l of Object.values(lieux).flat()) {
  const m = world.maps[l.map];
  ok(m && walkable(m.get(l.x, l.y)) && !m.warpAt(l.x, l.y), `on apparaît sur une case libre : ${l.nom}`);
}
for (const E of EQUIPES) for (const [sp, lvl] of E.pokemon) ok(SPECIES[sp] && lvl > 0, `équipe ${E.id} : Pokémon ${sp}`);
for (const E of EQUIPES) for (const k of Object.keys(E.sac)) ok(ITEMS[k], `équipe ${E.id} : objet ${k}`);

/* ---------------- Routes Victoire (plans d'origine) ---------------- */
{
  const maps = {}, L = construireRoutes(maps);
  ok(L.length === ROUTES.length + 1, 'routes victoire : une par jeu, plus la fusion');
  const DX = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const SAUTS = { [T.LEDGE]: 'down', [T.LEDGE_E]: 'right', [T.LEDGE_W]: 'left' };
  /** tout ce qu'on atteint depuis une case, barrières ouvertes, rochers et rochers fissurés écartés (états : carte, x, y, hauteur) */
  function atteint(map, x, y, z0 = 0) {
    const vus = new Set(), file = [[map, x, y, z0]], cases = new Set();
    const libreRV = (m, x, y) => { const t = m.get(x, y); return walkable(t) || t === T.BOULDER || t === T.SMASH || (m.rv.boutons.some((b) => b.ouvre.some(([a, c]) => a === x && c === y))); };
    while (file.length) {
      const [id, x, y, z] = file.pop(), cle = `${id}|${x},${y}|${z}`;
      if (vus.has(cle)) continue; vus.add(cle); cases.add(`${id}|${x},${y}`);
      const m = maps[id];
      const w = m.warpAt(x, y);
      if (w) { const h = maps[w.map].rv.gen === 4 ? 0 : RVR.hauteur(maps[w.map], w.x, w.y); file.push([w.map, w.x, w.y, w.z ?? h]); }
      if (m.objectAt(x, y)?.type === 'rv-sortie') { if (m.rv.suite) { const [e, ex, ey] = RVR.ENTREES[m.rv.suite.split(':').pop()]; file.push([RVR.idCarte(m.rv.suite, e), ex, ey, 0]); } continue; }
      for (const [d, [dx, dy]] of Object.entries(DX)) {
        let tx = x + dx, ty = y + dy; const t = m.get(tx, ty), eau = t === T.WATER, ici = m.get(x, y) === T.WATER;
        if (d !== 'down' && (m.rv.cascades.has(`${tx},${ty}`) || m.rv.cascades.has(`${x},${y}`))) continue;   // on descend les cascades
        if (SAUTS[t] === d) { tx += dx; ty += dy; if (!libreRV(m, tx, ty)) continue; if (m.rv.gen === 4) { file.push([id, tx, ty, 0]); continue; } }
        else if (eau) { /* Surf : on entre dans l'eau de n'importe quelle berge */ }
        else if (!libreRV(m, tx, ty) || SAUTS[t]) continue;
        else if (m.rv.gen === 4) { const r = RVR.pasGen4(m, x, y, d, tx, ty, !!z); if (r !== null) file.push([id, tx, ty, r ? 1 : 0]); continue; }
        else if (!ici && (RVR.fermee(m, x, y, d, tx, ty) || RVR.changeNiveau(z, RVR.hauteur(m, tx, ty)))) continue;
        const h = RVR.hauteur(m, tx, ty), avant = RVR.hauteur(m, x, y);
        file.push([id, tx, ty, h === 15 || avant === 15 ? z : h]);
      }
    }
    return cases;
  }
  for (const l of L) {
    const vus = atteint(l.map, l.x, l.y);
    const pre = l.map.split(':').slice(0, -1).join(':'), fusion = pre.startsWith(FUSION);
    const cartes = Object.values(maps).filter((m) => (fusion ? m.rv.fusion : m.rv.pre === pre));
    let sorties = 0;
    for (const m of cartes) {
      for (const [c, o] of m.objects) if (o.type === 'rv-sortie' && vus.has(`${m.id}|${c}`)) sorties++;
      const pres = (x, y) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => vus.has(`${m.id}|${x + a},${y + b}`));
      for (const n of m.npcs) ok(pres(n.x, n.y), `${l.nom} : on atteint ${n.trainer ? n.trainer.cls + ' ' + n.trainer.name : n.name} (${m.id} ${n.x},${n.y})`);
      // Platine, 2F : deux recoins qu'on ne rejoint pas avec les règles d'Odyssée (on y entrait sans doute autrement dans le jeu)
      const recoin = (it) => m.rv.route === 'pt' && m.rv.etage === '2f' && ['4,5', '34,22'].includes(`${it.x},${it.y}`);
      for (const it of m.items) ok((pres(it.x, it.y) || recoin(it)) && ITEMS[it.item], `${l.nom} : on atteint l'objet ${it.item} (${m.id} ${it.x},${it.y})`);
      for (const [c, o] of m.objects) if (o.type === 'rv-cache') ok(pres(...c.split(',').map(Number)), `${l.nom} : on atteint l'objet caché (${m.id} ${c})`);
    }
    ok(sorties > 0, `${l.nom} : on atteint la sortie depuis l'entrée`);
  }
  // les dresseurs gardent leurs équipes et leurs attaques d'origine
  for (const m of Object.values(maps)) for (const n of m.npcs) if (n.trainer) for (const [sp, lvl, mv, item] of n.trainer.team) ok(SPECIES[sp] && lvl > 0 && (!mv || mv.every((x) => x === null || Object.values(MOVES).some((q) => q.key === x))) && (!item || ITEMS[item]), `routes victoire : équipe de ${n.trainer.name}`);
  const naomi = Object.values(maps).find((m) => m.id === 'rv:vf:VictoryRoad_1F').npcs.find((n) => n.trainer?.name === 'Naomi').trainer;
  const party = naomi.team.map(([sp, lvl]) => createMon(sp, lvl));
  RVR.equipeOrigine(naomi.team, party);
  ok(party[0].moves.map((x) => MOVES[x.id].key).join() === 'fury-swipes,screech,feint-attack,pay-day' && party[0].iv[0] === 12, 'routes victoire : Naomi joue les attaques de Vert Feuille');
  const rolando = maps['rv:vf:VictoryRoad_1F'].npcs.find((n) => n.trainer?.name === 'Rolando').trainer, p2 = rolando.team.map(([sp, lvl]) => createMon(sp, lvl));
  RVR.equipeOrigine(rolando.team, p2);
  ok(p2[0].moves.length === 4 && MOVES[p2[0].moves[0].id].key === 'super-fang', 'routes victoire : une attaque absente d\'Odyssée est remplacée');
  // hauteurs : plateau, passage, pont
  ok(!RVR.changeNiveau(0, 4) && !RVR.changeNiveau(3, 0) && !RVR.changeNiveau(3, 15) && RVR.changeNiveau(3, 4) && !RVR.changeNiveau(4, 4), 'routes victoire : on change de niveau par un passage ou un pont');
  // la fusion enchaîne les routes
  const fin = Object.values(maps).filter((m) => m.rv.fusion && m.rv.route === ROUTES[0]);
  ok(fin.every((m) => m.rv.suite === `${FUSION}:${ROUTES[1]}`), 'routes victoire : la fusion mène d\'une route à la suivante');
  ok(maps['rv:vf:VictoryRoad_3F'].rv.trous.length === 1 && RV.vf.etages[1].rochers.some((r) => r[2]), 'routes victoire : le trou du 3F et le rocher qui tombe au 2F');
  ok(maps['rv:em:VictoryRoad_B2F'].surf && maps['rv:em:VictoryRoad_B2F'].rv.cascades.size > 0, 'routes victoire : l\'eau et les cascades du SS2 d\'Émeraude');
  ok(OBJETS['ct50-rv'] && refusCt('ct50-rv', 6) === 'Ne peut pas l\'apprendre', 'routes victoire : Surchauffe reste réservée (CT50 de Vert Feuille)');
}

/* ---------------- Tombeau du Roi Sans Nom ---------------- */
{
  const d = DONJONS.find((q) => q.id === 'tombeau'), cartes = construireSalles(d), M = Object.fromEntries(cartes.map((m) => [m.salle, m]));
  ok(d.joueurs.mode === 'solo' && d.salles[0].id === 'b3', 'tombeau : en solo, et le trou des pilleurs mène au repaire (-3)');
  ok(!d.salles.some((s) => s.pendentif) && !Object.values(d.objets).some((o) => ['sarcophage', 'socleLunettes', 'autel', 'cache', 'piegeCache'].includes(o.type)) && Object.values(d.objets).filter((o) => o.type === 'relique').length === 1, 'tombeau : ni pendentif ni monocle ; une seule relique, le sceptre');
  ok(M.s1.donjon.plan.objets.L?.length === 1 && ITEMS['sceptre-roi']?.key, 'tombeau : le Sceptre du Roi Sans Nom est au -1');
  // à pied : murs, décor, objets qui bloquent et personnages ; le gouffre aussi
  const bloquees = (m, sans = []) => { const P = m.donjon.plan; return new Set([...P.decor.map(([, x, y]) => `${x},${y}`), ...Object.entries(P.pnj).filter(([k]) => !sans.includes(k)).flatMap(([, l]) => l).map(([x, y]) => `${x},${y}`), ...(P.objets._ || []).map(([x, y]) => `${x},${y}`), ...Object.entries(P.objets).filter(([c]) => !d.objets[c].sol && d.objets[c].type !== 'verrou').flatMap(([, l]) => l.map(([x, y]) => `${x},${y}`))]); };
  const parcours = (m, sans, dep = m.donjon.plan.depart) => {
    const P = m.donjon.plan, bloque = bloquees(m, sans), sol = new Set(P.sol.map(([x, y]) => `${x},${y}`)), vus = new Set([dep.join()]), f = [dep];
    while (f.length) { const [x, y] = f.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = `${x + dx},${y + dy}`; if (vus.has(k) || !sol.has(k) || bloque.has(k)) continue; vus.add(k); f.push([x + dx, y + dy]); } }
    return vus;
  };
  const pres = (v, [x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => v.has(`${x + dx},${y + dy}`));
  const portiers = Object.keys(d.pnj).filter((k) => d.pnj[k].portier != null);
  for (const m of cartes) {
    const P = m.donjon.plan, v = parcours(m, portiers), s = d.salles.find((q) => q.carte === m.id);
    if (P.suivante) ok(v.has(`${P.suivante[0]},${P.suivante[1] + 1}`), `tombeau : ${s.nom}, on va de l'entrée à la sortie`);
    for (const [k, [p]] of Object.entries(P.pnj)) ok(pres(v, p), `tombeau : ${s.nom}, on atteint ${d.pnj[k].cls} ${d.pnj[k].nom}`);
    for (const [c, l] of Object.entries(P.objets)) if (['ramasser', 'relique', 'lien'].includes(d.objets[c].type)) for (const p of l) ok(v.has(p.join()) || pres(v, p), `tombeau : ${s.nom}, on atteint ${c}`);
  }
  // le passage du -4 : deux brigands le bouchent ; ils ne laissent passer qu'avec le sceptre, après deux duels
  {
    const P = M.b3.donjon.plan, [nx, ny] = P.suivante;
    ok(portiers.length === 2 && !parcours(M.b3, []).has(`${nx},${ny + 1}`) && portiers.every((k) => d.pnj[k].equipe.every(([sp, l]) => SPECIES[sp] && l >= 36 && l <= 42)), 'tombeau : deux brigands gardent le passage du -4, on ne passe pas à côté d\'eux');
    ok(M.b3.donjon.versSuivante?.map === M.p4.id && d.salles.find((q) => q.id === 'b3').ouvertPar === 'jamais', 'tombeau : le passage mène au -4 (on y est emmené par la scène des portiers)');
  }
  // les passages entre étages vont deux à deux
  const liens = Object.entries(d.objets).filter(([, o]) => o.type === 'lien');
  ok(liens.every(([c, o]) => { const s = d.salles.find((q) => q.id === o.vers), e = d.objets[o.cible]; return s && M[s.id].donjon.plan.objets[o.cible] && e.cible === c && !!e.porte === !!o.porte && cartes.some((m) => m.donjon.plan.objets[c]); }), 'tombeau : chaque passage entre étages a son pendant de l\'autre côté');
  ok(d.objets['α'].porte && M.b3.donjon.plan.objets['α'] && M.s2.donjon.plan.objets['β'], 'tombeau : la porte de fer relie le -3 et le -2');
  ok(['b4a', 'b4b', 'b4c'].every((id) => liens.some(([c, q]) => q.vers === id && M.b3.donjon.plan.objets[c])) && Object.values(d.pnj).filter((p) => p.brigand).length >= 15 && M.b4a.donjon.plan.pnj['Ŵ'] && Object.keys(M.b4a.donjon.plan.pnj).length === 1, 'tombeau : un seul étage de brigands (-3, avec la Caverne d\'Ali Baba, le tripot et le dortoir) ; Ali Baba seul dans sa caverne');
  const BRIG = new Set(['voleur', 'brume', 'brume_f', 'brutus', 'corbin', 'croupier']);
  ok(Object.values(d.pnj).filter((p) => p.brigand || p.portier != null).every((p) => BRIG.has(p.sprite)), 'tombeau : les brigands ont tous une tête de brigand');
  const feux = (id) => M[id].donjon.plan.decor.filter(([k]) => ['torche', 'brasero', 'lanterne'].includes(k)).length;
  ok(d.salles.find((q) => q.id === 'b4a').lumiere === 'vive' && feux('b4a') >= 6, 'tombeau : la Caverne d\'Ali Baba est bien éclairée');
  ok(ITEMS['cle-ruinemaniac'] && ITEMS['carte-tombeau'] && !ITEMS['cle-fragile'] && !d.boutique.some((k) => /cle/.test(k)), 'tombeau : la clé de la porte de fer et la carte viennent du ruinemaniac ; Ali Baba ne vend pas de clé');
  ok(Object.values(d.pnj).filter((p) => p.brigand?.combat).length >= 4 && Object.values(d.pnj).filter((p) => p.brigand?.combat).every((p) => p.brigand.combat.every(([sp, l]) => SPECIES[sp] && l >= 30 && l <= 40)), 'tombeau : certains brigands proposent un combat');
  ok(d.boutique.length >= 20 && d.boutique.every((k) => ITEMS[k]?.price > 0 && ITEMS[k].desc) && d.boutique.filter((k) => OBJETS[k]).every((k) => OBJETS[k].replique) && d.boutique.includes('seringue-somnifere'), 'tombeau : la Caverne d\'Ali Baba vend du classique, du louche et des antiquités');
  // les moines : rondes dans le sol, et on traverse sans être vu (aller et retour), quelle que soit l'heure d'arrivée
  {
    const outils = (m) => {
      const bl = bloquees(m);
      return { libre: (x, y) => walkable(m.get(x, y)) && !bl.has(`${x},${y}`), solide: (x, y) => { const t = m.get(x, y); return t === T.CAVEWALL || t === T.BLOCK || t === T.CAVEDOOR; } };
    };
    const gardes = (s, sans) => s.gardes.filter((G) => !(sans && G.relique)).map((G) => ({ frames: ronde(G.ronde).map((f) => ({ ...f, x: f.x + 1, y: f.y + 1 })), decal: G.decal || 0, portee: G.portee || 5 }));
    const voisin = ([x0, y0]) => (x, y) => Math.abs(x - x0) + Math.abs(y - y0) === 1;
    const traverse = (m, G, dep, but) => { const o = outils(m); return [0, 11, 29, 53].every((t0) => sansEtreVu({ ...o, gardes: G, dep, but, t0 })); };
    const s2 = d.salles.find((q) => q.id === 's2'), s1 = d.salles.find((q) => q.id === 's1'), m2 = M.s2, m1 = M.s1;
    const ou = (m, c) => m.donjon.plan.objets[c][0];
    ok(gardes(s2).every((g) => g.frames.every((f) => outils(m2).libre(f.x, f.y))) && gardes(s1).every((g) => g.frames.every((f) => outils(m1).libre(f.x, f.y))), 'tombeau : les rondes des moines passent sur le sol');
    ok(s2.gardes.length >= 6 && s2.gardes.every((G) => G.ronde.length >= 2) && m2.donjon.plan.sol.length < m2.w * m2.h * 0.6, 'tombeau : -2, des galeries étroites et des moines qui bougent');
    // l'arrivée au -2 : jamais dans le regard d'un moine, ni les quelques cases au-dessus
    const vuesUnJour = new Set(gardes(s2).flatMap((g) => g.frames.flatMap((f) => [[f.x, f.y], ...vueGarde(outils(m2).solide, f.x, f.y, f.dir, g.portee)].map((c) => c.join()))));
    const [ax, ay] = M.s2.donjon.plan.depart;
    ok([[0, 0], [0, -1], [0, -2], [-1, 0], [1, 0]].every(([dx, dy]) => !vuesUnJour.has(`${ax + dx},${ay + dy}`)), 'tombeau : -2, on arrive à l\'abri des moines');
    ok(traverse(m2, gardes(s2), ou(m2, 'β'), voisin(ou(m2, 'γ'))) && traverse(m2, gardes(s2), ou(m2, 'γ').map((v, i) => v + (i ? 1 : 0)), voisin(ou(m2, 'β'))), 'tombeau : -2, on traverse les galeries sans être vu, à l\'aller comme au retour');
    const R = s1.gardes.find((G) => G.relique), [rx, ry] = [R.ronde[0][0] + 1, R.ronde[0][1] + 1], [lx, ly] = ou(m1, 'L');
    const derriere = (x, y) => voisin([rx, ry])(x, y) && !vueGarde(outils(m1).solide, rx, ry, R.ronde[0][2], R.portee).some(([a, b]) => a === x && b === y);
    const pret = traverse(m1, gardes(s1), ou(m1, 'δ'), derriere), entree = vueGarde(outils(m1).solide, rx, ry, R.ronde[0][2], R.portee);
    ok(R.ronde.length === 1 && Math.abs(rx - lx) + Math.abs(ry - ly) === 2 && entree.length >= 8, 'tombeau : -1, le gardien du sceptre, immobile, surveille la chambre');
    ok(pret && traverse(m1, gardes(s1, true), [rx - 1, ry], voisin([lx, ly])) && traverse(m1, gardes(s1, true), [rx - 1, ry], voisin(ou(m1, 'δ'))), 'tombeau : -1, on se glisse derrière le gardien sans être vu, on prend le sceptre et on ressort');
  }
  ok(Object.values(d.pnj).filter((p) => p.pilleur).every((p) => p.equipe.every(([sp, l]) => SPECIES[sp] && l >= 30 && l <= 42)) && Object.values(d.pnj).filter((p) => p.pilleur).length >= 18, 'tombeau : des pilleurs de Sable-Noir du -4 au -7, aux bons niveaux');
  // les profondeurs : du -4 au -10, dans le noir
  {
    const ids = ['p4', 'p5', 'p6', 'p7', 'm8', 'm9', 'g10'], S = (id) => d.salles.find((q) => q.id === id), lettres = (id, f) => (S(id).pnj || []).filter((k) => f(d.pnj[k]));
    ok(ids.every((id, i) => S(id) && S(id).lumiere === 'noire' && (i === ids.length - 1 || M[id].donjon.versSuivante?.map === M[ids[i + 1]].id)) && ids.slice(0, 6).every((id) => M[id].w * M[id].h > 58 * 40), 'tombeau : du -4 au -10, de longues salles plongées dans le noir, à la suite');
    ok(['p4', 'p5', 'p6', 'p7'].every((id) => lettres(id, (p) => p.pilleur).length >= 4) && ['m8', 'm9'].every((id) => !lettres(id, (p) => p.pilleur).length), 'tombeau : les pilleurs de Sable-Noir rôdent du -4 au -7');
    ok(['p6', 'p7'].every((id) => lettres(id, (p) => p.lutteur).length >= 3 && lettres(id, (p) => p.mortvivant).length >= 4 && lettres(id, (p) => p.mortvivant || p.lutteur).every((k) => d.pnj[k].apres)) && ['p4', 'p5'].every((id) => !lettres(id, (p) => p.mortvivant).length), 'tombeau : au -6 et au -7, la lutte contre les morts-vivants (après le vol du sceptre)');
    const gis = (id) => (M[id].donjon.plan.objets['ɠ'] || []).length + (M[id].donjon.plan.objets['ɑ'] || []).length;
    ok(['m8', 'm9'].every((id) => lettres(id, (p) => p.mortvivant).length >= 6 && gis(id) >= 14 && (M[id].donjon.plan.objets['ɑ'] || []).length >= 3), 'tombeau : au -8 et au -9, l\'hécatombe (morts-vivants, corps, mourants)');
    ok(Object.values(d.pnj).filter((p) => p.mortvivant).every((p) => p.sprite === 'spectrel' && SPECIES[p.mortvivant.sp]?.nonCapturable && p.mortvivant.lvl >= 38 && p.mortvivant.lvl <= 46) && Object.values(d.pnj).filter((p) => p.pilleur || p.lutteur || p.brigand || p.portier != null).every((p) => p.sprite !== 'spectrel'), 'tombeau : les abominations, créées pour le tombeau, ne se capturent pas');
    const P7 = M.p7.donjon.plan, [nx, ny] = P7.suivante;
    ok(S('p7').piege && P7.objets['¤']?.[0][0] === nx && P7.objets['¤'][0][1] === ny + 1, 'tombeau : au -7, le piège, et la grille fermée à clé sous la sortie');
    const P10 = M.g10.donjon.plan;
    ok(P10.objets['Ж'] && P10.pnj['Ѡ'] && d.pnj['Ѡ'].chef && M.g10.w * M.g10.h > M.b4b.w * M.b4b.h && !P10.suivante, 'tombeau : au -10, la grande salle, la porte scellée et le chef de Sable-Noir');
    ok(d.pnj['Ҩ']?.souschef && d.pnj['Ҩ'].equipe.every(([sp]) => SPECIES[sp]) && d.pnj['Ѡ'].equipe.length === 6 && ITEMS['sceptre-jumeau']?.key && ITEMS['cle-sable-noir']?.key, 'tombeau : le sous-chef, le chef, le Sceptre Jumeau et la Clé de Sable-Noir');
  }
  const e = nouvelEtat(d, { joueurs: 1 });
  ok(appliquer(d, e, '1', { a: 'maj', salle: 's2', donnees: { dorment: ['x'] } }).ok && e.salles.s2.donnees.dorment.join() === 'x' && appliquer(d, e, '1', { a: 'maj', salle: 's2', donnees: { dorment: [] } }).ok && !e.salles.s2.donnees.dorment.length, 'tombeau : on endort un moine, il se réveille quand on quitte la salle');
}

/* ---------------- Mont Givrécime ---------------- */
{
  const maps = {}, lieu = construireMont(maps), salles = MONT_SALLES.map((_, i) => maps[idSalle(i)]);
  ok(salles.length === 10 && salles.filter((m) => m.outdoor).length >= 4 && salles.filter((m) => !m.outdoor).length >= 4, 'mont : dix salles, dehors et dedans');
  ok(walkable(maps[lieu.map].get(lieu.x, lieu.y)), 'mont : on arrive à pied au bas du mont');
  // on marche comme dans le jeu : rebords en descendant seulement, eau en surfant, rochers fissurés cassés ; pas à travers les dresseurs
  const passe = (m, x, y) => { const t = m.get(x, y); return (walkable(t) || t === T.WATER || t === T.SMASH || t === T.DOOR || t === T.CAVEDOOR) && !m.npcs.some((n) => n.x === x && n.y === y) && !(t === T.LEDGE); };
  const parcours = (m, x0, y0) => {
    const vus = new Set([`${x0},${y0}`]), file = [[x0, y0]];
    while (file.length) {
      const [x, y] = file.pop();
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        let tx = x + dx, ty = y + dy;
        if (m.get(tx, ty) === T.LEDGE) { if (dy !== 1) continue; ty++; }
        if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h || !passe(m, tx, ty) || vus.has(`${tx},${ty}`)) continue;
        vus.add(`${tx},${ty}`); file.push([tx, ty]);
      }
    }
    return vus;
  };
  const aCote4 = (v, x, y) => [[0, -1], [0, 1], [-1, 0], [1, 0]].some(([dx, dy]) => v.has(`${x + dx},${y + dy}`));
  // chaque sortie mène à une case où l'on tient, et revient
  const arrivees = salles.map(() => []);
  for (const m of salles) for (const [k, w] of m.warps) {
    const d = maps[w.map];
    ok(d && passe(d, w.x, w.y) && [...d.warps.values()].some((q) => q.map === m.id), `mont : la sortie ${k} de ${m.name} mène à ${d?.name} et on peut en revenir`);
    if (d) arrivees[salles.indexOf(d)].push([w.x, w.y]);
  }
  salles.forEach((m, i) => {
    const deps = i === 0 ? [[lieu.x, lieu.y], ...arrivees[i]] : arrivees[i];
    const sorties = [...m.warps.keys()].map((k) => k.split(',').map(Number));
    for (const [x, y] of deps) {
      const v = parcours(m, x, y);
      ok(sorties.every(([sx, sy]) => v.has(`${sx},${sy}`)) && m.items.every((it) => v.has(`${it.x},${it.y}`)) && m.npcs.every((n) => aCote4(v, n.x, n.y)), `mont : dans ${m.name}, depuis ${x},${y} on atteint toutes les sorties, les objets et les dresseurs`);
    }
    ok(m.w * m.h >= 2000 && m.items.length >= 5 && m.npcs.filter((n) => n.trainer).length >= 2 && m.warps.size >= 2, `mont : ${m.name} est grande, avec des objets, des dresseurs et au moins deux sorties`);
  });
  // plusieurs chemins mènent au sommet : en retirant n'importe quel lien, il reste atteignable
  const atteint = (sauf) => { const vus = new Set([0]), f = [0]; while (f.length) { const a = f.pop(); for (const [k, [x, y, , c]] of MONT_LIENS.entries()) { if (k === sauf) continue; const b = x === a ? y : y === a ? x : null; if (b != null && !vus.has(b)) { vus.add(b); f.push(b); } } } return vus.has(9); };
  ok(MONT_LIENS.every((_, k) => atteint(k)), 'mont : plusieurs chemins mènent au sommet');
}

// Fonderie aux Plaques : chaque salle à plaques se traverse à deux, pas seul ; en mode test, seul
{
  const d = DONJONS.find((q) => q.id === 'fonderie'), C = construireSalles(d);
  d.salles.forEach((s, i) => {
    const m = C[i], P = m.donjon.plan, S = lirePlaques(d, P);
    if (!S.grilles.length) return;
    passageSuivant(m, true);
    const pnj = new Set((s.pnj || []).flatMap((c) => P.objets[c] || P.pnj?.[c] || []).map(([x, y]) => x + ',' + y));
    const libre = (x, y) => (walkable(m.get(x, y)) || S.grilles.some((q) => q.x === x && q.y === y)) && !pnj.has(x + ',' + y) && !(m.npcs || []).some((n) => n.x === x && n.y === y);
    ok(traversable(d.plaques, S, libre, P.depart, P.suivante, 2), `fonderie : ${s.nom}, on la traverse à deux`);
    ok(!traversable(d.plaques, S, libre, P.depart, P.suivante, 1), `fonderie : ${s.nom}, personne n'y passe seul`);
    ok(S.grilles.every((q) => d.plaques[q.groupe]) && S.plaques.every((p) => p.groupes.every((g) => d.plaques[g])), `fonderie : ${s.nom}, chaque plaque et chaque grille a sa couleur`);
    // mode test : une plaque suffit et reste enclenchée
    const O = grillesOuvertes(d.plaques, S, new Set([S.plaques[0].x + ',' + S.plaques[0].y]), { test: true });
    ok(O.gardes.length >= 1, `fonderie : ${s.nom}, en mode test une plaque reste enclenchée`);
  });
  const S = { plaques: [{ x: 1, y: 1, groupes: ['jaune'] }, { x: 2, y: 1, groupes: ['jaune'] }], grilles: [{ x: 5, y: 5, groupe: 'jaune' }] };
  ok(!grillesOuvertes(d.plaques, S, new Set(['1,1'])).gardes.length && grillesOuvertes(d.plaques, S, new Set(['1,1', '2,1'])).gardes.join() === 'jaune', 'fonderie : la balance demande deux joueurs, puis reste levée');
  ok(grillesOuvertes(d.plaques, { plaques: [{ x: 1, y: 1, groupes: ['rouge'] }], grilles: [{ x: 3, y: 3, groupe: 'rouge' }] }, new Set(['3,3']), { avant: ['rouge'] }).ouvertes.join() === 'rouge', 'fonderie : une grille ne se referme pas sur un joueur');
  ok(d.joueurs.mode === 'entre' && d.joueurs.min === 2, 'fonderie : de 2 à 4 joueurs');
}
// Bastion du Cristal : chaque entrée mène au cristal ; sans défenseur le cristal tombe, bien gardé il tient
{
  const d = DONJONS.find((q) => q.id === 'cristal'), C = construireSalles(d);
  d.salles.forEach((s, i) => {
    if (s.type !== 'defense') return;
    const m = C[i], P = m.donjon.plan;
    const cr = P.objets.K, en = P.objets.e;
    const soins = new Set((P.objets.I || []).map(([x, y]) => x + ',' + y));
    const Dc = preparerDefense(m.w, m.h, (x, y) => walkable(m.get(x, y)) && !soins.has(x + ',' + y), cr, en);
    ok(en.length >= 4 && en.every(([x, y]) => Dc.dist[y * m.w + x] > 0), `cristal : ${s.nom}, ${en.length} entrées, toutes mènent au cristal`);
    ok(Object.keys(Object.assign({}, ...s.vagues)).every((t) => d.ennemis[t]), `cristal : ${s.nom}, des pillards connus`);
    let r = 7; const hasard = () => ((r = (r * 16807) % 2147483647) / 2147483647);
    // personne : les pillards frappent le cristal jusqu'à ce qu'il tombe
    const D = nouvelleDefense(s); demarrerDefense(D, s, 2);
    let fin = null;
    for (let t = 0; t < 4000 && !fin; t++) for (const [e] of pasDefense(D, Dc, s, d.ennemis, [], hasard)) if (e === 'perdu' || e === 'gagne') fin = e;
    ok(fin === 'perdu' && D.cristal === 0, `cristal : ${s.nom}, sans défenseur le cristal tombe`);
    // deux défenseurs collés au cristal qui gagnent tous leurs combats : il tient les vagues
    const E = nouvelleDefense(s); demarrerDefense(E, s, 2);
    const [cx, cy] = cr[0], gardes = [{ id: 'a', x: cx - 1, y: cy }, { id: 'b', x: cx + 1, y: cy }];
    fin = null; let combats = 0;
    for (let t = 0; t < 8000 && !fin; t++) {
      for (const [e, id] of pasDefense(E, Dc, s, d.ennemis, gardes, hasard)) {
        if (e === 'engage') { combats++; for (const [f] of issueDefense(E, s, id, true)) if (f === 'gagne') fin = f; }
        if (e === 'gagne' || e === 'perdu') fin = e;
      }
    }
    ok(fin === 'gagne' && E.vague === s.vagues.length && combats > 0, `cristal : ${s.nom}, gardé, il tient les ${s.vagues.length} vagues (${combats} combats, cristal ${E.cristal}/${E.max})`);
    // un pillard battu disparaît ; perdu, il repart
    const F = nouvelleDefense(s); demarrerDefense(F, s, 1); F.etat = 'vague'; F.ennemis = [{ id: 1, t: 'eclaireur', x: en[0][0], y: en[0][1], engage: 'a' }]; F.file = [];
    issueDefense(F, s, 1, false);
    ok(F.ennemis.length === 1 && !F.ennemis[0].engage, `cristal : ${s.nom}, un pillard qui gagne reprend sa marche`);
  });
  for (const T of Object.values(d.ennemis)) ok(T.equipes.every((eq) => eq.every(([sp]) => SPECIES[sp])), `cristal : pillards ${T.nom}, des Pokémon connus`);
  ok(d.joueurs.mode === 'entre' && d.joueurs.min === 2, 'cristal : de 2 à 4 joueurs');
}

/* ---------------- arènes du labo (Insecte, Poison) : chaque salle se résout ---------------- */
{
  const AR = await import('../testodyssee/js/donjon/arene-regles.js');
  const ins = DONJONS.find((d) => d.id === 'arene-insecte'), poi = DONJONS.find((d) => d.id === 'arene-poison');
  const D4 = Object.entries(AR.DIRS);
  const salleDe = (d, id) => { const cartes = construireSalles(d); const i = d.salles.findIndex((s) => s.id === id); return { s: d.salles[i], m: cartes[i], P: cartes[i].donjon.plan }; };
  const objetA = (d, P) => { const M = new Map(); for (const [c, l] of Object.entries(P.objets)) for (const [x, y] of l) M.set(AR.cle(x, y), { c, o: d.objets[c] }); return M; };
  const pnjA = (P) => { const M = new Map(); for (const [k, [[x, y]]] of Object.entries(P.pnj)) M.set(AR.cle(x, y), k); return M; };
  /** recherche en largeur générique : etat0, voisins(etat) → [etat], but(etat), clef(etat) */
  const chercher = (e0, voisins, but, clef, max = 400000) => {
    const vus = new Map([[clef(e0), 0]]); let file = [e0], n = 0;
    while (file.length && vus.size < max) { n++; const suite = []; for (const e of file) for (const f of voisins(e)) { const k = clef(f); if (vus.has(k)) continue; vus.set(k, n); if (but(f)) return { pas: n, vus: vus.size }; suite.push(f); } file = suite; }
    return { pas: -1, vus: vus.size };
  };

  // 1. la Fourmilière
  {
    const { s, m, P } = salleDe(ins, 'i1'), O = objetA(ins, P), cols = AR.colonnes(ins, P), [nx, ny] = P.suivante;
    ok(Object.keys(cols).sort().join() === 'b,j,r,v', 'arène Insecte : quatre colonnes de fourmis dans la Fourmilière');
    const cocon0 = [...O].find(([, q]) => q.o.type === 'cocon')[0]; let dansPuits = false;
    const mur = (x, y, e) => { const c = AR.cle(x, y), q = O.get(c); if (!m.in(x, y)) return true; if (e.eff.includes(c)) return true; if (q && !q.o.sol) return true; return !walkable(m.get(x, y)) && m.get(x, y) !== T.BOULDER; };
    const puits = (c, e) => O.get(c)?.o.type === 'puits' && !e.combles;
    const voisins = (e) => {
      const out = [];
      for (const [, [dx, dy]] of D4) {
        const tx = e.x + dx, ty = e.y + dy, c = AR.cle(tx, ty);
        if (c === e.cocon) {
          const bx = tx + dx, by = ty + dy, b = AR.cle(bx, by);
          if (mur(bx, by, e) || O.get(b)?.o.type === 'fourmis') continue;
          out.push(puits(b, e) ? { ...e, cocon: null, combles: true } : { ...e, cocon: b });
          continue;
        }
        if (mur(tx, ty, e) || puits(c, e)) continue;
        let f = { ...e, x: tx, y: ty, eff: O.get(AR.cle(e.x, e.y))?.o.type === 'eboulis' ? [...e.eff, AR.cle(e.x, e.y)].sort() : e.eff };
        for (let k = 0; k < 60 && O.get(AR.cle(f.x, f.y))?.o.type === 'fourmis'; k++) {
          const q = O.get(AR.cle(f.x, f.y)), [ax, ay] = AR.DIRS[AR.sensFourmi(cols, { inverses: f.inv }, q.c, f.x, f.y)];
          if (mur(f.x + ax, f.y + ay, f) || AR.cle(f.x + ax, f.y + ay) === f.cocon) break;
          f = { ...f, x: f.x + ax, y: f.y + ay };
          if (puits(AR.cle(f.x, f.y), f)) dansPuits = true;
        }
        out.push(f);
      }
      for (const [, [dx, dy]] of D4) { const q = O.get(AR.cle(e.x + dx, e.y + dy)); if (q?.o.type === 'pot') { const t = { inverses: e.inv }; AR.presserPot(t, q.o); out.push({ ...e, inv: t.inverses }); } }
      return out;
    };
    const e0 = { x: P.depart[0], y: P.depart[1], inv: [...s.inverses].sort(), cocon: cocon0, combles: false, eff: [] };
    const clef = (e) => [e.x, e.y, e.inv.join(''), e.cocon, e.combles, e.eff.join(';')].join('|');
    const r = chercher(e0, voisins, (e) => e.x === nx && e.y === ny + 1, clef);
    if (process.env.GESTES) console.log(`arène Insecte : la Fourmilière se résout, en ${r.pas} gestes au moins (${r.vus} états)`); ok(r.pas >= 20, `arène Insecte : la Fourmilière se résout, en ${r.pas} gestes au moins (${r.vus} états)`);
    ok(!dansPuits, 'arène Insecte : une colonne de fourmis ne dépose jamais dans un puits');
    // sans le pot jaune (gardé derrière le puits), pas de sortie
    const sansCocon = chercher({ ...e0, cocon: null }, voisins, (e) => e.x === nx && e.y === ny + 1, clef);
    ok(sansCocon.pas < 0, 'arène Insecte : sans boucher le puits avec le cocon, on ne sort pas de la Fourmilière');
  }

  // 2. la Grande Toile
  {
    const { m, P } = salleDe(ins, 'i2'), O = objetA(ins, P), [nx, ny] = P.suivante;
    const sorte = (x, y, e) => { const q = O.get(AR.cle(x, y)); if (!m.in(x, y)) return 'mur'; if (q && !q.o.sol) return 'mur'; if (!walkable(m.get(x, y))) return 'mur'; return AR.sorteToile(q?.o, e) || 'fil'; };
    const voisins = (e) => {
      const out = [], et = { leviers: { L: e.L, M: e.M } };
      for (const [, [dx, dy]] of D4) {
        let x = e.x + dx, y = e.y + dy, k = sorte(x, y, et);
        if (k === 'mur' || k === 'vide') continue;
        while (k === 'rosee') { const nk = sorte(x + dx, y + dy, et); if (nk === 'mur') break; x += dx; y += dy; k = nk; }
        if (k === 'vide') continue;   // chute
        if (k === 'traction' && !(x === e.x + dx && y === e.y + dy && false)) { const q = O.get(AR.cle(x, y)), [[tx, ty]] = P.objets[q.o.vers]; if (sorte(e.x + dx, e.y + dy, et) === 'traction') { x = tx; y = ty; } }
        out.push({ ...e, x, y });
      }
      for (const [, [dx, dy]] of D4) { const q = O.get(AR.cle(e.x + dx, e.y + dy)); if (q?.o.type === 'levier') out.push({ ...e, [q.o.id]: 1 - e[q.o.id] }); }
      return out;
    };
    const e0 = { x: P.depart[0], y: P.depart[1], L: 0, M: 0 }, clef = (e) => [e.x, e.y, e.L, e.M].join('|');
    const r = chercher(e0, voisins, (e) => e.x === nx && e.y === ny + 1, clef);
    if (process.env.GESTES) console.log(`arène Insecte : la Grande Toile se résout, en ${r.pas} gestes au moins`); ok(r.pas >= 15, `arène Insecte : la Grande Toile se résout, en ${r.pas} gestes au moins`);
    const sansM = chercher(e0, (e) => voisins(e).filter((f) => f.M === 0), (e) => e.x === nx && e.y === ny + 1, clef);
    ok(sansM.pas < 0, 'arène Insecte : sans le levier bleu, la rosée ne mène pas à la sortie');
    // l'araignée : reliée au départ tant que le levier rouge n'a pas bougé, enfermée dans son coin ensuite
    const [[ax, ay]] = P.objets.A;
    const atteint = (L) => { const et = { leviers: { L, M: 0 } }, vus = new Set([AR.cle(ax, ay)]), f = [[ax, ay]];
      while (f.length) { const [x, y] = f.pop(); for (const [, [dx, dy]] of D4) { const k = sorte(x + dx, y + dy, et), c = AR.cle(x + dx, y + dy); if (vus.has(c) || !['fil', 'noeud'].includes(k) || P.pnj && Object.values(P.pnj).some(([[a, b]]) => a === x + dx && b === y + dy)) continue; vus.add(c); f.push([x + dx, y + dy]); } }
      return vus.has(AR.cle(...P.depart)); };
    ok(atteint(0) && !atteint(1), 'arène Insecte : le levier rouge enferme l\'araignée dans son coin de toile');
    { const c1 = salleDe(ins, ins.chute.salle), [n1x, n1y] = c1.P.suivante, vu = c1.m.reach(ins.chute.x, ins.chute.y);
      ok(walkable(c1.m.get(ins.chute.x, ins.chute.y)) && vu[(n1y + 1) * c1.m.w + n1x], 'arène Insecte : on retombe de la toile dans la Fourmilière, tout près de la sortie'); }
  }

  // 3. la Mue
  {
    const { s, m, P } = salleDe(ins, 'i3'), O = objetA(ins, P), cols = AR.colonnes(ins, P), PN = pnjA(P), [[cx, cy]] = [P.pnj.X[0]];
    const fleurs = [...O].filter(([, q]) => q.o.type === 'fleur').map(([c]) => c), chrys = [...O].filter(([, q]) => q.o.type === 'chrysalide').map(([c]) => c);
    ok(chrys.length === 3, 'arène Insecte : trois chrysalides dans la Mue');
    const etat = (e) => ({ jour: e.jour, fleurs: Object.fromEntries(fleurs.map((c, i) => [c, (e.f >> i) & 1])), eclos: chrys.filter((c, i) => (e.ec >> i) & 1) });
    const bloque = (e) => (x, y) => { const c = AR.cle(x, y), q = O.get(c); if (!m.in(x, y)) return true; if (q?.o.type === 'papillons') return e.jour; if (q?.o.type === 'haie') return e.ec !== 7; if (q?.o.type === 'chrysalide') return !(e.ec >> chrys.indexOf(c) & 1); if (q && !q.o.sol) return true; return !walkable(m.get(x, y)); };
    const eclore = (e) => { for (let k = 0; k < 5; k++) { const L = AR.lumiere(ins, P, etat(e), bloque(e)); let ec = e.ec; chrys.forEach((c, i) => { if (L.touchees.has(c)) ec |= 1 << i; }); if (ec === e.ec) break; e = { ...e, ec }; } return e; };
    const passe = (e, x, y) => { const c = AR.cle(x, y), q = O.get(c); if (!m.in(x, y) || PN.has(c)) return false; if (q?.o.type === 'puits') return false; if (q?.o.type === 'papillons') return !e.jour; if (q?.o.type === 'chrysalide') return e.ec >> chrys.indexOf(c) & 1; if (q?.o.type === 'haie') return e.ec === 7; if (q && !q.o.sol) return false; return walkable(m.get(x, y)); };
    const voisins = (e) => {
      const out = [];
      for (const [, [dx, dy]] of D4) {
        if (!passe(e, e.x + dx, e.y + dy)) continue;
        let f = { ...e, x: e.x + dx, y: e.y + dy };
        for (let k = 0; k < 60 && O.get(AR.cle(f.x, f.y))?.o.type === 'fourmis'; k++) {
          const q = O.get(AR.cle(f.x, f.y)), [ax, ay] = AR.DIRS[AR.sensFourmi(cols, { inverses: s.inverses }, q.c, f.x, f.y)];
          if (!passe(f, f.x + ax, f.y + ay)) break; f = { ...f, x: f.x + ax, y: f.y + ay };
        }
        out.push(f);
      }
      for (const [, [dx, dy]] of D4) {
        const c = AR.cle(e.x + dx, e.y + dy), q = O.get(c);
        if (q?.o.type === 'fleur') out.push(eclore({ ...e, f: e.f ^ (1 << fleurs.indexOf(c)) }));
        if (q?.o.type === 'jour') out.push(eclore({ ...e, jour: !e.jour }));
      }
      return out;
    };
    const e0 = eclore({ x: P.depart[0], y: P.depart[1], jour: true, f: 0, ec: 0 }), clef = (e) => [e.x, e.y, +e.jour, e.f, e.ec].join('|');
    ok(e0.ec === 0, 'arène Insecte : aucune chrysalide n\'éclot toute seule');
    const auChampion = (e) => e.ec === 7 && Math.abs(e.x - cx) + Math.abs(e.y - cy) === 1;
    const r = chercher(e0, voisins, auChampion, clef);
    if (process.env.GESTES) console.log(`arène Insecte : la Mue se résout, en ${r.pas} gestes au moins`); ok(r.pas >= 25, `arène Insecte : la Mue se résout, en ${r.pas} gestes au moins`);
    ok(chercher(e0, (e) => voisins(e).filter((f) => f.jour), auChampion, clef).pas < 0, 'arène Insecte : la Mue demande la nuit');
    ok(chercher(e0, (e) => voisins(e).filter((f) => f.jour === e.jour || !f.jour), auChampion, clef).pas >= 0 && chercher({ ...e0, jour: false }, (e) => voisins(e).filter((f) => !f.jour), auChampion, clef).pas < 0, 'arène Insecte : la Mue demande aussi le jour');
  }

  // le sas : la seule suite qui respecte les trois indices du panneau
  {
    const C = ['violet', 'vert', 'jaune', 'rose'], perm = (l) => (l.length < 2 ? [l] : l.flatMap((x, i) => perm([...l.slice(0, i), ...l.slice(i + 1)]).map((r) => [x, ...r])));
    const bonnes = perm(C).filter((o) => o.indexOf('jaune') !== 0 && o.indexOf('jaune') !== 3 && o.indexOf('vert') === o.indexOf('violet') + 1 && o.indexOf('rose') !== 0);
    ok(bonnes.length === 1 && bonnes[0].join() === poi.sas.join(), 'arène Poison : les indices du sas mènent à une seule suite, celle de la porte');
    const e = AR.etatInitial({}); const rs = [...poi.sas].map((c) => AR.douche(e, c, poi.sas));
    ok(rs.join() === 'suite,suite,suite,bon' && AR.douche(AR.etatInitial({}), 'rose', poi.sas) === 'suite', 'arène Poison : la bonne suite ouvre le sas');
    const f = AR.etatInitial({}); ['vert', 'violet', 'jaune', 'rose'].forEach((c) => AR.douche(f, c, poi.sas));
    ok(f.suite.length === 0, 'arène Poison : une mauvaise suite remet le sas à zéro');
  }

  // le marais : une jauge de 12, il faut les vannes
  {
    const { m, P } = salleDe(poi, 'p2'), O = objetA(poi, P), PN = pnjA(P), [[cx, cy]] = [P.pnj.X[0]];
    const vannes = ['K', 'L', 'M'];
    const sorte = (x, y, e) => { const c = AR.cle(x, y), q = O.get(c); if (!m.in(x, y) || PN.has(c)) return null; if (q && !q.o.sol) return null; if (!walkable(m.get(x, y))) return null; return AR.sorteMarais(q?.o, { vannes: Object.fromEntries(vannes.map((v, i) => [v, !!((e.v >> i) & 1)])) }) || 'pierre'; };
    const voisins = (e, vanneOk = true) => {
      const out = [];
      for (const [, [dx, dy]] of D4) {
        const x = e.x + dx, y = e.y + dy, k = sorte(x, y, e); if (!k) continue;
        const s2 = k === 'lys' ? AR.SOUFFLE : e.s - AR.cout(k);
        if (s2 <= 0) continue;
        out.push({ ...e, x, y, s: s2 });
      }
      if (vanneOk) for (const [, [dx, dy]] of D4) { const q = O.get(AR.cle(e.x + dx, e.y + dy)); if (q?.o.type === 'vanne') out.push({ ...e, v: e.v ^ (1 << vannes.indexOf(q.o.id)) }); }
      return out;
    };
    const e0 = { x: P.depart[0], y: P.depart[1], s: AR.SOUFFLE, v: 0 }, clef = (e) => [e.x, e.y, e.s, e.v].join('|');
    const but = (e) => Math.abs(e.x - cx) + Math.abs(e.y - cy) === 1;
    const r = chercher(e0, voisins, but, clef);
    if (process.env.GESTES) console.log(`arène Poison : le marais se traverse avec 12 de souffle, en ${r.pas} gestes au moins`); ok(r.pas >= 40, `arène Poison : le marais se traverse avec 12 de souffle, en ${r.pas} gestes au moins`);
    ok(chercher(e0, (e) => voisins(e, false), but, clef).pas < 0, 'arène Poison : sans toucher aux vannes, on n\'atteint pas la championne');
    ok(AR.cout('vase') === 1 && AR.cout('profonde') === 2 && AR.cout('bulles', { crache: true }) === 3 && AR.cout('pierre', { toxique: true }) === 2 && AR.cout('lys') === 0, 'arène Poison : ce que coûte chaque case du marais');
  }
}

/* ---------------- règles de combat du labo ---------------- */
{
  const { CHAMPIONS, equipeChampion } = await import('../testodyssee/js/champions.js');
  const R = (seed = 7) => { let s = seed; return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); };
  const mk = (sp, moves, o = {}) => { const m = createMon(sp, 100, { iv: Array(6).fill(31), nat: 12, moves: moves.map((k) => Object.values(MOVES).find((q) => q.key === k).id), shiny: false, ...o }); return m; };
  const combat = (moi, lui, o = {}) => { const b = new BattleT({ rng: R(o.seed), player: { name: 'Test', party: moi }, foe: { name: 'Champion', party: lui, trainer: { cls: 'Champion', name: 'Test', items: {}, ai: 'smart', ...o.tr } } }); b.start(); return b; };
  const id = (k) => Object.values(MOVES).find((q) => q.key === k)?.id;
  ok(['stealth-rock', 'taunt', 'knock-off', 'u-turn', 'sludge-wave', 'substitute', 'heavy-slam', 'rapid-spin', 'grass-knot', 'curse', 'wish', 'aromatherapy', 'sucker-punch', 'roost', 'dazzling-gleam', 'gyro-ball', 'tailwind', 'kings-shield', 'draco-meteor', 'surf', 'pursuit', 'destiny-bond', 'baton-pass', 'aqua-ring', 'trick-room', 'lunar-dance', 'gravity', 'sunny-day', 'bullet-seed'].every(id), 'combat du labo : les attaques ajoutées existent');
  ok(['assault-vest', 'eject-button', 'weakness-policy', 'light-clay', 'toxic-orb', 'damp-rock', 'expert-belt', 'punching-glove', 'soul-dew', 'heat-rock', 'mental-herb'].every((k) => ITEMS[k]?.name), 'combat du labo : les objets ajoutés existent');
  ok(CHAMPIONS.length === 23 && CHAMPIONS.filter((c) => c.equipe).length === 13 && CHAMPIONS.map((c) => c.rang).join() === Array.from({ length: 23 }, (_, i) => i + 1).join(), 'Place des Champions : 23 champions dans l\'ordre, 13 équipes prêtes (dont le Conseil 4)');
  ok(CHAMPIONS[1].type === 'Poison' && CHAMPIONS[2].type === 'Normal' && CHAMPIONS[17].type === 'Eau', 'Place des Champions : Poison 2e, Normal 3e, Eau 18e');
  for (const c of CHAMPIONS.filter((q) => q.equipe)) {
    const t = equipeChampion(c);
    ok(t.length === 6 && t.every((m, k) => m.lvl === 100 && m.iv.join() === (c.equipe[k].iv || Array(6).fill(31)).join() && m.moves.length === 4 && m.item && m.ability), `Place des Champions : ${c.type}, six Pokémon niveau 100, IV voulus, quatre attaques, objet et talent`);
  }
  // Relais : les crans passent au suivant
  { const a = mk(143, ['splash']), d = mk(291, ['baton-pass']), d2 = mk(143, ['splash']); const b = combat([a], [d, d2], { tr: { ai: 'normal' } });
    b.sides[1].v.st[1] = 2; b.foeChoose = () => ({ type: 'move', id: id('baton-pass'), slot: 0 }); b.playerAction({ type: 'move', idx: 0 });
    ok(b.sides[1].active === 1 && b.sides[1].v.st[1] === 2, 'combat du labo : Relais passe les crans au remplaçant'); }
  // Distorsion : le plus lent frappe d'abord
  { const a = mk(291, ['tackle']), d = mk(80, ['trick-room', 'tackle']); const b = combat([a], [d], { tr: { ai: 'normal' } });
    b.distorsion = 3; b.foeChoose = () => ({ type: 'move', id: id('tackle'), slot: 1 }); const ev = b.playerAction({ type: 'move', idx: 0 });
    const k = ev.findIndex((e) => /utilise Charge/.test(e.text || '')); ok(k >= 0 && /Flagadoss/.test(ev[k].text), 'combat du labo : sous Distorsion, le plus lent agit d\'abord'); }
  // Bluff : seulement au premier tour
  { const a = mk(143, ['splash']), d = mk(678, ['fake-out']); const b = combat([a], [d], { tr: { ai: 'normal' } }); b.foeChoose = () => ({ type: 'move', id: id('fake-out'), slot: 0 });
    b.playerAction({ type: 'move', idx: 0 }); const hp = a.hp; b.playerAction({ type: 'move', idx: 0 }); ok(a.hp === hp, 'combat du labo : Bluff échoue après le premier tour'); }
  // Sabotage : objet tombé, plus fort, rendu après le combat
  { const a = mk(461, ['knock-off']), d = mk(143, ['splash'], { item: 'leftovers' }); const b = combat([a], [d]); b.playerAction({ type: 'move', idx: 0 }); ok(d.item === null, 'combat du labo : Sabotage fait tomber l\'objet'); b.end('win'); ok(d.item === 'leftovers', 'combat du labo : l\'objet revient après le combat'); }
  // Demi-Tour du joueur : il choisit qui le remplace, le tour continue
  { const a = mk(212, ['u-turn']), a2 = mk(143, ['splash']), d = mk(143, ['tackle']); const b = combat([a, a2], [d]); const ev = b.playerAction({ type: 'move', idx: 0 }); ok(b.state === 'switch' && ev.some((e) => e.t === 'switch-prompt'), 'combat du labo : Demi-Tour demande le remplaçant'); b.playerSwitch(1); ok(b.state === 'choose' && b.sides[0].active === 1, 'combat du labo : le remplaçant entre et le tour finit'); }
  // Demi-Tour qui met K.O. : le joueur change d'abord, puis l'adversaire envoie le suivant
  { const a = mk(212, ['u-turn']), a2 = mk(143, ['splash']), d = mk(143, ['splash']), d2 = mk(143, ['splash']); d.hp = 1; const b = combat([a, a2], [d, d2], { tr: { ai: 'normal' } });
    const ev = b.playerAction({ type: 'move', idx: 0 }); ok(b.state === 'switch' && b.sides[1].active === 0 && !ev.some((e) => e.t === 'send' && e.side === 1), 'combat du labo : Demi-Tour qui met K.O. : l\'adversaire attend que le joueur ait changé');
    const ev2 = b.playerSwitch(1), i0 = ev2.findIndex((e) => e.t === 'send' && e.side === 0), i1 = ev2.findIndex((e) => e.t === 'send' && e.side === 1);
    ok(b.state === 'choose' && i0 >= 0 && i1 > i0 && b.sides[1].active === 1, 'combat du labo : Demi-Tour qui met K.O. : le joueur change, puis l\'adversaire envoie le suivant'); }
  // Bouton Fuite en plein tour : le remplaçant ne joue pas l'attaque prévue par celui qui est parti
  { const a = mk(635, ['dark-pulse']), d = mk(450, ['stealth-rock'], { item: 'eject-button' }), d2 = mk(445, ['earthquake']); const b = combat([a], [d, d2]);
    const ev = b.playerAction({ type: 'move', idx: 0 }); ok(b.sides[1].active === 1 && !b.sides[0].roc && !ev.some((e) => /Piège de Roc/.test(e.text || '')), 'combat du labo : après un Bouton Fuite, le remplaçant ne joue pas le coup de celui qui est parti'); }
  // l'IA : pas de Séisme sur un Pokémon à Lévitation, pas de boost face à un Pokémon qui la met K.O.
  { const moi = equipeChampion(CHAMPIONS.find((c) => c.type === 'Ténèbres')), lui = equipeChampion(CHAMPIONS.find((c) => c.type === 'Sol'));
    moi.unshift(moi.splice(3, 1)[0]); lui.unshift(lui.splice(3, 1)[0]);
    const b = combat(moi, lui); b.sides[0].v.st[3] = 2; const r = b.foeChoose(), mv = r.type === 'move' && MOVES[r.id];
    ok(r.type === 'switch' || (mv && !['earthquake', 'swords-dance'].includes(mv.key)), 'IA : Carchacrok ne lance ni Séisme ni Danse Lames contre Trioxhydre à +2'); }
  // l'IA : des combats entiers entre équipes de champions, sans erreur
  { let fin = 0, n = 0;
    for (const A of ['Combat', 'Vol', 'Spectre', 'Fée']) for (const Bt of ['Sol', 'Eau', 'Acier']) {
      const b = combat(equipeChampion(CHAMPIONS.find((c) => c.type === A)), equipeChampion(CHAMPIONS.find((c) => c.type === Bt)), { seed: n + 3, tr: { mega: true } }); n++;
      for (let t = 0; t < 300 && b.state !== 'over'; t++) {
        if (b.state === 'switch') { b.playerSwitch(b.sides[0].party.findIndex((m, i) => m.hp > 0 && i !== b.sides[0].active)); continue; }
        const u = b.usableMoves(0); b.playerAction({ type: 'move', idx: u[t % Math.max(1, u.length)] ?? 0 });
      }
      if (b.state === 'over') fin++;
    }
    ok(fin === n, `IA : ${n} combats entiers entre équipes de champions vont jusqu'au bout`); }
  // Demi-Tour de l'adversaire : il change tout seul
  { const a = mk(143, ['splash']), d = mk(212, ['u-turn']), d2 = mk(143, ['splash']); const b = combat([a], [d, d2]); b.playerAction({ type: 'move', idx: 0 }); ok(b.sides[1].active === 1, 'combat du labo : l\'adversaire change après son Demi-Tour'); }
  // Piège de Roc : blesse en arrivant
  { const a = mk(143, ['splash']), a2 = mk(6, ['splash']), d = mk(392, ['stealth-rock']); const b = combat([a, a2], [d]); b.playerAction({ type: 'move', idx: 0 }); b.playerAction({ type: 'switch', idx: 1 }); ok(a2.hp === a2.stats[0] - Math.floor(a2.stats[0] * 4 / 8), 'combat du labo : Piège de Roc blesse Dracaufeu de moitié en arrivant'); }
  // Clonage : le clone encaisse
  { const a = mk(143, ['tackle']), d = mk(701, ['substitute']); const b = combat([a], [d]); const ev = b.playerAction({ type: 'move', idx: 0 }); ok(d.hp === d.stats[0] - Math.floor(d.stats[0] / 4) && ev.some((e) => /Le clone encaisse/.test(e.text || '')), 'combat du labo : le clone encaisse le coup à la place du Pokémon'); }
  // Coup Bas : échoue contre une attaque de statut
  { const a = mk(143, ['splash']), d = mk(625, ['sucker-punch']); const b = combat([a], [d]); const ev = b.playerAction({ type: 'move', idx: 0 }); ok(a.hp === a.stats[0] && ev.some((e) => e.text === 'Mais cela échoue !'), 'combat du labo : Coup Bas échoue si l\'autre n\'attaque pas'); }
  // objet Choix : une seule attaque
  { const a = mk(445, ['earthquake', 'stone-edge'], { item: 'choice-band' }), d = mk(143, ['splash']); const b = combat([a], [d]); b.playerAction({ type: 'move', idx: 0 }); const ev = b.playerAction({ type: 'move', idx: 1 }); ok(ev.length === 1 && /objet Choix|Bandeau Choix/.test(ev[0].text), 'combat du labo : un objet Choix bloque sur la première attaque'); }
  // Puissance Cachée fixée
  { const a = mk(537, ['hidden-power']); a.pc = { t: 'electric', p: 60 }; const b = combat([a], [mk(130, ['splash'])]); ok(b.moveType(0, MOVES[id('hidden-power')]) === 'electric' && b.movePower(0, 1, MOVES[id('hidden-power')]) === 60, 'combat du labo : Puissance Cachée prend le type et la puissance donnés'); }
  // Protéen et Déclic Tactique
  { const a = mk(658, ['ice-beam'], { ability: 'protean' }), d = mk(143, ['splash']); const b = combat([a], [d]); b.playerAction({ type: 'move', idx: 0 }); ok(SPECIES[a.sp].t.join() === 'ice', 'combat du labo : Protéen change le type'); b.end('win'); ok(a.sp === 658, 'combat du labo : Amphinobi reprend sa forme après le combat'); }
  { const a = mk(143, ['splash']), d = mk(681, ['sacred-sword'], { ability: 'stance-change' }); const b = combat([a], [d]); const atk = d.stats[1]; b.playerAction({ type: 'move', idx: 0 }); ok(d.stats[1] > atk && SPECIES[d.sp].visuel === 681, 'combat du labo : Exagide passe en Forme Assaut pour attaquer'); }
  // Orbe Toxique et Soin Poison
  { const a = mk(143, ['splash']), d = mk(472, ['protect'], { ability: 'poison-heal', item: 'toxic-orb' }); const b = combat([a], [d]); b.playerAction({ type: 'move', idx: 0 }); ok(d.status === 'tox', 'combat du labo : l\'Orbe Toxique empoisonne à la fin du tour'); }
  // Prélèvement Destin
  { const a = mk(445, ['earthquake']), d = mk(478, ['destiny-bond']); d.hp = 1; const b = combat([a], [d, mk(143, ['splash'])]); b.playerAction({ type: 'move', idx: 0 }); ok(isFainted(a), 'combat du labo : Prélèvem. Destin emporte celui qui met K.O.'); }
  // Peau Féérique
  { const a = mk(700, ['hyper-voice'], { ability: 'pixilate' }), b = combat([a], [mk(149, ['splash'])]); ok(b.moveType(0, MOVES[id('hyper-voice')]) === 'fairy', 'combat du labo : Peau Féérique rend Mégaphone de type Fée'); }
  // Vulné-Assurance
  { const a = mk(392, ['flamethrower']), d = mk(681, ['splash'], { item: 'weakness-policy' }); const b = combat([a], [d]); b.playerAction({ type: 'move', idx: 0 }); ok(isFainted(d) || b.sides[1].v.st[1] === 2, 'combat du labo : Vulné-Assurance monte l\'Attaque'); }
}

console.log(fails ? `${fails} échec(s) sur ${checks} vérifications` : `TestOdyssée : ${checks} vérifications, tout est bon.`);
process.exit(fails ? 1 : 0);
