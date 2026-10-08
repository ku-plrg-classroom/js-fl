function batch(commands) {
  if (!Array.isArray(commands)) {
    throw 'expected a list of commands';
  }
  const results = [];
  for (let i = 0; i < commands.length; i++) {
    const command = commands[i];
    if (!Array.isArray(command) || typeof command[1] !== 'string') {
      throw 'malformed command';
    }
    results.push(run(command[0], command[1], command[2]));
  }
  return results;
}

function run(op, text, arg) {
  if (op === 'words') {
    return words(text);
  }
  if (op === 'camel') {
    return camel(text);
  }
  if (op === 'snake') {
    return snake(text);
  }
  if (op === 'title') {
    return title(text);
  }
  if (op === 'count') {
    return count(text, arg);
  }
  if (op === 'acronym') {
    return acronym(text);
  }
  throw 'unknown operation: ' + op;
}

function isLetter(ch) {
  const code = ch.charCodeAt(0);
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function isDigit(ch) {
  const code = ch.charCodeAt(0);
  return code >= 48 && code <= 57;
}

function isUpper(ch) {
  const code = ch.charCodeAt(0);
  return code >= 65 && code <= 90;
}

function words(text) {
  const result = [];
  let current = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text.charAt(i);
    if (isLetter(ch) || isDigit(ch)) {
      if (current.length > 0 && isUpper(ch) && !isUpper(text.charAt(i - 1))) {
        result.push(current);
        current = '';
      }
      current = current + ch;
    } else if (current.length > 0) {
      result.push(current);
      current = '';
    }
  }
  if (current.length > 0) {
    result.push(current);
  }
  return result;
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function camel(text) {
  const parts = words(text);
  let result = '';
  for (let i = 0; i < parts.length; i++) {
    result = result + (i === 0 ? parts[i].toLowerCase() : capitalize(parts[i]));
  }
  return result;
}

function snake(text) {
  const parts = words(text);
  const lowered = [];
  for (let i = 0; i < parts.length; i++) {
    lowered.push(parts[i].toLowerCase());
  }
  return lowered.join('_');
}

function title(text) {
  const parts = words(text);
  const result = [];
  for (let i = 0; i < parts.length; i++) {
    result.push(capitalize(parts[i]));
  }
  return result.join(' ');
}

function count(text, word) {
  if (typeof word !== 'string') {
    throw 'expected a word';
  }
  const parts = words(text);
  let n = 0;
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].toLowerCase() === word.toLowerCase()) {
      n = n + 1;
    }
  }
  return n;
}

function acronym(text) {
  const parts = words(text);
  let result = '';
  for (let i = 0; i < parts.length; i++) {
    result = result + parts[i].charAt(0).toUpperCase();
  }
  return result;
}
