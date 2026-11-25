// testodyssee/js/champions.js — les 23 champions, dans l'ordre des arènes (18 types), puis le Conseil 4 et le Maître de la
// Ligue. Chaque arène a son niveau maximum (NIVEAU_MAX) : le plus faible Pokémon du champion est à ce niveau, son as
// (toujours le dernier) 5 niveaux au-dessus ; l'arène 1 garde les niveaux écrits par l'auteur. Conseil 4 et Maître au
// niveau 100. IV à 31.
// Ceux qui n'ont pas encore d'équipe ne se combattent pas.
// Une équipe : [espèce, objet, talent, nature, PV/Atq/Déf/AtqSpé/DéfSpé/Vit (EV), attaques, options { pc, shiny }].
// pc : Puissance Cachée fixée, sans tenir compte des IV ({ t: type, p: puissance }) ; role : 'climat' (pose la météo,
// l'IA le garde en vie et le renvoie quand la météo s'arrête) ; iv : les IV s'ils ne sont pas tous à 31 (PV/Atq/Déf/AtqSpé/DéfSpé/Vit).
import { createMon, refreshStats, NATURES } from '../../odyssee/js/core/mon.js';
import { MOVES } from '../../odyssee/js/data/moves.js';
import { SPECIES } from '../../odyssee/js/data/species.js';
import { TALENTS_ESPECES } from '../../odyssee/js/data/talents.js';

const nature = (n) => { const k = NATURES.indexOf(n); if (k < 0) throw new Error('nature inconnue : ' + n); return k; };
const attaque = (key) => { const m = Object.values(MOVES).find((q) => q.key === key); if (!m) throw new Error('attaque inconnue : ' + key); return m.id; };
const SANS_ATQ0 = [31, 0, 31, 31, 31, 31];
const P = (sp, item, ability, nat, ev, moves, o = {}) => ({ sp, item, ability, nat, ev, moves, ...o });
const EV = (hp = 0, atk = 0, def = 0, spa = 0, spd = 0, spe = 0) => [hp, atk, def, spa, spd, spe];
const EV0 = EV();
/** niveau maximum de chaque arène (1 à 18) */
export const NIVEAU_MAX = [20, 25, 25, 30, 35, 40, 40, 45, 50, 55, 60, 65, 70, 75, 80, 90, 95, 100];
/** les six Pokémon d'un champion au niveau de son arène : du niveau maximum (le plus faible) à 5 niveaux au-dessus (l'as, le dernier) ;
 *  `ecarts` dit l'écart de chacun, dans l'ordre d'envoi */
const auNiveau = (equipe, arene, ecarts = [0, 1, 2, 3, 4, 5]) => { const n = NIVEAU_MAX[arene - 1]; return equipe.map((p, k) => ({ ...p, lvl: n + ecarts[k] })); };

// les neuf premières arènes : équipes données par l'auteur (niveaux écrits pour l'arène 1 seulement) ; EV pour l'as seul (arènes 1 à 4), pour toute l'équipe (5 à 9)
const INSECTE = [
  P(10, null, 'shield-dust', 'Rigide', EV0, ['tackle', 'string-shot', 'harden'], { lvl: 16 }),   // Chenipan
  P(13, null, 'shield-dust', 'Rigide', EV0, ['poison-sting', 'string-shot', 'bug-bite'], { lvl: 16 }),   // Aspicot
  P(664, null, 'shield-dust', 'Modeste', EV0, ['stun-spore', 'sleep-powder', 'struggle-bug'], { lvl: 18 }),   // Lépidonille
  P(14, null, 'shed-skin', 'Rigide', EV0, ['harden', 'poison-sting'], { lvl: 18 }),   // Coconfort
  P(540, null, 'swarm', 'Rigide', EV0, ['tackle', 'string-shot', 'razor-leaf'], { lvl: 19 }),   // Larveyette
  P(416, 'sitrus-berry', 'pressure', 'Rigide', EV(252, 0, 128, 0, 128, 0), ['heal-order', 'defend-order', 'bug-bite', 'sucker-punch'], { lvl: 23 }),   // Apireine
];
const FEU = [
  P(58, null, 'intimidate', 'Rigide', EV0, ['fire-fang', 'odor-sleuth', 'bite', 'uproar']),   // Caninos
  P(37, null, 'flash-fire', 'Hardi', EV0, ['will-o-wisp', 'ember', 'iron-tail', 'screech']),   // Goupix
  P(218, null, 'flame-body', 'Rigide', EV0, ['rock-slide', 'flame-charge', 'flamethrower', 'amnesia']),   // Limagma
  P(662, null, 'flame-body', 'Rigide', EV0, ['flame-charge', 'peck', 'ember', 'growl']),   // Braisillon
  P(5, null, 'blaze', 'Hardi', EV0, ['fire-fang', 'metal-claw', 'dragon-breath', 'uproar']),   // Reptincel
  P(323, 'sitrus-berry', 'solid-rock', 'Rigide', EV(252, 128, 0, 128, 0, 0), ['flamethrower', 'earthquake', 'rock-slide', 'amnesia']),   // Camérupt
];
const POISON = [
  P(24, null, 'intimidate', 'Rigide', EV0, ['poison-sting', 'bite', 'mud-slap', 'mean-look']),   // Arbok
  P(30, null, 'poison-point', 'Rigide', EV0, ['double-kick', 'poison-sting', 'bite', 'double-hit']),   // Nidorina
  P(33, null, 'poison-point', 'Rigide', EV0, ['double-kick', 'poison-sting', 'fury-attack', 'double-hit']),   // Nidorino
  P(110, null, 'levitate', 'Modeste', EV0, ['poison-gas', 'smog', 'venoshock', 'haze']),   // Smogogo
  P(42, null, 'inner-focus', 'Rigide', EV0, ['poison-fang', 'wing-attack', 'bite', 'uproar']),   // Nosferalto
  P(3, 'sitrus-berry', 'overgrow', 'Modeste', EV(252, 0, 0, 252, 4, 0), ['giga-drain', 'sludge-bomb', 'synthesis', 'leech-seed']),   // Florizarre
];
const PLANTE = [
  P(71, null, 'chlorophyll', 'Hardi', EV0, ['razor-leaf', 'acid', 'sleep-powder', 'growth']),   // Empiflor
  P(2, null, 'overgrow', 'Rigide', EV0, ['razor-leaf', 'sleep-powder', 'leech-seed', 'take-down']),   // Herbizarre
  P(188, null, 'infiltrator', 'Hardi', EV0, ['mega-drain', 'stun-spore', 'synthesis', 'acrobatics']),   // Floravol
  P(286, null, 'poison-heal', 'Rigide', EV0, ['mach-punch', 'bullet-seed', 'spore', 'mud-slap']),   // Chapignon
  P(407, 'miracle-seed', 'natural-cure', 'Modeste', EV0, ['giga-drain', 'sludge-bomb', 'aromatherapy', 'synthesis']),   // Roserade
  P(497, 'sitrus-berry', 'contrary', 'Modeste', EV(4, 0, 0, 252, 0, 252), ['leaf-storm', 'grass-knot', 'slam', 'mean-look']),   // Majaspic
];
const ROCHE = [
  P(76, null, 'sturdy', 'Rigide', EV(252, 252, 4, 0, 0, 0), ['rock-slide', 'mud-slap', 'self-destruct', 'sucker-punch']),   // Grolem
  P(526, 'hard-stone', 'sturdy', 'Rigide', EV(252, 252, 0, 0, 4, 0), ['rock-slide', 'stone-edge', 'power-gem', 'knock-off']),   // Gigalithe
  P(698, null, 'refrigerate', 'Modeste', EV(252, 0, 0, 252, 4, 0), ['ice-beam', 'power-gem', 'thunder-wave', 'light-screen']),   // Amagara
  P(142, 'focus-sash', 'pressure', 'Rigide', EV(4, 252, 0, 0, 0, 252), ['rock-slide', 'wing-attack', 'fire-fang', 'earthquake']),   // Ptéra
  P(112, 'eviolite', 'lightning-rod', 'Rigide', EV(252, 252, 4, 0, 0, 0), ['earthquake', 'rock-slide', 'megahorn', 'hammer-arm']),   // Rhinoféros
  P(464, 'leftovers', 'solid-rock', 'Rigide', EV(252, 252, 0, 0, 4, 0), ['earthquake', 'rock-slide', 'megahorn', 'hammer-arm']),   // Rhinastoc
];
const NORMAL = [
  P(424, 'silk-scarf', 'technician', 'Rigide', EV(4, 252, 0, 0, 0, 252), ['fake-out', 'dual-chop', 'pursuit', 'u-turn']),   // Capidextre
  P(241, 'lum-berry', 'scrappy', 'Rigide', EV(252, 4, 252, 0, 0, 0), ['body-slam', 'milk-drink', 'gyro-ball', 'rollout']),   // Écrémeuh
  P(233, 'eviolite', 'trace', 'Modeste', EV(252, 0, 0, 252, 4, 0), ['tri-attack', 'ice-beam', 'thunderbolt', 'recover']),   // Porygon2
  P(398, 'life-orb', 'intimidate', 'Rigide', EV(4, 252, 0, 0, 0, 252), ['brave-bird', 'return', 'close-combat', 'u-turn']),   // Étouraptor
  P(143, 'leftovers', 'thick-fat', 'Rigide', EV(252, 252, 0, 0, 4, 0), ['body-slam', 'earthquake', 'crunch', 'rest']),   // Ronflex
  P(474, 'life-orb', 'adaptability', 'Modeste', EV(4, 0, 0, 252, 0, 252), ['tri-attack', 'shadow-ball', 'ice-beam', 'nasty-plot']),   // Porygon-Z
];
const ELECTRIK = [
  P(135, 'magnet', 'volt-absorb', 'Modeste', EV(4, 0, 0, 252, 0, 252), ['thunderbolt', 'shadow-ball', 'baton-pass', 'agility']),   // Voltali
  P(405, null, 'intimidate', 'Rigide', EV(4, 252, 0, 0, 0, 252), ['spark', 'crunch', 'superpower', 'volt-switch']),   // Luxray
  P(309, null, 'lightning-rod', 'Rigide', EV(4, 252, 0, 0, 0, 252), ['spark', 'bite', 'thunder-wave', 'volt-switch']),   // Dynavolt
  P(466, 'life-orb', 'motor-drive', 'Rigide', EV(4, 252, 0, 0, 0, 252), ['thunder-punch', 'ice-punch', 'low-kick', 'cross-chop']),   // Élekable
  P(596, 'focus-sash', 'compound-eyes', 'Modeste', EV(4, 0, 0, 252, 0, 252), ['bug-buzz', 'thunder', 'sticky-web', 'energy-ball']),   // Mygavolt
  P(82, 'eviolite', 'magnet-pull', 'Modeste', EV(252, 0, 0, 252, 4, 0), ['thunderbolt', 'flash-cannon', 'tri-attack', 'thunder-wave']),   // Magnéton
];
const GLACE = [
  P(478, 'focus-sash', 'cursed-body', 'Modeste', EV(4, 0, 0, 252, 0, 252), ['ice-beam', 'shadow-ball', 'spikes', 'thunder-wave']),   // Momartik
  P(131, 'leftovers', 'water-absorb', 'Modeste', EV(252, 0, 4, 252, 0, 0), ['ice-beam', 'surf', 'thunderbolt', 'heal-bell']),   // Lokhlass
  P(615, 'scope-lens', 'levitate', 'Modeste', EV(4, 0, 0, 252, 0, 252), ['ice-beam', 'rapid-spin', 'power-gem', 'haze']),   // Hexagel
  P(473, 'choice-scarf', 'thick-fat', 'Rigide', EV(4, 252, 0, 0, 0, 252), ['icicle-crash', 'earthquake', 'ice-shard', 'superpower']),   // Mammochon
  P(461, 'life-orb', 'pressure', 'Rigide', EV(4, 252, 0, 0, 0, 252), ['ice-shard', 'icicle-crash', 'knock-off', 'low-kick']),   // Dimoret
  P(460, 'life-orb', 'snow-warning', 'Hardi', EV(252, 128, 0, 128, 0, 0), ['blizzard', 'energy-ball', 'ice-shard', 'earthquake']),   // Blizzaroi
];
const PSY = [
  P(196, 'light-clay', 'magic-bounce', 'Modeste', EV(252, 0, 128, 0, 128, 0), ['psychic', 'shadow-ball', 'light-screen', 'reflect']),   // Mentali
  P(437, 'leftovers', 'levitate', 'Relax', EV(252, 0, 128, 0, 128, 0), ['gyro-ball', 'psychic', 'stealth-rock', 'trick-room']),   // Archéodong
  P(579, 'life-orb', 'magic-guard', 'Modeste', EV(252, 0, 0, 252, 4, 0), ['psyshock', 'shadow-ball', 'focus-blast', 'recover']),   // Symbios
  P(475, 'assault-vest', 'steadfast', 'Rigide', EV(4, 252, 0, 0, 0, 252), ['psycho-cut', 'close-combat', 'knock-off', 'stone-edge']),   // Gallame
  P(282, 'choice-specs', 'trace', 'Modeste', EV(4, 0, 0, 252, 0, 252), ['moonblast', 'psychic', 'thunderbolt', 'energy-ball']),   // Gardevoir
  P(65, 'life-orb', 'magic-guard', 'Modeste', EV(4, 0, 0, 252, 0, 252), ['psychic', 'shadow-ball', 'energy-ball', 'focus-blast']),   // Alakazam
];

/** un Pokémon de champion, prêt au combat (niveau 100, ou s.lvl) */
export function monChampion(s, ot = '') {
  const m = createMon(s.sp, s.lvl || 100, { iv: s.iv ? s.iv.slice() : Array(6).fill(31), nat: nature(s.nat), moves: s.moves.map(attaque), item: s.item, ability: s.ability, shiny: !!s.shiny, ot, met: 'Place des Champions' });
  m.ev = s.ev.slice(); refreshStats(m); m.hp = m.stats[0];
  if (s.pc) m.pc = { ...s.pc };
  if (s.role) m.role = s.role;   // rôle dans l'équipe, lu par l'IA (combat/ia.js) : 'climat' = pose la météo
  return m;
}
export const equipeChampion = (c, ot) => c.equipe.map((s) => monChampion(s, ot));

const COMBAT = [
  P(454, 'life-orb', 'dry-skin', 'Timide', EV(0, 0, 4, 252, 0, 252), ['focus-blast', 'sludge-wave', 'vacuum-wave', 'nasty-plot']),
  P(620, 'choice-scarf', 'regenerator', 'Jovial', EV(0, 252, 0, 0, 4, 252), ['high-jump-kick', 'poison-jab', 'knock-off', 'u-turn']),
  P(392, 'focus-sash', 'blaze', 'Timide', EV(0, 0, 0, 252, 4, 252), ['stealth-rock', 'taunt', 'fire-blast', 'vacuum-wave']),
  P(701, 'sitrus-berry', 'unburden', 'Jovial', EV(0, 252, 4, 0, 0, 252), ['high-jump-kick', 'acrobatics', 'substitute', 'swords-dance']),
  P(68, 'assault-vest', 'guts', 'Rigide', EV(252, 252, 0, 0, 4, 0), ['close-combat', 'knock-off', 'thunder-punch', 'heavy-slam']),
  P(475, 'galladite', 'justified', 'Jovial', EV(0, 252, 4, 0, 0, 252), ['swords-dance', 'close-combat', 'zen-headbutt', 'ice-punch']),
];
const TENEBRES = [
  P(625, 'life-orb', 'defiant', 'Rigide', EV(0, 252, 4, 0, 0, 252), ['swords-dance', 'sucker-punch', 'iron-head', 'low-kick']),
  P(248, 'choice-band', 'sand-stream', 'Rigide', EV(4, 252, 0, 0, 0, 252), ['pursuit', 'stone-edge', 'crunch', 'earthquake'], { role: 'climat' }),
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
  P(169, 'life-orb', 'infiltrator', 'Jovial', EV(0, 252, 4, 0, 0, 252), ['brave-bird', 'cross-poison', 'x-scissor', 'u-turn']),
  P(468, 'leftovers', 'serene-grace', 'Timide', EV(0, 0, 4, 252, 0, 252), ['air-slash', 'aura-sphere', 'thunder-wave', 'nasty-plot']),
];
const SPECTRE = [
  P(593, 'leftovers', 'water-absorb', 'Assuré', EV(252, 0, 252, 0, 4, 0), ['scald', 'hex', 'will-o-wisp', 'recover']),
  P(609, 'choice-specs', 'flash-fire', 'Modeste', EV(4, 0, 0, 252, 0, 252), ['shadow-ball', 'flamethrower', 'energy-ball', 'psychic']),
  P(478, 'focus-sash', 'cursed-body', 'Timide', EV(0, 0, 0, 252, 4, 252), ['ice-beam', 'shadow-ball', 'will-o-wisp', 'destiny-bond']),
  P(623, 'life-orb', 'no-guard', 'Rigide', EV(4, 252, 0, 0, 0, 252), ['dynamic-punch', 'earthquake', 'shadow-punch', 'stone-edge']),
  P(94, 'life-orb', 'levitate', 'Timide', EV(0, 0, 0, 252, 4, 252), ['shadow-ball', 'sludge-bomb', 'focus-blast', 'thunderbolt']),
  P(354, 'banettite', 'cursed-body', 'Rigide', EV(4, 252, 0, 0, 0, 252), ['shadow-claw', 'gunk-shot', 'destiny-bond', 'shadow-sneak']),
];
const SOL = [
  P(34, 'choice-scarf', 'sheer-force', 'Timide', EV(0, 0, 0, 252, 4, 252), ['ice-beam', 'thunderbolt', 'flamethrower', 'sludge-wave']),
  P(530, 'choice-band', 'sand-rush', 'Jovial', EV(0, 252, 0, 0, 4, 252), ['earthquake', 'iron-head', 'rock-slide', 'rapid-spin']),
  P(450, 'eject-button', 'sand-stream', 'Malin', EV(252, 0, 252, 0, 4, 0), ['stealth-rock', 'slack-off', 'whirlwind', 'earthquake'], { role: 'climat' }),
  P(445, 'rocky-helmet', 'rough-skin', 'Jovial', EV(0, 252, 0, 0, 4, 252), ['earthquake', 'stone-edge', 'fire-fang', 'swords-dance']),
  P(537, 'choice-specs', 'water-absorb', 'Modeste', EV(116, 0, 0, 252, 0, 140), ['hydro-pump', 'hidden-power', 'grass-knot', 'sludge-wave'], { pc: { t: 'electric', p: 60 } }),
  P(208, 'steelixite', 'sturdy', 'Rigide', EV(252, 252, 0, 0, 4, 0), ['heavy-slam', 'curse', 'earthquake', 'stone-edge']),
];
const FEE = [
  P(468, 'leftovers', 'serene-grace', 'Modeste', EV(252, 0, 0, 252, 4, 0), ['thunder-wave', 'air-slash', 'flamethrower', 'roost']),
  P(707, 'light-clay', 'prankster', 'Assuré', EV(252, 0, 252, 4, 0, 0), ['thunder-wave', 'protect', 'light-screen', 'dazzling-gleam']),
  P(184, 'choice-band', 'huge-power', 'Rigide', EV(252, 252, 0, 0, 4, 0), ['aqua-jet', 'play-rough', 'waterfall', 'superpower']),
  P(36, 'leftovers', 'magic-guard', 'Calme', EV(252, 0, 0, 4, 252, 0), ['wish', 'protect', 'aromatherapy', 'moonblast']),
  P(700, 'choice-specs', 'pixilate', 'Modeste', EV(252, 0, 0, 252, 4, 0), ['hyper-voice', 'shadow-ball', 'psyshock', 'hidden-power'], { pc: { t: 'fire', p: 60 } }),
  P(303, 'mawilite', 'huge-power', 'Rigide', EV(248, 252, 0, 0, 8, 0), ['swords-dance', 'sucker-punch', 'play-rough', 'iron-head']),
];
const ACIER = [
  P(598, 'leftovers', 'iron-barbs', 'Relax', EV(252, 4, 252, 0, 0, 0), ['leech-seed', 'protect', 'gyro-ball', 'power-whip']),
  P(227, 'rocky-helmet', 'sturdy', 'Malin', EV(252, 0, 232, 0, 0, 24), ['brave-bird', 'stealth-rock', 'roost', 'tailwind']),
  P(681, 'weakness-policy', 'stance-change', 'Rigide', EV(252, 252, 0, 0, 4, 0), ['kings-shield', 'swords-dance', 'sacred-sword', 'shadow-sneak']),
  P(212, 'choice-band', 'technician', 'Rigide', EV(248, 252, 0, 0, 8, 0), ['bullet-punch', 'u-turn', 'iron-head', 'knock-off']),
  P(462, 'choice-scarf', 'sturdy', 'Modeste', EV(248, 0, 0, 252, 8, 0), ['thunderbolt', 'flash-cannon', 'hidden-power', 'volt-switch'], { pc: { t: 'ice', p: 60 } }),
  P(376, 'metagrossite', 'clear-body', 'Jovial', EV(4, 252, 0, 0, 0, 252), ['bullet-punch', 'earthquake', 'zen-headbutt', 'meteor-mash']),
];
const DRAGON = [
  P(706, 'assault-vest', 'gooey', 'Modeste', EV(248, 0, 0, 252, 8, 0), ['draco-meteor', 'sludge-wave', 'thunderbolt', 'flamethrower']),
  P(373, 'choice-scarf', 'moxie', 'Naïf', EV(0, 252, 0, 4, 0, 252), ['outrage', 'earthquake', 'iron-tail', 'fire-blast']),
  P(635, 'leftovers', 'levitate', 'Timide', EV(0, 0, 0, 252, 4, 252), ['roost', 'nasty-plot', 'dark-pulse', 'earth-power']),
  P(715, 'choice-specs', 'infiltrator', 'Timide', EV(0, 0, 0, 252, 4, 252), ['u-turn', 'draco-meteor', 'boomburst', 'flamethrower']),
  P(149, 'leftovers', 'multiscale', 'Rigide', EV(0, 252, 0, 0, 4, 252), ['dragon-dance', 'outrage', 'extreme-speed', 'roost']),
  P(6, 'charizardite-x', 'blaze', 'Rigide', EV(4, 252, 0, 0, 0, 252), ['dragon-dance', 'flare-blitz', 'outrage', 'earthquake']),
];
const EAU = [
  P(279, 'damp-rock', 'drizzle', 'Assuré', EV(252, 0, 0, 0, 252, 0), ['u-turn', 'scald', 'roost', 'hydro-pump'], { role: 'climat' }),
  P(230, 'choice-specs', 'swift-swim', 'Modeste', EV(0, 0, 0, 252, 0, 252), ['hydro-pump', 'surf', 'draco-meteor', 'ice-beam']),
  P(658, 'expert-belt', 'protean', 'Pressé', EV(0, 0, 0, 252, 0, 252), ['ice-beam', 'hydro-pump', 'u-turn', 'gunk-shot']),
  P(594, 'leftovers', 'regenerator', 'Assuré', EV(40, 0, 216, 0, 252, 0), ['scald', 'toxic', 'wish', 'protect']),
  P(184, 'choice-band', 'huge-power', 'Rigide', EV(0, 252, 0, 0, 0, 252), ['waterfall', 'play-rough', 'aqua-jet', 'superpower']),
  P(260, 'swampertite', 'torrent', 'Jovial', EV(0, 252, 0, 0, 0, 252), ['waterfall', 'earthquake', 'ice-punch', 'superpower']),
];

// Démétéros Forme Totémique : une forme du labo, invisible des listes, comme les Méga
export const DEMETEROS_T = 10021;
if (!Object.prototype.hasOwnProperty.call(SPECIES, DEMETEROS_T)) {
  Object.defineProperty(SPECIES, DEMETEROS_T, { enumerable: false, configurable: true,
    value: { ...SPECIES[645], k: 'landorus-therian', b: [89, 145, 90, 105, 80, 91], ev: [] } });
  TALENTS_ESPECES[DEMETEROS_T] = ['intimidate', null, null];
}

// le Roi Sans Nom, au fond de son tombeau (niveau 55) : Zoroark se fait passer pour Ectoplasma
export const EQUIPE_ROI = [
  P(571, 'life-orb', 'illusion', 'Timide', EV(4, 0, 0, 252, 0, 252), ['dark-pulse', 'extrasensory', 'flamethrower', 'focus-blast'], { iv: SANS_ATQ0, lvl: 55 }),
  P(344, 'leftovers', 'levitate', 'Rigide', EV(252, 252, 0, 0, 4, 0), ['rapid-spin', 'stone-edge', 'earthquake', 'explosion'], { lvl: 55 }),
  P(623, 'choice-band', 'no-guard', 'Rigide', EV(252, 252, 0, 0, 4, 0), ['dynamic-punch', 'earthquake', 'fire-punch', 'hammer-arm'], { lvl: 55 }),
  P(563, 'leftovers', 'mummy', 'Assuré', EV(252, 0, 252, 4, 0, 0), ['toxic', 'protect', 'pain-split', 'shadow-ball'], { iv: SANS_ATQ0, lvl: 55 }),
  P(59, 'assault-vest', 'intimidate', 'Pressé', EV(0, 252, 0, 4, 0, 252), ['overheat', 'crunch', 'flare-blitz', 'close-combat'], { lvl: 55 }),
  P(94, 'life-orb', 'levitate', 'Timide', EV(4, 0, 0, 252, 0, 252), ['shadow-ball', 'sludge-wave', 'destiny-bond', 'thunder'], { iv: SANS_ATQ0, lvl: 55 }),
];
export const equipeRoi = (ot) => EQUIPE_ROI.map((s) => monChampion(s, ot));

// le Conseil 4 : le soleil, le Relais, la Distorsion, puis un combat double (joué en simple pour l'instant)
const SANS_ATQ = [31, 0, 31, 31, 31, 31], SANS_ATQS = [31, 31, 31, 0, 31, 31], LENT = [31, 31, 31, 31, 31, 0], LENT_SPE = [31, 0, 31, 31, 31, 0];
const SOLEIL = [
  P(324, 'heat-rock', 'drought', 'Assuré', EV(248, 0, 252, 0, 8, 0), ['stealth-rock', 'lava-plume', 'rapid-spin', 'toxic'], { role: 'climat' }),
  P(6, 'charizardite-y', 'blaze', 'Timide', EV(4, 0, 0, 252, 0, 252), ['flamethrower', 'solar-beam', 'roost', 'focus-blast']),
  P(3, 'life-orb', 'chlorophyll', 'Modeste', EV(252, 0, 0, 252, 0, 4), ['solar-beam', 'sunny-day', 'sludge-bomb', 'weather-ball']),
  P(149, 'weakness-policy', 'multiscale', 'Rigide', EV(252, 252, 0, 0, 0, 4), ['dragon-dance', 'dragon-claw', 'earthquake', 'extreme-speed']),
  P(485, 'choice-scarf', 'flash-fire', 'Timide', EV(0, 0, 0, 252, 4, 252), ['flash-cannon', 'fire-blast', 'dragon-pulse', 'earth-power']),
  P(244, 'choice-band', 'pressure', 'Jovial', EV(0, 252, 0, 0, 4, 252), ['extreme-speed', 'flare-blitz', 'stone-edge', 'crunch']),
];
const RELAIS = [
  P(134, 'weakness-policy', 'water-absorb', 'Assuré', EV(252, 0, 120, 0, 136, 0), ['aqua-ring', 'acid-armor', 'baton-pass', 'scald'], { iv: SANS_ATQ }),
  P(472, 'toxic-orb', 'poison-heal', 'Malin', EV(244, 0, 40, 0, 0, 224), ['substitute', 'earthquake', 'swords-dance', 'baton-pass'], { iv: SANS_ATQS }),
  P(196, 'life-orb', 'magic-bounce', 'Timide', EV(0, 0, 4, 252, 0, 252), ['dazzling-gleam', 'stored-power', 'calm-mind', 'baton-pass'], { iv: SANS_ATQ }),
  P(291, 'mental-herb', 'speed-boost', 'Malin', EV(248, 0, 236, 0, 0, 24), ['swords-dance', 'baton-pass', 'protect', 'substitute'], { iv: [31, 0, 31, 0, 31, 31] }),
  P(700, 'leftovers', 'pixilate', 'Assuré', EV(252, 0, 252, 0, 4, 0), ['moonblast', 'calm-mind', 'baton-pass', 'wish'], { iv: SANS_ATQ }),
  P(308, 'medichamite', 'pure-power', 'Jovial', EV(0, 252, 4, 0, 0, 252), ['drain-punch', 'fire-punch', 'zen-headbutt', 'baton-pass'], { iv: SANS_ATQS }),
];
const DISTORSION = [
  P(591, 'sitrus-berry', 'regenerator', 'Malpoli', EV(252, 0, 176, 0, 80, 0), ['toxic', 'protect', 'giga-drain', 'spore'], { iv: LENT_SPE }),
  P(80, 'leftovers', 'regenerator', 'Relax', EV(252, 0, 252, 0, 4, 0), ['psychic', 'trick-room', 'scald', 'slack-off'], { iv: LENT_SPE }),
  P(534, 'flame-orb', 'guts', 'Rigide', EV(0, 252, 0, 0, 4, 252), ['close-combat', 'facade', 'knock-off', 'mach-punch']),
  P(488, 'leftovers', 'levitate', 'Malpoli', EV(252, 0, 252, 4, 0, 0), ['lunar-dance', 'trick-room', 'psychic', 'moonblast'], { iv: LENT_SPE }),
  P(214, 'heracronite', 'swarm', 'Brave', EV(252, 252, 4, 0, 0, 0), ['pin-missile', 'close-combat', 'rock-blast', 'bullet-seed'], { iv: LENT }),
  P(579, 'focus-sash', 'magic-guard', 'Discret', EV(252, 0, 0, 252, 4, 0), ['trick-room', 'focus-blast', 'psyshock', 'energy-ball'], { iv: LENT_SPE }),
];
const DOUBLE = [
  P(94, 'gengarite', 'cursed-body', 'Timide', EV(0, 0, 0, 252, 4, 252), ['protect', 'hypnosis', 'shadow-ball', 'sludge-bomb'], { iv: SANS_ATQ }),
  P(DEMETEROS_T, 'rocky-helmet', 'intimidate', 'Jovial', EV(252, 0, 4, 0, 0, 252), ['gravity', 'u-turn', 'rock-slide', 'knock-off']),
  P(678, 'focus-sash', 'prankster', 'Pressé', EV(0, 4, 0, 252, 0, 252), ['gravity', 'fake-out', 'psychic', 'energy-ball']),
  P(464, 'life-orb', 'solid-rock', 'Rigide', EV(4, 252, 0, 0, 0, 252), ['rock-slide', 'swords-dance', 'rock-polish', 'fire-punch']),
  P(381, 'soul-dew', 'levitate', 'Timide', EV(4, 0, 0, 252, 0, 252), ['draco-meteor', 'psychic', 'ice-beam', 'thunderbolt'], { iv: SANS_ATQ }),
  P(637, 'sitrus-berry', 'flame-body', 'Timide', EV(4, 0, 0, 252, 0, 252), ['bug-buzz', 'quiver-dance', 'protect', 'heat-wave']),
];

// titre, nom, image (personnage d'Odyssée), type, équipe (null : pas encore prête)
const C = (rang, cls, nom, sprite, type, equipe = null) => ({ rang, cls, nom, sprite, type, equipe });
export const CHAMPIONS = [
  C(1, 'Champion', 'Hector', 'hector', 'Insecte', INSECTE),
  C(2, 'Champion', 'Pyros', 'pyros', 'Feu', auNiveau(FEU, 2)),
  C(3, 'Championne', 'Morgane', 'morgane', 'Poison', auNiveau(POISON, 3)),
  C(4, 'Championne', 'Flora', 'flora', 'Plante', auNiveau(PLANTE, 4)),
  C(5, 'Champion', 'Basalte', 'basalte', 'Roche', auNiveau(ROCHE, 5)),
  C(6, 'Championne', 'Margot', 'margot', 'Normal', auNiveau(NORMAL, 6)),
  C(7, 'Championne', 'Volta', 'volta', 'Électrik', auNiveau(ELECTRIK, 7)),
  C(8, 'Champion', 'à nommer', 'randonneuse', 'Glace', auNiveau(GLACE, 8)),
  C(9, 'Championne', 'Sibylle', 'sibylle', 'Psy', auNiveau(PSY, 9)),
  C(10, 'Champion', 'à nommer', 'karateka', 'Combat', auNiveau(COMBAT, 10)),
  C(11, 'Champion', 'Corbin', 'corbin', 'Ténèbres', auNiveau(TENEBRES, 11)),
  C(12, 'Champion', 'Aurèle', 'aurele', 'Vol', auNiveau(VOL, 12)),
  C(13, 'Champion', 'à nommer', 'medium', 'Spectre', auNiveau(SPECTRE, 13)),
  C(14, 'Champion', 'Gaspard', 'gaspard', 'Sol', auNiveau(SOL, 14)),
  C(15, 'Championne', 'Lilas', 'lilas', 'Fée', auNiveau(FEE, 15, [2, 0, 1, 3, 4, 5])),
  C(16, 'Champion', 'Ferdinand', 'ferdinand', 'Acier', auNiveau(ACIER, 16)),
  C(17, 'Champion', 'Drakos', 'drakos', 'Dragon', auNiveau(DRAGON, 17)),
  C(18, 'Championne', 'Marine', 'marine', 'Eau', auNiveau(EAU, 18)),
  C(19, 'Conseil 4', 'Frimas', 'frimas', 'Soleil', SOLEIL),
  C(20, 'Conseil 4', 'Brutus', 'brutus', 'Relais', RELAIS),
  C(21, 'Conseil 4', 'Spectrel', 'spectrel', 'Distorsion', DISTORSION),
  C(22, 'Conseil 4', 'Ombrelle', 'ombrelle', 'Double', DOUBLE),
  C(23, 'Maître', 'Célestine', 'celestine', null),
];
/** nom affiché : « Champion Corbin » ; ceux qui n'ont pas encore de nom : « Champion Combat » */
export const nomChampion = (c) => (c.nom === 'à nommer' ? `${c.cls} ${c.type}` : `${c.cls} ${c.nom}`);
