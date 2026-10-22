// Inside the layers, every multiply and add drawn: a dense layer row by row, a convolution sliding over an
// image (stride, padding, dilation), pooling, a filter spanning all channels (3D), and a whole CNN's shapes.
import { createCurve } from '../../lib/viz/curve.js';
import { cssVar } from '../../lib/ui/theme.js';
import * as THREE from 'three';
import { outSize, conv2d, pool, dense, IMG, KERNELS, stack } from './model.js';

const fmt = (v, d = 2) => (Math.abs(v) < 5e-3 ? '0' : String(Number(v.toFixed(d))));
const KOPT = Object.entries(KERNELS).map(([k, v]) => [k, v.label]);
const W8 = [[0.5, -1, 0.3, 2], [1, 0.2, -0.5, 0], [-0.7, 0.4, 1, -1]], X4 = [1, 2, -1, 0.5], B3 = [0.1, -0.3, 0.2];
const FM = [[1, 3, 2, 0, 1, 4], [0, 5, 1, 2, 2, 1], [2, 1, 0, 6, 3, 0], [1, 2, 4, 1, 0, 2], [3, 0, 1, 2, 5, 1], [0, 2, 1, 0, 1, 3]];

export default {
  id: 'layers', title: 'Inside a layer', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 12, loop: false,
  cameras: { top: { pos: [0, -0.01, 12] }, iso: { pos: [7, -8, 7], target: [0, 0, 0.6] } },
  camOf: (s) => (s.case === 'channels' ? 'iso' : 'top'),
  defaults: { kern: 'vertical', stride: 1, pad: 0, dil: 1, pk: 'max', N: 28, F1: 8, F2: 16, ks: 3 },
  cases: [
    { id: 'dense', label: 'Dense layer', set: {}, examples: [] },
    { id: 'conv', label: 'Convolution', set: {}, examples: [
      { id: 'stride', label: 'Stride 2: skip positions', controls: ['stride'], set: { stride: 2 } },
      { id: 'pad', label: 'Padding 1: keep the size', controls: ['pad'], set: { pad: 1 } },
      { id: 'dil', label: 'Dilation 2: spaced-out taps', controls: ['dil'], set: { dil: 2 } },
      { id: 'blur', label: 'A blur kernel', controls: ['kern'], set: { kern: 'blur' } },
    ] },
    { id: 'pool', label: 'Pooling', set: {}, examples: [{ id: 'avg', label: 'Average instead of max', controls: ['pk'], set: { pk: 'avg' } }] },
    { id: 'channels', label: 'Channels (3D)', set: {}, examples: [] },
    { id: 'stack', label: 'A whole CNN', set: {}, examples: [{ id: 'wide', label: 'More filters', controls: ['F1', 'F2'], set: { F1: 32, F2: 64 } }] },
  ],
  controls: [
    { title: 'Convolution', show: (s) => s.case === 'conv', items: [
      { id: 'kern', label: 'Kernel', type: 'select', options: KOPT }, { id: 'stride', label: 'Stride', unit: '', min: 1, max: 3, step: 1 }, { id: 'pad', label: 'Padding', unit: '', min: 0, max: 2, step: 1 }, { id: 'dil', label: 'Dilation', unit: '', min: 1, max: 3, step: 1 },
    ] },
    { title: 'Pooling', show: (s) => s.case === 'pool', items: [{ id: 'pk', label: 'Kind', type: 'segmented', options: [['max', 'Max'], ['avg', 'Average']] }] },
    { title: 'Network', show: (s) => s.case === 'stack', items: [
      { id: 'N', label: 'Input size', unit: 'px', min: 8, max: 64, step: 4 }, { id: 'F1', label: 'Filters, layer 1', unit: '', min: 1, max: 64, step: 1 }, { id: 'F2', label: 'Filters, layer 2', unit: '', min: 1, max: 128, step: 1 }, { id: 'ks', label: 'Kernel size', unit: '', min: 1, max: 7, step: 2 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage, scene } = ctx;
    // cells are flat coloured squares (one instanced mesh) with outlines and number labels drawn on top
    const MAX = 400, quad = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, depthWrite: false }), MAX);
    quad.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3); quad.frustumCulled = false; scene.add(quad);
    const lines = createCurve(stage, { max: 9000, width: 1, color: '--line' }), hi = createCurve(stage, { max: 3000, width: 3, color: '--accent' }), hi2 = createCurve(stage, { max: 3000, width: 2.4, color: '--c-I' });
    const pool_ = []; const lab = () => { const l = ctx.label('', 'tick'); scene.add(l); pool_.push(l); return l; }; for (let i = 0; i < 220; i++) lab();
    let nq = 0, nl = 0, L = [], H = [], H2 = [];
    const m4 = new THREE.Matrix4(), col = new THREE.Color(), c0 = new THREE.Color(), c1 = new THREE.Color(), c2 = new THREE.Color();
    const begin = () => { nq = 0; nl = 0; L = []; H = []; H2 = []; pool_.forEach((l) => { l.visible = false; }); c0.set(cssVar('--c-B')); c1.set(cssVar('--panel-2')); c2.set(cssVar('--c-E')); };
    const end = () => { quad.count = nq; quad.instanceMatrix.needsUpdate = true; quad.instanceColor.needsUpdate = true; lines.segments(L); hi.segments(H); hi2.segments(H2); };
    const text = (t, x, y, z = 0.02) => { if (nl >= pool_.length) return; const l = pool_[nl++]; l.element.textContent = t; l.position.set(x, y, z); l.visible = true; };
    const rect = (arr, x, y, w, h, z = 0.01) => arr.push(x, y, z, x + w, y, z, x + w, y, z, x + w, y + h, z, x + w, y + h, z, x, y + h, z, x, y + h, z, x, y, z);
    // value → colour: negative blue, zero panel grey, positive yellow
    const tint = (v, s) => { const t = Math.max(-1, Math.min(1, v / (s || 1))); col.copy(c1).lerp(t < 0 ? c0 : c2, 0.62 * Math.abs(t)); return col; }; // muted, so the white numbers stay readable
    // a matrix of cells with top-left corner (x0, y0), cell size c; dim = cells outside the real data (padding)
    function grid(M, x0, y0, c, { scale = 1, nums = true, dim = () => false, z = 0 } = {}) {
      M.forEach((row, r) => row.forEach((v, k) => {
        const x = x0 + k * c, y = y0 - (r + 1) * c;
        if (nq < MAX) { m4.makeScale(c * 0.94, c * 0.94, 1).setPosition(x + c / 2, y + c / 2, z); quad.setMatrixAt(nq, m4); quad.setColorAt(nq, dim(r, k) ? col.copy(c1).multiplyScalar(0.55) : tint(v, scale)); nq++; }
        rect(L, x, y, c, c, z + 0.005); if (nums) text(fmt(v, Math.abs(v) < 10 ? 2 : 0), x + c / 2, y + c / 2, z + 0.02);
      }));
    }
    const cell = (arr, x0, y0, c, r, k, z = 0.02) => rect(arr, x0 + k * c + 0.02, y0 - (r + 1) * c + 0.02, c - 0.04, c - 0.04, z);
    return {
      changed() {
        const v3 = state.case === 'channels'; stage.setOrtho(!v3); stage.controls.enableRotate = v3; stage.preset(v3 ? 'iso' : 'top');
        ctx.setClock(state.case === 'stack' ? 0 : 12);
      },
      update() {
        const c = state.case, u = Math.min(1, time.t / 11.5); begin();
        if (c === 'dense') {
          const y = dense(W8, X4, B3), steps = 3 * 4, s = Math.min(steps - 1, Math.floor(u * steps)), j = Math.floor(s / 4), i = s % 4, cs = 0.62;
          grid(X4.map((v) => [v]), -4.4, 1.4, cs, { scale: 2 }); text('x', -4.4 + cs / 2, 1.65); text('input (4)', -4.4 + cs / 2, -1.25);
          grid(W8, -3.2, 1.4, cs, { scale: 2 }); text('W (3 × 4)', -3.2 + 2 * cs, 1.65);
          grid(B3.map((v) => [v]), -0.3, 1.4, cs, { scale: 2 }); text('b', -0.3 + cs / 2, 1.65);
          const shown = y.map((v, jj) => (jj < j ? v : jj === j ? W8[j].slice(0, i + 1).reduce((q, w, ii) => q + w * X4[ii], 0) + (i === 3 ? B3[j] : 0) : 0));
          grid(shown.map((v) => [v]), 1.2, 1.4, cs, { scale: 4 }); text('y = Wx + b', 1.2 + cs / 2, 1.65);
          for (let ii = 0; ii < 4; ii++) cell(H2, -3.2, 1.4, cs, j, ii); cell(H, -3.2, 1.4, cs, j, i); cell(H, -4.4, 1.4, cs, i, 0); cell(H, 1.2, 1.4, cs, j, 0);
          const terms = W8[j].map((w, ii) => `${fmt(w)}·${fmt(X4[ii])}`);
          text(`y${j + 1} = ${terms.slice(0, i + 1).join(' + ')}${i === 3 ? ` + ${fmt(B3[j])}` : ' + …'} = ${fmt(shown[j])}`, 0, -1.9);
          hud.set('a', `output ${j + 1} = row ${j + 1} of W (orange) · the whole input x, plus b${j + 1}`); hud.set('b', 'a dense layer is one dot product per output: 3 × 4 weights + 3 biases = 15 parameters');
          hud.set('c', 'every output sees every input: no notion of “near” — fine for vectors, wasteful for images');
          plots.aux.draw({ xlim: [0, 3], series: [{ x: [0.5, 1.5, 2.5], y, color: '--c-E', label: 'y₁, y₂, y₃ (final) vs output index' }] });
        } else if (c === 'conv' || c === 'channels') {
          const K = KERNELS[c === 'channels' ? 'vertical' : state.kern].k, o = c === 'channels' ? { stride: 1, pad: 0, dil: 1 } : { stride: state.stride, pad: state.pad, dil: state.dil };
          const X = c === 'channels' ? [IMG, IMG.map((r) => r.map((v, k) => v * (k % 2))), IMG.map((r) => [...r].reverse())] : IMG, Ks = c === 'channels' ? [K, K.map((r) => r.map((v) => -v)), KERNELS.blur.k] : K;
          const R = conv2d(X, Ks, o), Ho = R.out.length, Wo = R.out[0]?.length || 0, n = Ho * Wo, p = Math.min(n - 1, Math.floor(u * n)), pm = Math.floor(p / Wo), pn = p % Wo, taps = R.taps[pm][pn];
          if (c === 'conv') {
            const P = o.pad, Xp = Array.from({ length: 7 + 2 * P }, (_, r) => Array.from({ length: 7 + 2 * P }, (_, k) => IMG[r - P]?.[k - P] ?? 0)), cs = Math.min(0.42, 3.6 / (7 + 2 * P)), x0 = -4.5, y0 = 2.0;
            grid(Xp, x0, y0, cs, { dim: (r, k) => r < P || k < P || r >= 7 + P || k >= 7 + P }); text(`input 7×7${P ? ` + padding ${P}` : ''}`, x0 + (7 + 2 * P) * cs / 2, y0 + 0.2);
            for (const [i, j] of taps) cell(H, x0, y0, cs, i + P, j + P);
            const kc = 0.5, kx = -0.6, ky = 1.2; grid(K, kx, ky, kc, { scale: 1 }); text(`kernel: ${KERNELS[state.kern].label}`, kx + 1.5 * kc, ky + 0.2);
            const oc = Math.min(0.5, 2.6 / Math.max(Ho, Wo)), ox = 1.9, oy = 2.0, shown = R.out.map((row, r) => row.map((v, k) => (r * Wo + k <= p ? v : 0)));
            grid(shown, ox, oy, oc, { scale: 3, dim: (r, k) => r * Wo + k > p }); cell(H, ox, oy, oc, pm, pn); text(`output ${Ho}×${Wo}`, ox + Wo * oc / 2, oy + 0.2);
            const sum = taps.map(([i, j, a, b]) => (i >= 0 && i < 7 && j >= 0 && j < 7 ? `${fmt(IMG[i][j], 0)}·${fmt(K[a][b])}` : null)).filter(Boolean);
            text(`output (${pm + 1}, ${pn + 1}) = Σ patch × kernel = ${sum.slice(0, 5).join(' + ')}${sum.length > 5 ? ' + …' : ''} = ${fmt(R.out[pm][pn])}`, 0, -2.0);
            hud.set('a', `size: (N + 2p − d(k − 1) − 1)/s + 1 = (7 + ${2 * P} − ${o.dil}·2 − 1)/${o.stride} + 1 = ${Ho}`);
            hud.set('b', 'the same 9 weights at every position: the layer looks for one pattern everywhere'); hud.set('c', o.dil > 1 ? 'dilation spreads the taps: a wider view with the same 9 weights' : o.stride > 1 ? 'stride skips positions: a smaller output' : P ? 'zero padding lets the kernel sit on the border: the size is kept' : 'positive (yellow) where the pattern matches, negative (blue) where it is reversed');
            const st = [1, 2, 3]; plots.aux.draw({ xlim: [1, 3], cursor: o.stride, series: [0, 1, 2].map((pp) => ({ x: st, y: st.map((s) => outSize(7, 3, { stride: s, pad: pp, dil: o.dil })), color: ['--c-B', '--c-v', '--c-I'][pp], label: `padding ${pp}` })).concat([{ x: [], y: [], color: '--ink-dim', label: 'output size vs stride' }]) });
          } else {
            // three channel slabs stacked in z, the k×k×3 filter block, and the single output map beside them
            const cs = 0.42, x0 = -3.6, y0 = 1.5, gap = 0.9;
            X.forEach((M, ch) => { grid(M, x0, y0, cs, { nums: false, z: ch * gap }); text(`channel ${ch + 1}`, x0 - 0.5, y0 - 1.5, ch * gap); });
            for (let ch = 0; ch < 3; ch++) for (const [i, j] of taps) cell(H, x0, y0, cs, i, j, ch * gap + 0.03);
            const [i0, j0] = taps[0], bx = x0 + j0 * cs, by = y0 - (i0 + 3) * cs, top = 2 * gap + 0.05; for (const [dx, dy] of [[0, 0], [3 * cs, 0], [0, 3 * cs], [3 * cs, 3 * cs]]) H2.push(bx + dx, by + dy, 0, bx + dx, by + dy, top);
            const ox = 0.9, oy = 1.5, shown = R.out.map((row, r) => row.map((v, k) => (r * Wo + k <= p ? v : 0)));
            grid(shown, ox, oy, cs, { scale: 3, nums: false, dim: (r, k) => r * Wo + k > p }); cell(H, ox, oy, cs, pm, pn); text('output map (one per filter)', ox + 1, oy + 0.3);
            hud.set('a', 'one filter = a k × k × C block: it sits on all channels at once and their products are summed into ONE number');
            hud.set('b', `this layer: 3 × 3 × 3 = 27 weights + 1 bias per filter; output (${pm + 1}, ${pn + 1}) = ${fmt(R.out[pm][pn])}`); hud.set('c', 'F filters → F output maps: the channel count of the next layer is the number of filters');
            plots.aux.draw({ xlim: [1, 64], series: [{ x: [1, 64], y: [28, 28 * 64], color: '--c-F', label: 'weights per 3×3 filter vs input channels (9C + 1)' }] });
          }
        } else if (c === 'pool') {
          const O = pool(FM, 2, state.pk), n = 9, p = Math.min(n - 1, Math.floor(u * n)), pm = Math.floor(p / 3), pn = p % 3, cs = 0.55;
          grid(FM, -4.3, 1.8, cs, { scale: 6 }); text('feature map 6×6', -4.3 + 3 * cs, 2.05);
          for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) cell(H, -4.3, 1.8, cs, 2 * pm + a, 2 * pn + b);
          grid(O.map((row, r) => row.map((v, k) => (r * 3 + k <= p ? v : 0))), 0.6, 1.8, cs * 1.4, { scale: 6, dim: (r, k) => r * 3 + k > p }); cell(H, 0.6, 1.8, cs * 1.4, pm, pn); text(`${state.pk} pool 2×2, stride 2 → 3×3`, 0.6 + 2.1 * cs, 2.05);
          hud.set('a', `${state.pk === 'max' ? 'max' : 'average'} of the 4 cells = ${fmt(O[pm][pn])}`); hud.set('b', 'no weights at all: pooling only summarises each window'); hud.set('c', 'it throws away the exact position: a feature that shifts by one pixel usually gives the same output');
          plots.aux.draw({ xlim: [0, 9], series: [{ x: Array.from({ length: 9 }, (_, i) => i + 0.5), y: O.flat(), color: '--c-E', label: 'pooled values vs window number' }] });
        } else {
          const S = stack(state.N, 1, state.F1, state.F2, state.ks), n = S.length, sx = 8.4 / n, maxH = Math.max(...S.map((l) => l.h)), maxC = Math.max(...S.map((l) => l.c));
          S.forEach((l, i) => { const w = 0.15 + 0.9 * Math.sqrt(l.c / maxC), h = 0.25 + 2.6 * l.h / maxH, x = -4.3 + i * sx + (sx - w) / 2, y = 0.4 - h / 2; rect(L, x, y, w, h); rect(H2, x + 0.1, y + 0.1, w, h, 0.005); text(l.name, x + w / 2, 2.25); text(`${l.h}×${l.h}×${l.c}`, x + w / 2, -1.45); text(`${l.params.toLocaleString('en')} params`, x + w / 2, -1.8); });
          const tot = S.reduce((a, l) => a + l.params, 0);
          hud.set('a', `total ${tot.toLocaleString('en')} parameters; the dense layer alone has ${S[n - 1].params.toLocaleString('en')} (${fmt(100 * S[n - 1].params / tot, 1)}%)`);
          hud.set('b', 'spatial size shrinks (height of the boxes) while channels grow (width): resolution traded for description'); hud.set('c', `a conv layer has (k·k·C_in + 1)·F parameters, independent of the image size`);
          plots.aux.draw({ xlim: [0, n - 1], series: [{ x: S.map((_, i) => i), y: S.map((l) => Math.log10(Math.max(1, l.params))), color: '--c-F', label: 'log₁₀ parameters vs layer' }, { x: S.map((_, i) => i), y: S.map((l) => Math.log10(l.h * l.h * l.c)), color: '--c-B', label: 'log₁₀ activations' }] });
        }
        end();
      },
      theme() { lines.theme(); hi.theme(); hi2.theme(); },
    };
  },
};
