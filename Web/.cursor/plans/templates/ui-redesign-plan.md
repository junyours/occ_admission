# UI Redesign Plan: [Page Name]

**Date:** YYYY-MM-DD  
**File(s):** `Web/resources/js/Pages/...`  
**Owner / reviewer:** [User]  
**Status:** Draft | Approved | Implemented

---

## 1. Problem

What users said (e.g. "looks good but confusing", too many cards):

- 

## 2. Constraints

- [ ] **Frontend only** — no `*Controller.php`, models, migrations, or route changes
- [ ] Agent read **entire** page file + key imports before editing
- [ ] Keep all existing functionality (props, handlers, routes, empty states)
- [ ] Keep color scheme (`#1D293D`, `#1447E6`)
- [ ] Other:

## 3. Current audit

| Widget / section | Data (props) | Issue (duplicate, noise, etc.) |
|------------------|--------------|--------------------------------|
| | | |

**Section count above fold:**  
**Duplicate metrics:**

## 4. Proposed information architecture

```
[Describe or ASCII wireframe]

Example:
┌ Header: welcome + date + quick actions ─┐
├ Overview: 4 KPIs + secondary strip      ┤
├ Analytics: tabbed charts (1 visible)    ┤
└ Recent: exams | results + View all      ┘
```

## 5. Changes summary

| Change | Type | Notes |
|--------|------|-------|
| Remove duplicate "Active exams" from header | Remove duplicate | Keep KPI card only |
| Merge 3 performance cards into stats strip | Consolidate | |
| Tabbed charts | Progressive disclosure | Same Chart.js data |

## 6. Out of scope

- 

## 7. Test plan

- [ ] Desktop layout
- [ ] Mobile
- [ ] Empty states (no exams / no results)
- [ ] All links still resolve

## 8. Approval

- [ ] User said **go** / **proceed**

---

## Agent implementation notes (fill after build)

- Files changed:
- Deviations from plan:
