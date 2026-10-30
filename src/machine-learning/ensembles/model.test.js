import { data, TEST, forest, vote, acc, adaboost, boostScore } from './model.js';
import { ok, near } from '../../lib/testing.js';
import { growTree, predict } from '../classic/model.js';

export const tests = {
  'averaging 50 bootstrapped deep trees beats one deep tree on unseen points'() {
    const P = data(), one = growTree(P, 10), F = forest(P, 50, 10);
    const a1 = acc(TEST, (x, y) => predict(one, x, y)), aF = acc(TEST, (x, y) => vote(F, x, y));
    ok(aF > a1 + 0.02, `one tree ${a1}, forest ${aF}`);
  },
  'AdaBoost: every stump beats chance on its weights, weights stay a distribution, training error falls'() {
    const P = data(), R = adaboost(P, 100);
    ok(R.every((r) => r.eps < 0.5), 'weak learners'); R.forEach((r) => near(r.w.reduce((a, b) => a + b, 0), 1, 1e-9, 'Σw'));
    const tr = (M) => acc(P, (x, y) => (boostScore(R, x, y, M) > 0 ? 1 : 0));
    ok(tr(100) > tr(1) + 0.1 && tr(100) > 0.95, `training accuracy ${tr(1)} → ${tr(100)}`);
  },
  'the training error is below the AdaBoost bound Π 2√(ε(1 − ε))'() {
    const P = data(), R = adaboost(P, 40); let bound = 1;
    R.forEach((r, m) => { bound *= 2 * Math.sqrt(r.eps * (1 - r.eps)); ok(1 - acc(P, (x, y) => (boostScore(R, x, y, m + 1) > 0 ? 1 : 0)) <= bound + 1e-12, `round ${m + 1}`); });
  },
};
