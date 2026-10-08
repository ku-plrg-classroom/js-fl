function batch(commands) {
  if (!Array.isArray(commands)) {
    throw 'expected a list of commands';
  }
  const results = [];
  for (let i = 0; i < commands.length; i++) {
    const command = commands[i];
    if (!Array.isArray(command) || command.length !== 2) {
      throw 'malformed command';
    }
    results.push(convert(command[0], command[1]));
  }
  return results;
}

function convert(op, value) {
  if (op === 'toRoman') {
    return toRoman(value);
  }
  if (op === 'fromRoman') {
    return fromRoman(value);
  }
  if (op === 'add') {
    return toRoman(fromRoman(value[0]) + fromRoman(value[1]));
  }
  if (op === 'isValid') {
    return isValid(value);
  }
  throw 'unknown operation: ' + op;
}

function digitValue(ch) {
  if (ch === 'I') {
    return 1;
  }
  if (ch === 'V') {
    return 5;
  }
  if (ch === 'X') {
    return 10;
  }
  if (ch === 'L') {
    return 50;
  }
  if (ch === 'C') {
    return 100;
  }
  if (ch === 'D') {
    return 500;
  }
  if (ch === 'M') {
    return 1000;
  }
  throw 'bad roman digit: ' + ch;
}

function fromRoman(text) {
  if (typeof text !== 'string' || text.length === 0) {
    throw 'expected a roman numeral';
  }
  let total = 0;
  for (let i = 0; i < text.length; i++) {
    const value = digitValue(text.charAt(i));
    const next = i + 1 < text.length ? digitValue(text.charAt(i + 1)) : 0;
    if (value < next) {
      total = total - value;
    } else {
      total = total + value;
    }
  }
  return total;
}

function toRoman(n) {
  if (!Number.isInteger(n) || n < 1 || n > 3999) {
    throw 'out of range: ' + n;
  }
  const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const symbols = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
  let result = '';
  let rest = n;
  for (let i = 0; i < values.length; i++) {
    while (rest >= values[i]) {
      result = result + symbols[i];
      rest = rest - values[i];
    }
  }
  return result;
}

function isValid(text) {
  if (typeof text !== 'string' || text.length === 0) {
    return false;
  }
  for (let i = 0; i < text.length; i++) {
    if ('IVXLCDM'.indexOf(text.charAt(i)) < 0) {
      return false;
    }
  }
  return toRoman(fromRoman(text)) === text;
}
