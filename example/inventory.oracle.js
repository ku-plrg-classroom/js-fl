function batch(commands) {
  if (!Array.isArray(commands)) {
    throw 'expected a list of commands';
  }
  const store = { names: [], counts: [], prices: [] };
  const results = [];
  for (let i = 0; i < commands.length; i++) {
    const command = commands[i];
    if (!Array.isArray(command) || command.length === 0) {
      throw 'malformed command';
    }
    results.push(execute(store, command));
  }
  return results;
}

function execute(store, command) {
  const op = command[0];
  if (op === 'stock') {
    return stock(store, command[1], command[2], command[3]);
  }
  if (op === 'sell') {
    return sell(store, command[1], command[2]);
  }
  if (op === 'count') {
    return count(store, command[1]);
  }
  if (op === 'value') {
    return value(store);
  }
  if (op === 'low') {
    return low(store, command[1]);
  }
  if (op === 'report') {
    return report(store);
  }
  throw 'unknown operation: ' + op;
}

function find(store, name) {
  if (typeof name !== 'string' || name.length === 0) {
    throw 'bad item name';
  }
  return store.names.indexOf(name);
}

function checkQuantity(quantity) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw 'bad quantity';
  }
  return quantity;
}

function stock(store, name, quantity, price) {
  const index = find(store, name);
  const q = checkQuantity(quantity);
  if (index < 0) {
    if (typeof price !== 'number' || price < 0) {
      throw 'bad price';
    }
    store.names.push(name);
    store.counts.push(q);
    store.prices.push(price);
    return q;
  }
  store.counts[index] = store.counts[index] + q;
  if (typeof price === 'number' && price >= 0) {
    store.prices[index] = price;
  }
  return store.counts[index];
}

function sell(store, name, quantity) {
  const index = find(store, name);
  const q = checkQuantity(quantity);
  if (index < 0) {
    throw 'unknown item: ' + name;
  }
  if (store.counts[index] < q) {
    throw 'not enough ' + name;
  }
  store.counts[index] = store.counts[index] - q;
  return store.counts[index] * store.prices[index];
}

function count(store, name) {
  const index = find(store, name);
  return index < 0 ? 0 : store.counts[index];
}

function value(store) {
  let total = 0;
  for (let i = 0; i < store.names.length; i++) {
    total = total + store.counts[i] * store.prices[i];
  }
  return total;
}

function low(store, threshold) {
  if (typeof threshold !== 'number') {
    throw 'bad threshold';
  }
  const result = [];
  for (let i = 0; i < store.names.length; i++) {
    if (store.counts[i] <= threshold) {
      result.push(store.names[i]);
    }
  }
  return result;
}

function report(store) {
  const lines = [];
  for (let i = 0; i < store.names.length; i++) {
    lines.push(store.names[i] + ': ' + store.counts[i] + ' @ ' + store.prices[i]);
  }
  return lines.join('; ');
}
