import { TIME_LIMIT, getLines, now } from './helper';

// What `localize` returns for one program
export interface Result {
  // The locations (lines, see `getLines`) from the most suspicious to the
  // least suspicious
  ranking: number[];
}

// The localizer that you implement in `impl.ts`
export type Localize = (
  program: string,
  oracle: (args: any[]) => string,
  input: any[],
) => Result | Promise<Result>;

// How one answer scores
export interface Evaluation {
  rank: number | null;    // the rank of the fault in the ranking, from 1
  time: number;           // the time `localize` took (ms)
  late: boolean;          // it took longer than `TIME_LIMIT`
  error?: string;         // `localize` threw, or returned a malformed result
}

// The rank of the fault: the position, from 1, of the first faulty line in the
// ranking, after dropping the lines that are not locations and the repeated
// ones.  `null` if no faulty line is in the ranking.
export function rankOf(code: string, ranking: number[], fault: number[]): number | null {
  const valid = new Set(getLines(code));
  const seen = new Set<number>();
  let rank = 0;
  for (const line of ranking) {
    if (!valid.has(line) || seen.has(line)) continue;
    seen.add(line);
    rank++;
    if (fault.includes(line)) return rank;
  }
  return null;
}

// The points of a rank, in tiers: a developer reads only the top of a
// ranking, so what counts is whether the fault is first, in the top 3, 5, 10
// or 20.
//
//   rank      1     2-3   4-5   6-10   11-20   later, or not ranked
//   points    1.0   0.8   0.6   0.4    0.2     0
export function tier(rank: number | null): number {
  if (rank === null) return 0;
  if (rank <= 1) return 1;
  if (rank <= 3) return 0.8;
  if (rank <= 5) return 0.6;
  if (rank <= 10) return 0.4;
  if (rank <= 20) return 0.2;
  return 0;
}

// The points of one answer.  A late or broken answer scores nothing.
export function points(e: Evaluation): number {
  return e.late || e.error ? 0 : tier(e.rank);
}

// Judge an answer: the rank of the fault in its ranking
export function judge(
  code: string,
  fault: number[],
  result: Result,
): { rank: number | null; error?: string } {
  if (!result || typeof result !== 'object') {
    return { rank: null, error: 'The result must be an object.' };
  }
  const { ranking } = result;
  if (!Array.isArray(ranking) || !ranking.every(l => Number.isInteger(l))) {
    return { rank: null, error: '`ranking` must be an array of line numbers.' };
  }
  return { rank: rankOf(code, ranking, fault) };
}

// Run `localize` on one program, and judge its answer.
//
// This is what `npm test` and `./js-fl score` use.  The grading judges the
// answer in a separate process instead, where no code of `impl.ts` is loaded,
// and measures the time from outside.
export async function evaluate(
  localize: Localize,
  code: string,
  oracle: (args: any[]) => string,
  input: any[],
  fault: number[],
): Promise<Evaluation> {
  const start = now();
  let result: Result;
  try {
    result = await localize(code, oracle, input);
  } catch (e) {
    const time = now() - start;
    return { rank: null, time, late: time > TIME_LIMIT, error: String(e) };
  }
  const time = now() - start;
  return { ...judge(code, fault, result), time, late: time > TIME_LIMIT };
}
