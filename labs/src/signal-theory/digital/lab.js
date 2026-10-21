// Digital communications: BPSK bit by bit (NRZ, carrier, correlator, decisions), QPSK as two BPSK streams,
// M-QAM constellations with Gray labels and their noisy clouds, BER curves with Monte Carlo points, eye
// diagrams with raised-cosine pulses, and the Shannon limit.
import { createChart } from '../../lib/viz/chart.js';
import { createCurve } from '../../lib/viz/curve.js';
import { rng } from '../../maths/probability/model.js';
import { scheme, berTheory, simulate, rcos, shaped, shannonEbN0 } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? String(Number(v.toPrecision(d))) : '∞');
const ROW = (k, n) => [-4.3, 2.55 - (k + 1) * (4.9 / n) + 0.25, 5.1, 4.9 / n - 0.55], CON = [1.55, -1.7, 3.0, 3.6];
const TL = [-4.3, 0.55, 4.0, 2.0], TR = [0.55, 0.55, 4.0, 2.0], BL = [-4.3, -2.35, 4.0, 2.0], BR = [0.55, -2.35, 4.0, 2.0];
const SQL = [-4.3, -2.35, 4.1, 4.9], SQR = [0.45, -2.35, 4.1, 4.9], BIG = [-4.3, -2.35, 8.85, 4.9];
const SCHEMES = [['bpsk', 'BPSK', '--c-B'], ['qpsk', 'QPSK', '--c-v'], ['8psk', '8-PSK', '--c-F'], ['16qam', '16-QAM', '--c-I'], ['64qam', '64-QAM', '--c-E'], ['256qam', '256-QAM', '--c-north']];
const MC = {}; // Monte Carlo BER per scheme, computed once
const mc = (k) => (MC[k] ??= Array.from({ length: 11 }, (_, i) => { const db = 2 * i, e = 10 ** (db / 10), t = berTheory(k, e), n = Math.min(60000, Math.max(3000, Math.round(60 / Math.max(t, 1e-9)))); return [db, t > 2e-6 ? simulate(k, e, n, 11 + i).ber : NaN]; }));
const need = (k, target) => { let lo = -2, hi = 40; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (berTheory(k, 10 ** (m / 10)) > target) lo = m; else hi = m; } return hi; };

export default {
  id: 'digital', title: 'Digital communications', size: 4.4, ortho: true, plain: true, cam: 'top', timeless: true,
  defaults: { ebn0: 10, nb: 20, cps: 4, M: '16qam', ns: 400, sch: 'qpsk', alpha: 0.35, pam: 2, target: 1e-5 },
  cases: [
    { id: 'bpsk', label: 'BPSK', set: {}, examples: [
      { id: 'clean', label: 'Eb/N0 = 15 dB: clean', controls: ['ebn0'], set: { ebn0: 15 } },
      { id: 'noisy', label: 'Eb/N0 = 0 dB: errors appear', controls: ['ebn0'], set: { ebn0: 0 } },
    ] },
    { id: 'qpsk', label: 'QPSK', set: {}, examples: [
      { id: 'noisy', label: 'Eb/N0 = 3 dB', controls: ['ebn0'], set: { ebn0: 3 } },
    ] },
    { id: 'qam', label: 'M-QAM', set: { ebn0: 14 }, examples: [
      { id: 'q16', label: '16-QAM at 10 dB', controls: ['M', 'ebn0'], set: { M: '16qam', ebn0: 10 } },
      { id: 'q64', label: '64-QAM at 14 dB: crowded', controls: ['M', 'ebn0'], set: { M: '64qam', ebn0: 14 } },
      { id: 'q256', label: '256-QAM needs 20+ dB', controls: ['M', 'ebn0'], set: { M: '256qam', ebn0: 20 } },
    ] },
    { id: 'ber', label: 'BER curves', set: {}, examples: [
      { id: 'cost', label: '6× the bits: +8 dB', controls: ['ebn0'], set: { ebn0: 10 } },
    ] },
    { id: 'eye', label: 'Eye diagram', set: {}, examples: [
      { id: 'sinc', label: 'α = 0: narrow eye, minimal band', controls: ['alpha'], set: { alpha: 0 } },
      { id: 'wide', label: 'α = 1: wide-open eye', controls: ['alpha'], set: { alpha: 1 } },
      { id: 'pam', label: '4-PAM: three stacked eyes', controls: ['pam'], set: { pam: 4 } },
      { id: 'noisy', label: 'Low SNR: the eye closes', controls: ['ebn0'], set: { ebn0: 4 } },
    ] },
    { id: 'shannon', label: 'Shannon limit', set: {}, examples: [
      { id: 'strict', label: 'BER 10⁻⁹: everything moves right', controls: ['target'], set: { target: 1e-9 } },
    ] },
  ],
  controls: [
    { title: 'Channel', show: (s) => s.case !== 'shannon', items: [{ id: 'ebn0', label: 'Eb/N0', unit: 'dB', min: -2, max: 25, step: 0.5 }] },
    { title: 'Stream', show: (s) => s.case === 'bpsk' || s.case === 'qpsk', items: [
      { id: 'nb', label: 'Symbols shown', unit: '', min: 8, max: 40, step: 2 },
      { id: 'cps', label: 'Carrier cycles per symbol', unit: '', min: 1, max: 10, step: 1, show: (s) => s.case === 'bpsk' },
    ] },
    { title: 'Constellation', show: (s) => s.case === 'qam', items: [
      { id: 'M', label: 'Order', type: 'segmented', options: [['qpsk', '4'], ['16qam', '16'], ['64qam', '64'], ['256qam', '256']] },
      { id: 'ns', label: 'Symbols sent', unit: '', min: 100, max: 3000, step: 100 },
    ] },
    { title: 'Curves', show: (s) => s.case === 'ber', items: [{ id: 'sch', label: 'Highlight', type: 'select', options: SCHEMES.map(([k, l]) => [k, l]) }] },
    { title: 'Pulse', show: (s) => s.case === 'eye', items: [
      { id: 'alpha', label: 'Roll-off α', unit: '', min: 0, max: 1, step: 0.05 },
      { id: 'pam', label: 'Levels', type: 'segmented', options: [[2, '2 (BPSK)'], [4, '4 (4-PAM)']] },
    ] },
    { title: 'Target', show: (s) => s.case === 'shannon', items: [{ id: 'target', label: 'Target BER', unit: '', min: 1e-9, max: 1e-2, log: true }] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, hud, plots, stage, scene } = ctx;
    stage.controls.enableRotate = false;
    const rows = [0, 1, 2].map((k) => createChart(ctx, { box: ROW(k, 3) })), con = createChart(ctx, { box: CON, yTicks: false });
    const tl = createChart(ctx, { box: TL }), tr = createChart(ctx, { box: TR }), bl = createChart(ctx, { box: BL }), br = createChart(ctx, { box: BR });
    const sql = createChart(ctx, { box: SQL, grid: false }), sqr = createChart(ctx, { box: SQR, grid: false }), big = createChart(ctx, { box: BIG });
    const all = [...rows, con, tl, tr, bl, br, sql, sqr, big], labels = [], eyes = [createCurve(stage, { max: 12000, width: 1, color: '--c-v' }), createCurve(stage, { max: 12000, width: 1, color: '--c-v' })];
    for (let i = 0; i < 64; i++) { const l = ctx.label('', 'tick'); scene.add(l); labels.push(l); }
    const square = (ch, box, L) => { const a = box[3] / box[2]; ch.range([-L, L], [-L * a, L * a]); };
    const putLabels = (ch, pts, bits, on) => labels.forEach((l, i) => { l.visible = on && i < pts.length; if (l.visible) { l.element.textContent = pts[i].bits.toString(2).padStart(bits, '0'); l.position.set(ch.mx(pts[i].x), ch.my(pts[i].y) + 0.17, 0); } });
    return {
      changed() { const c = state.case; for (const k of all) k.show(false); for (const q of eyes) q.object.visible = c === 'eye'; labels.forEach((l) => { l.visible = false; }); ({ bpsk: [...rows, con], qpsk: [...rows, con], qam: [sql, sqr], ber: [big], eye: [tl, tr, bl, br], shannon: [big] })[c].forEach((k) => k.show(true)); },
      update() {
        const c = state.case, e = 10 ** (state.ebn0 / 10);
        if (c === 'bpsk' || c === 'qpsk') {
          const K = state.nb, r = rng(5), bits = c === 'bpsk' ? 1 : 2, sps = 64, sig = Math.sqrt(1 / (2 * bits * e)), g = () => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r()), { pts } = scheme(c);
          const sym = Array.from({ length: K }, () => Math.floor(r() * pts.length)), tt = [], I = [], Q = [], s = [], rx = [];
          for (let k = 0; k < K; k++) { let ai = 0, aq = 0; for (let j = 0; j < sps; j++) { const t = k + j / sps, w = 2 * Math.PI * state.cps * t, n = sig * g() * Math.sqrt(sps / 2); const v = pts[sym[k]].x * Math.cos(w) - pts[sym[k]].y * Math.sin(w) + n; tt.push(t); I.push(pts[sym[k]].x); Q.push(pts[sym[k]].y); s.push(v); ai += 2 * v * Math.cos(w) / sps; aq -= 2 * v * Math.sin(w) / sps; } rx.push([ai, aq]); }
          const dec = rx.map(([x, y]) => { let b = 0, d = Infinity; pts.forEach((p, j) => { const q = (p.x - x) ** 2 + (p.y - y) ** 2; if (q < d) { d = q; b = j; } }); return b; }), errs = dec.reduce((a, d, k) => { let x = pts[d].bits ^ pts[sym[k]].bits, n = 0; while (x) { n += x & 1; x >>= 1; } return a + n; }, 0);
          if (c === 'bpsk') {
            rows[0].range([0, K], [-1.5, 1.5]); rows[0].titles('', `bits: ${sym.map((v) => pts[v].bits).join('')} → NRZ ±1`); rows[0].line('I', tt, I, { color: '--c-B' }); rows[0].hide('Q');
            rows[1].range([0, K], [-3, 3]); rows[1].titles('', 'BPSK on the carrier, plus noise'); rows[1].line('s', tt, s, { color: '--c-v', width: 1 });
            rows[2].range([0, K], [-2, 2]); rows[2].titles('symbol', 'correlator output per bit: its sign decides'); rows[2].stems('c', rx.map((_, k) => k + 0.5), rx.map((p) => p[0]), { color: '--c-E', width: 4 }); rows[2].dots('bad', rx.map((_, k) => k + 0.5).filter((_, k) => dec[k] !== sym[k]), rx.filter((_, k) => dec[k] !== sym[k]).map((p) => p[0]), { color: '--c-north', size: 12 });
          } else {
            rows[0].range([0, K], [-1.2, 1.2]); rows[0].titles('', 'I(t): even bits'); rows[0].line('I', tt, I, { color: '--c-B' });
            rows[1].range([0, K], [-1.2, 1.2]); rows[1].titles('', 'Q(t): odd bits'); rows[1].line('s', tt, Q, { color: '--c-I' });
            rows[2].range([0, K], [0, 360]); rows[2].titles('symbol', 'transmitted phase per symbol (°): 45, 135, 225, 315'); rows[2].stems('c', sym.map((_, k) => k + 0.5), sym.map((v) => ((Math.atan2(pts[v].y, pts[v].x) * 180 / Math.PI) + 360) % 360), { color: '--c-v', width: 4 }); rows[2].hide('bad');
          }
          square(con, CON, 1.9); con.titles('I', 'Q'); con.dots('rx', rx.map((p) => p[0]), rx.map((p) => p[1]), { color: '--c-B', size: 6 }); con.dots('ideal', pts.map((p) => p.x), pts.map((p) => p.y), { color: '--accent', size: 11 }); putLabels(con, pts, bits, true);
          hud.set('a', `${c.toUpperCase()}: ${bits} bit${bits > 1 ? 's' : ''} per symbol, Eb/N0 = ${state.ebn0} dB`); hud.set('b', `${errs} bit error${errs === 1 ? '' : 's'} in ${K * bits} bits shown`, errs ? 'bad' : 'good');
          hud.set('c', `theory: BER = ½ erfc(√(Eb/N0)) = ${berTheory(c, e).toExponential(1)}${c === 'qpsk' ? ' — the same as BPSK' : ''}`);
          plots.aux.draw({ xlim: [-2, 20], cursor: state.ebn0, series: [{ x: Array.from({ length: 89 }, (_, i) => -2 + i / 4), y: Array.from({ length: 89 }, (_, i) => Math.max(-9, Math.log10(berTheory(c, 10 ** ((-2 + i / 4) / 10))))), color: '--c-B', label: 'log₁₀ BER vs Eb/N0 (dB)' }] });
        } else if (c === 'qam') {
          const S = simulate(state.M, e, state.ns), { pts, bits } = S, L = Math.max(...pts.map((p) => Math.abs(p.x))) * 1.35, small = pts.length <= 16;
          square(sql, SQL, L); sql.titles('I', `ideal ${pts.length}-point constellation, Gray coded (${bits} bits each)`); sql.dots('p', pts.map((p) => p.x), pts.map((p) => p.y), { color: '--accent', size: small ? 12 : 7 });
          const lines = (ch) => { const lv = [...new Set(pts.map((p) => p.x))].sort((a, b) => a - b); lv.slice(1).forEach((v, i) => { const m = (v + lv[i]) / 2; ch.line(`v${i}`, [m, m], [-L * 2, L * 2], { color: '--line', width: 1 }); ch.line(`h${i}`, [-L * 2, L * 2], [m, m], { color: '--line', width: 1 }); }); for (let i = lv.length - 1; i < 16; i++) { ch.hide(`v${i}`); ch.hide(`h${i}`); } };
          lines(sql); putLabels(sql, pts, bits, pts.length <= 16);
          square(sqr, SQR, L); sqr.titles('I', `received: ${state.ns} symbols at Eb/N0 = ${state.ebn0} dB`); lines(sqr);
          sqr.dots('ok', S.rx.filter((p) => p[2]).map((p) => p[0]), S.rx.filter((p) => p[2]).map((p) => p[1]), { color: '--c-B', size: 4 }); sqr.dots('bad', S.rx.filter((p) => !p[2]).map((p) => p[0]), S.rx.filter((p) => !p[2]).map((p) => p[1]), { color: '--c-north', size: 6 });
          const d = 2 / Math.sqrt((2 / 3) * (pts.length - 1));
          hud.set('a', `${pts.length}-QAM: ${bits} bits/symbol, neighbours ${fmt(d)} apart (unit power)`); hud.set('b', `measured BER ${S.ber.toExponential(1)} (theory ${berTheory(state.M, e).toExponential(1)}), symbol errors red`, S.ber < 1e-3 ? 'good' : 'bad');
          hud.set('c', 'Gray code: crossing one boundary flips only one bit');
          plots.aux.draw({ xlim: [0, 30], cursor: state.ebn0, series: SCHEMES.filter(([k]) => k.includes('qam') || k === 'qpsk').map(([k, l, col]) => ({ x: Array.from({ length: 121 }, (_, i) => i / 4), y: Array.from({ length: 121 }, (_, i) => Math.max(-9, Math.log10(berTheory(k, 10 ** (i / 40))))), color: col, label: l })) });
        } else if (c === 'ber') {
          big.range([-2, 24], [-7, 0]); big.titles('Eb/N0 (dB)', 'log₁₀ BER: theory (lines), Monte Carlo (dots)');
          const xs = Array.from({ length: 105 }, (_, i) => -2 + i / 4);
          for (const [k, , col] of SCHEMES) { big.line(k, xs, xs.map((x) => Math.max(-7.5, Math.log10(berTheory(k, 10 ** (x / 10))))), { color: col, width: k === state.sch ? 3.2 : 1.4 }); const m = mc(k).filter((p) => Number.isFinite(p[1]) && p[1] > 0); big.dots(`d${k}`, m.map((p) => p[0]), m.map((p) => Math.log10(p[1])), { color: col, size: k === state.sch ? 10 : 6 }); }
          big.line('cur', [state.ebn0, state.ebn0], [-7, 0], { color: '--accent', dashed: true, width: 1.2 }); big.line('t5', [-2, 24], [-5, -5], { color: '--ink-dim', dashed: true, width: 1 });
          const lab = SCHEMES.find((s) => s[0] === state.sch)[1];
          hud.set('a', `at ${state.ebn0} dB: ${SCHEMES.map(([k, l]) => `${l} ${berTheory(k, e).toExponential(0)}`).slice(0, 4).join(' · ')}`); hud.set('b', `${lab} needs ${fmt(need(state.sch, 1e-5))} dB for BER 10⁻⁵`);
          hud.set('c', `BPSK ${fmt(need('bpsk', 1e-5))} dB vs 64-QAM ${fmt(need('64qam', 1e-5))} dB: 6× the bits per symbol for ≈ 8 dB more`);
          plots.aux.draw({ xlim: [-2, 24], cursor: state.ebn0, series: [{ x: xs, y: xs.map((x) => Math.max(-9, Math.log10(berTheory(state.sch, 10 ** (x / 10))))), color: SCHEMES.find((s) => s[0] === state.sch)[2], label: `${lab}: log₁₀ BER` }] });
        } else if (c === 'eye') {
          const a = state.alpha, tp = Array.from({ length: 401 }, (_, i) => -5 + i / 40), sps = 32, lv = state.pam === 4 ? [-3, -1, 1, 3].map((v) => v / Math.sqrt(5)) : [-1, 1];
          tl.range([-5, 5], [-0.3, 1.1]); tl.titles('t / T', `raised-cosine pulse, α = ${a}: zero at every other symbol instant`); tl.line('p', tp, tp.map((t) => rcos(t, a)), { color: '--c-B' }); tl.dots('z', [-4, -3, -2, -1, 1, 2, 3, 4], [0, 0, 0, 0, 0, 0, 0, 0], { color: '--accent', size: 7 });
          const fs = Array.from({ length: 300 }, (_, i) => i / 200), H = fs.map((f) => (f <= (1 - a) / 2 ? 1 : f <= (1 + a) / 2 ? 0.5 * (1 + Math.cos(Math.PI / a * (f - (1 - a) / 2))) : 0));
          tr.range([0, 1.5], [0, 1.1]); tr.titles('f · T', `spectrum: band (1 + α)/2T = ${fmt((1 + a) / 2)}/T`); tr.line('H', fs, H, { color: '--c-I' });
          const eye = (ch, cv, sigma, title) => { const { y } = shaped(160, sps, a, lv, sigma); ch.range([0, 2], [-2, 2]); ch.titles('t / T (two symbols)', title); const seg = []; for (let k = 8; k < 150; k++) for (let i = 0; i < 2 * sps; i++) { const u = y[(k - 1) * sps + i + sps / 2], v = y[(k - 1) * sps + i + 1 + sps / 2]; seg.push(ch.mx(i / sps), ch.my(u), 0.002, ch.mx((i + 1) / sps), ch.my(v), 0.002); } cv.segments(seg); cv.object.visible = true; };
          eye(bl, eyes[0], 0, 'eye, no noise: the opening is the margin'); const sg = Math.sqrt(1 / (2 * Math.log2(state.pam) * e)); eye(br, eyes[1], sg, `eye at Eb/N0 = ${state.ebn0} dB`);
          hud.set('a', `α = ${a}: ${fmt(100 * a)} % excess bandwidth, tails decay ${a > 0.5 ? 'fast' : a > 0 ? 'moderately' : 'as 1/t — very slowly'}`); hud.set('b', 'sample in the middle of the eye: there, every pulse but one is zero (no ISI)');
          hud.set('c', state.pam === 4 ? '4 levels → 3 eyes, each a third as tall: 2 bits per symbol, less margin' : 'two levels: one eye');
          plots.aux.draw({ xlim: [-5, 5], series: [0, 0.35, 1].map((q, j) => ({ x: tp, y: tp.map((t) => rcos(t, q)), color: ['--c-north', '--c-B', '--c-v'][j], label: `α = ${q}` })) });
        } else {
          big.range([-2, 30], [0, 9]); big.titles('Eb/N0 (dB)', 'spectral efficiency η (bit/s/Hz): nothing reliable left of the red curve');
          const eta = Array.from({ length: 200 }, (_, i) => 0.01 + i * 0.05); big.line('sh', eta.map((h) => 10 * Math.log10(shannonEbN0(h))), eta, { color: '--c-north', width: 2.4 });
          const pts = SCHEMES.map(([k, l, col]) => [k, l, col, need(k, state.target), k === 'bpsk' ? 1 : scheme(k).bits]);
          pts.forEach(([k, , col, x, b]) => { big.dots(k, [x], [b], { color: col, size: 13 }); big.line(`g${k}`, [10 * Math.log10(shannonEbN0(b)), x], [b, b], { color: col, dashed: true, width: 1 }); });
          big.line('lim', [-1.59, -1.59], [0, 9], { color: '--c-north', dashed: true, width: 1 });
          hud.set('a', `minimum Eb/N0 = (2^η − 1)/η; as η → 0 it tends to ln 2 = −1.59 dB`); hud.set('b', `at BER ${state.target.toExponential(0)}: ${pts.slice(0, 4).map(([, l, , x]) => `${l} ${fmt(x)} dB`).join(' · ')}`);
          hud.set('c', `gap to Shannon (dashed): ${pts.map(([, l, , x, b]) => `${l} ${fmt(x - 10 * Math.log10(shannonEbN0(b)))}`).slice(0, 3).join(', ')} dB — coding closes it`);
          plots.aux.draw({ xlim: [0, 8], series: [{ x: eta, y: eta.map((h) => 10 * Math.log10(shannonEbN0(h))), color: '--c-north', label: 'Shannon minimum Eb/N0 (dB) vs η' }] });
        }
      },
      theme() { for (const k of all) k.theme(); for (const q of eyes) q.theme(); },
    };
  },
};
