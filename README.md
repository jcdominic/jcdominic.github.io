# [justincdominic.com](https://justincdominic.com/)

My personal website. The HTML and CSS are in `site/`.

## Local preview

```sh
python3 -m http.server -d site
```

Open [localhost:8000](http://localhost:8000).

Pages with a `DRAFT` file show up locally and are skipped during deployment.

`site/apartment/` is a blocky 3D version of the site you can walk around. What it says lives in `site/apartment/content.js`.

`site/crossword/` is the Pocket Mini, a daily 5×5 crossword. Issue 1 ran on Nov 27, 2026, and a new one appears at midnight Pacific. When the list runs out, the minis repeat from the start as archive reruns. Progress, times and streaks stay in each player's browser (`localStorage`).

To add puzzles, append them to the packs in `site/crossword/puzzles/` (or pass a JSON list of every puzzle), then run:

```sh
node scripts/build-minis.mjs
```

It rejects broken grids, mismatched clue counts, two-letter words, unchecked squares, repeated answers and clues that give away their answer, then rewrites the packs and `calendar.json`. `scripts/fill-mini.py` suggests candidate grid fills from a word list. Review every grid by hand before publishing.
