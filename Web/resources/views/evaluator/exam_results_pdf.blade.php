<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Department Exam Results</title>
  <style>
    body { font-family: ui-sans-serif, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Noto Sans', Arial, sans-serif; margin: 24px; color: #111827; }
    .header { display:flex; align-items:center; gap:16px; border-bottom:1px solid #e5e7eb; padding-bottom:12px; margin-bottom:16px; }
    .header img { height: 64px; width: 64px; object-fit: contain; }
    h1 { font-size: 20px; margin: 0; }
    .muted { color:#6b7280; font-size:12px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border-bottom:1px solid #e5e7eb; padding:8px; font-size:12px; text-align:left; }
    th { background:#f9fafb; font-weight:600; }
  </style>
</head>
<body>
  <div class="header">
    @if($logo)
      <img src="{{ asset($logo) }}" alt="Department Logo" />
    @endif
    <div>
      <h1>Departmental Exam Results</h1>
      <div class="muted">Department: {{ $department }} | Evaluator: {{ $evaluator->name }} | Generated: {{ $generatedAt }}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Student</th>
        <th>Exam Ref</th>
        <th>Exam Title</th>
        <th>Score</th>
        <th>Correct</th>
        <th>Total</th>
        <th>Remarks</th>
        <th>Date</th>
      </tr>
    </thead>
    <tbody>
      @foreach($results as $idx => $r)
        <tr>
          <td>{{ $idx + 1 }}</td>
          <td>{{ $r['student_name'] }}</td>
          <td>{{ $r['exam_ref_no'] }}</td>
          <td>{{ $r['exam_title'] }}</td>
          <td>{{ $r['score_percentage'] }}%</td>
          <td>{{ $r['correct_answers'] }}</td>
          <td>{{ $r['total_items'] }}</td>
          <td>{{ $r['remarks'] }}</td>
          <td>{{ $r['date_taken'] }}</td>
        </tr>
      @endforeach
    </tbody>
  </table>

  <script>
    // auto-trigger print when opened directly
    if (typeof window !== 'undefined') {
      setTimeout(() => window.print(), 300);
    }
  </script>
</body>
</html>


