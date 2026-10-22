// Airborne radar: an engagement seen from above (own ship, sweeping beam, three targets), the range–Doppler
// history it builds, and the radar-warning receiver on one target; then the ground clutter under the beam.
import { createChart } from '../../lib/viz/chart.js';
import { createCurve } from '../../lib/viz/curve.js';
import { createAircraft } from '../../lib/viz/glyphs.js';
import { radialVelocity, bearing, clutterDoppler, footprint } from './model.js';

const km = 1e3, deg = Math.PI / 180, LAM = 0.03, fmt = (v, d = 3) => (Number.isFinite(v) ? String(Number(v.toPrecision(d))) : '∞');
const TARGETS = [{ x: -20e3, y: 60e3, vx: 0, vy: -280 }, { x: 25e3, y: 45e3, vx: -250, vy: 0 }, { x: 5e3, y: 80e3, vx: 50, vy: 200 }];

export default {
  id: 'airborne', title: 'Airborne radar', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 0,
  defaults: { vown: 250, scan: 60, sector: 60, bwA: 4, h: 8, vg: 200, dep: 20, az: 35, bwC: 6 },
  cases: [
    { id: 'engage', label: 'Engagement', set: {}, examples: [
      { id: 'still', label: 'Own ship hovering', controls: ['vown'], set: { vown: 0 } },
      { id: 'fast', label: 'Fast scan: more hits, shorter', controls: ['scan'], set: { scan: 150 } },
      { id: 'narrow', label: 'Narrow beam: short RWR blips', controls: ['bwA'], set: { bwA: 1.5 } },
    ] },
    { id: 'clutter', label: 'Ground clutter', set: {}, examples: [
      { id: 'steep', label: 'Looking down steeply: a small patch', controls: ['dep'], set: { dep: 60 } },
      { id: 'shallow', label: 'Near the horizon: a huge footprint', controls: ['dep'], set: { dep: 8 } },
      { id: 'side', label: 'Looking sideways: clutter near zero', controls: ['az'], set: { az: 80 } },
    ] },
  ],
  controls: [
    { title: 'Engagement', show: (s) => s.case === 'engage', items: [
      { id: 'vown', label: 'Own speed (north)', unit: 'm/s', min: 0, max: 400, step: 5 },
      { id: 'scan', label: 'Scan rate', unit: '°/s', min: 20, max: 200, step: 5 },
      { id: 'sector', label: 'Scan sector ±', unit: '°', min: 20, max: 80, step: 1 },
      { id: 'bwA', label: 'Beam width', unit: '°', min: 1, max: 10, step: 0.1 },
    ] },
    { title: 'Flight', show: (s) => s.case === 'clutter', items: [
      { id: 'h', label: 'Altitude', unit: 'km', min: 1, max: 15, step: 0.1 },
      { id: 'vg', label: 'Speed', unit: 'm/s', min: 50, max: 400, step: 5 },
      { id: 'dep', label: 'Depression angle', unit: '°', min: 3, max: 80, step: 0.5 },
      { id: 'az', label: 'Look azimuth', unit: '°', min: -90, max: 90, step: 1 },
      { id: 'bwC', label: 'Beam width', unit: '°', min: 1, max: 10, step: 0.1 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const plan = createChart(ctx, { box: [-4.3, -2.4, 4.6, 4.8], x: [-50, 50], y: [-10, 90], xTitle: 'east (km)', yTitle: 'north (km)' });
    const rd = createChart(ctx, { box: [0.95, 0.6, 3.5, 1.8], x: [0, 110], y: [-700, 700], xTitle: 'range (km)', yTitle: 'closing speed (m/s)' }), rwr = createChart(ctx, { box: [0.95, -2.35, 3.5, 1.8], y: [0, 1.1], xTitle: 'time (s)', yTitle: 'RWR on target 1' });
    const ground = createChart(ctx, { box: [-4.3, -2.4, 4.8, 4.8], x: [-5, 60], y: [-32, 32], xTitle: 'along track (km)', yTitle: 'across (km)' });
    const spec = createChart(ctx, { box: [1.1, 0.6, 3.4, 1.8], xTitle: 'clutter Doppler (kHz)', yTitle: 'clutter spectrum' }), fp = createChart(ctx, { box: [1.1, -2.35, 3.4, 1.8], x: [3, 80], xTitle: 'depression angle (°)', yTitle: 'footprint length (km)' });
    const own = createAircraft(stage, '--c-v'), tg = TARGETS.map((_, i) => createAircraft(stage, ['--c-I', '--c-E', '--c-F'][i])), beam = createCurve(stage, { max: 4, width: 2, color: '--c-v' });
    const iso = createCurve(stage, { max: 6000, width: 1, color: '--ink-dim' }), foot = createCurve(stage, { max: 200, width: 2.4, color: '--c-v' });
    let hist = [], rwrHist = [], last = 0;

    return {
      changed() {
        const e = state.case === 'engage';
        for (const k of [plan, rd, rwr]) k.show(e); for (const k of [ground, spec, fp]) k.show(!e);
        own.object.visible = beam.object.visible = e; tg.forEach((g) => { g.object.visible = e; }); iso.object.visible = foot.object.visible = !e;
        hist = []; rwrHist = []; last = time.t;
      },
      update() {
        const t = time.t;
        if (state.case === 'engage') {
          const tt = t - last, o = { x: 0, y: state.vown * tt, vx: 0, vy: state.vown }, sw = state.sector, ph = (state.scan * tt) % (4 * sw), az = (ph < 2 * sw ? -sw + ph : 3 * sw - ph) * deg;
          own.set(plan.mx(o.x / km), plan.my(o.y / km), Math.PI / 2, 0.22);
          beam.segments([plan.mx(o.x / km), plan.my(o.y / km), 0.01, plan.mx((o.x + 100e3 * Math.sin(az)) / km), plan.my((o.y + 100e3 * Math.cos(az)) / km), 0.01]);
          TARGETS.forEach((p0, i) => {
            const p = { ...p0, x: p0.x + p0.vx * tt, y: p0.y + p0.vy * tt }, b = bearing(o, p), off = Math.abs(((b - az + Math.PI) % (2 * Math.PI)) - Math.PI) / deg;
            tg[i].set(plan.mx(p.x / km), plan.my(p.y / km), Math.atan2(p.vy, p.vx), 0.2);
            const R = Math.hypot(p.x - o.x, p.y - o.y), lit = off < state.bwA / 2;
            if (lit) hist.push({ t, R: R / km, v: radialVelocity(o, p), i });
            if (i === 0) rwrHist.push({ t, a: Math.exp(-2.773 * (off / state.bwA) ** 2) });
          });
          hist = hist.filter((h) => h.t > t - 8); rwrHist = rwrHist.filter((h) => h.t > t - 20);
          [0, 1, 2].forEach((i) => { const hs = hist.filter((h) => h.i === i); rd.dots(`t${i}`, hs.map((h) => h.R), hs.map((h) => h.v), { color: ['--c-I', '--c-E', '--c-F'][i], size: 6 }); });
          rwr.range([Math.max(0, t - 20), Math.max(20, t)], [0, 1.1]); rwr.line('r', rwrHist.map((h) => h.t), rwrHist.map((h) => h.a), { color: '--c-I' });
          const vr = TARGETS.map((p0) => radialVelocity(o, { ...p0, x: p0.x + p0.vx * tt, y: p0.y + p0.vy * tt }));
          hud.set('a', `beam at ${fmt(az / deg)}°; closing speeds: ${vr.map((v) => fmt(v)).join(', ')} m/s`);
          hud.set('b', `target 2 (yellow) crosses: its Doppler is set by geometry, not by its 250 m/s`); hud.set('c', `RWR: a hit every ${fmt(4 * sw / state.scan)} s — the scan period gives the radar away`);
          plots.aux.draw({ xlim: [0, 180], series: [{ x: Array.from({ length: 181 }, (_, i) => i), y: Array.from({ length: 181 }, (_, i) => 300 * Math.cos(i * deg)), color: '--c-B', label: 'radial part of 300 m/s vs aspect angle (°)' }] });
        } else {
          const h = state.h * km, v = state.vg, dep = state.dep * deg, bw = state.bwC * deg, fmax = 2 * v / LAM, nx = 160, ny = 120, img = new Float32Array(nx * ny);
          for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const x = (-5 + 65 * (i + 0.5) / nx) * km, y = (-32 + 64 * (j + 0.5) / ny) * km; img[j * nx + i] = clutterDoppler(x, y, h, v, LAM) / fmax; }
          ground.image('d', img, nx, ny, { map: 'field', norm: (u) => 0.5 + 0.5 * u });
          // iso-range circles (slant range) and iso-Doppler hyperbolas on the ground
          const seg = [];
          for (let k = 1; k <= 6; k++) { const Rs = 10 * k * km; if (Rs <= h) continue; const rg = Math.sqrt(Rs * Rs - h * h) / km; for (let a = 0; a < 72; a++) { const a0 = 2 * Math.PI * a / 72, a1 = 2 * Math.PI * (a + 1) / 72; seg.push(ground.mx(rg * Math.cos(a0)), ground.my(rg * Math.sin(a0)), 0.002, ground.mx(rg * Math.cos(a1)), ground.my(rg * Math.sin(a1)), 0.002); } }
          for (const cc of [0.2, 0.4, 0.6, 0.8, 0.95]) for (const sgn of [-1, 1]) { let prev = null; for (let y = -32; y <= 32; y += 0.5) { const x = sgn * Math.sqrt(cc * cc * ((y * km) ** 2 + h * h) / (1 - cc * cc)) / km, inside = x > -5 && x < 60, p = [ground.mx(x), ground.my(y)]; if (prev && inside) seg.push(prev[0], prev[1], 0.002, p[0], p[1], 0.002); prev = inside ? p : null; } } // iso-Doppler: x² (1 − c²) = c² (y² + h²)
          const inG = (px, py) => px >= ground.mx(-5) - 1e-6 && px <= ground.mx(60) + 1e-6 && py >= ground.my(-32) - 1e-6 && py <= ground.my(32) + 1e-6, clip = [];
          for (let k = 0; k < seg.length; k += 6) if (inG(seg[k], seg[k + 1]) && inG(seg[k + 3], seg[k + 4])) clip.push(...seg.slice(k, k + 6));
          iso.segments(clip);
          // footprint outline at azimuth az
          const F = footprint(h, dep, bw), far = Math.min(F.far, 70 * km), az = state.az * deg, o = [];
          for (let k = 0; k <= 40; k++) { const r = (F.near + (far - F.near) * k / 40) / km, a = az + bw / 2; o.push(ground.mx(r * Math.cos(a)), ground.my(r * Math.sin(a)), 0.004); }
          for (let k = 40; k >= 0; k--) { const r = (F.near + (far - F.near) * k / 40) / km, a = az - bw / 2; o.push(ground.mx(r * Math.cos(a)), ground.my(r * Math.sin(a)), 0.004); }
          foot.set(o, true);
          // clutter spectrum: the footprint sliced by iso-Doppler lines
          const bins = new Float64Array(100); for (let k = 0; k < 4000; k++) { const r = F.near + (far - F.near) * ((k % 63) + 0.5) / 63, a = az + bw * ((Math.floor(k / 63) % 63) / 62 - 0.5), f = clutterDoppler(r * Math.cos(a), r * Math.sin(a), h, v, LAM); bins[Math.min(99, Math.max(0, Math.floor((f / fmax + 1) * 50)))] += 1 / r; }
          const mb = Math.max(...bins), fk = Array.from({ length: 100 }, (_, i) => ((i + 0.5) / 50 - 1) * fmax / 1e3);
          spec.range([-fmax / 1e3, fmax / 1e3], [0, 1.1]); spec.stems('s', fk, Array.from(bins, (b) => b / mb), { color: '--c-E', width: 2 }); spec.stems('alt', [0], [1.05], { color: '--c-north', width: 1.4 });
          const ds = Array.from({ length: 78 }, (_, i) => 3 + i);
          fp.range([3, 80], [0, Math.min(60, footprint(h, 5 * deg, bw).length / km)]); fp.line('l', ds, ds.map((d) => Math.min(60, footprint(h, d * deg, bw).length / km)), { color: '--c-v' }); fp.dots('now', [state.dep], [Math.min(60, F.length / km)], { color: '--accent', size: 10 });
          hud.set('a', `altitude ${state.h} km, ${v} m/s: ground Doppler spans ±2v/λ = ±${fmt(fmax / 1e3)} kHz`);
          hud.set('b', `footprint ${fmt(F.near / km)}–${F.far === Infinity ? '∞' : fmt(F.far / km)} km: ${F.far === Infinity ? 'reaches the horizon' : `${fmt(F.length / km)} km of ground`} in one beam`);
          hud.set('c', 'red line: the altitude return straight below, at zero Doppler');
          plots.aux.draw({ xlim: [-90, 90], cursor: state.az, series: [{ x: Array.from({ length: 181 }, (_, i) => i - 90), y: Array.from({ length: 181 }, (_, i) => fmax * Math.cos((i - 90) * deg) * Math.cos(dep) / 1e3), color: '--c-E', label: 'clutter Doppler at the beam centre (kHz) vs look azimuth (°)' }] });
        }
      },
      theme() { for (const k of [plan, rd, rwr, ground, spec, fp]) k.theme(); own.theme(); tg.forEach((g) => g.theme()); for (const k of [beam, iso, foot]) k.theme(); },
    };
  },
};
