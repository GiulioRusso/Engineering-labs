// Flowcharts for the coding programs (used by the "program" renderer): structured blocks laid out
// recursively. A decision sends "yes" straight down and "no" to the right; a loop's body hangs below its
// decision and an edge on the left goes back up to it; its "no" edge leaves on the right. Every block
// keeps the line id of its statement, so the block being executed can be lit up.
(function () {
  const W = 140, H = 30, DW = 120, DH = 50, G = 20, FS = 11.5;
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const tw = (t) => t.length * FS * 0.58 + 22;
  const arrow = (pts, label, lx, ly) => `<polyline class="fe" points="${pts.map((p) => p.join(',')).join(' ')}" marker-end="url(#fa)"/>${label ? `<text class="fl" x="${lx}" y="${ly}">${label}</text>` : ''}`;
  const line = (pts) => `<polyline class="fe" points="${pts.map((p) => p.join(',')).join(' ')}"/>`;

  function node(it) {
    const w = Math.max(it.k === 'start' || it.k === 'end' ? 110 : W, tw(it.t)), ended = it.k === 'end' || it.k === 'jump';
    return { l: w / 2, r: w / 2, h: H, ended, draw(cx, y) {
      const x = cx - w / 2, d = `data-line="${it.line ?? ''}"`, txt = `<text x="${cx}" y="${y + H / 2 + 4}">${esc(it.t)}</text>`;
      if (it.k === 'start' || it.k === 'end') return `<g class="fn-term" ${d}><rect x="${x}" y="${y}" width="${w}" height="${H}" rx="${H / 2}"/>${txt}</g>`;
      if (it.k === 'io') return `<g class="fn-io" ${d}><polygon points="${x + 10},${y} ${x + w},${y} ${x + w - 10},${y + H} ${x},${y + H}"/>${txt}</g>`;
      if (it.k === 'call') return `<g class="fn-call" ${d}><rect x="${x}" y="${y}" width="${w}" height="${H}"/><line x1="${x + 7}" y1="${y}" x2="${x + 7}" y2="${y + H}"/><line x1="${x + w - 7}" y1="${y}" x2="${x + w - 7}" y2="${y + H}"/>${txt}</g>`;
      if (it.k === 'jump') return `<g class="fn-jump" ${d}><rect x="${x}" y="${y}" width="${w}" height="${H}" rx="6"/>${txt}</g>`;
      return `<g class="fn-proc" ${d}><rect x="${x}" y="${y}" width="${w}" height="${H}" rx="2"/>${txt}</g>`;
    } };
  }
  function diamond(it, cx, y) {
    const dw = Math.max(DW, tw(it.t) + 34);
    return `<g class="fn-dec" data-line="${it.line ?? ''}"><polygon points="${cx},${y} ${cx + dw / 2},${y + DH / 2} ${cx},${y + DH} ${cx - dw / 2},${y + DH / 2}"/><text x="${cx}" y="${y + DH / 2 + 4}">${esc(it.t)}</text></g>`;
  }
  function seq(items) {
    const bs = items.map(block);
    return { l: Math.max(0, ...bs.map((b) => b.l)), r: Math.max(0, ...bs.map((b) => b.r)), h: bs.reduce((s, b) => s + b.h, 0) + G * Math.max(0, bs.length - 1), ended: !!bs.length && bs[bs.length - 1].ended, empty: !bs.length,
      draw(cx, y) { let o = ''; bs.forEach((b, i) => { o += b.draw(cx, y); y += b.h; if (i < bs.length - 1 && !b.ended) o += arrow([[cx, y], [cx, y + G]]); y += G; }); return o; } };
  }
  function block(it) {
    if (it.k === 'if') {
      const dw = Math.max(DW, tw(it.t) + 34), Y = seq(it.yes), N = seq(it.no || []), hasNo = !N.empty;
      const dx = Math.max(dw / 2, Y.r) + 34 + (hasNo ? N.l : 0), r = hasNo ? dx + N.r : Math.max(dw / 2 + 28, Y.r), mh = Math.max(Y.h, hasNo ? N.h : 0);
      const ended = Y.ended && hasNo && N.ended, h = DH + G + mh + (ended ? 0 : G);
      return { l: Math.max(dw / 2, Y.l), r, h, ended, draw(cx, y) {
        let o = diamond(it, cx, y); const by = y + DH + G, my = by + mh + G / 2;
        o += arrow([[cx, y + DH], [cx, by]], 'yes', cx + 6, y + DH + 13);
        o += Y.draw(cx, by);
        if (hasNo) { o += arrow([[cx + dw / 2, y + DH / 2], [cx + dx, y + DH / 2], [cx + dx, by]], 'no', cx + dw / 2 + 6, y + DH / 2 - 5); o += N.draw(cx + dx, by); if (!N.ended) o += line([[cx + dx, by + N.h], [cx + dx, my], [cx, my]]); }
        else o += line([[cx + dw / 2, y + DH / 2], [cx + dw / 2 + 20, y + DH / 2], [cx + dw / 2 + 20, my], [cx, my]]) + `<text class="fl" x="${cx + dw / 2 + 6}" y="${y + DH / 2 - 5}">no</text>`;
        if (!Y.ended) o += line([[cx, by + Y.h], [cx, my]]);
        if (!ended) o += line([[cx, my], [cx, y + h]]);
        return o;
      } };
    }
    if (it.k === 'chain') {   // if / else if / … / else: decisions stacked, "no" down to the next, "yes" right
      const cs = it.cases.map((c) => ({ c, dw: Math.max(DW, tw(c.t) + 34), B: seq(c.body) })), E = seq(it.else || []);
      const dmax = Math.max(...cs.map((x) => x.dw)), bx = dmax / 2 + 34 + Math.max(...cs.map((x) => x.B.l)), rail = bx + Math.max(...cs.map((x) => x.B.r)) + 18;
      const rows = cs.map((x) => Math.max(DH, x.B.h) + G), h = rows.reduce((a, b) => a + b, 0) + E.h + G;
      return { l: Math.max(dmax / 2, E.l), r: rail + 4, h, ended: false, draw(cx, y) {
        let o = '', yy = y; const my = y + h - G / 2;
        cs.forEach((x, i) => {
          o += diamond(x.c, cx, yy); const ty = yy + DH / 2 - x.B.h / 2;
          o += arrow([[cx + x.dw / 2, yy + DH / 2], [cx + bx - x.B.l, yy + DH / 2]], 'yes', cx + x.dw / 2 + 5, yy + DH / 2 - 5) + x.B.draw(cx + bx, ty);
          o += line([[cx + bx + x.B.r, ty + x.B.h / 2], [cx + rail, ty + x.B.h / 2], [cx + rail, my], [cx, my]]);
          o += arrow([[cx, yy + DH], [cx, yy + rows[i]]], 'no', cx + 6, yy + DH + 13); yy += rows[i];
        });
        o += E.draw(cx, yy) + line([[cx, yy + E.h], [cx, y + h]]);
        return o;
      } };
    }
    if (it.k === 'loop') {
      const dw = Math.max(DW, tw(it.t) + 34), B = seq(it.body), l = Math.max(dw / 2, B.l) + 24, r = Math.max(dw / 2, B.r) + 24, h = 10 + DH + G + B.h + G + 12;
      return { l, r, h, ended: false, draw(cx, y) {
        const dy = y + 10, by = dy + DH + G, be = by + B.h;
        let o = arrow([[cx, y], [cx, dy]]) + diamond(it, cx, dy) + arrow([[cx, dy + DH], [cx, by]], 'yes', cx + 6, dy + DH + 13) + B.draw(cx, by);
        if (!B.ended) o += arrow([[cx, be], [cx, be + G / 2], [cx - l, be + G / 2], [cx - l, y + 4], [cx - 3, y + 4]]);
        o += line([[cx + dw / 2, dy + DH / 2], [cx + r, dy + DH / 2], [cx + r, y + h - 6], [cx, y + h - 6], [cx, y + h]]) + `<text class="fl" x="${cx + dw / 2 + 6}" y="${dy + DH / 2 - 5}">no</text>`;
        return o;
      } };
    }
    return node(it);
  }

  window.CODEFLOW = {
    // charts: [{ title, items }] → one SVG per chart in container; returns light(line, cond)
    draw(container, charts) {
      container.innerHTML = charts.map((c) => {
        const S = seq(c.items), pad = 14, w = S.l + S.r + 2 * pad, h = S.h + 2 * pad + 18;
        return `<figure class="fchart"><figcaption>${esc(c.title)}</figcaption><svg viewBox="0 0 ${w} ${h}" width="${w}" style="max-width:100%"><defs><marker id="fa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z"/></marker></defs>${S.draw(S.l + pad, pad)}</svg></figure>`;
      }).join('');
      const all = [...container.querySelectorAll('[data-line]')];
      return function light(ln, cond) {
        for (const g of all) { const on = g.dataset.line !== '' && +g.dataset.line === ln; g.classList.toggle('on', on); g.classList.toggle('yes', on && !!cond && cond.value); g.classList.toggle('no', on && !!cond && !cond.value); }
      };
    },
  };
})();
