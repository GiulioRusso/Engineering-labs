// Information measured in bits: the surprisal and entropy of a five-symbol source (and of a coin), the
// Huffman code built merge by merge, and the binary symmetric channel with its capacity.
import { createChart } from '../../lib/viz/chart.js';
import { thin } from '../../lib/ui/schema.js';
import { rng } from '../../lib/random.js';
import { log2, normalize, entropy, H2, huffman, avgLength, mutualInfo, capacity, pY1 } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-12 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9];
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1 || 1));
const SYM = 'ABCDE', IDX = [1, 2, 3, 4, 5], NS = 400, MERGE = 1.6;
const W = ['w1', 'w2', 'w3', 'w4', 'w5'];
// draw from p with a uniform number
const draw = (p, u) => { let s = 0; for (let i = 0; i < p.length; i++) { s += p[i]; if (u < s) return i; } return p.length - 1; };

export default {
  id: 'entropy', title: 'Entropy and coding', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 10, loop: false,
  defaults: { w1: 4, w2: 2, w3: 2, w4: 1, w5: 1, pc: 0.5, e: 0.1, q: 0.5 },
  cases: [
    { id: 'entropy', label: 'Entropy', set: {}, controls: W, examples: [
      { id: 'uniform', label: 'All equal: log₂ 5 = 2.32 bits, the most', set: { w1: 1, w2: 1, w3: 1, w4: 1, w5: 1 } },
      { id: 'certain', label: 'Almost certain: almost no information', set: { w1: 10, w2: 0.1, w3: 0.1, w4: 0.1, w5: 0.1 } },
      { id: 'coin', label: 'A biased coin', controls: ['pc'], set: { pc: 0.1 } },
    ] },
    { id: 'huffman', label: 'Huffman code', set: {}, controls: W, examples: [
      { id: 'dyadic', label: 'Powers of ½: the code hits the entropy', set: { w1: 8, w2: 4, w3: 2, w4: 1, w5: 1 } },
      { id: 'flat', label: 'Nearly uniform: no gain over 3-bit words', set: { w1: 1.2, w2: 1, w3: 1, w4: 1, w5: 1 } },
    ] },
    { id: 'channel', label: 'Channel capacity', set: {}, examples: [
      { id: 'half', label: 'e = ½: the output says nothing', controls: ['e'], set: { e: 0.5 } },
      { id: 'skew', label: 'Unequal inputs waste capacity', controls: ['q'], set: { q: 0.15 } },
    ] },
  ],
  controls: [
    { title: 'Source weights (normalised to probabilities)', show: (s) => s.case !== 'channel', items: W.map((id, i) => ({ id, label: `Symbol ${SYM[i]}`, unit: '', min: 0.1, max: 10, step: 0.1 })) },
    { title: 'Coin', show: (s) => s.case === 'entropy', items: [{ id: 'pc', label: 'P(heads)', unit: '', min: 0, max: 1, step: 0.01 }] },
    { title: 'Binary symmetric channel', show: (s) => s.case === 'channel', items: [{ id: 'e', label: 'Flip probability e', unit: '', min: 0, max: 0.5, step: 0.005 }, { id: 'q', label: 'Input P(X = 1)', unit: '', min: 0, max: 1, step: 0.01 }] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage, scene } = ctx;
    stage.controls.enableRotate = false;
    // Shannon's model of communication: where this topic sits in the chain (lit), with the bits on the wires
    const chainSch = ctx.schema({ title: 'Shannon’s communication chain', gap: 40, items: [{ id: 'src', kind: 'box', t: 'source', c: 0 }, { id: 'senc', kind: 'box', t: 'compress', c: 1, label: 'source coder' }, { id: 'cenc', kind: 'box', t: 'add parity', c: 2, label: 'channel coder' },
      { id: 'ch', kind: 'box', t: 'channel', c: 3 }, { id: 'noise', kind: 'box', t: 'noise', c: 3, r: 1, h: 24 }, { id: 'cdec', kind: 'box', t: 'correct', c: 4, label: 'channel decoder' }, { id: 'sdec', kind: 'box', t: 'expand', c: 5, label: 'source decoder' }, { id: 'dst', kind: 'box', t: 'sink', c: 6 }],
      wires: [['src', 'senc'], ['senc', 'cenc'], ['cenc', 'ch'], ['ch', 'cdec'], ['cdec', 'sdec'], ['sdec', 'dst'], ['noise', 'ch', { v: true }]],
      tiles: [{ id: 'a', wire: 1 }, { id: 'b', wire: 2 }, { id: 'c', wire: 3 }, { id: 'd', wire: 4 }] });
    const bitsTile = (bits, ref) => [{ y: bits.map((b, i) => (ref && b !== ref[i] ? 0 : 2 * b - 1)), color: '--c-B', stems: true }, { y: bits.map((b, i) => (ref && b !== ref[i] ? 2 * b - 1 : 0)), color: '--c-north', stems: true }];
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), charts = [sq, tr, br];
    const pool = Array.from({ length: 30 }, () => { const l = ctx.label('', 'tick'); scene.add(l); return l; }); let nl = 0;
    const text = (t, x, y) => { if (nl >= pool.length) return; const l = pool[nl++]; l.element.textContent = t; l.position.set(sq.mx(x), sq.my(y), 0.02); l.visible = true; };
    const probs = () => normalize(W.map((k) => state[k]));
    const samples = (p) => { const r = rng(7); return Array.from({ length: NS }, () => draw(p, r())); };
    const ns = lin(1, NS, NS);
    return {
      changed() { const c = state.case; charts.forEach((k) => { k.show(false); k.show(true); }); if (c !== 'entropy') sq.show(false); ctx.setClock(c === 'channel' ? 0 : c === 'huffman' ? MERGE * 4 + 1 : 10); },
      update() {
        nl = 0; pool.forEach((l) => { l.visible = false; });
        const c = state.case, p = probs(), H = entropy(p);
        chainSch.update({ lit: c === 'entropy' ? ['src'] : c === 'huffman' ? ['senc', 'sdec'] : ['ch', 'noise'], text: { src: c === 'entropy' ? `H = ${fmt(H, 3)} bits` : 'source', senc: c === 'huffman' ? 'Huffman' : 'compress', cenc: 'add parity', ch: 'channel' }, tiles: c === 'huffman' ? (() => { const { codes } = huffman(p), xs = samples(p).slice(0, 10), bits = xs.flatMap((s) => codes[s].split('').map(Number)); return { a: [{ y: xs.map((s) => s + 1), color: '--c-v', stems: true }], b: bitsTile(bits.slice(0, 24)), c: null, d: null }; })() : c === 'entropy' ? { a: [{ y: samples(p).slice(0, 24).map((s) => s + 1), color: '--c-v', stems: true }], b: null, c: null, d: null } : { a: null, b: null, c: null, d: null } });
        if (c === 'entropy') {
          const S = p.map((q) => -log2(q)), xs = samples(p), k = Math.max(1, Math.floor(Math.min(1, time.t / 9.5) * NS));
          sq.range([0.4, 5.6], [0, 1]); sq.titles('symbol A … E', 'probability p (blue) and surprisal −log₂ p ÷ 8 (orange)');
          sq.stems('p', IDX, p, { color: '--c-B', width: 18 }); sq.stems('s', IDX.map((i) => i + 0.22), S.map((v) => v / 8), { color: '--c-I', width: 6 });
          const pc = lin(0, 1, 201); tr.range([0, 1], [0, 1.05]); tr.titles('P(heads)', 'entropy of a coin H₂ (bits)'); tr.line('h', pc, pc.map(H2), { color: '--c-v' }); tr.dots('q', [state.pc], [H2(state.pc)], { color: '--accent', size: 11 });
          // the running average surprisal of the sampled message converges to H
          let acc = 0; const run = xs.map((s) => (acc += S[s])).map((v, i) => v / (i + 1));
          br.range([0, NS], [0, Math.max(3, ...run.slice(0, 20)) * 1.05]); br.titles('symbols drawn', 'average surprisal so far (bits): → H');
          br.line('r', ns.slice(0, k), run.slice(0, k), { color: '--c-I' }); br.line('H', [0, NS], [H, H], { color: '--c-B', dashed: true, width: 1.2 }); br.line('m', [0, NS], [log2(5), log2(5)], { color: '--ink-dim', dashed: true, width: 1 });
          hud.set('a', `H = Σ p·log₂(1/p) = ${fmt(H, 4)} bits per symbol (most possible: log₂ 5 = 2.32); coin: ${fmt(H2(state.pc), 3)} bits`);
          hud.set('b', `message: ${xs.slice(Math.max(0, k - 48), k).map((s) => SYM[s]).join('')}`);
          hud.set('c', 'surprisal log₂(1/p): a rare symbol tells you more. Entropy is the average surprise — the bits a perfect code needs per symbol');
          plots.aux.draw({ xlim: [0.5, 5.5], series: [{ x: IDX, y: p.map((q) => -q * log2(q)), color: '--c-v', label: 'contribution p·log₂(1/p) of each symbol vs symbol' }] });
        } else if (c === 'huffman') {
          const { codes, nodes } = huffman(p), n = p.length, shown = Math.min(n - 1, Math.floor(time.t / MERGE) + 1), L = avgLength(p, codes);
          // layout: leaves in tree order along the bottom, every internal node above the middle of its children
          const pos = new Array(nodes.length), depth = (k) => (nodes[k].l === undefined ? 0 : 1 + Math.max(depth(nodes[k].l), depth(nodes[k].r)));
          let slot = 0; const place = (k) => { const q = nodes[k]; if (q.l === undefined) { pos[k] = [slot++, 0]; return; } place(q.l); place(q.r); pos[k] = [(pos[q.l][0] + pos[q.r][0]) / 2, depth(k)]; };
          place(nodes.length - 1);
          const D = depth(nodes.length - 1); sq.range([-0.8, n - 0.2], [-0.9, D + 0.6]);
          const ex = [], ey = [];
          for (let k = n; k < n + shown; k++) { const q = nodes[k]; for (const [ch, bit] of [[q.l, '0'], [q.r, '1']]) { sq.line(`e${k}${bit}`, [pos[k][0], pos[ch][0]], [pos[k][1], pos[ch][1]], { color: bit === '0' ? '--c-B' : '--c-I', width: 2 }); text(bit, (pos[k][0] + pos[ch][0]) / 2 + (bit === '0' ? -0.15 : 0.15), (pos[k][1] + pos[ch][1]) / 2); } text(fmt(q.p, 2), pos[k][0], pos[k][1] + 0.28); ex.push(pos[k][0]); ey.push(pos[k][1]); }
          for (let k = n; k < 2 * n - 1; k++) if (k >= n + shown) for (const b of '01') sq.hide(`e${k}${b}`);
          sq.dots('in', ex, ey, { color: '--c-v', size: 10 }); sq.dots('lv', nodes.slice(0, n).map((_, i) => pos[i][0]), nodes.slice(0, n).map(() => 0), { color: '--accent', size: 12 });
          const done = shown === n - 1;
          for (let i = 0; i < n; i++) { text(`${SYM[i]} ${fmt(p[i], 2)}`, pos[i][0], -0.35); text(done ? codes[i] : '', pos[i][0], -0.65); }
          tr.range([0.4, 5.6], [0, Math.max(5, ...codes.map((s) => s.length)) + 0.5]); tr.titles('symbol', 'code length ℓ (bars) vs ideal −log₂ p (dots)');
          tr.stems('l', IDX, codes.map((s) => s.length), { color: '--c-I', width: 14 }); tr.dots('i', IDX, p.map((q) => -log2(q)), { color: '--c-B', size: 10 });
          br.range([0.4, 3.6], [0, 3.4]); br.titles('entropy H · Huffman L · fixed length', 'bits per symbol'); br.stems('b', [1, 2, 3], [H, L, 3], { color: '--c-v', width: 24 });
          hud.set('a', done ? `code: ${codes.map((s, i) => `${SYM[i]}=${s}`).join('  ')}` : `merge ${shown} of ${n - 1}: join the two least likely nodes into one`);
          hud.set('b', `average length L = ${fmt(L, 4)} bits vs entropy H = ${fmt(H, 4)}: within ${fmt(L - H, 2)} bit (always < 1); fixed 3-bit words waste ${fmt(3 - L, 2)}`, L - H < 0.05 ? 'good' : '');
          hud.set('c', 'no codeword is the start of another (prefix-free), so a stream of bits decodes without separators');
          const xs = samples(p); let a = 0; const cum = xs.map((s) => (a += codes[s].length));
          plots.aux.draw({ xlim: [1, NS], series: [{ x: ns, y: cum, color: '--c-I', label: 'Huffman bits vs symbols sent' }, { x: ns, y: ns.map((m) => 3 * m), color: '--ink-dim', label: 'fixed 3 bits' }, { x: ns, y: ns.map((m) => H * m), color: '--c-B', label: 'n·H' }] });
        } else {
          const e = state.e, q = state.q, X0 = 0.5, X1 = 3.5, Y0 = 0.6, Y1 = 2.6;
          sq.range([0, 4], [0, 3.2]);
          sq.line('s0', [X0, X1], [Y0, Y0], { color: '--c-v', width: 1 + 5 * (1 - e) }); sq.line('s1', [X0, X1], [Y1, Y1], { color: '--c-v', width: 1 + 5 * (1 - e) });
          sq.line('x0', [X0, X1], [Y0, Y1], { color: '--c-north', width: 1 + 5 * e }); sq.line('x1', [X0, X1], [Y1, Y0], { color: '--c-north', width: 1 + 5 * e });
          sq.dots('n', [X0, X0, X1, X1], [Y0, Y1, Y0, Y1], { color: '--accent', size: 16 });
          text(`X = 0  (${fmt(1 - q, 2)})`, X0 - 0.1, Y0 - 0.35); text(`X = 1  (${fmt(q, 2)})`, X0 - 0.1, Y1 + 0.35); text(`Y = 0  (${fmt(1 - pY1(q, e), 2)})`, X1 + 0.1, Y0 - 0.35); text(`Y = 1  (${fmt(pY1(q, e), 2)})`, X1 + 0.1, Y1 + 0.35);
          text(`1 − e = ${fmt(1 - e, 2)}`, 2, Y1 + 0.2); text(`1 − e = ${fmt(1 - e, 2)}`, 2, Y0 - 0.2); text(`e = ${fmt(e, 2)}`, 1.4, 1.95); text(`e = ${fmt(e, 2)}`, 1.4, 1.25);
          const qs = lin(0, 1, 201), es = lin(0, 1, 201), C = capacity(e), I = mutualInfo(q, e);
          tr.range([0, 1], [0, 1.05]); tr.titles('input P(X = 1)', 'I(X; Y) bits per use: peaks at ½'); tr.line('i', qs, qs.map((v) => mutualInfo(v, e)), { color: '--c-B' }); tr.dots('q', [q], [I], { color: '--accent', size: 11 });
          br.range([0, 1], [0, 1.05]); br.titles('flip probability e', 'capacity C = 1 − H₂(e)'); br.line('c', es, es.map(capacity), { color: '--c-v' }); br.dots('q', [e], [C], { color: '--accent', size: 11 });
          hud.set('a', `I(X; Y) = H(Y) − H(Y|X) = ${fmt(H2(pY1(q, e)), 3)} − ${fmt(H2(e), 3)} = ${fmt(I, 3)} bits per use; capacity ${fmt(C, 3)}`, I > 0.95 * C ? 'good' : 'bad');
          hud.set('b', 'H(Y|X) = H₂(e) is the noise: the uncertainty left about the output even when you know what was sent');
          hud.set('c', 'Shannon: below C bits per use, coding can make errors as rare as you like; above C, no code can');
          plots.aux.draw({ xlim: [0, 1], cursor: q, series: [{ x: qs, y: qs.map((v) => H2(pY1(v, e))), color: '--c-B', label: 'H(Y) vs input P(X = 1)' }, { x: [0, 1], y: [H2(e), H2(e)], color: '--c-north', label: 'H(Y|X)' }] });
        }
      },
      theme() { charts.forEach((k) => k.theme()); },
    };
  },
};
