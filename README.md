# FocusLearn

FocusLearn is a personal study workspace for students. It combines daily task management, nested notes with wikilinks and backlinks, a distraction-aware focus timer (timed Pomodoro and open modes), progress analytics with achievements, and an AI study assistant powered by Google Gemini via Supabase Edge Functions.

The application is deployed as a single-page application on GitHub Pages at:
https://nguyen-ha-an.github.io/aptechhn-n5/

---

## Stack

- **Runtime & Package Manager:** Bun (`~/.bun/bin/bun`)
- **Frontend Core:** Vite 8, React 19, TypeScript (strict mode with `noUncheckedIndexedAccess`)
- **Styling & Design System:** Tailwind CSS v4 (`@tailwindcss/vite`), design tokens defined in `src/styles/tokens.ts` and `src/styles/app.css`
- **Routing & State:** TanStack Router (file-based route generation, hash history), TanStack Query v5
- **UI Components & Icons:** Radix UI primitives, Phosphor Icons (`@phosphor-icons/react`), Sonner (toasts)
- **Typography:** Source Serif 4 Variable and Be Vietnam Pro (self-hosted via `@fontsource`)
- **Backend & Database:** Supabase (PostgreSQL 17, Row Level Security, GoTrue Auth with PKCE, Mailpit local email server, Deno Edge Functions)
- **Testing & Tooling:** Vitest, React Testing Library, Playwright (E2E across desktop and mobile), ESLint, Prettier, WCAG 2.1 AA automated contrast checks

---

## Local Setup

### Prerequisites

1. **Bun**: Install from [bun.sh](https://bun.sh) (`curl -fsSL https://bun.sh/install | bash`).
2. **Docker Desktop**: Required to run the local Supabase container stack.
3. **Supabase CLI**: Install via Homebrew:
   ```bash
   brew install supabase/tap/supabase
   ```

### Installation and Development

1. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/nguyen-ha-an/aptechhn-n5.git
   cd aptechhn-n5
   bun install
   ```

2. Start the local Supabase services:
   ```bash
   supabase start
   ```

3. Generate the local environment configuration:
   ```bash
   # Retrieve local service URLs and keys
   supabase status -o env
   ```
   Create a `.env.local` file with the client variables:
   ```bash
   VITE_SUPABASE_URL=http://127.0.0.1:54321
   VITE_SUPABASE_PUBLISHABLE_KEY=<your-local-anon-key>
   ```

4. Run the development server:
   ```bash
   bun run dev
   ```
   Open `http://localhost:5173/aptechhn-n5/` in your browser.

5. Local Email Server (Mailpit):
   Local sign-in emails and 6-digit OTP codes can be viewed in the Mailpit web interface:
   `http://127.0.0.1:54324`

---

## Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `bun run dev` | Starts the Vite development server with HMR. |
| `build` | `bun run build` | Runs `tsc -b` and builds production assets into `dist/`. |
| `preview` | `bun run preview` | Previews the production build locally at port 4173. |
| `test` | `bun run test` | Executes unit and integration tests with Vitest. |
| `test:watch` | `bun run test:watch` | Runs Vitest in interactive watch mode. |
| `test:e2e` | `bun run test:e2e` | Runs Playwright end-to-end tests (desktop and mobile). |
| `check:contrast` | `bun run check:contrast` | Verifies WCAG 2.1 AA (>= 4.5:1) ratios for all palette tokens. |
| `typecheck` | `bun run typecheck` | Validates TypeScript types across app, configs, and tests (`tsc -b --noEmit`). |
| `lint` | `bun run lint` | Runs ESLint across all codebase files. |
| `format` | `bun run format` | Formats all files using Prettier. |

---

## Deployment

Continuous Integration and Deployment are handled through GitHub Actions workflows in `.github/workflows/`.

### 1. GitHub Pages Configuration

1. In your GitHub repository, navigate to **Settings** > **Pages**.
2. Under **Build and deployment** > **Source**, choose **GitHub Actions**.
3. Do not add a CNAME file. The application is served under the `/aptechhn-n5/` base path.

### 2. GitHub Repository Variables & Secrets

Configure the following under **Settings** > **Secrets and variables** > **Actions**:

#### Variables (`Repository variables` tab)
- `VITE_SUPABASE_URL`: `https://bdiwugbntvyqandlwtvd.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY`: The public anon key for your Supabase project.

#### Secrets (`Repository secrets` tab)
- `SUPABASE_ACCESS_TOKEN`: Supabase personal access token generated from your Supabase Account Settings.
- `SUPABASE_PROJECT_REF`: `bdiwugbntvyqandlwtvd`
- `SUPABASE_DB_PASSWORD`: The database password for your production Postgres instance.

### 3. Supabase Dashboard Authentication Configuration

In the Supabase Management Dashboard under **Authentication** > **URL Configuration** ([direct link](https://supabase.com/dashboard/project/bdiwugbntvyqandlwtvd/auth/url-configuration)):
- **Site URL**: `https://nguyen-ha-an.github.io/aptechhn-n5/`
- **Additional Redirect URLs**:
  - `https://nguyen-ha-an.github.io/aptechhn-n5/`
  - `http://localhost:5173/aptechhn-n5/`
  - `http://localhost:4173/aptechhn-n5/`

### 4. Supabase Edge Function Secrets

Configure production secrets for the `chat` Edge Function via the Supabase CLI:

```bash
supabase secrets set \
  GEMINI_API_KEY="your-google-gemini-api-key" \
  GEMINI_MODEL="gemini-2.5-flash" \
  AI_DAILY_LIMIT="50" \
  ALLOWED_ORIGINS="https://nguyen-ha-an.github.io"
```

---

## Importing Legacy Data

Users migrating from the older FocusLearn Lite release can import their existing records:

1. In the app, navigate to **Settings** (`/settings`).
2. Under the **Data** section, select **Import from the old FocusLearn** (`/settings/import`).
3. Upload your export `.json` file (supports schema versions 3, 4, and 5).
4. The migration tool previews counts and transfers todos, tasks, markdown notes (converting headings, lists, code, and `[[wikilinks]]` into TipTap nodes), focus session records, logged distractions, and achievement milestones into the relational database.

---

## Security Note: Gemini API Key Rotation

The previous version of FocusLearn stored and used a Google Gemini API key directly in client-side code, which was exposed in the client bundle.

If you previously deployed that key:
1. Go to [Google AI Studio](https://aistudio.google.com/) and immediately delete or regenerate that API key.
2. Store the new key exclusively in your backend secrets (`supabase secrets set GEMINI_API_KEY=...`).
3. Never include API keys in client `.env` files or commit them to version control. The client application only communicates with Google Gemini through the authenticated `supabase/functions/chat` Edge Function.
