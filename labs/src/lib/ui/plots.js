// Tiny Canvas 2D plotting kit: line series on one or two y axes, SI-prefixed ticks, a cursor.
// Colours are CSS variable names, resolved at draw time so the theme toggle just redraws.
import { cssVar } from './theme.js';
import { prefixFor } from './format.js';

function niceTicks(lo, hi, n = 4) {
  const span = hi - lo || 1, raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-6; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  return out;
}

function range(series, axis, xlim) {
  let lo = Infinity, hi = -Infinity;
  for (const s of series) {
    if ((s.axis || 0) !== axis) continue;
    for (let i = 0; i < s.x.length; i++) {
      if (s.x[i] < xlim[0] || s.x[i] > xlim[1]) continue;
      const v = s.y[i];
      if (Number.isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    }
  }
  if (!(hi >= lo)) return [-1, 1];
  if (hi - lo < 1e-30) { const d = Math.abs(hi) || 1e-12; return [lo - d, hi + d]; }
  const pad = (hi - lo) * 0.08;
  return [lo - pad, hi + pad];
}

export function createPlot(container, opts) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', opts.title);
  container.append(canvas);
  const ctx = canvas.getContext('2d');
  let last = null, w = 0, h = 0;
  new ResizeObserver(() => {
    const r = container.getBoundingClientRect(), dpr = Math.min(devicePixelRatio, 2);
    w = r.width; h = r.height;
    canvas.width = Math.max(1, Math.round(w * dpr)); canvas.height = Math.max(1, Math.round(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (last) draw(last);
  }).observe(container);

  function draw(d) {
    last = d;
    if (!w || !h) return;
    const ink = cssVar('--ink'), dim = cssVar('--ink-dim'), line = cssVar('--line');
    const two = d.series.some((s) => s.axis === 1);
    const m = { l: 46, r: two ? 46 : 10, t: 20, b: 22 };
    const pw = w - m.l - m.r, ph = h - m.t - m.b;
    ctx.clearRect(0, 0, w, h);
    ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';

    const xl = d.xlim, X = (x) => m.l + (x - xl[0]) / (xl[1] - xl[0]) * pw;
    const yr = [d.ylim || range(d.series, 0, xl), two ? d.y2lim || range(d.series, 1, xl) : null];
    const Y = (v, a) => m.t + (1 - (v - yr[a][0]) / (yr[a][1] - yr[a][0])) * ph;

    if (d.shade) {
      ctx.fillStyle = cssVar('--panel-2');
      ctx.fillRect(X(d.shade[0]), m.t, X(d.shade[1]) - X(d.shade[0]), ph);
    }
    // grid + ticks
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.fillStyle = dim;
    const [xf, xp] = opts.xUnit ? prefixFor(Math.max(Math.abs(xl[0]), Math.abs(xl[1])) * (opts.xScale || 1)) : [1, ''];
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (const t of niceTicks(xl[0], xl[1], Math.max(2, Math.floor(pw / 70)))) {
      const x = X(t); ctx.beginPath(); ctx.moveTo(x, m.t); ctx.lineTo(x, m.t + ph); ctx.stroke();
      ctx.fillText(String(Number((t * (opts.xScale || 1) / xf).toPrecision(3))), x, m.t + ph + 4);
    }
    ctx.textAlign = 'right'; ctx.fillText(`${opts.xLabel}${xp || opts.xUnit ? ` (${xp}${opts.xUnit})` : ''}`, m.l + pw, 3);
    const axisLabels = [];
    for (let a = 0; a < (two ? 2 : 1); a++) {
      // unitless axes are not prefix-scaled (a bare 'm' would read as a unit)
      const [f, p] = (a ? opts.y2Unit : opts.yUnit) ? prefixFor(Math.max(Math.abs(yr[a][0]), Math.abs(yr[a][1]))) : [1, ''];
      ctx.textAlign = a ? 'left' : 'right'; ctx.textBaseline = 'middle';
      for (const t of niceTicks(yr[a][0], yr[a][1], Math.max(2, Math.floor(ph / 32)))) {
        const y = Y(t, a);
        if (!a) { ctx.beginPath(); ctx.moveTo(m.l, y); ctx.lineTo(m.l + pw, y); ctx.stroke(); }
        ctx.fillText(String(Number((t / f).toPrecision(3))), a ? m.l + pw + 4 : m.l - 4, y);
      }
      const unit = (a ? opts.y2Unit : opts.yUnit) || '';
      axisLabels.push(unit ? `${p}${unit}` : '');
    }
    // zero line
    if (yr[0][0] < 0 && yr[0][1] > 0) {
      ctx.strokeStyle = dim; ctx.beginPath(); ctx.moveTo(m.l, Y(0, 0)); ctx.lineTo(m.l + pw, Y(0, 0)); ctx.stroke();
    }
    // series
    ctx.save();
    ctx.beginPath(); ctx.rect(m.l, m.t, pw, ph); ctx.clip();
    for (const s of d.series) {
      const a = s.axis || 0;
      ctx.strokeStyle = cssVar(s.color); ctx.lineWidth = s.width || 1.6; ctx.setLineDash(s.dash || []);
      ctx.beginPath();
      let pen = false;
      for (let i = 0; i < s.x.length; i++) {
        const v = s.y[i];
        if (!Number.isFinite(v)) { pen = false; continue; }
        const x = X(s.x[i]), y = Y(v, a);
        pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true;
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);
    if (d.cursor != null) {
      ctx.strokeStyle = ink; ctx.lineWidth = 1; ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.moveTo(X(d.cursor), m.t); ctx.lineTo(X(d.cursor), m.t + ph); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    for (const mk of d.markers || []) {
      ctx.fillStyle = cssVar(mk.color);
      ctx.beginPath(); ctx.arc(X(mk.x), Y(mk.y, mk.axis || 0), 3.5, 0, 2 * Math.PI); ctx.fill();
    }
    ctx.restore();
    // title with coloured series names
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    let x = 4;
    ctx.fillStyle = ink; ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText(opts.title, x, 3); x += ctx.measureText(opts.title).width + 10;
    ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    for (const s of d.series) {
      if (!s.label) continue;
      ctx.fillStyle = cssVar(s.color);
      const u = axisLabels[s.axis || 0], lab = u ? `${s.label} [${u}]` : s.label;
      if (x + ctx.measureText(lab).width > w - m.r - 90) break;
      ctx.fillText(lab, x, 4); x += ctx.measureText(lab).width + 10;
    }
  }
  return { draw, redraw: () => last && draw(last) };
}
