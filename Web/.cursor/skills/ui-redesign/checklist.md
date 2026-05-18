# UI Redesign Checklist

Copy into plan or PR description.

## Discovery

- [ ] **Read every file the user sent** in full (all pages/paths — not only Dashboard)
- [ ] Read imported **Components** that affect layout/props
- [ ] Inventoried props, state, handlers, routes, keys, empty states
- [ ] Confirmed task is **frontend-only** (no controller/model edits)
- [ ] Drew current vs proposed layout (ASCII or bullets)
- [ ] Listed all Inertia props and where they render
- [ ] Listed all user actions (links, POST, toggles)
- [ ] Identified duplicate metrics/widgets
- [ ] Counted sections above the fold (target ≤4)

## Design

- [ ] Defined primary user goal for this screen
- [ ] Single primary CTA (or none for read-only dashboards)
- [ ] Section order documented
- [ ] User approved plan (go signal)

## Implementation

- [ ] **Edited the actual JSX file(s)** in the repo
- [ ] No controller/route changes (frontend-only) OR backend explicitly scoped
- [ ] Colors match OCC tokens (`#1D293D`, `#1447E6`)
- [ ] Section headings sentence case
- [ ] Lists simplified (no duplicate status)
- [ ] Charts: tabs/collapse if >1 competes for attention
- [ ] `console.log` for key state changes
- [ ] Empty states kept

## QA

- [ ] Desktop layout
- [ ] Mobile / narrow width
- [ ] Keyboard: tab buttons focusable
- [ ] Screen reader: sections have headings / `aria-labelledby`
