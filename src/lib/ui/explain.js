// Theory drawer: sections pre-rendered to MathML at build time. show(case, example) keeps the untagged
// elements plus, for an example, its own section; with no example (Free), the sections of the case.
// Clicking a section with data-highlight calls onHighlight(key), or onHighlight(null) when clicked again or closed.
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
  let current = null;
  const reveal = () => { if (current && drawer.classList.contains('open')) current.scrollIntoView({ block: 'nearest' }); };
  return {
    toggle: () => { set(!drawer.classList.contains('open')); reveal(); return drawer.classList.contains('open'); },
    close: () => set(false),
    show(caseId, exId) {
      current = null;
      for (const el of drawer.querySelectorAll('[data-case]')) {
        const ex = el.dataset.example, on = el.dataset.case.split(' ').includes(caseId) && (exId ? ex === exId : !ex);
        el.hidden = !on;
        if (on && ex) current = el;
      }
      reveal();
    },
  };
}
