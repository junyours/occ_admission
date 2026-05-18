# OCC Admission — Web App Agent Guide

This folder is the **source of truth** for AI agents working on the Laravel + Inertia + React web app under `Web/`.

## Non-negotiable: read entire files

**Every file the user sends, @mentions, or pastes** — read the **whole file** (and important imports) before editing or advising. This applies to **all pages** (Guidance, Evaluator, auth, etc.), not only Dashboard.

Rule: `.cursor/rules/read-entire-files.mdc` (always on).

## Start here

| Resource | Path | When to use |
|----------|------|-------------|
| **Read entire files** | `.cursor/rules/read-entire-files.mdc` | **Always on** — full read of every file user sends |
| **Rules** | `.cursor/rules/*.mdc` | Always-on and file-scoped coding standards |
| **Frontend redesign safety** | `.cursor/rules/frontend-redesign-only.mdc` | Read full JSX first; no backend changes by default |
| **UI redesign skill** | `.cursor/skills/ui-redesign/SKILL.md` | Redesigns, clutter reduction, new pages, dashboard work |
| **Design plans** | `.cursor/plans/` | Save reviewable plans before coding (user approval) |

## Stack (quick reference)

- **Backend**: Laravel 10+, MySQL, Laravel Passport (API)
- **Frontend**: React 19, Inertia.js, Tailwind CSS 4, Vite
- **Pages**: `resources/js/Pages/`
- **Shared UI**: `resources/js/Components/` (`Layout`, `Sidebar`, `ChartCard`, etc.)
- **Routes**: `routes/web.php` (Inertia pages — not `api.php` for page routes)

## Agent behavior

1. **Read every user-provided file in full** — see `read-entire-files.mdc`.
2. **Read rules** in `.cursor/rules/` before editing matching files.
3. **UI/visual work**: Read and follow `.cursor/skills/ui-redesign/SKILL.md`.
4. **Redesigns**: Draft a plan from `.cursor/plans/templates/ui-redesign-plan.md`, show the user, wait for **go** before implementing (unless they say proceed immediately).
5. **Backend changes**: Check migrations → models → controllers (column names match DB).
6. **Scope**: Redesign = **frontend only** — understand structure from full file read, then reorder JSX. No backend edits unless the user asks. See `frontend-redesign-only.mdc`.

## Cursor rule loading

Rules live in `Web/.cursor/rules/`. If your workspace root is the monorepo (`occ_admission`), symlink or copy critical `.mdc` files to the repo root `.cursor/rules/` so Cursor picks them up automatically—or open the `Web` folder as the workspace root.

## Design identity (OCC Admission Web)

- **Primary navy**: `#1D293D`
- **Primary blue**: `#1447E6`
- **Surfaces**: white cards, `slate` borders, light gray page background (`bg-gray-50` via `Layout`)
- **Modals**: `bg-black/20 backdrop-blur-sm flex items-center justify-center z-50` (see `ui-redesign` rule)
