# FocusLearn UI and Zen Mode — Two-Person Implementation Plan

**Goal:** Make the study desk feel polished and easy to use while keeping the code understandable to HTML and JavaScript newcomers.

**Architecture:** Keep a single static page, inline CSS in `index.html`, and direct DOM event handlers in `src/app.js`. Expand the existing Focus section for Zen so both views use one timer and one set of controls.

**Tech stack:** HTML, CSS inside HTML, plain JavaScript, browser localStorage, and the existing GitHub Pages workflow. No packages, framework, backend, or build requirement.

**Status:** Planning only. All implementation checkboxes start unchecked. The draft PR is the shared tracker and remains draft until both people finish verification.

**Shared draft PR:** [#4 — Plan: two-person UI polish and full-window Zen mode](https://github.com/Nguyen-Ha-An/aptechhn-n5/pull/4). Both people should use its checklists for progress and its branch for final integration.

## 1. Agreed behavior and design

- Keep the single-page Tasks → Notes → Focus flow and current anchor navigation.
- Use the older design at commit `4f06994f` as a visual reference: warm paper colors, serif headings, terracotta accents, subtle borders, and generous spacing. Do not restore its React code or additional features.
- Keep the current light/dark palette, Georgia headings, and system-font body text. No external fonts, assets, or icon libraries.
- Cap the desktop container at 1040px with 24px page padding. At 900px and above, place Tasks and Notes in two columns and Focus below across both columns. Below 900px, stack them in document order. Use 16px padding on small screens.
- Use consistent 8px corners, visible keyboard focus, and controls at least 44px tall. Avoid decorative animation.
- Preserve adding/completing/deleting tasks, note CRUD and explicit Save, unsaved-note discard confirmation, theme persistence, and example reset.
- Preserve storage key `focuslearn-simple-v1`, fallback reading of `focuslearn-showcase-v1`, and the current stored data shape. Keep corrupted-data protection and save-before-update behavior.
- Zen fills the browser window only. Do not use the browser Fullscreen API; tabs and address bar remain visible.
- No authentication, cloud sync, analytics, session history, rich-text editor, autosave, break scheduler, or sound.

### Task-to-focus flow

1. Add a task or choose an existing unfinished task in the Focus section's optional selector.
2. Choose 1–180 whole minutes. Selecting a task never starts the timer.
3. Start the timer, then optionally enter Zen. Zen may also be entered before starting.
4. Pause/resume or reset using the same controls in either view.
5. At zero, show “Time is up. Take a short break.” and “Start again”. Clicking Start again resets to the same duration without automatically starting.

The selector's first option is “Focus without a task”. Store selection in memory only. Disable selection once a session starts, including while paused; enable it after Reset. If a selected task is completed or deleted outside Zen, clear selection without changing the timer. Do not automatically mark tasks done at timer completion.

### Zen behavior

- Expand the existing Focus section using fixed positioning, `inset: 0`, `100dvh`, and theme-aware colors. Permit internal scrolling on short screens and add mobile safe-area padding.
- Center task text, countdown, status, and primary controls. Keep Exit Zen visible near the top. Hide task selection and duration setup, but retain Start/Pause/Resume, Reset, completion controls, and local error feedback.
- Entering/exiting Zen never starts, pauses, or resets the timer. Reload restores timer data but opens the normal desk.
- Lock background scrolling, make background elements inert, and temporarily give the Focus section `role="dialog"`, `aria-modal="true"`, and its existing heading as its accessible name.
- Move focus to Exit Zen on entry. Keep Tab/Shift+Tab within visible enabled controls; Escape exits. Restore prior attributes, page scrolling, scroll position, and focus on Enter Zen when exiting.
- Keep timestamp-based countdown calculation. Announce state transitions rather than every timer tick.
- If storage fails, show an error within Zen and preserve the last successfully saved state.

## 2. Ownership and shared setup

| Work | Person 1 | Person 2 |
| --- | --- | --- |
| Shared setup | Prepare HTML contract | Review contract and existing handlers |
| Concurrent implementation | Own `index.html`: markup and CSS | Own `src/app.js`: behavior and state |
| Cross-review | Test behavior and storage | Test layout, keyboard use, and themes |
| Final integration | Own visual fixes and PR checklist | Own behavioral fixes and PR checklist |

Do not edit the other person's source file during concurrent work. Request changes through the agreed contract. The plan is the only additional tracked Markdown file needed; application changes stay HTML/JS only.

### Shared DOM contract — agree before splitting

Preserve all existing IDs, section anchors, and row templates. Add these IDs once during shared setup:

| ID or hook | Contract |
| --- | --- |
| `tasks-count` | Text count beside Tasks heading |
| `note-editor-heading` | Heading showing “New note” or “Editing note” |
| `focus-task` | Labeled native select; empty value means no task |
| `focus-task-name` | Selected task title in Zen; hidden when no selection |
| `enter-zen` | Non-submit button for entering Zen |
| `exit-zen` | Non-submit button, shown only in Zen |
| `focus-feedback` | Local error region with `role="alert"` |
| `body.zen-active` | Active Zen styling hook |
| `.is-selected` | Selected note row styling hook |

Keep the existing timer form and controls. Repurpose the existing Reset button at completion: label it “Start again” when remaining time is zero, otherwise “Reset timer”. Both perform the same reset action. Give duration setup and task setup containers a `.focus-setup` class so CSS can hide them in Zen. Place Exit Zen outside those containers.

### Shared checkpoint — Person 1 prepares; Person 2 reviews

- [ ] Person 1: add the agreed elements and hooks without changing existing functionality.
- [ ] Person 2: check IDs against existing handlers and verify Enter/Exit buttons use `type="button"`.
- [ ] Both: run the page, verify current tasks, notes, timer, and theme still work, then commit the shared foundation.

**Dependency:** Complete this checkpoint before concurrent implementation. No functionality is expected from newly added controls until Person 2 connects them.

### Working branches and draft PR

Use the draft PR's branch as the integration branch: `codex/ui-zen-two-person-plan`.

- [ ] Person 1: push the shared foundation to the integration branch; tell Person 2 its commit SHA.
- [ ] Person 1: branch from that SHA as `codex/ui-zen-person-1`.
- [ ] Person 2: branch from the same SHA as `codex/ui-zen-person-2`.
- [ ] Each person: commit only owned files on their branch; do not commit `.env.local`, `.DS_Store`, `node_modules`, `dist`, or screenshot output.
- [ ] Person 1: merge both work branches into the integration branch after both checklists are complete, then push. This updates the same draft PR.
- [ ] Both: resolve any integration issues in the owning person's file and rerun the affected checks.

Use separate clones or worktrees so one person's branch switch does not affect the other's work. No additional PRs are required.

## 3. Person 1 tasks — HTML, CSS, and visual polish

**Owns:** `index.html` after shared setup. Use small labeled CSS sections such as theme, layout, forms, notes, focus, Zen, and responsive rules.

- [ ] Apply the agreed page width, responsive columns, typography, spacing, borders, and section surfaces. Keep DOM reading order unchanged.
- [ ] Improve header/navigation, form grouping, button hierarchy, empty states, and long-text wrapping.
- [ ] Keep the task add form compact and the count visible beside its heading.
- [ ] Add clear note-editor heading/status placement and `.is-selected` styling. Rename “Clear editor” to “New note”.
- [ ] Arrange Focus as task selector → duration → countdown/status → actions. Keep every input labeled.
- [ ] Style idle, running, paused, and completed states without relying on color alone.
- [ ] Implement `body.zen-active` styling. Hide setup controls and normal desk chrome; keep local feedback and Exit Zen usable.
- [ ] Ensure Zen fits mobile safe areas and scrolls on short screens. Keep controls reachable at 200% zoom.
- [ ] Check light/dark themes, keyboard focus visibility, touch target sizes, and 360px/768px/1440px layouts.
- [ ] Add brief beginner-friendly comments explaining layout groups, not every CSS property.
- [ ] Commit only `index.html` and send Person 2 a short handoff describing any markup changes requested after the checkpoint.

**Acceptance:** The page looks coherent in both themes, with no horizontal overflow, and all agreed controls exist with stable IDs.

## 4. Person 2 tasks — user flow, JavaScript, and accessibility

**Owns:** `src/app.js`. Keep the current numbered sections, direct handlers, named helpers, and plain-language comments; do not introduce classes, a state framework, or generic event infrastructure.

### Task selection and notes

- [ ] Add `selectedFocusTaskId`, initially `''`, inside `startApp()`; keep it out of persisted data.
- [ ] Add `showFocusTasks()` to refresh unfinished options, task count, selected-task text, and selection availability. Clear selection if its task no longer exists or is done.
- [ ] Call that helper at startup, after task changes, after timer start/reset, and after Reset examples.
- [ ] Connect selector changes to the in-memory ID and refresh its display.
- [ ] Return focus to the task title input after successful task creation. Do not move focus on failed saves.
- [ ] Update note-editor heading and `.is-selected` after opening, saving, clearing, deleting, and resetting notes. Preserve discard confirmation and unload protection.

### Timer and Zen

- [ ] Validate integer duration from 1 to 180 before a fresh start; reject blank or invalid values with visible feedback.
- [ ] Keep the current timer math and stored schema. Change completion Reset copy to “Start again”; clicking it prepares the same duration without starting.
- [ ] Add `enterZen()` and `exitZen()` and connect the agreed buttons. Keep Zen state in memory only.
- [ ] Save scroll position and changed background attributes on entry. Make body siblings outside the main content inert, and make main children other than Focus inert. Keep the Focus section and its feedback interactive.
- [ ] Apply temporary dialog semantics, scroll locking, and the body class. Focus Exit Zen after the view is visible.
- [ ] Handle Tab/Shift+Tab using currently visible enabled controls, and handle Escape without intercepting unrelated typing shortcuts.
- [ ] On exit, restore attributes and scrolling, focus Enter Zen without scrolling, then restore the previous scroll position.
- [ ] Route timer-related storage errors to `focus-feedback` as well as existing feedback. Do not claim successful changes when saving failed.
- [ ] Keep timer announcements limited to meaningful state changes. Preserve `role="timer"` without making the countdown an every-second live announcement.
- [ ] Verify Reset examples refreshes the editor, selector, count, theme, and timer consistently.
- [ ] Commit only `src/app.js` and send Person 1 the behavior checklist results.

**Acceptance:** Selection, timer, Zen, storage protection, and existing note/task flows work consistently without new persisted fields.

## 5. Joint verification and draft PR completion

Start a static server from the repository folder:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000`. If Bun is available, run the existing CI-equivalent syntax/build check:

```sh
bun build src/app.js --target browser --outfile /tmp/focuslearn-app-check.js
```

### Person 1 verifies Person 2's behavior

- [ ] Add, complete, and delete tasks; verify count and selector updates.
- [ ] Select a task, start/pause/resume/reset, and focus without a task.
- [ ] Complete/delete the selected task outside Zen; timer continues with selection cleared.
- [ ] Enter/exit Zen while idle, running, paused, and finished; no unintended timer changes.
- [ ] Reload during a running timer; normal desk opens and remaining time is restored.
- [ ] Verify invalid duration rejection, completion text, and Start again behavior.
- [ ] Create/edit/save/delete notes; cancel discard and confirm edits remain.
- [ ] In a disposable browser profile, test unreadable saved data and blocked storage; errors remain visible and original data is not silently overwritten.

### Person 2 verifies Person 1's presentation and accessibility

- [ ] Review light/dark normal and Zen views at 360px, 768px, and 1440px.
- [ ] Test short landscape viewport, 200% zoom, and long task titles/note content.
- [ ] Verify labels, navigation anchors, visible focus, entry focus, Tab containment, Escape, exit focus, and scroll restoration.
- [ ] Verify hidden background controls cannot receive focus in Zen.
- [ ] Confirm all timer actions, completion feedback, and storage errors remain reachable in Zen.

### Draft PR handoff tasks

- [ ] Person 1: update the draft PR checklist with completed layout tasks and attach normal/Zen screenshots in both themes.
- [ ] Person 2: update the draft PR checklist with completed behavior tasks and record browser checks plus Bun result, or explicitly state Bun was unavailable.
- [ ] Person 1: review the final diff; application changes are only `index.html` and `src/app.js`, alongside this plan.
- [ ] Person 2: verify existing GitHub checks pass on the integrated commit.
- [ ] Both: confirm all acceptance checks pass and unresolved defects are addressed.
- [ ] Person 1: mark the PR ready for review only after both people finish. Do not merge it automatically.

**Done:** The existing features are preserved; the optional task-to-focus flow works; Zen fills the browser window with reliable keyboard/exit behavior; both themes are polished; and the two source files remain approachable to HTML/JS newcomers.
