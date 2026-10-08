function batch(commands) {
  if (!Array.isArray(commands)) {
    throw 'expected a list of commands';
  }
  const results = [];
  for (let i = 0; i < commands.length; i++) {
    const command = commands[i];
    if (!Array.isArray(command) || command.length === 0) {
      throw 'malformed command';
    }
    results.push(run(command[0], command[1], command[2]));
  }
  return results;
}

function run(op, a, b) {
  if (op === 'transpose') {
    return transpose(check(a));
  }
  if (op === 'add') {
    return add(check(a), check(b));
  }
  if (op === 'multiply') {
    return multiply(check(a), check(b));
  }
  if (op === 'trace') {
    return trace(check(a));
  }
  if (op === 'identity') {
    return identity(a);
  }
  throw 'unknown operation: ' + op;
}

function check(m) {
  if (!Array.isArray(m) || m.length === 0) {
    throw 'not a matrix';
  }
  const width = Array.isArray(m[0]) ? m[0].length : -1;
  for (let i = 0; i < m.length; i++) {
    if (!Array.isArray(m[i]) || m[i].length !== width || width === 0) {
      throw 'ragged matrix';
    }
    for (let j = 0; j < width; j++) {
      if (typeof m[i][j] !== 'number') {
        throw 'not a number at ' + i + ',' + j;
      }
    }
  }
  return m;
}

function transpose(m) {
  const result = [];
  for (let j = 0; j < m[0].length; j++) {
    const row = [];
    for (let i = 0; i < m.length; i++) {
      row.push(m[i][j]);
    }
    result.push(row);
  }
  return result;
}

function add(a, b) {
  if (a.length !== b.length || a[0].length !== b[0].length) {
    throw 'shape mismatch';
  }
  const result = [];
  for (let i = 0; i < a.length; i++) {
    const row = [];
    for (let j = 0; j < a[0].length; j++) {
      row.push(a[i][j] + b[i][j]);
    }
    result.push(row);
  }
  return result;
}

function multiply(a, b) {
  if (a[0].length !== b.length) {
    throw 'shape mismatch';
  }
  const result = [];
  for (let i = 0; i < a.length; i++) {
    const row = [];
    for (let j = 0; j < b[0].length; j++) {
      let sum = 0;
      for (let k = 0; k < a.length; k++) {
        sum = sum + a[i][k] * b[k][j];
      }
      row.push(sum);
    }
    result.push(row);
  }
  return result;
}

function trace(m) {
  if (m.length !== m[0].length) {
    throw 'not square';
  }
  let sum = 0;
  for (let i = 0; i < m.length; i++) {
    sum = sum + m[i][i];
  }
  return sum;
}

function identity(n) {
  if (!Number.isInteger(n) || n < 1) {
    throw 'bad size';
  }
  const result = [];
  for (let i = 0; i < n; i++) {
    const row = [];
    for (let j = 0; j < n; j++) {
      row.push(i === j ? 1 : 0);
    }
    result.push(row);
  }
  return result;
}
