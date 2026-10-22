import { prob, both, choose, birthday, conditional, frequencies, GAMES, moments, plays } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'two dice: P(sum = 7) = 1/6, P(doubles) = 1/6, P(at least one 6) = 11/36'() { near(prob('sum', 7), 1 / 6, 1e-12, '7'); near(prob('doubles'), 1 / 6, 1e-12, 'dbl'); near(prob('six'), 11 / 36, 1e-12, 'six'); },
  'addition rule: P(A ∪ B) = P(A) + P(B) − P(A ∩ B)'() { const a = prob('six'), b = prob('doubles'), ab = both('six', 0, 'doubles', 0); near(ab, 1 / 36, 1e-12, 'both'); ok(a + b - ab > 0.4, 'union'); },
  'C(5, 2) = 10; the birthday problem crosses ½ at 23 people'() { near(choose(5, 2), 10, 0, 'C'); ok(birthday(22) < 0.5 && birthday(23) > 0.5, `${birthday(23)}`); },
  'total probability and Bayes'() { const c = conditional(0.3, 0.8, 0.1); near(c.pB, 0.31, 1e-12, 'pB'); near(c.pAB, 0.24 / 0.31, 1e-12, 'Bayes'); },
  'law of large numbers: frequencies approach p'() { const f = frequencies(0.3, 20000, 3); for (const r of f) ok(Math.abs(r.at(-1) - 0.3) < 0.02, `${r.at(-1)}`); },
  'roulette loses 1/37 per euro; long-run average agrees'() { const { mean } = moments(GAMES.roulette.X); near(mean, -1 / 37, 1e-12, 'E'); near(plays(GAMES.die.X, 50000).at(-1), 3.5, 0.02, 'die avg'); },
};
