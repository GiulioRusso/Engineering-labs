// Outline glyphs for 2D scenes: a radar (dish on a mast) and an aircraft (top view), drawn as line art.
import { createCurve } from './curve.js';

const AIRCRAFT = [[1, 0], [0.35, 0.12], [0.1, 0.85], [-0.1, 0.85], [-0.05, 0.12], [-0.6, 0.1], [-0.85, 0.4], [-1, 0.4], [-0.9, 0], [-1, -0.4], [-0.85, -0.4], [-0.6, -0.1], [-0.05, -0.12], [-0.1, -0.85], [0.1, -0.85], [0.35, -0.12], [1, 0]];
const RADAR = [[-0.5, -1], [0, -0.2], [0.5, -1], null, [0, -0.2], [0, 0.1], null, ...Array.from({ length: 13 }, (_, i) => { const a = -1.1 + 2.2 * i / 12; return [0.35 + 0.55 * Math.cos(a) - 0.55, 0.35 + 0.55 * Math.sin(a)]; })];

function glyph(stage, shape, color, width) {
  const c = createCurve(stage, { max: 80, width, color });
  return {
    object: c.object,
    // place at (x, y), heading in radians (0 = +x), size in world units
    set(x, y, heading = 0, size = 0.25) {
      const ch = Math.cos(heading), sh = Math.sin(heading), seg = [];
      for (let i = 1; i < shape.length; i++) {
        const a = shape[i - 1], b = shape[i]; if (!a || !b) continue;
        seg.push(x + size * (a[0] * ch - a[1] * sh), y + size * (a[0] * sh + a[1] * ch), 0.01, x + size * (b[0] * ch - b[1] * sh), y + size * (b[0] * sh + b[1] * ch), 0.01);
      }
      c.segments(seg); c.object.visible = true;
    },
    color(v) { c.object.material.color.set(v); },
    theme() { c.theme(); },
  };
}
export const createAircraft = (stage, color = '--c-I', width = 2) => glyph(stage, AIRCRAFT, color, width);
export const createRadar = (stage, color = '--c-v', width = 2.2) => glyph(stage, RADAR, color, width);
