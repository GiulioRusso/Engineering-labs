import { CHAINS, sticky, step, evolve, longRun, walk } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'Markov: rows sum to 1; the weather chain settles to π = πP from any start'() {
    for (const c of Object.values(CHAINS)) for (const row of sticky(c.P, 0.3)) near(row.reduce((a, b) => a + b, 0), 1, 1e-12, 'row');
    const P = CHAINS.weather.P, a = evolve(P, 0, 60).at(-1), b = evolve(P, 2, 60).at(-1), pi = step(a, P);
    a.forEach((v, i) => { near(v, b[i], 1e-9, 'start forgotten'); near(v, pi[i], 1e-12, 'stationary'); });
  },
  'Markov: visit shares of a long walk match the long-run share; a cycle never settles but spends 1/3 in each'() {
    const P = CHAINS.weather.P, w = walk(P, 0, 20000), L = longRun(P, 0);
    for (let i = 0; i < 3; i++) ok(Math.abs(w.filter((s) => s === i).length / w.length - L[i]) < 0.02, `state ${i}`);
    const C = CHAINS.cycle.P; ok(evolve(C, 0, 30).at(-1)[0] === 1, 'periodic'); longRun(C, 0).forEach((v) => near(v, 1 / 3, 1e-3, 'cycle share'));
    const A = longRun(CHAINS.absorb.P, 1); near(A[0], 0.5, 1e-3, 'ruin'); near(A[2], 0.5, 1e-3, 'win');
  },
};
