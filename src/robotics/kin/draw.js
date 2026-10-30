// Drawing a planar arm in a 2D chart (lib/viz/chart.js): links as thick lines, joints as dots, the tip marked.
export function drawArm(ch, key, P, { color = '--c-ref', width = 7, joints = '--ink', tip = '--accent', jointSize = 10 } = {}) {
  ch.line(`${key}l`, P.map((p) => p[0]), P.map((p) => p[1]), { color, width });
  ch.dots(`${key}j`, P.slice(0, -1).map((p) => p[0]), P.slice(0, -1).map((p) => p[1]), { color: joints, size: jointSize });
  if (tip) ch.dots(`${key}t`, [P.at(-1)[0]], [P.at(-1)[1]], { color: tip, size: jointSize + 2 });
}
// an ellipse with semi-axes a, b at angle th, centred at c, as a closed polyline
export const ellipsePts = (c, a, b, th, n = 72) => Array.from({ length: n + 1 }, (_, i) => { const t = 2 * Math.PI * i / n, x = a * Math.cos(t), y = b * Math.sin(t); return [c[0] + x * Math.cos(th) - y * Math.sin(th), c[1] + x * Math.sin(th) + y * Math.cos(th)]; });
