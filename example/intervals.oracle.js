function batch(commands) {
  if (!Array.isArray(commands)) {
    throw 'expected a list of commands';
  }
  const results = [];
  for (let i = 0; i < commands.length; i++) {
    const command = commands[i];
    if (!Array.isArray(command) || command.length < 2) {
      throw 'malformed command';
    }
    results.push(run(command[0], command[1], command[2]));
  }
  return results;
}

function run(op, a, b) {
  if (op === 'merge') {
    return merge(normalize(a));
  }
  if (op === 'intersect') {
    return intersect(merge(normalize(a)), merge(normalize(b)));
  }
  if (op === 'contains') {
    return contains(merge(normalize(a)), b);
  }
  if (op === 'gaps') {
    return gaps(merge(normalize(a)));
  }
  if (op === 'total') {
    return total(merge(normalize(a)));
  }
  throw 'unknown operation: ' + op;
}

function normalize(list) {
  if (!Array.isArray(list)) {
    throw 'expected a list of intervals';
  }
  const result = [];
  for (let i = 0; i < list.length; i++) {
    const iv = list[i];
    if (!Array.isArray(iv) || iv.length !== 2 || typeof iv[0] !== 'number' || typeof iv[1] !== 'number') {
      throw 'bad interval at ' + i;
    }
    const lo = Math.min(iv[0], iv[1]);
    const hi = Math.max(iv[0], iv[1]);
    let j = result.length;
    while (j > 0 && (result[j - 1][0] > lo || (result[j - 1][0] === lo && result[j - 1][1] > hi))) {
      j = j - 1;
    }
    result.splice(j, 0, [lo, hi]);
  }
  return result;
}

function merge(sortedList) {
  const result = [];
  for (let i = 0; i < sortedList.length; i++) {
    const iv = sortedList[i];
    if (result.length > 0 && iv[0] <= result[result.length - 1][1]) {
      const last = result[result.length - 1];
      last[1] = Math.max(last[1], iv[1]);
    } else {
      result.push([iv[0], iv[1]]);
    }
  }
  return result;
}

function intersect(a, b) {
  const result = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const lo = Math.max(a[i][0], b[j][0]);
    const hi = Math.min(a[i][1], b[j][1]);
    if (lo <= hi) {
      result.push([lo, hi]);
    }
    if (a[i][1] < b[j][1]) {
      i = i + 1;
    } else {
      j = j + 1;
    }
  }
  return result;
}

function contains(merged, point) {
  if (typeof point !== 'number') {
    throw 'expected a point';
  }
  let lo = 0;
  let hi = merged.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (point < merged[mid][0]) {
      hi = mid - 1;
    } else if (point > merged[mid][1]) {
      lo = mid + 1;
    } else {
      return true;
    }
  }
  return false;
}

function gaps(merged) {
  const result = [];
  for (let i = 1; i < merged.length; i++) {
    result.push([merged[i - 1][1], merged[i][0]]);
  }
  return result;
}

function total(merged) {
  let sum = 0;
  for (let i = 0; i < merged.length; i++) {
    sum = sum + (merged[i][1] - merged[i][0]);
  }
  return sum;
}
