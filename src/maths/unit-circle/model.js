// The unit circle and its helix: P(θ) = (k·θ, cos θ, sin θ). Its shadow on x = 0 is the circle, on the
// wall y = −w it is the sine wave, on the floor z = −w the cosine wave. Pure, no DOM.
export const K = 0.45; // helix pitch: x advances K per radian
export const point = (th) => [K * th, Math.cos(th), Math.sin(th)];
export function trig(th) {
  const s = Math.sin(th), c = Math.cos(th), wrapped = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return { s, c, t: s / c, deg: th * 180 / Math.PI, quadrant: 1 + Math.floor(wrapped / (Math.PI / 2)) % 4 };
}
