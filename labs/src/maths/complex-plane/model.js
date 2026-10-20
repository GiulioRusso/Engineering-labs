// Complex arithmetic as geometry. Numbers are [re, im]. Pure, no DOM.
export const abs = ([a, b]) => Math.hypot(a, b);
export const arg = ([a, b]) => Math.atan2(b, a);
export const add = (z, w) => [z[0] + w[0], z[1] + w[1]];
export const mul = (z, w) => [z[0] * w[0] - z[1] * w[1], z[0] * w[1] + z[1] * w[0]];
export const div = (z, w) => { const d = w[0] * w[0] + w[1] * w[1]; return [(z[0] * w[0] + z[1] * w[1]) / d, (z[1] * w[0] - z[0] * w[1]) / d]; };
export const polar = (r, t) => [r * Math.cos(t), r * Math.sin(t)];
export const pow = (z, n) => polar(abs(z) ** n, n * arg(z));                       // de Moivre
export const roots = (z, n) => Array.from({ length: n }, (_, k) => polar(abs(z) ** (1 / n), (arg(z) + 2 * Math.PI * k) / n));
export const fmt = (z, d = 3) => `${z[0].toFixed(d)} ${z[1] < 0 ? '−' : '+'} ${Math.abs(z[1]).toFixed(d)}i`;
