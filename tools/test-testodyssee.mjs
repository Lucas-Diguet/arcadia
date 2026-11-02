// tools/test-testodyssee.mjs — TestOdyssée : plans des donjons et règles partagées du groupe.
// node tools/test-testodyssee.mjs
import { DONJONS } from '../testodyssee/js/donjons/index.js';
import { construireCarte, lirePlan, regionDe, ouvrir, aCote } from '../testodyssee/js/donjon/plan.js';
import { installerContenu } from '../testodyssee/js/contenu.js';
import { Raid } from '../testodyssee/js/combat/raid.js';
import { nouvelEtat, appliquer, ouverte, battu, prisPar, requisDalles, clesDe, serrures } from '../testodyssee/js/donjon/etat.js';
import { createMon } from '../odyssee/js/core/mon.js';
import { SPECIES } from '../odyssee/js/data/species.js';
import { ITEMS } from '../odyssee/js/core/items.js';
import { buildWorld } from '../odyssee/js/world/region.js';
import { listerLieux } from '../testodyssee/js/lieux.js';
import { EQUIPES } from '../testodyssee/js/equipes.js';
import { walkable } from '../odyssee/js/world/tiles.js';

installerContenu();
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
  // on part de l'entrée et de chaque arrivée d'ascenseur
  const seen = m.reach(...P.depart);
  for (const [c, o] of Object.entries(d.objets || {})) if (o.type === 'ascenseur') { const s2 = m.reach(...aCote(m, P, c)); for (let i = 0; i < seen.length; i++) seen[i] |= s2[i]; }
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
}

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
