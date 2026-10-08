import fs from 'fs';
import path from 'path';

import yargs from 'yargs';

import {
  getLines,
  load,
  log,
  makeOracle,
  normalize,
  readFile,
  readJSON,
  scriptName,
  warn,
} from './helper';

import { localize } from './impl';
import { evaluate, points, rankOf, tier } from './score';

// `example/foo.js` -> `example/foo.oracle.js` and `example/foo.fault.json`
const sibling = (target: string, suffix: string): string =>
  target.replace(/\.js$/, suffix);

// Run the program and the oracle on one input
const run = async (argv: any) => {
  const [target, inputPath] = argv._.slice(1);
  if (!target || !inputPath) throw 'Usage: run <target.js> <input.json>';
  const code = readFile(target);
  const oracle = makeOracle(readFile(sibling(target, '.oracle.js')));
  const input = normalize(readJSON(inputPath));
  const out = load(code)(input);
  const expected = oracle(input);
  console.log(`Input:   ${JSON.stringify(input)}`);
  console.log(`Program: ${out}`);
  console.log(`Oracle:  ${expected}`);
  console.log(out === expected ? 'They agree.' : 'They DISAGREE: the input reveals the fault.');
}

// Localize the fault of one program
const localizeCmd = async (argv: any) => {
  const [target] = argv._.slice(1);
  if (!target) throw 'Usage: localize <target.js>';
  const code = readFile(target);
  const oracle = makeOracle(readFile(sibling(target, '.oracle.js')));
  const input = normalize(readJSON(sibling(target, '.input.json')));
  log(`The target file is \`${target}\`.`);
  console.log(`Input:   ${JSON.stringify(input)}`);
  console.log(`Program: ${load(code)(input)}`);
  console.log(`Oracle:  ${oracle(input)}`);

  const start = Date.now();
  const { ranking } = await localize(code, oracle, input);
  const time = Date.now() - start;

  const valid = new Set(getLines(code));
  const lines = code.split('\n');
  const shown = [...new Set(ranking)].filter(l => valid.has(l));
  console.log(`Ranking (top 10 of ${shown.length}):`);
  shown.slice(0, 10).forEach((l, i) => {
    console.log(`  ${String(i + 1).padStart(2)}. line ${String(l).padStart(3)}: ${lines[l - 1].trim()}`);
  });
  const faultPath = sibling(target, '.fault.json');
  if (fs.existsSync(faultPath)) {
    const { fault } = readJSON(faultPath);
    const rank = rankOf(code, ranking, fault);
    console.log(`Rank of the fault (line ${fault.join(', ')}): ${rank ?? '-'} (${tier(rank)} points)`);
  }
  console.log(`Time: ${time} ms`);
}

// Localize every example of a directory, and print the score
const score = async (argv: any) => {
  const dir = argv._[1] ?? 'example';
  const names = fs.readdirSync(dir)
    .filter(f => f.endsWith('.js') && !f.endsWith('.oracle.js'))
    .map(f => f.slice(0, -3))
    .filter(n => fs.existsSync(path.join(dir, `${n}.oracle.js`)))
    .sort();
  let total = 0;
  console.log('example        rank    points  time');
  for (const name of names) {
    const code = readFile(path.join(dir, `${name}.js`));
    const oracle = makeOracle(readFile(path.join(dir, `${name}.oracle.js`)));
    const inputPath = path.join(dir, `${name}.input.json`);
    const faultPath = path.join(dir, `${name}.fault.json`);
    if (!fs.existsSync(inputPath) || !fs.existsSync(faultPath)) {
      warn(`No input or fault file for \`${name}\`.`);
      continue;
    }
    const e = await evaluate(localize, code, oracle, readJSON(inputPath), readJSON(faultPath).fault);
    const p = points(e);
    total += p;
    const note = e.error ? `  (${e.error})` : e.late ? '  (over the time limit)' : '';
    console.log(`${name.padEnd(14)} ${String(e.rank ?? '-').padEnd(7)} ${p.toFixed(2).padEnd(7)} ${e.time} ms${note}`);
  }
  console.log(`\ntotal: ${total.toFixed(2)} / ${names.length}`);
}

(async () => {
  try {
    await yargs(process.argv.slice(2))
      .scriptName(scriptName)
      .locale('en')
      .usage('Usage: $0 <command> [options]')
      .command('run', 'Run the program and its oracle on an input', () => {}, run)
      .example('$0 run example/clamp.js example/clamp.input.json', 'Compare the outputs on an input')
      .command('localize', 'Localize the fault of a program', () => {}, localizeCmd)
      .example('$0 localize example/clamp.js', 'Localize the fault of `clamp.js`')
      .command('score', 'Localize every example and print the score', () => {}, score)
      .example('$0 score', 'Score your localizer on `example/`')
      .demandCommand(1, 'You need a command to run `js-fl`.')
      .help()
      .parse();
  } catch (e) {
    console.error(typeof e === 'string' ? e : e);
    process.exitCode = 1;
  }
})();
