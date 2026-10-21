// Vivaldi (exponentially tapered slot) antenna, lengths in wavelengths at the design frequency f0. A
// simplified travelling-wave model: the slot opens as w(x) = c1 e^{Rx} + c2, the wave leaks out faster
// where the slot is wider, and the pattern is the endfire sum of that leaking line times the aperture
// pattern across the opening. Pure, no DOM.
const K = 2 * Math.PI;
export function halfWidth(x, { L, Wa, Wt, R }) { const e = Math.exp(R * L), c1 = (Wa - Wt) / (e - 1), c2 = (Wt * e - Wa) / (e - 1); return (c1 * Math.exp(R * x) + c2) / 2; }
// leakage α(x) ∝ slot width; the travelling wave's envelope exp(−∫α)
export function envelope(p, n = 400) { const xs = [], env = []; let cum = 0; for (let i = 0; i < n; i++) { const x = p.L * i / (n - 1); if (i) cum += 0.3 * 2 * halfWidth(x, p) * p.L / (n - 1); xs.push(x); env.push(Math.exp(-cum)); } return { xs, env }; }
// E-plane (along the slot, endfire at θ = 0) and H-plane (across the aperture) patterns, at f/f0 = fr
export function patternE(th, p, fr = 1) { const { xs, env } = envelope(p, 200), k = K * fr, dx = xs[1] - xs[0]; let re = 0, im = 0, n = 0; for (let i = 0; i < xs.length; i++) { const ph = k * xs[i] * (1 - Math.cos(th)); re += env[i] * Math.cos(ph) * dx; im += env[i] * Math.sin(ph) * dx; n += env[i] * dx; } return Math.hypot(re, im) / n; }
export function patternH(th, p, fr = 1) { const k = K * fr, N = 120, Wa = p.Wa; let re = 0, im = 0, n = 0; for (let i = 0; i < N; i++) { const y = -Wa / 2 + Wa * (i + 0.5) / N, a = Math.exp(-2 * Math.abs(y) / (Wa / 2)); re += a * Math.cos(k * y * Math.sin(th)); im += a * Math.sin(k * y * Math.sin(th)); n += a; } const front = Math.cos(th) > 0 ? 1 : 0.15; return Math.hypot(re, im) / n * front; }
// half-power beamwidth (deg) of a pattern function over −180…180
export function hpbw(f) { let a = 0, b = 0; for (let d = 0; d <= 180; d += 0.5) { if (f(d * Math.PI / 180) >= Math.SQRT1_2) b = d; else break; } for (let d = 0; d >= -180; d -= 0.5) { if (f(d * Math.PI / 180) >= Math.SQRT1_2) a = d; else break; } return b - a; }
// Kraus: D ≈ 41253 / (θE θH)
export const gainDb = (p, fr) => 10 * Math.log10(Math.min(100, 41253 / (Math.max(1, hpbw((t) => patternE(t, p, fr))) * Math.max(1, hpbw((t) => patternH(t, p, fr))))));
// input match. The taper is an exponential line from Zf to free space (377 Ω): |Γ| = ½ ln(377/Zf) |sin βL / βL|
// (Pozar), with βL = 2π L f/f0. Below the frequency where the opening is about λ/2 the aperture itself reflects.
export function gammaTaper(p, fr, Zf = 50) { const bl = K * p.L * fr; return 0.5 * Math.log(377 / Zf) * Math.abs(Math.sin(bl) / bl); }
export const gammaAperture = (p, fr) => Math.exp(-((p.Wa * fr / 0.5) ** 4));
export const s11 = (p, fr, Zf = 50) => 20 * Math.log10(Math.min(1, Math.hypot(gammaTaper(p, fr, Zf), gammaAperture(p, fr))) + 1e-6);
