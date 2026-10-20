// 3D stage: renderer, z-up cameras (perspective / orthographic), damped orbit controls, labelled axes
// triad, ground grid, eased camera presets, render-on-demand and off-screen pausing.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { cssVar } from './theme.js';

export function label(text, cls = '') {
  const d = document.createElement('div');
  d.className = `label3d ${cls}`;
  d.textContent = text;
  return new CSS2DObject(d);
}

export function createStage(container, { size = 0.5, presets }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  container.append(renderer.domElement);
  const labels = new CSS2DRenderer();
  labels.domElement.style.cssText = 'position:absolute;inset:0;pointer-events:none';
  container.append(labels.domElement);

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(1, -1.5, 2);
  scene.add(sun);

  const persp = new THREE.PerspectiveCamera(40, 1, size / 100, size * 40);
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, -size * 40, size * 40);
  for (const c of [persp, ortho]) c.up.set(0, 0, 1);
  let camera = persp;
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.12;
  controls.minDistance = size * 0.15;
  controls.maxDistance = size * 8;

  // axes triad
  const axes = new THREE.Group();
  const axisMats = {};
  for (const [name, dir] of [['x', [1, 0, 0]], ['y', [0, 1, 0]], ['z', [0, 0, 1]]]) {
    const mat = new THREE.MeshBasicMaterial();
    axisMats[name] = mat;
    const L = size * 0.35, r = size * 0.004;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 8), mat);
    const head = new THREE.Mesh(new THREE.ConeGeometry(r * 3, r * 9, 12), mat);
    shaft.position.y = L / 2; head.position.y = L;
    const g = new THREE.Group(); g.add(shaft, head);
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...dir));
    const lb = label(name, 'axis'); lb.position.set(0, L * 1.12, 0); g.add(lb);
    axes.add(g);
  }
  scene.add(axes);

  const grid = new THREE.GridHelper(size * 2, 20);
  grid.rotation.x = Math.PI / 2;
  grid.position.z = -size * 0.8;
  scene.add(grid);

  // ---------------------------------------------------------------- render on demand
  let dirty = true, animating = false, visible = true, raf = 0, tween = null, onFrame = () => {};
  const stats = { cpu: [], interval: [], last: 0 };
  const requestRender = () => { dirty = true; kick(); };
  function kick() { if (!raf && visible) raf = requestAnimationFrame(frame); }
  function frame(now) {
    raf = 0;
    const t0 = performance.now();
    if (stats.last) stats.interval.push(now - stats.last);
    stats.last = now;
    const dt = Math.min(0.1, stats.interval.length ? stats.interval[stats.interval.length - 1] / 1000 : 1 / 60);
    if (tween) {
      const u = Math.min(1, (now - tween.t0) / tween.ms), e = u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) ** 2;
      camera.position.lerpVectors(tween.p0, tween.p1, e);
      controls.target.lerpVectors(tween.q0, tween.q1, e);
      if (u >= 1) tween = null;
      dirty = true;
    }
    const moved = controls.update();
    if (moved) dirty = true;
    if (animating) { onFrame(dt); dirty = true; }
    if (dirty) { renderer.render(scene, camera); labels.render(scene, camera); dirty = false; }
    stats.cpu.push(performance.now() - t0);
    if (stats.cpu.length > 240) { stats.cpu.shift(); stats.interval.shift(); }
    if (animating || tween || moved) kick();
    else { stats.last = 0; }
  }
  controls.addEventListener('change', requestRender);
  controls.addEventListener('start', () => { dirty = true; kick(); });
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting && !document.hidden; if (visible) requestRender(); });
  io.observe(container);
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; if (visible) requestRender(); });
  renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); window.__labContextLost = true; });

  function resize() {
    const r = container.getBoundingClientRect(), w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h); labels.setSize(w, h);
    persp.aspect = w / h; persp.updateProjectionMatrix();
    const half = Math.tan(THREE.MathUtils.degToRad(persp.fov / 2)) * camera.position.distanceTo(controls.target);
    ortho.left = -half * w / h; ortho.right = half * w / h; ortho.top = half; ortho.bottom = -half;
    ortho.updateProjectionMatrix();
    for (const fn of api.onResize) fn(w, h);
    requestRender();
  }
  new ResizeObserver(resize).observe(container);

  function setTheme() {
    const bg = new THREE.Color(cssVar('--scene'));
    renderer.setClearColor(bg);
    for (const k of ['x', 'y', 'z']) axisMats[k].color.set(cssVar(`--c-${k}`));
    const gc = new THREE.Color(cssVar('--line'));
    grid.material.color = gc; grid.material.vertexColors = false; grid.material.needsUpdate = true;
    requestRender();
  }

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const api = {
    THREE, scene, renderer, controls, axes, grid, stats, onResize: [], reducedMotion: reduced,
    get camera() { return camera; },
    requestRender,
    setAnimating(on) { animating = on; if (on) kick(); },
    setOnFrame(fn) { onFrame = fn; },
    setTheme,
    preset(name, { instant = false } = {}) {
      const p = presets[name];
      if (!p) return;
      const p1 = new THREE.Vector3(...p.pos), q1 = new THREE.Vector3(...(p.target || [0, 0, 0]));
      if (instant || reduced) { camera.position.copy(p1); controls.target.copy(q1); controls.update(); resize(); return; }
      tween = { t0: performance.now(), ms: 650, p0: camera.position.clone(), p1, q0: controls.target.clone(), q1 };
      requestRender();
    },
    toggleOrtho() {
      const next = camera === persp ? ortho : persp;
      next.position.copy(camera.position); next.quaternion.copy(camera.quaternion);
      camera = next; controls.object = next; resize();
      return camera === ortho;
    },
    frameStats() {
      const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(p * (s.length - 1))] || 0; };
      return { cpuMedian: q(stats.cpu, 0.5), cpuP95: q(stats.cpu, 0.95), intervalMedian: q(stats.interval, 0.5), n: stats.cpu.length };
    },
  };
  resize();
  return api;
}
