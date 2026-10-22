// A recorded trace (an algorithm or a logic circuit run step by step in C++, see visualizations/) shown as a
// lab: each input is a case, the play bar walks the steps, and the trace's own renderers draw the view next
// to the source code with the current line highlighted. Renderers are classic scripts on window.RENDERERS.
const STEP = 0.8; // seconds per step at speed 1
// a few input names were recorded in Italian
const EN = { casuale: 'random', 'quasi ordinato': 'nearly sorted', 'invertito (caso peggiore)': 'reversed (worst case)', 'con duplicati': 'with duplicates', 'gia ordinato': 'already sorted' };

// C++ colouring like an editor: comments, strings, keywords, types, numbers, function names
const KW = new Set('if else for while do return break continue switch case default new delete const static struct class public private protected using namespace template typename auto true false nullptr sizeof typedef enum'.split(' '));
const TY = new Set('int bool char void double float long short unsigned size_t string vector map set pair queue stack deque std'.split(' '));
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
function cpp(line) {
  if (!line) return ' ';
  return line.replace(/(\/\/.*$)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(#\s*\w+)|\b(\d+(?:\.\d+)?)\b|([A-Za-z_]\w*)(\s*\()?|([&<>])/g, (m, com, str, pre, num, id, call, ch) => {
    if (com) return `<i class="c-com">${esc(com)}</i>`; if (str) return `<i class="c-str">${esc(str)}</i>`; if (pre) return `<i class="c-pre">${esc(pre)}</i>`; if (num) return `<i class="c-num">${num}</i>`;
    if (ch) return esc(ch);
    if (KW.has(id)) return `<i class="c-kw">${id}</i>${call || ''}`; if (TY.has(id)) return `<i class="c-ty">${id}</i>${call || ''}`;
    return call ? `<i class="c-fn">${id}</i>${call}` : id;
  });
}

// A circuit-only trace gets a timing diagram derived from its own circuit snapshots: every pin and gate
// output, step by step, with all inputs one after the other (a combinational truth table becomes a
// waveform; the cursor sits on the current input's step).
function deriveWaves(trace) {
  const has = trace.view === 'waveform' || (trace.panels || []).some((p) => p.view === 'waveform');
  if (has || !trace.inputs[0].steps[0]?.circuit) return;
  const all = trace.inputs.flatMap((inp) => inp.steps), first = all[0].circuit;
  const names = [...first.pins.filter((p) => p.side === 'left').map((p) => ['pin', p.name, 'data']), ...first.gates.map((g) => ['gate', g.id, 'data', g.type]), ...first.pins.filter((p) => p.side !== 'left').map((p) => ['pin', p.name, 'out'])].slice(0, 14);
  const val = (c, [k, n]) => (k === 'pin' ? c.pins.find((p) => p.name === n)?.bit : c.gates.find((g) => g.id === n)?.out) ?? 0;
  const signals = names.map((nm) => ({ name: nm[1], kind: nm[2], values: all.map((st) => val(st.circuit, nm)) }));
  let t0 = 0; const markers = [];
  trace.inputs.forEach((inp, ii) => { if (trace.inputs.length > 1) markers.push({ t: t0, label: `${ii + 1}` }); inp.steps.forEach((st, k) => { st.wave = { t: t0 + k, signals, markers }; }); t0 += inp.steps.length; });
  trace.panels = [...(trace.panels || []), { view: 'waveform', title: trace.inputs.length > 1 ? 'Every signal, all inputs one after the other' : 'Every signal, step by step' }];
}

export function traceLab(trace, { id, title, group, code = true }) {
  if (!code) deriveWaves(trace);
  const inputs = trace.inputs;
  return {
    id, title, group, size: 1, ortho: true, plain: true, cam: 'top', duration: inputs[0].steps.length * STEP, loop: false,
    defaults: { input: 0 },
    cases: inputs.map((inp, i) => ({ id: `in${i}`, label: EN[inp.label] || inp.label, set: { input: i }, examples: [] })),
    controls: [], hud: [],
    setup(ctx) {
      const { state, time } = ctx, view = ctx.el.stage.parentElement;
      const root = document.createElement('div'); root.className = 'trace'; view.append(root);
      if (!code) root.classList.add('nocode');
      if (trace.view === 'waveform') root.classList.add('wide'); // a timing diagram is long: give it the full width
      root.innerHTML = `<section class="tcode"><h3>C++ source <span class="fn"></span></h3><pre></pre></section>
        <section class="tview"><div class="tbadges"></div><div class="tcard tmain"><div class="viewbox tprimary"></div><div class="tlegend"></div></div>
        <div class="tpanels"></div><div class="tcard tvars"></div><div class="tnote"></div></section>`;
      const $ = (s) => root.querySelector(s), pre = $('pre');
      pre.innerHTML = trace.displaySource.map((l, i) => `<div class="row"><span class="gut">${i + 1}</span><span></span></div>`).join('');
      [...pre.children].forEach((r, i) => { r.lastChild.innerHTML = cpp(trace.displaySource[i]); });
      $('.tbadges').innerHTML = [trace.chapter.replace(/^\d+\s*·\s*/, ''), `time ${trace.complexity.time}`, `space ${trace.complexity.space}`].map((b) => `<span>${b}</span>`).join('');
      let primary = null, panels = [], shown = -1;
      const steps = () => inputs[state.input].steps;
      const make = (viewId, box, opts) => { const f = window.RENDERERS?.[viewId]; if (!f) { box.textContent = `no renderer for “${viewId}”`; return null; } const r = f(); r.mount(box, trace, opts); return r; };
      const seek = (i) => { ctx.setPlaying(false); time.t = i * STEP + 1e-3; ctx.requestUpdate(); };
      function mountViews() {
        const list = steps(), layout = inputs[state.input].layout || null;
        $('.tprimary').innerHTML = ''; primary = make(trace.view, $('.tprimary'), { steps: list, compact: false, layout, seek });
        $('.tpanels').innerHTML = ''; panels = [];
        for (const p of trace.panels || []) { const card = document.createElement('div'); card.className = 'tcard'; card.innerHTML = `<h3></h3><div class="viewbox"></div>`; card.firstChild.textContent = p.title || p.view; $('.tpanels').append(card);
          const r = make(p.view, card.lastChild, { steps: list, compact: true, source: p.source, marks: p.marks, layout, seek }); if (r) panels.push({ r, source: p.source }); }
        $('.tlegend').innerHTML = (primary?.legend?.() || []).map((e) => `<span><i style="background:${e.color}"></i>${e.label}</span>`).join('');
        shown = -1;
      }
      const lineIndex = (line) => { const m = trace.lineMap; for (let l = line; l > 0; l--) if (m[l] !== undefined) return m[l]; return -1; };
      function render(k) {
        const list = steps(), step = list[k], prev = k > 0 ? list[k - 1] : null, dir = k >= shown ? 1 : -1;
        pre.querySelector('.cur')?.classList.remove('cur'); const row = pre.children[lineIndex(step.line)];
        if (row) { row.classList.add('cur'); const rb = row.getBoundingClientRect(), pb = pre.getBoundingClientRect(); if (rb.top < pb.top + 24 || rb.bottom > pb.bottom - 24) pre.scrollTop += rb.top - pb.top - pb.height / 2; }
        $('.fn').textContent = step.function ? `· ${step.function}()` : '';
        const pv = prev?.vars || {}, vars = Object.entries(step.vars || {}).map(([k2, v]) => `<span class="var${pv[k2] !== v ? ' changed' : ''}"><b>${k2}</b> = ${v}</span>`), cnt = Object.entries(step.counters || {}).map(([k2, v]) => `<span class="counter">${k2}: ${v}</span>`);
        $('.tvars').innerHTML = `<span class="counter">step ${k + 1} / ${list.length}</span>${vars.join('')}${cnt.join('')}`;
        $('.tnote').textContent = step.note || '';
        primary?.render(step, prev, { dir }); for (const p of panels) p.r.render(step, prev, { dir, source: p.source });
        shown = k;
      }
      return {
        changed() { ctx.setDuration(steps().length * STEP); time.stepDt = STEP; mountViews(); },
        update() { const n = steps().length, k = Math.max(0, Math.min(n - 1, Math.floor(time.t / STEP + 1e-6))); if (k !== shown) render(k); },
        dispose() { root.remove(); },
      };
    },
  };
}
