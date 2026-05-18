---
name: occ-ui-redesign
description: >-
  Frontend-only UI redesign for OCC Admission (Inertia React). Reads entire page
  code and imports, visualizes layout, edits JSX directly — no backend changes.
  Reorders sections for clarity. Use for redesign, declutter, easier navigation,
  Guidance/Evaluator pages under Web/resources/js.
---

# OCC UI Redesign

Act as a **senior frontend designer** (hierarchy, HCI, navigation). **Default: frontend-only** — reorder and restyle; do not edit controllers, models, or routes unless the user explicitly asks.

## When to use

- User asks to redesign, declutter, simplify navigation, or improve a page "without breaking functionality"
- New dashboard or analytics layout
- Professors/staff find UI "confusing" or "too many elements"

## Workflow

### 1. Read and understand the full frontend (required)

**Every page or file the user sends, @mentions, or pastes** — read it **entirely** (line 1 → export). This is not limited to Dashboard; it applies to **all** files they provide in the conversation.

Do not redesign from memory, grep-only context, or partial snippets.

1. Read the page (e.g. `Pages/Guidance/Dashboard.jsx`) **completely**.
2. Open each **import** that affects layout or data display (`Layout`, `ChartCard`, modals, local components).
3. Write an inventory:
   - **Props** from Inertia (names exactly as destructured)
   - **useState / useEffect**
   - **Derived values** (charts, KPIs, filters)
   - **Handlers** (`onClick`, `router.post`, form submit)
   - **Routes** (`Link href` — copy URLs exactly)
   - **List keys** (`resultId`, `examId`, etc.)
   - **Empty / error UI**
4. Count sections/widgets at equal visual weight.

Use `Read`, `Grep`, `Glob` — never skip.

**Understand display fields in JSX** (do not change backend during redesign):

1. Note the exact expression (e.g. `result.examinee?.full_name`, `exam['exam-ref-no']`).
2. Grep the same pattern on a **working page** (e.g. `ExamResults.jsx`) if unsure.
3. You may add a **frontend helper** (e.g. `getExamineeDisplayName`) that uses the **same** fields — never invent new prop names.
4. If data is missing in the browser, **tell the user** a backend fix may be needed — do not edit PHP unless they ask.

**Do not edit** `app/Http/Controllers/`, models, or `routes/web.php` for a redesign task.

### 2. Visualize the layout

Before editing, sketch **current vs proposed** structure (ASCII or short bullets):

```
CURRENT (example)          →  PROPOSED
─────────────────          →  ─────────
Hero + active exams badge  →  Welcome + quick actions only
4 KPI cards                →  4 compact KPIs (one row)
Large preferred banner     →  Header link chip
3 performance cards        →  Secondary stats strip
3 charts side-by-side      →  Tabbed single chart
Heavy list rows            →  Simple divided lists
```

Call out **duplicates removed** (metric shown once) and **sections** (target ≤4).

Share this with the user when they asked for a plan first; otherwise use it as your own map and **edit the code directly**.

### 3. Plan (when user wants review first)

Create or fill: `.cursor/plans/templates/ui-redesign-plan.md` (optional copy under `.cursor/plans/`).

**Wait for go / proceed** only if the user or project rule requires approval. If they say "redesign this page" or "implement now", skip to step 5.

### 4. Design principles

| Principle | Application |
|-----------|-------------|
| One metric, one place | Pick KPI row OR chart, not both for the same number |
| Section story | Overview → Analytics (optional depth) → Recent / tables |
| Progressive disclosure | Tabs for 3+ charts; collapsible "More analytics" on mobile |
| Calm density | `space-y-8`–`space-y-10` between sections; tighter padding inside lists |
| Same brand | `#1D293D`, `#1447E6`, white cards — see `occ-design-tokens` rule |
| Recognition over recall | Sentence-case section titles; "View all" to full pages |

### 5. Edit the frontend directly

**Implement in the repo** — `StrReplace` / `Write` on JSX only.

- Files: `resources/js/Pages/...`, optionally `resources/js/Components/...` for layout wrappers
- **Preserve** prop names, calculations, chart datasets, and all routes
- **Reorder** sections; adjust Tailwind; add UI-only `useState` (tabs)
- Keep `Layout user={user}` and existing child components
- Add `console.log` for new UI interactions
- Run `ReadLints` on edited files

Do **not** deliver only a plan when the user asked to implement. Do **not** touch PHP.

### 6. Verify

- [ ] Read full file once more after edit — nothing orphaned
- [ ] All original props still used
- [ ] All `Link` / `router` URLs unchanged
- [ ] Empty states preserved
- [ ] Mobile layout acceptable
- [ ] **Diff contains no backend files**

## Page patterns

### Dashboard (reference)

```
Header (welcome + date + 1–2 quick actions)
Overview (4 KPIs + slim secondary stats strip)
Analytics (tabbed single chart OR collapsible block)
Recent (two lists with View all)
```

### List-heavy pages

- Filters + table in one card; actions in header right
- Row actions: icon + label or single menu — avoid 4 buttons per row

### Modals

Overlay: `fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50`

## Anti-patterns

- 13 equal cards on one scroll
- ALL CAPS section labels everywhere
- Status shown as subtitle **and** badge
- Giant promo banner for a single link (use header chip instead)
- New color palette per page

## Additional resources

- Checklist: [checklist.md](checklist.md)
- HCI & layout reference: [reference.md](reference.md)
- Plan template: `../../plans/templates/ui-redesign-plan.md`
