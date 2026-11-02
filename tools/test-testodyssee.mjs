// tools/test-testodyssee.mjs — TestOdyssée : plans des donjons et règles partagées du groupe.
// node tools/test-testodyssee.mjs
import { DONJONS } from '../testodyssee/js/donjons/index.js';
import { construireCarte, lirePlan, regionDe, ouvrir } from '../testodyssee/js/donjon/plan.js';
import { nouvelEtat, appliquer, ouverte, battu, prisPar, requisDalles } from '../testodyssee/js/donjon/etat.js';
import { createMon } from '../odyssee/js/core/mon.js';
import { SPECIES } from '../odyssee/js/data/species.js';
import { ITEMS } from '../odyssee/js/core/items.js';
import { buildWorld } from '../odyssee/js/world/region.js';
import { listerLieux } from '../testodyssee/js/lieux.js';
import { EQUIPES } from '../testodyssee/js/equipes.js';
import { walkable } from '../odyssee/js/world/tiles.js';

let fails = 0, checks = 0;
const ok = (c, msg) => { checks++; if (!c) { fails++; console.log('ÉCHEC :', msg); } };
const compte = (seen) => { let n = 0; for (const v of seen) n += v; return n; };

/* ---------------- plans ---------------- */
for (const d of DONJONS) {
  const m = construireCarte(d), P = m.donjon.plan;
  ok(m.id === d.carte, `${d.id} : identifiant de carte`);
  for (const s of d.salles) {
    ok(regionDe(m, P, s).length > 0, `${d.id} : la salle ${s.id} a des cases`);
    if (s.porte) ok(P.portes[s.porte]?.length, `${d.id} : la porte ${s.porte} de ${s.id} est dessinée`);
    for (const k of s.pnj || []) ok(P.pnj[k] && d.pnj[k], `${d.id} : le PNJ ${k} de ${s.id} est posé`);
    if (s.type === 'dalles') ok(P.dalles.length > 0, `${d.id} : des dalles dans ${s.id}`);
  }
  for (const k of Object.keys(P.portes)) ok(d.salles.some((s) => s.porte === k), `${d.id} : la porte ${k} appartient à une salle`);
  for (const p of Object.values(d.pnj)) for (const [sp, lvl] of p.equipe || []) ok(SPECIES[sp] && lvl > 0 && lvl <= 100, `${d.id} : ${p.nom} a des Pokémon valides`);
  for (const k of Object.keys(d.recompense?.objets || {})) ok(ITEMS[k], `${d.id} : l'objet ${k} existe`);
  // portes fermées : on ne quitte pas l'entrée ; ouvertes : tout le sol est atteint, chaque PNJ a une case libre à côté
  const ferme = compte(m.reach(...P.depart));
  ok(ferme === regionDe(m, P, d.salles[0]).filter(([x, y]) => walkable(m.get(x, y))).length, `${d.id} : portes fermées, seule l'entrée est accessible (${ferme})`);
  for (const l of Object.values(P.portes)) for (const [x, y] of l) ok(ouvrir(m, x, y), `${d.id} : la porte en ${x},${y} s'ouvre`);
  const seen = m.reach(...P.depart);
  const sol = P.sol.filter(([x, y]) => walkable(m.get(x, y)));
  ok(sol.every(([x, y]) => seen[y * m.w + x]), `${d.id} : portes ouvertes, tout le sol est accessible`);
  for (const [k, [[x, y]]] of Object.entries(P.pnj)) ok([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen[(y + dy) * m.w + x + dx]), `${d.id} : on peut parler à ${k}`);
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

/* ---------------- lieux et équipes ---------------- */
const world = buildWorld();
for (const dd of DONJONS) { const m = construireCarte(dd); world.maps[dd.carte] = m; }
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
