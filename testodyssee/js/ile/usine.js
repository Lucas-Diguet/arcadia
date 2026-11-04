// testodyssee/js/ile/usine.js — l'usine à pièges et la caserne (sans DOM) : ce qu'on y achète avec les points
// d'usine (gagnés à la borne d'arcade), le niveau des statues piégées, les gardes qu'on engage, et le stock du joueur.
//
// Dans la donnée de l'île : points, stock { article: nombre }, statues { 'st:dialga': niveau }, plans (salles
// d'entraînement). Un piège, une statue ou un garde posé sur l'île sort du stock ; rangé, il y revient. Dans la salle
// d'entraînement, tout ce qui est débloqué se pose sans rien dépenser.

/** les pièges : on marche dessus, ils ne se voient pas (sauf pour le propriétaire, s'il le demande) */
export const PIEGES = [
  { id: 'pg:trou', nom: 'Trou', prix: 10, img: 'piege_trou', effet: 'trou', desc: 'L\'intrus tombe dedans et perd deux secondes à en sortir.' },
  { id: 'pg:roche', nom: 'Éboulement', prix: 10, img: 'piege_roche', effet: 'roche', desc: 'Des cailloux tombent du plafond : l\'intrus reste coincé trois secondes.' },
  { id: 'pg:brume', nom: 'Brume', prix: 15, img: 'piege_brume', effet: 'brume', desc: 'Une brume épaisse cache tout autour de l\'intrus pendant huit secondes.' },
  { id: 'pg:colle', nom: 'Colle', prix: 15, img: 'piege_colle', effet: 'colle', desc: 'L\'intrus avance deux fois moins vite pendant dix secondes.' },
  { id: 'pg:alarme', nom: 'Alarme', prix: 20, img: 'piege_alarme', effet: 'alarme', desc: 'Le garde le plus proche de la salle accourt et défie l\'intrus.' },
  { id: 'pg:renvoi', nom: 'Renvoi', prix: 25, img: 'piege_renvoi', effet: 'renvoi', desc: 'L\'intrus est renvoyé à l\'entrée de la salle.' },
  { id: 'pg:degats1', nom: 'Piège à dégâts I', prix: 15, img: 'piege_degats1', effet: 'degats', part: 0.1, desc: 'Le premier Pokémon de l\'intrus perd 10 % de ses PV.' },
  { id: 'pg:degats2', nom: 'Piège à dégâts II', prix: 30, img: 'piege_degats2', effet: 'degats', part: 0.3, desc: 'Le premier Pokémon de l\'intrus perd 30 % de ses PV.' },
  { id: 'pg:degats3', nom: 'Piège à dégâts III', prix: 50, img: 'piege_degats3', effet: 'degats', part: 0.5, desc: 'Le premier Pokémon de l\'intrus perd 50 % de ses PV.' },
  { id: 'pg:combat', nom: 'Piège de combat', prix: 30, img: 'piege_combat', effet: 'combat', desc: 'Appelle un garde de combat de la salle (engagé à la caserne), qui vient défier l\'intrus.' },
];
export const PIEGE = Object.fromEntries(PIEGES.map((p) => [p.id, p]));

/** les statues piégées : un boss se réveille si l'intrus passe dans leur regard */
export const STATUES = [
  { id: 'st:dialga', nom: 'Statue de Dialga', sp: 483, prix: 120, desc: 'Si l\'intrus passe devant elle, Dialga se réveille : combat de boss.' },
  { id: 'st:palkia', nom: 'Statue de Palkia', sp: 484, prix: 120, desc: 'Si l\'intrus passe devant elle, Palkia se réveille : combat de boss.' },
];
export const STATUE = Object.fromEntries(STATUES.map((s) => [s.id, s]));
export const NIVEAU_STATUE = 20, PAS_STATUE = 5, MAX_STATUE = 70;
/** ce que coûte le passage au niveau suivant */
export const prixAmelioration = (niveau) => 40 + (niveau - NIVEAU_STATUE) * 4;
/** cases que surveille une statue ou un garde qui guette, droit devant */
export const VUE = 4;

/* ---------------- la caserne ---------------- */
/** un type de Pokémon par spécialité, dans l'ordre où elles se débloquent ; deux lignées par type */
export const TYPES = [
  { t: 'normal', nom: 'Normal', sprite: 'gamin', lignees: [[19, 20, 20], [16, 17, 18]] },
  { t: 'plante', nom: 'Plante', sprite: 'insectomane', lignees: [[43, 44, 45], [1, 2, 3]] },
  { t: 'feu', nom: 'Feu', sprite: 'montagnard', lignees: [[58, 58, 59], [4, 5, 6]] },
  { t: 'eau', nom: 'Eau', sprite: 'marin', lignees: [[60, 61, 62], [7, 8, 9]] },
  { t: 'electrik', nom: 'Électrik', sprite: 'scientifique', lignees: [[81, 82, 82], [25, 26, 26]] },
  { t: 'roche', nom: 'Roche', sprite: 'randonneuse', lignees: [[74, 75, 76], [95, 95, 208]] },
  { t: 'combat', nom: 'Combat', sprite: 'karateka', lignees: [[66, 67, 68], [56, 57, 57]] },
  { t: 'sol', nom: 'Sol', sprite: 'voleur', lignees: [[50, 51, 51], [104, 105, 105]] },
  { t: 'psy', nom: 'Psy', sprite: 'medium', lignees: [[63, 64, 65], [79, 80, 80]] },
  { t: 'spectre', nom: 'Spectre', sprite: 'pretre', lignees: [[92, 93, 94], [200, 200, 429]] },
  { t: 'glace', nom: 'Glace', sprite: 'kimono', lignees: [[220, 221, 221], [361, 362, 362]] },
  { t: 'dragon', nom: 'Dragon', sprite: 'topdresseur', lignees: [[147, 148, 149], [371, 372, 373]] },
];
export const TYPE = Object.fromEntries(TYPES.map((t) => [t.t, t]));
/** deux sortes de gardes : celui qui guette (il voit l'intrus passer devant lui), et celui qu'appelle un piège de combat */
export const MODES = {
  guet: { nom: 'Garde qui guette', court: 'qui guette', cls: 'Garde', prix: 40, n: 2, bonus: 0 },
  combat: { nom: 'Garde de combat', court: 'de combat', cls: 'Garde d\'élite', prix: 80, n: 3, bonus: 4 },
};
export const GARDES = TYPES.flatMap((t) => Object.entries(MODES).map(([m, M]) => ({ id: `gd:${t.t}:${m}`, type: t.t, mode: m, nom: `${M.nom} (${t.nom})`, sprite: t.sprite })));
export const GARDE = Object.fromEntries(GARDES.map((g) => [g.id, g]));

/** l'avancée du joueur (badges) décide des spécialités ouvertes et du niveau des gardes */
export const nbBadges = (st) => (st?.badges || []).filter(Boolean).length;
export const typesOuverts = (badges) => TYPES.slice(0, Math.min(TYPES.length, 2 + badges));
export const niveauGarde = (mode, badges) => Math.min(75, 12 + 5 * badges + MODES[mode].bonus);
export const prixGarde = (mode, badges) => MODES[mode].prix + niveauGarde(mode, badges) * (mode === 'combat' ? 2 : 1);
/** l'équipe d'un garde, faite d'après son niveau : la première lignée en tête, l'autre ensuite */
export function equipeGarde(id, badges) {
  const g = GARDE[id], T = TYPE[g.type], lvl = niveauGarde(g.mode, badges);
  const etage = lvl < 22 ? 0 : lvl < 36 ? 1 : 2;
  const out = [];
  for (let i = 0; i < MODES[g.mode].n; i++) out.push([T.lignees[i % 2][Math.max(0, etage - (i >= 2 ? 1 : 0))], lvl - (i === 0 ? 0 : 1)]);
  return out;
}
const NOMS = ['Basile', 'Lison', 'Marius', 'Romy', 'Gaspard', 'Nina', 'Oscar', 'Lou', 'Félix', 'Inès', 'Victor', 'Jade'];
/** un nom stable pour un garde posé (d'après sa case) */
export const nomGarde = (x, y) => NOMS[(x * 7 + y * 13) % NOMS.length];

/* ---------------- points, achats et stock ---------------- */
export function completerUsine(ile) {
  ile.points = Math.max(0, Math.floor(+ile.points || 0));
  ile.stock = ile.stock && typeof ile.stock === 'object' ? ile.stock : {};
  ile.statues = ile.statues && typeof ile.statues === 'object' ? ile.statues : {};
  for (const s of STATUES) ile.statues[s.id] = Math.max(NIVEAU_STATUE, Math.min(MAX_STATUE, +ile.statues[s.id] || NIVEAU_STATUE));
  ile.plans = Array.isArray(ile.plans) ? ile.plans.filter((p) => p && Array.isArray(p.salles)) : [];
  ile.voirPieges = !!ile.voirPieges;
  return ile;
}
export const enStock = (ile, id) => ile.stock?.[id] || 0;
export function ajouterStock(ile, id, n = 1) { ile.stock[id] = Math.max(0, enStock(ile, id) + n); if (!ile.stock[id]) delete ile.stock[id]; }
/** le prix d'un article de l'usine ou de la caserne */
export function prix(id, badges = 0) {
  if (PIEGE[id]) return PIEGE[id].prix;
  if (STATUE[id]) return STATUE[id].prix;
  if (GARDE[id]) return prixGarde(GARDE[id].mode, badges);
  return null;
}
/** acheter : { ok, why } ; les points baissent et le stock monte */
export function acheter(ile, id, badges = 0) {
  const p = prix(id, badges);
  if (p == null) return { ok: false, why: 'Ça ne se vend pas ici.' };
  if (GARDE[id] && !typesOuverts(badges).some((t) => t.t === GARDE[id].type)) return { ok: false, why: 'Cette spécialité n\'est pas encore ouverte.' };
  if (ile.points < p) return { ok: false, why: `Il te faut ${p} points d'usine (tu en as ${ile.points}).` };
  ile.points -= p; ajouterStock(ile, id, 1);
  return { ok: true, prix: p };
}
/** améliorer une statue piégée : +5 niveaux */
export function ameliorer(ile, id) {
  const n = ile.statues[id];
  if (n >= MAX_STATUE) return { ok: false, why: 'Elle est déjà au niveau le plus haut.' };
  const p = prixAmelioration(n);
  if (ile.points < p) return { ok: false, why: `Il te faut ${p} points d'usine (tu en as ${ile.points}).` };
  ile.points -= p; ile.statues[id] = n + PAS_STATUE;
  return { ok: true, prix: p, niveau: ile.statues[id] };
}

/* ---------------- la borne d'arcade ---------------- */
/** points d'usine gagnés en une partie de casse-briques : une brique = un point, un mur fini = 15 de plus */
export const pointsPartie = (briques, murs) => Math.max(0, briques | 0) + 15 * Math.max(0, murs | 0);
