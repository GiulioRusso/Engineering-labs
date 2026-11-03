// Flowcharts (block diagrams) of the coding programs, language-neutral. Each block carries the logical
// line id of the statement it stands for, so the block of the line being executed lights up.
// Blocks: S start, E end/return, P process, IO input/output, C call, J jump (break/continue/return),
// IF decision (yes goes down, no goes right), LOOP decision with the body below and a back edge.
const S = (t = 'start', line = null) => ({ k: 'start', t, line });
const E = (t = 'end', line = null) => ({ k: 'end', t, line });
const P = (line, t) => ({ k: 'proc', t, line });
const IO = (line, t) => ({ k: 'io', t, line });
const C = (line, t) => ({ k: 'call', t, line });
const J = (line, t) => ({ k: 'jump', t, line });
const IF = (line, t, yes, no = []) => ({ k: 'if', t, line, yes, no });
const LOOP = (line, t, body) => ({ k: 'loop', t, line, body });
const main = (items) => ({ title: 'main program', items });

export const FLOWS = {
  sequence: [main([S(), P(1, 'a ← 5'), P(2, 'b ← 8'), IO(3, 'print a, b'), P(4, 'temp ← a'), P(5, 'a ← b'), P(6, 'b ← temp'), IO(7, 'print a, b'), E()])],
  types: [main([S(), P(1, 'n ← 7'), P(2, 'x ← 2.5'), P(3, 'name ← "Ada"'), P(4, 'ok ← (n > 5)'), IO(5, 'print n / 2'), IO(6, 'print n mod 2'), IO(7, 'print n × x'), IO(8, 'print name + "!"'), IO(9, 'print text(n) + name'), IO(10, 'print ok'), E()])],
  selection: [main([S(), P(1, 'score ← input'), IF(2, 'score ≥ 60 ?', [IO(3, 'print "pass"')], [IO(4, 'print "fail"')]), IO(5, 'print "done"'), E()])],
  multiway: [main([S(), P(1, 'score ← input'),
    { k: 'chain', cases: [{ line: 2, t: 'score ≥ 90 ?', body: [P(3, 'grade ← "A"')] }, { line: 4, t: 'score ≥ 75 ?', body: [P(5, 'grade ← "B"')] }, { line: 6, t: 'score ≥ 60 ?', body: [P(7, 'grade ← "C"')] }], else: [P(8, 'grade ← "F"')] },
    IO(9, 'print grade'), E()])],
  for_loop: [main([S(), P(1, 'n ← input'), P(2, 'total ← 0'), P(null, 'i ← 1'), LOOP(3, 'i ≤ n ?', [P(4, 'total ← total + i'), P(null, 'i ← i + 1')]), IO(5, 'print total'), E()])],
  while_loop: [main([S(), P(1, 'n ← input'), P(2, 'digits ← 0'), LOOP(3, 'n > 0 ?', [P(4, 'n ← n div 10'), P(5, 'digits ← digits + 1')]), IO(6, 'print digits'), E()])],
  nested_loops: [main([S(), P(null, 'row ← 1'), LOOP(1, 'row ≤ 3 ?', [P(2, 'line ← ""'), P(null, 'col ← 1'), LOOP(3, 'col ≤ 3 ?', [P(4, 'line ← line + row × col'), P(null, 'col ← col + 1')]), IO(5, 'print line'), P(null, 'row ← row + 1')]), E()])],
  break_continue: [main([S(), P(1, 'nums ← [4, −2, 9, 14, 3, 21]'),
    LOOP(2, 'another x in nums ?', [IF(3, 'x < 0 ?', [J(4, 'continue: next x')]), IF(5, 'x mod 7 = 0 ?', [IO(6, 'print "found", x'), J(7, 'break: leave the loop')]), IO(8, 'print "checked", x')]),
    IO(9, 'print "end"'), E()])],
  arrays: [main([S(), P(1, 'temps ← [12, 17, 9, 21, 15]'), P(2, 'best ← temps[0]'), P(null, 'i ← 1'), LOOP(3, 'i < length ?', [IF(4, 'temps[i] > best ?', [P(5, 'best ← temps[i]')]), P(null, 'i ← i + 1')]), IO(6, 'print best'), E()])],
  strings: [main([S(), P(1, 'word ← input'), P(2, 'count ← 0'), LOOP(3, 'another ch in word ?', [IF(4, 'ch is a vowel ?', [P(5, 'count ← count + 1')])]), IO(6, 'print count'), E()])],
  maps: [main([S(), P(1, 'words ← [red, blue, …]'), P(2, 'counts ← empty map'), LOOP(3, 'another w in words ?', [P(4, 'counts[w] ← (counts[w] or 0) + 1')]), IO(5, 'print counts'), E()])],
  functions: [main([S(), C(4, 'r1 ← area(3, 4)'), C(5, 'r2 ← area(5, 2)'), IO(6, 'print r1 + r2'), E()]),
    { title: 'function area', items: [S('area(w, h)', 1), P(2, 'a ← w × h'), E('return a', 3)] }],
  scope: [main([S(), P(4, 'count ← 1'), P(5, 'data ← [10]'), C(6, 'bump(count, data)'), IO(7, 'print count, data'), E()]),
    { title: 'function bump', items: [S('bump(n, items)', 1), P(2, 'n ← n + 1'), P(3, 'append n to items'), E('return')] }],
  recursion: [main([S(), C(5, 'print fact(4)'), E()]),
    { title: 'function fact (calls itself)', items: [S('fact(n)', 1), IF(2, 'n ≤ 1 ?', [E('return 1', 3)], [E('return n × fact(n − 1)', 4)])] }],
  classes: [main([S(), C(10, 'acc ← new Account("Ada")'), C(11, 'acc.deposit(50)'), C(12, 'acc.withdraw(80)'), C(13, 'acc.withdraw(30)'), IO(14, 'print owner, balance'), E()]),
    { title: 'constructor', items: [S('Account(owner)', 1), P(2, 'owner ← owner'), P(3, 'balance ← 0'), E()] },
    { title: 'method deposit', items: [S('deposit(amount)', 4), P(5, 'balance ← balance + amount'), E()] },
    { title: 'method withdraw', items: [S('withdraw(amount)', 6), IF(7, 'amount > balance ?', [IO(8, 'print "refused"'), E('return', 15)], [P(9, 'balance ← balance − amount'), E()])] }],
};
