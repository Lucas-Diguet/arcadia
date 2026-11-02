// testodyssee/js/jeu.js — le jeu d'Odyssée, en version labo : rien n'est sauvegardé (la vraie partie d'Odyssée
// n'est jamais touchée) et le menu propose de changer de lieu.
import { Game } from '../../odyssee/js/game.js';
import { partyScreen, dexScreen, mapScreen, optionsScreen } from '../../odyssee/js/ui/screens.js';

export class TestGame extends Game {
  save() { return true; }
  load() { return null; }

  async startMenu() {
    this.busy = true;
    const opts = [['ÉQUIPE', 'party'], ['SAC', 'bag'], ['POKéDEX', 'dex']];
    if (this.canField('vol')) opts.push(['VOL', 'fly']);
    if (this.donjons?.dansUnDonjon()) opts.push(['JOURNAL', 'journal']);
    opts.push(['CARTE', 'map'], ['CHANGER DE LIEU', 'lieu'], ['OPTIONS', 'opt'], ['FERMER', 'close']);
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
        else if (k === 'opt') await optionsScreen(this);
        else if (k === 'lieu') { this.onChangerLieu?.(); break; }
      }
    } finally { this.busy = false; }
  }
}
