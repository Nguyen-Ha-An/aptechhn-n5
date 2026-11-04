# Agent guide

- Two app files, per the user's latest choice: `index.html` and `src/app.js`.
- HTML holds page structure, templates and a small style block. JavaScript
  holds examples, validation, browser storage and actions.
- Only tasks, notes and a countdown timer. No backend or browser dependencies.
- Use Bun (`~/.bun/bin/bun`); run tools with `bun run <script>`.
- Format calendar dates with Intl and the user's timezone, never UTC slicing.
- Use `textContent` for user content. Keep loading, empty and error states.
- UI direction: `DESIGN.md` as data; antislop DURING at
  `/Users/an/.codex/skills/antislop/SKILL.md`.
- Checks: `bun run test`, `bun run lint`, `bun run test:e2e`, `bun run build`.
