import { digits, train, confusion, predict, makeNet } from './model.js';
import { params } from '../net/model.js';
import { ok, near } from '../../lib/testing.js';

export const tests = {
  'the data: 3000 + 1000 digits, 300 and 100 of each class, pixels in [0, 1]'() {
    const { X, Y, Xt, Yt } = digits();
    ok(X.length === 3000 && Xt.length === 1000, 'sizes');
    for (let d = 0; d < 10; d++) ok(Y.filter((y) => y === d).length === 300 && Yt.filter((y) => y === d).length === 100, `digit ${d}`);
    ok(X.every((x) => x.every((v) => v >= 0 && v <= 1)), 'range');
  },
  'softmax regression and a 32-unit MLP both learn; the MLP does better on unseen digits'() {
    const { Xt, Yt } = digits(), lin = confusion(train(0, 4), Xt, Yt), mlp = confusion(train(32, 4), Xt, Yt);
    ok(lin.acc > 0.78 && mlp.acc > 0.85 && mlp.acc > lin.acc, `softmax ${lin.acc}, MLP ${mlp.acc}`);
    ok(mlp.C.every((row) => row.reduce((a, b) => a + b, 0) === 100), 'each confusion row counts its 100 test digits');
  },
  'untrained: about one guess in ten; probabilities sum to 1'() {
    const { Xt, Yt } = digits(), acc = confusion(makeNet(32), Xt, Yt).acc;
    ok(acc < 0.25, `untrained ${acc}`);
    near(predict(makeNet(32), Xt[0]).p.reduce((a, b) => a + b, 0), 1, 1e-12, 'Σp');
    ok(params(makeNet(0)) === 1970 && params(makeNet(32)) === 6634, 'parameter counts');
  },
};
