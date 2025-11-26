<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Exam Result</title>
  <style>
    body { font-family: ui-sans-serif, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Noto Sans', Arial, sans-serif; margin: 24px; color: #111827; }
    .header { display:flex; align-items:center; gap:16px; border-bottom:1px solid #e5e7eb; padding-bottom:12px; margin-bottom:16px; }
    .header img { height: 64px; width: 64px; object-fit: contain; }
    h1 { font-size: 20px; margin: 0; }
    .muted { color:#6b7280; font-size:12px; }
    .grid { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 12px; margin-bottom: 16px; }
    .card { background:#f9fafb; border:1px solid #e5e7eb; padding:12px; border-radius:8px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border-bottom:1px solid #e5e7eb; padding:8px; font-size:12px; text-align:left; }
    th { background:#f3f4f6; font-weight:600; }
    .ok { color:#065f46; }
    .bad { color:#991b1b; }
  </style>
</head>
<body>
  <div class="header">
    @if($logo)
      <img src="{{ asset($logo) }}" alt="Department Logo" />
    @endif
    <div>
      <h1>Departmental Exam Result</h1>
      <div class="muted">Department: {{ $department }} | Evaluator: {{ $evaluator->name }} | Generated: {{ $generatedAt }}</div>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="muted">Student</div>
      <div>{{ $result['student_name'] }}</div>
    </div>
    <div class="card">
      <div class="muted">Exam</div>
      <div>{{ $result['exam_ref_no'] }} — {{ $result['exam_title'] }}</div>
    </div>
    <div class="card">
      <div class="muted">Score</div>
      <div>{{ $result['score_percentage'] }}% ({{ $result['correct_answers'] }}/{{ $result['total_items'] }})</div>
    </div>
    <div class="card">
      <div class="muted">Remarks</div>
      <div>{{ $result['remarks'] }}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Question</th>
        <th>Your Answer</th>
        <th>Correct</th>
      </tr>
    </thead>
    <tbody>
      @foreach($answers as $idx => $a)
        <tr>
          <td>{{ $idx + 1 }}</td>
          <td>{{ $a['question'] }}</td>
          <td class="{{ $a['is_correct'] ? 'ok' : 'bad' }}">{{ $a['student_answer'] }}</td>
          <td>{{ $a['correct_answer'] }}</td>
        </tr>
      @endforeach
    </tbody>
  </table>

  <script>
    if (typeof window !== 'undefined') {
      setTimeout(() => window.print(), 300);
    }
  </script>
</body>
</html>


