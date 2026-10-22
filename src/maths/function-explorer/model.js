// Elementary function families and their key features. Pure, no DOM.
// linear: through (x1, y1) and (x2, y2) · quadratic: a(x − h)² + k · exponential: A·b^x · logarithm: log_b(x)
export function family(s) {
  switch (s.family) {
    case 'linear': {
      const m = (s.y2 - s.y1) / (s.x2 - s.x1), q = s.y1 - m * s.x1;
      return { f: (x) => m * x + q, m, q, roots: m ? [-q / m] : [], yInt: q, text: `y = ${n(m)}·x ${sg(q)}` };
    }
    case 'quadratic': {
      const { a, h, k } = s, b = -2 * a * h, c = a * h * h + k, D = b * b - 4 * a * c;
      const roots = D > 0 ? [(-b - Math.sqrt(D)) / (2 * a), (-b + Math.sqrt(D)) / (2 * a)].sort((u, v) => u - v) : D === 0 ? [-b / (2 * a)] : [];
      return { f: (x) => a * (x - h) ** 2 + k, a, b, c, D, roots, vertex: [h, k], yInt: c, text: `y = ${n(a)}·x² ${sg(b)}·x ${sg(c)}` };
    }
    case 'exponential': {
      const { A, base } = s;
      return { f: (x) => A * base ** x, A, base, roots: [], yInt: A, asymptoteY: 0, inv: (x) => Math.log(x / A) / Math.log(base), text: `y = ${n(A)}·${n(base)}ˣ` };
    }
    case 'logarithm': {
      const { base } = s;
      return { f: (x) => (x > 0 ? Math.log(x) / Math.log(base) : NaN), base, roots: [1], asymptoteX: 0, inv: (x) => base ** x, text: `y = log${sub(base)}(x)` };
    }
  }
}
const n = (v) => String(Number(v.toPrecision(3)));
const sg = (v) => (v < 0 ? `− ${n(-v)}` : `+ ${n(v)}`);
const sub = (b) => (Math.abs(b - Math.E) < 1e-3 ? 'ₑ' : `_${n(b)}`);
