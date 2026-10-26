export function binaryWordsThrough(maximum) {
  const result = [];
  for (let length = 1; length <= maximum; length++) {
    for (let bits = 0; bits < 2 ** length; bits++) {
      result.push(Array.from({ length }, (_, bit) => bits & 2 ** bit ? "a" : "b").join(""));
    }
  }
  return result;
}

export function osaDistance(query, target) {
  const rows = Array.from({ length: query.length + 1 }, () => Array(target.length + 1).fill(0));
  for (let i = 0; i <= query.length; i++) rows[i][0] = i;
  for (let j = 0; j <= target.length; j++) rows[0][j] = j;
  for (let i = 1; i <= query.length; i++) {
    for (let j = 1; j <= target.length; j++) {
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + (query[i - 1] === target[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && query[i - 1] === target[j - 2] && query[i - 2] === target[j - 1]) {
        rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
      }
    }
  }
  return rows[query.length][target.length];
}

export function fragmentDistance(query, token) {
  const q = [...query], t = [...token];
  let best = q.length;
  for (let start = 0; start < t.length; start++) {
    for (let end = start + 1; end <= t.length; end++) best = Math.min(best, osaDistance(q, t.slice(start, end)));
  }
  return best;
}

export function fragmentWitness(query, token) {
  const q = [...query], t = [...token];
  let best = null;
  for (let start = 0; start < t.length; start++) {
    for (let end = start + 1; end <= t.length; end++) {
      const edits = osaDistance(q, t.slice(start, end));
      if (!best || edits < best.edits || (edits === best.edits &&
          (start < best.start || (start === best.start && end < best.end)))) best = { edits, start, end };
    }
  }
  return best;
}
