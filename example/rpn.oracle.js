function batch(commands) {
  if (!Array.isArray(commands)) {
    throw 'expected a list of commands';
  }
  const results = [];
  for (let i = 0; i < commands.length; i++) {
    const command = commands[i];
    if (!Array.isArray(command) || command.length !== 1) {
      throw 'malformed command';
    }
    results.push(evaluate(command[0]));
  }
  return results;
}

function evaluate(expression) {
  if (typeof expression !== 'string') {
    throw 'expected an expression';
  }
  const tokens = tokenize(expression);
  const stack = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (isOperator(token)) {
      if (stack.length < 2) {
        throw 'stack underflow';
      }
      const right = stack.pop();
      const left = stack.pop();
      stack.push(applyOperator(token, left, right));
    } else {
      stack.push(parseNumber(token));
    }
  }
  if (stack.length !== 1) {
    throw 'malformed expression';
  }
  return stack[0];
}

function tokenize(expression) {
  const tokens = [];
  let current = '';
  for (let i = 0; i < expression.length; i++) {
    const ch = expression.charAt(i);
    if (ch === ' ') {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
    } else {
      current = current + ch;
    }
  }
  if (current.length > 0) {
    tokens.push(current);
  }
  return tokens;
}

function isOperator(token) {
  return token === '+' || token === '-' || token === '*' || token === '/' || token === '^';
}

function parseNumber(token) {
  let sign = 1;
  let i = 0;
  if (token.charAt(0) === '-') {
    sign = -1;
    i = 1;
  }
  if (i >= token.length) {
    throw 'bad number: ' + token;
  }
  let value = 0;
  let scale = 0;
  for (; i < token.length; i++) {
    const code = token.charCodeAt(i);
    if (code === 46 && scale === 0) {
      scale = 1;
    } else if (code >= 48 && code <= 57) {
      value = value * 10 + (code - 48);
      scale = scale * 10;
    } else {
      throw 'bad number: ' + token;
    }
  }
  return sign * (scale > 0 ? value / scale : value);
}

function applyOperator(op, left, right) {
  if (op === '+') {
    return left + right;
  }
  if (op === '-') {
    return left - right;
  }
  if (op === '*') {
    return left * right;
  }
  if (op === '/') {
    if (right === 0) {
      throw 'division by zero';
    }
    return left / right;
  }
  let result = 1;
  for (let i = 0; i < right; i++) {
    result = result * left;
  }
  return result;
}
