// SI formatting with prefixes: si(0.0123, 'V') -> "12.3 mV".
const PREFIX = [[1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']];
export function si(v, unit = '', sig = 3) {
  if (!Number.isFinite(v)) return v === Infinity ? `∞ ${unit}` : '—';
  if (v === 0) return `0 ${unit}`;
  const a = Math.abs(v), [f, p] = PREFIX.find(([f]) => a >= f * 0.99995) || PREFIX[PREFIX.length - 1];
  return `${Number((v / f).toPrecision(sig))} ${p}${unit}`;
}
// Value scaled to a fixed prefix, for plot axes: prefixFor(maxAbs) -> [factor, 'm'].
export function prefixFor(maxAbs) {
  if (!(maxAbs > 0)) return [1, ''];
  return PREFIX.find(([f]) => maxAbs >= f * 0.99995) || PREFIX[PREFIX.length - 1];
}
