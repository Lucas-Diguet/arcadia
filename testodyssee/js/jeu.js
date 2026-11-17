// testodyssee/js/jeu.js — le jeu d'Odyssée, en version labo : rien n'est sauvegardé (la vraie partie d'Odyssée
// n'est jamais touchée) et le menu propose de changer de lieu.
import { Game } from '../../odyssee/js/game.js';
import { BattleView } from '../../odyssee/js/ui/battleView.js';
import { ASSETS } from '../../odyssee/js/assets.js';
import { dissiperIllusion } from './combat/regles.js';

// l'écran de combat rejoue la fin d'une Illusion : le déguisement tombe, le vrai Pokémon apparaît
{
  const jouer = BattleView.prototype.play;
  BattleView.prototype.play = async function (evs) {
    let lot = [];
    for (const e of evs) {
      if (e.t !== 'illusion') { lot.push(e); continue; }
      if (lot.length) { await jouer.call(this, lot); lot = []; }
      const m = this.battle.act(e.side), o = e.side === 1 ? this.st.foe : this.st.me;
      if (!dissiperIllusion(m)) continue;
      await this.tween(260, (u) => { o.white = u; });
      await this.loadSide(e.side); this.setHud(e.side, m);
      await this.tween(260, (u) => { o.white = 1 - u; }); o.white = 0;
      this.sound.cry(ASSETS.cry(m.sp));
    }
    if (lot.length) await jouer.call(this, lot);
  };
}
import { T, DIRS, walkable } from '../../odyssee/js/world/tiles.js';
import { partyScreen, dexScreen, mapScreen, optionsScreen } from '../../odyssee/js/ui/screens.js';
import { ILE } from './ile/modele.js';
import { pasCascade } from './cascade.js';

const CLE_TEST = 'testodyssee-mode-test';
const CLE_RENCONTRES = 'testodyssee-sans-rencontres', CLE_MURS = 'testodyssee-traverser-murs';
const lire = (k) => { try { return localStorage.getItem(k) === '1'; } catch (e) { return false; } };
const garder = (k, v) => { try { localStorage.setItem(k, v ? '1' : '0'); } catch (e) {} };

export class TestGame extends Game {
  constructor(...a) {
    super(...a);
    // pas d'ambiance de grotte d'Odyssée (chauves-souris, cristaux qui scintillent, poussière, gouttes) dans les donjons du labo
    const v = this.vie, grotte = v.grotteAmbiance.bind(v);
    v.grotteAmbiance = (on) => grotte(on && !this.mapObj?.donjon);
  }
  save() { return true; }

  /** mode test : on entre seul partout (dalles, portes des voies) et on peut passer les combats */
  get modeTest() { if (this._modeTest == null) { try { this._modeTest = localStorage.getItem(CLE_TEST) === '1' || new URLSearchParams(location.search).has('test'); } catch (e) { this._modeTest = false; } } return this._modeTest; }
  /** options du menu, gardées dans ce navigateur : sans Pokémon sauvages (lu par Odyssée et les donjons du labo), traverser les murs */
  get noEnc() { return this._noEnc ??= lire(CLE_RENCONTRES); }
  set noEnc(v) { this._noEnc = !!v; garder(CLE_RENCONTRES, v); }
  get traverseMurs() { return this._murs ??= lire(CLE_MURS); }
  set traverseMurs(v) { this._murs = !!v; garder(CLE_MURS, v); }
  set modeTest(v) { this._modeTest = !!v; try { localStorage.setItem(CLE_TEST, v ? '1' : '0'); } catch (e) {} this.donjons?.majPanneau(); }

  // le labo ajoute ses propres règles de déplacement (glace, reflet) : voir donjon/miroirs.js
  tryStep(d) {
    const D = this.donjons, p = this.player;
    // option « traverser les murs » : un pas normal vers toute case de la carte, même un mur
    if (this.traverseMurs && !p.move && !p.surf) {
      const m = this.mapObj, [dx, dy] = DIRS[d], tx = p.x + dx, ty = p.y + dy;
      if (m.in(tx, ty) && (!walkable(m.get(tx, ty)) || m.height(tx, ty) !== m.height(p.x, p.y))) {
        p.dir = d; p.move = { fx: p.x, fy: p.y, tx, ty, t: 0, dur: this.autoRun || this.input.isDown('run') ? this.runDur(false) : 0.2 }; p.walking = true;
        return;
      }
    }
    if (D?.pasSpecial(d) || D?.pousser(d)) return;
    // cascades : on les remonte en surfant avec Cascade
    if (pasCascade(this, d)) return;
    // Salle de l'Horloge : pas de marche entre deux hauteurs
    if (this.horloge?.avantPas(d)) return;
    // porte d'un donjon fermée à clé ; tombeau : pas de sortie sans le pendentif, et ses porteurs ne s'approchent pas
    { const [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[d]; if (!p.move && (D?.porteACle(p.x + dx, p.y + dy) || D?.avantPasTombeau?.(p.x + dx, p.y + dy))) { p.dir = d; p.walking = false; return; } }
    const depart = [p.x, p.y], avant = p.move;
    super.tryStep(d);
    if (!avant && p.move) D?.apresDepart(d, depart);
    // la colle d'une salle d'entraînement : deux fois moins vite
    if (!avant && p.move && this.ile?.colle()) p.move.dur *= 2;
  }
  // donjon clair : fond de combat clair (Odyssée prend le fond de grotte pour toute carte de grotte)
  async runBattle(o) {
    if (this.modeTest && await this.ui.yesNo('Mode test : passer ce combat (compté comme gagné) ?')) return 'win';
    // dresseurs des chemins du Temple : battu, on se réveille à l'entrée de la salle (pas au dernier Centre)
    if (o.trainer && this.donjons?.dresseurTemple?.(o.id)) {
      const r = await this.runBattleSalle({ ...o, noWhiteout: true });
      if (r === 'lose') this.donjons.perduTemple();
      return r;
    }
    return this.runBattleSalle(o);
  }
  async runBattleSalle(o) {
    const m = this.mapObj;
    if (m?.style !== 'clair' && !m?.fondCombat) return super.runBattle(o);
    const avant = [m.floor, m.battleBg]; m.floor = 'clair'; m.battleBg = m.fondCombat || 'league';
    try { return await super.runBattle(o); } finally { [m.floor, m.battleBg] = avant; }
  }
  /** l'île privée se reconstruit à partir de la donnée du joueur quand on y arrive */
  setMap(id) {
    this.ile?.surCarte(id);
    // arènes du labo : la carte suit l'état de la salle (sens des fourmis, fils, fleurs…) avant d'être dessinée
    if (this.state) this.donjons?.syncArene?.(this.world.maps[id]);
    if (this.ile && this.state && (id === ILE || id?.startsWith(ILE + ':')) && (!this.world.maps[id] || this.ile.pour !== this.ile.cle || !this.ile.dedans())) this.ile.preparer();
    return super.setMap(id);
  }
  setTile(x, y, v) {
    // un meuble poussé (Bois des Contes) garde son dessin : il suit le rocher d'une case à l'autre
    const B = this.mapObj?.blocs, k = x + ',' + y;
    if (B) { if (v !== T.BOULDER && B.has(k)) { this._bloc = B.get(k); B.delete(k); } else if (v === T.BOULDER && this._bloc) { B.set(k, this._bloc); this._bloc = null; } }
    super.setTile(x, y, v); if (v === T.BOULDER) { this.donjons?.rocherTemple?.(x, y); this.donjons?.rocherArene?.(x, y); }
  }
  async useForce() { if (await this.donjons?.forceMeuble?.()) return; return super.useForce(); }
  async warp(to, sfx) {
    // Musée des Dunes : la vitrine pleine ou vide, la police à la sortie de l'arène
    this.musee?.avantWarp(to);
    const de = this.mapObj?.id;
    this.donjons?.remiseTemple?.(to); this.donjons?.remiseContes?.(to);
    const r = await super.warp(to, sfx);
    await this.musee?.apresWarp(de, to);
    return r;
  }
  /** Musée des Dunes : avant la scène du sceptre, le champion n'est pas dans son arène */
  async gymWelcome() { if (await this.musee?.championAbsent()) return; return super.gymWelcome(); }
  async badgeScene(l, nom) { await super.badgeScene(l, nom); this.musee?.championBattu(); }
  /** dans les donjons du labo, les capacités de terrain servent sans attendre les badges */
  /** le Talisman des Éléments (Temple des Éléments) : Coupe, Force, Éclate-Roc et Surf, sans CS ni badge */
  hasField(k) { return (['coupe', 'force', 'eclate', 'surf'].includes(k) && !!this.state?.bag?.['talisman-elements']) || super.hasField(k); }
  canField(k) { if (k !== 'vol' && ['coupe', 'force', 'eclate', 'surf'].includes(k) && this.state?.bag?.['talisman-elements']) return true; return this.donjons?.dansUnDonjon?.() && k !== 'vol' ? this.hasField(k) : super.canField(k); }
  occupied(x, y, except) { return super.occupied(x, y, except) || !!this.donjons?.occupe(x, y); }
  async interact() { if (this.donjons && !this.busy && await this.donjons.interagir()) return; return super.interact(); }
  async onStep(mv) { await super.onStep(mv); if (!this.busy && this.mapObj) await this.musee?.apresPas(); this.farwest?.apresPas(); if (!this.busy && this.mapObj) { this.donjons?.apresPasVoies(); await this.donjons?.apresPas?.(mv); if (!this.busy) await this.donjons?.apresPasMine(); if (!this.busy) await this.donjons?.apresPasPyramide(); if (!this.busy) await this.donjons?.regards(); if (!this.busy) await this.donjons?.apresPasTemple(); if (!this.busy) await this.donjons?.apresPasTombeau?.(); if (!this.busy) await this.donjons?.apresPasContes?.(); if (!this.busy) await this.donjons?.apresPasChateau?.(); if (!this.busy) await this.donjons?.apresPasCourse?.(); if (!this.busy) await this.ile?.apresPas(); } }
  load() { return null; }

  async startMenu() {
    this.busy = true;
    const opts = [['ÉQUIPE', 'party'], ['SAC', 'bag'], ['POKéDEX', 'dex']];
    if (this.canField('vol')) opts.push(['VOL', 'fly']);
    if (this.donjons?.dansUnDonjon()) opts.push(['JOURNAL', 'journal'], ['QUITTER LE DONJON', 'quitter']);
    if (this.ile?.zoneIci()) opts.push(['CONSTRUIRE', 'construire']);
    if (this.ile?.essai) opts.push(['ABANDONNER L\'ESSAI', 'abandon']);
    if (this.modeTest && this.donjons?.sallesDuDonjon().length > 1) opts.push(['ALLER À UNE SALLE', 'salle']);
    if (this.donjons?.dansLeReflet()) opts.push(['REVENIR AU DÉBUT DE LA SALLE', 'debut']);
    opts.push(['CARTE', 'map'], ['CHANGER DE LIEU', 'lieu'], [this.modeTest ? 'MODE TEST : OUI' : 'MODE TEST : NON', 'test'], [this.noEnc ? 'SAUVAGES : NON' : 'SAUVAGES : OUI', 'sauvages'], [this.traverseMurs ? 'TRAVERSER LES MURS : OUI' : 'TRAVERSER LES MURS : NON', 'murs'], ['OPTIONS', 'opt'], ['FERMER', 'close']);
    let idx = Math.min(this._menuIdx || 0, opts.length - 1);
    try {
      for (;;) {
        const r = await this.ui.list({ items: opts.map(([l]) => ({ label: l })), cls: 'startmenu', cancel: -1, start: idx, onMove: (i) => { this._menuIdx = i; } });
        if (r < 0 || opts[r][1] === 'close') break;
        idx = r;
        const k = opts[r][1];
        if (k === 'party') await partyScreen(this, { mode: 'menu' });
        else if (k === 'bag') { if (await this.fieldBag()) break; }
        else if (k === 'dex') await dexScreen(this);
        else if (k === 'fly') { if (this.player.surf || !this.mapObj.outdoor) { await this.ui.say('On ne peut pas s\'envoler d\'ici.'); continue; } if (await this.fly()) break; }
        else if (k === 'map') await mapScreen(this);
        else if (k === 'journal') await this.donjons.journal();
        else if (k === 'construire') { this.busy = false; await this.ile.construction(); break; }
        else if (k === 'abandon') { if (await this.ui.yesNo('Abandonner l\'essai et revenir à l\'usine ?')) { await this.ile.finEssai('abandon'); await this.ile.retourUsine(); break; } }
        else if (k === 'test') {
          this.modeTest = !this.modeTest; opts[r][0] = this.modeTest ? 'MODE TEST : OUI' : 'MODE TEST : NON';
          await this.ui.say(this.modeTest ? 'Mode test activé : tu peux entrer seul partout, aller dans n\'importe quelle salle d\'un donjon et passer les combats.' : 'Mode test désactivé.');
        }
        else if (k === 'sauvages') {
          this.noEnc = !this.noEnc; opts[r][0] = this.noEnc ? 'SAUVAGES : NON' : 'SAUVAGES : OUI';
          await this.ui.say(this.noEnc ? 'Plus de Pokémon sauvages : tu peux marcher dans les herbes et les grottes sans être dérangé.' : 'Les Pokémon sauvages sont de retour.');
        }
        else if (k === 'murs') {
          this.traverseMurs = !this.traverseMurs; opts[r][0] = this.traverseMurs ? 'TRAVERSER LES MURS : OUI' : 'TRAVERSER LES MURS : NON';
          await this.ui.say(this.traverseMurs ? 'Tu peux traverser les murs.' : 'Les murs t\'arrêtent de nouveau.');
        }
        else if (k === 'salle') { if (await this.donjons.allerSalle()) break; }
        else if (k === 'quitter') { if (await this.donjons.quitter()) break; }
        else if (k === 'opt') await optionsScreen(this);
        else if (k === 'debut') { if (await this.ui.yesNo('Revenir à l\'entrée de la salle ? Copycat reprendra sa place.')) { await this.donjons.recommencerSalle(); break; } }
        else if (k === 'lieu') { this.onChangerLieu?.(); break; }
      }
    } finally { this.busy = false; }
  }
}
