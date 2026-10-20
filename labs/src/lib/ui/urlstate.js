// URL state: ?scenario=…&N=40&I0=2.5#tour-3. Reading always works; writing uses replaceState,
// which some browsers refuse on file:// — then the "Copy link" button still builds the URL.
export function readUrl() {
  const q = new URLSearchParams(location.search), params = {};
  for (const [k, v] of q) if (k !== 'scenario') params[k] = v;
  const m = /^#tour-(\d+)$/.exec(location.hash);
  return { scenario: q.get('scenario'), params, tour: m ? Number(m[1]) : null };
}

export function buildUrl(scenario, params, tour) {
  const q = new URLSearchParams();
  if (scenario) q.set('scenario', scenario);
  for (const [k, v] of Object.entries(params)) q.set(k, String(v));
  return `${location.pathname}?${q}${tour != null ? `#tour-${tour}` : ''}`;
}

let timer = 0;
export function writeUrl(scenario, params, tour) {
  clearTimeout(timer);
  timer = setTimeout(() => {
    try { history.replaceState(null, '', buildUrl(scenario, params, tour)); } catch { /* file:// in some browsers */ }
  }, 250);
}
