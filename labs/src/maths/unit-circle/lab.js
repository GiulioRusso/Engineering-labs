// The unit circle unrolled into a helix: sine and cosine as the shadows of one motion.
import * as THREE from 'three';
import { createCurve } from '../../lib/viz/curve.js';
import { createKnob } from '../../lib/viz/knob.js';
import { createDots } from '../../lib/viz/graph2d.js';
import { point, trig, K } from './model.js';

const W = 1.6, TURNS = 2, XMAX = K * 2 * Math.PI * TURNS;
const target = [XMAX / 2 - 0.4, 0, 0];

export default {
  id: 'unit-circle', title: 'The unit circle', size: 2.4,
  cameras: {
    front: { pos: [target[0], -7, 0.3], target }, side: { pos: [-6, 0, 0.2], target: [0, 0, 0] },
    top: { pos: [target[0], -0.01, 7], target }, iso: { pos: [target[0] + 3.8, -5.5, 3.4], target },
  },
  defaults: { theta: 0.8, omega: 1, units: 'deg', helix: false, shadows: false, tangent: false, triangle: true },
  scenarios: [
    { id: 'circle', label: 'Circle', hint: 'Drag the point: sin and cos are its coordinates.', cam: 'side', set: { omega: 0, theta: 0.6 } },
    { id: 'spin', label: 'Spin', cam: 'side', set: { omega: 1 } },
    { id: 'waves', label: 'Sine and cosine waves', hint: 'Unroll the angle along x.', cam: 'iso', set: { omega: 1, helix: true, shadows: true } },
    { id: 'tangent', label: 'Tangent', hint: 'tan θ blows up at 90°.', cam: 'side', set: { omega: 0.25, theta: 1.25, tangent: true } },
  ],
  controls: [
    { title: 'Angle', items: [
      { id: 'theta', label: 'Angle θ', unit: '°', k: 180 / Math.PI, min: 0, max: 4 * Math.PI, step: Math.PI / 180 },
      { id: 'omega', label: 'Speed ω', unit: 'rad/s', min: 0, max: 3, step: 0.05 },
      { id: 'units', label: 'Units', type: 'segmented', options: [['deg', 'Degrees'], ['rad', 'Radians']] },
    ] },
  ],
  display: [{ title: 'Show', items: [
    { id: 'helix', label: 'Helix', type: 'check', color: '--c-B' },
    { id: 'shadows', label: 'Sine and cosine waves', type: 'check' },
    { id: 'triangle', label: 'Triangle', type: 'check' },
    { id: 'tangent', label: 'Tangent', type: 'check', color: '--c-F' },
  ] }],
  plots: [{ id: 'trig', title: 'sin, cos and tan of θ', xLabel: 'θ', xUnit: 'rad', yUnit: '' }],
  hud: [{ id: 'th', label: 'θ' }, { id: 'sin', label: 'sin θ' }, { id: 'cos', label: 'cos θ' }, { id: 'tan', label: 'tan θ' }, 'sep', { id: 'id', label: 'sin² + cos²' }, { id: 'q', label: 'quadrant' }],

  setup(ctx) {
    const { scene, state, time, hud, plots, stage, label } = ctx;
    stage.grid.position.z = -W - 0.01; stage.axes.visible = false;
    const circle = createCurve(stage, { max: 200, width: 2.4, color: '--ink-dim' });
    const cpts = []; for (let i = 0; i <= 128; i++) { const a = 2 * Math.PI * i / 128; cpts.push(0, Math.cos(a), Math.sin(a)); }
    circle.set(cpts);
    const axesC = createCurve(stage, { max: 4, width: 1, color: '--line' }); axesC.segments([0, -1.3, 0, 0, 1.3, 0, 0, 0, -1.3, 0, 0, 1.3]);
    const helix = createCurve(stage, { max: 800, width: 2.6, color: '--c-B' });
    const sine = createCurve(stage, { max: 800, width: 2.4, color: '--c-E' });
    const cosine = createCurve(stage, { max: 800, width: 2.4, color: '--c-v' });
    const hpts = [], spts = [], cpts2 = [];
    for (let i = 0; i <= 600; i++) { const th = 2 * Math.PI * TURNS * i / 600, [x, y, z] = point(th); hpts.push(x, y, z); spts.push(x, -W, z); cpts2.push(x, y, -W); }
    helix.set(hpts); sine.set(spts); cosine.set(cpts2);
    // walls the shadows fall on
    const wallMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false });
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(XMAX + 0.4, 2.6), wallMat); wall.rotation.x = Math.PI / 2; wall.position.set(XMAX / 2, -W, 0); scene.add(wall);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(XMAX + 0.4, 2.6), wallMat); floor.position.set(XMAX / 2, 0, -W); scene.add(floor);
    const sinLeg = createCurve(stage, { max: 1, width: 3, color: '--c-E' }), cosLeg = createCurve(stage, { max: 1, width: 3, color: '--c-v' });
    const radius = createCurve(stage, { max: 1, width: 2.2, color: '--ink' });
    const tanSeg = createCurve(stage, { max: 2, width: 3, color: '--c-F' });
    const links = createCurve(stage, { max: 6, width: 1.2, color: '--c-ref', dashed: true });
    const unroll = createCurve(stage, { max: 1, width: 1.4, color: '--c-ref', dashed: true });
    const dots = createDots(scene, 3, { r: 0.045, color: '--accent' });
    const knob = createKnob(scene, '--accent', 0.07);
    const tLabel = label('tan θ'), sLabel = label('sin θ'), cLabel = label('cos θ'), hLabel = label('helix'), wsLabel = label('sin'), wcLabel = label('cos');
    for (const l of [tLabel, sLabel, cLabel, hLabel, wsLabel, wcLabel]) scene.add(l);
    hLabel.position.set(XMAX + 0.2, 1, 0.2); wsLabel.position.set(XMAX + 0.3, -W, 1.2); wcLabel.position.set(XMAX + 0.3, 1.2, -W);

    ctx.handles.add({
      object: knob.group, axes: 'yz', hint: 'Drag the point around the circle',
      get: () => knob.get(),
      set: ([, y, z]) => { state.theta = ((Math.atan2(z, y) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); time.t = 0; state.omega = 0; ctx.requestUpdate(); ctx.panelSync(); },
    });
    const thetaNow = () => state.theta + state.omega * time.t;
    const fmtA = (th) => (state.units === 'deg' ? `${(th * 180 / Math.PI).toFixed(1)}°` : `${th.toFixed(3)} rad`);
    const n4 = (v) => (Number.isFinite(v) && Math.abs(v) < 1e6 ? v.toFixed(4) : '±∞');

    return {
      changed() { ctx.setDuration(state.omega ? 2 * Math.PI * TURNS / state.omega : 0); },
      update() {
        const th = thetaNow(), thw = th % (2 * Math.PI * TURNS), { s, c, t, quadrant } = trig(th);
        const [hx] = point(thw);
        helix.object.visible = hLabel.visible = state.helix;
        sine.object.visible = cosine.object.visible = wall.visible = floor.visible = wsLabel.visible = wcLabel.visible = state.shadows;
        knob.set([0, c, s]);
        radius.segments([0, 0, 0, 0, c, s]);
        sinLeg.object.visible = cosLeg.object.visible = sLabel.visible = cLabel.visible = state.triangle;
        sinLeg.segments([0, c, 0, 0, c, s]); cosLeg.segments([0, 0, 0, 0, c, 0]);
        sLabel.position.set(0, c + 0.12 * Math.sign(c || 1), s / 2); cLabel.position.set(0, c / 2, -0.12 * Math.sign(s || 1));
        const tc = Math.max(-2.2, Math.min(2.2, t));
        tanSeg.object.visible = tLabel.visible = state.tangent && Math.abs(c) > 1e-3;
        tanSeg.segments([0, 1, 0, 0, 1, tc, 0, 0, 0, 0, 1, tc]); tLabel.position.set(0, 1.12, tc);
        const pts = [{ p: [hx, c, s] }];
        if (state.shadows) pts.push({ p: [hx, -W, s] }, { p: [hx, c, -W] });
        dots.set(state.helix ? pts : []);
        links.object.visible = state.helix;
        links.segments([hx, c, s, hx, -W, s, hx, c, s, hx, c, -W, 0, c, s, hx, c, s]);
        unroll.segments([0, 0, 0, XMAX, 0, 0]);
        hud.set('th', fmtA(((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)));
        hud.set('sin', n4(s)); hud.set('cos', n4(c)); hud.set('tan', n4(t));
        hud.set('id', (s * s + c * c).toFixed(12), 'good'); hud.set('q', String(quadrant));
        const n = 400, X = new Float64Array(n), S = new Float64Array(n), C = new Float64Array(n), T = new Float64Array(n);
        for (let i = 0; i < n; i++) { const a = 4 * Math.PI * i / (n - 1); X[i] = a; S[i] = Math.sin(a); C[i] = Math.cos(a); const tt = Math.tan(a); T[i] = Math.abs(tt) < 2.5 ? tt : NaN; }
        plots.trig.draw({ xlim: [0, 4 * Math.PI], ylim: [-2.5, 2.5], cursor: thw % (4 * Math.PI), series: [
          { x: X, y: S, color: '--c-E', label: 'sin' }, { x: X, y: C, color: '--c-v', label: 'cos' }, { x: X, y: T, color: '--c-F', dash: [4, 3], label: 'tan' }] });
      },
      theme() {
        for (const c of [circle, axesC, helix, sine, cosine, sinLeg, cosLeg, radius, tanSeg, links, unroll]) c.theme();
        dots.theme(); knob.theme(); wallMat.color.set(ctx.cssVar('--ink'));
      },
    };
  },
};
