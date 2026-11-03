// Coding programs, part 2: collections, functions, recursion, objects.
import { L } from './tracer.mjs';

const STR = L('str', 'std::string', 'string', 'String'), CHAR = L('str', 'char', 'string', 'char');
const LIST = L('list', 'std::vector<int>', 'Array', 'int[]');

export default [
  {
    id: 'arrays', name: 'Arrays and lists', chapter: '3 · Data',
    what: 'Many values under one name, reached by index from 0: find the largest temperature.',
    inputs: [{ label: 'five temperatures', args: {} }],
    expect: () => ({ '*': ['max 21'] }),
    src: {
      python: `
# Find the largest value in a list.
temps = [12, 17, 9, 21, 15]          @@1
best = temps[0]                      @@2
for i in range(1, len(temps)):       @@3
    if temps[i] > best:              @@4
        best = temps[i]              @@5
print("max", best)                   @@6`,
      cpp: `
// Find the largest value in a list.
#include <iostream>
#include <vector>

int main() {
    std::vector<int> temps = {12, 17, 9, 21, 15};        @@1
    int best = temps[0];                                 @@2
    for (size_t i = 1; i < temps.size(); i++) {          @@3
        if (temps[i] > best) {                           @@4
            best = temps[i];                             @@5
        }
    }
    std::cout << "max " << best << "\\n";                 @@6
    return 0;
}`,
      javascript: `
// Find the largest value in a list.
const temps = [12, 17, 9, 21, 15];                @@1
let best = temps[0];                              @@2
for (let i = 1; i < temps.length; i++) {          @@3
  if (temps[i] > best) {                          @@4
    best = temps[i];                              @@5
  }
}
console.log("max", best);                         @@6`,
      java: `
// Find the largest value in a list.
public class Main {
    public static void main(String[] args) {
        int[] temps = {12, 17, 9, 21, 15};                  @@1
        int best = temps[0];                                @@2
        for (int i = 1; i < temps.length; i++) {            @@3
            if (temps[i] > best) {                          @@4
                best = temps[i];                            @@5
            }
        }
        System.out.println("max " + best);                  @@6
    }
}`,
    },
    run(t) {
      const a = [12, 17, 9, 21, 15], n = a.length; let best = a[0];
      t.set('temps', a, LIST); t.step(1, 'Five values in one list. Each sits at an index: 0, 1, 2, 3, 4. The first index is 0, not 1.');
      t.set('best', best); t.focus('temps', 0); t.step(2, 'Start by assuming the first element, temps[0], is the largest.');
      for (let i = 1; ; i++) {
        t.setL('i', i <= n - 1 ? { '*': i } : { '*': i, python: n - 1 });
        const go = t.cond(i < n ? `i < length  →  ${i} < ${n}` : L('range finished', `i < temps.size()  →  ${i} < ${n}`, `i < temps.length  →  ${i} < ${n}`, `i < temps.length  →  ${i} < ${n}`), i < n);
        if (go) t.focus('temps', i);
        t.step(3, go ? `Look at index ${i}.` : `Index ${n} would be past the end (the last index is ${n - 1}): the loop stops. Reading temps[${n}] is the classic off-by-one error.`);
        if (!go) break;
        t.focus('temps', i); const big = t.cond(`temps[i] > best  →  ${a[i]} > ${best}`, a[i] > best); t.step(4, big ? `${a[i]} beats the best so far.` : `${a[i]} is not larger than ${best}.`);
        if (big) { best = a[i]; t.set('best', best); t.focus('temps', i); t.step(5, `New best: ${best}.`); }
      }
      t.print(`max ${best}`); t.step(6, 'Every element was compared once: the work grows in proportion to the length of the list.');
    },
  },
  {
    id: 'strings', name: 'Strings', chapter: '3 · Data',
    what: 'Text as a sequence of characters you can loop over: count the vowels in a word.',
    inputs: [{ label: '"programming"', args: { word: 'programming' } }, { label: '"sky"', args: { word: 'sky' } }],
    expect: ({ word }) => ({ '*': [String([...word].filter((c) => 'aeiou'.includes(c)).length)] }),
    src: {
      python: `
# Count the vowels in a word.
word = "{{word}}"              @@1
count = 0                      @@2
for ch in word:                @@3
    if ch in "aeiou":          @@4
        count += 1             @@5
print(count)                   @@6`,
      cpp: `
// Count the vowels in a word.
#include <iostream>
#include <string>

int main() {
    std::string word = "{{word}}";                               @@1
    int count = 0;                                               @@2
    for (char ch : word) {                                       @@3
        if (std::string("aeiou").find(ch) != std::string::npos) {   @@4
            count++;                                             @@5
        }
    }
    std::cout << count << "\\n";                                  @@6
    return 0;
}`,
      javascript: `
// Count the vowels in a word.
const word = "{{word}}";              @@1
let count = 0;                        @@2
for (const ch of word) {              @@3
  if ("aeiou".includes(ch)) {         @@4
    count++;                          @@5
  }
}
console.log(count);                   @@6`,
      java: `
// Count the vowels in a word.
public class Main {
    public static void main(String[] args) {
        String word = "{{word}}";                       @@1
        int count = 0;                                  @@2
        for (char ch : word.toCharArray()) {            @@3
            if ("aeiou".indexOf(ch) >= 0) {             @@4
                count++;                                @@5
            }
        }
        System.out.println(count);                      @@6
    }
}`,
    },
    run(t) {
      const w = t.args.word; let c = 0;
      t.set('word', w, STR); t.step(1, `A string of ${w.length} characters, indexed 0 to ${w.length - 1} like a list.`);
      t.set('count', 0); t.step(2, 'No vowels counted yet.');
      [...w].forEach((ch, k) => {
        t.set('ch', ch, CHAR); t.focus('word', k); t.step(3, { '*': `Next character: '${ch}' (index ${k}).`, python: `Next character: "${ch}" (index ${k}). Python has no separate character type: it is a string of length 1.` });
        const v = 'aeiou'.includes(ch); t.focus('word', k); t.cond(L(`ch in "aeiou"  →  ${v}`, `"aeiou".find('${ch}') != npos  →  ${v}`, `"aeiou".includes("${ch}")  →  ${v}`, `"aeiou".indexOf('${ch}') >= 0  →  ${v}`), v);
        t.step(4, v ? `'${ch}' is a vowel.` : `'${ch}' is not a vowel.`);
        if (v) { c++; t.set('count', c); t.focus('word', k); t.step(5, `count = ${c}.`); }
      });
      t.print(String(c)); t.step(6, c ? `${c} vowels in "${w}".` : `No vowels: the condition was false for every character, so count never changed.`);
    },
  },
  {
    id: 'maps', name: 'Dictionaries and maps', chapter: '3 · Data',
    what: 'Values looked up by key instead of position: count how often each word appears.',
    inputs: [{ label: 'five words', args: {} }],
    expect: () => ({ python: ["{'red': 3, 'blue': 1, 'green': 1}"], cpp: ['blue 1', 'green 1', 'red 3'], javascript: ['{ red: 3, blue: 1, green: 1 }'], java: ['{red=3, blue=1, green=1}'] }),
    src: {
      python: `
# Count how often each word appears.
words = ["red", "blue", "red", "green", "red"]     @@1
counts = {}                                         @@2
for w in words:                                     @@3
    counts[w] = counts.get(w, 0) + 1                @@4
print(counts)                                       @@5`,
      cpp: `
// Count how often each word appears.
#include <iostream>
#include <map>
#include <string>
#include <vector>

int main() {
    std::vector<std::string> words = {"red", "blue", "red", "green", "red"};   @@1
    std::map<std::string, int> counts;                                         @@2
    for (const std::string& w : words) {                                       @@3
        counts[w] = counts[w] + 1;                                             @@4
    }
    for (const auto& [key, n] : counts) std::cout << key << " " << n << "\\n";  @@5
    return 0;
}`,
      javascript: `
// Count how often each word appears.
const words = ["red", "blue", "red", "green", "red"];   @@1
const counts = {};                                       @@2
for (const w of words) {                                 @@3
  counts[w] = (counts[w] || 0) + 1;                      @@4
}
console.log(counts);                                     @@5`,
      java: `
// Count how often each word appears.
import java.util.*;

public class Main {
    public static void main(String[] args) {
        String[] words = {"red", "blue", "red", "green", "red"};          @@1
        Map<String, Integer> counts = new LinkedHashMap<>();             @@2
        for (String w : words) {                                         @@3
            counts.put(w, counts.getOrDefault(w, 0) + 1);                @@4
        }
        System.out.println(counts);                                      @@5
    }
}`,
    },
    run(t) {
      const words = ['red', 'blue', 'red', 'green', 'red'], m = [];
      t.set('words', words, L('list', 'std::vector<std::string>', 'Array', 'String[]')); t.step(1, 'A list of words.');
      t.set('counts', { map: [] }, L('dict', 'std::map<std::string, int>', 'Object', 'Map<String, Integer>')); t.step(2, { '*': 'An empty map: it will pair each word (the key) with a number (the value).', python: 'An empty dictionary: it will pair each word (the key) with a number (the value).', cpp: 'An empty std::map: it pairs each word (the key) with a number (the value), and keeps the keys sorted.' });
      words.forEach((w, k) => {
        t.set('w', w, STR); t.focus('words', k); t.step(3, `Next word: "${w}".`);
        const e = m.find((p) => p[0] === w), old = e ? e[1] : 0;
        if (e) e[1]++; else m.push([w, 1]);
        t.set('counts', { map: m.map((p) => [...p]) }, L('dict', 'std::map<std::string, int>', 'Object', 'Map<String, Integer>')); t.focus('counts', w);
        t.step(4, e ? `"${w}" is already a key: its count goes from ${old} to ${old + 1}. Finding it takes one lookup, not a search through the list.` : { '*': `"${w}" is a new key: missing means 0, so it starts at 1.`, python: `"${w}" is a new key: counts.get(w, 0) returns 0 for a missing key, so it starts at 1.`, cpp: `"${w}" is a new key: counts[w] creates it with the value 0, so it becomes 1.`, javascript: `"${w}" is a new key: counts[w] is undefined, and (undefined || 0) is 0, so it starts at 1.`, java: `"${w}" is a new key: getOrDefault returns 0, so it starts at 1.` });
      });
      t.print(L("{'red': 3, 'blue': 1, 'green': 1}", 'blue 1', '{ red: 3, blue: 1, green: 1 }', '{red=3, blue=1, green=1}'));
      t.print(L(null, 'green 1', null, null)); t.print(L(null, 'red 3', null, null));
      t.step(5, { '*': 'Print the whole map. Keys come out in the order they were first added.', cpp: 'std::map keeps its keys sorted, so they print alphabetically: blue, green, red.', java: 'LinkedHashMap keeps insertion order; a plain HashMap would print in an unpredictable order.' });
    },
  },
  {
    id: 'functions', name: 'Functions', chapter: '4 · Functions',
    what: 'Name a piece of code once, call it with different arguments, get a value back with return.',
    inputs: [{ label: 'two rectangles', args: {} }],
    expect: () => ({ '*': ['22'] }),
    src: {
      python: `
# Define a function once, call it twice.
def area(w, h):          @@1
    a = w * h            @@2
    return a             @@3

r1 = area(3, 4)          @@4
r2 = area(5, 2)          @@5
print(r1 + r2)           @@6`,
      cpp: `
// Define a function once, call it twice.
#include <iostream>

int area(int w, int h) {         @@1
    int a = w * h;               @@2
    return a;                    @@3
}

int main() {
    int r1 = area(3, 4);         @@4
    int r2 = area(5, 2);         @@5
    std::cout << r1 + r2 << "\\n";  @@6
    return 0;
}`,
      javascript: `
// Define a function once, call it twice.
function area(w, h) {        @@1
  const a = w * h;           @@2
  return a;                  @@3
}

const r1 = area(3, 4);       @@4
const r2 = area(5, 2);       @@5
console.log(r1 + r2);        @@6`,
      java: `
// Define a function once, call it twice.
public class Main {
    static int area(int w, int h) {         @@1
        int a = w * h;                      @@2
        return a;                           @@3
    }

    public static void main(String[] args) {
        int r1 = area(3, 4);                @@4
        int r2 = area(5, 2);                @@5
        System.out.println(r1 + r2);        @@6
    }
}`,
    },
    run(t) {
      const call = (w, h, line, name) => {
        t.step(line, `Call area(${w}, ${h}). The caller pauses here; execution jumps into the function.`);
        t.call(L('area(w, h)', 'area(int w, int h)', 'area(w, h)', 'area(int w, int h)')); t.set('w', w); t.set('h', h);
        t.step(1, `A new frame for this call: the parameters w and h receive the arguments ${w} and ${h}.`);
        t.set('a', w * h); t.step(2, `a = ${w} × ${h} = ${w * h}. a is local: it exists only inside this call.`);
        t.step(3, `return sends ${w * h} back to the caller; the frame, with w, h and a, disappears.`);
        t.ret(); t.set(name, w * h); t.step(line, `Back in the caller: ${name} = ${w * h}.`);
      };
      t.step(1, { '*': 'The function is defined: its body does not run yet. Execution starts in main().', python: 'def only defines the function: its body does not run yet.', javascript: 'The function declaration defines area; its body does not run yet.' });
      call(3, 4, 4, 'r1'); call(5, 2, 5, 'r2');
      t.print('22'); t.step(6, 'Same code, two uses: 12 + 10 = 22. Change the formula once and every call follows.');
    },
  },
  {
    id: 'scope', name: 'Scope and parameter passing', chapter: '4 · Functions',
    what: 'A number is copied into a function; a list is shared by reference, so changes to it are seen outside.',
    inputs: [{ label: 'a number and a list', args: {} }],
    expect: () => ({ python: ['1 [10, 2]'], cpp: ['1 10,2'], javascript: ['1 [ 10, 2 ]'], java: ['1 [10, 2]'] }),
    src: {
      python: `
# A number is copied in; a list is shared.
def bump(n, items):          @@1
    n = n + 1                @@2
    items.append(n)          @@3

count = 1                    @@4
data = [10]                  @@5
bump(count, data)            @@6
print(count, data)           @@7`,
      cpp: `
// A number is copied in; a list is shared (passed by reference, &).
#include <iostream>
#include <vector>

void bump(int n, std::vector<int>& items) {     @@1
    n = n + 1;                                  @@2
    items.push_back(n);                         @@3
}

int main() {
    int count = 1;                              @@4
    std::vector<int> data = {10};               @@5
    bump(count, data);                          @@6
    std::cout << count << " " << data[0] << "," << data[1] << "\\n";   @@7
    return 0;
}`,
      javascript: `
// A number is copied in; a list is shared.
function bump(n, items) {        @@1
  n = n + 1;                     @@2
  items.push(n);                 @@3
}

let count = 1;                   @@4
const data = [10];               @@5
bump(count, data);               @@6
console.log(count, data);        @@7`,
      java: `
// A number is copied in; a list is shared.
import java.util.*;

public class Main {
    static void bump(int n, List<Integer> items) {     @@1
        n = n + 1;                                     @@2
        items.add(n);                                  @@3
    }

    public static void main(String[] args) {
        int count = 1;                                 @@4
        List<Integer> data = new ArrayList<>(List.of(10));   @@5
        bump(count, data);                             @@6
        System.out.println(count + " " + data);        @@7
    }
}`,
    },
    run(t) {
      const LT = L('list', 'std::vector<int>', 'Array', 'List<Integer>');
      t.step(1, 'Define bump. Nothing runs yet.');
      t.set('count', 1); t.step(4, 'count holds the number 1.');
      t.set('data', t.obj('L1', LT, [10]), LT); t.step(5, { '*': 'data refers to a list, which lives in its own place in memory (right): the variable holds an arrow to it.', cpp: 'data is a vector. C++ stores it in the variable itself, but it will be passed by reference (&), which works like an arrow.' });
      t.step(6, 'Call bump(count, data).');
      t.call(L('bump(n, items)', 'bump(int n, std::vector<int>& items)', 'bump(n, items)', 'bump(int n, List<Integer> items)'));
      t.set('n', 1); t.set('items', { ref: 'L1' }, LT);
      t.step(1, { '*': 'n receives a copy of the value 1. items receives a copy of the arrow: it points at the same list as data.', cpp: 'n is a copy of count (passed by value). items is a reference (&): another name for data itself.' });
      t.set('n', 2); t.step(2, 'n becomes 2, but only the copy changes: count, back in the caller, is still 1.');
      t.push('L1', 2); t.step(3, 'Add 2 to the list through items. There is only one list, so data sees it too.');
      t.ret(); t.step(6, 'bump returns; its frame, n and items, is gone. The list stays, because data still points at it.');
      t.print(L('1 [10, 2]', '1 10,2', '1 [ 10, 2 ]', '1 [10, 2]')); t.step(7, { '*': 'count is unchanged, data has grown: numbers are copied, lists are shared.', cpp: 'count is unchanged, data has grown. Without the & the vector would have been copied, and data would still be {10}.' });
    },
  },
  {
    id: 'recursion', name: 'Recursion', chapter: '4 · Functions',
    what: 'A function that calls itself on a smaller problem until a base case: 4! = 4 × 3 × 2 × 1.',
    inputs: [{ label: 'fact(4)', args: { n: 4 } }],
    expect: () => ({ '*': ['24'] }),
    src: {
      python: `
# n! = n × (n − 1)!, and 1! = 1.
def fact(n):                    @@1
    if n <= 1:                  @@2
        return 1                @@3
    return n * fact(n - 1)      @@4

print(fact({{n}}))              @@5`,
      cpp: `
// n! = n × (n − 1)!, and 1! = 1.
#include <iostream>

int fact(int n) {                   @@1
    if (n <= 1) {                   @@2
        return 1;                   @@3
    }
    return n * fact(n - 1);         @@4
}

int main() {
    std::cout << fact({{n}}) << "\\n";   @@5
    return 0;
}`,
      javascript: `
// n! = n × (n − 1)!, and 1! = 1.
function fact(n) {                @@1
  if (n <= 1) {                   @@2
    return 1;                     @@3
  }
  return n * fact(n - 1);         @@4
}

console.log(fact({{n}}));         @@5`,
      java: `
// n! = n × (n − 1)!, and 1! = 1.
public class Main {
    static int fact(int n) {                @@1
        if (n <= 1) {                       @@2
            return 1;                       @@3
        }
        return n * fact(n - 1);             @@4
    }

    public static void main(String[] args) {
        System.out.println(fact({{n}}));    @@5
    }
}`,
    },
    run(t) {
      const N = t.args.n, FN = (n) => L(`fact(n = ${n})`, `fact(int n = ${n})`, `fact(n = ${n})`, `fact(int n = ${n})`);
      t.step(5, `Call fact(${N}).`);
      const go = (n) => {
        t.call(FN(n)); t.set('n', n); t.step(1, `A new frame with its own n = ${n}. Each call has separate variables.`);
        const base = t.cond(`n <= 1  →  ${n} <= 1`, n <= 1); t.step(2, base ? 'The base case: small enough to answer directly.' : `Not the base case: ${n}! needs ${n - 1}! first.`);
        if (base) { t.step(3, 'return 1. Without this case the calls would never stop (stack overflow).'); t.ret(); return 1; }
        t.step(4, `Call fact(${n - 1}); this call waits, with n = ${n} kept in its frame.`);
        const r = go(n - 1);
        t.step(4, `fact(${n - 1}) returned ${r}: now ${n} × ${r} = ${n * r}, and return it.`); t.ret(); return n * r;
      };
      const r = go(N);
      t.print(String(r)); t.step(5, `${N}! = ${r}. The stack grew to ${N} frames, then unwound in reverse order.`);
    },
  },
  {
    id: 'classes', name: 'Classes and objects', chapter: '5 · Objects',
    what: 'A class bundles data (fields) with the functions that act on it (methods): a bank account.',
    inputs: [{ label: 'deposit, refuse, withdraw', args: {} }],
    expect: () => ({ '*': ['refused', 'Ada 20'] }),
    src: {
      python: `
# A class bundles data with the methods that use it.
class Account:
    def __init__(self, owner):          @@1
        self.owner = owner              @@2
        self.balance = 0                @@3

    def deposit(self, amount):          @@4
        self.balance += amount          @@5

    def withdraw(self, amount):         @@6
        if amount > self.balance:       @@7
            print("refused")            @@8
            return                      @@15
        self.balance -= amount          @@9

acc = Account("Ada")                    @@10
acc.deposit(50)                         @@11
acc.withdraw(80)                        @@12
acc.withdraw(30)                        @@13
print(acc.owner, acc.balance)           @@14`,
      cpp: `
// A class bundles data with the methods that use it.
#include <iostream>
#include <string>

class Account {
public:
    std::string owner;
    int balance;

    Account(std::string owner) {             @@1
        this->owner = owner;                 @@2
        balance = 0;                         @@3
    }
    void deposit(int amount) {               @@4
        balance += amount;                   @@5
    }
    void withdraw(int amount) {              @@6
        if (amount > balance) {              @@7
            std::cout << "refused\\n";        @@8
            return;                          @@15
        }
        balance -= amount;                   @@9
    }
};

int main() {
    Account acc("Ada");                                        @@10
    acc.deposit(50);                                           @@11
    acc.withdraw(80);                                          @@12
    acc.withdraw(30);                                          @@13
    std::cout << acc.owner << " " << acc.balance << "\\n";      @@14
    return 0;
}`,
      javascript: `
// A class bundles data with the methods that use it.
class Account {
  constructor(owner) {              @@1
    this.owner = owner;             @@2
    this.balance = 0;               @@3
  }
  deposit(amount) {                 @@4
    this.balance += amount;         @@5
  }
  withdraw(amount) {                @@6
    if (amount > this.balance) {    @@7
      console.log("refused");       @@8
      return;                       @@15
    }
    this.balance -= amount;         @@9
  }
}

const acc = new Account("Ada");             @@10
acc.deposit(50);                            @@11
acc.withdraw(80);                           @@12
acc.withdraw(30);                           @@13
console.log(acc.owner, acc.balance);        @@14`,
      java: `
// A class bundles data with the methods that use it.
class Account {
    String owner;
    int balance;

    Account(String owner) {                   @@1
        this.owner = owner;                   @@2
        this.balance = 0;                     @@3
    }
    void deposit(int amount) {                @@4
        balance += amount;                    @@5
    }
    void withdraw(int amount) {               @@6
        if (amount > balance) {               @@7
            System.out.println("refused");    @@8
            return;                           @@15
        }
        balance -= amount;                    @@9
    }
}

public class Main {
    public static void main(String[] args) {
        Account acc = new Account("Ada");                       @@10
        acc.deposit(50);                                        @@11
        acc.withdraw(80);                                       @@12
        acc.withdraw(30);                                       @@13
        System.out.println(acc.owner + " " + acc.balance);      @@14
    }
}`,
    },
    run(t) {
      const A = 'A1';
      const method = (sig, line, args) => { t.call(sig); t.set(L('self', 'this', 'this', 'this'), { ref: A }); for (const [k, v] of Object.entries(args)) t.set(k, v); t.step(line, { '*': 'Inside the method, this points at the object the method was called on.', python: 'Inside the method, self points at the object the method was called on; Python passes it as the first parameter.' }); };
      t.step(10, 'Create an object of class Account. The class is the blueprint; acc will be one account built from it.');
      t.obj(A, 'Account', { owner: null, balance: null });
      method(L('__init__(self, owner)', 'Account(std::string owner)', 'constructor(owner)', 'Account(String owner)'), 1, { owner: 'Ada' });
      t.field(A, 'owner', 'Ada'); t.step(2, 'Store the owner in the object\'s field.');
      t.field(A, 'balance', 0); t.step(3, 'A new account starts empty.');
      t.ret(); t.set('acc', { ref: A }, 'Account'); t.step(10, { '*': 'The constructor has finished: acc refers to the new object.', cpp: 'The constructor has finished: acc is the new object (C++ keeps it in the variable itself).' });
      t.step(11, 'Call the method deposit on acc.');
      method(L('deposit(self, amount)', 'deposit(int amount)', 'deposit(amount)', 'deposit(int amount)'), 4, { amount: 50 });
      t.field(A, 'balance', 50); t.step(5, 'The method changes the object\'s own data: balance 0 → 50.'); t.ret();
      t.step(12, 'Try to withdraw 80.');
      method(L('withdraw(self, amount)', 'withdraw(int amount)', 'withdraw(amount)', 'withdraw(int amount)'), 6, { amount: 80 });
      t.cond('amount > balance  →  80 > 50', true); t.step(7, 'Not enough money.');
      t.print('refused'); t.step(8, 'The class protects its own rule: no account can go negative through withdraw.');
      t.step(15, 'return leaves the method early: the subtraction below is skipped.'); t.ret();
      t.step(13, 'Withdraw 30.');
      method(L('withdraw(self, amount)', 'withdraw(int amount)', 'withdraw(amount)', 'withdraw(int amount)'), 6, { amount: 30 });
      t.cond('amount > balance  →  30 > 50', false); t.step(7, 'Enough money this time.');
      t.field(A, 'balance', 20); t.step(9, 'balance 50 → 20.'); t.ret();
      t.print('Ada 20'); t.step(14, 'Read the fields directly. Many languages let you hide them (private) so only the methods can change them.');
    },
  },
];
