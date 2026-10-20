// Colour legend (always visible): one log colormap bar plus line-style swatches.
import { cssGradient } from './colormap.js';
import { si } from '../ui/format.js';

export function createLegend(el) {
  return {
    set({ title, map, lo, hi, unit, swatches = [] }) {
      const decades = [];
      for (let e = Math.ceil(Math.log10(lo)); e <= Math.floor(Math.log10(hi)); e++) decades.push(10 ** e);
      const ticks = [lo, ...decades.filter((d) => d > lo * 1.5 && d < hi / 1.5), hi];
      el.innerHTML = `<div>${title} <span style="color:var(--ink-dim)">(log scale)</span></div>
        <div class="bar" style="background:${cssGradient(map)}"></div>
        <div class="ticks">${[ticks[0], ticks[Math.floor(ticks.length / 2)], ticks[ticks.length - 1]].map((t) => `<span>${si(t, unit, 2)}</span>`).join('')}</div>
        ${swatches.map((s) => `<div><span class="swatch" style="background:var(${s.color})"></span>${s.label}</div>`).join('')}`;
    },
  };
}
