// Information: surprisal and entropy of a source, Huffman's optimal prefix code, and the binary symmetric
// channel with its mutual information and capacity. Logs are base 2: everything is in bits. Pure, no DOM.
export const log2 = (x) => Math.log(x) / Math.LN2;
export const normalize = (w) => { const s = w.reduce((a, b) => a + b, 0); return w.map((v) => v / s); };
export const entropy = (p) => p.reduce((h, q) => (q > 0 ? h - q * log2(q) : h), 0);
export const H2 = (p) => (p <= 0 || p >= 1 ? 0 : -p * log2(p) - (1 - p) * log2(1 - p));
// Huffman: merge the two least likely nodes until one is left. Returns each symbol's codeword and the
// tree (leaves first, then internal nodes { l, r, p }) for drawing.
export function huffman(p) {
  const nodes = p.map((q, i) => ({ p: q, sym: i })), live = nodes.map((_, i) => i);
  if (p.length === 1) return { codes: ['0'], nodes, root: 0 };
  while (live.length > 1) {
    live.sort((a, b) => nodes[a].p - nodes[b].p || a - b);
    const [l, r] = live.splice(0, 2); nodes.push({ p: nodes[l].p + nodes[r].p, l, r }); live.push(nodes.length - 1);
  }
  const codes = new Array(p.length), walk = (k, c) => { const n = nodes[k]; if (n.l === undefined) codes[n.sym] = c || '0'; else { walk(n.l, c + '0'); walk(n.r, c + '1'); } };
  walk(nodes.length - 1, '');
  return { codes, nodes, root: nodes.length - 1 };
}
export const avgLength = (p, codes) => p.reduce((s, q, i) => s + q * codes[i].length, 0);
// binary symmetric channel: each bit flips with probability e; input P(X = 1) = q
export const pY1 = (q, e) => q * (1 - e) + (1 - q) * e;
export const mutualInfo = (q, e) => H2(pY1(q, e)) - H2(e);
export const capacity = (e) => 1 - H2(e);
