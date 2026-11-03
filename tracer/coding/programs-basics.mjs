// Coding programs, part 1: sequence, types, selection, iteration. Each program's run() mirrors the
// four sources line for line; `expect` is what each language prints (checked by the tests).
import { L } from './tracer.mjs';

const STR = L('str', 'std::string', 'string', 'String');

export default [
  {
    id: 'sequence', name: 'Sequence and variables', chapter: '1 · Basics',
    what: 'Statements run one after another; a variable is a named box holding one value (swap two with a third).',
    inputs: [{ label: 'swap a and b', args: {} }],
    expect: () => ({ '*': ['5 8', '8 5'] }),
    src: {
      python: `
# Swap two values: statements run top to bottom.
a = 5                     @@1
b = 8                     @@2
print(a, b)               @@3
temp = a                  @@4
a = b                     @@5
b = temp                  @@6
print(a, b)               @@7`,
      cpp: `
// Swap two values: statements run top to bottom.
#include <iostream>

int main() {
    int a = 5;                                  @@1
    int b = 8;                                  @@2
    std::cout << a << " " << b << "\\n";         @@3
    int temp = a;                               @@4
    a = b;                                      @@5
    b = temp;                                   @@6
    std::cout << a << " " << b << "\\n";         @@7
    return 0;
}`,
      javascript: `
// Swap two values: statements run top to bottom.
let a = 5;                @@1
let b = 8;                @@2
console.log(a, b);        @@3
let temp = a;             @@4
a = b;                    @@5
b = temp;                 @@6
console.log(a, b);        @@7`,
      java: `
// Swap two values: statements run top to bottom.
public class Main {
    public static void main(String[] args) {
        int a = 5;                              @@1
        int b = 8;                              @@2
        System.out.println(a + " " + b);        @@3
        int temp = a;                           @@4
        a = b;                                  @@5
        b = temp;                               @@6
        System.out.println(a + " " + b);        @@7
    }
}`,
    },
    run(t) {
      t.set('a', 5); t.step(1, { '*': 'Create a variable a and store 5 in it. “=” means “store”, not “equals”.', python: 'Create a variable a and store 5 in it. “=” means “store”, not “equals”. Python creates the variable the first time it is assigned.' });
      t.set('b', 8); t.step(2, 'A second variable, b, holds 8.');
      t.print('5 8'); t.step(3, 'Print both values. Nothing changes in memory.');
      t.set('temp', 5); t.step(4, 'Copy a into temp. Now 5 is stored twice: the copy keeps it safe.');
      t.set('a', 8); t.step(5, 'Overwrite a with b. The old 5 in a is gone, but temp still has it.');
      t.set('b', 5); t.step(6, 'Put the saved value into b. The swap is complete.');
      t.print('8 5'); t.step(7, 'The order of statements matters: written as a = b; b = a, both would end up 8.');
    },
  },
  {
    id: 'types', name: 'Types and expressions', chapter: '1 · Basics',
    what: 'Integers, decimals, text and true/false: the type decides what an operator does (7 / 2 is 3 or 3.5).',
    inputs: [{ label: 'n = 7', args: {} }],
    expect: () => ({ python: ['3.5', '1', '17.5', 'Ada!', '7Ada', 'True'], cpp: ['3', '1', '17.5', 'Ada!', '7Ada', '1'], javascript: ['3.5', '1', '17.5', 'Ada!', '7Ada', 'true'], java: ['3', '1', '17.5', 'Ada!', '7Ada', 'true'] }),
    src: {
      python: `
# Every value has a type; the type decides what operators do.
n = 7                     @@1
x = 2.5                   @@2
name = "Ada"              @@3
ok = n > 5                @@4
print(n / 2)              @@5
print(n % 2)              @@6
print(n * x)              @@7
print(name + "!")         @@8
print(str(n) + name)      @@9
print(ok)                 @@10`,
      cpp: `
// Every value has a type; the type decides what operators do.
#include <iostream>
#include <string>

int main() {
    int n = 7;                                      @@1
    double x = 2.5;                                 @@2
    std::string name = "Ada";                       @@3
    bool ok = n > 5;                                @@4
    std::cout << n / 2 << "\\n";                     @@5
    std::cout << n % 2 << "\\n";                     @@6
    std::cout << n * x << "\\n";                     @@7
    std::cout << name + "!" << "\\n";                @@8
    std::cout << std::to_string(n) + name << "\\n";  @@9
    std::cout << ok << "\\n";                        @@10
    return 0;
}`,
      javascript: `
// Every value has a type; the type decides what operators do.
const n = 7;                  @@1
const x = 2.5;                @@2
const name = "Ada";           @@3
const ok = n > 5;             @@4
console.log(n / 2);           @@5
console.log(n % 2);           @@6
console.log(n * x);           @@7
console.log(name + "!");      @@8
console.log(n + name);        @@9
console.log(ok);              @@10`,
      java: `
// Every value has a type; the type decides what operators do.
public class Main {
    public static void main(String[] args) {
        int n = 7;                              @@1
        double x = 2.5;                         @@2
        String name = "Ada";                    @@3
        boolean ok = n > 5;                     @@4
        System.out.println(n / 2);              @@5
        System.out.println(n % 2);              @@6
        System.out.println(n * x);              @@7
        System.out.println(name + "!");         @@8
        System.out.println(n + name);           @@9
        System.out.println(ok);                 @@10
    }
}`,
    },
    run(t) {
      t.set('n', 7); t.step(1, { '*': 'A whole number: an integer.', javascript: 'A number. JavaScript has one number type for whole numbers and decimals alike.' });
      t.set('x', 2.5); t.step(2, { '*': 'A decimal number (floating point).', cpp: 'A decimal number: double, 64-bit floating point.', java: 'A decimal number: double, 64-bit floating point.' });
      t.set('name', 'Ada', STR); t.step(3, 'Text is a string: a sequence of characters, written in quotes.');
      t.cond('n > 5', true); t.set('ok', true); t.step(4, 'A comparison gives a boolean, true or false. Here 7 > 5 is true.');
      t.print(L('3.5', '3', '3.5', '3')); t.step(5, { python: 'In Python, / always gives a decimal: 3.5. Use // for whole-number division (3).', cpp: 'Both sides are int, so C++ does integer division and drops the fraction: 7 / 2 is 3. Write 7 / 2.0 to get 3.5.', javascript: 'JavaScript has no separate integer type: 7 / 2 is 3.5.', java: 'Both sides are int, so Java does integer division and drops the fraction: 7 / 2 is 3. Write 7 / 2.0 to get 3.5.' });
      t.print('1'); t.step(6, '% is the remainder after division: 7 = 3 × 2 + 1. n % 2 is 0 for even numbers, 1 for odd.');
      t.print('17.5'); t.step(7, 'An integer times a decimal is a decimal: the integer is converted first.');
      t.print('Ada!'); t.step(8, 'On strings, + joins them (concatenation).');
      t.print('7Ada'); t.step(9, { python: 'Python refuses to add a number to a string (TypeError); str(n) converts it first.', cpp: 'C++ cannot add an int to a string; std::to_string(n) converts it first.', javascript: 'JavaScript converts the number to text automatically when one side is a string: 7 + "Ada" is "7Ada".', java: 'Java converts the number to text automatically when one side is a String.' });
      t.print(L('True', '1', 'true', 'true')); t.step(10, { python: 'Booleans print as True or False.', cpp: 'std::cout prints a bool as 1 or 0 (std::boolalpha makes it print true).', javascript: 'Booleans print as true or false.', java: 'Booleans print as true or false.' });
    },
  },
  {
    id: 'selection', name: 'Selection: if / else', chapter: '2 · Control flow',
    what: 'A condition chooses which block runs: one path for true, another for false.',
    inputs: [{ label: 'score = 74', args: { score: 74 } }, { label: 'score = 42', args: { score: 42 } }],
    expect: ({ score }) => ({ '*': [score >= 60 ? 'pass' : 'fail', 'done'] }),
    src: {
      python: `
# Selection: the condition decides which block runs.
score = {{score}}            @@1
if score >= 60:              @@2
    print("pass")            @@3
else:
    print("fail")            @@4
print("done")                @@5`,
      cpp: `
// Selection: the condition decides which block runs.
#include <iostream>

int main() {
    int score = {{score}};                 @@1
    if (score >= 60) {                     @@2
        std::cout << "pass\\n";             @@3
    } else {
        std::cout << "fail\\n";             @@4
    }
    std::cout << "done\\n";                 @@5
    return 0;
}`,
      javascript: `
// Selection: the condition decides which block runs.
const score = {{score}};          @@1
if (score >= 60) {                @@2
  console.log("pass");            @@3
} else {
  console.log("fail");            @@4
}
console.log("done");              @@5`,
      java: `
// Selection: the condition decides which block runs.
public class Main {
    public static void main(String[] args) {
        int score = {{score}};                  @@1
        if (score >= 60) {                      @@2
            System.out.println("pass");         @@3
        } else {
            System.out.println("fail");         @@4
        }
        System.out.println("done");             @@5
    }
}`,
    },
    run(t) {
      const s = t.args.score;
      t.set('score', s); t.step(1, `Store the score, ${s}.`);
      const ok = t.cond(`score >= 60  →  ${s} >= 60`, s >= 60); t.step(2, `Evaluate the condition: ${s} >= 60 is ${ok}. Only one of the two blocks will run.`);
      if (ok) { t.print('pass'); t.step(3, 'The condition was true: run the first block. The else block is skipped entirely.'); }
      else { t.print('fail'); t.step(4, 'The condition was false: skip the first block and run the else block.'); }
      t.print('done'); t.step(5, { '*': 'After the if / else, both paths join again: this line runs either way.', python: 'After the if / else, both paths join again: this line runs either way. In Python the indentation marks where the blocks end.' });
    },
  },
  {
    id: 'multiway', name: 'Multi-way selection: else if', chapter: '2 · Control flow',
    what: 'A chain of conditions tested in order; the first true one wins, else catches the rest.',
    inputs: [{ label: 'score = 95', args: { score: 95 } }, { label: 'score = 80', args: { score: 80 } }, { label: 'score = 40', args: { score: 40 } }],
    expect: ({ score }) => ({ '*': [`grade ${score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : 'F'}`] }),
    src: {
      python: `
# Multi-way selection: conditions are tested in order.
score = {{score}}            @@1
if score >= 90:              @@2
    grade = "A"              @@3
elif score >= 75:            @@4
    grade = "B"              @@5
elif score >= 60:            @@6
    grade = "C"              @@7
else:
    grade = "F"              @@8
print("grade", grade)        @@9`,
      cpp: `
// Multi-way selection: conditions are tested in order.
#include <iostream>
#include <string>

int main() {
    int score = {{score}};                         @@1
    std::string grade;
    if (score >= 90) {                             @@2
        grade = "A";                               @@3
    } else if (score >= 75) {                      @@4
        grade = "B";                               @@5
    } else if (score >= 60) {                      @@6
        grade = "C";                               @@7
    } else {
        grade = "F";                               @@8
    }
    std::cout << "grade " << grade << "\\n";        @@9
    return 0;
}`,
      javascript: `
// Multi-way selection: conditions are tested in order.
const score = {{score}};              @@1
let grade;
if (score >= 90) {                    @@2
  grade = "A";                        @@3
} else if (score >= 75) {             @@4
  grade = "B";                        @@5
} else if (score >= 60) {             @@6
  grade = "C";                        @@7
} else {
  grade = "F";                        @@8
}
console.log("grade", grade);          @@9`,
      java: `
// Multi-way selection: conditions are tested in order.
public class Main {
    public static void main(String[] args) {
        int score = {{score}};                      @@1
        String grade;
        if (score >= 90) {                          @@2
            grade = "A";                            @@3
        } else if (score >= 75) {                   @@4
            grade = "B";                            @@5
        } else if (score >= 60) {                   @@6
            grade = "C";                            @@7
        } else {
            grade = "F";                            @@8
        }
        System.out.println("grade " + grade);       @@9
    }
}`,
    },
    run(t) {
      const s = t.args.score; let g;
      t.set('score', s); t.step(1, `Store the score, ${s}.`);
      const tests = [[2, 90, 'A', 3], [4, 75, 'B', 5], [6, 60, 'C', 7]];
      for (const [line, lim, gr, body] of tests) {
        const ok = t.cond(`score >= ${lim}  →  ${s} >= ${lim}`, s >= lim);
        t.step(line, ok ? `${s} >= ${lim} is true: this branch is taken.` : `${s} >= ${lim} is false: try the next condition.`);
        if (ok) { g = gr; t.set('grade', gr, STR); t.step(body, `grade becomes "${gr}". The remaining conditions are not even tested: the first true one wins.`); break; }
      }
      if (!g) { g = 'F'; t.set('grade', 'F', STR); t.step(8, 'No condition was true, so the else block runs.'); }
      t.print(`grade ${g}`); t.step(9, 'Order matters: testing score >= 60 first would give every passing score a C.');
    },
  },
  {
    id: 'for_loop', name: 'Iteration: the counting loop', chapter: '2 · Control flow',
    what: 'A for loop repeats a block a known number of times; here it adds up 1 + 2 + … + n.',
    inputs: [{ label: 'n = 5', args: { n: 5 } }, { label: 'n = 0', args: { n: 0 } }],
    expect: ({ n }) => ({ '*': [String(n * (n + 1) / 2)] }),
    src: {
      python: `
# Add up 1 + 2 + ... + n with a counting loop.
n = {{n}}                      @@1
total = 0                      @@2
for i in range(1, n + 1):      @@3
    total = total + i          @@4
print(total)                   @@5`,
      cpp: `
// Add up 1 + 2 + ... + n with a counting loop.
#include <iostream>

int main() {
    int n = {{n}};                         @@1
    int total = 0;                         @@2
    for (int i = 1; i <= n; i++) {         @@3
        total = total + i;                 @@4
    }
    std::cout << total << "\\n";            @@5
    return 0;
}`,
      javascript: `
// Add up 1 + 2 + ... + n with a counting loop.
const n = {{n}};                   @@1
let total = 0;                     @@2
for (let i = 1; i <= n; i++) {     @@3
  total = total + i;               @@4
}
console.log(total);                @@5`,
      java: `
// Add up 1 + 2 + ... + n with a counting loop.
public class Main {
    public static void main(String[] args) {
        int n = {{n}};                          @@1
        int total = 0;                          @@2
        for (int i = 1; i <= n; i++) {          @@3
            total = total + i;                  @@4
        }
        System.out.println(total);              @@5
    }
}`,
    },
    run(t) {
      const n = t.args.n; let total = 0;
      t.set('n', n); t.step(1, `How far to count: ${n}.`);
      t.set('total', 0); t.step(2, 'The running total starts at 0, before the loop: inside it, it would be reset every time.');
      for (let i = 1; ; i++) {
        t.setL('i', { '*': i, python: i <= n ? i : (n ? n : null) });
        const go = t.cond(i <= n ? `i <= n  →  ${i} <= ${n}` : { '*': `i <= n  →  ${i} <= ${n}`, python: 'range(1, n + 1) has no values left' }, i <= n);
        t.step(3, go ? (i === 1 ? { '*': 'Start the loop: i = 1, and check i <= n. True, so the body runs.', python: 'Start the loop: i takes the first value of range(1, n + 1), which is 1. range stops before its end, so the last value is n.' } : { '*': `i++ moves on to ${i}; ${i} <= ${n}, so the body runs again.`, python: `i takes the next value from the range: ${i}.` })
          : (n === 0 ? { '*': `i = 1 and 1 <= 0 is false: the body never runs at all.`, python: 'range(1, 1) is empty: the body never runs at all.' } : { '*': `i++ makes i ${i}; ${i} <= ${n} is false, so the loop ends.`, python: 'The range has no values left, so the loop ends.' }));
        if (!go) break;
        total += i; t.set('total', total); t.step(4, `total = ${total - i} + ${i} = ${total}.`);
      }
      t.print(String(total)); t.step(5, n ? `The loop ran ${n} times. 1 + … + ${n} = ${total}, which is also n(n + 1)/2.` : 'With n = 0 the total stays 0. Always think about the loop that runs zero times.');
    },
  },
  {
    id: 'while_loop', name: 'Iteration: the while loop', chapter: '2 · Control flow',
    what: 'A while loop repeats as long as a condition holds, when the number of rounds is not known in advance.',
    inputs: [{ label: 'n = 4096', args: { n: 4096 } }, { label: 'n = 0', args: { n: 0 } }],
    expect: ({ n }) => ({ '*': [String(n ? String(n).length : 0)] }),
    src: {
      python: `
# Count the digits of n by dividing by 10 until nothing is left.
n = {{n}}                @@1
digits = 0               @@2
while n > 0:             @@3
    n = n // 10          @@4
    digits += 1          @@5
print(digits)            @@6`,
      cpp: `
// Count the digits of n by dividing by 10 until nothing is left.
#include <iostream>

int main() {
    int n = {{n}};                     @@1
    int digits = 0;                    @@2
    while (n > 0) {                    @@3
        n = n / 10;                    @@4
        digits++;                      @@5
    }
    std::cout << digits << "\\n";       @@6
    return 0;
}`,
      javascript: `
// Count the digits of n by dividing by 10 until nothing is left.
let n = {{n}};                     @@1
let digits = 0;                    @@2
while (n > 0) {                    @@3
  n = Math.floor(n / 10);          @@4
  digits++;                        @@5
}
console.log(digits);               @@6`,
      java: `
// Count the digits of n by dividing by 10 until nothing is left.
public class Main {
    public static void main(String[] args) {
        int n = {{n}};                          @@1
        int digits = 0;                         @@2
        while (n > 0) {                         @@3
            n = n / 10;                         @@4
            digits++;                           @@5
        }
        System.out.println(digits);             @@6
    }
}`,
    },
    run(t) {
      let n = t.args.n, d = 0;
      t.set('n', n); t.step(1, `The number to measure: ${n}.`);
      t.set('digits', 0); t.step(2, 'No digits counted yet.');
      for (;;) {
        const go = t.cond(`n > 0  →  ${n} > 0`, n > 0);
        t.step(3, go ? `${n} > 0: the body runs. A while loop checks its condition before every round.` : (t.args.n ? '0 > 0 is false: the loop stops. Something inside the body had to change n, or it would never end.' : '0 > 0 is false the very first time: the body never runs.'));
        if (!go) break;
        const m = Math.floor(n / 10);
        t.set('n', m); t.step(4, { '*': `Drop the last digit: ${n} / 10 = ${m} in integer division.`, python: `Drop the last digit: ${n} // 10 = ${m}.`, javascript: `Drop the last digit: Math.floor(${n} / 10) = ${m}; plain / would give ${n / 10}.` }); n = m;
        d++; t.set('digits', d); t.step(5, { '*': `One more digit: ${d}. digits++ adds 1.`, python: `One more digit: ${d}. digits += 1 is short for digits = digits + 1.` });
      }
      t.print(String(d)); t.step(6, t.args.n ? `${t.args.n} has ${d} digits.` : 'It prints 0, but the number 0 has one digit: a bug at the edge. A do-while loop (or a special case) would fix it.');
    },
  },
  {
    id: 'nested_loops', name: 'Nested loops', chapter: '2 · Control flow',
    what: 'A loop inside a loop: for every row, the inner loop runs all its columns (a times table).',
    inputs: [{ label: '3 × 3 table', args: {} }],
    expect: () => ({ '*': ['1 2 3 ', '2 4 6 ', '3 6 9 '] }),
    src: {
      python: `
# A loop inside a loop: one row of the table per outer round.
for row in range(1, 4):                 @@1
    line = ""                           @@2
    for col in range(1, 4):             @@3
        line += str(row * col) + " "    @@4
    print(line)                         @@5`,
      cpp: `
// A loop inside a loop: one row of the table per outer round.
#include <iostream>
#include <string>

int main() {
    for (int row = 1; row <= 3; row++) {                @@1
        std::string line = "";                          @@2
        for (int col = 1; col <= 3; col++) {            @@3
            line += std::to_string(row * col) + " ";    @@4
        }
        std::cout << line << "\\n";                      @@5
    }
    return 0;
}`,
      javascript: `
// A loop inside a loop: one row of the table per outer round.
for (let row = 1; row <= 3; row++) {        @@1
  let line = "";                            @@2
  for (let col = 1; col <= 3; col++) {      @@3
    line += (row * col) + " ";              @@4
  }
  console.log(line);                        @@5
}`,
      java: `
// A loop inside a loop: one row of the table per outer round.
public class Main {
    public static void main(String[] args) {
        for (int row = 1; row <= 3; row++) {            @@1
            String line = "";                           @@2
            for (int col = 1; col <= 3; col++) {        @@3
                line += (row * col) + " ";              @@4
            }
            System.out.println(line);                   @@5
        }
    }
}`,
    },
    run(t) {
      let steps = 0;
      for (let row = 1; row <= 4; row++) {
        t.setL('row', { '*': row, python: Math.min(row, 3) }); const go = t.cond(row <= 3 ? `row <= 3  →  ${row} <= 3` : { '*': `row <= 3  →  ${row} <= 3`, python: 'range(1, 4) has no values left' }, row <= 3);
        t.step(1, go ? `Outer loop, row ${row}.` : 'The outer loop is done: 3 rows × 3 columns = 9 runs of the inner body.');
        if (!go) break;
        let line = ''; t.set('line', '', STR); t.step(2, 'A fresh, empty line for this row.');
        for (let col = 1; col <= 4; col++) {
          t.setL('col', { '*': col, python: Math.min(col, 3) }); const g2 = t.cond(col <= 3 ? `col <= 3  →  ${col} <= 3` : { '*': `col <= 3  →  ${col} <= 3`, python: 'range(1, 4) has no values left' }, col <= 3);
          t.step(3, g2 ? (col === 1 ? 'The inner loop starts again from col = 1 for every row.' : `Inner loop, col ${col}.`) : 'Inner loop finished: back to the outer loop.');
          if (!g2) break;
          line += `${row * col} `; steps++; t.set('line', line, STR); t.step(4, `${row} × ${col} = ${row * col}, added to the line (inner body run ${steps}).`);
        }
        t.print(line); t.step(5, `Print row ${row}.`);
      }
    },
  },
  {
    id: 'break_continue', name: 'Loop control: break and continue', chapter: '2 · Control flow',
    what: 'continue skips to the next round; break leaves the loop at once (find the first multiple of 7).',
    inputs: [{ label: 'find the first multiple of 7', args: {} }],
    expect: () => ({ '*': ['checked 4', 'checked 9', 'found 14', 'end'] }),
    src: {
      python: `
# Skip negatives, stop at the first multiple of 7.
nums = [4, -2, 9, 14, 3, 21]       @@1
for x in nums:                     @@2
    if x < 0:                      @@3
        continue                   @@4
    if x % 7 == 0:                 @@5
        print("found", x)          @@6
        break                      @@7
    print("checked", x)            @@8
print("end")                       @@9`,
      cpp: `
// Skip negatives, stop at the first multiple of 7.
#include <iostream>
#include <vector>

int main() {
    std::vector<int> nums = {4, -2, 9, 14, 3, 21};     @@1
    for (int x : nums) {                               @@2
        if (x < 0) {                                   @@3
            continue;                                  @@4
        }
        if (x % 7 == 0) {                              @@5
            std::cout << "found " << x << "\\n";        @@6
            break;                                     @@7
        }
        std::cout << "checked " << x << "\\n";          @@8
    }
    std::cout << "end\\n";                              @@9
    return 0;
}`,
      javascript: `
// Skip negatives, stop at the first multiple of 7.
const nums = [4, -2, 9, 14, 3, 21];    @@1
for (const x of nums) {                @@2
  if (x < 0) {                         @@3
    continue;                          @@4
  }
  if (x % 7 === 0) {                   @@5
    console.log("found", x);           @@6
    break;                             @@7
  }
  console.log("checked", x);           @@8
}
console.log("end");                    @@9`,
      java: `
// Skip negatives, stop at the first multiple of 7.
public class Main {
    public static void main(String[] args) {
        int[] nums = {4, -2, 9, 14, 3, 21};             @@1
        for (int x : nums) {                            @@2
            if (x < 0) {                                @@3
                continue;                               @@4
            }
            if (x % 7 == 0) {                           @@5
                System.out.println("found " + x);       @@6
                break;                                  @@7
            }
            System.out.println("checked " + x);         @@8
        }
        System.out.println("end");                      @@9
    }
}`,
    },
    run(t) {
      const nums = [4, -2, 9, 14, 3, 21], LIST = L('list', 'std::vector<int>', 'Array', 'int[]');
      t.set('nums', nums, LIST); t.step(1, 'A list of six numbers.');
      for (let k = 0; k < nums.length; k++) {
        const x = nums[k]; t.set('x', x); t.focus('nums', k);
        t.step(2, { '*': `Take the next element: x = ${x}. This loop visits every element in order, no index needed.`, cpp: `Take the next element: x = ${x}. The range-based for visits every element in order.` });
        t.focus('nums', k); const neg = t.cond(`x < 0  →  ${x} < 0`, x < 0); t.step(3, neg ? `${x} is negative.` : `${x} is not negative.`);
        if (neg) { t.focus('nums', k); t.step(4, 'continue: skip the rest of the body and go straight to the next element. Nothing is printed for -2.'); continue; }
        t.focus('nums', k); const hit = t.cond(`x % 7 == 0  →  ${x} % 7 = ${x % 7}`, x % 7 === 0); t.step(5, hit ? `${x} divides by 7 exactly.` : `${x} leaves a remainder of ${x % 7}.`);
        if (hit) { t.print(`found ${x}`); t.focus('nums', k); t.step(6, 'Found one.'); t.focus('nums', k); t.step(7, 'break: leave the loop immediately. 3 and 21 are never looked at.'); break; }
        t.print(`checked ${x}`); t.focus('nums', k); t.step(8, `Not it: report and carry on.`);
      }
      t.print('end'); t.step(9, 'Execution continues after the loop.');
    },
  },
];
