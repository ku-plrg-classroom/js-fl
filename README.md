# JavaScript Fault Localization

This is a homework assignment, and the goal of this assignment is to build a
**fault localization (FL)** tool for a small subset of JavaScript. Your tool is
given three things:

1. the code of a **faulty program**,
2. an **oracle**: the correct version of the same program, which you can
   **call** but whose code you **cannot see**, and
3. one **failing input**: an input on which the program and the oracle
   disagree, as in a bug report.

It must return a **ranking** of the locations of the program, from the most
suspicious to the least suspicious.

Unlike the previous assignments, **there is no single correct answer**, and
passing the tests is not the goal. You may use any approach, such as delta
debugging of the failing input, generating more tests around it (random, mutational, coverage-guided, symbolic, ...), coverage
instrumentation, spectrum-based fault localization, mutation-based fault
localization, or a combination of them. The higher your tool ranks the
faults, the higher your score.

It utilizes the [`acorn`](https://github.com/acornjs/acorn) library to parse
JavaScript code, and you may also use
[`acorn-walk`](https://www.npmjs.com/package/acorn-walk) and
[`astring`](https://github.com/davidbonnet/astring) to traverse and generate it.

Please refer to the following documents for more information:
* [Type Definitions for `acorn`](https://github.com/acornjs/acorn/blob/master/acorn/src/acorn.d.ts)
* [AST Explorer](https://astexplorer.net/)

**Table of Contents**
* [Setup](#setup)
* [The Task](#the-task)
  + [Programs and Oracles](#programs-and-oracles)
  + [Inputs and Outputs](#inputs-and-outputs)
  + [Locations and Faults](#locations-and-faults)
* [The JavaScript Subset](#the-javascript-subset)
* [Rules](#rules)
* [Grading](#grading)
* [Testing](#testing)
  + [Examples](#examples)


## Setup

| #   | Tool    | Version    |
| --- | ------- | ---------- |
| 1   | Node.js | >= 20.0.0  |
| 2   | npm     | >= 10.0.0  |

```bash
npm install && npm run build
```

After building the project, you can **run the project** using the
[`./js-fl`](./js-fl) executable, or without building it using `npm run start`:

```bash
Usage: ./js-fl <command> [options]

Commands:
  ./js-fl run       Run the program and its oracle on an input
  ./js-fl localize  Localize the fault of a program
  ./js-fl score     Localize every example and print the score

Examples:
  ./js-fl run example/csv.js example/csv.input.json  Compare the outputs on an input
  ./js-fl localize example/csv.js          Localize the fault of `csv.js`
  ./js-fl score                            Score your localizer on `example/`
```

For example, [`example/csv.js`](./example/csv.js) is a faulty version of
[`example/csv.oracle.js`](./example/csv.oracle.js). The `run` command
compares the two on one input, here the failing input of the example,
[`example/csv.input.json`](./example/csv.input.json):

```bash
$ npm run start run example/csv.js example/csv.input.json
Input:   [[["rows","a\n1\nxx"],["format","a,b\n\"x,y\",2"]]]
Program: [ [ [ 'a' ], [ '1' ] ], 'a,b\n"x,y",2' ]
Oracle:  [ [ [ 'a' ], [ '1' ], [ 'xx' ] ], 'a,b\n"x,y",2' ]
They DISAGREE: the input reveals the fault.
```

The `localize` command runs **your** localizer on a program with its failing
input, and shows the top of its ranking. With the starter code, which ranks
nothing:

```bash
$ npm run start localize example/csv.js
[INFO ] The target file is `example/csv.js`.
Input:   [[["rows","a\n1\nxx"],["format","a,b\n\"x,y\",2"]]]
Program: [ [ [ 'a' ], [ '1' ] ], 'a,b\n"x,y",2' ]
Oracle:  [ [ [ 'a' ], [ '1' ], [ 'xx' ] ], 'a,b\n"x,y",2' ]
Ranking (top 10 of 0):
Rank of the fault (line 73): - (0 points)
Time: 3 ms
```

The `score` command does the same for every example, and prints the numbers
that the grading is based on:

```bash
$ npm run start score
example        rank    points  time
csv            -       0.00    3 ms
heap           -       0.00    0 ms
...
total: 0.00 / 10
```


## The Task

**Please implement** the function `localize` in [`src/impl.ts`](./src/impl.ts).
It is the **only file you submit**; you may add any code to it, but you may not
change the other files, since the grading uses its own copy of them.

```typescript
export function localize(program: string, oracle: Oracle, input: any[]): Result
```

It may also be `async` and return a `Promise<Result>`.

```typescript
type Oracle = (args: any[]) => Output;   // Output = string

interface Result {
  ranking: number[]; // locations (lines), from the most to the least suspicious
}
```


### Programs and Oracles

A program is a JavaScript file consisting of **function declarations**. The
**first** one is the entry point, and its **parameters are the inputs**; the
others may be called by it. The oracle is a program with the **same entry
point and the same behavior**, except for the fault.

The types of the parameters are **not given**: a parameter may expect a
number, a string, an array, ...  Finding out what the program expects is part
of the task.

Like the examples, a program usually takes **a list of commands** and runs
them one after another, so a failing input may contain many commands of
which only some matter.

[`src/helper.ts`](./src/helper.ts) gives what you need to work with them:

| Function          | What it does                                                            |
| ----------------- | ----------------------------------------------------------------------- |
| `parse(code)`     | the `acorn` AST of the code, with line numbers (`node.loc.start.line`)  |
| `getParams(code)` | the parameter names of the entry function                               |
| `getLines(code)`  | the locations of the code (see below)                                   |
| `load(code, globals)` | a `Runner` that runs the entry function of the code on an input     |
| `normalize(args)` | an input as the programs see it (see below)                             |
| `serialize(value)` | an output as the programs print it (see below)                         |
| `getEntry(code)`, `getFuncs(ast)` | the name of the entry function, the function declarations of an AST |
| `TIME_LIMIT`, `CALL_TIMEOUT` | the limits (see below)                                       |

`load` runs the code in a **fresh, isolated context**. The `globals` become
global variables of that context, so an **instrumented** program can call back
into your tool. For example, after inserting `__cov__(3);` in front of the
statement of line 3, you can collect the covered lines as follows:

```typescript
let covered = new Set<number>();
const run = load(instrumented, { __cov__: (line: number) => covered.add(line) });
const output = run([1, 2]);   // `covered` now holds the lines it executed
```


### Inputs and Outputs

An input is an **array of arguments**, one per parameter. It may be shorter
than the parameter list: the missing arguments are `undefined`, as in any
call of a JavaScript function, and some programs treat them as optional
arguments. Before **every**
execution -- of the program as well as of the oracle -- the input is sent
through JSON (`normalize`), so that the two always see the same input: only
numbers, strings, booleans, `null`, arrays and plain objects remain, and
`undefined`, `NaN` and `Infinity` become `null` (`-0` becomes `0`, and a
property whose value is `undefined` disappears).

An output is a **string**:

| Execution                         | Output                          |
| --------------------------------- | ------------------------------- |
| returns a value                   | the value printed by `serialize` (`NaN`, `-0`, `undefined` and `null` all differ) |
| throws                            | `throw: <name>: <message>`      |
| runs longer than `CALL_TIMEOUT` (100 ms) | `timeout`                |

The timeout stops the loops of a program, but it cannot stop one call of a
built-in on a huge array or string (e.g., `a[1e9] = 0; a.join('')`): inside a
program, such a call throws a `RangeError` instead, beyond a million elements
or characters. Time spent in the callbacks of `globals` counts toward the
timeout.

The program and the oracle **agree** on an input if and only if their outputs
are the **same string**. An input **fails**, or reveals the fault, if they
disagree. The `input` given to `localize` always fails; it is not necessarily
small, so reducing it (delta debugging) may help.


### Locations and Faults

A **location** is the **line of a statement**: `getLines(code)` lists them. A
statement is a node in a statement position -- an element of a block, or the
body of an `if`, a loop, or an `else` -- except blocks and empty statements.
The declaration in the `init` of a `for` belongs to the `for`.

Each program has **one fault**, inserted by hand. It is described by a set of
**faulty lines**, and its **rank** is the position of the first faulty line in
your ranking:

* lines that are not locations, and repeated lines, are skipped before
  counting;
* if no faulty line is in your ranking, the fault has **no rank**.

A fault always **changes existing statements**. A statement may lose part of
an expression (e.g., a forgotten method call), but no fault removes a whole
statement, so the faulty lines always exist in the faulty program.

Ties do not exist: **your ranking is a list**, and its order is its ranking.


## The JavaScript Subset

The programs only use the following subset of JavaScript.

| Category    | Supported                                                            |
| ----------- | -------------------------------------------------------------------- |
| Values      | numbers, strings, booleans, `null`, arrays, plain objects            |
| Expressions | literals, variables, array and object literals                       |
|             | member access (`a.b`, `a[i]`), `.length`                             |
|             | unary `-`, `+`, `!`, `typeof`                                        |
|             | `+`, `-`, `*`, `/`, `%`, `<`, `<=`, `>`, `>=`, `===`, `!==`          |
|             | `&&`, `\|\|`, `? :`                                                    |
|             | `=`, `+=`, `-=`, `*=`, `/=`, `%=`, `++`, `--`                        |
|             | calls to the functions of the program, including recursive ones      |
|             | `Math.*`, `Number.*` (e.g., `Number.isInteger`, `Number.parseInt`, `Number.MAX_SAFE_INTEGER`), `Array.isArray`, `String`, `Number` |
|             | the globals `undefined`, `Infinity` and `NaN`                        |
|             | methods of strings and arrays that do not take a function (e.g., `slice`, `indexOf`, `push`, `join`, `toUpperCase`) |
| Statements  | `let` / `const` / `var`                                              |
|             | expression statements, blocks, `;`                                   |
|             | `if` / `else`                                                        |
|             | `while`, `do`-`while`, `for (init; test; update)`, `for (... of ...)` |
|             | `break`, `continue` (without a label), `return`, `throw`             |

There are no nested functions (declarations, expressions or arrows), classes,
`this`, `new`, `try`, `switch`, template literals, regular expressions,
destructuring, spread, getters or setters. No program depends on `Math.random`
or on the time.


## Rules

* **Submit only [`src/impl.ts`](./src/impl.ts).** The grading runs it with
  its own copy of every other file.
* The oracle may only be **called**. Your tool may **not** read files, start
  processes, open network connections, or inspect the runtime: do not use
  `fs`, `child_process`, `worker_threads`, `net`, `http`, `inspector`, `vm`,
  `util`, `process`, `require` or dynamic `import`.
* Do **not** replace or modify built-in objects (e.g., assigning to
  `Array.prototype.includes` or `JSON.stringify`), and do not modify the
  exports of `helper.ts` (e.g., `CALL_TIMEOUT`). The grading judges every
  answer in a separate process anyway, so it would not help.
* The submissions are checked for all of the above, and a tool that tries to
  get at the code of the oracle, or to influence the grading, scores **zero**.
* The whole call of `localize` on one program must finish within
  **`TIME_LIMIT` (30 seconds)**. A later answer scores nothing for that
  program.
* The result must be **deterministic** enough to be graded once: use a fixed
  seed if your tool is randomized.


## Grading

Your tool is graded on the **public examples** of the `example` directory
and on **hidden programs**, which are not given. Each is run once. For each
program, the **rank** of its fault in your ranking earns points in tiers,
because a developer reads only the top of a ranking:

| Rank of the fault | 1 | 2-3 | 4-5 | 6-10 | 11-20 | later, or not ranked |
| ----------------- | --- | --- | --- | --- | --- | --- |
| Points            | 1.0 | 0.8 | 0.6 | 0.4 | 0.2 | 0 |

A late answer, an error, or a malformed result scores 0 for that program.
**Every fault you rank higher raises your score.**

**The public examples are easier than the hidden programs.** The hidden
programs are larger, their failing inputs are longer, and most of the grade
comes from them. Ranking every public fault first therefore does **not** mean
a high score: a tool that only works on `example/` can still lose many points
on the hidden programs. Make your tool robust beyond the examples.


## Testing

```bash
npm run test
```

The tests check that every example is well-formed, meaning its input fails
and its fault is at a location. Then they check, for each example, that
`localize` finishes within the time limit and that the faulty line is
somewhere in its ranking. With the starter code, which ranks nothing, the
last 10 tests fail. Passing all of them does **not** mean a perfect score: at the
end, the tests print the rank of every fault and the totals, the same numbers
as `./js-fl score`.


### Examples

The `example` directory contains four files for each of **10 examples**:

1. `<name>.js`: the **faulty program**, given to `localize`
2. `<name>.oracle.js`: the **correct program**, behind the oracle
3. `<name>.input.json`: the **failing input**, given to `localize`
4. `<name>.fault.json`: the **faulty lines**, e.g., `{ "fault": [5] }`

The oracle files are given so that you can study the examples; your tool must
not read them (see [Rules](#rules)).

| Example     | Fault                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| `csv`       | a wrong logical operator that drops a final one-field row              |
| `heap`      | a wrong child index in the sift-down, visible only in some pop orders  |
| `intervals` | a wrong boundary that leaves touching intervals unmerged               |
| `inventory` | a wrong boundary in a validation helper shared by `stock` and `sell`   |
| `ledger`    | a wrong variable in the transfer                                       |
| `matrix`    | a wrong loop bound in the multiplication, visible only on non-square matrices |
| `roman`     | a wrong comparison in the subtractive rule                             |
| `rpn`       | a wrong boundary in the underflow check, visible only on malformed expressions |
| `stats`     | wrong indices for an even-length median                                |
| `words`     | a wrong boundary in a character helper shared by every operation       |
