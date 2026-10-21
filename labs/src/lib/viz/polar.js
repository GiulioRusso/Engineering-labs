// A polar chart in the scene: angle θ in degrees measured from straight up (boresight), radius in [0, 1]
// (use toR to map dB). Rings and spokes drawn once; series created on first use.
import { createCurve } from './curve.js';

export const dbToR = (dB, range = 40) => Math.max(0, 1 + dB / range);

export function createPolar(ctx, { c = [0, 0], R = 2, from = -90, to = 90, rings = ['−30 dB', '−20 dB', '−10 dB', '0 dB'], z = 0 } = {}) {
  const { stage, scene } = ctx, curves = {}, labels = [];
  const grid = createCurve(stage, { max: 600, width: 1, color: '--line' }), g = [], P = (th, r) => [c[0] + R * r * Math.sin(th * Math.PI / 180), c[1] + R * r * Math.cos(th * Math.PI / 180)];
  rings.forEach((t, k) => { const r = (k + 1) / rings.length; for (let a = from; a < to; a += 3) g.push(...P(a, r), z, ...P(Math.min(to, a + 3), r), z); const l = ctx.label(t, 'tick'); l.position.set(...P(from + 2, r), z); scene.add(l); labels.push(l); });
  for (let a = from; a <= to + 1e-9; a += 30) { g.push(...P(a, 0), z, ...P(a, 1), z); const l = ctx.label(`${a}°`, 'tick'); l.position.set(...P(a, 1.1), z); scene.add(l); labels.push(l); }
  grid.segments(g);
  return {
    P,
    line(key, th, r, o = {}) { const k = (curves[key] ??= createCurve(stage, { max: o.max || 1500, width: o.width || 2.6, color: o.color || '--c-B', dashed: o.dashed })), p = []; for (let i = 0; i < th.length; i++) p.push(...P(th[i], Math.max(0, Math.min(1.08, r[i]))), z + 0.002); k.set(p); k.object.visible = true; },
    ray(key, th, o = {}) { const k = (curves[key] ??= createCurve(stage, { max: 1, width: o.width || 1.6, color: o.color || '--c-I', dashed: o.dashed ?? true })); k.segments([...P(th, 0), z + 0.003, ...P(th, 1.05), z + 0.003]); k.object.visible = true; },
    show(on) { grid.object.visible = on; for (const l of labels) l.visible = on; if (!on) for (const k of Object.values(curves)) k.object.visible = false; },
    theme() { grid.theme(); for (const k of Object.values(curves)) k.theme(); },
  };
}
