// Channel coding: a repetition code sending every bit n times through a noisy channel and voting, and the
// Hamming (7,4) code drawn as three overlapping parity circles that locate a flipped bit.
import { createChart } from '../../lib/viz/chart.js';
import { H2 } from '../entropy/model.js';
import { repBER, repSim, encode, decode, bits4, hamBlockErr, uncodedBlockErr } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-12 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9];
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1 || 1));
const K = 24, NAMES = ['p₁', 'p₂', 'd₁', 'p₄', 'd₂', 'd₃', 'd₄'];
// Venn layout: circle j (parity bit 2^j) and the region of each position 1…7
const VC = [[-0.55, 0.35], [0.55, 0.35], [0, -0.6]], VR = 1.05;
const REG = { 1: [-1.05, 0.75], 2: [1.05, 0.75], 4: [0, -1.25], 3: [0, 0.75], 5: [-0.6, -0.35], 6: [0.6, -0.35], 7: [0, 0.03] };

export default {
  id: 'coding', title: 'Error-correcting codes', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 10, loop: false,
  defaults: { n: 3, e: 0.1, msg: 11, f1: 0, f2: 0 },
  cases: [
    { id: 'repetition', label: 'Repetition code', set: {}, examples: [
      { id: 'none', label: 'n = 1: no code, every flip is an error', controls: ['n', 'e'], set: { n: 1 } },
      { id: 'seven', label: 'n = 7: rare errors, rate 1/7', controls: ['n', 'e'], set: { n: 7 } },
    ] },
    { id: 'hamming', label: 'Hamming (7,4)', set: {}, examples: [
      { id: 'one', label: 'Flip d₂: two circles complain, one does not', controls: ['msg', 'f1'], set: { f1: 5 } },
      { id: 'parity', label: 'Flip p₄: only its own circle complains', controls: ['msg', 'f1'], set: { f1: 4 } },
      { id: 'two', label: 'Two flips: the decoder is fooled', controls: ['f1', 'f2'], set: { f1: 3, f2: 6 } },
    ] },
  ],
  controls: [
    { title: 'Channel', show: (s) => s.case === 'repetition', items: [{ id: 'n', label: 'Copies per bit n', unit: '', min: 1, max: 9, step: 2 }, { id: 'e', label: 'Flip probability e', unit: '', min: 0.01, max: 0.45, step: 0.01 }] },
    { title: 'Message and noise', show: (s) => s.case === 'hamming', items: [
      { id: 'msg', label: 'Data d₁d₂d₃d₄ (0–15)', unit: '', min: 0, max: 15, step: 1 },
      { id: 'f1', label: 'Flip position (0 = none)', unit: '', min: 0, max: 7, step: 1 }, { id: 'f2', label: 'Second flip (0 = none)', unit: '', min: 0, max: 7, step: 1 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage, scene } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), charts = [sq, tr, br];
    const pool = Array.from({ length: 40 }, () => { const l = ctx.label('', 'tick'); scene.add(l); return l; }); let nl = 0;
    const text = (t, x, y) => { if (nl >= pool.length) return; const l = pool[nl++]; l.element.textContent = t; l.position.set(sq.mx(x), sq.my(y), 0.02); l.visible = true; };
    const circ = lin(0, 2 * Math.PI, 120);
    let R = null, rk = '';
    return {
      changed() { charts.forEach((k) => { k.show(false); k.show(true); }); sq.show(false); ctx.setClock(state.case === 'repetition' ? 10 : 0); },
      update() {
        nl = 0; pool.forEach((l) => { l.visible = false; });
        if (state.case === 'repetition') {
          const n = Math.round(state.n), e = state.e, key = `${n},${e}`; if (key !== rk) { rk = key; R = { show: repSim(K, n, e), long: repSim(3000, n, e, 11) }; }
          const S = R.show, k = Math.max(1, Math.ceil(Math.min(1, time.t / 9) * K)), rows = n + 2;
          sq.range([-5, K], [-0.8, rows]);
          // row layout, top to bottom: sent, n received copies, decoded
          const pts = { one: [[], []], zero: [[], []], flip: [[], []], bad: [[], []] }, put = (g, x, y) => { pts[g][0].push(x); pts[g][1].push(y); };
          for (let i = 0; i < k; i++) {
            put(S.msg[i] ? 'one' : 'zero', i, rows - 1);
            S.rx[i].forEach((b, j) => put(b !== S.msg[i] ? 'flip' : b ? 'one' : 'zero', i, rows - 2 - j));
            put(S.dec[i] !== S.msg[i] ? 'bad' : S.dec[i] ? 'one' : 'zero', i, 0);
          }
          sq.dots('one', ...pts.one, { color: '--c-B', size: 9 }); sq.dots('zero', ...pts.zero, { color: '--c-ref', size: 5 }); sq.dots('flip', ...pts.flip, { color: '--c-north', size: 9 }); sq.dots('bad', ...pts.bad, { color: '--c-north', size: 15 });
          text('sent', -3, rows - 1); for (let j = 0; j < n; j++) text(`copy ${j + 1}`, -3, rows - 2 - j); text('decoded', -3, 0);
          const nsx = [1, 3, 5, 7, 9, 11, 13, 15];
          tr.range([1, 15], [-8, 0]); tr.titles('copies n', 'log₁₀ bit error rate after the vote'); tr.line('b', nsx, nsx.map((m) => Math.log10(repBER(m, e) + 1e-12)), { color: '--c-I' }); tr.dots('q', [n], [Math.log10(repBER(n, e) + 1e-12)], { color: '--accent', size: 11 });
          // rate against error: repetition buys reliability by sending less information per use
          const C = 1 - H2(e); br.range([0, 1.05], [-8, 0]); br.titles('rate (information bits per channel use)', 'log₁₀ BER: Shannon allows any rate left of C (dashed)');
          br.line('r', nsx.map((m) => 1 / m), nsx.map((m) => Math.log10(repBER(m, e) + 1e-12)), { color: '--c-I' }); br.dots('r', nsx.map((m) => 1 / m), nsx.map((m) => Math.log10(repBER(m, e) + 1e-12)), { color: '--c-I', size: 7 }); br.line('C', [C, C], [-8, 0], { color: '--c-v', dashed: true, width: 1.4 }); br.dots('q', [1 / n], [Math.log10(repBER(n, e) + 1e-12)], { color: '--accent', size: 11 });
          const L = R.long, bad = S.dec.slice(0, k).filter((d, i) => d !== S.msg[i]).length;
          hud.set('a', `${k} bits sent ${n} times each: ${pts.flip[0].length} copies flipped, ${bad} decoded wrong (red)`, bad ? 'bad' : 'good');
          hud.set('b', `majority vote fails only if more than ${Math.floor(n / 2)} of ${n} copies flip: BER ${fmt(repBER(n, e), 3)} vs ${fmt(e, 3)} uncoded, at rate 1/${n}`);
          hud.set('c', `capacity C = ${fmt(C, 3)}: good codes keep a fixed rate below C and still drive errors to zero — repetition gives up rate instead`);
          let a = 0; const run = L.dec.map((d, i) => (a += d !== L.msg[i]) / (i + 1)), xs = lin(1, 3000, 3000);
          plots.aux.draw({ xlim: [1, 3000], series: [{ x: xs, y: run, color: '--c-I', label: 'measured BER vs bits sent' }, { x: [1, 3000], y: [repBER(n, e), repBER(n, e)], color: '--ink-dim', label: 'formula' }] });
        } else {
          const d = bits4(Math.round(state.msg)), c = encode(d), r = c.slice(), flips = [...new Set([state.f1, state.f2].map(Math.round).filter((f) => f > 0))];
          for (const f of flips) r[f - 1] ^= 1;
          const D = decode(r), ok = D.data.join('') === d.join(''), checks = [0, 1, 2].map((j) => (D.s >> j) & 1);
          sq.range([-2.2, 2.2], [-2.0, 2.2]);
          VC.forEach(([x, y], j) => { const bad = checks[j]; sq.line(`c${j}${bad ? 'b' : 'g'}`, circ.map((a) => x + VR * Math.cos(a)), circ.map((a) => y + VR * Math.sin(a)), { color: bad ? '--c-north' : '--c-v', width: 2.4 }); sq.hide(`c${j}${bad ? 'g' : 'b'}`); text(`check ${2 ** j}: ${bad ? 'odd ✗' : 'even ✓'}`, x + (j === 2 ? 0 : x > 0 ? 1.0 : -1.0), y + (j === 2 ? -1.3 : 1.25)); });
          for (let i = 1; i <= 7; i++) { const [x, y] = REG[i], fl = flips.includes(i); text(`${NAMES[i - 1]} = ${r[i - 1]}${fl ? ' ⚡' : ''}`, x, y); }
          const fx = flips.map((i) => REG[i][0]), fy = flips.map((i) => REG[i][1] - 0.2); sq.dots('f', fx, fy, { color: '--c-north', size: 9 });
          const P = lin(1, 7, 7);
          tr.range([0.5, 7.5], [-0.4, 1.4]); tr.titles('position 1 … 7', 'sent (top row) and received (bottom row): flips in red');
          tr.dots('s1', P.filter((_, i) => c[i]), P.filter((_, i) => c[i]).map(() => 1), { color: '--c-B', size: 11 }); tr.dots('s0', P.filter((_, i) => !c[i]), P.filter((_, i) => !c[i]).map(() => 1), { color: '--c-ref', size: 7 });
          tr.dots('r1', P.filter((_, i) => r[i] && r[i] === c[i]), P.filter((_, i) => r[i] && r[i] === c[i]).map(() => 0), { color: '--c-B', size: 11 }); tr.dots('r0', P.filter((_, i) => !r[i] && r[i] === c[i]), P.filter((_, i) => !r[i] && r[i] === c[i]).map(() => 0), { color: '--c-ref', size: 7 });
          tr.dots('rx', P.filter((_, i) => r[i] !== c[i]), P.filter((_, i) => r[i] !== c[i]).map(() => 0), { color: '--c-north', size: 13 });
          // nearest-codeword view: distance from the received word to all 16 codewords
          const M = lin(0, 15, 16), dist = M.map((m) => encode(bits4(m)).reduce((s, b, i) => s + (b !== r[i]), 0));
          br.range([-0.5, 15.5], [0, 7.5]); br.titles('codeword 0 … 15', 'Hamming distance to the received word'); br.stems('d', M, dist, { color: '--c-B', width: 6 }); br.dots('s', [Math.round(state.msg)], [dist[Math.round(state.msg)]], { color: '--c-v', size: 12 });
          const dec = parseInt(D.data.join(''), 2); br.dots('dec', [dec], [dist[dec] + 0.4], { color: ok ? '--c-v' : '--c-north', size: 9 });
          hud.set('a', `sent ${c.join('')} · received ${r.join('')} · syndrome ${checks.slice().reverse().join('')} = ${D.s}${D.s ? ` → flip position ${D.s} (${NAMES[D.s - 1]})` : ' → no error seen'}`);
          hud.set('b', ok ? `decoded data ${D.data.join('')}: correct${flips.length ? ' — the failing circles point at exactly one region' : ''}` : `decoded data ${D.data.join('')} ≠ ${d.join('')}: two flips look like one flip elsewhere`, ok ? 'good' : 'bad');
          hud.set('c', 'each parity bit makes its circle even; the set of odd circles, read in binary, is the position of the flipped bit');
          const es = lin(-4, -0.5, 80);
          plots.aux.draw({ xlim: [-4, -0.5], series: [{ x: es, y: es.map((l) => Math.log10(uncodedBlockErr(10 ** l))), color: '--c-ref', label: 'log₁₀ block error: 4 raw bits vs log₁₀ e' }, { x: es, y: es.map((l) => Math.log10(hamBlockErr(10 ** l))), color: '--c-v', label: 'Hamming (7,4)' }] });
        }
      },
      theme() { charts.forEach((k) => k.theme()); },
    };
  },
};
