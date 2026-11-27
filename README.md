# justincdominic.com

Plain HTML. No build step, no framework, almost no CSS.

## Layout

```
site/
  index.html        homepage
  style.css         shared, a few lines; every page links it
  404.html
  favicon.png
  photography/      draft
  bookshelf/        draft
```

Every page is a folder with an `index.html`, so it lives at a clean URL (`/photography/`). To add a new page (e.g. `/kitchen/`), copy one of the existing subpages into a new folder and edit it.

## Drafts

Any folder containing a file named `DRAFT` is skipped when deploying. Drafts still show up in local preview. To publish a page, delete its `DRAFT` file and link it from the homepage.

## Preview

```
python3 -m http.server -d site
```

Then open http://localhost:8000.

## Deploy

Pushing to `main` runs `.github/workflows/github-pages.yml`, which copies `site/` (minus drafts) to the `gh-pages` branch. GitHub Pages serves that branch at justincdominic.com.
