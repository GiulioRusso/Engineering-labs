// The DFT as geometry: correlation with a probe, winding the samples around a circle and taking the centre
// of mass, bin-by-bin; and why the FFT is fast (the radix-2 butterfly). Pure, no DOM.
export const twoTones = (N, k1, k2, a2 = 0.6) => Array.from({ length: N }, (_, n) => Math.cos(2 * Math.PI * k1 * n / N) + a2 * Math.cos(2 * Math.PI * k2 * n / N + 0.6));
// wind x[n] around the origin at f cycles per record: points x[n]·e^{−j2πfn/N} and their centre of mass
export function wind(x, f) {
  const N = x.length, pts = []; let cr = 0, ci = 0;
  for (let n = 0; n < N; n++) { const a = -2 * Math.PI * f * n / N, re = x[n] * Math.cos(a), im = x[n] * Math.sin(a); pts.push([re, im]); cr += re; ci += im; }
  return { pts, com: [cr / N, ci / N] };
}
// the direct O(N²) DFT, counting the complex multiplications it does
export function dftDirect(x) {
  const N = x.length, re = new Float64Array(N), im = new Float64Array(N); let ops = 0;
  for (let k = 0; k < N; k++) for (let n = 0; n < N; n++) { const a = -2 * Math.PI * k * n / N; re[k] += x[n] * Math.cos(a); im[k] += x[n] * Math.sin(a); ops++; }
  return { re, im, ops };
}
export const bitReverse = (i, bits) => { let r = 0; for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b); return r; };
// the radix-2 butterfly network for N points: per stage, the pairs (u, v) and the twiddle exponent k (W_N^k)
export function butterflies(N) {
  const stages = []; for (let len = 2; len <= N; len <<= 1) { const s = []; for (let i = 0; i < N; i += len) for (let k = 0; k < len / 2; k++) s.push([i + k, i + k + len / 2, k * N / len]); stages.push(s); }
  return stages;
}
export const ops = (N) => ({ dft: N * N, fft: (N / 2) * Math.log2(N) });
