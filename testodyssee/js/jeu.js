// testodyssee/js/jeu.js — le jeu d'Odyssée, en version labo : rien n'est sauvegardé (la vraie partie d'Odyssée
// n'est jamais touchée) et le menu propose de changer de lieu.
import { Game } from '../../odyssee/js/game.js';
import { T } from '../../odyssee/js/world/tiles.js';
import { partyScreen, dexScreen, mapScreen, optionsScreen } from '../../odyssee/js/ui/screens.js';
import { ILE } from './ile/modele.js';
import { RoutesVictoire } from './rv/jeu.js';
import { equipeOrigine } from './rv/routes.js';
import { pasCascade } from './cascade.js';

const CLE_TEST = 'testodyssee-mode-test';

export class TestGame extends Game {
  save() { return true; }

  /** mode test : on entre seul partout (dalles, portes des voies) et on peut passer les combats */
  get modeTest() { if (this._modeTest == null) { try { this._modeTest = localStorage.getItem(CLE_TEST) === '1' || new URLSearchParams(location.search).has('test'); } catch (e) { this._modeTest = false; } } return this._modeTest; }
  set modeTest(v) { this._modeTest = !!v; try { localStorage.setItem(CLE_TEST, v ? '1' : '0'); } catch (e) {} this.donjons?.majPanneau(); }

  // le labo ajoute ses propres règles de déplacement (glace, reflet) : voir donjon/miroirs.js
  tryStep(d) {
    const D = this.donjons, p = this.player;
    if (D?.pasSpecial(d) || D?.pousser(d)) return;
    // Routes Victoire : hauteurs, cases fermées d'un côté, rochers qui tombent dans les trous
    if (pasCascade(this, d)) return;
    if ((this.rv ||= new RoutesVictoire(this)).avantPas(d)) return;
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
    // dresseurs des Routes Victoire : les attaques, objets tenus et valeurs cachées du jeu d'origine
    if (o.trainer?.rv && o.party) equipeOrigine(o.trainer.team, o.party);
    if (this.modeTest && await this.ui.yesNo('Mode test : passer ce combat (compté comme gagné) ?')) return 'win';
    const m = this.mapObj;
    if (m?.style !== 'clair') return super.runBattle(o);
    const avant = [m.floor, m.battleBg]; m.floor = 'clair'; m.battleBg = 'league';
    try { return await super.runBattle(o); } finally { [m.floor, m.battleBg] = avant; }
  }
  /** l'île privée se reconstruit à partir de la donnée du joueur quand on y arrive */
  setMap(id) {
    this.ile?.surCarte(id);
    if (this.ile && this.state && (id === ILE || id?.startsWith(ILE + ':')) && (!this.world.maps[id] || this.ile.pour !== this.ile.cle || !this.ile.dedans())) this.ile.preparer();
    return super.setMap(id);
  }
  /** rencontres des Routes Victoire : celles du jeu d'origine, de jour comme de nuit */
  wildBattle(enc, o = {}) {
    if (!this.mapObj?.rv || o.fixed) return super.wildBattle(enc, o);
    let r = Math.random() * enc.reduce((a, x) => a + x[3], 0), e = enc[0];
    for (const x of enc) { r -= x[3]; if (r <= 0) { e = x; break; } }
    const lvl = e[1] + Math.floor(Math.random() * (e[2] - e[1] + 1)), lead = this.lead();
    if (!lead || (this.state.repel > 0 && lead.lvl >= lvl)) return;
    return super.wildBattle([[e[0], lvl, lvl, 1]], { ...o, fixed: true });
  }
  setTile(x, y, v) { super.setTile(x, y, v); if (v === T.BOULDER) { this.rv?.rocherPose(x, y); this.donjons?.rocherTemple?.(x, y); } }
  warp(to, sfx) { (this.rv ||= new RoutesVictoire(this)).arrivee(to); this.donjons?.remiseTemple?.(to); return super.warp(to, sfx); }
  /** dans les donjons du labo, les capacités de terrain servent sans attendre les badges */
  canField(k) { return this.donjons?.dansUnDonjon?.() && k !== 'vol' ? this.hasField(k) : super.canField(k); }
  rvApprendre(cle) { return (this.rv ||= new RoutesVictoire(this)).apprendre(cle); }
  occupied(x, y, except) { return super.occupied(x, y, except) || !!this.donjons?.occupe(x, y); }
  async interact() { if (this.donjons && !this.busy && await this.donjons.interagir()) return; return super.interact(); }
  async onStep(mv) { this.rv?.apresPas(mv); await super.onStep(mv); if (!this.busy && this.mapObj) { this.donjons?.apresPasVoies(); await this.donjons?.apresPas(mv); if (!this.busy) await this.donjons?.apresPasMine(); if (!this.busy) await this.donjons?.apresPasPyramide(); if (!this.busy) await this.donjons?.regards(); if (!this.busy) await this.donjons?.apresPasTemple(); if (!this.busy) await this.donjons?.apresPasTombeau?.(); if (!this.busy) await this.ile?.apresPas(); } }
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
    opts.push(['CARTE', 'map'], ['CHANGER DE LIEU', 'lieu'], [this.modeTest ? 'MODE TEST : OUI' : 'MODE TEST : NON', 'test'], ['OPTIONS', 'opt'], ['FERMER', 'close']);
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
        else if (k === 'salle') { if (await this.donjons.allerSalle()) break; }
        else if (k === 'quitter') { if (await this.donjons.quitter()) break; }
        else if (k === 'opt') await optionsScreen(this);
        else if (k === 'debut') { if (await this.ui.yesNo('Revenir à l\'entrée de la salle ? Copycat reprendra sa place.')) { await this.donjons.recommencerSalle(); break; } }
        else if (k === 'lieu') { this.onChangerLieu?.(); break; }
      }
    } finally { this.busy = false; }
  }
}
