// Circuit schematics drawn in the scene plane: wires and standard symbols (resistor, capacitor, diode,
// Zener, LED, sources, ground, BJT, MOSFET, op-amp) built from line segments, with text labels.
// Usage: const sch = createSchematic(ctx); sch.begin(); sch.resistor([x0,y0],[x1,y1],'R'); …; sch.end();
import { createCurve } from './curve.js';

export function createSchematic(ctx, { width = 2, color = '--ink', max = 4000, labelPool = 24 } = {}) {
  const { stage, scene } = ctx, lines = createCurve(stage, { max, width, color }), hot = createCurve(stage, { max: 600, width: width + 1.2, color: '--c-I' }), labels = [];
  for (let i = 0; i < labelPool; i++) { const l = ctx.label('', 'tick'); scene.add(l); l.visible = false; labels.push(l); }
  let seg = [], hs = [], nl = 0;
  // a two-terminal part whose label (its value) changed since the last draw pulses for FLASH ms: it swells
  // across its axis and turns the accent colour, so the eye catches what the control just changed
  const FLASH = 600, prev = new Map(), since = new Map(), seen = new Set(); let pending = false;
  const pulse = (type, a, b, name, draw) => {
    const key = `${type}${a}${b}`, now = performance.now(); seen.add(key);
    if (prev.has(key) && prev.get(key) !== name) since.set(key, now); prev.set(key, name);
    const n0 = seg.length; draw(); const u = (now - (since.get(key) ?? -1e9)) / FLASH;
    if (u >= 0 && u < 1) {
      const k = 1 + 0.45 * Math.sin(Math.PI * u), dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
      for (let i = n0; i < seg.length; i += 3) { const px = seg[i] - a[0], py = seg[i + 1] - a[1], al = px * ux + py * uy, pe = -px * uy + py * ux; seg[i] = a[0] + al * ux - pe * k * uy; seg[i + 1] = a[1] + al * uy + pe * k * ux; }
      hs.push(...seg.splice(n0)); pending = true;
    }
  };
  const L = (a, b, h = false) => (h ? hs : seg).push(a[0], a[1], 0.006, b[0], b[1], 0.006);
  const poly = (pts, h) => { for (let i = 0; i + 1 < pts.length; i++) L(pts[i], pts[i + 1], h); };
  // local frame along a → b: point at distance s along, offset d to the left
  const frame = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len; return { len, at: (s, d = 0) => [a[0] + ux * s - uy * d, a[1] + uy * s + ux * d] }; };
  const text = (t, p, dx = 0, dy = 0) => { if (nl >= labels.length || !t) return; const l = labels[nl++]; l.element.textContent = t; l.position.set(p[0] + dx, p[1] + dy, 0.01); l.visible = true; };
  // component label on its left side; beside a vertical part it is pushed out by half its (centred) width
  const tag = (F, t, m, d = 0.32) => { const c = F.at(m), n = F.at(m, 1); const nx = n[0] - c[0]; if (Math.abs(nx) > 0.7) text(t, [c[0] + Math.sign(nx) * (d - 0.14 + 0.05 * (t || '').length), c[1]]); else text(t, F.at(m, d)); };
  const api = {
    begin() { seg = []; hs = []; nl = 0; pending = false; seen.clear(); labels.forEach((l) => { l.visible = false; }); return api; },
    end() { lines.segments(seg); hot.segments(hs); for (const k of prev.keys()) if (!seen.has(k)) { prev.delete(k); since.delete(k); } if (pending) requestAnimationFrame(() => ctx.requestUpdate()); return api; },
    wire(...pts) { poly(pts); return api; },
    hotWire(...pts) { poly(pts, true); return api; },
    dot(p, r = 0.05) { for (let i = 0; i < 8; i++) { const a = Math.PI * i / 4, b = Math.PI * (i + 1) / 4; L([p[0] + r * Math.cos(a), p[1] + r * Math.sin(a)], [p[0] + r * Math.cos(b), p[1] + r * Math.sin(b)]); } return api; },
    text(t, p, dx, dy) { text(t, p, dx, dy); return api; },
    resistor(a, b, name = '') { pulse('resistor', a, b, name, () => { const F = frame(a, b), z = Math.min(0.6, F.len * 0.6), s0 = (F.len - z) / 2, w = 0.1, pts = [a, F.at(s0)]; for (let i = 0; i < 6; i++) pts.push(F.at(s0 + z * (i + 0.5) / 6, i % 2 ? -w : w)); pts.push(F.at(s0 + z), b); poly(pts); tag(F, name, F.len / 2); }); return api; },
    capacitor(a, b, name = '') { pulse('capacitor', a, b, name, () => { const F = frame(a, b), m = F.len / 2, g = 0.06, w = 0.2; L(a, F.at(m - g)); L(F.at(m + g), b); L(F.at(m - g, -w), F.at(m - g, w)); L(F.at(m + g, -w), F.at(m + g, w)); tag(F, name, m, 0.36); }); return api; },
    // diode from anode a to cathode b
    diode(a, b, name = '', kind = 'diode') { pulse('diode', a, b, name, () => { const F = frame(a, b), m = F.len / 2, h = 0.16; L(a, F.at(m - h)); L(F.at(m + h), b); poly([F.at(m - h, -h), F.at(m - h, h), F.at(m + h, 0), F.at(m - h, -h)]); L(F.at(m + h, -h), F.at(m + h, h)); if (kind === 'zener') { L(F.at(m + h, h), F.at(m + h + 0.06, h + 0.04)); L(F.at(m + h, -h), F.at(m + h - 0.06, -h - 0.04)); } if (kind === 'led') { L(F.at(m, 0.22), F.at(m + 0.12, 0.38)); L(F.at(m + 0.12, 0.22), F.at(m + 0.24, 0.38)); } tag(F, name, m, 0.36); }); return api; },
    source(a, b, name = '', ac = true) { pulse('source', a, b, name, () => { const F = frame(a, b), m = F.len / 2, r = 0.22, c = F.at(m); L(a, F.at(m - r)); L(F.at(m + r), b); for (let i = 0; i < 16; i++) { const p = 2 * Math.PI * i / 16, q = 2 * Math.PI * (i + 1) / 16; L([c[0] + r * Math.cos(p), c[1] + r * Math.sin(p)], [c[0] + r * Math.cos(q), c[1] + r * Math.sin(q)]); } if (ac) { const s = []; for (let i = 0; i <= 10; i++) { const x = -0.12 + 0.24 * i / 10; s.push(F.at(m + x, 0.07 * Math.sin(Math.PI * 2 * i / 10))); } poly(s); } else { L(F.at(m + 0.12, -0.06), F.at(m + 0.12, 0.06)); L(F.at(m - 0.12, -0.06), F.at(m - 0.12, 0.06)); L(F.at(m + 0.06, 0), F.at(m + 0.18, 0)); } tag(F, name, m, 0.45); }); return api; },
    ground(p) { L(p, [p[0], p[1] - 0.12]); L([p[0] - 0.18, p[1] - 0.12], [p[0] + 0.18, p[1] - 0.12]); L([p[0] - 0.11, p[1] - 0.18], [p[0] + 0.11, p[1] - 0.18]); L([p[0] - 0.04, p[1] - 0.24], [p[0] + 0.04, p[1] - 0.24]); return api; },
    supply(p, name = 'V+') { L(p, [p[0], p[1] + 0.12]); L([p[0] - 0.15, p[1] + 0.12], [p[0] + 0.15, p[1] + 0.12]); text(name, p, 0, 0.3); return api; },
    // NPN BJT at centre c (base left, collector up, emitter down); returns pins
    npn(c, name = '') { const r = 0.32, b = [c[0] - 0.12, c[1]]; L([c[0] - r, c[1]], b); L([b[0], c[1] - 0.18], [b[0], c[1] + 0.18]); L([b[0], c[1] + 0.08], [c[0] + 0.12, c[1] + 0.22]); L([b[0], c[1] - 0.08], [c[0] + 0.12, c[1] - 0.22]); L([c[0] + 0.12, c[1] + 0.22], [c[0] + 0.12, c[1] + r + 0.1]); L([c[0] + 0.12, c[1] - 0.22], [c[0] + 0.12, c[1] - r - 0.1]); L([c[0] + 0.12, c[1] - 0.22], [c[0] + 0.02, c[1] - 0.2]); L([c[0] + 0.12, c[1] - 0.22], [c[0] + 0.08, c[1] - 0.12]); text(name, c, 0.42, 0); return { B: [c[0] - r, c[1]], C: [c[0] + 0.12, c[1] + r + 0.1], E: [c[0] + 0.12, c[1] - r - 0.1] }; },
    // n- or p-MOSFET at c (gate left, drain up for n, source down); returns pins
    mos(c, name = '', p = false) { const g = [c[0] - 0.32, c[1]], x0 = c[0] - 0.12, x1 = c[0] - 0.04; L(g, [x0 - (p ? 0.08 : 0), c[1]]); if (p) { for (let i = 0; i < 8; i++) { const a = Math.PI * i / 4, bb = Math.PI * (i + 1) / 4; L([x0 - 0.04 + 0.04 * Math.cos(a), c[1] + 0.04 * Math.sin(a)], [x0 - 0.04 + 0.04 * Math.cos(bb), c[1] + 0.04 * Math.sin(bb)]); } } L([x0, c[1] - 0.2], [x0, c[1] + 0.2]); L([x1, c[1] - 0.22], [x1, c[1] + 0.22]); L([x1, c[1] + 0.16], [c[0] + 0.14, c[1] + 0.16]); L([x1, c[1] - 0.16], [c[0] + 0.14, c[1] - 0.16]); L([c[0] + 0.14, c[1] + 0.16], [c[0] + 0.14, c[1] + 0.42]); L([c[0] + 0.14, c[1] - 0.16], [c[0] + 0.14, c[1] - 0.42]); text(name, c, 0.42, 0); return { G: g, D: [c[0] + 0.14, c[1] + 0.42], S: [c[0] + 0.14, c[1] - 0.42] }; },
    // op-amp triangle with − input on top-left, + bottom-left, output right; returns pins
    opamp(c, s = 0.6) { const A = [c[0] - s, c[1] + s], B = [c[0] - s, c[1] - s], O = [c[0] + s, c[1]]; poly([A, B, O, A]); text('−', [c[0] - s + 0.15, c[1] + s * 0.45]); text('+', [c[0] - s + 0.15, c[1] - s * 0.45]); return { inN: [c[0] - s, c[1] + s * 0.45], inP: [c[0] - s, c[1] - s * 0.45], out: O }; },
    // rectangle centred at c (a block in a diagram); returns its side midpoints
    box(c, w, h, name = '') { const [x, y] = c, a = w / 2, b = h / 2; poly([[x - a, y - b], [x + a, y - b], [x + a, y + b], [x - a, y + b], [x - a, y - b]]); text(name, c); return { l: [x - a, y], r: [x + a, y], t: [x, y + b], b: [x, y - b] }; },
    // summing junction: circle with a cross
    sum(c, r = 0.18) { for (let i = 0; i < 16; i++) { const p = Math.PI * i / 8, q = Math.PI * (i + 1) / 8; L([c[0] + r * Math.cos(p), c[1] + r * Math.sin(p)], [c[0] + r * Math.cos(q), c[1] + r * Math.sin(q)]); } L([c[0] - r * 0.7, c[1]], [c[0] + r * 0.7, c[1]]); L([c[0], c[1] - r * 0.7], [c[0], c[1] + r * 0.7]); return { l: [c[0] - r, c[1]], r: [c[0] + r, c[1]], b: [c[0], c[1] - r], t: [c[0], c[1] + r] }; },
    arrowI(a, b, name = '') { const F = frame(a, b), m = F.len / 2; L(F.at(m - 0.12, 0.18), F.at(m + 0.12, 0.18), true); L(F.at(m + 0.12, 0.18), F.at(m + 0.04, 0.24), true); L(F.at(m + 0.12, 0.18), F.at(m + 0.04, 0.12), true); tag(F, name, m, 0.42); return api; },
    show(on) { lines.object.visible = hot.object.visible = on; if (!on) labels.forEach((l) => { l.visible = false; }); },
    theme() { lines.theme(); hot.theme(); },
  };
  return api;
}
