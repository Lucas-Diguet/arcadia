// testodyssee/js/musee.js — le Musée des Dunes : un bâtiment ajouté aux Dunes d'Ocre, dans le labo seulement (le vrai
// jeu n'y touche pas). Un musée à l'antique, tout en longueur : un hall, puis trois galeries (fossiles, caravanes, écrits)
// et, tout au bout à droite, la salle du Roi Sans Nom où le sceptre est exposé sous verre. Chaque salle est une carte ;
// on passe de l'une à l'autre par les ouvertures des murs de côté. La première fois qu'on entre dans la dernière salle,
// un homme contemple le sceptre : c'est Khamsin, le chef de Sable-Noir (Tombeau du Roi Sans Nom). Tant que cette scène
// n'a pas eu lieu, le champion de l'arène est au musée (le guide le dit en entrant) ; quand on ressort de l'arène après
// l'avoir battu, deux policiers qui discutent devant la porte posent quelques questions. Ensuite : vitrine vide,
// policiers et journalistes au musée. Avancée dans les drapeaux de la partie : musee:scene, musee:champion, musee:vol.
import { room } from '../../odyssee/js/world/interiors.js';
import { T, walkable } from '../../odyssee/js/world/tiles.js';
import { SPECIES } from '../../odyssee/js/data/species.js';

export const MUSEE = 'labo:musee';
const dire = (...t) => ({ use: (api) => api.game.ui.say(t) });
const apres = (f) => !!f['musee:vol'], avant = (f) => !f['musee:vol'];
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

// les salles, de gauche à droite ; on passe de l'une à l'autre par deux cases ouvertes dans le mur de côté (3e et 4e
// rangées en partant du bas)
const SALLES = [
  { id: MUSEE, nom: 'Musée des Dunes', w: 18, h: 11 },
  { id: MUSEE + ':fossiles', nom: 'Galerie des Fossiles', w: 34, h: 9 },
  { id: MUSEE + ':caravanes', nom: 'Galerie des Caravanes', w: 30, h: 9 },
  { id: MUSEE + ':ecrits', nom: 'Salle des Écrits', w: 24, h: 9 },
  { id: MUSEE + ':roi', nom: 'Salle du Roi Sans Nom', w: 22, h: 11 },
];
export const SALLE_ROI = MUSEE + ':roi', SALLE_FOSSILES = MUSEE + ':fossiles';
const VITRINE = [15, 4], KHAMSIN = [15, 5];
// les statues de Pokémon fossiles, sur leur socle contre le mur du fond de la galerie
const FOSSILES = [[142, 4], [141, 8], [139, 12], [409, 16], [567, 20], [565, 24], [697, 28], [699, 31]];

/** un rectangle de sable libre dans la ville, au plus près de l'arène */
function place(M, Z, gym, w, h) {
  const pris = new Set([...M.deco.map((d) => d.x + ',' + d.y), ...M.npcs.map((n) => n.x + ',' + n.y)]);
  let mieux = null;
  for (let y = Z.y0 + 2; y + h < Z.y1 - 2; y++) for (let x = Z.x0 + 2; x + w < Z.x1 - 2; x++) {
    let ok = true;
    for (let j = -1; j <= h && ok; j++) for (let i = -1; i <= w && ok; i++) { const t = M.get(x + i, y + j); if (t !== T.SAND || pris.has((x + i) + ',' + (y + j)) || M.warpAt(x + i, y + j)) ok = false; }
    if (!ok) continue;
    const dist = Math.abs(x + w / 2 - gym.x) + Math.abs(y + h / 2 - gym.y);
    if (!mieux || dist < mieux.dist) mieux = { x, y, dist };
  }
  return mieux;
}

/** deux salles voisines : une ouverture de deux cases dans le mur de droite de A, l'autre dans le mur de gauche de B */
function relier(A, B) {
  for (const i of [0, 1]) {
    const ya = A.h - 4 + i, yb = B.h - 4 + i;
    A.set(A.w - 1, ya, T.FLOOR); A.warp(A.w - 1, ya, { map: B.id, x: 1, y: yb, dir: 'right', step: true });
    B.set(0, yb, T.FLOOR); B.warp(0, yb, { map: A.id, x: A.w - 2, y: ya, dir: 'left', step: true });
  }
  // deux colonnes encadrent chaque passage
  A.prop('colonne', A.w - 2, A.h - 5, true); B.prop('colonne', 1, B.h - 5, true);
}

/** construit le musée et l'installe en ville ; renvoie le lieu à proposer dans la liste (ou null) */
export function construireMusee(world) {
  const M = world.maps.monde, Z = M.zones.find((z) => z.town === 'dunes'); if (!Z) return null;
  let gym = null;
  for (let y = Z.y0; y <= Z.y1 && !gym; y++) for (let x = Z.x0; x <= Z.x1; x++) { const q = M.warpAt(x, y); if (q && /:gym/.test(q.map)) { gym = { x, y, map: q.map }; break; } }
  if (!gym) return null;
  const p = place(M, Z, gym, 6, 6); if (!p) return null;
  M.building('lab', p.x, p.y, { roof: 'orange', name: 'Musée des Dunes' });
  const porte = [p.x + 2, p.y + 3];
  M.sign(p.x + 4, p.y + 4, 'MUSÉE DES DUNES\nFossiles, caravanes, écrits anciens.\nEt le Sceptre du Roi Sans Nom.');

  const cartes = SALLES.map((s, i) => {
    const m = room(s.id, s.w, s.h, { floor: 'musee', music: 'house', wall: 'wall_antique', name: s.nom, exitX: i ? 1 : 9 });
    if (i) m.set(m.exitX, m.exitY, T.FLOOR);   // seul le hall a une porte vers la rue
    m.zone(0, 0, s.w - 1, s.h - 1, { name: s.nom, music: 'house' });
    world.maps[s.id] = m;
    return m;
  });
  for (let i = 0; i + 1 < cartes.length; i++) relier(cartes[i], cartes[i + 1]);
  const [hall, fos, car, ecr, roi] = cartes;
  hall.outside = { map: 'monde', x: porte[0], y: porte[1] + 1, dir: 'down' };
  hall.warp(hall.exitX, hall.exitY, hall.outside);
  M.warp(porte[0], porte[1], { map: MUSEE, x: hall.exitX, y: hall.exitY, dir: 'up' });
  const pose = (m, k, x, y, ...texte) => { m.prop(k, x, y, true); if (texte.length) m.object(x, y, dire(...texte)); };
  const colonnes = (m, xs, y) => { for (const x of xs) m.prop('colonne', x, y, true); };

  // le hall : colonnade, deux sphinx de pierre, le guichet
  colonnes(hall, [2, 5, 12, 15], 3);
  pose(hall, 'statue', 7, 2, 'Un gardien de pierre à tête de lion. Il garde l\'entrée depuis l\'ouverture du musée.');
  pose(hall, 'statue', 10, 2, 'Son jumeau. Quelqu\'un a posé un chapeau sur sa tête, un jour. Le chapeau est exposé à côté.');
  pose(hall, 'vase', 2, 9, 'Une grande jarre peinte de caravanes.'); pose(hall, 'vase', 15, 9);
  pose(hall, 'table', 4, 6);
  hall.sign(12, 9, 'PLAN DU MUSÉE\n→ Galerie des Fossiles\n→ Galerie des Caravanes\n→ Salle des Écrits\n→ Salle du Roi Sans Nom (tout au bout)');
  hall.npc({ id: 'musee:guichet', x: 4, y: 5, dir: 'down', sprite: 'vendeur', talk: (api) => api.game.ui.say(api.game.state.flags['musee:vol']
    ? ['C\'est une catastrophe... Trente ans de maison, et on nous vole sous mon nez !', 'Je n\'ai rien vu. Personne n\'a rien vu.']
    : ['Bienvenue au Musée des Dunes ! L\'entrée est libre aujourd\'hui.', 'La visite se fait de gauche à droite. Notre pièce maîtresse vous attend tout au bout : le Sceptre du Roi Sans Nom.'], { speaker: 'Guichetier' }) });
  hall.npc({ id: 'musee:visiteur3', x: 11, y: 6, dir: 'up', sprite: 'enfant', when: avant, text: ['Papa dit que le sceptre vaut plus cher que toute la ville !'] });

  // la galerie des fossiles : huit statues de Pokémon fossiles sur leur socle, des fossiles dans des vitrines basses
  for (const [sp, x] of FOSSILES) {
    fos.prop('socle_statue', x, 3, true);
    fos.object(x, 3, dire(`Une statue de ${SPECIES[sp]?.n || 'Pokémon'}, sculptée d'après un fossile retrouvé dans les canyons des Hauts d'Ocre.`));
  }
  pose(fos, 'caverock', 6, 7, 'Un crâne de Ptéra. Il a cent millions d\'années, à peu de chose près.');
  pose(fos, 'caverock', 14, 7, 'Une carapace de Kabuto, fendue en deux.');
  pose(fos, 'caverock', 22, 7, 'Une coquille d\'Amonite, grande comme une roue de charrette.');
  pose(fos, 'caverock', 29, 7, 'Un crâne de Kranidos. Son front est aussi dur que la pierre qui l\'entoure.');
  fos.npc({ id: 'musee:visiteur1', x: 17, y: 5, dir: 'up', sprite: 'savant', when: avant, text: ['Regarde-moi ces mâchoires... Et dire que ça volait.'] });

  // la galerie des caravanes : jarres, statues de gardiens, un obélisque, le cercueil d'un scribe
  colonnes(car, [5, 11, 17, 23], 2);
  pose(car, 'vase', 3, 3, 'Une jarre à grain du temps des caravanes.');
  pose(car, 'vase', 8, 3, 'Un vase peint : des silhouettes portent un roi sans visage.');
  pose(car, 'statue', 14, 3, 'Une statue de gardien. Ses yeux ont été martelés.');
  pose(car, 'obelisque', 20, 3, 'Un obélisque couvert d\'écritures. Un nom y a été gratté, partout où il apparaissait.');
  pose(car, 'statue', 26, 3, 'Une statue de gardien. Elle tient une lance brisée.');
  pose(car, 'sarcophage_vide', 9, 7, 'Le cercueil d\'un scribe. Vide : les archéologues ont emporté ce qu\'il y avait dedans, il y a longtemps.');
  pose(car, 'vase', 20, 7, 'Une urne scellée. Une étiquette dit : « Ne pas ouvrir. »');
  car.npc({ id: 'musee:visiteur2', x: 15, y: 5, dir: 'up', sprite: 'dame', when: avant, text: ['Tous ces vases montrent un roi sans visage. On dirait qu\'on a voulu l\'oublier.'] });

  // la salle des écrits : bibliothèques, tables de papyrus
  for (const x of [3, 4, 8, 9, 14, 15, 19, 20]) pose(ecr, 'books', x, 2);
  ecr.object(3, 2, dire('Des carnets de fouilles. L\'écriture est illisible.'));
  ecr.object(14, 2, dire('Des rouleaux de papyrus, rangés par siècle. Ça fait beaucoup de siècles.'));
  pose(ecr, 'table', 6, 5, 'Un papyrus déroulé : la liste des rois des dunes. Il manque un nom, au milieu. La place est restée vide.');
  pose(ecr, 'table', 12, 5, 'Une carte des routes des caravanes, dessinée sur une peau de Tauros.');
  pose(ecr, 'table', 18, 5, 'Une tablette d\'argile. Le guide dit que c\'est une facture. Cinq mille ans plus tard, elle n\'est toujours pas payée.');

  // la salle du Roi Sans Nom : la vitrine au fond, des colonnes, deux gardiens ; rangées 2 et 3 dégagées (Khamsin y passe)
  roi.prop('vitrine', ...VITRINE, true);
  roi.object(...VITRINE, { use: (api) => api.game.ui.say(api.game.state.flags['musee:vol']
    ? ['La vitrine est vide. Le verre n\'a même pas été brisé.']
    : ['Le Sceptre du Roi Sans Nom. Or et turquoise, cinq mille ans.', 'Une plaque : « Prêté par les moines du Tombeau du Roi Sans Nom, gardiens de sa sépulture. »']) });
  colonnes(roi, [11, 19], 5); colonnes(roi, [11, 19], 9);
  pose(roi, 'statue', 18, 3, 'Un gardien de pierre, la main tendue vers la vitrine.');
  pose(roi, 'statue', 20, 3, 'Un autre gardien. Ses yeux ont été martelés, comme ceux de la galerie.');
  pose(roi, 'brasero', 6, 9); pose(roi, 'brasero', 15, 9);
  roi.npc({ id: 'musee:khamsin', x: KHAMSIN[0], y: KHAMSIN[1], dir: 'up', sprite: 'nox', when: (f) => !f['musee:scene'], text: ['...'] });

  // après le vol : la salle du sceptre bouclée, le hall plein de policiers et de journalistes
  const pol = (m, id, x, y, dir, ...t) => m.npc({ id: 'musee:' + id, x, y, dir, sprite: 'garde', when: apres, talk: (api) => api.game.ui.say(t, { speaker: 'Policier' }) });
  pol(roi, 'cordon1', 14, 5, 'down', 'Zone bouclée. On ne passe pas.');
  pol(roi, 'cordon2', 15, 5, 'down', 'Personne n\'approche de la vitrine tant que les relevés ne sont pas finis.');
  pol(roi, 'cordon3', 16, 5, 'down', 'Circulez, il n\'y a rien à voir. Enfin... plus rien.');
  pol(hall, 'hall1', 7, 5, 'right', 'Aucune trace d\'effraction. Le voleur avait une clé, ou alors c\'est un magicien.');
  pol(hall, 'hall2', 13, 5, 'left', 'On a interrogé tous les visiteurs de la journée. Vous y êtes passé, vous aussi.');
  pol(hall, 'hall3', 15, 7, 'left', 'La salle du fond est ouverte, mais restez derrière mes collègues.');
  pol(hall, 'hall4', 9, 4, 'down', 'Le guichetier ne se souvient de personne en particulier. Un voleur discret... ou un visiteur au-dessus de tout soupçon.');
  const jou = (id, x, y, dir, sprite, ...t) => hall.npc({ id: 'musee:' + id, x, y, dir, sprite, when: apres, talk: (api) => api.game.ui.say(t, { speaker: 'Journaliste' }) });
  jou('jou1', 6, 8, 'up', 'topdresseuse', '« Une relique inestimable envolée en plein jour » : ça, c\'est un titre !');
  jou('jou2', 11, 8, 'up', 'facteur', 'Vous étiez là ce matin ? Un mot pour la Gazette des Dunes ?', '... Non ? Tant pis.');
  jou('jou3', 14, 6, 'left', 'habitante', 'Inspecteur ! Est-il vrai que le musée n\'avait qu\'un seul gardien ?');

  // l'arène : tant que la scène du musée n'a pas eu lieu, le champion n'est pas là
  const G = world.maps[gym.map], chef = G?.npcs.find((n) => /:leader$/.test(n.id));
  if (chef) { const w0 = chef.when; chef.when = (f) => !!f['musee:scene'] && (!w0 || w0(f)); }
  // en ville : les deux policiers discutent devant l'arène pendant qu'on affronte le champion
  const libre = (x, y) => walkable(M.get(x, y)) && !M.warpAt(x, y) && !M.npcs.some((n) => n.x === x && n.y === y);
  let py = gym.y + 3; while (py < gym.y + 7 && !(libre(gym.x - 1, py) && libre(gym.x + 1, py))) py++;
  M.npc({ id: 'musee:police0', x: gym.x - 1, y: py, dir: 'right', sprite: 'garde', when: (f) => !!f['musee:champion'] && !f['musee:vol'], text: ['...'] });
  M.npc({ id: 'musee:police1', x: gym.x + 1, y: py, dir: 'left', sprite: 'garde', when: (f) => !!f['musee:champion'] && !f['musee:vol'], text: ['...'] });
  world.musee = { gym, porte };
  return { nom: 'Musée des Dunes', note: 'Dunes d\'Ocre · la scène du sceptre', map: 'monde', x: porte[0], y: porte[1] + 2, dir: 'up', equipe: 'fin100' };
}

/** les scènes, branchées sur le jeu du labo (jeu.js) */
export class Musee {
  constructor(game) { this.game = game; this.imgStatues = {}; }
  get f() { return this.game.state.flags; }
  get lieu() { return this.game.world.musee; }
  pnj(id) { return this.game.npcs.find((n) => n.id === 'musee:' + id); }
  /** en entrant dans l'arène avant la scène : le guide dit que le champion n'est pas là (pas de défi) */
  async championAbsent() {
    const L = this.lieu, g = this.game;
    if (!L || !g.state || g.mapObj?.id !== L.gym.map || this.f['musee:scene']) return false;
    const n = g.npcs.find((q) => q.def?.script === 'gymguide');
    if (n) { const dx = g.player.x - n.x, dy = g.player.y - n.y; n.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down'); }
    await g.ui.say(['Yo ! Tu viens défier le champion ?', 'Pas de chance : Gaspard n\'est pas là. Il est parti voir la nouvelle exposition du Musée des Dunes.',
      'Repasse un peu plus tard, il ne devrait plus tarder !'], { speaker: 'Guide' });
    return true;
  }
  /** avant d'entrer dans la salle du sceptre : la vitrine est pleine ou vide */
  avantWarp(to) {
    const g = this.game; if (to?.map !== SALLE_ROI || !g.state) return;
    const d = g.world.maps[SALLE_ROI].deco.find((q) => q.x === VITRINE[0] && q.y === VITRINE[1]);
    if (d) d.k = this.f['musee:vol'] ? 'vitrine_vide' : 'vitrine';
  }
  championBattu() { if (this.lieu && this.game.mapObj?.id.startsWith(this.lieu.gym.map)) this.f['musee:champion'] = true; }
  /** en sortant de l'arène après la victoire : la police */
  async apresWarp(de, to) {
    const L = this.lieu, g = this.game;
    if (!L || !g.state || !de?.startsWith(L.gym.map) || to?.map !== 'monde' || !this.f['musee:champion'] || this.f['musee:vol']) return;
    await this.police();
  }
  /** quelques pas dans la salle du Roi Sans Nom : la scène */
  async apresPas() {
    const g = this.game, p = g.player;
    if (g.busy || g.mapObj?.id !== SALLE_ROI || this.f['musee:scene'] || p.x < 6) return;
    g.busy = true;
    try { await this.scene(); } finally { g.busy = false; }
  }
  /** à chaque image : les statues de la galerie des fossiles (l'image du Pokémon, en pierre, sur son socle) */
  tick() {
    const g = this.game; if (!g.state || g.mapObj?.id !== SALLE_FOSSILES) return;
    for (const [sp, x] of FOSSILES) this.statue(`musee:statue:${sp}`, sp, x, 3);
  }
  statue(id, sp, x, y) {
    const v = this.game.view;
    if (v.actors.has(id)) return;
    const im = this.imgStatues[sp];
    if (im === undefined) {
      this.imgStatues[sp] = null;
      // (assets.js ne se charge que dans le navigateur : les tests construisent le musée sans lui)
      import('../../odyssee/js/assets.js').then(({ ASSETS, loadImg }) => loadImg(ASSETS.front(sp))).then((src) => {
        if (!src) return;
        const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
        const ctx = c.getContext('2d'); ctx.filter = 'sepia(0.6) grayscale(0.5) brightness(1.1) contrast(0.9)'; ctx.drawImage(src, 0, 0);
        this.imgStatues[sp] = c;
      });
      return;
    }
    if (!im) return;
    v.place(v.imageActor(id, im, 0.7), x, y, 0.32);
  }
  async scene() {
    const g = this.game, ui = g.ui, p = g.player, n = this.pnj('khamsin'), qui = { speaker: '???' };
    p.dir = 'right';
    await attendre(500);
    await ui.say(['... Cinq mille ans.', 'Cinq mille ans, et il brille encore comme au premier jour...', 'Et ils l\'ont posé sous verre, entre deux cordons. Comme un bibelot de foire.'], qui);
    if (n) { n.bang = true; g.sound.sfx('bang'); await attendre(650); n.bang = false; n.dir = 'left'; }
    await ui.say(['... Oh. Je ne t\'avais pas entendu entrer.', 'Tu admires le sceptre ? Tu as bien raison.',
      'Il appartenait à un pharaon qui régnait sur ces dunes il y a cinq mille ans.',
      'Un roi si puissant qu\'après sa mort, on a effacé son nom de toutes les pierres. Par peur de le prononcer.',
      'On dit qu\'il avait amassé une fortune inestimable...', '... et qu\'il avait caché son plus grand trésor dans son propre cercueil.',
      'Des histoires de vieux conteurs, sans doute.', 'Allez, je te laisse admirer. Bonne visite, petit.'], qui);
    // il s'en va vers l'entrée, par le fond de la salle (rangée 2 ou 3, celle où le joueur n'est pas)
    if (n) {
      const r = p.y === 3 ? 2 : 3;
      await g.npcWalk(n, 'left', 1); await g.npcWalk(n, 'up', KHAMSIN[1] - r);
      await g.npcWalk(n, 'left', n.x - 2); await g.npcWalk(n, 'down', 8 - r); await g.npcWalk(n, 'left', 2);
    }
    this.f['musee:scene'] = true;
    g.refreshNpcs();
    await ui.say('L\'homme s\'éloigne sans se retourner.');
  }
  async police() {
    const g = this.game, ui = g.ui, p = g.player, A = this.pnj('police0'), B = this.pnj('police1');
    const a = { speaker: 'Policier' }, b = { speaker: 'Policière' };
    g.busy = true;
    try {
      p.dir = 'down';
      await attendre(400);
      await ui.say('Trois salles fouillées, et pas une seule trace...', a);
      await ui.say('Pas d\'effraction, pas de témoin. Le commissaire va adorer.', b);
      await ui.say('Et la presse est déjà sur place. Quelle journée.', a);
      for (const n of [A, B]) if (n) { n.bang = true; n.dir = 'up'; }
      g.sound.sfx('bang'); await attendre(600);
      for (const n of [A, B]) if (n) n.bang = false;
      await ui.say(['Pardon ! Police des Dunes. Vous avez une minute ?', 'Une relique inestimable a été volée au Musée des Dunes, il y a moins d\'une heure.',
        'Nous parlons à tous ceux qui l\'ont visité aujourd\'hui.'], a);
      const q = async (question, oui, non, qui = a) => { const r = await ui.yesNo(question, qui); await ui.say(r ? oui : non, qui); };
      await q('Vous êtes passé au musée aujourd\'hui ?', 'C\'est ce que dit le guichetier.', 'Le guichetier vous a pourtant reconnu. Passons.');
      await q('Quelqu\'un vous a-t-il parlé longuement d\'une des pièces exposées ?', ['Intéressant... Il vous a dit son nom ?', '... Non, évidemment. Notez quand même, collègue.'], 'Bien.', b);
      await q('Et depuis, vous étiez dans l\'arène, sans en sortir ?', 'Le champion pourra le confirmer. Merci.', 'On vous en a pourtant vu sortir à l\'instant. Passons.');
      await ui.say(['Merci pour votre aide.', 'Le musée reste ouvert, mais une salle est bouclée. Bonne journée.'], a);
      await Promise.all([A, B].filter(Boolean).map((n) => g.npcWalk(n, 'down', 4)));
      this.f['musee:vol'] = true;
      g.refreshNpcs();
    } finally { g.busy = false; }
  }
}
