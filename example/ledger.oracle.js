function batch(commands) {
  if (!Array.isArray(commands)) {
    throw 'expected a list of commands';
  }
  const accounts = {};
  const results = [];
  for (let i = 0; i < commands.length; i++) {
    const command = commands[i];
    if (!Array.isArray(command) || command.length < 2) {
      throw 'malformed command';
    }
    results.push(execute(accounts, command));
  }
  return results;
}

function execute(accounts, command) {
  const op = command[0];
  const name = checkName(command[1]);
  if (op === 'open') {
    if (accounts[name] !== undefined) {
      throw 'duplicate account: ' + name;
    }
    accounts[name] = { balance: 0, history: [] };
    return 'opened ' + name;
  }
  const account = accounts[name];
  if (account === undefined) {
    throw 'unknown account: ' + name;
  }
  if (op === 'deposit') {
    return deposit(account, checkAmount(command[2]));
  }
  if (op === 'withdraw') {
    return withdraw(account, checkAmount(command[2]));
  }
  if (op === 'transfer') {
    const other = accounts[checkName(command[2])];
    if (other === undefined) {
      throw 'unknown account: ' + command[2];
    }
    const amount = checkAmount(command[3]);
    withdraw(account, amount);
    deposit(other, amount);
    return 'moved ' + amount;
  }
  if (op === 'balance') {
    return account.balance;
  }
  if (op === 'statement') {
    return statement(account, command[2]);
  }
  throw 'unknown operation: ' + op;
}

function checkName(name) {
  if (typeof name !== 'string' || name.length === 0) {
    throw 'bad account name';
  }
  return name.toLowerCase();
}

function checkAmount(amount) {
  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0) {
    throw 'bad amount';
  }
  return amount;
}

function deposit(account, amount) {
  account.balance = account.balance + amount;
  account.history.push(amount);
  return account.balance;
}

function withdraw(account, amount) {
  if (amount > account.balance) {
    throw 'insufficient funds';
  }
  account.balance = account.balance - amount;
  account.history.push(-amount);
  return account.balance;
}

function statement(account, last) {
  const history = account.history;
  let count = history.length;
  if (typeof last === 'number' && last >= 0 && last < count) {
    count = last;
  }
  const lines = [];
  for (let i = history.length - count; i < history.length; i++) {
    const amount = history[i];
    lines.push((amount < 0 ? 'out ' : 'in ') + Math.abs(amount));
  }
  return lines.join(', ');
}
