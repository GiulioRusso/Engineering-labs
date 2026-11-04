// Block diagrams drawn in the scene plane: the physical blocks of a system (antenna, filters, amplifiers,
// mixers, oscillators, converters, processors…) as their standard symbols, wires with arrows, and small
// signal tiles that show the waveform on a wire. A block can be lit (the stage being explained).
// Usage: const bd = createBlocks(ctx); bd.begin(); const a = bd.block('amp', [x, y], { label: 'LNA' });
//        bd.wire(a.r, b.l); bd.wave([x, y], samples, { color: '--c-B' }); …; bd.end();
// block() returns its ports { l, r, t, b, c } (points in world units) to route wires between.
import { createCurve } from './curve.js';

const SIZE = { box: [0.78, 0.44], amp: [0.5, 0.46], mixer: [0.4, 0.4], lo: [0.4, 0.4], sum: [0.34, 0.34], filter: [0.56, 0.44], adc: [0.62, 0.42], antenna: [0.4, 0.5], circ: [0.42, 0.42], node: [0.08, 0.08], display: [0.7, 0.5], memory: [0.7, 0.44], neuron: [0.5, 0.5] };

export function createBlocks(ctx, { labels: nLabels = 64, width = 1.6 } = {}) {
  const { stage, scene } = ctx, ink = createCurve(stage, { max: 3000, width, color: '--ink' }), dim = createCurve(stage, { max: 2000, width: 1, color: '--ink-dim' }), on = createCurve(stage, { max: 1200, width: width + 1.4, color: '--accent' });
  const traces = {}, trace = (c) => (traces[c] ??= createCurve(stage, { max: 6000, width: 1.5, color: c })), pool = [];
  for (let i = 0; i < nLabels; i++) { const l = ctx.label('', 'tick'); scene.add(l); l.visible = false; pool.push(l); }
  let S = { ink: [], dim: [], on: [] }, T = {}, nl = 0, visible = true;
  const push = (arr, a, b, z = 0.004) => arr.push(a[0], a[1], z, b[0], b[1], z);
  const poly = (arr, pts, closed = false) => { for (let i = 0; i + 1 < pts.length; i++) push(arr, pts[i], pts[i + 1]); if (closed) push(arr, pts[pts.length - 1], pts[0]); };
  const circle = (arr, c, r, a0 = 0, a1 = 2 * Math.PI, n = 20) => { const p = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; p.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]); } poly(arr, p); };
  const text = (t, p, cls = '') => { if (!t || nl >= pool.length) return; const l = pool[nl++]; l.element.textContent = t; l.element.className = `label3d tick${cls ? ` ${cls}` : ''}`; l.position.set(p[0], p[1], 0.01); l.visible = visible; };
  const sine = (arr, x0, x1, y, a, cyc = 1.5, n = 16) => { const p = []; for (let i = 0; i <= n; i++) p.push([x0 + (x1 - x0) * i / n, y + a * Math.sin(2 * Math.PI * cyc * i / n)]); poly(arr, p); };
  const rect = (arr, x, y, w, h) => poly(arr, [[x - w / 2, y - h / 2], [x + w / 2, y - h / 2], [x + w / 2, y + h / 2], [x - w / 2, y + h / 2]], true);

  const api = {
    begin() { S = { ink: [], dim: [], on: [] }; T = {}; nl = 0; pool.forEach((l) => { l.visible = false; }); return api; },
    end() { ink.segments(S.ink); dim.segments(S.dim); on.segments(S.on); for (const [c, k] of Object.entries(traces)) k.segments(T[c] || []); return api; },
    // kind: box | amp | mixer | lo | sum | filter | adc | dac | antenna | circ | node | display | memory | clock | phase | neuron
    // o: { label (under the block), t (text inside), on (lit), w, h, type ('lp'|'bp'|'hp' for filters), labelAt ('t'|'b'|'l'|'r'), flip (amp/adc pointing left) }
    block(kind, c, o = {}) {
      const [x, y] = c, [w0, h0] = SIZE[kind] || SIZE.box, w = o.w ?? w0, h = o.h ?? h0, a = o.on ? S.on : S.ink, d = S.dim, dir = o.flip ? -1 : 1;
      const P = { c: [x, y], l: [x - w / 2, y], r: [x + w / 2, y], t: [x, y + h / 2], b: [x, y - h / 2] };
      if (kind === 'amp') { poly(a, [[x - dir * w / 2, y - h / 2], [x + dir * w / 2, y], [x - dir * w / 2, y + h / 2]], true); if (o.t) text(o.t, [x - dir * w * 0.12, y]); }
      else if (kind === 'mixer' || kind === 'sum') { const r = w / 2; circle(a, c, r); const k = r * (kind === 'mixer' ? 0.7 * Math.SQRT1_2 : 0.6); if (kind === 'mixer') { push(a, [x - k, y - k], [x + k, y + k]); push(a, [x - k, y + k], [x + k, y - k]); } else { push(a, [x - k, y], [x + k, y]); push(a, [x, y - k], [x, y + k]); } }
      else if (kind === 'lo') { circle(a, c, w / 2); sine(a, x - w * 0.3, x + w * 0.3, y, h * 0.14, 1); }
      else if (kind === 'filter') { rect(a, x, y, w, h); const ys = [y + h * 0.27, y, y - h * 0.27], block = { lp: [1, 1, 0], hp: [0, 1, 1], bp: [1, 0, 1] }[o.type || 'bp'];
        ys.forEach((yy, i) => { sine(d, x - w * 0.3, x + w * 0.3, yy, h * 0.06, [3, 2, 1][i]); if (block[i]) push(a, [x - w * 0.12, yy - h * 0.1], [x + w * 0.12, yy + h * 0.1]); }); }
      else if (kind === 'adc' || kind === 'dac') { const p = w * 0.22; poly(a, dir > 0 ? [[x - w / 2, y - h / 2], [x + w / 2 - p, y - h / 2], [x + w / 2, y], [x + w / 2 - p, y + h / 2], [x - w / 2, y + h / 2]] : [[x + w / 2, y - h / 2], [x - w / 2 + p, y - h / 2], [x - w / 2, y], [x - w / 2 + p, y + h / 2], [x + w / 2, y + h / 2]], true); text(o.t ?? kind.toUpperCase(), [x - dir * p / 3, y]); }
      else if (kind === 'antenna') { const yb = y - h / 2, yt = y + h / 2; push(a, [x, yb], [x, yt - h * 0.1]); poly(a, [[x - w / 2, yt], [x, yt - h * 0.45], [x + w / 2, yt]]); push(a, [x - w / 2, yt], [x + w / 2, yt]); P.b = [x, yb]; P.l = P.r = P.b; }
      else if (kind === 'circ') { const r = w / 2; circle(a, c, r); circle(a, c, r * 0.55, Math.PI * 0.85, Math.PI * 2.55, 16); const e = [x + r * 0.55 * Math.cos(Math.PI * 2.55), y + r * 0.55 * Math.sin(Math.PI * 2.55)]; push(a, e, [e[0] - 0.06, e[1] + 0.03]); push(a, e, [e[0] - 0.01, e[1] + 0.07]); }
      else if (kind === 'node') { circle(a, c, 0.04, 0, 2 * Math.PI, 8); circle(a, c, 0.02, 0, 2 * Math.PI, 6); }
      else if (kind === 'display') { rect(a, x, y + h * 0.06, w, h * 0.88); rect(d, x, y + h * 0.06, w * 0.82, h * 0.66); push(a, [x - w * 0.15, y - h / 2], [x + w * 0.15, y - h / 2]); if (o.t) text(o.t, [x, y + h * 0.06]); }
      else if (kind === 'memory') { rect(a, x, y, w, h); const yc = y - h * 0.22; push(d, [x - w / 2, yc + h * 0.14], [x + w / 2, yc + h * 0.14]); for (let i = 1; i < 8; i++) push(d, [x - w / 2 + w * i / 8, y - h / 2], [x - w / 2 + w * i / 8, yc + h * 0.14]); if (o.t) text(o.t, [x, y + h * 0.16]); }
      else if (kind === 'clock') { rect(a, x, y, w, h); const p = [], n = 3, x0 = x - w * 0.34, s = w * 0.68 / (2 * n), lo = y - h * 0.16, hi = y + h * 0.16; let xx = x0; p.push([xx, lo]); for (let i = 0; i < n; i++) { p.push([xx, hi], [xx + s, hi], [xx + s, lo], [xx + 2 * s, lo]); xx += 2 * s; } poly(d, p); if (o.t) text(o.t, [x, y + h / 2 + 0.12]); }
      else if (kind === 'neuron') { circle(a, c, w / 2); if (o.t) text(o.t, c); }
      else { rect(a, x, y, w, h); if (kind === 'phase' && !o.t) text('90°', c); if (o.t) text(o.t, c); }
      if (o.label) { const at = o.labelAt || 'b', off = 0.14, hx = w / 2 + 0.08 + 0.035 * o.label.length, sx = at.includes('l') ? -1 : at.includes('r') ? 1 : 0, sy = at.includes('t') ? 1 : at.includes('b') ? -1 : 0;
        text(o.label, [x + sx * (sy ? hx - 0.04 : hx), y + sy * (sx ? h / 2 + 0.06 : h / 2 + off)], o.on ? 'blk on' : 'blk'); }
      return P;
    },
    // wire through points; arrow on the last segment unless o.arrow === false; o.on lights it; o.dashed for a control line
    wire(...args) {
      const o = typeof args[args.length - 1] === 'object' && !Array.isArray(args[args.length - 1]) ? args.pop() : {}, arr = o.on ? S.on : o.dim ? S.dim : S.ink;
      if (o.dashed) { for (let i = 0; i + 1 < args.length; i++) { const [a, b] = [args[i], args[i + 1]], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / 0.08)); for (let k = 0; k < n; k += 2) push(arr, [a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n], [a[0] + (b[0] - a[0]) * Math.min(n, k + 1) / n, a[1] + (b[1] - a[1]) * Math.min(n, k + 1) / n]); } }
      else poly(arr, args);
      if (o.arrow !== false && args.length > 1) { const b = args[args.length - 1], a = args[args.length - 2], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, s = 0.075; push(arr, b, [b[0] - s * ux + s * 0.6 * uy, b[1] - s * uy - s * 0.6 * ux]); push(arr, b, [b[0] - s * ux - s * 0.6 * uy, b[1] - s * uy + s * 0.6 * ux]); }
      if (o.label) { const m = o.labelAt ?? Math.floor((args.length - 1) / 2), a = args[m], b = args[Math.min(args.length - 1, m + 1)]; text(o.label, [(a[0] + b[0]) / 2 + (o.dx || 0), (a[1] + b[1]) / 2 + (o.dy ?? 0.12)], o.on ? 'on' : ''); }
      return api;
    },
    // a signal tile centred at c: a thin frame and the waveform(s), each scaled by o.norm or the largest |value| of
    // all traces; series: array of numbers, or [{ y, color, stems }]; o: { w, h, cap (text under), on, zero }
    wave(c, series, o = {}) {
      const [x, y] = c, w = o.w ?? 0.78, h = o.h ?? 0.36, L = Array.isArray(series[0]) || typeof series[0] === 'object' && series[0] && 'y' in series[0] ? series : [{ y: series, color: o.color || '--c-B' }];
      const list = L.map((s) => (Array.isArray(s) ? { y: s, color: o.color || '--c-B' } : s)), m = o.norm ?? Math.max(1e-12, ...list.flatMap((s) => Array.from(s.y, Math.abs)));
      rect(o.on ? S.on : S.dim, x, y, w, h); if (o.zero !== false) push(S.dim, [x - w / 2, y], [x + w / 2, y]);
      const yOf = (v) => y + (h / 2 - 0.02) * Math.max(-1, Math.min(1, v / m));
      for (const s of list) { const arr = (T[s.color] ??= []), n = s.y.length, xs = (i) => x - w / 2 + 0.02 + (w - 0.04) * (n > 1 ? i / (n - 1) : 0.5);
        if (s.stems) for (let i = 0; i < n; i++) { arr.push(xs(i), y, 0.006, xs(i), yOf(s.y[i]), 0.006); }
        else for (let i = 0; i + 1 < n; i++) arr.push(xs(i), yOf(s.y[i]), 0.006, xs(i + 1), yOf(s.y[i + 1]), 0.006); trace(s.color); }
      if (o.cap) text(o.cap, [x, y - h / 2 - 0.11], o.on ? 'on' : '');
      return { l: [x - w / 2, y], r: [x + w / 2, y], t: [x, y + h / 2], b: [x, y - h / 2] };
    },
    // a free polyline in a trace colour (an IQ trajectory, an envelope…)
    path(pts, color = '--c-B') { const arr = (T[color] ??= []); for (let i = 0; i + 1 < pts.length; i++) arr.push(pts[i][0], pts[i][1], 0.006, pts[i + 1][0], pts[i + 1][1], 0.006); trace(color); return api; },
    // a token on a path (the signal travelling): a small lit hexagon at p
    token(p, r = 0.06) { circle(S.on, p, r, 0, 2 * Math.PI, 6); return api; },
    frame(c, w, h, o = {}) { if (o.dashed) { const [x, y] = c, pts = [[x - w / 2, y - h / 2], [x + w / 2, y - h / 2], [x + w / 2, y + h / 2], [x - w / 2, y + h / 2], [x - w / 2, y - h / 2]]; api.wire(...pts, { dashed: true, arrow: false, dim: true }); } else rect(S.dim, c[0], c[1], w, h); if (o.label) text(o.label, [c[0] - w / 2 + 0.06 + 0.034 * o.label.length, c[1] + h / 2 - 0.12]); return api; },
    text(t, p, cls) { text(t, p, cls); return api; },
    show(v) { visible = v; for (const k of [ink, dim, on, ...Object.values(traces)]) k.object.visible = v; if (!v) pool.forEach((l) => { l.visible = false; }); return api; },
    theme() { for (const k of [ink, dim, on, ...Object.values(traces)]) k.theme(); },
  };
  return api;
}
