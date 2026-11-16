// testodyssee/js/musee.js — le Musée des Dunes : un bâtiment ajouté aux Dunes d'Ocre, dans le labo seulement (le vrai
// jeu n'y touche pas). Un hall et trois salles ; dans celle du fond, le Sceptre du Roi Sans Nom sous verre. La première
// fois qu'on y entre, un homme le contemple en parlant tout seul : c'est Khamsin, le chef de Sable-Noir (Tombeau du Roi
// Sans Nom). Tant que cette scène n'a pas eu lieu, l'arène de la ville est fermée ; quand on en ressort après avoir
// battu le champion, la police annonce le vol du sceptre et pose quelques questions. Ensuite : vitrine vide, policiers
// et journalistes au musée. Avancée dans les drapeaux de la partie : musee:scene, musee:champion, musee:vol.
import { room } from '../../odyssee/js/world/interiors.js';
import { T, walkable } from '../../odyssee/js/world/tiles.js';

export const MUSEE = 'labo:musee';
const W = 31, H = 22, ROI = { x0: 11, x1: 19, y1: 8 }, VITRINE = [15, 3];
const dire = (...t) => ({ use: (api) => api.game.ui.say(t) });
const apres = (f) => !!f['musee:vol'], avant = (f) => !f['musee:vol'];

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

/** construit le musée et l'installe en ville ; renvoie le lieu à proposer dans la liste (ou null) */
export function construireMusee(world) {
  const M = world.maps.monde, Z = M.zones.find((z) => z.town === 'dunes'); if (!Z) return null;
  let gym = null;
  for (let y = Z.y0; y <= Z.y1 && !gym; y++) for (let x = Z.x0; x <= Z.x1; x++) { const q = M.warpAt(x, y); if (q && /:gym/.test(q.map)) { gym = { x, y, map: q.map }; break; } }
  if (!gym) return null;
  const p = place(M, Z, gym, 6, 6); if (!p) return null;
  M.building('lab', p.x, p.y, { roof: 'orange', name: 'Musée des Dunes' });
  const porte = [p.x + 2, p.y + 3];
  M.sign(p.x + 4, p.y + 4, 'MUSÉE DES DUNES\nExposition : le Sceptre du Roi Sans Nom.');

  // l'intérieur : en haut trois salles (fossiles, le Roi Sans Nom, antiquités), en bas le hall
  const m = room(MUSEE, W, H, { floor: 'lab', music: 'house', wall: 'wall_mart', name: 'Musée des Dunes', exitX: 15 });
  for (let x = 1; x < W - 1; x++) if (![4, 5, 6, 14, 15, 16, 24, 25, 26].includes(x)) { m.set(x, 9, T.WALL); m.set(x, 10, T.WALL); }
  for (let y = 2; y <= 8; y++) { m.set(10, y, T.WALL); m.set(20, y, T.WALL); }
  m.outside = { map: 'monde', x: porte[0], y: porte[1] + 1, dir: 'down' };
  m.warp(m.exitX, m.exitY, m.outside);
  M.warp(porte[0], porte[1], { map: MUSEE, x: m.exitX, y: m.exitY, dir: 'up' });
  const pose = (k, x, y, ...texte) => { m.prop(k, x, y, true); if (texte.length) m.object(x, y, dire(...texte)); };
  // salle des fossiles
  pose('caverock', 2, 3, 'Un crâne de Ptéra, trouvé dans les canyons des Hauts d\'Ocre.');
  pose('caverock', 5, 3, 'Une carapace de Kabuto. Elle a cent millions d\'années, à peu de chose près.');
  pose('caverock', 8, 3, 'Une dent de Tyranocif, plus longue que ton bras.');
  pose('books', 2, 7, 'Des carnets de fouilles. L\'écriture est illisible.');
  pose('plant', 8, 7);
  // salle des antiquités du désert
  pose('vase', 22, 3, 'Une jarre à grain du temps des caravanes.');
  pose('vase', 25, 3, 'Un vase peint : des silhouettes portent un roi sans visage.');
  pose('vase', 28, 3, 'Une urne scellée. Une étiquette dit : « Ne pas ouvrir. »');
  pose('statue', 22, 7, 'Une statue de gardien. Ses yeux ont été martelés.');
  pose('statue', 28, 7, 'Une statue de gardien. Elle tient une lance brisée.');
  // salle du Roi Sans Nom : la vitrine au fond, deux rangées de colonnes
  m.prop('vitrine', ...VITRINE, true);
  m.object(...VITRINE, { use: (api) => api.game.ui.say(api.game.state.flags['musee:vol']
    ? ['La vitrine est vide. Le verre n\'a même pas été brisé.']
    : ['Le Sceptre du Roi Sans Nom. Or et turquoise, cinq mille ans.', 'Une plaque : « Trouvé dans les dunes par une caravane. Nul ne sait où repose son roi. »']) });
  for (const x of [11, 12, 13, 17, 18, 19]) m.prop('colonne', x, 6, true);
  pose('painting', 12, 2); pose('painting', 18, 2);
  // le hall
  pose('plant', 1, 11); pose('plant', 29, 11); pose('plant', 1, 20); pose('plant', 29, 20);
  pose('table', 9, 15); pose('table', 21, 15);
  m.npc({ id: 'musee:guichet', x: 12, y: 19, dir: 'right', sprite: 'vendeur', talk: (api) => api.game.ui.say(api.game.state.flags['musee:vol']
    ? ['C\'est une catastrophe... Trente ans de maison, et on nous vole sous mon nez !', 'Je n\'ai rien vu. Personne n\'a rien vu.']
    : ['Bienvenue au Musée des Dunes ! L\'entrée est libre aujourd\'hui.', 'Ne manquez pas le Sceptre du Roi Sans Nom, dans la salle du fond.'], { speaker: 'Guichetier' }) });
  m.npc({ id: 'musee:visiteur1', x: 5, y: 5, dir: 'up', sprite: 'savant', when: avant, text: ['Regarde-moi ces mâchoires... Et dire que ça volait.'] });
  m.npc({ id: 'musee:visiteur2', x: 25, y: 5, dir: 'up', sprite: 'dame', when: avant, text: ['Tous ces vases montrent un roi sans visage. On dirait qu\'on a voulu l\'oublier.'] });
  m.npc({ id: 'musee:visiteur3', x: 20, y: 14, dir: 'down', sprite: 'enfant', when: avant, text: ['Papa dit que le sceptre vaut plus cher que toute la ville !'] });
  // Khamsin, devant la vitrine
  m.npc({ id: 'musee:khamsin', x: 15, y: 4, dir: 'up', sprite: 'nox', when: (f) => !f['musee:scene'], text: ['...'] });
  // après le vol : la salle est bouclée, le hall est plein de policiers et de journalistes
  const pol = (id, x, y, dir, ...t) => m.npc({ id: 'musee:' + id, x, y, dir, sprite: 'garde', when: apres, talk: (api) => api.game.ui.say(t, { speaker: 'Policier' }) });
  pol('cordon1', 14, 6, 'down', 'Zone bouclée. On ne passe pas.');
  pol('cordon2', 15, 6, 'down', 'Personne n\'approche de la vitrine tant que les relevés ne sont pas finis.');
  pol('cordon3', 16, 6, 'down', 'Circulez, il n\'y a rien à voir. Enfin... plus rien.');
  pol('hall1', 8, 13, 'right', 'Aucune trace d\'effraction. Le voleur avait une clé, ou alors c\'est un magicien.');
  pol('hall2', 22, 13, 'left', 'On a interrogé tous les visiteurs de la journée. Vous y êtes passé, vous aussi.');
  pol('hall3', 15, 12, 'down', 'La salle du fond est ouverte, mais restez derrière mes collègues.');
  pol('hall4', 26, 18, 'left', 'Le guichetier ne se souvient que d\'un homme en noir. Très bavard, paraît-il.');
  const jou = (id, x, y, dir, sprite, ...t) => m.npc({ id: 'musee:' + id, x, y, dir, sprite, when: apres, talk: (api) => api.game.ui.say(t, { speaker: 'Journaliste' }) });
  jou('jou1', 10, 17, 'up', 'topdresseuse', '« Le sceptre du pharaon envolé en plein jour » : ça, c\'est un titre !');
  jou('jou2', 19, 16, 'up', 'facteur', 'Vous étiez là ce matin ? Un mot pour la Gazette des Dunes ?', '... Non ? Tant pis.');
  jou('jou3', 13, 13, 'right', 'habitante', 'Inspecteur ! Est-il vrai que le musée n\'avait qu\'un seul gardien ?');
  m.zone(0, 0, W - 1, H - 1, { name: 'Musée des Dunes', music: 'house' });
  world.maps[MUSEE] = m;

  // en ville : un garde devant l'arène tant que la scène n'a pas eu lieu, et les deux policiers de la sortie
  const gx = walkable(M.get(gym.x - 1, gym.y + 1)) ? gym.x - 1 : gym.x + 2;
  M.npc({ id: 'musee:garde', x: gx, y: gym.y + 1, dir: 'down', sprite: 'garde', when: (f) => !f['musee:scene'], talk: (api) => api.game.ui.say(FERMEE, { speaker: 'Garde' }) });
  for (const i of [0, 1]) M.npc({ id: 'musee:police' + i, x: gym.x + i, y: gym.y + 6, dir: 'up', sprite: 'garde', when: (f) => f['musee:police'] === 1, text: ['...'] });
  world.musee = { gym, porte };
  return { nom: 'Musée des Dunes', note: 'Dunes d\'Ocre · la scène du sceptre', map: 'monde', x: porte[0], y: porte[1] + 2, dir: 'up', equipe: 'fin100' };
}
const FERMEE = ['L\'arène est fermée pour le moment.', 'Gaspard est parti voir la nouvelle exposition du musée. Le Sceptre du Roi Sans Nom, tu connais ?', 'Va y faire un tour. Il sera rentré d\'ici là.'];

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

/** les scènes, branchées sur le jeu du labo (jeu.js) */
export class Musee {
  constructor(game) { this.game = game; }
  get f() { return this.game.state.flags; }
  get lieu() { return this.game.world.musee; }
  pnj(id) { return this.game.npcs.find((n) => n.id === 'musee:' + id); }
  /** l'arène reste fermée tant qu'on n'a pas vu l'homme du musée */
  async bloque(to) {
    const L = this.lieu, g = this.game;
    if (!L || !g.state || to?.map !== L.gym.map || this.f['musee:scene'] || g.mapObj?.id !== 'monde') return false;
    await g.ui.say(FERMEE, { speaker: 'Garde' });
    return true;
  }
  /** avant d'entrer au musée : la vitrine est pleine ou vide */
  avantWarp(to) {
    const g = this.game; if (to?.map !== MUSEE || !g.state) return;
    const d = g.world.maps[MUSEE].deco.find((q) => q.x === VITRINE[0] && q.y === VITRINE[1]);
    if (d) d.k = this.f['musee:vol'] ? 'vitrine_vide' : 'vitrine';
  }
  championBattu() { if (this.lieu && this.game.mapObj?.id.startsWith(this.lieu.gym.map)) this.f['musee:champion'] = true; }
  /** en sortant de l'arène après la victoire : la police */
  async apresWarp(de, to) {
    const L = this.lieu, g = this.game;
    if (!L || !g.state || !de?.startsWith(L.gym.map) || to?.map !== 'monde' || !this.f['musee:champion'] || this.f['musee:vol']) return;
    await this.police();
  }
  /** en entrant dans la salle du Roi Sans Nom */
  async apresPas() {
    const g = this.game, p = g.player;
    if (g.busy || g.mapObj?.id !== MUSEE || this.f['musee:scene'] || p.y > ROI.y1 || p.x < ROI.x0 || p.x > ROI.x1) return;
    g.busy = true;
    try { await this.scene(); } finally { g.busy = false; }
  }
  async scene() {
    const g = this.game, ui = g.ui, p = g.player, n = this.pnj('khamsin'), qui = { speaker: '???' };
    p.dir = 'up';
    await attendre(500);
    await ui.say(['... Cinq mille ans. Cinq mille ans qu\'il attend.', 'Et ils l\'ont mis sous verre, comme un bibelot de foire...', 'Patience. Bientôt, le trésor sera mien. Tout le trésor.'], qui);
    if (n) { n.bang = true; g.sound.sfx('bang'); await attendre(650); n.bang = false; n.dir = 'down'; }
    await ui.say(['... Oh. Je ne t\'avais pas entendu entrer.', 'Tu admires le sceptre ? Tu as bien raison.',
      'Il appartenait à un pharaon qui régnait sur ces dunes il y a cinq mille ans.',
      'Un roi si puissant qu\'après sa mort, on a effacé son nom de toutes les pierres. Par peur de le prononcer.',
      'On l\'appelle le Roi Sans Nom. Son tombeau dort quelque part sous le sable, et personne n\'en a jamais trouvé la sépulture.',
      'Ce sceptre est tout ce qu\'il nous reste de lui. Tu as de la chance de pouvoir admirer une telle merveille, petit.',
      'Profites-en... tant qu\'elle est là.'], qui);
    // il sort, en passant à côté du joueur
    if (n) {
      const cote = p.x <= 14 ? 'right' : 'left';
      if (p.x === 15 || (cote === 'right' && p.x !== 16) || (cote === 'left' && p.x !== 14)) { await g.npcWalk(n, cote, 1); await g.npcWalk(n, 'down', 6); }
    }
    this.f['musee:scene'] = true;
    g.refreshNpcs();
    await ui.say('L\'homme en noir quitte le musée sans se retourner.');
  }
  async police() {
    const g = this.game, ui = g.ui, p = g.player, qui = { speaker: 'Policier' };
    g.busy = true;
    try {
      this.f['musee:police'] = 1; g.refreshNpcs();
      const A = this.pnj('police0'), B = this.pnj('police1');
      p.dir = 'down';
      g.sound.sfx('bang');
      // ils remontent la rue jusqu'au joueur
      const monte = async (n) => { if (!n) return; const pas = n.y - (p.y + 1); if (pas > 0) await g.npcWalk(n, 'up', pas); n.dir = 'up'; };
      await Promise.all([monte(A), monte(B)]);
      await ui.say(['Police des Dunes ! Ne bougez pas, s\'il vous plaît.', 'Le Sceptre du Roi Sans Nom vient d\'être volé au musée. En plein jour, sous le nez du gardien.',
        'Nous interrogeons tous ceux qui ont vu l\'exposition aujourd\'hui. Et vous y étiez.'], qui);
      const q = async (question, oui, non) => { const r = await ui.yesNo(question, qui); await ui.say(r ? oui : non, qui); };
      await q('Vous êtes bien passé au musée aujourd\'hui ?', 'C\'est ce que dit le guichetier.', 'Le guichetier vous a pourtant reconnu. Passons.');
      await q('Avez-vous remarqué quelqu\'un d\'étrange devant la vitrine ?', ['Un homme en noir, qui parlait tout seul ? Et qui vous a fait un cours d\'histoire ?', 'Notez ça, collègue.'], 'Dommage. Si quelque chose vous revient, venez nous trouver.');
      await q('Et à l\'heure du vol, vous étiez dans l\'arène ?', 'Le champion Gaspard le confirmera. Vous êtes hors de cause.', 'On vient pourtant de vous en voir sortir. Passons.');
      await ui.say(['Merci de votre aide. Le musée reste ouvert, mais la salle du sceptre est bouclée.', 'Bonne journée.'], qui);
      await Promise.all([A, B].filter(Boolean).map((n) => g.npcWalk(n, 'down', 4)));
      this.f['musee:police'] = 2; this.f['musee:vol'] = true;
      g.refreshNpcs();
    } finally { g.busy = false; }
  }
}
