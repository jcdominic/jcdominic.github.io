# [justincdominic.com](https://justincdominic.com/)

My personal website. The HTML and CSS are in `site/`.

## Local preview

```sh
python3 -m http.server -d site
```

Open [localhost:8000](http://localhost:8000).

Pages with a `DRAFT` file show up locally and are skipped during deployment.

`site/apartment/` is a blocky 3D version of the site you can walk around. What it says lives in `site/apartment/content.js`.
