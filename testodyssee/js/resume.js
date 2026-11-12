// testodyssee/js/resume.js — petits ajouts du labo à l'interface d'Odyssée, sans toucher à ses fichiers :
// l'objet tenu dans le Résumé d'un Pokémon, la barre de vie à blocs en combat, et la touche M (quelle que soit la disposition du clavier) pour armer la
// Méga-Évolution dans le menu des attaques.
import { SPECIES } from '../../odyssee/js/data/species.js';
import { getAbility } from '../../odyssee/js/data/abilities.js';
import { ITEMS, itemName } from '../../odyssee/js/core/items.js';
import { natureName } from '../../odyssee/js/core/mon.js';
import { esc } from '../../odyssee/js/ui/ui.js';

/** le Pokémon affiché par l'écran Résumé : on le retrouve par son espèce, sa nature et son talent */
function monAffiche(game, table) {
  const lignes = Object.fromEntries([...table.rows].map((r) => [r.cells[0]?.textContent.trim(), r.cells[1]]));
  const espece = lignes['Espèce']?.textContent.trim(), nature = lignes['Nature']?.textContent.trim() || '', talent = lignes['Talent']?.querySelector('b')?.textContent.trim();
  const st = game.state; if (!st || !espece) return null;
  const tous = [...(st.party || []), ...(Array.isArray(st.box) ? st.box : Object.values(st.box || {})).flat(2)].filter((m) => m && m.sp != null);
  const ok = tous.filter((m) => SPECIES[m.sp]?.n === espece && nature.startsWith(natureName(m.nat ?? 0)) && (!talent || getAbility(m)?.name === talent));
  return ok[0] || null;
}

export function brancherResume(game, ASSETS) {
  const maj = () => {
    for (const t of document.querySelectorAll('.sum-scr table.sum-kv')) {
      if (t.querySelector('.sum-objet') || ![...t.rows].some((r) => r.cells[0]?.textContent.trim() === 'Talent')) continue;
      const m = monAffiche(game, t), talent = [...t.rows].find((r) => r.cells[0]?.textContent.trim() === 'Talent');
      const tr = document.createElement('tr'); tr.className = 'sum-objet';
      const it = m?.item, desc = it && ITEMS[it]?.desc;
      tr.innerHTML = `<td>Objet tenu</td><td>${it ? `<img src="${ASSETS.item(it)}" alt="" style="width:1.4em;height:1.4em;image-rendering:pixelated;vertical-align:middle"> <b>${esc(itemName(it))}</b>${desc ? ` <small class="nat-fx">${esc(desc.replace(/^Objet à tenir\. /, ''))}</small>` : ''}` : '—'}</td>`;
      talent.after(tr);
    }
  };
  let prevu = false;
  new MutationObserver(() => { if (prevu) return; prevu = true; requestAnimationFrame(() => { prevu = false; maj(); }); }).observe(document.body, { childList: true, subtree: true });

  // barre de vie à blocs (m.blocs, combat/regles.js) : la barre de l'adversaire est découpée, des pastilles comptent les blocs
  setInterval(() => {
    const hud = document.querySelector('.battle .bhud.foe'); if (!hud) return;
    const b = game.bv?.battle, foe = b && (b.foe || b.sides?.[1]?.party?.[b.sides[1].active]), n = foe?.blocs > 1 ? foe.blocs : 0;
    const bar = hud.querySelector('.bh-hp i'); let cpt = hud.querySelector('.raid-blocs.labo');
    if (!n || !bar) { cpt?.remove(); hud.querySelectorAll('.raid-sep.labo').forEach((q) => q.remove()); return; }
    if (hud.querySelectorAll('.raid-sep.labo').length !== n - 1) {
      hud.querySelectorAll('.raid-sep.labo').forEach((q) => q.remove());
      for (let k = 1; k < n; k++) { const s = document.createElement('span'); s.className = 'raid-sep labo'; s.style.left = (k * 100 / n) + '%'; bar.appendChild(s); }
    }
    if (!cpt) { cpt = document.createElement('div'); cpt.className = 'raid-blocs labo'; hud.appendChild(cpt); }
    const M = foe.stats[0]; let r = 0; while (r < n && foe.hp > Math.round(r * M / n)) r++;
    const html = Array.from({ length: n }, (_, k) => `<b class="${k < r ? 'on' : ''}"></b>`).join('');
    if (cpt.innerHTML !== html) cpt.innerHTML = html;
  }, 150);

  // M arme la Méga-Évolution : Odyssée lit la touche physique (le M d'un clavier QWERTY), on accepte aussi la lettre M
  // d'un clavier AZERTY ou autre
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyM' || (e.key || '').toLowerCase() !== 'm' || e.repeat) return;
    const b = document.querySelector('.battle .mv-mega-btn'); if (!b) return;
    e.preventDefault(); e.stopPropagation(); b.click();
  }, true);
}
