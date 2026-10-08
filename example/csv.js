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
  const rows = parse(text);
  if (op === 'rows') {
    return rows;
  }
  if (op === 'column') {
    return column(rows, arg);
  }
  if (op === 'sum') {
    return sum(column(rows, arg));
  }
  if (op === 'format') {
    return format(rows);
  }
  if (op === 'shape') {
    return [rows.length, rows.length === 0 ? 0 : rows[0].length];
  }
  throw 'unknown operation: ' + op;
}

function parse(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  let i = 0;
  while (i < text.length) {
    const ch = text.charAt(i);
    if (quoted) {
      if (ch === '"') {
        if (i + 1 < text.length && text.charAt(i + 1) === '"') {
          field = field + '"';
          i = i + 1;
        } else {
          quoted = false;
        }
      } else {
        field = field + ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field = field + ch;
    }
    i = i + 1;
  }
  if (quoted) {
    throw 'unterminated quote';
  }
  if (field.length > 0 && row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  for (let r = 1; r < rows.length; r++) {
    if (rows[r].length !== rows[0].length) {
      throw 'ragged row ' + r;
    }
  }
  return rows;
}

function column(rows, name) {
  if (rows.length === 0) {
    throw 'no header';
  }
  const index = rows[0].indexOf(name);
  if (index < 0) {
    throw 'no column ' + name;
  }
  const values = [];
  for (let r = 1; r < rows.length; r++) {
    values.push(rows[r][index]);
  }
  return values;
}

function sum(values) {
  let total = 0;
  for (let i = 0; i < values.length; i++) {
    const n = Number(values[i]);
    if (values[i].trim() === '' || Number.isNaN(n)) {
      throw 'not a number: ' + values[i];
    }
    total = total + n;
  }
  return total;
}

function quote(field) {
  if (field.indexOf(',') < 0 && field.indexOf('"') < 0 && field.indexOf('\n') < 0) {
    return field;
  }
  let out = '"';
  for (let i = 0; i < field.length; i++) {
    const ch = field.charAt(i);
    out = out + (ch === '"' ? '""' : ch);
  }
  return out + '"';
}

function format(rows) {
  const lines = [];
  for (let r = 0; r < rows.length; r++) {
    const fields = [];
    for (let c = 0; c < rows[r].length; c++) {
      fields.push(quote(rows[r][c]));
    }
    lines.push(fields.join(','));
  }
  return lines.join('\n');
}
