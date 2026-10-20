// Guided tour: steps [{ title, text, apply() }]. apply sets parameters, layers and camera.
export function createTour(el, steps, { onStep } = {}) {
  el.innerHTML = `<div class="head"><h3></h3><span class="count"></span></div><p></p>
    <div class="nav"><button class="btn" data-a="close">Leave tour</button>
    <button class="btn" data-a="back">Back</button><button class="btn" data-a="next">Next</button></div>`;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Guided tour');
  const [h, count, p] = [el.querySelector('h3'), el.querySelector('.count'), el.querySelector('p')];
  const btn = (a) => el.querySelector(`[data-a="${a}"]`);
  let i = -1;
  const show = (k) => {
    i = Math.max(0, Math.min(steps.length - 1, k));
    const s = steps[i];
    el.classList.add('open');
    h.textContent = s.title; p.textContent = s.text; count.textContent = `${i + 1} / ${steps.length}`;
    btn('back').disabled = i === 0;
    btn('next').textContent = i === steps.length - 1 ? 'Finish' : 'Next';
    s.apply();
    onStep?.(i);
  };
  const close = () => { el.classList.remove('open'); i = -1; onStep?.(null); };
  btn('next').addEventListener('click', () => (i === steps.length - 1 ? close() : show(i + 1)));
  btn('back').addEventListener('click', () => show(i - 1));
  btn('close').addEventListener('click', close);
  return { show, close, get index() { return i; }, toggle: () => (i < 0 ? show(0) : close()) };
}
