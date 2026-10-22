import { outSize, conv2d, pool, dense, IMG, KERNELS, stack } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'output size: (N + 2p − d(k − 1) − 1)/s + 1'() { near(outSize(7, 3), 5, 0, 'valid'); near(outSize(7, 3, { pad: 1 }), 7, 0, 'same'); near(outSize(7, 3, { stride: 2 }), 3, 0, 'stride'); near(outSize(7, 3, { dil: 2 }), 3, 0, 'dilation'); },
  'convolution = sum of the patch times the kernel'() { const { out } = conv2d(IMG, KERNELS.blur.k); let s = 0; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) s += IMG[i][j]; near(out[0][0], s / 9, 1e-12, 'blur'); },
  'channels: a k×k×C filter sums over every channel'() { const X = [IMG, IMG], K = [KERNELS.blur.k, KERNELS.blur.k], a = conv2d(X, K).out, b = conv2d(IMG, KERNELS.blur.k).out; near(a[2][2], 2 * b[2][2], 1e-12, 'two channels'); },
  'max pooling and dense layer'() { near(pool([[1, 2], [3, 4]])[0][0], 4, 0, 'max'); near(dense([[1, 2]], [3, 4], [1])[0], 12, 0, 'dense'); },
  'parameters: conv 3×3 on 1 channel with 8 filters = 80'() { near(stack()[1].params, 80, 0, 'conv1'); ok(stack()[5].params > stack()[3].params, 'dense dominates'); },
};
