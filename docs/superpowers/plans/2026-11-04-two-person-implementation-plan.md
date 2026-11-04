# FocusLearn V2 (UI Optimization, Contextual AI, Calendar Todos & Focus Lock) — 2-Person Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade FocusLearn with the optimized classic multi-column UI, stop email rate-limit lockouts, add Calendar-linked Todos with sample schedule & Google/.ics export, embed `gemini-3.8-flash` AI inside Notes and Focus Timer (turning `/chat` into History), and enforce Focus auto-fullscreen with a 3-attempt Escape lock and automatic tab-switch/quit distraction logging.

**Architecture:** The work is partitioned into two strictly isolated tracks (**Người 1** and **Người 2**) operating on the same PR branch (`feat/ui-ai-focus-calendar-v2`) with **zero shared files** and **no new route files in `src/routes/`** (preventing `src/routeTree.gen.ts` conflicts). Người 1 owns the Design System, Shell, Auth, Today Dashboard, and Calendar Todos; Người 2 owns Supabase Edge Functions, Contextual AI (`StudyAssistantPanel`), Chat History, Notes AI integration, and Focus Fullscreen/Lock/Distraction logic.

**Tech Stack:** Vite 8, React 19, TypeScript strict, Tailwind v4, TanStack Router & Query, Radix UI, TipTap, Supabase (Postgres RLS + Deno Edge Functions), `@google/genai` (`gemini-3.8-flash`), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-04-focuslearn-ui-ai-focus-design.md`

---

## Global Constraints

- **Runtime & Commands:** Use Bun (`bun run lint`, `bun run typecheck`, `bun run check:contrast`, `bun run test`, `bun run build`).
- **No Secrets in Client Code:** Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are used in `src/`.
- **Dates & Timezone:** Never use `toISOString().split('T')[0]`. Always use `src/lib/dates.ts` (`todayKey(tz)`, `localDayKey(d, tz)`, `addDays(key, n)`).
- **Copy & A11y:** UI copy in English, no em dash character (`U+2014`) in UI strings, WCAG AA contrast >= 4.5:1 (`bun run check:contrast`), every data view has loading/empty/error states.
- **Zero-Conflict Rule ("Tránh Đánh Nhau"):**
  - Do **NOT** create or rename files under `src/routes/` (so `src/routeTree.gen.ts` never changes).
  - Do **NOT** edit `package.json` or `bun.lock`.
  - Each person ONLY edits files in their assigned ownership list below.

## Review Focus

1. **Supabase Auth 429 Email Rate Limit:** When `signInWithOtp` returns HTTP 429, `LoginPage` must transition to the 6-digit code screen (`setSent(true)`) with an informational banner instead of locking the user out on step 1.
2. **Gemini 3.8 Flash Fallback:** When `gemini-3.8-flash` returns 404 or model-not-found on a key/region, the `chat` Edge Function must automatically retry with `gemini-2.5-flash` before failing.
3. **Focus Escape Lock Counter Boundary:** Exiting fullscreen or pressing `Escape` while `phase === 'focusing'` must log a distraction and show the lock modal on attempts 1, 2, and 3, and allow exiting fullscreen after attempt 3.
4. **Focus AI Drawer vs Blur Distraction:** Clicking or typing inside the embedded Focus AI drawer must NOT trigger a window blur distraction or exit fullscreen.
5. **Timezone Boundary on Calendar Todos:** Sample calendar todos and monthly grid cells must align with `todayKey(tz)` in `Asia/Ho_Chi_Minh` even at 01:00 local time (previous UTC day).

---

## Phân Chia File Tuyệt Đối (Zero-Conflict File Ownership)

| Khu vực | 👤 NGƯỜI 1 (UI, Auth, Dashboard, Calendar Todos) | 👤 NGƯỜI 2 (Edge Functions, AI Notes/Focus, Chat History, Focus Lock) |
|---|---|---|
| **Styles & Shell** | `DESIGN.md`, `src/styles/tokens.ts`, `src/styles/tokens.test.ts`, `src/styles/app.css`, `src/components/AppShell.tsx`, `src/components/AppShell.test.tsx`, `src/components/Sidebar.tsx`, `src/components/Topbar.tsx` *(new)* | *(Không chạm vào)* |
| **Auth & Config** | `supabase/config.toml`, `src/features/auth/LoginPage.tsx`, `src/features/auth/LoginPage.test.tsx` | `.github/workflows/supabase.yml`, `supabase/functions/chat/*`, `supabase/functions/delete-account/index.ts` |
| **Today & Todos** | `src/features/today/TodayPage.tsx`, `src/features/today/TodayPage.test.tsx`, `src/features/todos/calendarUtils.ts` *(new)*, `src/features/todos/calendarUtils.test.ts` *(new)*, `src/features/todos/TodoCalendar.tsx` *(new)*, `src/features/todos/TodosPage.tsx`, `src/features/todos/TodosPage.test.tsx`, `src/features/todos/TodoRow.tsx`, `src/features/todos/TodoRow.test.tsx` | *(Không chạm vào)* |
| **Chat & AI** | *(Không chạm vào)* | `src/features/chat/streamChat.ts`, `src/features/chat/streamChat.test.ts`, `src/features/chat/StudyAssistantPanel.tsx` *(new)*, `src/features/chat/StudyAssistantPanel.test.tsx` *(new)*, `src/features/chat/ChatThread.tsx`, `src/features/chat/ChatThread.test.tsx`, `src/features/chat/ConversationList.tsx`, `src/features/chat/index.ts`, `src/routes/_app/chat.tsx`, `src/routes/_app/chat/index.tsx`, `src/routes/_app/chat/$conversationId.tsx`, `src/routes/_app/chat/-chat.test.tsx` |
| **Notes & Focus** | *(Không chạm vào)* | `src/routes/_app/notes/$noteId.tsx`, `src/routes/_app/notes/-note.test.tsx`, `src/features/notes/editor/NoteEditor.tsx`, `src/features/focus/focusMachine.ts`, `src/features/focus/focusMachine.test.ts`, `src/features/focus/useFocusSession.tsx`, `src/features/focus/FocusPage.tsx`, `src/features/focus/focus.test.tsx` |

### Quy trình Git cho 2 người trên cùng branch `feat/ui-ai-focus-calendar-v2`
```bash
# Trước khi bắt đầu làm việc:
git fetch origin
git checkout feat/ui-ai-focus-calendar-v2
git pull --rebase origin feat/ui-ai-focus-calendar-v2

# Sau mỗi Task nhỏ (chỉ stage đúng file của mình):
git add <danh-sach-file-cua-ban>
git commit -m "feat(...): ..."
git pull --rebase origin feat/ui-ai-focus-calendar-v2
git push origin feat/ui-ai-focus-calendar-v2
```

---

# PHẦN A — CÔNG VIỆC CỦA NGƯỜI 1 (Tasks 1 → 4)

### Task 1 (Người 1): Stop Email Rate-Limiting Lockouts (`supabase/config.toml` & `LoginPage.tsx`)

**Files:**
- Modify: `supabase/config.toml`
- Modify: `src/features/auth/LoginPage.tsx`
- Test: `src/features/auth/LoginPage.test.tsx`

**Interfaces:**
- Produces in `LoginPage.tsx`:
  - Button `"I already have a 6-digit code"` on initial email screen (validates email with `emailSchema`, then sets `sent = true` without calling `signInWithOtp`).
  - Graceful 429 handling: when `signInWithOtp` returns `error.status === 429`, sets `sent = true` and shows notice `"A sign-in code was recently sent. Enter your 6-digit code below."` instead of blocking on step 1.
  - Mode toggle `"Email code"` vs `"Password"` (`supabase.auth.signInWithPassword({ email, password })` and `"Create account"` via `supabase.auth.signUp({ email, password })`).

- [ ] **Step 1: Write the failing tests in `src/features/auth/LoginPage.test.tsx`**

```tsx
it('transitions to 6-digit code screen when signInWithOtp returns 429 rate limit', async () => {
  const user = userEvent.setup();
  vi.mocked(supabase.auth.signInWithOtp).mockResolvedValueOnce({
    data: {},
    error: { status: 429, message: 'email rate limit exceeded' },
  } as never);

  render(<LoginPage />);
  await user.type(screen.getByLabelText('Email'), 'student@example.com');
  await user.click(screen.getByRole('button', { name: 'Send sign-in link' }));

  expect(await screen.findByLabelText('Enter the 6-digit code instead')).toBeInTheDocument();
  expect(
    screen.getByText(/A sign-in code was recently sent/i),
  ).toBeInTheDocument();
});

it('allows jumping directly to code entry via "I already have a 6-digit code"', async () => {
  const user = userEvent.setup();
  render(<LoginPage />);
  await user.type(screen.getByLabelText('Email'), 'student@example.com');
  await user.click(screen.getByRole('button', { name: 'I already have a 6-digit code' }));

  expect(screen.getByLabelText('Enter the 6-digit code instead')).toBeInTheDocument();
  expect(supabase.auth.signInWithOtp).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test src/features/auth/LoginPage.test.tsx`
Expected: FAIL (429 currently stays on email screen and "I already have a 6-digit code" button does not exist).

- [ ] **Step 3: Update `supabase/config.toml` and `src/features/auth/LoginPage.tsx`**

1. In `supabase/config.toml`:
   - Add `"https://duanfptsoftware.nguyenhaan.id.vn/"` to `additional_redirect_urls`.
   - Under `[auth.rate_limit]`: set `email_sent = 10000`, `token_verifications = 10000`, `sign_in_sign_ups = 10000`.
   - Under `[auth.email]`: set `max_frequency = "1s"` and `enable_confirmations = false`.
2. In `src/features/auth/LoginPage.tsx`:
   - Handle `signInError.status === 429` inside `handleSendLink` by setting `setSent(true)` and `setRateLimitNotice('A sign-in code was recently sent. Enter your 6-digit code below.')`.
   - Add `"I already have a 6-digit code"` secondary button on the email form.
   - Add `"Email code"` / `"Password"` mode switch calling `supabase.auth.signInWithPassword` or `supabase.auth.signUp`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test src/features/auth/LoginPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add supabase/config.toml src/features/auth/LoginPage.tsx src/features/auth/LoginPage.test.tsx
git commit -m "fix(auth): remove email rate-limit lockouts and allow direct OTP or password login"
```

---

### Task 2 (Người 1): Optimized Classic Palette, Collapsible Sidebar & Topbar (`tokens.ts`, `app.css`, `AppShell.tsx`, `Sidebar.tsx`, `Topbar.tsx`)

**Files:**
- Modify: `DESIGN.md`
- Modify: `src/styles/tokens.ts`
- Modify: `src/styles/tokens.test.ts`
- Modify: `src/styles/app.css`
- Create: `src/components/Topbar.tsx`
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/AppShell.tsx`
- Test: `src/components/AppShell.test.tsx`

**Interfaces:**
- `tokens.ts` exports `PALETTE`:
  - `light`: `{ paper: '#F8FAFC', surface: '#F1F5F9', ink: '#0F172A', muted: '#475569', rule: '#E2E8F0', accent: '#4F46E5', accentInk: '#FFFFFF', danger: '#B91C1C' }`
  - `dark`: `{ paper: '#0F172A', surface: '#1E293B', ink: '#F8FAFC', muted: '#94A3B8', rule: '#334155', accent: '#818CF8', accentInk: '#0F172A', danger: '#F87171' }`
- `SidebarProps`: `{ onNavigate?: () => void; collapsed?: boolean; onToggleCollapse?: () => void; className?: string }`
- `TopbarProps`: `{ onOpenMobileMenu: () => void }`

- [ ] **Step 1: Write failing tests in `src/styles/tokens.test.ts` and `src/components/AppShell.test.tsx`**

Assert in `AppShell.test.tsx` that the sidebar collapse toggle button (`aria-label="Collapse sidebar"` / `"Expand sidebar"`) toggles sidebar width between `w-[248px]` and `w-16`, and `Topbar` renders quick navigation actions.

- [ ] **Step 2: Run tests to verify failure**

Run: `bun run test src/styles/tokens.test.ts src/components/AppShell.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement tokens, CSS variables, `Topbar.tsx`, collapsible `Sidebar.tsx`, and wide `AppShell.tsx`**

Update `tokens.ts` and `app.css` with the slate/indigo palette above; update `AppShell.tsx` main container to `max-w-6xl mx-auto px-5 py-6 md:py-8` and mount `<Topbar />` above `<main id="main">`.

- [ ] **Step 4: Run contrast check and tests**

Run: `bun run check:contrast && bun run test src/styles/tokens.test.ts src/components/AppShell.test.tsx`
Expected: PASS (all WCAG AA contrast pairs >= 4.5:1)

- [ ] **Step 5: Commit**

```bash
git add DESIGN.md src/styles/tokens.ts src/styles/tokens.test.ts src/styles/app.css src/components/Topbar.tsx src/components/Sidebar.tsx src/components/AppShell.tsx src/components/AppShell.test.tsx
git commit -m "feat(ui): restore optimized slate-indigo workspace shell, topbar, and collapsible sidebar"
```

---

### Task 3 (Người 1): Classic Multi-Card Today Dashboard (`TodayPage.tsx`)

**Files:**
- Modify: `src/features/today/TodayPage.tsx`
- Test: `src/features/today/TodayPage.test.tsx`

**Interfaces:**
- Uses existing `useTodos()`, `useTodayFocus(tz)`, `useRecentNotes()`, and `useUserStats()` (from `src/features/progress/queries.ts`).
- Renders 4 stat cards (`Today's Focus`, `Current Streak`, `Due Today`, `Study Pages`) and a 2-column grid (`Due today` todos on left, `Recently edited pages` on right).

- [ ] **Step 1: Update unit test in `src/features/today/TodayPage.test.tsx`**

Verify that `TodayPage` renders the 4 stat cards (`Today's focus`, `Current streak`, `Due today`, `Pages`) and the two-column sections with proper empty/loading/error states.

- [ ] **Step 2: Run test to verify failure**

Run: `bun run test src/features/today/TodayPage.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement updated `TodayPage.tsx`**

Render the 4 real-data stat cards and responsive `grid-cols-1 lg:grid-cols-2 gap-6` workspace panels while preserving all existing headings (`Due today`, `Focus today`, `Recently edited pages`) and links (`Start focus session`, `All todos`) so E2E selectors remain 100% compatible.

- [ ] **Step 4: Run test to verify pass**

Run: `bun run test src/features/today/TodayPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/today/TodayPage.tsx src/features/today/TodayPage.test.tsx
git commit -m "feat(today): upgrade dashboard with real-data stat cards and two-column study grid"
```

---

### Task 4 (Người 1): Calendar-Linked Todos, Sample Schedule & Google Calendar / `.ics` Export

**Files:**
- Create: `src/features/todos/calendarUtils.ts`
- Create: `src/features/todos/calendarUtils.test.ts`
- Create: `src/features/todos/TodoCalendar.tsx`
- Modify: `src/features/todos/TodoRow.tsx`
- Modify: `src/features/todos/TodoRow.test.tsx`
- Modify: `src/features/todos/TodosPage.tsx`
- Modify: `src/features/todos/TodosPage.test.tsx`

**Interfaces:**
- `calendarUtils.ts`:
  - `getCalendarMonthDays(year: number, monthZeroIndexed: number): string[]` (returns 42 `YYYY-MM-DD` keys starting on Monday).
  - `buildSampleCalendarTodos(tz: string): Array<{ id: string; title: string; due_date: string; priority: TodoPriority }>` (returns 5 sample study todos scheduled across `todayKey(tz)` through `+5` days).
  - `buildGoogleCalendarUrl(todo: { title: string; due_date: string | null }): string | null`
  - `buildIcsContent(todos: Array<{ id: string; title: string; due_date: string | null; done?: boolean }>): string`
- `TodoCalendar.tsx`:
  - Props: `{ todos: Todo[]; tz: string; selectedDate: string | null; onSelectDate: (date: string | null) => void; onLoadSamples: () => void; isLoadingSamples?: boolean }`

- [ ] **Step 1: Write failing tests in `src/features/todos/calendarUtils.test.ts` and `src/features/todos/TodosPage.test.tsx`**

```ts
// calendarUtils.test.ts
it('builds valid Google Calendar URL for a todo with due_date', () => {
  const url = buildGoogleCalendarUrl({ title: 'Study Calculus', due_date: '2026-11-04' });
  expect(url).toContain('https://calendar.google.com/calendar/render?action=TEMPLATE');
  expect(url).toContain('text=Study+Calculus');
  expect(url).toContain('dates=20261104%2F20261105');
});

it('builds valid VCALENDAR .ics content for scheduled todos', () => {
  const ics = buildIcsContent([{ id: '1', title: 'Review Notes', due_date: '2026-11-04' }]);
  expect(ics).toContain('BEGIN:VCALENDAR');
  expect(ics).toContain('SUMMARY:Review Notes');
  expect(ics).toContain('DTSTART;VALUE=DATE:20261104');
  expect(ics).toContain('END:VCALENDAR');
});

it('creates 5 sample calendar todos anchored to the user timezone', () => {
  const samples = buildSampleCalendarTodos('Asia/Ho_Chi_Minh');
  expect(samples).toHaveLength(5);
  expect(samples[0]?.due_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `bun run test src/features/todos/calendarUtils.test.ts src/features/todos/TodosPage.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement `calendarUtils.ts`, `TodoCalendar.tsx`, `TodoRow.tsx`, and `TodosPage.tsx`**

1. Implement `calendarUtils.ts` with `getCalendarMonthDays`, `buildSampleCalendarTodos`, `buildGoogleCalendarUrl`, `buildIcsContent`, and `downloadIcsFile`.
2. Implement `TodoCalendar.tsx` showing the monthly grid, todo counts per day, date selection filter, `"Load sample calendar"` button, and `"Export .ics"` button.
3. In `TodoRow.tsx`, add `"Add to Google Calendar"` (external link) and `"Download .ics"` inside the row `Menu` whenever `todo.due_date` is present.
4. In `TodosPage.tsx`, mount `<TodoCalendar />` above/beside the todo sections, wire `"Load sample calendar"` to insert the 5 sample todos via `addTodo.mutate`, and pass `selectedDate` as default `due_date` when adding a new todo.

- [ ] **Step 4: Run tests to verify pass**

Run: `bun run test src/features/todos/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/todos/calendarUtils.ts src/features/todos/calendarUtils.test.ts src/features/todos/TodoCalendar.tsx src/features/todos/TodoRow.tsx src/features/todos/TodoRow.test.tsx src/features/todos/TodosPage.tsx src/features/todos/TodosPage.test.tsx
git commit -m "feat(todos): add interactive study calendar, sample todos loader, and Google Calendar/.ics links"
```

---

# PHẦN B — CÔNG VIỆC CỦA NGƯỜI 2 (Tasks 5 → 8)

### Task 5 (Người 2): Link All Supabase Edge Functions, Fix Deploy CLI & Upgrade AI to `gemini-3.8-flash`

**Files:**
- Modify: `supabase/functions/chat/lib.ts`
- Modify: `supabase/functions/chat/index.ts`
- Modify: `supabase/functions/chat/lib.test.ts`
- Modify: `supabase/functions/delete-account/index.ts`
- Modify: `.github/workflows/supabase.yml`

**Interfaces:**
- `chatRequestSchema` in `supabase/functions/chat/lib.ts`:
  ```ts
  export const chatRequestSchema = z.object({
    conversationId: z.string().uuid().optional(),
    message: z.string().min(1).max(4000),
    attachNoteIds: z.array(z.string().uuid()).max(5).optional(),
    includeToday: z.boolean().optional(),
    contextMode: z.enum(['note', 'focus', 'general']).optional(),
    contextLabel: z.string().max(120).optional(),
  });
  ```
- ` resolveModelCandidates(configuredModel?: string): string[]`:
  Returns deduplicated list starting with `configuredModel || 'gemini-3.8-flash'`, followed by `'gemini-3.8-flash'`, `'gemini-2.5-flash'`, `'gemini-2.0-flash'`.
- `getCorsHeaders(req: Request, allowedOriginsStr?: string)`:
  Default allowed origins include `https://duanfptsoftware.nguyenhaan.id.vn`, `https://nguyen-ha-an.github.io`, `http://localhost:5173`, `http://localhost:4173`, `http://localhost:3000`.
- Final SSE event from `supabase/functions/chat/index.ts`:
  `{ done: true, messageId: assistantMsg.id, conversationId: activeConversationId }`

- [ ] **Step 1: Write failing tests in `supabase/functions/chat/lib.test.ts`**

```ts
it('includes gemini-3.8-flash as primary model with fallback chain', () => {
  expect(resolveModelCandidates(undefined)).toEqual([
    'gemini-3.8-flash',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
  ]);
});

it('allows https://duanfptsoftware.nguyenhaan.id.vn in CORS headers by default', () => {
  const req = new Request('https://example.com/functions/v1/chat', {
    method: 'POST',
    headers: { Origin: 'https://duanfptsoftware.nguyenhaan.id.vn' },
  });
  const headers = getCorsHeaders(req);
  expect(headers['Access-Control-Allow-Origin']).toBe('https://duanfptsoftware.nguyenhaan.id.vn');
});

it('accepts chat request without conversationId and with contextMode', () => {
  const parsed = chatRequestSchema.safeParse({
    message: 'Explain recursion',
    contextMode: 'focus',
    contextLabel: 'CS101 Todo',
  });
  expect(parsed.success).toBe(true);
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `bun run test supabase/functions/chat/lib.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `supabase/functions/chat/lib.ts`, `index.ts`, `delete-account/index.ts`, and `.github/workflows/supabase.yml`**

1. In `supabase/functions/chat/lib.ts`:
   - Update `chatRequestSchema`, `getCorsHeaders`, `buildSystemInstruction` (incorporating `contextMode` and `contextLabel`), and export `resolveModelCandidates`.
2. In `supabase/functions/chat/index.ts`:
   - If `conversationId` is omitted, insert a new row into `public.conversations` titled `[Focus] ${contextLabel || message.slice(0, 48)}` or `[Note] ${contextLabel || message.slice(0, 48)}`.
   - Iterate through `resolveModelCandidates(Deno.env.get('GEMINI_MODEL'))` when calling `ai.models.generateContentStream` so if `gemini-3.8-flash` throws a 404/not-found error, it falls back cleanly to `gemini-2.5-flash`.
   - Emit `{ done: true, messageId: assistantMsg.id, conversationId: activeConversationId }`.
3. In `supabase/functions/delete-account/index.ts`:
   - Add `https://duanfptsoftware.nguyenhaan.id.vn` and `http://localhost:4173` to `defaultOrigins`.
4. In `.github/workflows/supabase.yml`:
   - Replace invalid `--remote` flags with:
     ```yaml
     supabase db push --linked --yes
     supabase config push --project-ref ${{ secrets.SUPABASE_PROJECT_REF }} --yes || true
     supabase functions deploy chat --project-ref ${{ secrets.SUPABASE_PROJECT_REF }} --no-verify-jwt --yes
     supabase functions deploy delete-account --project-ref ${{ secrets.SUPABASE_PROJECT_REF }} --no-verify-jwt --yes
     ```

- [ ] **Step 4: Run test to verify pass**

Run: `bun run test supabase/functions/chat/lib.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/chat/lib.ts supabase/functions/chat/index.ts supabase/functions/chat/lib.test.ts supabase/functions/delete-account/index.ts .github/workflows/supabase.yml
git commit -m "feat(functions): use gemini-3.8-flash with fallback, auto-create conversations, and fix deploy workflow"
```

---

### Task 6 (Người 2): Contextual `<StudyAssistantPanel />` & Chat History View (`/chat`)

**Files:**
- Modify: `src/features/chat/streamChat.ts`
- Modify: `src/features/chat/streamChat.test.ts`
- Create: `src/features/chat/StudyAssistantPanel.tsx`
- Create: `src/features/chat/StudyAssistantPanel.test.tsx`
- Modify: `src/features/chat/ConversationList.tsx`
- Modify: `src/features/chat/ChatThread.tsx`
- Modify: `src/features/chat/ChatThread.test.tsx`
- Modify: `src/features/chat/index.ts`
- Modify: `src/routes/_app/chat.tsx`
- Modify: `src/routes/_app/chat/index.tsx`
- Modify: `src/routes/_app/chat/$conversationId.tsx`
- Modify: `src/routes/_app/chat/-chat.test.tsx`

**Interfaces:**
- `StreamChatParams` in `src/features/chat/streamChat.ts`:
  - `conversationId?: string`
  - `contextMode?: 'note' | 'focus' | 'general'`
  - `contextLabel?: string`
  - `onDone?: (messageId: string, conversationId?: string) => void`
- `StudyAssistantPanelProps` in `src/features/chat/StudyAssistantPanel.tsx`:
  ```ts
  export interface StudyAssistantPanelProps {
    mode: 'note' | 'focus';
    attachedNoteIds?: string[];
    contextTitle?: string;
    onInsertToNote?: (markdown: string) => void;
    onClose?: () => void;
    className?: string;
  }
  ```

- [ ] **Step 1: Write failing tests in `src/features/chat/StudyAssistantPanel.test.tsx` and `src/features/chat/streamChat.test.ts`**

Test that `StudyAssistantPanel`:
1. Renders mode-specific quick prompts (*Summarize this note*, *Explain key concepts*, *Quiz me on this note* in `note` mode; *Explain a concept*, *Break down my current task* in `focus` mode).
2. Auto-creates a conversation or passes `contextMode` & `attachedNoteIds` to `streamChat`.
3. Renders an `"Insert into note"` button on assistant replies when `onInsertToNote` is provided.

- [ ] **Step 2: Run tests to verify failure**

Run: `bun run test src/features/chat/StudyAssistantPanel.test.tsx src/features/chat/streamChat.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `streamChat.ts`, `StudyAssistantPanel.tsx`, and update `/chat` History banner**

1. Update `streamChat.ts` to support optional `conversationId`, `contextMode`, `contextLabel`, and pass `event.conversationId` to `onDone`.
2. Create `StudyAssistantPanel.tsx` and export it from `src/features/chat/index.ts`.
3. In `ConversationList.tsx` and `src/routes/_app/chat.tsx`, add a search filter input for past conversations and a clear subtitle explaining that `/chat` is the **Chat History** archive for Notes and Focus AI sessions (while keeping existing conversation thread viewing/composer intact for compatibility).

- [ ] **Step 4: Run tests to verify pass**

Run: `bun run test src/features/chat/ src/routes/_app/chat/-chat.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/chat/ src/routes/_app/chat.tsx src/routes/_app/chat/index.tsx src/routes/_app/chat/\$conversationId.tsx src/routes/_app/chat/-chat.test.tsx
git commit -m "feat(chat): add contextual StudyAssistantPanel for Notes and Focus and searchable Chat History"
```

---

### Task 7 (Người 2): Embed AI Study Assistant in Notes (`src/routes/_app/notes/$noteId.tsx`)

**Files:**
- Modify: `src/features/notes/editor/NoteEditor.tsx`
- Modify: `src/routes/_app/notes/$noteId.tsx`
- Test: `src/routes/_app/notes/-note.test.tsx`

**Interfaces:**
- Consumes `StudyAssistantPanel` from `@/features/chat`.
- Adds `"AI Assistant"` toggle button in the note header (`src/routes/_app/notes/$noteId.tsx`).
- When open, renders a responsive split view: Note Editor on the left, `<StudyAssistantPanel mode="note" attachedNoteIds={[noteId]} contextTitle={title || 'Untitled'} onInsertToNote={handleInsertAiContent} />` on the right.

- [ ] **Step 1: Write failing test in `src/routes/_app/notes/-note.test.tsx`**

Test that clicking `"AI Assistant"` in `NotePage` opens the AI Note Assistant panel with the current note attached, and clicking `"Insert into note"` appends the assistant text into the note content.

- [ ] **Step 2: Run test to verify failure**

Run: `bun run test src/routes/_app/notes/-note.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement AI Assistant split panel in `src/routes/_app/notes/$noteId.tsx`**

Add `const [aiOpen, setAiOpen] = useState(false)` and the `"AI Assistant"` button next to Page options. When `aiOpen` is true, render `<StudyAssistantPanel />` in a side column (`w-full lg:w-[380px] shrink-0`). Implement `handleInsertAiContent(markdown)` to append a paragraph node to the note content and trigger `setContent`.

- [ ] **Step 4: Run test to verify pass**

Run: `bun run test src/routes/_app/notes/-note.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/notes/editor/NoteEditor.tsx src/routes/_app/notes/\$noteId.tsx src/routes/_app/notes/-note.test.tsx
git commit -m "feat(notes): integrate contextual AI Study Assistant panel with insert-to-note"
```

---

### Task 8 (Người 2): Focus Timer Auto-Fullscreen, 3x Esc Lock, Tab/Quit Distraction & Embedded Focus AI

**Files:**
- Modify: `src/features/focus/focusMachine.ts`
- Modify: `src/features/focus/focusMachine.test.ts`
- Modify: `src/features/focus/useFocusSession.tsx`
- Modify: `src/features/focus/FocusPage.tsx`
- Test: `src/features/focus/focus.test.tsx`

**Interfaces:**
- `FocusState` in `focusMachine.ts`:
  Add `escAttempts: number` (initialized to `0` on `INITIAL_FOCUS_STATE`, `START`, and `RESET`; incremented on `RECORD_ESC_ATTEMPT`).
- `FocusEvent` in `focusMachine.ts`:
  Add `{ type: 'RECORD_ESC_ATTEMPT'; id: string; now: number; note?: string }` which increments `escAttempts` and appends a distraction `{ id, category: 'other', note: note ?? `Fullscreen exit attempt (${state.escAttempts + 1}/3)`, at: now }`.
- `useFocusSession.tsx`:
  - Expose `recordEscAttempt: () => number` on `FocusContextValue`.
  - When `state.phase === 'focusing'` and `document.visibilityState === 'hidden'`, automatically dispatch `LOG_DISTRACTION` with `category: 'other'` and `note: 'Switched tab during focus session'`.
  - On `beforeunload` while `state.phase === 'focusing'`, dispatch `LOG_DISTRACTION` (`note: 'Attempted to close or reload tab during focus'`), persist to `localStorage`, and call `e.preventDefault()`.
- `FocusPage.tsx`:
  - On `handleStartSession()`: enable `setZenMode(true)` and call `focusContainerRef.current?.requestFullscreen?.()` (and `navigator.keyboard?.lock?.(['Escape'])` if available).
  - On `Escape` keydown or `fullscreenchange` (when `!document.fullscreenElement`) while `state.phase === 'focusing'`:
    - If `state.escAttempts < 3`: call `recordEscAttempt()` and open the blocking `FullscreenLockModal` (`"Stay focused! Warning X/3"`, with `"Return to fullscreen"` primary button).
    - If `state.escAttempts >= 3`: allow exiting fullscreen and Zen mode.
  - Render `"Ask AI"` button and collapsible `<StudyAssistantPanel mode="focus" />` inside `focusContainerRef` so the student can ask questions during focus without leaving fullscreen.

- [ ] **Step 1: Write failing tests in `src/features/focus/focusMachine.test.ts` and `src/features/focus/focus.test.tsx`**

```tsx
// focusMachine.test.ts
it('tracks Escape attempts up to 3 and logs a distraction on each attempt', () => {
  let state = focusReducer(INITIAL_FOCUS_STATE, {
    type: 'START',
    mode: 'timed',
    plannedMs: 25 * 60 * 1000,
    todoId: null,
    now: 1000,
    sessionId: 's1',
  });
  state = focusReducer(state, { type: 'RECORD_ESC_ATTEMPT', id: 'd1', now: 2000 });
  expect(state.escAttempts).toBe(1);
  expect(state.distractions).toHaveLength(1);
  expect(state.distractions[0]?.note).toContain('1/3');
});

// focus.test.tsx
it('requests fullscreen on session start, locks Escape 3 times with warning modal, and logs tab-switch distractions', async () => {
  // 1. Start session -> requestFullscreen called
  // 2. Press Escape 1st time -> Warning 1/3 modal shown, distraction logged
  // 3. Press Escape 2nd time -> Warning 2/3 modal shown
  // 4. Press Escape 3rd time -> Warning 3/3 modal shown
  // 5. Simulate visibilityState = 'hidden' -> distraction count increments
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `bun run test src/features/focus/focusMachine.test.ts src/features/focus/focus.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement `focusMachine.ts`, `useFocusSession.tsx`, and `FocusPage.tsx`**

1. Add `escAttempts` and `RECORD_ESC_ATTEMPT` to `focusMachine.ts`.
2. Add automatic tab-switch (`visibilitychange` -> `hidden`) and `beforeunload` distraction logging + `recordEscAttempt` to `useFocusSession.tsx`.
3. In `FocusPage.tsx`, add `focusContainerRef` with auto-fullscreen on start, the 3-attempt Escape lock modal (`Dialog` with `Warning {state.escAttempts}/3` and `"Return to fullscreen"` button), and the embedded `"Ask AI"` drawer with `<StudyAssistantPanel mode="focus" />`.

- [ ] **Step 4: Run tests to verify pass**

Run: `bun run test src/features/focus/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/focus/focusMachine.ts src/features/focus/focusMachine.test.ts src/features/focus/useFocusSession.tsx src/features/focus/FocusPage.tsx src/features/focus/focus.test.tsx
git commit -m "feat(focus): add auto-fullscreen, 3x Escape lock modal, tab-switch distraction logging, and embedded Focus AI"
```

---

## Final Integration Check (Sau khi cả Người 1 và Người 2 hoàn tất)

Chạy toàn bộ bộ kiểm tra chất lượng trước khi chuyển PR từ **Draft** sang **Ready for Review**:

```bash
bun run lint
bun run typecheck
bun run check:contrast
bun run test
bun run build
```
