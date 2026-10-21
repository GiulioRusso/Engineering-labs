// URL state: ?lab=…&case=…&ex=…&N=40. Writing (topic.js) uses replaceState, which some browsers
// refuse on file://; reading always works.
export function readUrl() {
  return { params: Object.fromEntries(new URLSearchParams(location.search)) };
}
