// Block schema in the plots dock: the system behind the charts (a feedback loop, a modulator, a coding
// chain…) as an SVG block diagram on a grid, with live signal tiles on the wires and lit blocks.
// Colours are CSS variables, so the theme switch needs nothing. Usage (from a lab's setup):
//   const sch = ctx.schema({ items: [{ id, kind, t, label, c, r, signs }], wires: [[from, to, opts]], tiles: [{ id, wire, cap }] });
//   sch.update({ lit: ['K'], tiles: { e: [..] | [{ y, color, stems }] }, text: { K: 'K = 5' } });
// kinds: box amp mixer sum lo filter(type lp|bp|hp) adc dac antenna node display int (∫) ; c, r: grid column, row
// wire opts: { loop: true } feedback under the diagram into the target's bottom; { v: true } vertical; label
// a long signal reduced to n points for a tile (dense carriers keep every sample: pass them whole)
export const thin = (a, n = 90) => (a.length <= n ? Array.from(a) : Array.from({ length: n }, (_, i) => a[Math.floor(i * (a.length - 1) / (n - 1))]));
const GAP = 60, ROW = 76, Y0 = 50, FS = 10.5;
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
const SIZE = { amp: [34, 30], mixer: [26, 26], sum: [24, 24], lo: [26, 26], filter: [38, 30], adc: [44, 28], dac: [44, 28], antenna: [24, 30], node: [6, 6], display: [40, 32], int: [34, 30] };

export function createSchema(host, spec) {
  const el = document.createElement('div'); el.className = 'schema'; el.setAttribute('role', 'img'); el.setAttribute('aria-label', spec.title || 'block diagram');
  host.prepend(el);
  const items = Object.fromEntries(spec.items.map((it) => [it.id, it])), text = {};
  const size = (it) => (it.kind === 'box' || !SIZE[it.kind] ? [Math.max(44, String(text[it.id] ?? it.t ?? '').length * FS * 0.6 + 16), it.h || 30] : SIZE[it.kind]);
  let lit = new Set(), tiles = {};

  function layout() {
    const cols = [], rows = new Set();
    for (const it of spec.items) { const lb = text[`${it.id}:label`] ?? it.label ?? ''; cols[it.c] = Math.max(cols[it.c] || 0, size(it)[0], lb.length * FS * 0.6 - (spec.gap ?? GAP) + 12); rows.add(it.r || 0); }
    const cx = []; let x = 14; for (let c = 0; c < cols.length; c++) { const w = cols[c] || 0; cx[c] = x + w / 2; x += w + (spec.gap ?? GAP); }
    const P = {};
    for (const it of spec.items) { const [w, h] = size(it), X = cx[it.c] + (it.dx || 0), Y = Y0 + (it.r || 0) * ROW + (it.dy || 0); P[it.id] = { x: X, y: Y, w, h, l: [X - w / 2, Y], r: [X + w / 2, Y], t: [X, Y - h / 2], b: [X, Y + h / 2] }; }
    return { P, W: x - (spec.gap ?? GAP) + 14, H: Y0 + Math.max(...rows) * ROW + 62 };
  }
  function symbol(it, p, on) {
    const { x, y, w, h } = p, c = on ? 'on' : '', T = (s, dx = 0, dy = 0, cls = '') => `<text x="${x + dx}" y="${y + dy + 3.6}" class="${cls}">${esc(s)}</text>`, k = it.kind;
    if (k === 'amp') return `<polygon class="${c}" points="${x - w / 2},${y - h / 2} ${x + w / 2},${y} ${x - w / 2},${y + h / 2}"/>${it.t ? T(it.t, -w * 0.14) : ''}`;
    if (k === 'mixer' || k === 'sum') { const r = w / 2, q = r * 0.62; return `<circle class="${c}" cx="${x}" cy="${y}" r="${r}"/>` + (k === 'mixer' ? `<path class="${c}" d="M${x - q * 0.75} ${y - q * 0.75}L${x + q * 0.75} ${y + q * 0.75}M${x - q * 0.75} ${y + q * 0.75}L${x + q * 0.75} ${y - q * 0.75}"/>` : T(it.t || 'Σ', 0, 0.5)) + Object.entries(it.signs || {}).map(([s, v]) => T(v, s === 'l' ? -r - 6 : s === 'r' ? r + 6 : -8, s === 't' ? -r - 4 : s === 'b' ? r + 6 : -9, 'sg')).join(''); }
    if (k === 'lo') { const r = w / 2; return `<circle class="${c}" cx="${x}" cy="${y}" r="${r}"/><path class="thin" d="M${x - r * 0.6} ${y} q${r * 0.3} ${-r * 0.7} ${r * 0.6} 0 t${r * 0.6} 0"/>`; }
    if (k === 'filter') { const kill = { lp: [1, 1, 0], hp: [0, 1, 1], bp: [1, 0, 1] }[it.type || 'lp']; let s = `<rect class="${c}" x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="2"/>`; [-8, 0, 8].forEach((d, i) => { const a = w * 0.32, n = [3, 2, 1][i]; s += `<path class="thin" d="M${x - a} ${y + d}${Array.from({ length: n * 2 }, (_, j) => ` q${a / (2 * n)} ${(j % 2 ? 2.5 : -2.5)} ${a / n} 0`).join('')}"/>`; if (kill[i]) s += `<path class="${c}" d="M${x - 5} ${y + d + 3}L${x + 5} ${y + d - 3}"/>`; }); return s; }
    if (k === 'adc' || k === 'dac') { const q = 9; return `<polygon class="${c}" points="${x - w / 2},${y - h / 2} ${x + w / 2 - q},${y - h / 2} ${x + w / 2},${y} ${x + w / 2 - q},${y + h / 2} ${x - w / 2},${y + h / 2}"/>${T(it.t || k.toUpperCase(), -3)}`; }
    if (k === 'antenna') return `<path class="${c}" d="M${x} ${y + h / 2}V${y - h / 2 + 4}M${x - w / 2} ${y - h / 2}L${x} ${y}L${x + w / 2} ${y - h / 2}Z"/>`;
    if (k === 'node') return `<circle class="dot" cx="${x}" cy="${y}" r="3"/>`;
    if (k === 'display') return `<rect class="${c}" x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h - 4}" rx="2"/><rect class="thin" x="${x - w / 2 + 4}" y="${y - h / 2 + 4}" width="${w - 8}" height="${h - 12}"/>${it.t ? T(it.t, 0, -2) : ''}`;
    if (k === 'int') return `<rect class="${c}" x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="2"/>${T(it.t || '∫', 0, 0.5, 'big')}`;
    return `<rect class="${c}" x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="2"/>${T(text[it.id] ?? it.t ?? '')}`;
  }
  function route(P, [a, b, o = {}], H) {
    const A = P[a], B = P[b];
    if (o.v) { const down = B.y > A.y; return [down ? A.b : A.t, down ? B.t : B.b]; }
    if (o.loop) { const yb = H - 18, xr = A.r[0] + (o.out ?? 14); return [A.r, [xr, A.y], [xr, yb], [B.x, yb], B.b]; }
    const side = B.x >= A.x ? A.r : A.l;
    if (o.up) return [side, [B.x, A.y], B.b];        // into the bottom of a block (a summing junction, a mixer's LO)
    if (o.down) return [side, [B.x, A.y], B.t];
    if (Math.abs(A.y - B.y) < 1) return [A.r, B.l];
    const mx = (A.r[0] + B.l[0]) / 2; return [A.r, [mx, A.y], [mx, B.y], B.l];
  }
  function tile(series, cx, cy, on, cap) {
    const w = 50, h = 22, list = (Array.isArray(series) && typeof series[0] === 'object' ? series : [{ y: series }]).map((s) => ({ color: '--c-B', ...s }));
    const m = list.find((s) => s.norm)?.norm ?? Math.max(1e-12, ...list.flatMap((s) => Array.from(s.y, (v) => Math.abs(v)).filter(Number.isFinite)));
    let o = `<rect class="tile${on ? ' on' : ''}" x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="2"/><line class="thin" x1="${cx - w / 2}" x2="${cx + w / 2}" y1="${cy}" y2="${cy}"/>`;
    for (const s of list) { const n = s.y.length, X = (i) => cx - w / 2 + 2 + (w - 4) * (n > 1 ? i / (n - 1) : 0.5), Y = (v) => cy - (h / 2 - 2) * Math.max(-1, Math.min(1, v / m));
      o += s.stems ? `<path class="sig" style="stroke:var(${s.color})" d="${s.y.map((v, i) => `M${X(i).toFixed(1)} ${cy}V${Y(v).toFixed(1)}`).join('')}"/>` : `<polyline class="sig" style="stroke:var(${s.color})" points="${s.y.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')}"/>`; }
    return o + (cap ? `<text class="cap" x="${cx}" y="${cy - h / 2 - 4}">${esc(cap)}</text>` : '');
  }
  function draw() {
    const { P, W, H } = layout(); let o = '';
    spec.wires.forEach((wv, i) => { const pts = route(P, wv, H), on = lit.has(`w${i}`); o += `<polyline class="wire${on ? ' on' : ''}" points="${pts.map((p) => p.join(',')).join(' ')}" marker-end="url(#sa)"/>`;
      if (wv[2]?.label) { const k = Math.floor((pts.length - 1) / 2), a = pts[k], b = pts[k + 1]; o += `<text class="cap" x="${(a[0] + b[0]) / 2 + (wv[2].dx || 0)}" y="${(a[1] + b[1]) / 2 - 5 + (wv[2].dy || 0)}">${esc(wv[2].label)}</text>`; } });
    for (const it of spec.items) { const p = P[it.id], on = lit.has(it.id); o += `<g class="blk${on ? ' on' : ''}">${symbol(it, p, on)}</g>`; const lb = text[`${it.id}:label`] ?? it.label; if (lb) o += `<text class="lbl${on ? ' on' : ''}" x="${p.x}" y="${it.labelAt === 't' ? p.y - p.h / 2 - 5 : p.y + p.h / 2 + 12}">${esc(lb)}</text>`; }
    for (const t of spec.tiles || []) { if (!tiles[t.id]) continue; const w = spec.wires[t.wire], pts = route(P, w, H), a = pts[0], b = pts[1] || pts[0]; o += tile(tiles[t.id], (a[0] + b[0]) / 2 + (t.dx || 0), Math.min(a[1], b[1]) - 20 + (t.dy || 0), lit.has(t.id), t.cap); }
    el.innerHTML = `${spec.title ? `<div class="sch-title">${esc(spec.title)}</div>` : ''}<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet"><defs><marker id="sa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z"/></marker></defs>${o}</svg>`;
    el.style.setProperty('--ar', W / H); el.style.setProperty('--w', W);
  }
  draw();
  // width follows the dock height (the SVG keeps its aspect ratio), capped to a share of the dock
  new ResizeObserver(() => { const ar = Number(el.style.getPropertyValue('--ar')) || 3, h = host.clientHeight - 16 - (spec.title ? 16 : 0); el.style.width = `${Math.round(Math.min(host.clientWidth * (spec.share ?? 0.55), Math.max(120, h * ar), (Number(el.style.getPropertyValue('--w')) || 1e9) * 1.15))}px`; }).observe(host);
  return {
    el,
    update({ lit: l, tiles: t, text: tx } = {}) { if (l) lit = new Set(l); if (t) tiles = { ...tiles, ...t }; if (tx) Object.assign(text, tx); draw(); },
    show(on) { el.hidden = !on; },
  };
}
