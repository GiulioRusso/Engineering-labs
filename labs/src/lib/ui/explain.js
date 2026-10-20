// Explain drawer: theory sections already rendered (MathML) in the page. Clicking a section with
// data-highlight calls onHighlight(key) (or null when it is clicked again).
export function initExplain(drawer, button, onHighlight) {
  const close = drawer.querySelector('.close');
  const set = (open) => {
    drawer.classList.toggle('open', open);
    button.setAttribute('aria-expanded', String(open));
    drawer.inert = !open;
    if (!open) { drawer.querySelectorAll('section.active').forEach((s) => s.classList.remove('active')); onHighlight(null); }
  };
  button.addEventListener('click', () => set(!drawer.classList.contains('open')));
  close.addEventListener('click', () => set(false));
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
  set(false);
  return { toggle: () => set(!drawer.classList.contains('open')), close: () => set(false) };
}
