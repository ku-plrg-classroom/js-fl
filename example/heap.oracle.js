function batch(commands) {
  if (!Array.isArray(commands)) {
    throw 'expected a list of commands';
  }
  const heap = [];
  const results = [];
  for (let i = 0; i < commands.length; i++) {
    const command = commands[i];
    if (!Array.isArray(command) || command.length === 0) {
      throw 'malformed command';
    }
    results.push(execute(heap, command[0], command[1]));
  }
  return results;
}

function execute(heap, op, value) {
  if (op === 'push') {
    if (typeof value !== 'number') {
      throw 'expected a number';
    }
    push(heap, value);
    return heap.length;
  }
  if (op === 'pop') {
    return pop(heap);
  }
  if (op === 'peek') {
    return heap.length === 0 ? null : heap[0];
  }
  if (op === 'size') {
    return heap.length;
  }
  if (op === 'drain') {
    const out = [];
    while (heap.length > 0) {
      out.push(pop(heap));
    }
    return out;
  }
  if (op === 'kth') {
    return kth(heap, value);
  }
  throw 'unknown operation: ' + op;
}

function swap(heap, i, j) {
  const tmp = heap[i];
  heap[i] = heap[j];
  heap[j] = tmp;
}

function push(heap, value) {
  heap.push(value);
  let i = heap.length - 1;
  while (i > 0) {
    const parent = Math.floor((i - 1) / 2);
    if (heap[parent] <= heap[i]) {
      break;
    }
    swap(heap, parent, i);
    i = parent;
  }
}

function pop(heap) {
  if (heap.length === 0) {
    throw 'empty heap';
  }
  const top = heap[0];
  const last = heap.pop();
  if (heap.length > 0) {
    heap[0] = last;
    siftDown(heap, 0);
  }
  return top;
}

function siftDown(heap, i) {
  const n = heap.length;
  while (true) {
    const left = 2 * i + 1;
    const right = 2 * i + 2;
    let smallest = i;
    if (left < n && heap[left] < heap[smallest]) {
      smallest = left;
    }
    if (right < n && heap[right] < heap[smallest]) {
      smallest = right;
    }
    if (smallest === i) {
      return;
    }
    swap(heap, i, smallest);
    i = smallest;
  }
}

function kth(heap, k) {
  if (!Number.isInteger(k) || k < 1 || k > heap.length) {
    throw 'bad k';
  }
  const copy = heap.slice();
  let value = null;
  for (let i = 0; i < k; i++) {
    value = pop(copy);
  }
  return value;
}
