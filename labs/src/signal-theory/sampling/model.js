// Sampling: the alias of a tone, sinc reconstruction from samples, and the periodic replicas of a
// sampled spectrum (Gaussian pulse of bandwidth B). Pure, no DOM.
export const sinc = (u) => (Math.abs(u) < 1e-12 ? 1 : Math.sin(Math.PI * u) / (Math.PI * u));
// the frequency a sampled tone appears at, folded into [0, fs/2]
export const aliasOf = (f, fs) => { const r = ((f % fs) + fs) % fs; return Math.min(r, fs - r); };
// signed alias in (−fs/2, fs/2]: the sign says whether the apparent rotation is reversed
export const signedAlias = (f, fs) => f - fs * Math.round(f / fs);
// x̂(t) = Σ x[n] sinc((t − nTs)/Ts)
export const reconstruct = (samples, Ts, t) => samples.reduce((s, [tn, xn]) => s + xn * sinc((t - tn) / Ts), 0);
// Gaussian pulse e^{−2π²B²t²} ↔ e^{−f²/2B²}/(B√2π): B is the spectral σ
export const gpulse = (t, B) => Math.exp(-2 * Math.PI ** 2 * B * B * t * t);
export const gspec = (f, B) => Math.exp(-f * f / (2 * B * B)); // normalised to 1 at f = 0 (true peak 1/(B√2π))
// sampled spectrum (scaled to the original): Σ_k X(f − k fs)
export const replicas = (X, f, fs, K = 6) => { let s = 0; for (let k = -K; k <= K; k++) s += X(f - k * fs); return s; };
