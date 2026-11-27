# [justincdominic.com](https://justincdominic.com/)

My personal website. The HTML and CSS are in `site/`.

## Local preview

```sh
python3 -m http.server -d site
```

Open [localhost:8000](http://localhost:8000).

Pages with a `DRAFT` file show up locally and are skipped during deployment.

`site/apartment/` is a blocky 3D version of the site you can walk around. What it says lives in `site/apartment/content.js`.

`site/mini/` is the Pocket Mini, a daily 5×5 crossword. Issue 1 ran on Nov 27, 2026, and a new one appears at midnight Pacific. When the list runs out, the minis repeat from the start as archive reruns. Progress, times and streaks stay in each player's browser (`localStorage`).

To add puzzles, append them to the packs in `site/mini/puzzles/` (or pass a JSON list of every puzzle), then run:

```sh
node scripts/build-minis.mjs
```

It rejects broken grids, mismatched clue counts, two-letter words, unchecked squares, repeated answers and clues that give away their answer, then rewrites the packs and `calendar.json`. `scripts/fill-mini.py` suggests candidate grid fills from a word list. Review every grid by hand before publishing.

Each solve also sends anonymous start, check and finish events to Supabase, along with a random per-browser ID (`site/mini/results.mjs`; schema in `supabase/migrations/`). Plays on a local server aren't recorded unless the URL has `?record`. To see how hard each puzzle played:

```sh
node scripts/mini-report.mjs       # every puzzle
node scripts/mini-report.mjs 12    # one puzzle, with every missed square
```
