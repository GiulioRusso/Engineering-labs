// Typical sequences (the probability piles up where the surprise is H), mutual information on a joint
// table with its information diagram, CRC as long division over GF(2), and a convolutional code decoded
// on its trellis by the Viterbi algorithm.
import { createChart } from '../../lib/viz/chart.js';
import { rect } from '../../probability/core/draw.js';
import { Hb, typical, typicalSet, channel, GENS, crc, remainder, flip, missed, missedBursts, encode, viterbi } from './model.js';
import { rng } from '../../lib/random.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-12 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9], VS = 0.55;
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1 || 1));
const MSG = { a: { label: '1101011011', bits: '1101011011' }, b: { label: '11010011101100 (textbook)', bits: '11010011101100' }, c: { label: '1000000001', bits: '1000000001' } };
const VMSG = [1, 0, 1, 1, 0, 0, 1, 0, 1, 1];

export default {
  id: 'codes', title: 'Codes and information', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 0, loop: false,
  defaults: { p: 0.2, ln: 2, delta: 0.05, n: 4, e: 0.1, skew: 0, msg: 'a', gen: 'c3', f1: 0, f2: 0, f3: 0, v1: 3, v2: 0, v3: 0 },
  cases: [
    { id: 'typical', label: 'Typical sequences', set: {}, examples: [
      { id: 'short', label: '10 flips: no concentration yet', controls: ['ln'], set: { ln: 1 } },
      { id: 'long', label: '2000 flips: almost all typical', controls: ['ln'], set: { ln: 3.3 } },
      { id: 'fair', label: 'Fair coin: every sequence typical', controls: ['p'], set: { p: 0.5 } },
    ] },
    { id: 'mutual', label: 'Mutual information', set: {}, examples: [
      { id: 'clean', label: 'e = 0: I = H(X)', controls: ['e'], set: { e: 0 } },
      { id: 'useless', label: 'e = ¾: nothing gets through', controls: ['e'], set: { e: 0.75 } },
      { id: 'skew', label: 'Skewed input: less than capacity', controls: ['skew'], set: { skew: 1 } },
    ] },
    { id: 'crc', label: 'CRC', set: {}, examples: [
      { id: 'one', label: 'One flipped bit: caught', controls: ['f1'], set: { f1: 5 } },
      { id: 'burst', label: 'A burst of 3: caught', controls: ['f1', 'f2', 'f3'], set: { f1: 6, f2: 7, f3: 8 } },
      { id: 'miss', label: 'Flips that look like the generator: missed', controls: ['f1', 'f2', 'f3'], set: { f1: 4, f2: 6, f3: 7 } },
    ] },
    { id: 'viterbi', label: 'Viterbi', set: {}, examples: [
      { id: 'two', label: 'Two flips far apart: corrected', controls: ['v1', 'v2'], set: { v1: 3, v2: 16 } },
      { id: 'close', label: 'Three flips close together: fooled', controls: ['v1', 'v2', 'v3'], set: { v1: 5, v2: 6, v3: 8 } },
    ] },
  ],
  controls: [
    { title: 'Coin flips', show: (s) => s.case === 'typical', items: [
      { id: 'p', label: 'P(1)', unit: '', min: 0.02, max: 0.5, step: 0.01 }, { id: 'ln', label: 'log₁₀ n (flips)', unit: '', min: 1, max: 3.3, step: 0.05 },
      { id: 'delta', label: 'Typical band ±δ', unit: 'bit', min: 0.01, max: 0.2, step: 0.005 },
    ] },
    { title: 'Symmetric channel', show: (s) => s.case === 'mutual', items: [
      { id: 'n', label: 'Symbols', unit: '', min: 2, max: 6, step: 1 }, { id: 'e', label: 'Error probability e', unit: '', min: 0, max: 0.95, step: 0.01 },
      { id: 'skew', label: 'Input skew (0 = uniform)', unit: '', min: 0, max: 2, step: 0.02 },
    ] },
    { title: 'CRC', show: (s) => s.case === 'crc', items: [
      { id: 'msg', label: 'Message', type: 'select', options: Object.entries(MSG).map(([k, v]) => [k, v.label]) },
      { id: 'gen', label: 'Generator', type: 'select', options: Object.entries(GENS).map(([k, v]) => [k, v.label]) },
      { id: 'f1', label: 'Flip bit (0 = none)', unit: '', min: 0, max: 22, step: 1 }, { id: 'f2', label: 'Flip bit', unit: '', min: 0, max: 22, step: 1 }, { id: 'f3', label: 'Flip bit', unit: '', min: 0, max: 22, step: 1 },
    ] },
    { title: 'Received bits to flip (0 = none)', show: (s) => s.case === 'viterbi', items: [
      { id: 'v1', label: 'Flip', unit: '', min: 0, max: 24, step: 1 }, { id: 'v2', label: 'Flip', unit: '', min: 0, max: 24, step: 1 }, { id: 'v3', label: 'Flip', unit: '', min: 0, max: 24, step: 1 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage, scene } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), bare = createChart(ctx, { box: SQ, xTicks: false, yTicks: false, grid: false }), all = [sq, tr, br, bare];
    const pool = Array.from({ length: 130 }, () => { const l = ctx.label('', 'tick'); scene.add(l); return l; });
    let used = 0; const put = (t, x, y) => { const l = pool[used++]; if (!l) return; l.element.textContent = t; l.position.set(x, y, 0.02); l.visible = true; };
    let BER = null;

    function typicalCase() {
      const n = Math.round(10 ** state.ln), p = state.p, h = Hb(p), T = typical(n, p), d = state.delta, smax = -Math.log2(Math.min(p, 1 - p)) * 1.02, mx = Math.max(...T.map((q) => q.mass));
      sq.range([0, smax], [0, mx * 1.15]); sq.titles('surprise per flip, −log₂ P(sequence) / n (bits)', `probability: all ${n}-flip sequences grouped by their surprise; green = typical (±δ of H)`);
      const inn = T.filter((q) => Math.abs(q.s - h) <= d), out = T.filter((q) => Math.abs(q.s - h) > d);
      sq.stems('o', out.map((q) => q.s), out.map((q) => q.mass), { color: '--c-ref', width: n > 300 ? 1.5 : 4, max: 4200 }); sq.stems('i', inn.map((q) => q.s), inn.map((q) => q.mass), { color: '--c-v', width: n > 300 ? 1.5 : 4, max: 4200 });
      sq.line('h', [h, h], [0, mx * 1.15], { color: '--c-I', width: 1.6 }); for (const s of [-1, 1]) sq.line(`b${s}`, [h + s * d, h + s * d], [0, mx * 1.15], { color: '--c-I', width: 1, dashed: true });
      const ns = lin(1, 3.3, 40).map((l) => Math.round(10 ** l)), S = ns.map((m) => typicalSet(m, p, d)), S0 = typicalSet(n, p, d);
      tr.range([1, 3.3], [0, 1.05]); tr.titles('log₁₀ n', 'probability of the typical set'); tr.line('m', ns.map(Math.log10), S.map((q) => q.mass), { color: '--c-v' }); tr.dots('c', [state.ln], [S0.mass], { color: '--accent', size: 10 });
      br.range([1, 3.3], [0, 1.1]); br.titles('log₁₀ n', 'bits per flip to number the typical set (green), H (orange), 1 bit (grey)');
      br.line('r', ns.map(Math.log10), S.map((q) => q.rate), { color: '--c-v' }); br.line('h', [1, 3.3], [h, h], { color: '--c-I', dashed: true, width: 1.2 }); br.line('one', [1, 3.3], [1, 1], { color: '--ink-dim', width: 1.2 });
      let c = 0; const cdf = T.slice().sort((a, b) => a.s - b.s).map((q) => [q.s, (c += q.mass)]);
      plots.aux.draw({ xlim: [0, smax], series: [{ x: cdf.map((q) => q[0]), y: cdf.map((q) => q[1]), color: '--c-v', label: 'P(surprise per flip ≤ s)' }], xlabel: 'surprise per flip s (bits)' });
      hud.set('a', `n = ${n} flips with P(1) = ${p}: H = ${fmt(h)} bit per flip; ${fmt(100 * S0.mass, 3)} % of the probability is in the typical band`);
      hud.set('b', `the typical set has about 2^(${fmt(S0.rate * n, 4)}) members: ${fmt(S0.rate)} bits per flip to number them, against 1 bit to write every sequence`, S0.mass > 0.9 ? 'good' : '');
      hud.set('c', 'the law of large numbers for surprise: long sequences almost all have surprise ≈ nH, and there are only ≈ 2^{nH} of them — so nH bits suffice (Shannon\'s source coding theorem)');
    }

    function mutualCase() {
      const n = Math.round(state.n), C = channel(n, state.e, state.skew);
      bare.range([0, n], [0, n]); bare.titles('', ': joint probability P(x, y): rows x sent, columns y received; brighter = larger');
      const mxJ = Math.max(...C.J.flat()), U = 16, img = []; for (let a = 0; a < n * U; a++) for (let b = 0; b < n * U; b++) img.push(C.J[n - 1 - Math.floor(a / U)][Math.floor(b / U)]);
      bare.image('j', img, n * U, n * U, { map: 'viridis', norm: (v) => Math.sqrt(v / mxJ) });
      const w = SQ[2] / n, hh = SQ[3] / n; C.J.forEach((row, i) => row.forEach((v, j) => put(fmt(v, 2), SQ[0] + w * (j + 0.5), SQ[1] + hh * (n - i - 0.5))));
      C.px.forEach((v, i) => put(`x${i + 1} ${fmt(v, 2)}`, SQ[0] - 0.42, SQ[1] + hh * (n - i - 0.5)));
      // the information diagram
      tr.range([0, Math.max(C.hxy, 0.5) * 1.05], [0, 3.2]); tr.titles('bits', ': H(X) (top), H(Y) (middle), H(X, Y) (bottom); green overlap = I(X; Y)');
      rect(tr, 'x1', 0, C.hxgy, 2.2, 3, '--c-ref'); rect(tr, 'x2', C.hxgy, C.hx, 2.2, 3, '--c-v'); rect(tr, 'y1', C.hxgy, C.hx, 1.2, 2, '--c-v'); rect(tr, 'y2', C.hx, C.hxy, 1.2, 2, '--c-I'); rect(tr, 'j', 0, C.hxy, 0.2, 1, '--c-B');
      const es = lin(0, 0.95, 96); br.range([0, 0.95], [0, Math.log2(n) * 1.05]); br.titles('error probability e', 'I(X; Y): this input (green), uniform input = capacity (grey)');
      br.line('u', es, es.map((e) => channel(n, e, 0).I), { color: '--ink-dim', width: 1.6 }); br.line('i', es, es.map((e) => channel(n, e, state.skew).I), { color: '--c-v', width: 2 }); br.dots('c', [state.e], [C.I], { color: '--accent', size: 10 });
      const sk = lin(0, 2, 60); plots.aux.draw({ xlim: [0, 2], cursor: state.skew, series: [{ x: sk, y: sk.map((k) => channel(n, state.e, k).I), color: '--c-v', label: 'I(X; Y) (bits)' }, { x: sk, y: sk.map((k) => channel(n, state.e, k).hx), color: '--c-ref', label: 'H(X)' }], xlabel: 'input skew' });
      hud.set('a', `H(X) = ${fmt(C.hx)}, H(Y) = ${fmt(C.hy)}, H(X, Y) = ${fmt(C.hxy)} bits`);
      hud.set('b', `I(X; Y) = H(X) − H(X|Y) = ${fmt(C.hx)} − ${fmt(C.hxgy)} = ${fmt(C.I)} bits per symbol get through`, C.I > 0.5 * C.hx ? 'good' : '');
      hud.set('c', 'mutual information is what the output tells you about the input: the overlap of the two uncertainties. Its maximum over inputs is the capacity');
    }

    function crcCase() {
      const data = MSG[state.msg].bits, g = GENS[state.gen].bits, R = crc(data, g), r = g.length - 1, N = data.length + r, pos = [state.f1, state.f2, state.f3].filter((v) => v > 0 && v <= N).map((v) => v - 1), rx = flip(R.code, pos), rem = remainder(rx, g), bad = /^0+$/.test(rem) === false;
      bare.range([0, 1], [0, 1]); bare.titles('', `: long division of the message·x^${r} by ${g}, XOR wherever the leading bit is 1`);
      const rows = [['  ', data + '0'.repeat(r)]]; let cur = data + '0'.repeat(r);
      for (const s of R.steps) { rows.push(['+ ', ' '.repeat(s.at) + g + ' '.repeat(N - s.at - g.length)]); rows.push(['= ', s.after]); cur = s.after; }
      const shown = rows.length > 22 ? [rows[0], ...rows.slice(-21)] : rows, dy = Math.min(0.2, 3.6 / (shown.length + 4));
      shown.forEach(([m, txt], i) => put(m + txt.replace(/ /g, ' '), SQ[0] + SQ[2] / 2, SQ[1] + SQ[3] - 0.25 - i * dy));
      put(`remainder ${cur.slice(-r)} → codeword ${R.code}`, SQ[0] + SQ[2] / 2, SQ[1] + SQ[3] - 0.25 - (shown.length + 0.6) * dy);
      put(`received ${rx}${pos.length ? '  (' + pos.map((q) => q + 1).join(', ') + ' flipped)' : ''}`, SQ[0] + SQ[2] / 2, SQ[1] + SQ[3] - 0.25 - (shown.length + 1.6) * dy);
      put(`receiver's remainder ${rem}: ${bad ? 'error detected' : pos.length ? 'NOT detected' : 'accepted'}`, SQ[0] + SQ[2] / 2, SQ[1] + SQ[3] - 0.25 - (shown.length + 2.6) * dy);
      const W = [1, 2, 3, 4].map((w) => missed(R.code, g, w).frac), B = Array.from({ length: Math.min(12, N) }, (_, i) => missedBursts(R.code, g, i + 1).frac);
      tr.range([0.5, 4.5], [0, Math.max(0.05, ...W) * 1.3]); tr.titles('flipped bits', 'share of error patterns missed (exhaustive)'); W.forEach((v, i) => rect(tr, `w${i}`, i + 0.7, i + 1.3, 0, v, '--c-I'));
      br.range([0.5, B.length + 0.5], [0, Math.max(0.05, ...B) * 1.3]); br.titles('burst length', `bursts missed: none up to ${r}, 2^−${r - 1} at ${r + 1}, 2^−${r} beyond`); B.forEach((v, i) => rect(br, `b${i}`, i + 0.7, i + 1.3, 0, v, '--c-B'));
      plots.aux.draw({ xlim: [1, B.length], series: [{ x: B.map((_, i) => i + 1), y: B, color: '--c-B', label: 'share of bursts missed' }, { x: [1, B.length], y: [2 ** -r, 2 ** -r], color: '--ink-dim', label: `2^−${r}` }], xlabel: 'burst length' });
      hud.set('a', `${data} with generator ${g}: append ${r} zeros, divide, send the remainder ${R.rem} after the data`);
      hud.set('b', pos.length ? (bad ? `received remainder ${rem} ≠ 0: the receiver knows something is wrong` : `remainder 000…: the error pattern is a multiple of the generator, so it slips through`) : 'no errors: the codeword divides exactly, the remainder is zero', pos.length ? (bad ? 'good' : 'bad') : '');
      hud.set('c', `an r = ${r} bit CRC catches every single error, every burst up to ${r} bits, and all but 2^−${r} of the rest; it detects, it does not correct`);
    }

    function viterbiCase() {
      const c = encode(VMSG), L = c.length, flips = [state.v1, state.v2, state.v3].filter((v) => v > 0 && v <= 2 * L).map((v) => v - 1), rx = c.map((q) => [...q]);
      for (const f of flips) rx[Math.floor(f / 2)][f % 2] ^= 1;
      const V = viterbi(rx), k = Math.min(L, Math.floor(time.t / VS)), done = k >= L;
      ctx.setDuration(L * VS + 0.8);
      bare.range([-0.6, L + 0.6], [-1.6, 4.6]); bare.titles('', ': the trellis: states (rows) through time; thin = every branch, blue = survivors, green = the decoded path');
      const Y = (s) => 3 - s;
      for (let j = 0; j < Math.min(k, L); j++) for (let s = 0; s < 4; s++) { const p = V.prev[j]; for (const u of [0, 1]) { const ns = ((u << 1) | (s >> 1)); if (V.M[j][s] < 1e9) bare.line(`e${j}${s}${u}`, [j, j + 1], [Y(s), Y(ns)], { color: '--line', width: 1 }); }
        for (let t = 0; t < 4; t++) if (p[t][0] >= 0) bare.line(`s${j}${t}`, [j, j + 1], [Y(p[t][0]), Y(t)], { color: '--c-B', width: 1.6 }); }
      if (done) bare.line('best', V.states.map((_, i) => i), V.states.map(Y), { color: '--c-v', width: 3.2 });
      for (let j = 0; j <= Math.min(k, L); j++) for (let s = 0; s < 4; s++) if (V.M[j][s] < 1e9) put(String(V.M[j][s]), bare.mx(j) - 0.12, bare.my(Y(s)) + 0.12);
      ['00', '10', '01', '11'].forEach((st, s) => put(`state ${st}`, bare.mx(-0.6) - 0.35, bare.my(Y(s))));
      rx.forEach((q, j) => { const f = flips.filter((v) => Math.floor(v / 2) === j); put(q.join('') + (f.length ? '✗' : ''), bare.mx(j + 0.5), bare.my(3.75)); });
      VMSG.forEach((b, j) => put(String(b), bare.mx(j + 0.5), bare.my(-0.6))); if (done) V.bits.forEach((b, j) => put(String(b) + (b !== VMSG[j] ? '✗' : ''), bare.mx(j + 0.5), bare.my(-1.15)));
      put('sent', bare.mx(-0.6) - 0.3, bare.my(-0.6)); if (done) put('decoded', bare.mx(-0.6) - 0.35, bare.my(-1.15)); put('received', bare.mx(-0.6) - 0.35, bare.my(3.75));
      const st = V.M.map((_, i) => i); tr.range([0, L], [0, Math.max(4, ...V.M.flat().filter((v) => v < 1e9)) + 0.5]); tr.titles('stage', 'path metric of each state (Hamming distance so far)');
      ['--c-B', '--c-I', '--c-v', '--c-north'].forEach((col, s) => tr.line(`m${s}`, st.slice(0, k + 1), V.M.slice(0, k + 1).map((m) => (m[s] < 1e9 ? m[s] : NaN)), { color: col, width: 1.8 }));
      if (!BER) { const ps = lin(0.005, 0.15, 12), r = rng(5); BER = { ps, unc: ps, cod: ps.map((p) => { let e = 0, n = 0; for (let t = 0; t < 120; t++) { const m = Array.from({ length: 40 }, () => (r() < 0.5 ? 1 : 0)), x = encode(m).map((q) => q.map((b) => (r() < p ? b ^ 1 : b))), d = viterbi(x).bits; d.forEach((b, i) => { e += b !== m[i]; n++; }); } return Math.max(e / n, 1e-5); }) }; }
      br.range([0, 0.15], [-5, 0]); br.titles('channel flip probability', 'log₁₀ bit error rate: uncoded (grey), coded + Viterbi (green)');
      br.line('u', BER.ps, BER.unc.map(Math.log10), { color: '--ink-dim', width: 1.6 }); br.line('c', BER.ps, BER.cod.map(Math.log10), { color: '--c-v', width: 2 });
      plots.aux.draw({ xlim: [0, L], cursor: k, series: [{ x: st, y: V.M.map((m) => Math.min(...m)), color: '--c-v', label: 'best path metric so far (errors the decoder believes in)' }], xlabel: 'stage' });
      const wrong = V.bits.filter((b, i) => b !== VMSG[i]).length;
      hud.set('a', `${VMSG.length} message bits → ${2 * L} channel bits (rate ½, generators 7 and 5); ${flips.length} received bit(s) flipped`);
      hud.set('b', done ? (wrong ? `decoded with ${wrong} wrong bit(s): the errors were too close for this code` : `decoded perfectly: the best path explains the received bits with ${V.M[L][0]} flip(s)`) : `stage ${k} of ${L}: at each state keep only the cheaper of the two paths arriving there`, done ? (wrong ? 'bad' : 'good') : '');
      hud.set('c', 'Viterbi finds the most likely sent sequence with 4 survivors per stage instead of trying all 2^n messages: work grows linearly with the length');
    }

    return {
      changed() { all.forEach((k) => k.show(false)); const c = state.case; (c === 'typical' ? [sq, tr, br] : [bare, tr, br]).forEach((k) => k.show(true)); ctx.setClock(c === 'viterbi' ? encode(VMSG).length * VS + 0.8 : 0); },
      update() { all.forEach((k) => k.clear()); used = 0; pool.forEach((l) => { l.visible = false; }); ({ typical: typicalCase, mutual: mutualCase, crc: crcCase, viterbi: viterbiCase })[state.case](); },
      theme() { all.forEach((k) => k.theme()); },
    };
  },
};
