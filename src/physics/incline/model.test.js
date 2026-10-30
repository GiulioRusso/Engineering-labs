import { solve, reposeAngle, G } from './model.js';
import { near, ok } from '../../lib/testing.js';

const deg = Math.PI / 180;

export const tests = {
  'starts to slide exactly at tan θ = μs'() {
    let lo = 0, hi = Math.PI / 2;
    for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (solve({ m: 2, th: mid, mus: 0.5, muk: 0.4 }).sticks) lo = mid; else hi = mid; }
    near(lo, reposeAngle(0.5), 1e-9, 'angle');
    near(Math.tan(lo), 0.5, 1e-9, 'tan θ');
  },
  'sliding down: a = −g (sin θ − μk cos θ), independent of the mass'() {
    for (const m of [0.5, 2, 10]) near(solve({ m, th: 35 * deg, mus: 0.5, muk: 0.4 }).a, -G * (Math.sin(35 * deg) - 0.4 * Math.cos(35 * deg)), 1e-12, `m = ${m}`);
  },
  'Atwood machine (θ = 90°, no friction): a = (M − m) g / (M + m), T = 2mMg/(m + M)'() {
    const s = solve({ m: 1, M: 1.5, th: Math.PI / 2, mus: 0, muk: 0 });
    near(s.a, 0.5 * G / 2.5, 1e-12, 'a'); near(s.T, 2 * 1 * 1.5 * G / 2.5, 1e-12, 'T');
  },
  'static friction adjusts but never exceeds μs N; Newton’s second law holds for each body'() {
    for (let k = 0; k < 500; k++) {
      const p = { m: 0.5 + 3 * Math.random(), M: Math.random() < 0.5 ? 0 : 3 * Math.random(), th: Math.random() * Math.PI / 2, mus: Math.random(), muk: 0 };
      p.muk = p.mus * Math.random();
      const s = solve(p);
      ok(Math.abs(s.f) <= s.fmax + 1e-12, 'static limit');
      near(p.m * s.a + 1e-30, s.T * (p.M > 0) - s.W * Math.sin(p.th) + s.f + 1e-30, 1e-9, 'block'); // tension only with a pulley
      if (p.M) near(p.M * s.a + 1e-30, p.M * G - s.T + 1e-30, 1e-9, 'hanging mass');
    }
  },
};
