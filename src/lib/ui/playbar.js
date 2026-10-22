// Play bar overlaid on the scene: play/pause, restart, step, time scrubber and speed.
import { si } from './format.js';

const SPEEDS = [0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 1, 2];

export function createPlaybar(el, { onPlay, onRestart, onStep, onScrub, onSpeed }) {
  el.innerHTML = `<button class="pb play" aria-label="Play">▶</button>
    <button class="pb" data-a="restart" aria-label="Restart" title="Restart">⟲</button>
    <button class="pb" data-a="step" aria-label="Step forward" title="Step">⏭</button>
    <input type="range" min="0" max="1000" value="0" aria-label="Time">
    <span class="t">0 s</span>
    <label class="spd"><span class="sr-only">Speed</span><select aria-label="Playback speed">${SPEEDS.map((v) => `<option value="${v}">${v}×</option>`).join('')}</select></label>`;
  const play = el.querySelector('.play'), scrub = el.querySelector('input'), tl = el.querySelector('.t'), sp = el.querySelector('select');
  play.addEventListener('click', onPlay);
  el.querySelector('[data-a=restart]').addEventListener('click', onRestart);
  el.querySelector('[data-a=step]').addEventListener('click', onStep);
  scrub.addEventListener('input', () => onScrub(Number(scrub.value) / 1000));
  sp.addEventListener('change', () => onSpeed(Number(sp.value)));
  return {
    set({ playing, t, D, scrubbable, speed }) {
      play.textContent = playing ? '❚❚' : '▶';
      play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
      scrub.disabled = !scrubbable || !D;
      scrub.value = String(D ? Math.round(1000 * Math.min(1, t / D)) : 0);
      tl.textContent = D ? `${si(t, 's', 3)} / ${si(D, 's', 2)}` : si(t, 's', 3);
      if (!SPEEDS.includes(speed)) { const o = document.createElement('option'); o.value = String(speed); o.textContent = `${speed}×`; sp.append(o); }
      sp.value = String(speed);
    },
  };
}
