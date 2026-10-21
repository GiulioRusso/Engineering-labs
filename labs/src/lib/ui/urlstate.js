// URL state: ?lab=…&scenario=…&N=40. Writing (topic.js) uses replaceState, which some browsers
// refuse on file://; reading always works.
export function readUrl() {
  const q = new URLSearchParams(location.search), params = {};
  for (const [k, v] of q) if (k !== 'scenario') params[k] = v;
  return { scenario: q.get('scenario'), params };
}
