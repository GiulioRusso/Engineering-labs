// Explain drawer: theory sections (MathML pre-rendered at build time). Clicking a section with
// data-highlight calls onHighlight(key), or onHighlight(null) when clicked again or closed.
export function initExplain(drawer, onHighlight) {
  const set = (open) => {
    drawer.classList.toggle('open', open);
    drawer.inert = !open;
    if (!open) { drawer.querySelectorAll('section.active').forEach((s) => s.classList.remove('active')); onHighlight(null); }
  };
  drawer.querySelector('.close')?.addEventListener('click', () => set(false));
  for (const s of drawer.querySelectorAll('section[data-highlight]')) {
    s.tabIndex = 0;
    s.setAttribute('role', 'button');
    const pick = () => {
      const was = s.classList.contains('active');
      drawer.querySelectorAll('section.active').forEach((x) => x.classList.remove('active'));
      if (!was) s.classList.add('active');
      onHighlight(was ? null : s.dataset.highlight);
    };
    s.addEventListener('click', pick);
    s.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
  }
  drawer.inert = true;
  return { toggle: () => { set(!drawer.classList.contains('open')); return drawer.classList.contains('open'); }, close: () => set(false) };
}
