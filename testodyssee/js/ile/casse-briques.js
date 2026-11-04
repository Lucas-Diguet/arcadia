// testodyssee/js/ile/casse-briques.js — la borne d'arcade : un casse-briques. Une raquette, une Poké Ball, un mur de
// briques ; une balle perdue coûte une vie (trois en tout). Chaque brique cassée rapporte un point d'usine, chaque mur
// fini quinze de plus. Quelques briques lâchent un bonus : raquette large ou deux balles de plus.
// Commandes : flèches ou Q / D (ou la souris), Espace pour lancer, Échap pour arrêter.

const LW = 320, LH = 240, COLS = 10, ROWS = 6, BW = 30, BH = 10, TOP = 34;
const COULEURS = ['#e84a4a', '#f08a3a', '#f0c83a', '#5ac85a', '#4a9af0', '#9a6ae0'];

/** lance une partie ; renvoie { briques, murs } quand elle est finie */
export function casseBriques(root, o = {}) {
  return new Promise((fin) => {
    const voile = document.createElement('div'); voile.className = 'arcade';
    const cv = document.createElement('canvas'); cv.width = LW; cv.height = LH;
    voile.innerHTML = '<div class="arcade-cadre"><div class="arcade-titre">CASSE-BRIQUES</div></div>';
    voile.firstChild.appendChild(cv);
    const aide = document.createElement('div'); aide.className = 'arcade-aide'; aide.textContent = '← → ou souris : raquette · Espace : lancer · Échap : arrêter';
    voile.firstChild.appendChild(aide);
    root.appendChild(voile);
    const ctx = cv.getContext('2d');

    let briques = 0, murs = 0, vies = 3, mur = [], balles = [], bonus = [], large = 0, pause = 0, fini = false, message = 'Espace : lancer';
    const tenu = new Set();
    const pad = { x: LW / 2, w: 44 };
    const vitesse = () => 150 + murs * 25;
    const nouveauMur = () => {
      mur = [];
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        // les murs suivants ont des briques solides (deux coups) en haut
        const dur = murs > 0 && r < Math.min(3, murs) ? 2 : 1;
        mur.push({ x: 10 + c * (BW + 0), y: TOP + r * (BH + 2), r, pv: dur, max: dur });
      }
    };
    const surRaquette = () => { balles = [{ x: pad.x, y: LH - 22, vx: 0, vy: 0, colle: true }]; message = 'Espace : lancer'; };
    const lancer = () => { for (const b of balles) if (b.colle) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 0.8, v = vitesse(); b.vx = Math.cos(a) * v; b.vy = Math.sin(a) * v; b.colle = false; } message = ''; };
    nouveauMur(); surRaquette();

    const touche = (e, bas) => {
      const k = { ArrowLeft: 'g', KeyA: 'g', KeyQ: 'g', ArrowRight: 'd', KeyD: 'd', Space: 'lancer', Enter: 'lancer', Escape: 'stop', Backspace: 'stop' }[e.code];
      if (!k) return;
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation?.();
      if (!bas) { tenu.delete(k); return; }
      if (k === 'lancer') { if (fini) arreter(); else lancer(); }
      else if (k === 'stop') arreter();
      else tenu.add(k);
    };
    const kd = (e) => touche(e, true), ku = (e) => touche(e, false);
    const souris = (e) => { const r = cv.getBoundingClientRect(); pad.x = ((e.clientX - r.left) / r.width) * LW; };
    const clic = () => { if (fini) arreter(); else lancer(); };
    addEventListener('keydown', kd, true); addEventListener('keyup', ku, true);
    cv.addEventListener('pointermove', souris); cv.addEventListener('pointerdown', clic);

    const arreter = () => {
      if (!voile.isConnected) return;
      removeEventListener('keydown', kd, true); removeEventListener('keyup', ku, true);
      cancelAnimationFrame(raf); voile.remove();
      fin({ briques, murs });
    };

    const rebondRaquette = (b) => {
      const w = pad.w * (large > 0 ? 1.6 : 1), y = LH - 16;
      if (b.vy > 0 && b.y + 4 >= y && b.y + 4 <= y + 6 && Math.abs(b.x - pad.x) <= w / 2 + 3) {
        const t = (b.x - pad.x) / (w / 2), a = -Math.PI / 2 + t * 1.05, v = Math.hypot(b.vx, b.vy);
        b.vx = Math.cos(a) * v; b.vy = Math.sin(a) * v; b.y = y - 5;
        o.son?.('select');
      }
    };
    const pas = (dt) => {
      if (fini) return;
      if (pause > 0) { pause -= dt; return; }
      const w = pad.w * (large > 0 ? 1.6 : 1);
      if (tenu.has('g')) pad.x -= 260 * dt;
      if (tenu.has('d')) pad.x += 260 * dt;
      pad.x = Math.max(w / 2 + 4, Math.min(LW - w / 2 - 4, pad.x));
      if (large > 0) large -= dt;
      for (const b of balles) {
        if (b.colle) { b.x = pad.x; continue; }
        // petits pas, pour ne jamais traverser une brique
        const n = Math.ceil(Math.hypot(b.vx, b.vy) * dt / 3);
        for (let i = 0; i < n && !b.mort; i++) {
          b.x += b.vx * dt / n; b.y += b.vy * dt / n;
          if (b.x < 8) { b.x = 8; b.vx = Math.abs(b.vx); }
          if (b.x > LW - 8) { b.x = LW - 8; b.vx = -Math.abs(b.vx); }
          if (b.y < 26) { b.y = 26; b.vy = Math.abs(b.vy); }
          if (b.y > LH + 6) { b.mort = true; break; }
          rebondRaquette(b);
          for (const q of mur) {
            if (q.pv <= 0 || b.x < q.x - 4 || b.x > q.x + BW + 4 || b.y < q.y - 4 || b.y > q.y + BH + 4) continue;
            const dx = Math.min(Math.abs(b.x - q.x), Math.abs(b.x - q.x - BW)), dy = Math.min(Math.abs(b.y - q.y), Math.abs(b.y - q.y - BH));
            if (b.x > q.x && b.x < q.x + BW) b.vy = -b.vy; else if (b.y > q.y && b.y < q.y + BH) b.vx = -b.vx; else if (dx < dy) b.vx = -b.vx; else b.vy = -b.vy;
            b.x += b.vx * dt / n; b.y += b.vy * dt / n;
            q.pv--;
            if (q.pv <= 0) {
              briques++; o.son?.('bump');
              if (Math.random() < 0.09) bonus.push({ x: q.x + BW / 2, y: q.y + BH, k: Math.random() < 0.5 ? 'large' : 'multi' });
            }
            break;
          }
        }
      }
      // bonus qui tombent
      for (const q of bonus) {
        q.y += 70 * dt;
        if (q.y >= LH - 18 && q.y <= LH - 8 && Math.abs(q.x - pad.x) <= w / 2 + 4) {
          q.pris = true; o.son?.('item');
          if (q.k === 'large') large = 12;
          else { const b = balles.find((x) => !x.colle && !x.mort) || balles[0]; for (const s of [-0.5, 0.5]) { const v = Math.hypot(b.vx, b.vy) || vitesse(), a = Math.atan2(b.vy || -1, b.vx) + s; balles.push({ x: b.x, y: b.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v }); } }
        }
      }
      bonus = bonus.filter((q) => !q.pris && q.y < LH + 10);
      balles = balles.filter((b) => !b.mort);
      if (!balles.length) {
        vies--; large = 0; bonus = [];
        if (vies <= 0) { fini = true; message = 'Partie finie'; o.son?.('cancel'); return; }
        o.son?.('cancel'); surRaquette(); pause = 0.6;
      }
      if (mur.every((q) => q.pv <= 0)) { murs++; o.son?.('levelup'); nouveauMur(); surRaquette(); message = `Mur ${murs + 1} ! Espace : lancer`; pause = 0.8; }
    };

    const ball = (x, y) => {
      ctx.fillStyle = '#1a1a22'; ctx.beginPath(); ctx.arc(x, y, 4.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f04040'; ctx.beginPath(); ctx.arc(x, y, 3.6, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#f4f4f4'; ctx.beginPath(); ctx.arc(x, y, 3.6, 0, Math.PI); ctx.fill();
      ctx.fillStyle = '#1a1a22'; ctx.fillRect(x - 3.6, y - 0.5, 7.2, 1);
      ctx.fillStyle = '#f4f4f4'; ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2); ctx.fill();
    };
    const dessiner = () => {
      ctx.fillStyle = '#10142a'; ctx.fillRect(0, 0, LW, LH);
      ctx.fillStyle = '#1a2040'; for (let y = 24; y < LH; y += 8) ctx.fillRect(0, y, LW, 1);
      ctx.fillStyle = '#3a3a5a'; ctx.fillRect(0, 22, LW, 2); ctx.fillRect(0, 22, 4, LH); ctx.fillRect(LW - 4, 22, 4, LH);
      ctx.font = '10px monospace'; ctx.textBaseline = 'top'; ctx.fillStyle = '#f0f0f0';
      ctx.fillText(`POINTS ${String(briques + 15 * murs).padStart(4, '0')}`, 8, 7);
      ctx.fillText(`MUR ${murs + 1}`, LW / 2 - 18, 7);
      for (let i = 0; i < vies; i++) ball(LW - 14 - i * 12, 12);
      for (const q of mur) {
        if (q.pv <= 0) continue;
        const c = q.max > 1 && q.pv > 1 ? '#a0a4b4' : COULEURS[q.r];
        ctx.fillStyle = '#0a0a12'; ctx.fillRect(q.x, q.y, BW - 1, BH);
        ctx.fillStyle = c; ctx.fillRect(q.x + 1, q.y + 1, BW - 3, BH - 2);
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(q.x + 1, q.y + 1, BW - 3, 2);
      }
      for (const q of bonus) {
        ctx.fillStyle = q.k === 'large' ? '#4ad0f0' : '#f0d04a'; ctx.fillRect(q.x - 8, q.y - 4, 16, 8);
        ctx.fillStyle = '#10142a'; ctx.fillText(q.k === 'large' ? 'L' : 'M', q.x - 3, q.y - 5);
      }
      const w = pad.w * (large > 0 ? 1.6 : 1);
      ctx.fillStyle = '#0a0a12'; ctx.fillRect(pad.x - w / 2 - 1, LH - 17, w + 2, 8);
      ctx.fillStyle = large > 0 ? '#4ad0f0' : '#e0e0f0'; ctx.fillRect(pad.x - w / 2, LH - 16, w, 6);
      ctx.fillStyle = '#e84a4a'; ctx.fillRect(pad.x - w / 2, LH - 16, 4, 6); ctx.fillRect(pad.x + w / 2 - 4, LH - 16, 4, 6);
      for (const b of balles) ball(b.x, b.y);
      if (message) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, LH / 2 + 8, LW, 30);
        ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center';
        ctx.fillText(message, LW / 2, LH / 2 + 12);
        if (fini) ctx.fillText(`${briques + 15 * murs} points d'usine · Espace : fermer`, LW / 2, LH / 2 + 24);
        ctx.textAlign = 'left';
      }
    };
    let last = performance.now(), raf = requestAnimationFrame(function f(t) {
      const dt = Math.min(0.033, (t - last) / 1000); last = t;
      pas(dt); dessiner();
      raf = requestAnimationFrame(f);
    });
  });
}
