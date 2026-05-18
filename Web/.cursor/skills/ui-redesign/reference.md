# UI Redesign Reference — HCI & Layout

## Visual hierarchy (designer lens)

1. **Primary**: One title + one dominant number or chart per viewport.
2. **Secondary**: Supporting KPIs in a single row or strip.
3. **Tertiary**: Tables, recent lists, footnotes.
4. **Chrome**: Sidebar/topbar — should not compete with content.

Use size and weight before adding more borders. Prefer one border style: `rounded-xl border border-slate-200`.

## HCI (staff / professor users)

- **Consistency**: Same section pattern across Guidance pages.
- **Simplicity**: Default view shows essentials; depth on demand.
- **Error prevention**: Confirm destructive actions; disable submit while loading.
- **Feedback**: Loading states, success/error via existing alerts or Inertia flash.
- **Efficiency**: Quick links in header to high-traffic routes (exam management, results).
- **Recognition**: "View all" instead of hiding data behind unexplained icons.

## Tailwind spacing scale (this project)

| Intent | Class |
|--------|--------|
| Between major sections | `space-y-8` or `space-y-10` |
| Card padding | `p-4`–`p-6` |
| Compact KPI | `px-4 py-4` |
| List row | `px-4 py-3` |
| Page container | `max-w-6xl mx-auto` (dashboards); `max-w-7xl` (wide tables) |

## Chart tabs pattern

```jsx
const [activeChart, setActiveChart] = useState('passfail');

<div className="flex flex-wrap gap-1 border-b border-slate-100 p-2">
  {tabs.map((tab) => (
    <button
      key={tab.id}
      type="button"
      onClick={() => setActiveChart(tab.id)}
      className={activeChart === tab.id
        ? 'rounded-lg bg-[#1447E6] px-4 py-2 text-sm font-medium text-white'
        : 'rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100'}
    >
      {tab.label}
    </button>
  ))}
</div>
```

## Tracing a displayed value (example: student name)

| Layer | Location |
|-------|----------|
| JSX | `getExamineeDisplayName(result)` or `result.examinee?.full_name` |
| Controller | `GuidanceController::dashboard()` → `recent_results` |
| Model | `ExamResult::examinee()` → `Examinee::getFullNameAttribute()` |
| DB | `examinee.fname`, `lname`, `mname`; FK `exam_results.examineeId` → `examinee.id` |

If `examinee` is `null` in JSON, the FK points to a missing row (orphaned result). Fix in the controller query (`whereHas('examinee')`), not only the fallback string.

## Guidance route quick reference

| Feature | Path |
|---------|------|
| Dashboard | `/guidance/dashboard` |
| Exam management | `/guidance/exam-management` |
| Exam results | `/guidance/exam-results` |
| Preferred courses | `/guidance/preferred-courses` |
| Question bank | `/guidance/question-bank` |

Use these for "View all" links — do not invent routes.
