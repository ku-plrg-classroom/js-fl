// What `helper.ts` gives you (see the README): the limits, the programs'
// parameters, entry point and locations, the AST, and running a program.
import {
  CALL_TIMEOUT,
  Oracle,
  Output,
  Runner,
  TIME_LIMIT,
  getEntry,
  getFuncs,
  getLines,
  getParams,
  load,
  normalize,
  parse,
  serialize,
} from './helper';
import { Result } from './score';

// `acorn-walk` and `astring` are installed too, if you want them:
//   import * as walk from 'acorn-walk';
//   import { generate } from 'astring';

// ------------------------------------------------------------------------- //
// Your fault localizer
// ------------------------------------------------------------------------- //
// Given the code of a faulty `program`, the `oracle` -- the correct version of
// the same program, which you can only call -- and one failing `input` -- an
// input on which the program and the oracle disagree -- return
//
//   * `ranking`: the locations of the program (the lines of `getLines`), from
//                the most suspicious to the least suspicious.
//
// You may use any approach, such as delta debugging of the failing input,
// generating more tests around it (random, mutational,
// coverage-guided, symbolic, ...), coverage instrumentation, spectrum-based
// fault localization, mutation-based fault localization, ...  There is no
// perfect score: the higher you rank the faults of the hidden programs, the
// higher your score.
//
// `load(code, globals)` runs any program in an isolated context, and lets the
// program call back into your tool through `globals`: instrument the program,
// then load the instrumented code.  Every input you pass to the program or to
// the oracle is first sent through JSON (`normalize`), and every output is a
// string -- two executions agree if and only if their outputs are equal.
//
// The whole call must finish within `TIME_LIMIT`.
//
// The starter code below is only a placeholder: it ranks nothing, and so
// scores nothing.
export function localize(program: string, oracle: Oracle, input: any[]): Result {
  // TODO: rank the lines by how suspicious they are
  const ranking: number[] = [];
  return { ranking };
}
