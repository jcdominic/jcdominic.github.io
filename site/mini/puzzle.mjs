// A calendar day is shared by everyone. UTC arithmetic on Pacific date parts
// keeps daylight-saving changes from shifting issue numbers.
const firstDay = Date.UTC(2026, 10, 27);
const dayMs = 86_400_000;
const pacific = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles", year: "numeric", month: "numeric", day: "numeric",
});
export function issueToday(date = new Date()) {
  const parts = Object.fromEntries(pacific.formatToParts(date).map(p => [p.type, p.value]));
  return 1 + (Date.UTC(parts.year, parts.month - 1, parts.day) - firstDay) / dayMs;
}
export function issueDate(issue) {
  return new Date(firstDay + (issue - 1) * dayMs);
}
export function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  return Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
}
export function readPuzzle({rows, across, down}) {
  const solution = [...rows.join("")];
  const numbers = new Map();
  const entries = [];
  const at = solution.map(() => ({}));
  const open = i => solution[i] && solution[i] !== "#";
  let number = 0;
  for (let i = 0; i < 25; i++) {
    if (open(i) && (i % 5 === 0 || !open(i - 1) || !open(i - 5))) numbers.set(i, ++number);
  }
  for (const [dir, clues] of [["across", across], ["down", down]]) {
    let clueIndex = 0;
    for (const [i, num] of numbers) {
      const horizontal = dir === "across";
      if (horizontal ? i % 5 && open(i - 1) : open(i - 5)) continue;
      const cells = [];
      for (let j = i; open(j); j += horizontal ? 1 : 5) {
        cells.push(j);
        at[j][dir] = entries.length;
        if (horizontal && j % 5 === 4) break;
      }
      entries.push({dir, num, cells, clue: clues[clueIndex++]});
    }
  }
  return {solution, numbers, entries, at};
}

export function initialState(puzzle, saved) {
  const letters = Array(25).fill("");
  if (Array.isArray(saved?.letters) && saved.letters.length === 25) {
    saved.letters.forEach((ch, i) => {
      if (puzzle.solution[i] !== "#" && typeof ch === "string" && /^[A-Z]$/.test(ch)) letters[i] = ch;
    });
  }
  return {
    letters,
    cell: Number.isInteger(saved?.cell) && puzzle.at[saved.cell]?.across != null
      ? saved.cell : puzzle.entries[0].cells[0],
    dir: saved?.dir === "down" ? "down" : "across",
    ms: Number.isFinite(saved?.ms) ? Math.max(0, saved.ms) : 0,
    started: saved?.started === true,
    checked: saved?.checked === true,
    solvedDay: Number.isInteger(saved?.solvedDay) ? saved.solvedDay : null,
    solved: puzzle.solution.every((ch, i) => ch === "#" || ch === letters[i]),
  };
}

export function nextEntry(puzzle, state, step, skipFilled = false) {
  const {entries, at} = puzzle;
  const start = at[state.cell][state.dir];
  for (let offset = 1; offset <= entries.length; offset++) {
    const id = (start + step * offset + entries.length) % entries.length;
    const entry = entries[id];
    const blank = entry.cells.find(i => !state.letters[i]);
    if (!skipFilled || blank !== undefined) {
      state.dir = entry.dir;
      state.cell = blank ?? entry.cells[0];
      return;
    }
  }
}

export function writeLetter(puzzle, state, letter) {
  const entry = puzzle.entries[puzzle.at[state.cell][state.dir]];
  const pos = entry.cells.indexOf(state.cell);
  // Fixing a letter in a finished word moves one square on, like the NYT app,
  // instead of jumping away to the next open clue.
  const wasFull = entry.cells.every(i => state.letters[i]);
  state.letters[state.cell] = letter;
  if (puzzle.solution.every((ch, i) => ch === "#" || state.letters[i])) {
    state.solved = puzzle.solution.every((ch, i) => ch === "#" || ch === state.letters[i]);
    if (!state.solved && pos + 1 < entry.cells.length) state.cell = entry.cells[pos + 1];
    return state.solved ? "solved" : "check";
  }
  const next = wasFull ? entry.cells[pos + 1]
    : entry.cells.slice(pos + 1).find(i => !state.letters[i]) ?? entry.cells.find(i => !state.letters[i]);
  if (next !== undefined) state.cell = next;
  else nextEntry(puzzle, state, 1, true);
}

export function eraseLetter(puzzle, state) {
  if (state.letters[state.cell]) {
    state.letters[state.cell] = "";
    return;
  }
  const id = puzzle.at[state.cell][state.dir];
  const cells = puzzle.entries[id].cells;
  const pos = cells.indexOf(state.cell);
  if (pos > 0) state.cell = cells[pos - 1];
  else {
    // From the start of a word, back up into the end of the previous clue.
    const previous = puzzle.entries[(id - 1 + puzzle.entries.length) % puzzle.entries.length];
    state.dir = previous.dir;
    state.cell = previous.cells.at(-1);
  }
  state.letters[state.cell] = "";
}

// The next open square from `cell` in a direction, hopping over blocks.
export function step(puzzle, cell, delta) {
  const across = Math.abs(delta) === 1;
  for (let i = cell + delta; i >= 0 && i < 25; i += delta) {
    if (across && Math.floor(i / 5) !== Math.floor(cell / 5)) break;
    if (puzzle.solution[i] !== "#") return i;
  }
  return cell;
}

export function mistakes(puzzle, state) {
  return puzzle.solution.map((ch, i) => ch !== "#" && state.letters[i] !== "" && state.letters[i] !== ch);
}

// Consecutive daily minis solved on the day they came out, counting back from
// today, or from yesterday when today's is still open.
export function streak(records, today) {
  const solvedOnTime = new Set(records.filter(r => r.solved && r.solvedDay === r.n).map(r => r.n));
  let n = solvedOnTime.has(today) ? today : today - 1;
  let count = 0;
  while (solvedOnTime.has(n)) { count++; n--; }
  return count;
}
