// Rotation: moments of inertia, rolling down a slope, a mass unwinding a spool, and a spinning skater
// pulling in their arms (angular momentum conserved). SI units. Pure, no DOM.
export const G = 9.81;

// I = c·M·R² for each shape
export const SHAPES = {
  sphere: { label: 'Solid sphere', c: 2 / 5 },
  disc: { label: 'Solid disc', c: 1 / 2 },
  shell: { label: 'Hollow sphere', c: 2 / 3 },
  hoop: { label: 'Hoop', c: 1 },
};
export const inertia = (shape, M, R) => SHAPES[shape].c * M * R * R;

// Rolling without slipping: Mg sin θ − f = Ma, fR = Iα = I a/R  ⇒  a = g sin θ / (1 + I/MR²)
export const rollAccel = (shape, th) => G * Math.sin(th) / (1 + SHAPES[shape].c);
export const rollTime = (shape, th, L) => Math.sqrt(2 * L / rollAccel(shape, th));

// A mass m on a string wound round a spool (disc, mass Ms, radius R) on a fixed axle
export const spoolAccel = (m, Ms, R) => m * G / (m + inertia('disc', Ms, R) / (R * R));

// Skater: body I0 plus two point masses mp at arm radius r. L = Iω stays; KE = L²/2I.
export const skaterI = (I0, mp, r) => I0 + 2 * mp * r * r;
// Arm radius going smoothly from r1 to r2 between t0 and t1
export const armRadius = (t, r1, r2, t0 = 1, t1 = 2.5) => { const u = Math.max(0, Math.min(1, (t - t0) / (t1 - t0))); return r1 + (r2 - r1) * u * u * (3 - 2 * u); };
