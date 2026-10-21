// Earth orbits: elements, Kepler motion, a turning Earth, the ground track and J2 precession.
import * as THREE from 'three';
import { createCurve } from '../../lib/viz/curve.js';
import { createVector } from '../../lib/viz/vector.js';
import { si } from '../../lib/ui/format.js';
import { position, period, visViva, j2Rates, subPoint, RE, WE } from './model.js';

const deg = Math.PI / 180, km = 1e3;

export default {
  id: 'orbits', title: 'Orbits and ground tracks', size: 3,
  cameras: { front: { pos: [0, -9, 1.5] }, side: { pos: [9, 0, 1.5] }, top: { pos: [0, -0.01, 9.5] }, iso: { pos: [5.5, -6, 4] } },
  defaults: { alt: 420 * km, e: 0.0005, i: 51.6 * deg, raan: 30 * deg, argp: 0, j2: true, graticule: true, nodes: true },
  scenarios: [
    { id: 'circular', label: 'Circular orbit', hint: 'Equatorial, low.', controls: ['alt'], set: { alt: 420 * km, e: 0, i: 0, j2: false } },
    { id: 'iss', label: 'ISS', set: {} },
    { id: 'polar', label: 'Polar', set: { alt: 700 * km, i: 90 * deg } },
    { id: 'geo', label: 'Geostationary', set: { alt: 35786 * km, e: 0, i: 0 } },
    { id: 'molniya', label: 'Elliptical (Molniya)', cam: 'iso', set: { alt: 20230 * km, e: 0.74, i: 63.4 * deg, argp: 270 * deg } },
    { id: 'sso', label: 'Sun-synchronous', hint: 'J2 turns the plane.', set: { alt: 800 * km, i: 98.6 * deg, e: 0.001 } },
  ],
  controls: [
    { title: 'Shape', items: [
      { id: 'alt', label: 'Altitude', unit: 'km', k: 1e-3, min: 200 * km, max: 40000 * km, log: true },
      { id: 'e', label: 'Eccentricity', unit: '', min: 0, max: 0.8, step: 0.001 },
      { type: 'readout', label: 'Period', value: (s) => `${(period(RE + s.alt) / 60).toFixed(1)} min` },
    ] },
    { title: 'Orientation', items: [
      { id: 'i', label: 'Inclination', unit: '°', k: 1 / deg, min: 0, max: Math.PI, step: 0.1 * deg },
      { id: 'raan', label: 'Node Ω', unit: '°', k: 1 / deg, min: 0, max: 2 * Math.PI, step: deg },
      { id: 'argp', label: 'Perigee ω', unit: '°', k: 1 / deg, min: 0, max: 2 * Math.PI, step: deg },
    ] },
    { title: 'Perturbations', items: [{ id: 'j2', label: "Earth's bulge (J2)", type: 'check' }] },
  ],
  display: [{ title: 'Show', items: [
    { id: 'graticule', label: 'Graticule', type: 'check' },
    { id: 'nodes', label: 'Equator and nodes', type: 'check', color: '--c-ref' },
  ] }],
  plots: [{ id: 'track', title: 'Ground track', xLabel: 'longitude', xUnit: '°', yUnit: '' }, { id: 'alt', title: 'Altitude and speed', xLabel: 't', xUnit: 's', yUnit: 'm', y2Unit: 'm/s' }],
  hud: [{ id: 'T', label: 'period T' }, { id: 'h', label: 'altitude now' }, { id: 'v', label: 'speed now' }, { id: 'pa', label: 'perigee, apogee' }, 'sep', { id: 'shift', label: 'track shift per orbit' }, { id: 'j2', label: 'node drift Ω̇' }],

  setup(ctx) {
    const { scene, state, time, hud, plots, stage } = ctx;
    stage.grid.visible = false; stage.axes.visible = false;
    const earth = new THREE.Group(); scene.add(earth);
    const globeMat = new THREE.MeshStandardMaterial({ roughness: 0.85 });
    earth.add(new THREE.Mesh(new THREE.SphereGeometry(1, 64, 40), globeMat));
    const grat = createCurve(stage, { max: 4000, width: 1, color: '--line', parent: earth });
    const seg = [];
    for (let la = -60; la <= 60; la += 30) for (let k = 0; k < 72; k++) { const a = 2 * Math.PI * k / 72, b = 2 * Math.PI * (k + 1) / 72, c = Math.cos(la * deg) * 1.002, z = Math.sin(la * deg) * 1.002; seg.push(c * Math.cos(a), c * Math.sin(a), z, c * Math.cos(b), c * Math.sin(b), z); }
    for (let lo = 0; lo < 360; lo += 30) for (let k = 0; k < 36; k++) { const a = -Math.PI / 2 + Math.PI * k / 36, b = a + Math.PI / 36, l = lo * deg; seg.push(Math.cos(a) * Math.cos(l) * 1.002, Math.cos(a) * Math.sin(l) * 1.002, Math.sin(a) * 1.002, Math.cos(b) * Math.cos(l) * 1.002, Math.cos(b) * Math.sin(l) * 1.002, Math.sin(b) * 1.002); }
    grat.segments(seg);
    const meridian = createCurve(stage, { max: 40, width: 2.4, color: '--c-E', parent: earth }); // Greenwich
    const mpts = []; for (let k = 0; k <= 36; k++) { const a = -Math.PI / 2 + Math.PI * k / 36; mpts.push(Math.cos(a) * 1.004, 0, Math.sin(a) * 1.004); }
    meridian.set(mpts);
    const orbit = createCurve(stage, { max: 400, width: 2.4, color: '--c-B' });
    const eq = createCurve(stage, { max: 130, width: 1.2, color: '--c-ref', dashed: true }), nodes = createCurve(stage, { max: 1, width: 1.6, color: '--c-ref' });
    const satMat = new THREE.MeshStandardMaterial({ roughness: 0.3, emissive: 0x222222 });
    const sat = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), satMat); scene.add(sat);
    const vel = createVector(scene, '--c-v', 'v', { radius: 0.012 });
    const ax = createVector(scene, '--c-z', 'north', { radius: 0.012 }); ax.set([0, 0, 1], [0, 0, 1], 0.5);
    const asc = ctx.label('ascending node'); scene.add(asc);
    const els = () => ({ a: RE + state.alt, e: Math.min(state.e, 0.95 * (1 - RE * 1.02 / (RE + state.alt)) + 1e-9), i: state.i, raan: state.raan, argp: state.argp });
    let T = 1, track = null;

    function buildTrack() {
      const o = els(); T = period(o.a);
      time.scale = Math.min(T / 8, 86400 / 90); // one orbit ≈ 8 s, or a day in 90 s for slow orbits
      ctx.setDuration(Math.max(86400, 2 * T));
      const n = 1800, lon = [], lat = [], tt = [], hh = [], vv = [];
      for (let k = 0; k <= n; k++) {
        const t = time.D * k / n, p = position(o, t, state.j2), s = subPoint(p, t), r = Math.hypot(...p);
        if (lon.length && Math.abs(s.lon - lon[lon.length - 1] * deg) > Math.PI) { lon.push(NaN); lat.push(NaN); }
        lon.push(s.lon / deg); lat.push(s.lat / deg);
        if (k % 3 === 0) { tt.push(t); hh.push(r - RE); vv.push(visViva(r, o.a)); }
      }
      track = { lon, lat, tt, hh, vv };
    }

    return {
      changed() { buildTrack(); },
      update() {
        const o = els(), t = time.t, S = 1 / RE;
        const pts = []; for (let k = 0; k <= 360; k++) pts.push(...position(o, T * k / 360 + t - (t % T), state.j2).map((x) => x * S));
        orbit.set(pts);
        const p = position(o, t, state.j2), q = position(o, t + 1, state.j2);
        sat.position.set(p[0] * S, p[1] * S, p[2] * S); vel.set(sat.position.toArray(), q.map((x, k) => x - p[k]), 0.6);
        earth.rotation.z = WE * t;
        grat.object.visible = state.graticule;
        const rr = state.j2 ? j2Rates(o.a, o.e, o.i) : { dOmega: 0 }, W = o.raan + rr.dOmega * t;
        eq.object.visible = nodes.object.visible = asc.visible = state.nodes;
        const ring = []; for (let k = 0; k <= 128; k++) { const a = 2 * Math.PI * k / 128, R = Math.max(1.5, (o.a * (1 + o.e)) * S * 1.05); ring.push(R * Math.cos(a), R * Math.sin(a), 0); }
        eq.set(ring);
        const L = Math.max(1.4, o.a * (1 + o.e) * S); nodes.segments([-L * Math.cos(W), -L * Math.sin(W), 0, L * Math.cos(W), L * Math.sin(W), 0]);
        asc.position.set(L * 1.05 * Math.cos(W), L * 1.05 * Math.sin(W), 0);
        const r = Math.hypot(...p), sp = subPoint(p, t);
        hud.set('T', `${(T / 60).toFixed(1)} min`); hud.set('h', si(r - RE, 'm')); hud.set('v', si(visViva(r, o.a), 'm/s'));
        hud.set('pa', `${si(o.a * (1 - o.e) - RE, 'm')}, ${si(o.a * (1 + o.e) - RE, 'm')}`);
        hud.set('shift', `${(-WE * T / deg).toFixed(1)}° of longitude`);
        hud.set('j2', state.j2 ? `${(rr.dOmega * 86400 / deg).toFixed(3)}°/day` : 'off');
        plots.track.draw({ xlim: [-180, 180], ylim: [-90, 90], markers: [{ x: sp.lon / deg, y: sp.lat / deg, color: '--accent' }], series: [{ x: track.lon, y: track.lat, color: '--c-B', label: `ground track over ${(time.D / 3600).toFixed(0)} h (latitude °)` }] });
        plots.alt.draw({ xlim: [0, Math.min(time.D, 3 * T)], cursor: t % (3 * T), series: [{ x: track.tt, y: track.hh, color: '--c-B', label: 'altitude' }, { x: track.tt, y: track.vv, color: '--c-v', dash: [4, 3], axis: 1, label: 'speed' }] });
      },
      theme() { grat.theme(); meridian.theme(); orbit.theme(); eq.theme(); nodes.theme(); vel.theme(); ax.theme(); globeMat.color.set(ctx.cssVar('--panel-2')); satMat.color.set(ctx.cssVar('--c-I')); },
    };
  },
};
