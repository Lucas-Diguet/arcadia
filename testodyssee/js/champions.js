// testodyssee/js/champions.js — les 23 champions de fin de jeu, dans l'ordre des arènes (18 types), puis le Conseil 4
// et le Maître de la Ligue. Tous au niveau 100, IV à 31. Ceux qui n'ont pas encore d'équipe ne se combattent pas.
// Une équipe : [espèce, objet, talent, nature, PV/Atq/Déf/AtqSpé/DéfSpé/Vit (EV), attaques, options { pc, shiny }].
// pc : Puissance Cachée fixée, sans tenir compte des IV ({ t: type, p: puissance }).
import { createMon, refreshStats, NATURES } from '../../odyssee/js/core/mon.js';
import { MOVES } from '../../odyssee/js/data/moves.js';

const nature = (n) => { const k = NATURES.indexOf(n); if (k < 0) throw new Error('nature inconnue : ' + n); return k; };
const attaque = (key) => { const m = Object.values(MOVES).find((q) => q.key === key); if (!m) throw new Error('attaque inconnue : ' + key); return m.id; };
const P = (sp, item, ability, nat, ev, moves, o = {}) => ({ sp, item, ability, nat, ev, moves, ...o });
const EV = (hp = 0, atk = 0, def = 0, spa = 0, spd = 0, spe = 0) => [hp, atk, def, spa, spd, spe];

/** un Pokémon de champion, prêt au combat (niveau 100) */
export function monChampion(s, ot = '') {
  const m = createMon(s.sp, 100, { iv: Array(6).fill(31), nat: nature(s.nat), moves: s.moves.map(attaque), item: s.item, ability: s.ability, shiny: !!s.shiny, ot, met: 'Place des Champions' });
  m.ev = s.ev.slice(); refreshStats(m); m.hp = m.stats[0];
  if (s.pc) m.pc = { ...s.pc };
  return m;
}
export const equipeChampion = (c, ot) => c.equipe.map((s) => monChampion(s, ot));

const COMBAT = [
  P(392, 'focus-sash', 'blaze', 'Timide', EV(0, 0, 0, 252, 4, 252), ['stealth-rock', 'taunt', 'fire-blast', 'vacuum-wave']),
  P(620, 'choice-scarf', 'regenerator', 'Jovial', EV(0, 252, 0, 0, 4, 252), ['high-jump-kick', 'poison-jab', 'knock-off', 'u-turn']),
  P(454, 'life-orb', 'dry-skin', 'Timide', EV(0, 0, 4, 252, 0, 252), ['focus-blast', 'sludge-wave', 'vacuum-wave', 'nasty-plot']),
  P(701, 'sitrus-berry', 'unburden', 'Jovial', EV(0, 252, 4, 0, 0, 252), ['high-jump-kick', 'acrobatics', 'substitute', 'swords-dance']),
  P(68, 'assault-vest', 'guts', 'Rigide', EV(252, 252, 0, 0, 4, 0), ['close-combat', 'knock-off', 'thunder-punch', 'heavy-slam']),
  P(475, 'galladite', 'justified', 'Jovial', EV(0, 252, 4, 0, 0, 252), ['swords-dance', 'close-combat', 'zen-headbutt', 'ice-punch'], { shiny: true }),
];
const TENEBRES = [
  P(625, 'life-orb', 'defiant', 'Rigide', EV(0, 252, 4, 0, 0, 252), ['swords-dance', 'sucker-punch', 'iron-head', 'low-kick']),
  P(248, 'choice-band', 'sand-stream', 'Rigide', EV(4, 252, 0, 0, 0, 252), ['pursuit', 'stone-edge', 'crunch', 'earthquake']),
  P(461, 'focus-sash', 'pressure', 'Jovial', EV(0, 252, 4, 0, 0, 252), ['swords-dance', 'knock-off', 'icicle-crash', 'ice-shard']),
  P(635, 'choice-specs', 'levitate', 'Timide', EV(0, 0, 0, 252, 4, 252), ['u-turn', 'draco-meteor', 'flamethrower', 'earth-power']),
  P(630, 'leftovers', 'overcoat', 'Malin', EV(252, 0, 252, 0, 4, 0), ['foul-play', 'toxic', 'whirlwind', 'roost']),
  P(302, 'sablenite', 'prankster', 'Calme', EV(252, 0, 4, 0, 252, 0), ['will-o-wisp', 'recover', 'foul-play', 'calm-mind']),
];
const VOL = [
  P(663, 'choice-band', 'gale-wings', 'Rigide', EV(0, 252, 4, 0, 0, 252), ['brave-bird', 'flare-blitz', 'steel-wing', 'u-turn']),
  P(227, 'leftovers', 'sturdy', 'Malin', EV(252, 0, 252, 0, 4, 0), ['drill-peck', 'roost', 'toxic', 'whirlwind']),
  P(472, 'toxic-orb', 'poison-heal', 'Malin', EV(252, 0, 184, 0, 0, 72), ['earthquake', 'toxic', 'protect', 'ice-fang']),
  P(398, 'choice-band', 'intimidate', 'Jovial', EV(0, 252, 4, 0, 0, 252), ['brave-bird', 'close-combat', 'double-edge', 'quick-attack']),
  P(468, 'leftovers', 'serene-grace', 'Timide', EV(0, 0, 4, 252, 0, 252), ['air-slash', 'aura-sphere', 'thunder-wave', 'nasty-plot']),
  P(169, 'life-orb', 'infiltrator', 'Jovial', EV(0, 252, 4, 0, 0, 252), ['brave-bird', 'cross-poison', 'x-scissor', 'u-turn']),
];
const SPECTRE = [
  P(94, 'life-orb', 'levitate', 'Timide', EV(0, 0, 0, 252, 4, 252), ['shadow-ball', 'sludge-bomb', 'focus-blast', 'thunderbolt']),
  P(609, 'choice-specs', 'flash-fire', 'Modeste', EV(4, 0, 0, 252, 0, 252), ['shadow-ball', 'flamethrower', 'energy-ball', 'psychic']),
  P(478, 'focus-sash', 'cursed-body', 'Timide', EV(0, 0, 0, 252, 4, 252), ['ice-beam', 'shadow-ball', 'will-o-wisp', 'destiny-bond']),
  P(623, 'life-orb', 'no-guard', 'Rigide', EV(4, 252, 0, 0, 0, 252), ['dynamic-punch', 'earthquake', 'shadow-punch', 'stone-edge']),
  P(593, 'leftovers', 'water-absorb', 'Assuré', EV(252, 0, 252, 0, 4, 0), ['scald', 'hex', 'will-o-wisp', 'recover']),
  P(354, 'banettite', 'prankster', 'Rigide', EV(4, 252, 0, 0, 0, 252), ['shadow-claw', 'gunk-shot', 'destiny-bond', 'shadow-sneak']),
];
const SOL = [
  P(34, 'choice-scarf', 'sheer-force', 'Timide', EV(0, 0, 0, 252, 4, 252), ['ice-beam', 'thunderbolt', 'flamethrower', 'sludge-wave']),
  P(530, 'choice-band', 'sand-rush', 'Jovial', EV(0, 252, 0, 0, 4, 252), ['earthquake', 'iron-head', 'rock-slide', 'rapid-spin']),
  P(450, 'eject-button', 'sand-stream', 'Malin', EV(252, 0, 252, 0, 4, 0), ['stealth-rock', 'slack-off', 'whirlwind', 'earthquake']),
  P(445, 'rocky-helmet', 'rough-skin', 'Jovial', EV(0, 252, 0, 0, 4, 252), ['earthquake', 'stone-edge', 'fire-fang', 'swords-dance']),
  P(537, 'choice-specs', 'water-absorb', 'Modeste', EV(116, 0, 0, 252, 0, 140), ['hydro-pump', 'hidden-power', 'grass-knot', 'sludge-wave'], { pc: { t: 'electric', p: 60 } }),
  P(208, 'steelixite', 'sturdy', 'Rigide', EV(252, 252, 0, 0, 4, 0), ['heavy-slam', 'curse', 'earthquake', 'stone-edge']),
];
const FEE = [
  P(36, 'leftovers', 'magic-guard', 'Calme', EV(252, 0, 0, 4, 252, 0), ['wish', 'protect', 'aromatherapy', 'moonblast']),
  P(303, 'mawilite', 'huge-power', 'Rigide', EV(248, 252, 0, 0, 8, 0), ['swords-dance', 'sucker-punch', 'play-rough', 'iron-head']),
  P(184, 'choice-band', 'huge-power', 'Rigide', EV(252, 252, 0, 0, 4, 0), ['aqua-jet', 'play-rough', 'waterfall', 'superpower']),
  P(468, 'leftovers', 'serene-grace', 'Modeste', EV(252, 0, 0, 252, 4, 0), ['thunder-wave', 'air-slash', 'flamethrower', 'roost']),
  P(707, 'light-clay', 'prankster', 'Assuré', EV(252, 0, 252, 4, 0, 0), ['thunder-wave', 'protect', 'light-screen', 'dazzling-gleam']),
  P(700, 'choice-specs', 'pixilate', 'Modeste', EV(252, 0, 0, 252, 4, 0), ['hyper-voice', 'shadow-ball', 'psyshock', 'hidden-power'], { pc: { t: 'fire', p: 60 } }),
];
const ACIER = [
  P(598, 'leftovers', 'iron-barbs', 'Relax', EV(252, 4, 252, 0, 0, 0), ['leech-seed', 'protect', 'gyro-ball', 'power-whip']),
  P(376, 'metagrossite', 'tough-claws', 'Jovial', EV(4, 252, 0, 0, 0, 252), ['bullet-punch', 'earthquake', 'zen-headbutt', 'meteor-mash']),
  P(227, 'rocky-helmet', 'sturdy', 'Malin', EV(252, 0, 232, 0, 0, 24), ['brave-bird', 'stealth-rock', 'roost', 'tailwind']),
  P(681, 'weakness-policy', 'stance-change', 'Rigide', EV(252, 252, 0, 0, 4, 0), ['kings-shield', 'swords-dance', 'sacred-sword', 'shadow-sneak']),
  P(212, 'choice-band', 'technician', 'Rigide', EV(248, 252, 0, 0, 8, 0), ['bullet-punch', 'u-turn', 'iron-head', 'knock-off']),
  P(462, 'choice-scarf', 'sturdy', 'Modeste', EV(248, 0, 0, 252, 8, 0), ['thunderbolt', 'flash-cannon', 'hidden-power', 'volt-switch'], { pc: { t: 'ice', p: 60 } }),
];
const DRAGON = [
  P(6, 'charizardite-x', 'tough-claws', 'Rigide', EV(4, 252, 0, 0, 0, 252), ['dragon-dance', 'flare-blitz', 'outrage', 'earthquake']),
  P(149, 'life-orb', 'multiscale', 'Rigide', EV(0, 252, 0, 0, 4, 252), ['dragon-dance', 'outrage', 'extreme-speed', 'roost']),
  P(373, 'choice-scarf', 'moxie', 'Naïf', EV(0, 252, 0, 4, 0, 252), ['outrage', 'earthquake', 'iron-tail', 'fire-blast']),
  P(635, 'leftovers', 'levitate', 'Timide', EV(0, 0, 0, 252, 4, 252), ['roost', 'nasty-plot', 'dark-pulse', 'earth-power']),
  P(715, 'choice-specs', 'infiltrator', 'Timide', EV(0, 0, 0, 252, 4, 252), ['u-turn', 'draco-meteor', 'boomburst', 'flamethrower']),
  P(706, 'assault-vest', 'gooey', 'Modeste', EV(248, 0, 0, 252, 8, 0), ['draco-meteor', 'sludge-wave', 'thunderbolt', 'flamethrower']),
];
const EAU = [
  P(279, 'damp-rock', 'drizzle', 'Assuré', EV(252, 0, 0, 0, 252, 0), ['u-turn', 'scald', 'roost', 'hydro-pump']),
  P(260, 'swampertite', 'swift-swim', 'Jovial', EV(0, 252, 0, 0, 0, 252), ['waterfall', 'earthquake', 'ice-punch', 'superpower']),
  P(230, 'choice-specs', 'swift-swim', 'Modeste', EV(0, 0, 0, 252, 0, 252), ['hydro-pump', 'surf', 'draco-meteor', 'ice-beam']),
  P(658, 'expert-belt', 'protean', 'Pressé', EV(0, 0, 0, 252, 0, 252), ['ice-beam', 'grass-knot', 'u-turn', 'gunk-shot']),
  P(594, 'leftovers', 'regenerator', 'Assuré', EV(40, 0, 216, 0, 252, 0), ['scald', 'toxic', 'wish', 'protect']),
  P(184, 'choice-band', 'huge-power', 'Rigide', EV(0, 252, 0, 0, 0, 252), ['waterfall', 'play-rough', 'aqua-jet', 'superpower']),
];

// titre, nom, image (personnage d'Odyssée), type, équipe (null : pas encore prête)
const C = (rang, cls, nom, sprite, type, equipe = null) => ({ rang, cls, nom, sprite, type, equipe });
export const CHAMPIONS = [
  C(1, 'Champion', 'Hector', 'hector', 'Insecte'),
  C(2, 'Championne', 'Morgane', 'morgane', 'Poison'),
  C(3, 'Championne', 'Margot', 'margot', 'Normal'),
  C(4, 'Championne', 'Flora', 'flora', 'Plante'),
  C(5, 'Champion', 'Basalte', 'basalte', 'Roche'),
  C(6, 'Champion', 'à nommer', 'randonneuse', 'Glace'),
  C(7, 'Championne', 'Volta', 'volta', 'Électrik'),
  C(8, 'Championne', 'Sibylle', 'sibylle', 'Psy'),
  C(9, 'Champion', 'à nommer', 'karateka', 'Combat', COMBAT),
  C(10, 'Champion', 'Corbin', 'corbin', 'Ténèbres', TENEBRES),
  C(11, 'Champion', 'Aurèle', 'aurele', 'Vol', VOL),
  C(12, 'Champion', 'à nommer', 'medium', 'Spectre', SPECTRE),
  C(13, 'Champion', 'Pyros', 'pyros', 'Feu'),
  C(14, 'Champion', 'Gaspard', 'gaspard', 'Sol', SOL),
  C(15, 'Championne', 'Lilas', 'lilas', 'Fée', FEE),
  C(16, 'Champion', 'Ferdinand', 'ferdinand', 'Acier', ACIER),
  C(17, 'Champion', 'Drakos', 'drakos', 'Dragon', DRAGON),
  C(18, 'Championne', 'Marine', 'marine', 'Eau', EAU),
  C(19, 'Conseil 4', 'Frimas', 'frimas', null),
  C(20, 'Conseil 4', 'Brutus', 'brutus', null),
  C(21, 'Conseil 4', 'Spectrel', 'spectrel', null),
  C(22, 'Conseil 4', 'Ombrelle', 'ombrelle', null),
  C(23, 'Maître', 'Célestine', 'celestine', null),
];
/** nom affiché : « Champion Corbin » ; ceux qui n'ont pas encore de nom : « Champion Combat » */
export const nomChampion = (c) => (c.nom === 'à nommer' ? `${c.cls} ${c.type}` : `${c.cls} ${c.nom}`);
