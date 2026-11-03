// A tiny tracer for the coding programs: each program's logic is written once in JavaScript and records
// steps against logical line ids; every language's source marks the same ids with "@@N" at the line end.
// A field that differs between languages (a note, a printed line, a type) is an object { python, cpp,
// javascript, java } or { '*': default, <lang>: override }.
export const LANGS = ['python', 'cpp', 'javascript', 'java'];
export const L = (python, cpp, javascript, java) => ({ python, cpp, javascript, java });

const key = (n) => (typeof n === 'string' ? n : `@${JSON.stringify(n)}`);
const clone = (v) => (v === undefined ? null : JSON.parse(JSON.stringify(v)));

export function tracer(args) {
  const frames = [{ fn: L('global', 'main()', 'global', 'main()'), vars: {} }], heap = {}, out = [], steps = [];
  let cond = null, focus = null, changed = new Set(), fresh = 0;
  const top = () => frames[frames.length - 1];
  const t = {
    args,
    // a variable in the current frame; type overrides the type inferred from the value
    // name may differ by language (self / this): a map becomes the key "@{json}"
    set(name, v, type) { const k = key(name); top().vars[k] = { v: clone(v), ...(type ? { type } : {}) }; changed.add(k); return v; },
    // a value that differs by language ({ '*': 6, python: 5 }); null = the variable does not exist there
    setL(name, map, type) { const k = key(name); top().vars[k] = { v: clone(map), perLang: true, ...(type ? { type } : {}) }; changed.add(k); },
    // an object or list on the heap, reached through references { ref: id }
    obj(id, cls, value) { heap[id] = { cls, value: clone(value) }; changed.add(`#${id}`); return { ref: id }; },
    field(id, key, v) { if (Array.isArray(heap[id].value)) heap[id].value[key] = clone(v); else heap[id].value[key] = clone(v); changed.add(`#${id}.${key}`); },
    push(id, v) { heap[id].value.push(clone(v)); changed.add(`#${id}`); },
    cond(text, value) { cond = { text, value: !!value }; return !!value; },
    focus(name, index) { focus = { name, index }; },
    print(text) { out.push(text); fresh = out.length; },
    call(fn) { frames.push({ fn, vars: {} }); },
    ret() { frames.pop(); },
    step(line, note) {
      steps.push({ line, function: null, frames: clone(frames), heap: clone(heap), out: clone(out), fresh, cond, focus, changed: [...changed], note });
      cond = null; focus = null; changed = new Set(); fresh = 0;
    },
    steps,
  };
  return t;
}

// "@@N" markers → { lines, map: { N: row } }
export function parseSource(text) {
  const lines = [], map = {};
  text.replace(/^\n/, '').replace(/\s+$/, '').split('\n').forEach((raw, row) => {
    const m = raw.match(/\s*@@(\d+)\s*$/);
    if (m) { map[m[1]] = row; lines.push(raw.slice(0, m.index)); } else lines.push(raw);
  });
  return { lines, map };
}
