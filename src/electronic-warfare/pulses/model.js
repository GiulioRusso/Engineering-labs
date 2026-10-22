// Pulsed radar in the time domain: where the pulses are, when echoes arrive, what the receiver records.
// Pure, no DOM. Ranges in m, times in s.
export const C0 = 299792458;

// position of a transmitted packet at time t: it occupies [lead − cτ, lead] going out, then comes back.
// returns { out: [a, b] | null, back: [a, b] | null } in metres from the radar (one target at range R).
export function packet(t, R, tau) {
  const L = C0 * tau, lead = C0 * t, res = { out: null, back: null };
  if (lead > 0) { const a = Math.max(0, lead - L), b = Math.min(R, lead); if (b > a) res.out = [a, b]; }
  // the part that has reached R is reflected: it has travelled lead − R beyond the target
  const back = lead - R; if (back > 0) { const a = Math.max(0, R - back), b = Math.min(R, R - (back - L)); if (b > a) res.back = [a, b]; }
  return res;
}
// receiver timeline: transmit on [0, τ]; echoes on [2R/c, 2R/c + τ] with amplitude ∝ 1/R² (normalised)
export const echoDelay = (R) => 2 * R / C0;
export const resolution = (tau) => C0 * tau / 2;
export const overlap = (dR, tau) => dR < resolution(tau); // the two echoes touch
export const eclipsed = (R, tau) => echoDelay(R) < tau;     // the echo arrives while still transmitting
export const unambiguous = (pri) => C0 * pri / 2;
// range the receiver reports when it assumes the echo belongs to the latest pulse
export const apparent = (R, pri) => R % unambiguous(pri);
// which pulse an echo arriving at time t (after pulse 0 at t = 0) really came from, for a target at R
export const pulsesInFlight = (R, pri) => Math.floor(echoDelay(R) / pri);
// range of a target moving at v (m/s, + = receding) at pulse n
export const rangeAt = (R0, v, n, pri) => R0 + v * n * pri;
