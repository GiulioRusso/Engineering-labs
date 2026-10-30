// Renderer: objects
//
// An object diagram: every live object as a box (name : Class, then its fields),
// the references objects hold as grey arrows, and the call being made at this
// step as a highlighted arrow labelled with the method. Boxes sit at positions
// placed by hand in the C++ (never a runtime layout), so the picture stays still
// while the messages move. Under the diagram, what the program has printed.
(function () {
  const SVGNS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(SVGNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  window.RENDERERS = window.RENDERERS || {};
  window.RENDERERS.objects = function createObjectsRenderer() {
    let svg, gE, gN, con, pos = {}, size = {}, W = 150;
    const LH = 17, HH = 25;

    function mount(container, trace, opts) {
      opts = opts || {};
      const layout = opts.layout || {}, steps = opts.steps || [];
      // a box is as tall as the most fields its object ever shows, so it never jumps
      size = {};
      for (const s of steps) for (const [id, o] of Object.entries((s.graph || {}).nodes || {})) size[id] = Math.max(size[id] || 0, (o.fields || []).length);
      const ids = Object.keys(layout), pad = 30, top = 46;
      const xs = ids.map((k) => layout[k].x), ys = ids.map((k) => layout[k].y);
      const minX = Math.min(...xs, 0), maxX = Math.max(...xs, 0), minY = Math.min(...ys, 0), maxY = Math.max(...ys, 0);
      const hMax = Math.max(0, ...ids.map((k) => HH + LH * (size[k] || 0) + 6));
      const width = maxX - minX + W + 2 * pad + 60, height = maxY - minY + hMax + pad + top;
      pos = {}; for (const k of ids) pos[k] = { x: layout[k].x - minX + pad, y: layout[k].y - minY + top };
      container.innerHTML = '';
      svg = el('svg', { viewBox: `0 0 ${width} ${height}`, width, height }, container);
      const defs = el('defs', {}, svg);
      [['o-has', 'var(--ink-dim)'], ['o-call', 'var(--accent)'], ['o-new', 'var(--c-sorted)']].forEach(([id, c]) => {
        const m = el('marker', { id, viewBox: '0 0 10 10', refX: 10, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
        el('path', { d: 'M0 0L10 5L0 10z', fill: c }, m);
      });
      gE = el('g', {}, svg); gN = el('g', {}, svg);
      con = document.createElement('pre');
      con.style.cssText = 'margin:8px 0 0;padding:8px 10px;min-height:5.2em;border-radius:8px;background:color-mix(in srgb, var(--ink) 6%, transparent);font:12px/1.45 var(--mono);color:var(--ink);white-space:pre-wrap';
      container.appendChild(con);
    }
    const box = (id) => { const p = pos[id]; return p && { x: p.x, y: p.y, w: W, h: HH + LH * (size[id] || 0) + 6 }; };
    // where the segment from the centre of a towards point (tx, ty) leaves the box
    function exit(b, tx, ty) {
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2, dx = tx - cx, dy = ty - cy;
      const s = Math.min(Math.abs(dx) > 1e-9 ? (b.w / 2) / Math.abs(dx) : Infinity, Math.abs(dy) > 1e-9 ? (b.h / 2) / Math.abs(dy) : Infinity);
      return [cx + dx * s, cy + dy * s];
    }
    function render(step) {
      const G = step.graph || { nodes: {}, edges: [] };
      gE.innerHTML = ''; gN.innerHTML = '';
      con.textContent = step.sequence ? step.sequence : ' ';
      const edges = G.edges || [];
      edges.forEach((e) => {
        const a = box(e.from), b = box(e.to); if (!a || !b || !G.nodes[e.from] || !G.nodes[e.to]) return;
        if (e.from === e.to) { // a call to its own method: a loop over the top right corner
          const x0 = a.x + a.w - 34, y0 = a.y, x1 = a.x + a.w, y1 = a.y + 12;
          el('path', { d: `M${x0} ${y0} C${x0} ${y0 - 34} ${x1 + 30} ${y1 - 30} ${x1} ${y1}`, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.4, 'marker-end': 'url(#o-call)' }, gE);
          const t = el('text', { x: x1 + 6, y: y0 - 18, fill: 'var(--accent)', 'font-size': 13.5, 'font-family': 'var(--mono)', 'font-weight': 700, 'paint-order': 'stroke', stroke: 'var(--panel)', 'stroke-width': 4 }, gE);
          t.textContent = e.label; return;
        }
        const twin = edges.some((o) => o !== e && ((o.from === e.to && o.to === e.from) || (o.from === e.from && o.to === e.to)));
        const cur = e.state === 'current', ret = e.kind === 'return', off = twin ? (cur ? 9 : -9) : 0;
        const ac = [a.x + a.w / 2, a.y + a.h / 2], bc = [b.x + b.w / 2, b.y + b.h / 2], L = Math.hypot(bc[0] - ac[0], bc[1] - ac[1]) || 1, nx = -(bc[1] - ac[1]) / L * off, ny = (bc[0] - ac[0]) / L * off;
        const p1 = exit(a, bc[0] + nx, bc[1] + ny), p2 = exit(b, ac[0] + nx, ac[1] + ny);
        const x1 = p1[0] + nx, y1 = p1[1] + ny, x2 = p2[0] + nx, y2 = p2[1] + ny;
        const color = cur ? 'var(--accent)' : e.kind === 'creates' ? 'var(--c-sorted)' : 'var(--ink-dim)';
        el('line', { x1, y1, x2, y2, stroke: color, 'stroke-width': cur ? 2.6 : 1.4, 'stroke-dasharray': ret || e.kind === 'creates' ? '6 4' : 'none', 'marker-end': `url(#${cur ? 'o-call' : e.kind === 'creates' ? 'o-new' : 'o-has'})` }, gE);
        if (e.label) {
          const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, t = el('text', { x: mx, y: my - 6, 'text-anchor': 'middle', fill: color, 'font-size': cur ? 13.5 : 12, 'font-family': 'var(--mono)', 'font-weight': cur ? 700 : 400, 'paint-order': 'stroke', stroke: 'var(--panel)', 'stroke-width': 4 }, gE);
          t.textContent = e.label;
        }
      });
      for (const [id, o] of Object.entries(G.nodes || {})) {
        const b = box(id); if (!b) continue;
        const st = o.state, edge = st === 'active' ? 'var(--accent)' : st === 'new' ? 'var(--c-sorted)' : 'var(--line)';
        const g = el('g', {}, gN);
        el('rect', { x: b.x, y: b.y, width: b.w, height: b.h, rx: 7, fill: 'var(--panel)', stroke: edge, 'stroke-width': st ? 2.4 : 1.2 }, g);
        el('line', { x1: b.x, y1: b.y + HH, x2: b.x + b.w, y2: b.y + HH, stroke: 'var(--line)' }, g);
        const h = el('text', { x: b.x + 8, y: b.y + 16, fill: 'var(--ink)', 'font-size': 13, 'font-family': 'var(--mono)', 'font-weight': 700 }, g);
        h.textContent = `${id} : ${o.cls}`.slice(0, 20);
        (o.fields || []).forEach((f, i) => { const t = el('text', { x: b.x + 8, y: b.y + HH + 13 + i * LH, fill: 'var(--ink-dim)', 'font-size': 12, 'font-family': 'var(--mono)' }, g); t.textContent = f.slice(0, 19); });
      }
    }
    const legend = () => [
      { color: 'var(--accent)', label: 'call in progress / running object' },
      { color: 'var(--c-sorted)', label: 'just created' },
      { color: 'var(--ink-dim)', label: 'reference held' },
    ];
    return { id: 'objects', mount, render, legend };
  };
})();
