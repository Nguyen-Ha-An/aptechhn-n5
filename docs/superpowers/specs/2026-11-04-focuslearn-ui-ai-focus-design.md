# FocusLearn UI Optimization, Contextual AI, Calendar Todos, and Focus Lock Spec

**Date:** 2026-11-04
**Status:** Draft for Review

---

## 1. Overview & Goals

Rebuild the FocusLearn user experience on top of the existing Vite 8 + React 19 + TypeScript + TanStack Router/Query + Supabase RLS architecture to:

1. **Restore and optimize the classic FocusLearn UI layout (`duanfptsoftware.nguyenhaan.id.vn`):**
   - Bring back the wider multi-column workspace layout (`max-w-6xl`), collapsible sidebar (`w-60` expanded / `w-16` collapsed), top navigation bar with contextual actions, dashboard stat cards and two-column overview panels, and split-pane Notes view.
   - Maintain strict WCAG AA contrast (`>= 4.5:1` for normal text in both Light and Dark themes) verified by `bun run check:contrast`.
2. **Reposition AI around Notes and Focus Timer (using `gemini-3.8-flash`):**
   - Embed a contextual AI Study Assistant directly inside **Notes** (to summarize, explain, quiz, or insert generated content into the current note) and **Focus Timer** (to ask study questions during an active focus session without leaving fullscreen or triggering a distraction).
   - Convert `/chat` into a searchable **AI Chat History** archive where past conversations from Focus and Notes can be browsed, renamed, deleted, or reopened inside Notes/Focus.
3. **Add Calendar-Linked Todos & Sample Study Schedule:**
   - Add an interactive monthly/weekly Calendar view on the Todos page showing todos by due date, date filtering, one-click **Load sample study calendar** seeding, and external calendar links (**Add to Google Calendar** URL and **.ics** file export).
4. **Enforce Focus Fullscreen, 3-Attempt Escape Lock, and Automatic Distraction Detection:**
   - Auto-enter browser fullscreen when starting a focus session.
   - Lock fullscreen against accidental exit up to **3 times**: on attempts 1, 2, and 3 when exiting fullscreen or pressing `Escape`, show a blocking warning modal (*"Stay focused! Warning X/3"*), log a distraction, and prompt the user to return to fullscreen. After 3 attempts, allow exiting fullscreen while logging the distraction.
   - Automatically log a distraction whenever the user switches tabs (`document.visibilityState === 'hidden'`), blurs the window to another app, or attempts to quit/reload (`beforeunload`) during an active focus phase.
5. **Link All Supabase Edge Functions & Stop Email Rate-Limiting Lockouts:**
   - Update `supabase/functions/chat` and `supabase/functions/delete-account` CORS handling to allow `https://duanfptsoftware.nguyenhaan.id.vn`, `https://nguyen-ha-an.github.io`, and `http://localhost:*`.
   - Set the default Gemini model in `supabase/functions/chat` to `gemini-3.8-flash` with automatic fallback (`gemini-3.8-flash` -> `gemini-2.5-flash` -> `gemini-2.0-flash`).
   - Fix `.github/workflows/supabase.yml` CLI flags (`--project-ref`, `--no-verify-jwt`, `supabase config push`).
   - Remove email sending rate-limit lockouts by setting `max_frequency = "1s"` and high rate limits in `supabase/config.toml`, allowing direct transition to the 6-digit OTP verification screen when `signInWithOtp` returns HTTP 429 or when clicking *"I already have a 6-digit code"*, and adding an Email + Password sign-in option on `/login`.

---

## 2. Design Direction & Theme Tokens (`DESIGN.md`, `src/styles/tokens.ts`, `src/styles/app.css`)

- **Dial:** `ENERGY 2 / RHYTHM 2 / MOTION 1`
- **Palette (2 core + 1 indigo accent; all pairs >= 4.5:1 WCAG AA):**

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `--color-paper` | `#F8FAFC` | `#0F172A` | Workspace background |
| `--color-surface` | `#F1F5F9` | `#1E293B` | Sidebar, cards, inputs, panels |
| `--color-ink` | `#0F172A` | `#F8FAFC` | Primary text |
| `--color-muted` | `#475569` | `#94A3B8` | Secondary text (>= 4.5:1 on paper & surface) |
| `--color-rule` | `#E2E8F0` | `#334155` | Borders and dividers |
| `--color-accent` | `#4F46E5` | `#818CF8` | Primary indigo accent |
| `--color-accent-ink` | `#FFFFFF` | `#0F172A` | Text on accent fills |
| `--color-danger` | `#B91C1C` | `#F87171` | Destructive actions & overdue labels |

- **Layout:**
  - Desktop collapsible left sidebar (`240px` expanded, `64px` collapsed, persisted in `localStorage['fl:sidebar-collapsed']`).
  - Topbar (`56px` height) displaying current route title/greeting, active focus pill if running, quick search trigger, and theme toggle.
  - Main content container: `max-w-6xl mx-auto px-4 sm:px-6 py-6`.

---

## 3. Feature Specifications

### 3.1 Auth & Removing Email Rate-Limit Lockouts (`src/features/auth/LoginPage.tsx`, `supabase/config.toml`)

1. **Supabase Auth Config (`supabase/config.toml`):**
   - Under `[auth.rate_limit]`: set `email_sent = 10000`, `token_verifications = 10000`, `sign_in_sign_ups = 10000`.
   - Under `[auth.email]`: set `max_frequency = "1s"`, `enable_confirmations = false`, `otp_length = 6`, `otp_expiry = 3600`.
   - Add `https://duanfptsoftware.nguyenhaan.id.vn/` to `additional_redirect_urls`.
2. **Resilient Login Flow (`LoginPage.tsx`):**
   - **Magic Link / 6-Digit Code mode:**
     - Sending an email calls `supabase.auth.signInWithOtp`.
     - If `signInWithOtp` returns `status === 429` (rate limit from hosted SMTP), do **not** block the user on the email screen; transition to the 6-digit code screen (`setSent(true)`) and display an informational message: *"A sign-in code was recently sent to this address. Enter your 6-digit code below."*
     - Provide an **"I already have a 6-digit code"** button on the initial screen so users with a valid email code can verify immediately without triggering another email send.
   - **Password mode toggle:**
     - Allow users to switch between **Email code** and **Password** (`signInWithPassword` / `signUp`) so they can sign in without sending any email.

### 3.2 Dashboard (`src/features/today/TodayPage.tsx`)

- **Header:** Greeting (`Good morning/afternoon/evening, {name}`), formatted local date, and primary **"Start focus session"** button.
- **Stat Row (4 cards computed from real user data):**
  1. **Today's Focus:** `{todayFocus.totalMinutes} min` across `{todayFocus.sessionCount} sessions`.
  2. **Current Streak:** `{stats.current_streak} days` (best `{stats.best_streak} days`).
  3. **Due Today:** `{dueTodayTodos.length} todos` remaining.
  4. **Study Pages:** `{stats.notes_count} pages` active.
- **Two-Column Workspace Grid:**
  - **Left Column (Due Today & Overdue Todos):** Inline checkable `TodoRow` items with link to `/todos`.
  - **Right Column (Recently Edited Pages & Quick Note):** Top 5 recent notes with a **"+ New page"** action that creates a note and opens it.
- **Bottom Section (Recent Focus Sessions):** Summary row of recent focus blocks with link to `/progress/sessions`.

### 3.3 Calendar-Linked Todos (`src/features/todos/TodosPage.tsx`, `src/features/todos/TodoCalendar.tsx`, `src/features/todos/calendarUtils.ts`)

1. **Interactive Calendar Component (`TodoCalendar.tsx`):**
   - Toggleable view mode on `/todos`: **Split (Calendar + List)**, **List only**, or **Calendar only**.
   - Monthly calendar grid computed in the user's timezone (`src/lib/dates.ts`).
   - Each day cell displays the day number, a badge count of open/completed todos due on that date, and up to 2 preview pills.
   - Clicking a day selects that date:
     - Filters or highlights todos for that date.
     - Sets the default `due_date` for newly added todos in the top inline input (with a clearable chip `Due: YYYY-MM-DD`).
2. **Sample Calendar Todos:**
   - A **"Load sample calendar"** button in the Todos header (and in the empty state).
   - Clicking it inserts 5 sample study todos linked to dates around `todayKey(tz)` (`today`, `today + 1`, `today + 2`, `today + 3`, `today + 5`), e.g.:
     - *"Review lecture notes & summarize key concepts"* (due today, priority high)
     - *"Complete practice problem set"* (due tomorrow, priority medium)
     - *"Prepare flashcards & self-quiz for upcoming module"* (due in 2 days, priority medium)
     - *"Deep focus reading session (45 min)"* (due in 3 days, priority low)
     - *"Weekly study retrospective & next week planning"* (due in 5 days, priority low)
3. **External Calendar Integration (`calendarUtils.ts`):**
   - `buildGoogleCalendarUrl(todo, tz)`: generates a `https://calendar.google.com/calendar/render?action=TEMPLATE&text=...&dates=YYYYMMDD/YYYYMMDD&details=...` link.
   - `buildIcsContent(todos, tz)` & `downloadIcsFile`: generates a standards-compliant `.ics` (`VCALENDAR` / `VEVENT`) file for a single todo or all scheduled todos.
   - Exposed in each `TodoRow` action menu (when `due_date` is set) as **"Add to Google Calendar"** and **"Download .ics"**, plus an **"Export calendar (.ics)"** button in the calendar header.

### 3.4 Contextual AI Assistant in Notes & Focus + Chat History (`src/features/chat/`)

1. **Supabase Edge Function (`supabase/functions/chat/index.ts`, `lib.ts`):**
   - **Model Selection:** Primary model `Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.8-flash'`. If `generateContentStream` throws a model-not-found / 404 error, automatically fall back to `'gemini-2.5-flash'`, then `'gemini-2.0-flash'`.
   - **Auto-Conversation Creation:** `conversationId` in `chatRequestSchema` becomes optional (`z.string().uuid().optional()`). Also accept optional `contextMode: z.enum(['note', 'focus', 'general']).optional()` and `contextLabel: z.string().max(120).optional()`. If `conversationId` is omitted, the Edge Function creates a new row in `public.conversations` with a prefix based on `contextMode` (e.g. `[Note] {title}` or `[Focus] {todo}`), and includes `conversationId` in the final SSE event `{ done: true, messageId, conversationId }`.
   - **CORS (`getCorsHeaders`):** Allow `https://duanfptsoftware.nguyenhaan.id.vn`, `https://nguyen-ha-an.github.io`, `http://localhost:5173`, `http://localhost:4173`, `http://localhost:3000`, plus any origin listed in `ALLOWED_ORIGINS`.
2. **Reusable `<StudyAssistantPanel />` (`src/features/chat/StudyAssistantPanel.tsx`):**
   - Props: `mode: 'note' | 'focus'`, `attachedNoteIds?: string[]`, `contextTitle?: string`, `onInsertToNote?: (markdown: string) => void`, `onClose?: () => void`.
   - Automatically creates or reuses a session-scoped conversation in Supabase so every exchange is saved to `conversations` and `messages`.
   - Quick prompt chips tailored to `mode`:
     - **In Notes (`mode="note"`):** *Summarize this note*, *Explain key concepts*, *Quiz me on this note*, *Create action items*. Assistant messages include an **"Insert into note"** button when `onInsertToNote` is provided.
     - **In Focus (`mode="focus"`):** *Explain a concept*, *Give me a hint*, *Break down my current task*, *Quick 3-question check*. Automatically enables `includeToday: true` and attaches the selected note/todo context.
3. **Notes Integration (`src/routes/_app/notes/$noteId.tsx`):**
   - Header button **"AI Assistant"** toggles a side-by-side right column (or slide-over on mobile) containing `<StudyAssistantPanel mode="note" attachedNoteIds={[noteId]} />`.
   - Clicking **"Insert into note"** appends the assistant's response to the TipTap editor document and triggers autosave.
4. **Chat History Page (`src/routes/_app/chat.tsx`, `src/routes/_app/chat/index.tsx`, `src/routes/_app/chat/$conversationId.tsx`):**
   - Displays all saved AI conversations from Notes and Focus with search filtering, rename, and delete.
   - Selecting a conversation displays the full read-only message transcript with quick navigation actions (**"Go to Focus"** / **"Go to Notes"**) so the main active AI usage stays inside Notes and Focus Timer.

### 3.5 Focus Timer: Auto Fullscreen, 3x Esc Lock, Tab/Quit Distraction & Embedded AI (`src/features/focus/`)

1. **Auto Fullscreen on Start (`FocusPage.tsx`):**
   - Clicking **Start focus session** starts the timer, enables `zenMode = true`, and requests browser fullscreen on the focus container (`requestFullscreen?.()`) plus `navigator.keyboard?.lock?.(['Escape'])` if supported by the browser.
2. **3-Time Escape / Fullscreen Exit Lock (`focusMachine.ts`, `FocusPage.tsx`):**
   - Track `escAttempts` (0..3) while `state.phase === 'focusing'`.
   - Whenever the user presses `Escape` or exits browser fullscreen (`fullscreenchange` where `!document.fullscreenElement`) while `state.phase === 'focusing'`:
     - Increment `escAttempts`.
     - Automatically log a distraction: `logDistraction('other', 'Attempted to exit fullscreen (Warning X/3)')`.
     - If `escAttempts <= 3`:
       - Open a blocking lock modal (`FullscreenLockModal`):
         - Title: `Fullscreen lock active (Warning {escAttempts}/3)`
         - Body: `You are in an active focus session. Exiting fullscreen is counted as a distraction ({3 - escAttempts} lock attempts remaining).`
         - Primary button: **"Return to fullscreen"** (re-requests fullscreen and closes the modal).
     - After 3 attempts (`escAttempts >= 3`), allow exiting fullscreen/Zen mode while keeping the distraction logged.
3. **Automatic Distraction on Tab Switch, Window Blur, or Quit (`useFocusSession.tsx`, `FocusPage.tsx`):**
   - Listen to `document.addEventListener('visibilitychange')` and `window.addEventListener('blur')` and `window.addEventListener('beforeunload')`:
     - When `state.phase === 'focusing'` and the tab becomes `hidden` (or window blurs outside the document, debounced so internal iframe/fullscreen transitions don't false-trigger):
       - Log a distraction: `logDistraction('other', 'Switched tab or left app during focus')`.
       - Show a warning toast when the user returns: *"Distraction logged: switched tab during focus session."*
     - On `beforeunload` while `state.phase === 'focusing'`:
       - Log a distraction (`'other'`, `'Closed or reloaded tab during focus'`), persist immediately to `localStorage['focus:active']`, and call `event.preventDefault()`.
4. **Embedded Focus AI Assistant (`FocusPage.tsx`):**
   - During `focusing` or `paused`, render an **"Ask AI"** button and collapsible side panel *inside* the fullscreen focus container (so opening/typing in the AI assistant never exits fullscreen and never triggers a blur distraction).
   - Allows the user to select a reference note and ask questions using `<StudyAssistantPanel mode="focus" />`.

---

## 4. Verification & Testing Plan

- **Unit & Integration Tests (`bun run test`):**
  - `supabase/functions/chat/lib.test.ts`: test CORS headers for `duanfptsoftware.nguyenhaan.id.vn` and `nguyen-ha-an.github.io`, model fallback logic (`gemini-3.8-flash`), and optional `conversationId`.
  - `src/features/focus/focus.test.tsx`: test auto-fullscreen request on session start, 3-attempt Escape lock modal & distraction logging on attempts 1..3, and automatic distraction logging when `document.visibilityState` changes to `hidden`.
  - `src/features/todos/TodosPage.test.tsx`: test interactive Calendar view, loading sample calendar todos, and Google Calendar / `.ics` generation.
  - `src/features/auth/LoginPage.test.tsx`: test 429 rate-limit graceful transition to OTP code entry, *"I already have a 6-digit code"* button, and password sign-in toggle.
  - `src/routes/_app/notes/-note.test.tsx` & `src/routes/_app/chat/-chat.test.tsx`: test Note AI Assistant panel and Chat History view.
- **Static & Accessibility Gates:**
  - `bun run check:contrast` (all token pairs >= 4.5:1 in Light & Dark).
  - `bun run typecheck` and `bun run lint` (0 errors).
  - `bun run build` (clean production bundle).
