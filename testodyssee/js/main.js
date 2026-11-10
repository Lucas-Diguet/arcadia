// testodyssee/js/main.js — TestOdyssée : on choisit un lieu (donjon du labo, ville, route, grotte d'Odyssée) et une
// équipe prête, et on y apparaît directement, avec le moteur d'Odyssée. Les autres joueurs du salon sont visibles
// partout ; dans les donjons, le groupe partage l'avancée (donjon/jeu.js).
import * as THREE from 'three';
import { WorldView } from '../../odyssee/js/render/world3d.js';
import { setArt } from '../../odyssee/js/render/textures.js';
import { buildWorld } from '../../odyssee/js/world/region.js';
import { Input } from '../../odyssee/js/input.js';
import { Sound } from '../../odyssee/js/audio.js';
import { UI, el, esc } from '../../odyssee/js/ui/ui.js';
import { loadArt } from '../../odyssee/js/art.js';
import { TestGame } from './jeu.js';
import { Donjons } from './donjon/jeu.js';
import { DONJONS } from './donjons/index.js';
import { listerLieux } from './lieux.js';
import { EQUIPES, partieTest } from './equipes.js';
import { Ile } from './ile/jeu.js';
import { installerContenu, DECOR } from './contenu.js';
import { brancherObjets } from './objets.js';
import { brancherRendu } from './rendu.js';
import { ASSETS, loadAll } from '../../odyssee/js/assets.js';

installerContenu(ASSETS);
brancherObjets();
brancherRendu();

const H = window.HubBridge;
const canvas = document.getElementById('gl'), uiRoot = document.getElementById('ui'), loading = document.getElementById('loading');
const QS = new URLSearchParams(location.search);

function fatal(e) {
  console.error(e);
  loading.style.display = 'flex'; loading.innerHTML = `<div>Oups, le jeu a rencontré un problème.<br><small>${esc(e && e.message ? e.message : e)}</small></div>`;
  if (H && H.logCrash) H.logCrash('CRASH_JS_ERROR', 'TestOdyssée : ' + (e && e.message ? e.message : e), { stack: e && e.stack });
}
addEventListener('error', (e) => fatal(e.error || e.message));
addEventListener('unhandledrejection', (e) => fatal(e.reason));

const CATEGORIES = [['labo', 'Labo (lieux en test)'], ['villes', 'Villes d\'Odyssée'], ['routes', 'Routes d\'Odyssée'], ['grottes', 'Grottes et lieux annexes']];
const CHOIX_KEY = 'testodyssee-choix';

async function boot() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.outputColorSpace = THREE.SRGBColorSpace;
  const input = new Input(), sound = new Sound(), ui = new UI(uiRoot, input, sound);
  const world = buildWorld();
  const art = await loadArt();
  // décor du labo, dessiné comme le décor du tileset (16 pixels par case)
  Object.assign(art.sprites, await loadAll(Object.fromEntries(DECOR)));
  for (const [k] of DECOR) art.dens[k] = 1;
  setArt({ kits: art.kits, sols: art.sols, sol32: art.sol32, hgss: art.hgss, relief: art.relief, pack: art.pack });
  const view = new WorldView(renderer, art.chars, { sprites: art.sprites, dens: art.dens, suiveurs: art.suiveurs, batiments: art.batiments });
  const game = new TestGame({ view, ui, input, sound, world });
  const donjons = game.donjons = new Donjons(game, DONJONS, H);
  game.ile = new Ile(game);
  const lieux = listerLieux(world, DONJONS);
  window.__testody = { game, world, view, donjons, lieux };

  // vue : 1 normale, plus grand = de plus haut (on dessine plus de pixels, tout paraît plus petit)
  let vue = 1;
  const resize = () => {
    const base = Math.max(1, Math.round(innerHeight / 400));
    const scale = vue === 1 ? base : base >= 2 ? Math.max(1, Math.round(base / vue)) : base / vue;
    renderer.setSize(Math.ceil(innerWidth / scale), Math.ceil(innerHeight / scale), false); view.resize(Math.ceil(innerWidth / scale), Math.ceil(innerHeight / scale));
    document.documentElement.style.setProperty('--px', Math.max(2, Math.round(innerHeight / 270)) + 'px');
    document.documentElement.style.setProperty('--bp', (innerHeight / 192) + 'px');
  };
  addEventListener('resize', resize); resize();
  game.onVue = (k) => { vue = k; resize(); };
  const unlock = () => sound.init();
  addEventListener('keydown', unlock); addEventListener('pointerdown', unlock);
  ui.helpButton();

  let mode = 'menu', last = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (mode === 'game') game.tick(dt);
    donjons.tick(dt);
    if (mode === 'game') game.ile.tick(dt);
    requestAnimationFrame(loop);
  };
  const premier = world.maps[DONJONS[0].carte];
  view.setMap(premier); view.setTimeOfDay(12);
  view.update(0, ...premier.donjon.plan.depart); view.render();
  loading.style.display = 'none';
  requestAnimationFrame(loop);
  ui.fade(false, 400);
  if (H && H.embedded) H.signalReady();

  const choisir = async () => {
    if (mode === 'menu-open') return;
    if (mode === 'game') { await ui.fade(true, 250); }
    mode = 'menu-open';
    game.hud.root.style.display = 'none';
    if (game.state) donjons.sortir();
    game.state = null;
    for (;;) {
      const r = await ecranChoix(ui, sound, lieux);
      if (r === 'salon') { H.exit(); continue; }
      const nom = (H && H.embedded && H.players.find((p) => String(p.id) === String(H.info.myId))?.name) || r.nom || 'Lucas';
      const state = partieTest(game, { nom: nom.slice(0, 10), genre: r.genre, equipe: r.equipe, lieu: r.lieu });
      game.hud.root.style.display = '';
      mode = 'game';
      await game.start(state);
      game.ui.banner(r.lieu.nom);
      return;
    }
  };
  game.onChangerLieu = donjons.onQuitter = () => { choisir().catch(fatal); };

  // ?lieu=crypte&equipe=debut : démarre directement (pratique pour tester)
  // ?lieu=crypte : devant l'entrée ; ?lieu=crypte&dedans : directement à l'intérieur
  const DJ = DONJONS.find((d) => d.id === QS.get('lieu'));
  const direct = DJ && QS.has('dedans') ? { nom: DJ.nom, map: DJ.carte, x: world.maps[DJ.carte].donjon.plan.depart[0], y: world.maps[DJ.carte].donjon.plan.depart[1], dir: 'up', equipe: DJ.equipe }
    : QS.get('lieu') && Object.values(lieux).flat().find((l) => (DJ && l.nom === DJ.nom) || l.map === QS.get('lieu') || l.nom === QS.get('lieu'));
  if (direct) {
    const nomHub = H && H.embedded && H.players.find((p) => String(p.id) === String(H.info.myId))?.name;
    const state = partieTest(game, { nom: (QS.get('nom') || nomHub || 'Testeur').slice(0, 10), genre: QS.get('genre') === 'f' ? 'f' : 'm', equipe: QS.get('equipe') || direct.equipe || 'debut', lieu: direct });
    mode = 'game'; await game.start(state);
  } else await choisir();
}

/** écran de choix : catégorie, lieu, équipe, personnage */
async function ecranChoix(ui, sound, lieux) {
  let prev = {}; try { prev = JSON.parse(localStorage.getItem(CHOIX_KEY) || '{}'); } catch (e) {}
  const scr = el('div', 'title-scr testody-scr', `<div class="logo"><div class="logo-main">TESTODYSSÉE</div><div class="logo-sub">le labo d'Odyssée</div></div><div class="testody-aide box">Choisis un lieu et une équipe : tu y apparais directement, comme dans le vrai jeu.<br>Rien n'est sauvegardé, ta partie d'Odyssée ne craint rien.</div>`);
  ui.root.appendChild(scr);
  ui.closeDialog();
  ui.fade(false, 250);
  sound.play('cave');
  try {
    for (;;) {
      const cats = CATEGORIES.filter(([k]) => lieux[k].length);
      const salon = H && H.embedded;
      const c = await ui.list({ title: 'Où aller ?', items: cats.map(([, l]) => ({ label: l })).concat(salon ? [{ label: 'Retour au salon' }] : []), cls: 'title-menu testody-menu', cancel: null, parent: scr, start: Math.max(0, cats.findIndex(([k]) => k === prev.cat)) });
      if (c >= cats.length) return 'salon';
      const cat = cats[c][0], liste = lieux[cat];
      const i = await ui.list({ title: cats[c][1], items: liste.map((l) => ({ label: l.nom, right: l.note || '' })).concat([{ label: 'Retour' }]), cls: 'title-menu testody-menu testody-long', cancel: liste.length, parent: scr, start: Math.max(0, liste.findIndex((l) => l.nom === prev.lieu)) });
      if (i >= liste.length) continue;
      const conseil = liste[i].equipe || prev.equipe;
      const e = await ui.list({ title: 'Quelle équipe ?', items: EQUIPES.map((q) => ({ label: q.nom, right: q.note + (q.id === liste[i].equipe ? ' · conseillée' : '') })).concat([{ label: 'Retour' }]), cls: 'title-menu testody-menu', cancel: EQUIPES.length, parent: scr, start: Math.max(0, EQUIPES.findIndex((q) => q.id === conseil)) });
      if (e >= EQUIPES.length) continue;
      const g = await ui.list({ title: 'Ton personnage', items: [{ label: 'Garçon' }, { label: 'Fille' }, { label: 'Retour' }], cls: 'title-menu testody-menu', cancel: 2, parent: scr, start: prev.genre === 'f' ? 1 : 0 });
      if (g === 2) continue;
      const r = { lieu: liste[i], equipe: EQUIPES[e].id, genre: g === 1 ? 'f' : 'm' };
      try { localStorage.setItem(CHOIX_KEY, JSON.stringify({ cat, lieu: r.lieu.nom, equipe: r.equipe, genre: r.genre })); } catch (err) {}
      await ui.fade(true, 250);
      return r;
    }
  } finally { scr.remove(); }
}

boot().catch(fatal);
