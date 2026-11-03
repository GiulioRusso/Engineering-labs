// The coding subject: every program's JavaScript twin must only visit lines that exist in all four
// sources, and print exactly what each language prints.
import { PROGRAMS, traceOf } from '../../../tracer/coding/build.mjs';
import { LANGS } from '../../../tracer/coding/tracer.mjs';
import { ok } from '../testing.js';

const pick = (v, l) => (v && typeof v === 'object' && (l in v || '*' in v) ? (l in v ? v[l] : v['*']) : v);

export const tests = {
  'every traced line is marked in every language'() {
    for (const P of PROGRAMS) { const T = traceOf(P); for (const inp of T.inputs) for (const s of inp.steps) for (const l of LANGS) ok(String(s.line) in T.sources[l].map, `${P.id}/${l}: line ${s.line} not marked`); }
    return `${PROGRAMS.length} programs`;
  },
  'each language prints what the real program prints'() {
    for (const P of PROGRAMS) {
      const T = traceOf(P);
      T.inputs.forEach((inp) => { const want = P.expect(inp.args), last = inp.steps[inp.steps.length - 1].out;
        for (const l of LANGS) { const got = last.map((x) => pick(x, l)).filter((x) => x !== null && x !== undefined).join('|'), w = (want[l] || want['*']).join('|'); ok(got === w, `${P.id} ${inp.label} ${l}: got ${got}, want ${w}`); } });
    }
  },
  'placeholders are filled by every input'() { for (const P of PROGRAMS) for (const l of LANGS) for (const m of P.src[l].matchAll(/\{\{(\w+)\}\}/g)) for (const inp of P.inputs) ok(m[1] in inp.args, `${P.id}: {{${m[1]}}} missing`); },
};
