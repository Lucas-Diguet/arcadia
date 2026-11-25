// testodyssee/js/donjons/barrage.js — le Barrage de Roche-Haute : un donjon solo, de grandes salles de béton autour
// d'un réservoir. Les plans viennent de barrage-salles.js (tools/barrage.py, qui vérifie aussi qu'on peut le finir) ;
// les mécaniques sont dans ../donjon/barrage.js.
import { GameMap, rng } from '../../../odyssee/js/world/mapgen.js';
import { T } from '../../../odyssee/js/world/tiles.js';
import { SALLES_BARRAGE } from './barrage-salles.js';

function exterieur() {
  const m = new GameMap('labo:barrage:dehors', 34, 28, { outdoor: true, fill: T.PINE, name: 'Combe de Roche-Haute', music: 'route' });
  m.blob(17, 15, 13, 11, T.GRASS, rng(5151));
  m.rect(4, 3, 29, 25, T.GRASS, [T.PINE]);
  // le mur du barrage, et le torrent qui sort de son pied
  const b = m.building('gym', 9, 2, { w: 15, d: 6, door: 7, name: 'Barrage de Roche-Haute' });
  for (let y = b.doorY + 1; y <= 25; y++) m.set(b.doorX, y, T.PATH);
  m.rect(b.doorX - 1, b.doorY + 1, b.doorX + 1, b.doorY + 2, T.PATH);
  for (let y = 9; y <= 25; y++) for (const x of [23, 24]) m.set(x, y, T.WATER);
  m.set(23, 17, T.BRIDGE); m.set(24, 17, T.BRIDGE);
  for (const [x, y] of [[6, 9], [7, 14], [27, 11], [28, 20], [5, 21]]) m.prop('rock', x, y);
  for (const [x, y] of [[11, 10], [21, 10]]) m.prop('lanterne', x, y);
  for (const [x, y] of [[13, 12], [14, 12], [19, 12]]) m.prop('caisse', x, y);
  m.prop('tonneau', 20, 12);
  m.zone(0, 0, 33, 27, { name: 'Combe de Roche-Haute', music: 'route' });
  return { carte: m, porte: [b.doorX, b.doorY] };
}

// les dresseurs, dans l'ordre de tools/barrage.py : [classe, apparence, nom, défi, défaite, après, équipe]
const D = (cls, sprite, nom, defi, perd, apres, equipe) => ({ cls, sprite, nom, defi, perd, resteApres: apres, equipe });
export const DRESSEURS_BARRAGE = [
  // Salle des Vannes
  D('Ouvrier', 'habitant', 'Marcel', 'Douze ans que le chantier est fermé, et je viens encore serrer les boulons. Tu tombes bien, je m\'ennuyais.', 'Bon. Les boulons, eux, ne se plaignent pas.', 'Le vieux Anselme ? Il vit là-dedans depuis la fermeture. Il connaît chaque vanne.', [[76, 55], [208, 55]]),
  D('Pêcheur', 'pecheur', 'Loïc', 'Le réservoir est plein de gros poissons. Et tu viens me les faire fuir ?', 'Ils sont partis de toute façon.', 'Quand on vide le réservoir, on voit tout le fond. Il y a de drôles de choses tombées là.', [[130, 56], [119, 55]]),
  D('Ingénieur', 'scientifique', 'Hubert', 'Je fais les relevés pour la compagnie. Mes Pokémon, eux, font les relevés de tes Pokémon.', 'Relevé : défaite.', 'Le pupitre près de l\'entrée commande tout le réservoir. Les autres salles suivent.', [[82, 55], [101, 55], [462, 56]]),
  D('Marin', 'marin', 'Yann', 'Un lac au milieu des montagnes, et moi qui le prends pour la mer. On se bat ?', 'Je suis bien mieux en mer, en fait.', 'L\'îlot au milieu, je n\'y accoste que quand l\'eau est haute.', [[73, 55], [226, 56]]),
  // Galerie des Turbines
  D('Électricienne', 'topdresseuse', 'Maud', 'Pas de courant depuis que le vieux a tout arrêté. Mes Pokémon, eux, en ont à revendre !', 'Court-circuit.', 'Le disjoncteur est dans le local électrique, tout au fond. Encore faut-il y entrer.', [[135, 56], [310, 56]]),
  D('Ouvrier', 'habitant', 'René', 'Cette passerelle, c\'est moi qui l\'ai coulée. Tu marches sur mon travail.', 'Elle tient bon, au moins.', 'La grille du couloir nord, je l\'ai vue s\'ouvrir une fois. Le levier était dans la fosse du sud.', [[68, 56], [76, 56]]),
  D('Ingénieure', 'dame', 'Clémence', 'Les turbines ne tourneront plus jamais. Sauf si tu me bats, peut-être.', 'Elles tourneront, alors.', 'Le local électrique a une porte blindée. La clé ? Le vieux l\'a cachée quelque part dans les conduites.', [[82, 55], [121, 56], [171, 56]]),
  D('Technicien', 'garde', 'Paolo', 'On ne passe pas sans badge ! ... Bon, je n\'ai pas de badge non plus.', 'Passe, passe.', 'Derrière la grille bleue, il y a l\'ancienne salle de repos. Elle ne s\'ouvre qu\'avec le courant.', [[125, 57], [208, 56]]),
  D('Gardien de nuit', 'garde', 'Bastien', 'Je fais ma ronde depuis douze ans. Personne ne m\'a dit d\'arrêter.', 'Je crois que je vais rentrer chez moi.', 'La nuit, la lumière de la salle de contrôle s\'allume toute seule. Je ne suis jamais allé voir.', [[59, 56], [229, 56]]),
  // Conduites
  D('Égoutier', 'habitant', 'Michel', 'Les conduites, c\'est mon royaume. L\'odeur aussi.', 'Je retourne dans mon royaume.', 'Plein, le réservoir te fait filer dans les conduites, toujours dans le même sens. Vide, ce sont de simples galeries.', [[89, 56], [110, 56]]),
  D('Spéléologue', 'montagnard', 'Joël', 'Une galerie tout en haut, et un seul moyen d\'y monter. Tu l\'as trouvé, on dirait.', 'Tu grimpes mieux que moi.', 'Par le rebord, là-bas, tu redescends droit au quai d\'entrée.', [[75, 56], [208, 56], [232, 57]]),
  D('Plongeuse', 'topdresseuse', 'Sarah', 'Ces conduites, je les ai faites en apnée. Toi, tu te fais porter !', 'Bon, l\'apnée ne fait pas tout.', 'La conduite qui monte à pic vers la galerie haute est fermée par une vanne. On l\'ouvre depuis une petite chambre, au sud-est.', [[131, 57], [365, 57]]),
  D('Ingénieur', 'scientifique', 'Victor', 'Tu es descendu dans les conduites à sec ? Courageux. Ou inconscient.', 'Inconscient, mais fort.', 'La chambre des vannes est inondée quand le réservoir est plein. Son levier aussi.', [[81, 55], [82, 56], [462, 57]]),
  D('Ouvrière', 'habitante', 'Odette', 'Je cherche mon casque depuis ce matin. Tu ne l\'as pas vu ? Non ? Alors combat !', 'Toujours pas de casque.', 'Il y a des recoins partout dans ces galeries. Le vieux y laissait ses carnets.', [[195, 57], [340, 57]]),
  // Bassin de Décantation
  D('Pêcheur', 'pecheur', 'Albert', 'Dans la décantation, l\'eau est calme. Les Pokémon, beaucoup moins.', 'Pas une touche aujourd\'hui.', 'Le canal fait tout le tour du bassin. Plein, il emporte tout ce qui flotte.', [[130, 57], [350, 57]]),
  D('Chimiste', 'scientifique', 'Agnès', 'J\'analyse la vase. Elle est très intéressante, tu sais.', 'Ta technique aussi est intéressante.', 'Ce pupitre-ci commande le réservoir, comme celui de la Salle des Vannes. Pratique.', [[89, 57], [454, 57]]),
  D('Marin', 'marin', 'Erwan', 'J\'ai vu le vieux pousser un rocher dans le canal. Il est fou, je te dis.', 'Fou, mais pas bête, peut-être.', 'Le quai suspendu au-dessus du canal mène au monte-charge. Mais il n\'y a pas d\'escalier.', [[134, 57], [272, 57]]),
  D('Électricien', 'garde', 'Ludovic', 'Le monte-charge ? Il marche, maintenant que le courant est revenu. Encore faut-il arriver jusqu\'à moi !', 'Bon, monte.', 'En haut, c\'est le couronnement : la crête du barrage, en plein vent.', [[405, 58], [135, 57]]),
  D('Topdresseur', 'topdresseur', 'Rémi', 'Je m\'entraîne dans tous les coins sombres de la région. Celui-ci est mon préféré.', 'Je vais chercher un coin plus sombre.', 'Ce couloir ne mène qu\'au rebord. Il fait gagner du temps, dans l\'autre sens.', [[260, 58], [230, 58]]),
  // Couronnement
  D('Montagnard', 'montagnard', 'Pierrot', 'Le vent souffle fort, là-haut. Mes Pokémon, eux, adorent ça.', 'Le vent a tourné.', 'Au bout de la crête, les trois vannes de crue. Le vieux les ouvrait dans un ordre bien à lui.', [[142, 58], [227, 58]]),
  D('Ornithologue', 'randonneuse', 'Céline', 'Chut ! Tu vas faire fuir les Pokémon Vol. Trop tard : combat.', 'Ils sont tous partis.', 'Les carnets du vieux, tu les as lus ? Il y notait tout, même l\'ordre des vannes.', [[279, 58], [398, 58]]),
  D('Topdresseuse', 'topdresseuse', 'Adèle', 'La crête du barrage, c\'est la plus belle vue de la région. Et le plus beau combat.', 'La vue reste belle.', 'Une mauvaise vanne, et tu prends une sacrée douche.', [[121, 58], [407, 58], [466, 58]]),
  D('Garde', 'garde', 'Fernand', 'Le vieux Anselme m\'a fait promettre de ne laisser passer personne. Personne !', 'Bon, personne sauf toi.', 'Sous la trappe, une échelle descend tout droit dans la Salle des Vannes.', [[59, 58], [248, 58]]),
  D('Chef de chantier', 'capitaine', 'Raoul', 'J\'étais chef de chantier le jour où Anselme a tout arrêté, il y a douze ans. Voyons si tu mérites de le rouvrir.', 'Tu le mérites.', 'Anselme est dans la salle de contrôle. Ne le juge pas trop vite.', [[208, 59], [462, 59], [260, 59]]),
  // Local des Pompes
  D('Mécanicienne', 'topdresseuse', 'Lucie', 'Ces pompes, je les graisse en cachette. Le vieux ne sait pas que je viens.', 'Tu ne lui diras rien, hein ?', 'Le disjoncteur est là, au fond. Mais sans eau dans la turbine, il sautera aussitôt.', [[82, 57], [227, 57], [224, 57]]),
];
// ce qu'un dresseur donne après sa défaite (un objet tiré selon ces chances, en %)
export const BUTIN_BARRAGE = [['hyper-potion', 30], ['max-potion', 15], ['full-heal', 20], ['revive', 15], ['ether', 10], ['sitrus-berry', 10]];

// les carnets d'Anselme (objets du Sac, contenu.js) se lisent depuis le Sac
export const OBJETS_BARRAGE = ['cle-local', 'cle-controle', 'carnet-1', 'carnet-2', 'carnet-3', 'carnet-4', 'carnet-5', 'carnet-6'];

const L = SALLES_BARRAGE;
const salle = (id, extra = {}) => ({ id, nom: L[id].nom, type: 'libre', suivante: null, apres: [], plan: L[id].plan, ...extra });
const PNJ_SALLE = (id) => L[id].dresseurs.map(([, , , n]) => 'ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ'[n]);

const def = {
  id: 'barrage',
  carte: 'labo:barrage',
  nom: 'Barrage de Roche-Haute',
  niveau: 'niv. 55 à 64, en solo',
  entree: 'Un barrage fermé depuis douze ans. On dit qu\'un vieil homme y vit encore.',
  joueurs: { mode: 'solo' },
  solo: true,
  barrage: true,
  style: 'barrage',
  musique: 'cave',
  equipe: 'fin',
  exterieur,
  objetsDuDonjon: OBJETS_BARRAGE,
  // terrain : le niveau de l'eau décide de ce que sont ces cases (../donjon/barrage.js)
  objets: Object.fromEntries([...'~re<>AVᐊᐅᐃᐁPOIØL,wf'].map((c) => [c, { type: 'barrage', sol: true }]).concat([['m', { type: 'tuile', sol: true, t: 'SMASH' }]])),
  decor: { X: 'caisses', Y: 'tonneau', M: 'barrage_machine', Z: 'barrage_cuve', W: 'barrage_tuyaux_mur', T: 'barrage_turbine' },
  pnj: {
    'Ⓘ': { id: 'solene', cls: 'Ingénieure', nom: 'Solène', sprite: 'dame', dir: 'left', toujours: true, barrage: 'solene' },
    'Ⓞ': { id: 'ouvrier1', cls: 'Ouvrier', nom: 'Gaston', sprite: 'habitant', dir: 'right', toujours: true,
      dit: ['Le vieux Anselme a tout reverrouillé quand on est revenus : les grilles, les vannes, le courant.', 'Les grilles de fer, chacune a son levier. Quelque part.'] },
    'Ⓤ': { id: 'ouvrier2', cls: 'Ouvrière', nom: 'Josette', sprite: 'habitante', dir: 'down', toujours: true,
      dit: ['Quand le réservoir est plein, l\'eau file dans les conduites et t\'emporte avec elle.', 'Quand il est vide, ce sont de simples galeries, et on marche au fond des bassins.', 'Il faut savoir quand vider et quand remplir. C\'est tout le métier.'] },
    'Ⓣ': { id: 'technicienne', cls: 'Technicienne', nom: 'Nadia', sprite: 'randonneuse', dir: 'up', toujours: true,
      dit: ['Sans courant, rien ne marche ici : ni les grilles bleues, ni le monte-charge.', 'Le disjoncteur est dans le local des pompes. Mais si l\'eau n\'arrive pas jusqu\'à la turbine, il ne tiendra pas.'] },
    'Ⓑ': { id: 'anselme', cls: 'Barragiste', nom: 'Anselme', sprite: 'vieil_homme', dir: 'down', toujours: true, barrage: 'anselme', musique: 'yghbosselt',
      equipe: [
        [171, 60, 'leftovers', ['scald', 'thunderbolt', 'ice-beam', 'confuse-ray'], 'volt-absorb'],
        [462, 61, 'magnet', ['flash-cannon', 'thunderbolt', 'tri-attack', 'light-screen'], 'magnet-pull'],
        [130, 61, 'mystic-water', ['waterfall', 'ice-fang', 'earthquake', 'dragon-dance'], 'intimidate'],
        [260, 62, 'soft-sand', ['earthquake', 'waterfall', 'ice-punch', 'stone-edge'], 'torrent'],
        [125, 62, null, ['thunder-punch', 'ice-punch', 'cross-chop', 'light-screen'], 'static'],
        [230, 64, 'dragon-fang', ['surf', 'dragon-pulse', 'ice-beam', 'rain-dance'], 'swift-swim', { blocs: 3 }],
      ] },
  },
  salles: [
    salle('hall', { musique: 'routevictoirerse' }),
    salle('vannes', { pnj: PNJ_SALLE('vannes') }),
    salle('turbines', { pnj: PNJ_SALLE('turbines') }),
    salle('local', { pnj: PNJ_SALLE('local') }),
    salle('conduites', { pnj: PNJ_SALLE('conduites') }),
    salle('decantation', { pnj: PNJ_SALLE('decantation') }),
    salle('couronnement', { pnj: PNJ_SALLE('couronnement'), dehors: true, mur: 'CLIFF', solDehors: 'PAVE', musique: 'route' }),
    salle('controle', { pnj: ['Ⓑ'] }),
  ],
  journal: [
    { id: 'barrage', nom: 'Rouvrir le barrage', salle: 'hall', but: 'Trouve Anselme, le barragiste, dans la salle de contrôle.' },
  ],
  classements: [{ id: 'solo', nom: 'Barrage de Roche-Haute', pnj: 'Ⓑ' }],
  pancartesClassement: [{ classement: 'solo', salle: 'hall', cote: 'droite' }],
  textes: {
    perdu: ['Tes Pokémon n\'en peuvent plus...', 'Tu te réveilles à l\'entrée de la salle. Ton équipe a été soignée.'],
  },
};
// chaque dresseur : sa lettre, sa place et son regard viennent du plan
for (const s of Object.values(L)) for (const [, , dir, n] of s.dresseurs) {
  def.pnj['ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ'[n]] = { id: 'dr' + n, dir, vue: 4, ...DRESSEURS_BARRAGE[n] };
}
export default def;
