# UI Redesign Plan: Guidance Dashboard

**Date:** 2026-05-18  
**File:** `Web/resources/js/Pages/Guidance/Dashboard.jsx`  
**Status:** Implemented

## Problem

Too many equal-weight sections (~13 blocks): duplicate active exams, large preferred-courses banner, redundant performance cards, three charts at once, heavy list rows.

## Solution (implemented)

1. **Header** — Welcome + date + Preferred courses / Manage exams links (removed duplicate active-exams badge).
2. **Overview** — 4 compact KPIs + secondary strip (pass rate, courses, personality items).
3. **Analytics** — Tabbed single chart (same Chart.js data).
4. **Recent activity** — Simplified lists + View all links.

## Test

- [ ] Load `/guidance/dashboard`
- [ ] Switch chart tabs
- [ ] Click quick actions and View all links
- [ ] Check mobile width
