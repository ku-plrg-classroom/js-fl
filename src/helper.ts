import chalk from 'chalk';
import fs from 'fs';
import util from 'util';
import vm from 'vm';

import acorn from 'acorn';
import { FunctionDeclaration, Node, Program, Statement } from 'acorn';

export const scriptName = './js-fl';

// The built-ins that decide a verdict or measure the time, captured when this
// file is loaded -- before any code of `impl.ts` runs -- so that replacing
// them later (`JSON.stringify = ...`) cannot change how an answer is judged.
const jsonStringify = JSON.stringify.bind(JSON);
const jsonParse = JSON.parse.bind(JSON);
const inspect = util.inspect;
const objectToString = Function.prototype.call.bind(Object.prototype.toString);
const createContext = vm.createContext;
const runInContext = vm.runInContext;
export const now: () => number = Date.now.bind(Date);

// ------------------------------------------------------------------------- //
// Limits
// ------------------------------------------------------------------------- //

// The time limit of one call to `localize`, for one target program.  An
// answer that arrives later scores nothing.
export const TIME_LIMIT = 30_000; // ms

// The time limit of one execution of a program (or of the oracle).  An
// execution that runs longer is stopped, and its output is `timeout`.
export const CALL_TIMEOUT = 100; // ms
const CALL_TIMEOUT_ = CALL_TIMEOUT; // used below: an export can be reassigned from outside

// ------------------------------------------------------------------------- //
// Files and messages
// ------------------------------------------------------------------------- //

// Read the file
export function readFile(path: string): string {
  if (!fs.existsSync(path)) err(`File not found: \`${path}\`.`);
  return fs.readFileSync(path, 'utf-8').toString().trimEnd();
}

// Read the JSON file
export function readJSON(path: string): any {
  return JSON.parse(readFile(path));
}

// Log a message
export function log(msg: string) {
  console.log(`[INFO ] ${msg}`);
}

// Warning message
export function warn(msg: string) {
  console.warn(chalk.yellow(`[WARN ] ${msg}`));
}

// Error message
export function err(msg: string): never {
  throw chalk.red(`[ERROR] ${msg}`);
}

// An unsupported construct: the given code is outside the JS subset
export function unsupported(node: Node, what: string = node.type): never {
  return err(`Unsupported construct: \`${what}\`.`);
}

// ------------------------------------------------------------------------- //
// Parsing
// ------------------------------------------------------------------------- //

// Parse the code into an AST, with the line and column of every node
// (`node.loc.start.line`)
export function parse(code: string): Program {
  return acorn.parse(code, { ecmaVersion: 2023, locations: true });
}

// The top-level function declarations of the program.  The *first* one is the
// entry point, whose parameters are the inputs; the others may be called by
// it.
export function getFuncs(program: Program): FunctionDeclaration[] {
  const funcs = program.body.filter(
    (node): node is FunctionDeclaration => node.type === 'FunctionDeclaration'
  );
  if (program.body.length !== funcs.length || funcs.length === 0) {
    err('The target file must consist of function declarations only.');
  }
  return funcs;
}

// The name of the entry function of the code
export function getEntry(code: string): string {
  return getFuncs(parse(code))[0].id.name;
}

// The names of the parameters of the entry function
export function getParams(code: string): string[] {
  return getFuncs(parse(code))[0].params.map(param => {
    if (param.type !== 'Identifier') unsupported(param, 'non-simple parameter');
    return param.name;
  });
}

// The *locations* of a program: the line of every statement, in the order of
// the source.  A ranking produced by `localize` is a list of these lines; any
// other line in it is ignored.
//
// A statement is any node of type `*Statement` or `*Declaration` in a
// statement position -- an element of a block, or the body of an `if`, a loop
// or an `else` -- except blocks, empty statements, and the function
// declarations themselves.  The declaration in the `init` of a `for` is part
// of the `for`, not a statement of its own.
export function getLines(code: string): number[] {
  const lines = new Set<number>();
  const visit = (stmt: Statement): void => {
    switch (stmt.type) {
      case 'BlockStatement':
        stmt.body.forEach(visit);
        return;
      case 'EmptyStatement':
        return;
      case 'FunctionDeclaration':
        unsupported(stmt, 'nested function declaration');
    }
    lines.add(stmt.loc!.start.line);
    switch (stmt.type) {
      case 'IfStatement':
        visit(stmt.consequent);
        if (stmt.alternate) visit(stmt.alternate);
        return;
      case 'WhileStatement':
      case 'DoWhileStatement':
      case 'ForStatement':
      case 'ForOfStatement':
        visit(stmt.body);
        return;
    }
  };
  for (const func of getFuncs(parse(code))) func.body.body.forEach(visit);
  return [...lines].sort((a, b) => a - b);
}

// ------------------------------------------------------------------------- //
// Running programs
// ------------------------------------------------------------------------- //
// Inputs and outputs cross between your tool and the programs in only one
// way, so that the program and the oracle always see the same input and are
// always compared in the same way:
//
//   * an input is `normalize`d -- sent through JSON -- before every run, so
//     `undefined`, `NaN` and `Infinity` become `null`, `-0` becomes `0`, and
//     only numbers, strings, booleans, `null`, arrays and plain objects remain;
//   * an output is a *string*: the returned value printed by `serialize`,
//     `throw: <error>` if the execution threw, or `timeout` if it ran longer
//     than `CALL_TIMEOUT`.
//
// Two executions agree if and only if their outputs are the same string.

// An output of one execution
export type Output = string;

// A program ready to be run on an input
export type Runner = (args: any[]) => Output;

// The oracle: the correct version of the program, run on an input.  Its code
// is hidden -- it can only be called.
export type Oracle = Runner;

// Send an input through JSON, which leaves only plain data
export function normalize(args: any[]): any[] {
  if (!Array.isArray(args)) err('An input must be an array of arguments.');
  return jsonParse(jsonStringify(args));
}

// Print a value, telling apart `NaN`, `-0`, `undefined` and `null`
export function serialize(value: any): string {
  return inspect(value, {
    depth: null,
    maxArrayLength: null,
    maxStringLength: null,
    breakLength: Infinity,
    customInspect: false,
    getters: false,
  });
}

// The vm timeout interrupts the program's own loops, but not one call of a
// built-in that works on a huge array or string (a mutant that writes
// `a[1e9] = 0` and then joins the array runs for a minute).  So, inside every
// context, the built-ins whose cost grows with the size of the receiver throw
// a `RangeError` beyond `MAX_SIZE` elements or characters.
const MAX_SIZE = 1_000_000;
const GUARD = `
  const MAX = ${MAX_SIZE};
  const guard = (proto, name, sizeOf) => {
    const f = proto[name];
    Object.defineProperty(proto, name, { value: function (...args) {
      if (sizeOf(this, args) > MAX) throw new RangeError(name + ': too large');
      return f.apply(this, args);
    }, writable: true, configurable: true });
  };
  const len = (t) => (t == null ? 0 : (t.length >>> 0));
  for (const name of ['join', 'toString', 'indexOf', 'lastIndexOf', 'includes',
                      'reverse', 'sort', 'fill', 'slice', 'splice', 'concat',
                      'flat', 'copyWithin', 'keys', 'values', 'entries'])
    guard(Array.prototype, name, len);
  const num = (x) => Math.max(0, Number(x) || 0);
  guard(String.prototype, 'repeat', (t, a) => String(t).length * num(a[0]));
  guard(String.prototype, 'padStart', (t, a) => num(a[0]));
  guard(String.prototype, 'padEnd', (t, a) => num(a[0]));
  for (const name of ['indexOf', 'lastIndexOf', 'includes', 'split', 'slice',
                      'substring', 'trim', 'toUpperCase', 'toLowerCase'])
    guard(String.prototype, name, (t) => String(t).length);
`;

// Load the code of a program in a fresh, isolated context, and return a
// function that runs its entry function on an input.
//
// `globals` become global variables of that context, so the program can call
// back into your tool: after instrumenting a program with calls such as
// `__cov__(3)`, load it with `load(instrumented, { __cov__: ... })`.  The
// code runs in strict mode, and every run is stopped after `CALL_TIMEOUT`.
export function load(code: string, globals: object = {}): Runner {
  const entry = getEntry(code);
  // The sandbox has no prototype, so that nothing of this realm (not even a
  // property added to its `Object.prototype`) is visible from the program.
  const ctx = createContext(Object.assign(Object.create(null), globals));
  runInContext(GUARD, ctx);
  // No newline after the directive, so that the lines do not move
  runInContext(`"use strict"; ${code}`, ctx);
  return (args: any[]): Output => {
    // The input is parsed *inside* the context, so that its arrays and objects
    // belong to the program's own realm, whose built-ins nothing outside can
    // touch.
    ctx.__input__ = jsonStringify(normalize(args));
    try {
      const ret = runInContext(`${entry}(...JSON.parse(__input__))`, ctx, {
        timeout: CALL_TIMEOUT_,
      });
      return serialize(ret);
    } catch (e: any) {
      if (e?.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') return 'timeout';
      if (objectToString(e) === '[object Error]') {
        return `throw: ${e.name}: ${e.message}`;
      }
      return `throw: ${serialize(e)}`;
    }
  };
}

// Build the oracle from the code of the correct program.  Only the output
// string ever leaves it, so nothing of its code can be reached from outside.
export function makeOracle(code: string): Oracle {
  const run = load(code);
  return (args: any[]): Output => run(args);
}

// Does the input make the program and the oracle disagree?
export function reveals(program: Runner, oracle: Oracle, input: any[]): boolean {
  return program(input) !== oracle(input);
}
