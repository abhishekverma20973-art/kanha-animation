# Kanha — Devotion Meets Code

An interactive, responsive Krishna Janmashtmi particle animation built with plain HTML, CSS, and JavaScript. It has no external dependencies and is ready for GitHub Pages.

## What it includes

- Automatic developer-style code typing
- Neon particles that assemble into Kanha
- Pointer interaction and tap/click “blessing wave”
- Replay and fullscreen controls
- Mobile and desktop responsive layout
- Reduced-motion accessibility support

## Publish on GitHub Pages

1. Create a new public GitHub repository.
2. Upload **all files inside this folder** to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/ (root)`, then click **Save**.
6. GitHub will show the live website link after deployment finishes.

The page works directly from `index.html`; no build command is required.

## Customize

- Greeting: edit `Happy Krishna Janmashtmi` in `index.html`.
- Heading: edit the text inside `.hero__title` in `index.html`.
- Code shown in the editor: edit `sourceCode` in `script.js`.
- Colors: edit the variables at the top of `styles.css`.
- Kanha artwork: replace `assets/kanha.png` with another transparent PNG using the same filename.

## Local preview

Run a small local server from this folder:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000` in a browser.
