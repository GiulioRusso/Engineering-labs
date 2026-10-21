// Radar waveforms in complex baseband: plain pulse, LFM chirp and Barker-13; their spectra and
// matched-filter (pulse-compression) outputs. Pure, no DOM. Times in s, frequencies in Hz.
export const C0 = 299792458;
export const BARKER13 = [1, 1, 1, 1, 1, -1, -1, 1, 1, -1, 1, -1, 1];

// samples of the pulse at rate fs: arrays re, im (unit amplitude)
export function waveform(kind, { tau, B = 0 }, fs) {
  const n = Math.max(2, Math.round(tau * fs)), re = new Float64Array(n), im = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / fs - tau / 2;
    if (kind === 'chirp') { const ph = Math.PI * (B / tau) * t * t; re[i] = Math.cos(ph); im[i] = Math.sin(ph); }
    else if (kind === 'barker') re[i] = BARKER13[Math.min(12, Math.floor(13 * i / n))];
    else re[i] = 1;
  }
  return { re, im, n };
}
export const instFreq = (kind, { tau, B }, t) => (kind === 'chirp' ? (B / tau) * t : 0); // t ∈ [−τ/2, τ/2]

// echo = Σ a_k · pulse delayed by d_k (samples), with a Doppler shift fd_k (Hz); length L samples
export function echo(p, targets, L, fs) {
  const re = new Float64Array(L), im = new Float64Array(L);
  for (const { delay, amp, fd = 0 } of targets) {
    for (let i = 0; i < p.n; i++) {
      const k = i + delay; if (k < 0 || k >= L) continue;
      const ph = 2 * Math.PI * fd * k / fs, c = Math.cos(ph), s = Math.sin(ph);
      re[k] += amp * (p.re[i] * c - p.im[i] * s); im[k] += amp * (p.re[i] * s + p.im[i] * c);
    }
  }
  return { re, im };
}
// matched filter: correlate x with the (optionally Hamming-weighted) pulse; output |y| at each lag
export function compress(x, p, weight = 'none') {
  const n = p.n, w = Array.from({ length: n }, (_, i) => (weight === 'hamming' ? 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (n - 1)) : 1));
  const L = x.re.length, out = new Float64Array(L);
  for (let k = 0; k < L; k++) {
    let a = 0, b = 0;
    for (let i = 0; i < n && k + i < L; i++) { const hr = w[i] * p.re[i], hi = -w[i] * p.im[i]; a += x.re[k + i] * hr - x.im[k + i] * hi; b += x.re[k + i] * hi + x.im[k + i] * hr; }
    out[k] = Math.hypot(a, b);
  }
  return out;
}
export const autocorr = (kind, prm, fs, weight) => { const p = waveform(kind, prm, fs), L = 3 * p.n, x = echo(p, [{ delay: p.n, amp: 1 }], L, fs); return { y: compress(x, p, weight), p, L }; };

// peak-to-sidelobe ratio (dB) and −3 dB width (samples) of a compressed output around its peak
export function metrics(y) {
  let pk = 0; for (let i = 1; i < y.length; i++) if (y[i] > y[pk]) pk = i;
  const P = y[pk]; let l = pk, r = pk;
  while (l > 0 && y[l - 1] < y[l]) l--; while (r < y.length - 1 && y[r + 1] < y[r]) r++; // first nulls
  let sl = 0; for (let i = 0; i < y.length; i++) if (i < l || i > r) sl = Math.max(sl, y[i]);
  let a = pk, b = pk; while (a > 0 && y[a] > P / Math.SQRT2) a--; while (b < y.length - 1 && y[b] > P / Math.SQRT2) b++;
  return { peak: pk, psl: 20 * Math.log10(sl / P), width3: b - a };
}
// amplitude spectrum (dB, normalised) by zero-padded DFT; f in Hz from −fs/2 to fs/2
export function spectrum(p, fs, N = 512) {
  const f = [], S = []; let mx = 0;
  for (let k = 0; k < N; k++) {
    const fk = (k - N / 2) * fs / N; let a = 0, b = 0;
    for (let i = 0; i < p.n; i++) { const w = -2 * Math.PI * fk * i / fs, c = Math.cos(w), s = Math.sin(w); a += p.re[i] * c - p.im[i] * s; b += p.re[i] * s + p.im[i] * c; }
    const m = Math.hypot(a, b); f.push(fk); S.push(m); mx = Math.max(mx, m);
  }
  return { f, dB: S.map((m) => 20 * Math.log10(Math.max(m / mx, 1e-5))) };
}
// range–Doppler coupling of an LFM chirp: apparent range error for Doppler fd
export const coupling = (fd, tau, B) => -C0 * fd * tau / (2 * B);

// Doppler spectrum of a burst of N pulses (Hann-weighted) for targets with Doppler fd (Hz), at PRF
export function dopplerSpectrum(fds, N, prf, nf = 256) {
  const out = [], f = [];
  for (let k = 0; k < nf; k++) {
    const fk = (k / nf - 0.5) * prf; let a = 0, b = 0;
    for (let n = 0; n < N; n++) { const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * n / (N - 1)); for (const fd of fds) { const ph = 2 * Math.PI * (fd - fk) * n / prf; a += w * Math.cos(ph); b += w * Math.sin(ph); } }
    f.push(fk); out.push(Math.hypot(a, b));
  }
  const mx = Math.max(...out); return { f, A: out.map((v) => v / mx) };
}
