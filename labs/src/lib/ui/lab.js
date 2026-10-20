// Lab runtime: mounts one animation definition into the topic page and runs it.
//
// A definition (src/<topic>/<id>/lab.js, default export) is plain data plus one setup function:
//   { id, title, notebook, size, cameras, cam, speed, duration, loop,
//     defaults: { …state },                         every parameter and display toggle, in SI
//     scenarios: [{ id, label, hint, cam, speed, set: { …state } }],
//     controls: [group], display: [group],           see panel.js
//     plots: [{ id, title, xLabel, xUnit, yUnit, y2Unit }], hud: [rows], tour?: [steps],
//     setup(ctx) -> { update(dt), changed?(id), highlight?(key), theme?(), dispose?() } }
// ctx gives the lab its stage, state, time, plots, HUD, legend and helpers. The runtime owns the
// panel, play bar, URL, explain drawer, tour, keyboard and theme, so labs contain only physics + scene.
import * as THREE from 'three';
import { createStage, label } from './stage.js';
import { createHandles } from './handles.js';
import { createPanel } from './panel.js';
import { createPlaybar } from './playbar.js';
import { createPlot } from './plots.js';
import { createHud } from './hud.js';
import { initExplain } from './explain.js';
import { createTour } from './tour.js';
import { cssVar } from './theme.js';
import { createLegend } from '../viz/legend.js';

export const PRESETS = (d) => ({
  front: { pos: [0, -2.5 * d, 0.1 * d] }, side: { pos: [2.5 * d, 0, 0.1 * d] },
  top: { pos: [0, -0.002 * d, 2.6 * d] }, iso: { pos: [1.5 * d, -1.7 * d, d] },
});

export function mountLab(def, root, { url = {}, onUrl = () => {} } = {}) {
  const plotsDef = def.plots || [];
  root.innerHTML = `<div class="lab${plotsDef.length ? '' : ' no-dock'}">
    <main class="viewport"><div class="stage" role="application" aria-label="${def.title}: interactive 3D scene"></div>
      <div class="hud"></div><div class="legend"></div><div class="hint"></div><div class="tour"></div>
      <div class="playbar"></div><aside class="explain" aria-label="Explanation"></aside></main>
    <aside class="panel" aria-label="Controls"></aside>
    <section class="dock" aria-label="Linked plots">${plotsDef.map((p) => `<div class="plot" data-plot="${p.id}"></div>`).join('')}</section></div>`;
  const q = (s) => root.querySelector(s);
  const el = { stage: q('.stage'), hud: q('.hud'), legend: q('.legend'), hint: q('.hint'), tour: q('.tour'), playbar: q('.playbar'), explain: q('.explain'), panel: q('.panel') };

  const stage = createStage(el.stage, { size: def.size ?? 0.5, presets: def.cameras || PRESETS(def.size ?? 0.5) });
  const handles = createHandles(stage, el.hint);
  const state = { scenario: def.scenarios[0].id, ...structuredClone(def.defaults) };
  // time.t is simulated time (shown in the play bar); it advances by dt·speed·scale per frame, so a lab
  // whose physics lives in µs sets scale = 1e-5 and keeps SI units everywhere.
  const time = { t: 0, D: def.duration || 0, playing: !stage.reducedMotion, speed: def.speed ?? 1, scale: def.timeScale ?? 1, live: false, scrubbable: def.scrub !== false };
  const plots = Object.fromEntries(plotsDef.map((p) => [p.id, createPlot(q(`[data-plot="${p.id}"]`), p)]));
  const hud = createHud(el.hud, def.hud || []);
  if (!def.hud?.length) el.hud.hidden = true;
  const legend = createLegend(el.legend);
  let impl = null, frames = 0, panel = null, playbar = null, tour = null;

  const ctx = {
    THREE, def, stage, scene: stage.scene, state, time, handles, plots, hud, legend, label, cssVar, el, highlight: null,
    timings: {},
    requestUpdate() { if (impl && !time.playing) impl.update(0); stage.requestRender(); bar(); },
    setPlaying, loadScenario,
    panelSync() { panel?.sync(); writeUrl(); },
    setDuration(D) { time.D = D; if (D && time.t > D) time.t = 0; bar(); },
  };

  function setPlaying(on) { time.playing = on; stage.setAnimating(on); bar(); }
  function bar() { playbar?.set({ playing: time.playing, t: time.t, D: time.live ? 0 : time.D, scrubbable: time.scrubbable && !time.live, speed: time.speed }); }

  function loadScenario(id, extra = {}) {
    const sc = def.scenarios.find((s) => s.id === id) || def.scenarios[0];
    for (const k of Object.keys(state)) delete state[k];
    Object.assign(state, structuredClone(def.defaults), structuredClone(sc.set || {}), extra, { scenario: sc.id });
    time.t = 0; time.live = false; time.speed = extra.speed ?? sc.speed ?? def.speed ?? 1; delete state.speed;
    impl.changed?.('*');
    panel.sync();
    stage.preset(sc.cam || def.cam || 'iso');
    impl.update(0); stage.requestRender(); bar(); writeUrl();
  }

  function onChange(id) {
    impl.changed?.(id);
    panel.sync(); ctx.requestUpdate(); writeUrl();
  }

  function urlParams() {
    const sc = def.scenarios.find((s) => s.id === state.scenario) || {}, ref = { ...def.defaults, ...(sc.set || {}) }, diff = {};
    for (const k of Object.keys(def.defaults)) if (JSON.stringify(state[k]) !== JSON.stringify(ref[k])) diff[k] = state[k];
    if (time.speed !== (sc.speed ?? def.speed ?? 1)) diff.speed = time.speed;
    return { scenario: state.scenario, diff, tour: tour && tour.index >= 0 ? tour.index + 1 : null };
  }
  function writeUrl() { onUrl(urlParams()); }

  impl = def.setup(ctx);
  panel = createPanel(el.panel, { scenarios: def.scenarios, onScenario: (id) => loadScenario(id), controls: def.controls, display: def.display }, state, onChange);
  playbar = createPlaybar(el.playbar, {
    onPlay: () => setPlaying(!time.playing),
    onRestart: () => { time.t = 0; impl.changed?.('restart'); ctx.requestUpdate(); },
    onStep: () => { setPlaying(false); time.t = Math.min(time.D || Infinity, time.t + (time.D ? time.D / 200 : time.scale / 30)); impl.update(1 / 30); stage.requestRender(); bar(); },
    onScrub: (u) => { if (time.D) { time.t = u * time.D; impl.update(0); stage.requestRender(); bar(); } },
    onSpeed: (v) => { time.speed = v; bar(); writeUrl(); },
  });

  stage.setOnFrame((dt) => {
    if (time.playing) {
      time.t += time.live ? dt * time.scale : dt * time.speed * time.scale;
      if (time.D && !time.live && time.t > time.D) time.t = def.loop === false ? time.D : time.t % time.D;
    }
    impl.update(dt);
    if (++frames % 6 === 0) bar();
  });

  // explain drawer: pre-rendered theory from <template id="explain-<id>">
  const tpl = document.getElementById(`explain-${def.id}`);
  el.explain.innerHTML = `<button class="btn close" aria-label="Close explanation">Close</button>${tpl ? tpl.innerHTML : '<p>No explanation yet.</p>'}`;
  const explain = initExplain(el.explain, (k) => { ctx.highlight = k; impl.highlight?.(k); ctx.requestUpdate(); });

  tour = def.tour?.length ? createTour(el.tour, def.tour.map((s) => ({
    title: s.title, text: s.text,
    apply: () => { loadScenario(s.scenario, { ...(s.set || {}) }); setPlaying(!stage.reducedMotion); },
  })), { onStep: writeUrl }) : null;

  // initial state from the URL
  const keep = {};
  for (const [k, v] of Object.entries(url.params || {})) {
    if (!(k in def.defaults) && k !== 'speed') continue;
    keep[k] = v === 'true' ? true : v === 'false' ? false : Number.isFinite(Number(v)) && v !== '' ? Number(v) : v;
  }
  loadScenario(url.scenario && def.scenarios.some((s) => s.id === url.scenario) ? url.scenario : def.scenarios[0].id, keep);
  stage.preset((def.scenarios.find((s) => s.id === state.scenario) || {}).cam || def.cam || 'iso', { instant: true });
  if (def.ortho) stage.toggleOrtho();
  if (def.plain) { stage.grid.visible = false; stage.axes.visible = false; }
  if (url.tour && tour) tour.show(url.tour - 1);
  // timeless labs (a graph you shape by hand) have no clock: no play bar, render on demand only
  if (def.timeless) { el.playbar.hidden = true; time.playing = false; }
  setPlaying(time.playing);

  return {
    def, ctx, hasTour: !!tour,
    toggleExplain: () => explain.toggle(),
    toggleTour: () => tour?.toggle(),
    preset: (n) => stage.preset(n),
    toggleOrtho: () => stage.toggleOrtho(),
    reset: () => loadScenario(state.scenario),
    urlParams,
    theme() { stage.setTheme(); impl.theme?.(); for (const p of Object.values(plots)) p.redraw(); ctx.requestUpdate(); },
    key(e) {
      if (e.key === ' ' && !def.timeless) { e.preventDefault(); setPlaying(!time.playing); }
      else if (e.key === 'r' || e.key === 'R') loadScenario(state.scenario);
      else if ((e.key === 't' || e.key === 'T') && tour) tour.toggle();
      else if (e.key === 'Escape') { tour?.close(); explain.close(); }
      else if (e.key.length === 1 && '1234'.includes(e.key)) stage.preset(['front', 'side', 'top', 'iso'][Number(e.key) - 1]);
    },
    // test hooks (smoke, capture)
    get scenarios() { return def.scenarios.map((s) => s.id); },
    load: (id) => loadScenario(id), setPlaying, stage, state, get timings() { return ctx.timings; }, gif: def.gif,
    dispose() { impl.dispose?.(); stage.dispose(); root.innerHTML = ''; },
  };
}
