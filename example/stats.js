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
    results.push(compute(command[0], numbers(command[1]), command[2]));
  }
  return results;
}

function numbers(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw 'expected a non-empty list of numbers';
  }
  for (let i = 0; i < values.length; i++) {
    if (typeof values[i] !== 'number') {
      throw 'not a number: ' + values[i];
    }
  }
  return values;
}

function compute(op, values, arg) {
  if (op === 'mean') {
    return mean(values);
  }
  if (op === 'median') {
    return median(values);
  }
  if (op === 'variance') {
    return variance(values);
  }
  if (op === 'percentile') {
    return percentile(values, arg);
  }
  if (op === 'mode') {
    return mode(values);
  }
  if (op === 'histogram') {
    return histogram(values, arg);
  }
  throw 'unknown operation: ' + op;
}

function sorted(values) {
  const result = values.slice();
  for (let i = 1; i < result.length; i++) {
    const x = result[i];
    let j = i - 1;
    while (j >= 0 && result[j] > x) {
      result[j + 1] = result[j];
      j = j - 1;
    }
    result[j + 1] = x;
  }
  return result;
}

function mean(values) {
  let total = 0;
  for (let i = 0; i < values.length; i++) {
    total = total + values[i];
  }
  return total / values.length;
}

function median(values) {
  const s = sorted(values);
  const mid = Math.floor(s.length / 2);
  if (s.length % 2 === 1) {
    return s[mid];
  }
  return (s[mid] + s[mid + 1]) / 2;
}

function variance(values) {
  const m = mean(values);
  let total = 0;
  for (let i = 0; i < values.length; i++) {
    total = total + (values[i] - m) * (values[i] - m);
  }
  return total / values.length;
}

function percentile(values, p) {
  if (typeof p !== 'number' || p < 0 || p > 100) {
    throw 'bad percentile';
  }
  const s = sorted(values);
  const position = (p / 100) * (s.length - 1);
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const weight = position - lower;
  return s[lower] * (1 - weight) + s[upper] * weight;
}

function mode(values) {
  const s = sorted(values);
  let best = s[0];
  let bestCount = 0;
  let i = 0;
  while (i < s.length) {
    let j = i;
    while (j < s.length && s[j] === s[i]) {
      j = j + 1;
    }
    if (j - i > bestCount) {
      bestCount = j - i;
      best = s[i];
    }
    i = j;
  }
  return best;
}

function histogram(values, buckets) {
  if (!Number.isInteger(buckets) || buckets < 1) {
    throw 'bad bucket count';
  }
  const s = sorted(values);
  const low = s[0];
  const high = s[s.length - 1];
  const width = (high - low) / buckets;
  const counts = [];
  for (let b = 0; b < buckets; b++) {
    counts.push(0);
  }
  for (let i = 0; i < s.length; i++) {
    let b = width === 0 ? 0 : Math.floor((s[i] - low) / width);
    if (b >= buckets) {
      b = buckets - 1;
    }
    counts[b] = counts[b] + 1;
  }
  return counts;
}
