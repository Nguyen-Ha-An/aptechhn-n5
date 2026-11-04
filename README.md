# FocusLearn

Three features: tasks, plain-text notes, and a countdown timer.

The app has **two source files**:

- `index.html`: all page markup, row templates, and a small style block.
- `src/app.js`: sample records, browser storage, and button actions.

Edit the HTML to change the page. Edit `sampleData()` in JavaScript to change
the examples, then click **Reset examples**. Changes save in this browser.
Notes have an explicit Save button. The timer survives refresh and excludes
paused time. Older tasks and notes are retained; the old storage key stays intact.

```sh
bun install
bun run dev
```

Open the URL printed in the terminal. No login, backend or API keys.

Checks: `bun run test`, `bun run lint`, `bun run test:e2e`, `bun run build`.
Before the first browser check, run `bun run test:install` once.
Or use an installed Chrome: `PLAYWRIGHT_CHANNEL=chrome bun run test:e2e`.
Publish `dist/` after building. Vite, ESLint and Playwright are development
tools; the page uses no browser libraries.
