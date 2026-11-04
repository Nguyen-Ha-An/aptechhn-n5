# FocusLearn design direction

This file is the design direction (the "soul"). The antislop filter applies on top of it.

Dial: ENERGY 1 / RHYTHM 2 / MOTION 1

Design read: a personal study workspace for students, in a Notion-inspired page-and-blocks style. Notion is inspiration for structure (sidebar page tree, one reading column, blocks, slash menu); it is not a visual template to copy.

## Identity

- Product name: **FocusLearn**, set as text in the heading serif. There is no logo asset. Do not create one.
- Personality: quiet, paper-like, a notebook you open every day. Content leads; chrome stays out of the way.
- Identity motif: every page starts with a **PageHeader**: optional emoji icon, serif title, and a 1px ruled line (`--color-rule`) under it, like a notebook heading. Repeat it on every routed page.

## Palette (2 core + 1 accent; neutrals do not count)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--color-paper` | `#FBFAF7` | `#191817` | page background |
| `--color-surface` | `#F3F1EC` | `#22211F` | sidebar, hovered rows, inputs |
| `--color-ink` | `#1F1E1C` | `#ECEAE4` | primary text |
| `--color-muted` | `#6B675F` | `#A8A398` | secondary text (must stay >= 4.5:1 on paper and surface) |
| `--color-rule` | `#E4E0D7` | `#34322E` | dividers, borders |
| `--color-accent` | `#B5432F` | `#E07A5F` | THE one accent |
| `--color-accent-ink` | `#FFFFFF` | `#191817` | text on accent fills |
| `--color-danger` | `#9F2D20` | `#F08A7A` | destructive confirm text only |

Accent is reserved for "what is happening now": the primary action of a screen (one per screen), the running timer ring and digits, the live-session dot in the sidebar, and the focus-visible ring. Nowhere else. No gradients. No glow.

## Typography

- Headings (page titles, the Today date, login wordmark): **Source Serif 4** (variable), weights 600/700. Reason: gives each page the voice of a document; full Vietnamese coverage.
- UI and body: **Be Vietnam Pro** 400/500/600. Reason: drawn for Vietnamese diacritics; warm humanist sans that is not the AI-default Inter.
- Timer digits: Be Vietnam Pro with `font-variant-numeric: tabular-nums`.
- Self-hosted through `@fontsource*` packages. No Google Fonts link.
- Scale: page title 2.25rem/1.15 serif; h2 1.375rem serif; body 0.9375rem/1.6; small 0.8125rem. No uppercase wide-tracked labels.

## Layout

- App shell: left sidebar 248px (`--color-surface`), main area with one reading column `max-width: 720px`, padding 48px top on desktop, 20px on mobile.
- Focus route is the deliberate RHYTHM break: full-bleed, centred single focal point (the timer), sidebar optional (Zen hides it).
- Mobile (<768px): sidebar becomes a drawer (Radix Dialog) opened by a 44px menu button in a slim top bar.
- Lists and rows, not cards. Cards only where content is genuinely a separate object (none planned).

## Shape, depth, motion

- Radius: 6px controls/rows, 10px dialogs and popovers. Never pill-shaped buttons/inputs/cards.
- Shadow: only on floating layers (menus, popovers, dialogs, slash menu, toasts): `0 8px 24px rgb(0 0 0 / 0.12)` light, `0 8px 24px rgb(0 0 0 / 0.5)` dark. Nothing on the page itself floats.
- Motion: 120ms ease-out for hover/press/open. Timer ring animates because it carries information. Everything non-essential stops under `prefers-reduced-motion: reduce`.

## Icons

- `@phosphor-icons/react`, regular weight, 18px, only where the glyph names the action (sidebar items, block types in the slash menu, icon buttons). Most rows have no icon. No sparkles, stars, lightning, robots.

## Copy

- Language: English. Plain, specific, human. No em dash character anywhere in UI text. No buzzwords ("seamless", "powerful", "AI-powered"...). CTAs name the action: "Start focus session", "Send sign-in link", "Add todo", "New page".
- Never show a number that is not computed from the user's real data.

## Controls (base layer, non-negotiable)

- `cursor: pointer` on enabled controls, `not-allowed` on disabled.
- `:focus-visible` ring: 2px `--color-accent`, 2px offset. Never remove outlines without this replacement.
- Distinct hover, active, disabled states (not colour alone: also background/underline/opacity).
- Every icon-only button has `aria-label`; icons are `aria-hidden`.
- Tap targets >= 44px on mobile.
