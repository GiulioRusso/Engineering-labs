import { commute, ANSCOMBE, pairs } from './model.js';
import { mean, median, pearson, linfit } from '../core/model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'Anscombe: four sets, same r and line'() { for (const k of ['a1', 'a2', 'a3', 'a4']) { const { x, y } = ANSCOMBE[k], f = linfit(x, y); near(pearson(x, y), 0.816, 0.002, k); near(f.b, 0.5, 0.002, `${k} slope`); near(f.a, 3, 0.002, `${k} intercept`); } },
  'one outlier moves the mean, not the median'() { const v = commute('commute'), a = [...v, 30], b = [...v, 150]; ok(mean(b) - mean(a) > 7, 'mean'); ok(median(b) - median(a) <= 0.5, 'median'); },
  'the parabola has r ≈ 0'() { const p = pairs('parabola'); ok(Math.abs(pearson(p.x, p.y)) < 0.15, 'r'); },
};
