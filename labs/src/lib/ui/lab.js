// Lab runtime: mounts one animation definition into the topic page and runs it.
//
// A definition (src/<topic>/<id>/lab.js, default export) is plain data plus one setup function:
//   { id, title, size, cameras, cam, speed, duration, loop,
//     defaults: { …state },                         every parameter and display toggle, in SI
//     cases: [{ id, label, cam, speed, set: { …state },                     the parts of the topic (line, parabola…)
//              controls?: [ids],                                             default controls of its examples
//              examples: [{ id, label, cam, speed, set, controls? }] }],     didactic presets; Free = no example
//     (explain.html: <section data-case="…" [data-example="…"]>; untagged elements always show)
//     controls: [group], display: [group],           see panel.js
//     plots: [{ id, title, xLabel, xUnit, yUnit, y2Unit }], hud: [rows],
//     camOf?(state) -> camera preset name (overrides case/example cams, e.g. 2D/3D views)
//     setup(ctx) -> { update(dt), changed?(id), highlight?(key), theme?(), dispose?() } }
// ctx gives the lab its stage, state, time, plots, HUD, legend and helpers. The runtime owns the
// panel, play bar, URL, explain drawer, keyboard and theme, so labs contain only physics + scene.
import * as THREE from 'three';
import { createStage, label } from './stage.js';
import { createHandles } from './handles.js';
import { createPanel } from './panel.js';
import { createPlaybar } from './playbar.js';
import { createPlot } from './plots.js';
import { createHud } from './hud.js';
import { initExplain } from './explain.js';
import { cssVar } from './theme.js';
import { createLegend } from '../viz/legend.js';
import { onDrag, store } from './drag.js';

export const PRESETS = (d) => ({
  front: { pos: [0, -2.5 * d, 0.1 * d] }, side: { pos: [2.5 * d, 0, 0.1 * d] },
  top: { pos: [0, -0.002 * d, 2.6 * d] }, iso: { pos: [1.5 * d, -1.7 * d, d] },
});

export function mountLab(def, root, { url = {}, onUrl = () => {} } = {}) {
  const plotsDef = def.plots || [];
  root.innerHTML = `<div class="lab${plotsDef.length ? '' : ' no-dock'}">
    <main class="viewport"><div class="stage" role="application" aria-label="${def.title}: interactive 3D scene"></div>
      <div class="hud"></div><div class="legend"></div><div class="hint"></div>
      <div class="playbar"></div><aside class="explain" aria-label="Explanation"></aside></main>
    <aside class="panel" aria-label="Controls"></aside>
    <section class="dock" aria-label="Linked plots"><div class="dock-grip" title="Drag to resize the plots, double-click for large"></div>${plotsDef.map((p) => `<div class="plot" data-plot="${p.id}"></div>`).join('')}</section></div>`;
  const q = (s) => root.querySelector(s);
  const el = { stage: q('.stage'), hud: q('.hud'), legend: q('.legend'), hint: q('.hint'), playbar: q('.playbar'), explain: q('.explain'), panel: q('.panel') };

  // plots dock: drag its top edge to make the plots taller (remembered for every topic)
  const shell = root.closest('.topic') || document.documentElement, setH = (h) => shell.style.setProperty('--dock-h', `${h}px`);
  if (store.get('labs-dock-h')) setH(Number(store.get('labs-dock-h')));
  let h0 = 0; const maxH = () => root.getBoundingClientRect().height - 160;
  onDrag(q('.dock-grip'), {
    start: () => { h0 = q('.dock').getBoundingClientRect().height; },
    move: (dx, dy) => setH(Math.max(110, Math.min(maxH(), h0 - dy))),
    end: (dx, dy) => store.set('labs-dock-h', String(Math.round(Math.max(110, Math.min(maxH(), h0 - dy))))),
  });
  q('.dock-grip').addEventListener('dblclick', () => { const big = q('.dock').getBoundingClientRect().height < maxH() * 0.6, h = big ? Math.round(maxH() * 0.65) : 176; setH(h); store.set('labs-dock-h', String(h)); });

  const stage = createStage(el.stage, { size: def.size ?? 0.5, presets: def.cameras || PRESETS(def.size ?? 0.5) });
  const handles = createHandles(stage, el.hint);
  const state = { case: def.cases[0].id, example: '', ...structuredClone(def.defaults) };
  const caseOf = (id) => def.cases.find((c) => c.id === id) || def.cases[0];
  const exOf = (c, id) => c.examples?.find((e) => e.id === id) || null;
  // time.t is simulated time (shown in the play bar); it advances by dt·speed·scale per frame, so a lab
  // whose physics lives in µs sets scale = 1e-5 and keeps SI units everywhere.
  const time = { t: 0, D: def.duration || 0, playing: !stage.reducedMotion, speed: def.speed ?? 1, scale: def.timeScale ?? 1, live: false, scrubbable: def.scrub !== false };
  const plots = Object.fromEntries(plotsDef.map((p) => [p.id, createPlot(q(`[data-plot="${p.id}"]`), p)]));
  const hud = createHud(el.hud, def.hud || []);
  if (!def.hud?.length) el.hud.hidden = true;
  const legend = createLegend(el.legend);
  let impl = null, frames = 0, panel = null, playbar = null;

  const ctx = {
    THREE, def, stage, scene: stage.scene, state, time, handles, plots, hud, legend, label, cssVar, el, highlight: null,
    timings: {},
    requestUpdate() { if (impl && !time.playing) impl.update(0); stage.requestRender(); bar(); },
    setPlaying, load,
    panelSync() { panel?.sync(); writeUrl(); },
    setDuration(D) { time.D = D; if (D && time.t > D) time.t = 0; bar(); },
    // a case with an animation gets a clock of D seconds; D = 0 means nothing evolves in time:
    // no play bar, render on demand only (the controls drive it). ambient: no play bar either, but keep
    // drawing frames for a steady motion that is not a story in time (charges drifting along a DC wire)
    setClock(D, { ambient = false } = {}) { ctx.setDuration(D); setStill(!D, ambient && !D); },
  };
  let still = false, amb = false;
  function setStill(on, ambient) {
    if (def.timeless || (on === still && ambient === amb)) return; still = on; amb = ambient;
    el.playbar.hidden = on; time.t = 0; setPlaying((ambient || !on) && !stage.reducedMotion);
  }

  function setPlaying(on) { time.playing = on; stage.setAnimating(on); bar(); }
  function bar() { playbar?.set({ playing: time.playing, t: time.t, D: time.live ? 0 : time.D, scrubbable: time.scrubbable && !time.live, speed: time.speed }); }

  // A case starts from its own basic state; an example adds its preset on top.
  function load(caseId, exId, extra = {}) {
    const c = caseOf(caseId), e = exOf(c, exId);
    for (const k of Object.keys(state)) delete state[k];
    Object.assign(state, structuredClone(def.defaults), structuredClone(c.set || {}), structuredClone(e?.set || {}), extra, { case: c.id, example: e?.id || '' });
    time.t = 0; time.live = false; time.speed = extra.speed ?? e?.speed ?? c.speed ?? def.speed ?? 1; delete state.speed;
    impl.changed?.('*');
    panel.sync(); explain?.show(c.id, e?.id);
    stage.preset(camOf());
    impl.update(0); stage.requestRender(); bar(); writeUrl();
  }
  const camOf = () => { const c = caseOf(state.case); return def.camOf?.(state) || exOf(c, state.example)?.cam || c.cam || def.cam || 'iso'; };

  function onChange(id) {
    impl.changed?.(id);
    panel.sync(); ctx.requestUpdate(); writeUrl();
  }

  function urlParams() {
    const c = caseOf(state.case), e = exOf(c, state.example), ref = { ...def.defaults, ...(c.set || {}), ...(e?.set || {}) }, diff = {};
    for (const k of Object.keys(def.defaults)) if (JSON.stringify(state[k]) !== JSON.stringify(ref[k])) diff[k] = state[k];
    if (time.speed !== (e?.speed ?? c.speed ?? def.speed ?? 1)) diff.speed = time.speed;
    return { case: c.id, example: e?.id, diff };
  }
  function writeUrl() { onUrl(urlParams()); }

  impl = def.setup(ctx);
  let explain = null;
  panel = createPanel(el.panel, { cases: def.cases, onPick: (c, e) => load(c, e), controls: def.controls, display: def.display }, state, onChange);
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

  // theory drawer: pre-rendered theory from <template id="explain-<id>">, filtered to the case and example
  const tpl = document.getElementById(`explain-${def.id}`);
  el.explain.innerHTML = `<button class="btn close" aria-label="Close">✕</button><h2>${def.title}</h2>${tpl ? tpl.innerHTML : ''}`;
  explain = initExplain(el.explain, (k) => { ctx.highlight = k; impl.highlight?.(k); ctx.requestUpdate(); });

  // initial state from the URL
  const keep = {};
  for (const [k, v] of Object.entries(url.params || {})) {
    if (!(k in def.defaults) && k !== 'speed') continue;
    keep[k] = v === 'true' ? true : v === 'false' ? false : Number.isFinite(Number(v)) && v !== '' ? Number(v) : v;
  }
  load(url.params?.case, url.params?.ex, keep);
  stage.preset(camOf(), { instant: true });
  if (def.ortho) stage.toggleOrtho();
  if (def.plain) { stage.grid.visible = false; stage.axes.visible = false; }
  // timeless labs (a graph you shape by hand) have no clock: no play bar, render on demand only
  if (def.timeless) { el.playbar.hidden = true; time.playing = false; }
  setPlaying(time.playing);

  return {
    def, ctx,
    toggleExplain: () => explain.toggle(),
    resetView: () => stage.preset(camOf()),
    urlParams,
    theme() { stage.setTheme(); impl.theme?.(); for (const p of Object.values(plots)) p.redraw(); ctx.requestUpdate(); },
    key(e) {
      if (e.key === ' ' && !def.timeless && !still) { e.preventDefault(); setPlaying(!time.playing); }
      else if (e.key === 'r' || e.key === 'R') load(state.case, state.example);
      else if (e.key === 'Escape') explain.close();
      else if (e.key.length === 1 && '1234'.includes(e.key)) stage.preset(['front', 'side', 'top', 'iso'][Number(e.key) - 1]);
    },
    // test hooks (smoke, capture)
    get scenarios() { return def.cases.flatMap((c) => [c.id, ...(c.examples || []).map((e) => `${c.id}/${e.id}`)]); },
    load: (id) => load(...id.split('/')), setPlaying, stage, state, get timings() { return ctx.timings; }, gif: def.gif,
    dispose() { impl.dispose?.(); stage.dispose(); root.innerHTML = ''; },
  };
}
