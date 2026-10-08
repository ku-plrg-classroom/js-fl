import assert from 'assert';
import fs from 'fs';

import { getLines, load, makeOracle, readFile, readJSON, reveals } from '../src/helper';
import { localize } from '../src/impl';
import { Evaluation, evaluate, points } from '../src/score';

// Every `example/<name>.js` that has an oracle, a failing input and a fault
const names = fs
  .readdirSync('example')
  .filter(f => f.endsWith('.js') && !f.endsWith('.oracle.js'))
  .map(f => f.slice(0, -3))
  .filter(n => fs.existsSync(`example/${n}.oracle.js`))
  .filter(n => fs.existsSync(`example/${n}.input.json`))
  .filter(n => fs.existsSync(`example/${n}.fault.json`))
  .sort();

// Localize each example once
const cache: { [name: string]: Promise<Evaluation> } = {};
function getEvaluation(name: string): Promise<Evaluation> {
  if (cache[name]) return cache[name];
  const code = readFile(`example/${name}.js`);
  const oracle = makeOracle(readFile(`example/${name}.oracle.js`));
  const input = readJSON(`example/${name}.input.json`);
  const { fault } = readJSON(`example/${name}.fault.json`);
  return cache[name] = evaluate(localize, code, oracle, input, fault);
}

// The examples themselves: the input fails, and the fault is at a location of
// the program (`getLines` would also reject a program outside the subset)
describe('examples', () => {
  for (const name of names) {
    it(`should give a failing input and a located fault for ${name}.js`, () => {
      const code = readFile(`example/${name}.js`);
      const oracle = makeOracle(readFile(`example/${name}.oracle.js`));
      const input = readJSON(`example/${name}.input.json`);
      assert.ok(reveals(load(code), oracle, input), 'the input does not fail');
      const lines = getLines(code);
      const { fault } = readJSON(`example/${name}.fault.json`);
      for (const line of fault) assert.ok(lines.includes(line), `line ${line}`);
    });
  }
});

// There is no perfect score, so these tests only check that an answer is
// valid and counts: it arrives in time, and the fault is somewhere in the
// ranking.  How *high* it is ranked is printed at the end.
describe('localize', () => {
  for (const name of names) {
    describe(`${name}.js`, () => {
      it('should finish within the time limit', async () => {
        const e = await getEvaluation(name);
        assert.ok(!e.error, e.error);
        assert.ok(!e.late, `took ${e.time} ms`);
      });

      it('should rank the faulty line', async () => {
        const e = await getEvaluation(name);
        assert.ok(e.rank !== null, 'the faulty line is not in the ranking');
      });
    });
  }

  after(async () => {
    let total = 0;
    console.log('\n  example        rank    points  time');
    for (const name of names) {
      if (!cache[name]) continue;
      const e = await cache[name];
      const p = points(e);
      total += p;
      console.log(
        `  ${name.padEnd(14)} ${String(e.rank ?? '-').padEnd(7)} ` +
        `${p.toFixed(2).padEnd(7)} ${e.time} ms`
      );
    }
    console.log(`\n  total: ${total.toFixed(2)} / ${names.length}\n`);
  });
});
