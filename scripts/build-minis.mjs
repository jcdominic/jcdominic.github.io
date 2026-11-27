// Validate every Pocket Mini, then rewrite the puzzle packs and calendar.
//
//   node scripts/build-minis.mjs               re-check and repack the current packs
//   node scripts/build-minis.mjs puzzles.json  replace every pack with this list
//
// Each puzzle is {rows: [5 strings of A–Z or #], across: [...], down: [...]},
// with clues in number order. The build fails on any problem it finds.
import {readFileSync, writeFileSync, readdirSync, unlinkSync} from "node:fs";
import {readPuzzle} from "../site/mini/puzzle.mjs";

const dir = new URL("../site/mini/puzzles/", import.meta.url);
const packSize = 28;
const packs = () => readdirSync(dir).filter(f => /^\d+\.json$/.test(f)).sort((a, b) => parseInt(a) - parseInt(b));

const source = process.argv[2];
const puzzles = source
  ? JSON.parse(readFileSync(source, "utf8"))
  : packs().flatMap(f => JSON.parse(readFileSync(new URL(f, dir), "utf8")));

const problems = [];
const grids = new Map();
puzzles.forEach((p, index) => {
  const n = index + 1;
  const fail = text => problems.push(`#${n} ${p.rows?.join("/")}: ${text}`);
  if (!Array.isArray(p.rows) || p.rows.length !== 5 || p.rows.some(r => !/^[A-Z#]{5}$/.test(r))) return fail("rows must be five strings of A–Z or #");
  const puzzle = readPuzzle(p);
  const words = puzzle.entries.map(e => e.cells.map(i => puzzle.solution[i]).join(""));
  for (const dir of ["across", "down"]) {
    const count = puzzle.entries.filter(e => e.dir === dir).length;
    if (p[dir]?.length !== count) fail(`${count} ${dir} entries but ${p[dir]?.length} clues`);
  }
  puzzle.entries.forEach((e, k) => {
    if (e.cells.length < 3) fail(`${words[k]} is shorter than three letters`);
    if (typeof e.clue !== "string" || !e.clue.trim()) fail(`${e.num} ${e.dir} has no clue`);
    else if (new RegExp(`\\b${words[k]}\\b`, "i").test(e.clue)) fail(`the clue for ${words[k]} gives it away`);
  });
  puzzle.solution.forEach((ch, i) => {
    if (ch !== "#" && (puzzle.at[i].across == null || puzzle.at[i].down == null)) fail(`square ${i} is only in one word`);
  });
  if (new Set(words).size !== words.length) fail("an answer appears twice");
  const key = p.rows.join("/");
  if (grids.has(key)) fail(`same grid as #${grids.get(key)}`);
  grids.set(key, n);
});

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}

for (const f of packs()) unlinkSync(new URL(f, dir));
for (let start = 0; start < puzzles.length; start += packSize) {
  const lines = puzzles.slice(start, start + packSize).map(p => JSON.stringify({rows: p.rows, across: p.across, down: p.down}));
  writeFileSync(new URL(`${start / packSize + 1}.json`, dir), "[\n" + lines.join(",\n") + "\n]\n");
}
writeFileSync(new URL("calendar.json", dir), JSON.stringify({count: puzzles.length, packSize}) + "\n");
console.log(`${puzzles.length} puzzles in ${Math.ceil(puzzles.length / packSize)} packs`);
