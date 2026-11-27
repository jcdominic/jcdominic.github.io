import {issueToday, issueDate, readPuzzle, formatTime, initialState, writeLetter, eraseLetter, nextEntry, step, mistakes, streak} from "./puzzle.mjs";
import {record, everyone, recording} from "./results.mjs";

const $ = id => document.getElementById(id);
const dateFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
});
const shortDate = new Intl.DateTimeFormat("en-US", {month: "short", day: "numeric", timeZone: "UTC"});
const today = () => Math.max(1, issueToday());
const latest = today();
const requested = new URLSearchParams(location.search).get("n");
const validRequest = /^[1-9]\d*$/.test(requested ?? "") && Number(requested) <= latest;
const issue = validRequest ? Number(requested) : latest;
const dailyView = !validRequest;
const prefix = "pocket-mini:v1:";
const key = prefix + issue;
const touch = matchMedia("(pointer: coarse)").matches;
const panel = $("panel");
const board = $("board");
const cells = [];
const labels = [];
let puzzle, state, puzzleNumber;
let solveSent = Promise.resolve();
let runningSince = null;
let saveTask = 0;
let engaged = false;
let previousClue, previousCross;
let dialogKind;
let savedHere = true;

function loadRecord(id) {
  try { return JSON.parse(localStorage.getItem(id)); }
  catch { return null; }
}
function elapsed() {
  return state.ms + (runningSince === null ? 0 : performance.now() - runningSince);
}
function save() {
  clearTimeout(saveTask);
  if (!state || !state.started) return;
  try {
    // A second tab must never reopen or replace a finished result.
    const existing = loadRecord(key);
    if (existing?.solved && !state.solved) {
      adoptFinished(existing);
      return;
    }
    localStorage.setItem(key, JSON.stringify({...state, ms: Math.round(elapsed())}));
  } catch { savedHere = false; }
}
function startClock() {
  if (!state.solved && !panel.open && !document.hidden && runningSince === null) {
    if (!state.started) {
      state.started = true;
      send("start");
    }
    runningSince = performance.now();
  }
}
// One anonymous row per start, check and solve, for measuring difficulty.
function send(event, extra) {
  return record({
    issue, puzzle: puzzleNumber, event, ms: Math.round(elapsed()),
    checked: state.checked, on_day: issue === today(), touch, ...extra,
  });
}
function stopClock() {
  if (runningSince !== null) {
    state.ms = elapsed();
    runningSince = null;
  }
  save();
}
function adoptFinished(record) {
  const restored = initialState(puzzle, record);
  if (restored.solved) {
    runningSince = null;
    state = restored;
    render();
  }
}
function clockFace() {
  if (state) $("elapsed").textContent = formatTime(elapsed());
}
function node(tag, text, className) {
  const el = document.createElement(tag);
  el.textContent = text;
  if (className) el.className = className;
  return el;
}
function action(text, fn) {
  const el = node("button", text, "primary");
  el.addEventListener("click", fn);
  return el;
}
function focusCell() {
  cells[state.cell].focus({preventScroll: true});
}
function interact() {
  engaged = true;
  startClock();
  render();
  focusCell();
  clearTimeout(saveTask);
  saveTask = setTimeout(save, 200);
}
function changeClue(delta) {
  nextEntry(puzzle, state, delta);
  interact();
}
function feedback(text, button) {
  const el = $("feedback");
  el.replaceChildren(text);
  if (button) el.append(" ", button);
}
function boardKey(value) {
  if (state.solved && (value === "Backspace" || /^[A-Z]$/.test(value))) return;
  let outcome;
  if (/^[A-Z]$/.test(value)) {
    startClock();
    outcome = writeLetter(puzzle, state, value);
  } else if (value === "Backspace") {
    eraseLetter(puzzle, state);
  } else if (value === "Switch") {
    state.dir = state.dir === "across" ? "down" : "across";
  } else {
    // Like the NYT app: an arrow across the current direction only turns.
    const dir = value === "ArrowLeft" || value === "ArrowRight" ? "across" : "down";
    if (dir === state.dir) {
      state.cell = step(puzzle, state.cell, {ArrowLeft: -1, ArrowRight: 1, ArrowUp: -5, ArrowDown: 5}[value]);
    }
    state.dir = dir;
  }
  if (outcome === "solved") {
    state.solvedDay = today();
    feedback("");
    stopClock();
    solveSent = send("solve");
    render();
    celebrate();
    showPanel("solved");
    return;
  }
  if (outcome === "check" && !state.checked) {
    feedback("The grid is full, but something’s off.", Object.assign(node("button", "Show mistakes", "link"), {onclick: revealMistakes}));
  } else if (outcome !== "check") feedback("");
  interact();
}
function revealMistakes() {
  state.checked = true;
  send("check", {wrong: mistakes(puzzle, state).flatMap((wrong, i) => wrong ? [i] : [])});
  feedback("Wrong letters are marked in red. Solves with a check still count, but they don’t set a best time.");
  interact();
}
function celebrate() {
  board.classList.remove("celebrate");
  void board.offsetWidth;
  board.classList.add("celebrate");
}
function buildGrid() {
  for (let row = 0; row < 5; row++) {
    const line = node("div", "", "board-row");
    line.setAttribute("role", "row");
    for (let col = 0; col < 5; col++) {
      const i = row * 5 + col;
      const cell = node("div", "", "cell");
      cell.setAttribute("role", "gridcell");
      cell.style.setProperty("--i", row + col);
      cells[i] = cell;
      line.append(cell);
      if (puzzle.solution[i] === "#") {
        cell.classList.add("block");
        cell.setAttribute("aria-label", "Block");
        continue;
      }
      cell.append(node("span", puzzle.numbers.get(i) ?? "", "num"), node("span", "", "letter"));
      cell.addEventListener("click", () => {
        if (engaged && state.cell === i) state.dir = state.dir === "across" ? "down" : "across";
        state.cell = i;
        interact();
      });
    }
    board.append(line);
  }
  puzzle.entries.forEach((entry, index) => {
    const btn = node("button", "");
    btn.append(node("b", entry.num), node("span", entry.clue));
    btn.setAttribute("aria-label", entry.num + " " + entry.dir + ". " + entry.clue);
    btn.onclick = () => {
      state.dir = entry.dir;
      state.cell = entry.cells.find(i => !state.letters[i]) ?? entry.cells[0];
      interact();
      if (board.getBoundingClientRect().bottom < 0) board.scrollIntoView({block: "start"});
    };
    const item = node("li", "");
    item.append(btn);
    $(entry.dir).append(item);
    labels[index] = btn;
  });
  for (const chars of ["QWERTYUIOP", "ASDFGHJKL", "↕ZXCVBNM⌫"]) {
    const row = node("div", "", "key-row");
    for (const char of chars) {
      const special = char === "↕" || char === "⌫";
      const btn = node("button", char, special ? "key wide" : "key");
      const value = char === "↕" ? "Switch" : char === "⌫" ? "Backspace" : char;
      btn.tabIndex = -1;
      if (special) btn.setAttribute("aria-label", char === "↕" ? "Switch direction" : "Backspace");
      // Acting on touch-down rather than on release makes fast thumbs feel instant.
      btn.addEventListener("pointerdown", e => {
        e.preventDefault();
        if (e.button === 0) boardKey(value);
      });
      row.append(btn);
    }
    $("keyboard").append(row);
  }
}
function render() {
  const id = puzzle.at[state.cell][state.dir];
  const entry = puzzle.entries[id];
  const cross = puzzle.at[state.cell][state.dir === "across" ? "down" : "across"];
  const wrong = state.checked ? mistakes(puzzle, state) : [];
  cells.forEach((cell, i) => {
    if (puzzle.solution[i] === "#") return;
    const current = state.cell === i;
    const ch = state.letters[i];
    cell.classList.toggle("word", entry.cells.includes(i));
    cell.classList.toggle("current", current);
    cell.classList.toggle("wrong", Boolean(wrong[i]));
    cell.tabIndex = current ? 0 : -1;
    cell.setAttribute("aria-selected", String(current));
    const label = [puzzle.numbers.get(i), ch || "Blank", wrong[i] && "Incorrect", current && (entry.num + " " + entry.dir + ". " + entry.clue)].filter(Boolean).join(". ");
    if (cell.getAttribute("aria-label") !== label) cell.setAttribute("aria-label", label);
    if (cell.lastChild.textContent !== ch) cell.lastChild.textContent = ch;
  });
  if (id !== previousClue) {
    labels[previousClue]?.classList.remove("selected");
    labels[id].classList.add("selected");
    $("active-id").textContent = entry.num + " " + entry.dir;
    $("active-text").textContent = entry.clue;
    previousClue = id;
  }
  if (cross !== previousCross) {
    labels[previousCross]?.classList.remove("crossing");
    labels[cross]?.classList.add("crossing");
    previousCross = cross;
  }
  board.classList.toggle("solved", state.solved);
  $("keyboard").hidden = state.solved;
  $("finish").hidden = !state.solved;
  $("finish-time").textContent = state.solved ? "Solved in " + formatTime(state.ms) + (state.checked ? " with a check" : "") : "";
  $("clock").disabled = state.solved;
  $("clock").setAttribute("aria-label", state.solved ? "Solved" : "Pause puzzle");
  $("clock-icon").textContent = state.solved ? "✓" : "";
  clockFace();
}

function readHistory() {
  const records = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k?.startsWith(prefix)) continue;
      const n = Number(k.slice(prefix.length));
      const record = loadRecord(k);
      if (Number.isInteger(n) && n > 0 && n <= today() && record?.started && Number.isFinite(record.ms)) records.push({...record, n});
    }
  } catch { savedHere = false; }
  const mine = records.findIndex(r => r.n === issue);
  if (state.started) {
    const current = {...state, ms: elapsed(), n: issue};
    if (mine === -1) records.push(current);
    else records[mine] = current;
  }
  return records.sort((a, b) => b.n - a.n);
}
function stats(records) {
  const solved = records.filter(r => r.solved);
  const clean = solved.filter(r => !r.checked);
  return {
    solved: solved.length,
    streak: streak(records, today()),
    best: clean.length ? Math.min(...clean.map(r => r.ms)) : null,
    average: solved.length ? solved.reduce((sum, r) => sum + r.ms, 0) / solved.length : null,
  };
}
function statRow(s) {
  const row = node("div", "", "stats");
  for (const [value, label] of [[s.solved, "Solved"], [s.streak, "Streak"], [s.best === null ? "–" : formatTime(s.best), "Best"], [s.average === null ? "–" : formatTime(s.average), "Average"]]) {
    const cell = node("div", "");
    cell.append(node("strong", String(value)), node("span", label));
    row.append(cell);
  }
  return row;
}
function untilTomorrow() {
  const now = new Date();
  for (let minutes = 1; minutes <= 26 * 60; minutes++) {
    if (issueToday(new Date(now.getTime() + minutes * 60_000)) > issueToday(now)) {
      const h = Math.floor(minutes / 60), m = minutes % 60;
      return h ? h + "h " + m + "m" : m + "m";
    }
  }
  return "a few hours";
}

function shareText() {
  const link = new URL(location.pathname, location.origin);
  link.searchParams.set("n", issue);
  const lastWord = puzzle.entries[puzzle.at[state.cell][state.dir]].cells;
  const picture = Array.from({length: 5}, (_, row) => puzzle.solution.slice(row * 5, row * 5 + 5)
    .map((ch, col) => ch === "#" ? "⬛" : lastWord.includes(row * 5 + col) ? "🟨" : "🟦").join("")).join("\n");
  const streakDays = stats(readHistory()).streak;
  const line = "Pocket Mini #" + issue + " · " + formatTime(state.ms) + (state.checked ? " (with a check)" : "") + " ✏️";
  return [line, picture, streakDays > 1 ? "🔥 " + streakDays + "-day streak" : "", link.href].filter(Boolean).join("\n");
}
async function shareResult(event) {
  const text = shareText();
  const btn = event.currentTarget;
  if (touch && navigator.share) {
    try {
      await navigator.share({text});
      return;
    } catch (error) {
      if (error.name === "AbortError") return;
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    const original = btn.textContent;
    btn.textContent = "Copied ✓";
    setTimeout(() => { btn.textContent = original; }, 2000);
  } catch {
    showPanel("copy");
    const field = document.createElement("textarea");
    field.rows = 9;
    field.readOnly = true;
    field.setAttribute("aria-label", "Result to copy");
    field.value = text;
    $("panel-body").append(field);
    field.select();
  }
}
function historyPanel(body) {
  const records = readHistory();
  body.append(statRow(stats(records)));
  if (!records.some(r => r.solved)) body.append(node("p", "Your solve times will show up here as you finish each mini."));
  const list = node("ul", "", "history");
  for (const record of records) {
    const a = node("a", "");
    a.href = "?n=" + record.n;
    const time = record.solved ? formatTime(record.ms) + (record.checked ? " · checked" : "") : "In progress";
    a.append(node("span", "№ " + record.n + " · " + shortDate.format(issueDate(record.n))), node("strong", time));
    if (record.checked) a.title = "Solved with a check";
    const li = node("li", "");
    li.append(a);
    list.append(li);
  }
  if (records.length) body.append(list);
  body.append(node("p", savedHere ? "Times are saved in this browser, so they stay on this device." : "Browser storage is off, so this visit’s progress lasts only until you leave.", "fine"));
  const archive = node("p", "", "archive");
  if (issue > 1) archive.append(Object.assign(node("a", "← Previous mini"), {href: "?n=" + (issue - 1)}));
  if (issue < latest) archive.append(Object.assign(node("a", "Next mini →", "next"), {href: issue + 1 === latest ? "./" : "?n=" + (issue + 1)}));
  if (archive.childNodes.length) body.append(archive);
}
function showPanel(kind) {
  dialogKind = kind;
  stopClock();
  const body = $("panel-body");
  body.replaceChildren();
  $("panel-title").textContent = {times: "My times", help: "How to play", pause: "Paused", solved: "Nice solve!", copy: "Copy your result"}[kind];
  if (kind === "help") {
    body.append(node("p", "Fill every square so each answer fits its clue and its crossings. Tap a square twice, or press Space, to switch between Across and Down."),
      node("p", "Tab and Shift+Tab (or Enter) jump between clues. Arrow keys move around the grid. Backspace erases. Escape leaves the grid."),
      node("p", "The clock starts on your first move and pauses when you leave the tab. A new mini arrives at midnight Pacific."));
  } else if (kind === "times") historyPanel(body);
  else if (kind === "pause") {
    body.append(node("p", "Your clock is stopped at " + formatTime(state.ms) + "."), action("Resume", () => panel.close()));
  } else if (kind === "solved") {
    body.append(node("p", "You finished Pocket Mini #" + issue + " in " + formatTime(state.ms) + (state.checked ? " with a check." : "."), "result"));
    const crowd = node("p", "", "crowd");
    body.append(crowd);
    compare(crowd);
    body.append(statRow(stats(readHistory())));
    body.append(action(touch && navigator.share ? "Share result ↗" : "Copy result ↗", shareResult));
    body.append(node("p", issue === latest ? "The next mini arrives in " + untilTomorrow() + "." : "", "fine"));
  }
  if (!panel.open) panel.showModal();
  (body.querySelector("button") ?? $("close")).focus();
}
// "Median so far" for this mini, filled in once the solve has been saved.
async function compare(el) {
  await solveSent;
  const row = await everyone(issue);
  if (!row || !el.isConnected || !row.solves) return;
  const mine = Math.round(state.ms);
  const others = [...row.times];
  if (recording && !state.checked && others.includes(mine)) others.splice(others.indexOf(mine), 1);
  if (row.solves <= 1) {
    el.textContent = issue === latest ? "You’re the first to finish today’s mini." : "You’re the first to finish this one.";
    return;
  }
  el.textContent = "Median so far: " + formatTime(row.median_ms);
  if (!state.checked && others.length) {
    el.append(document.createElement("br"), "You were faster than " + others.filter(t => t > mine).length + " of " + others.length + " other " + (others.length === 1 ? "solver" : "solvers") + ".");
  }
}
function checkDay() {
  if (today() > issue) {
    $("today-link").hidden = false;
    if (dailyView && !state.started && !panel.open) location.reload();
  }
}
function wireControls() {
  document.addEventListener("keydown", e => {
    if (panel.open || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
    const inGrid = board.contains(e.target);
    const onPage = inGrid || e.target === document.body;
    if (inGrid && e.key === "Escape") {
      $("next").focus();
      return;
    }
    if (inGrid && (e.key === "Tab" || e.key === "Enter")) {
      e.preventDefault();
      changeClue(e.shiftKey ? -1 : 1);
    } else if (/^[a-z]$/i.test(e.key) && (onPage || e.target.closest?.(".clues, .clue-strip"))) {
      // Letters typed while a clue button has focus still go into the grid.
      e.preventDefault();
      boardKey(e.key.toUpperCase());
    } else if (onPage && [" ", "Backspace", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
      boardKey(e.key === " " ? "Switch" : e.key === "Delete" ? "Backspace" : e.key);
    }
  });
  $("prev").onclick = () => changeClue(-1);
  $("next").onclick = () => changeClue(1);
  $("clock").onclick = () => showPanel("pause");
  $("share").onclick = shareResult;
  $("share").textContent = touch && navigator.share ? "Share result ↗" : "Copy result ↗";
  $("help-button").onclick = () => showPanel("help");
  $("times-button").onclick = () => showPanel("times");
  $("close").onclick = () => panel.close();
  // Close on a tap outside the panel, but only one that also started outside it:
  // the finger lifting off the final key lands here right after the panel opens.
  const outside = e => {
    const r = panel.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  };
  let pressedOutside = false;
  panel.addEventListener("pointerdown", e => { pressedOutside = outside(e); });
  panel.addEventListener("click", e => {
    if (pressedOutside && outside(e)) panel.close();
    pressedOutside = false;
  });
  panel.addEventListener("close", () => {
    if (state.started || dialogKind === "pause") startClock();
    if (engaged || dialogKind === "pause") focusCell();
    checkDay();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopClock();
    else {
      checkDay();
      if (state.started) startClock();
    }
  });
  window.addEventListener("pagehide", stopClock);
  window.addEventListener("pageshow", () => { if (state.started) startClock(); checkDay(); });
  window.addEventListener("storage", e => {
    if (e.key === key && e.newValue) {
      const record = loadRecord(key);
      if (record?.solved && !state.solved) adoptFinished(record);
    }
  });
  setInterval(clockFace, 250);
  setInterval(() => { if (runningSince !== null) save(); }, 5000);
  setInterval(checkDay, 15000);
}

async function json(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not load " + url);
  return response.json();
}
async function init() {
  const {count, packSize} = await json("puzzles/calendar.json");
  const offset = (issue - 1) % count;
  puzzleNumber = offset + 1;
  const pack = await json("puzzles/" + (Math.floor(offset / packSize) + 1) + ".json");
  puzzle = readPuzzle(pack[offset % packSize]);
  state = initialState(puzzle, loadRecord(key));
  const date = issueDate(issue);
  $("issue").textContent = "Mini № " + issue;
  $("date").dateTime = date.toISOString().slice(0, 10);
  $("date").textContent = dateFormat.format(date);
  if (requested !== null && !validRequest) $("notice").textContent = "That mini isn’t out yet. Here’s today’s.";
  else if (issue > count) $("notice").textContent = "From the archive · First ran as Mini № " + (offset + 1);
  $("today-link").hidden = issue === latest;
  buildGrid();
  wireControls();
  render();
  $("edition-bar").hidden = false;
  $("game").hidden = false;
  if (state.started && !state.solved) startClock();
  if (!touch && !state.solved) focusCell();
  if (!savedHere) feedback("Progress can only be kept during this visit.");
}
init().catch(() => {
  $("notice").textContent = "The mini couldn’t load. ";
  $("notice").append(action("Try again", () => location.reload()));
});
