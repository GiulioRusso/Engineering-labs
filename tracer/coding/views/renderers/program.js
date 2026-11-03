// Renderer: program
//
// What a running program has in memory, in the language chosen: the condition just evaluated (true or
// false), the call frames (the current one on top) with each variable's name, type and value, the
// objects and lists that references point at, and what the program has printed. Values that differ
// between languages (True / true, a type name) are picked for opts.lang.
(function () {
  window.RENDERERS = window.RENDERERS || {};
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const isMap = (v) => v && typeof v === 'object' && !Array.isArray(v) && !('ref' in v) && !('map' in v);
  const pick = (v, lang) => (isMap(v) && (lang in v || '*' in v) ? (lang in v ? v[lang] : v['*']) : v);
  const TYPES = {
    int: { python: 'int', cpp: 'int', javascript: 'number', java: 'int' },
    float: { python: 'float', cpp: 'double', javascript: 'number', java: 'double' },
    str: { python: 'str', cpp: 'std::string', javascript: 'string', java: 'String' },
    bool: { python: 'bool', cpp: 'bool', javascript: 'boolean', java: 'boolean' },
  };
  const BOOL = { python: ['False', 'True'] };
  const NULL = { python: 'None', cpp: 'nullptr', javascript: 'null', java: 'null' };

  window.RENDERERS.program = function createProgramRenderer() {
    let root, lang = 'python';
    const typeOf = (v, given) => {
      if (given) return pick(given, lang);
      if (typeof v === 'boolean') return TYPES.bool[lang];
      if (typeof v === 'number') return (Number.isInteger(v) ? TYPES.int : TYPES.float)[lang];
      if (typeof v === 'string') return TYPES.str[lang];
      return '';
    };
    const scalar = (v, type) => {
      if (v === null) return `<i class="pnull">${NULL[lang]}</i>`;
      if (typeof v === 'boolean') return `<b class="pbool ${v}">${(BOOL[lang] || ['false', 'true'])[+v]}</b>`;
      if (typeof v === 'string') return type === 'char' ? `'${esc(v)}'` : `"${esc(v)}"`;
      return esc(v);
    };
    const cells = (arr, hi, isText) => `<span class="pcells">${arr.map((x, i) => `<span class="pc${i === hi ? ' hi' : ''}"><span>${isText ? esc(x) : scalar(x)}</span><sub>${i}</sub></span>`).join('')}</span>`;
    function value(v, type, focus) {
      if (Array.isArray(v)) return cells(v, focus);
      if (v && typeof v === 'object' && 'ref' in v) return `<span class="pref">→ #${esc(v.ref.replace(/\D/g, ''))}</span>`;
      if (v && typeof v === 'object' && 'map' in v) return `<span class="pmap">${v.map.map(([k, x]) => `<span class="${k === focus ? 'hi' : ''}">${scalar(k)} <i>→</i> ${scalar(x)}</span>`).join('') || '<i class="pnull">empty</i>'}</span>`;
      if (typeof v === 'string' && focus !== undefined && focus !== null) return cells([...v], focus, true);
      return scalar(v, type);
    }

    function mount(container, trace, opts) { container.innerHTML = '<div class="prog"><div class="pcond"></div><div class="pmem"></div><div class="pout"><h4>Output</h4><pre></pre></div></div>'; root = container.firstChild; lang = (opts && opts.lang) || lang; }

    function render(step, prev, opts) {
      lang = (opts && opts.lang) || lang;
      const ch = new Set(step.changed || []), f = step.focus || {};
      const c = step.cond, ct = c ? pick(c.text, lang) : '';
      root.querySelector('.pcond').innerHTML = c ? `<span class="pc-label">condition</span><code>${esc(ct)}</code><b class="pbool ${c.value}">${(BOOL[lang] || ['false', 'true'])[+c.value]}</b>` : '';
      root.querySelector('.pcond').className = `pcond${c ? ` on ${c.value}` : ''}`;
      const frames = step.frames.map((fr, i) => {
        const rows = Object.entries(fr.vars).map(([k, e]) => {
          const name = k[0] === '@' ? pick(JSON.parse(k.slice(1)), lang) : k, v = e.perLang ? pick(e.v, lang) : e.v;
          if (v === null && e.perLang) return '';
          const type = typeOf(v, e.type);
          return `<div class="pv${ch.has(k) && i === step.frames.length - 1 ? ' changed' : ''}"><span class="pn">${esc(name)}</span><span class="pt">${esc(type)}</span><span class="pval">${value(v, type, f.name === name ? f.index : undefined)}</span></div>`;
        }).join('');
        return `<div class="pframe${i === step.frames.length - 1 ? ' top' : ''}"><div class="ph">${esc(pick(fr.fn, lang))}</div>${rows || '<div class="pempty">no variables yet</div>'}</div>`;
      }).reverse().join('');
      const heap = Object.entries(step.heap || {}).map(([id, o]) => {
        const body = Array.isArray(o.value) ? cells(o.value) : Object.entries(o.value).filter(([, x]) => x !== null).map(([k, x]) => `<div class="pv${ch.has(`#${id}.${k}`) ? ' changed' : ''}"><span class="pn">${esc(k)}</span><span class="pt">${esc(typeOf(x))}</span><span class="pval">${scalar(x)}</span></div>`).join('');
        return `<div class="pobj${ch.has(`#${id}`) ? ' changed' : ''}"><div class="ph">#${esc(id.replace(/\D/g, ''))} · ${esc(pick(o.cls, lang))}</div>${body || '<div class="pempty">no fields yet</div>'}</div>`;
      }).join('');
      root.querySelector('.pmem').innerHTML = `<div class="pstack"><h4>Call stack · variables</h4>${frames}</div>${heap ? `<div class="pheap"><h4>Objects</h4>${heap}</div>` : ''}`;
      const lines = (step.out || []).map((x) => pick(x, lang)).filter((x) => x !== null && x !== undefined), before = prev ? (prev.out || []).map((x) => pick(x, lang)).filter((x) => x !== null && x !== undefined).length : 0;
      root.querySelector('.pout pre').innerHTML = lines.length ? lines.map((l, i) => `<div class="${i >= before ? 'new' : ''}">${esc(l) || ' '}</div>`).join('') : '<i class="pnull">nothing printed yet</i>';
    }
    return { mount, render };
  };
})();
