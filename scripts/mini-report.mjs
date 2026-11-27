// How hard each Pocket Mini turned out to be, from everyone's anonymous results.
//
//   node scripts/mini-report.mjs        every puzzle with results
//   node scripts/mini-report.mjs 12     one puzzle, with every missed square
import {readFileSync, readdirSync} from "node:fs";
import {readPuzzle, formatTime} from "../site/mini/puzzle.mjs";

const results = readFileSync(new URL("../site/mini/results.mjs", import.meta.url), "utf8");
const api = results.match(/const api = "([^"]+)"/)[1];
const key = results.match(/apikey: "([^"]+)"/)[1];

const dir = new URL("../site/mini/puzzles/", import.meta.url);
const packs = readdirSync(dir).filter(f => /^\d+\.json$/.test(f)).sort((a, b) => parseInt(a) - parseInt(b));
const puzzles = packs.flatMap(f => JSON.parse(readFileSync(new URL(f, dir), "utf8")));

const response = await fetch(api + "rpc/mini_report", {
  method: "POST",
  headers: {apikey: key, "Content-Type": "application/json"},
  body: "{}",
});
if (!response.ok) {
  console.error("Couldn't load results:", response.status, await response.text());
  process.exit(1);
}
// Puzzle numbers past the end of the list are test rows.
const rows = (await response.json()).filter(r => r.puzzle >= 1 && r.puzzle <= puzzles.length);
const only = process.argv[2] && Number(process.argv[2]);
const time = ms => ms == null ? "–" : formatTime(ms);
const percent = (a, b) => b ? Math.round(100 * a / b) + "%" : "–";

// Each missed square counts against both words through it.
function troubleClues(row, limit) {
  const puzzle = readPuzzle(puzzles[row.puzzle - 1]);
  const misses = new Map();
  for (const [square, count] of Object.entries(row.wrong)) {
    for (const dir of ["across", "down"]) {
      const id = puzzle.at[square]?.[dir];
      if (id != null) misses.set(id, (misses.get(id) ?? 0) + count);
    }
  }
  return [...misses].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id, count]) => {
    const e = puzzle.entries[id];
    const answer = e.cells.map(i => puzzle.solution[i]).join("");
    return `${count}× ${e.num}${e.dir[0].toUpperCase()} ${answer} — “${e.clue}”`;
  });
}

const shown = only ? rows.filter(r => r.puzzle === only) : rows;
if (!shown.length) {
  console.log(only ? `No results yet for puzzle ${only}.` : "No results yet.");
  process.exit(0);
}

console.log("Puzzle  Starts  Finished  Checked  Median  Middle half    Phone  Desktop  Grid");
for (const r of shown) {
  const middle = r.p25_ms == null ? "–" : time(r.p25_ms) + "–" + time(r.p75_ms);
  console.log([
    ("№ " + r.puzzle).padEnd(6),
    String(r.starts).padStart(6),
    (r.solves + " " + percent(r.solves, r.starts)).padStart(9),
    percent(r.checked, r.solves).padStart(8),
    time(r.median_ms).padStart(7),
    middle.padStart(12),
    time(r.touch_median_ms).padStart(8),
    time(r.desktop_median_ms).padStart(8),
    " " + puzzles[r.puzzle - 1].rows.join("/"),
  ].join(" "));
  for (const line of troubleClues(r, only ? 10 : 2)) console.log("          " + line);
}

const solved = shown.filter(r => r.median_ms != null).sort((a, b) => a.median_ms - b.median_ms);
if (!only && solved.length > 1) {
  console.log("\nFastest: " + solved.slice(0, 3).map(r => `№ ${r.puzzle} (${time(r.median_ms)})`).join(", "));
  console.log("Slowest: " + solved.slice(-3).reverse().map(r => `№ ${r.puzzle} (${time(r.median_ms)})`).join(", "));
}
console.log("\nFewer than five finishes says little on its own; look for patterns across weeks.");
