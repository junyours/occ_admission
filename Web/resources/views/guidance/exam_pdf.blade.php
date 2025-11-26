<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="theme-color" content="#3b82f6" />
  <title>{{ $exam['exam_ref_no'] }} - {{ $exam['exam_title'] }}</title>
  <style>
    * {
      box-sizing: border-box;
    }
    
    /* CRITICAL: Force all colors to show in print */
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
    
    body { 
      font-family: 'Times New Roman', serif; 
      margin: 0;
      padding: 20px; 
      color: #000000; 
      line-height: 1.6;
      background: #ffffff;
      font-size: 12pt;
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    /* Professional Header Layout */
    .exam-header {
      text-align: center;
      margin-bottom: 15px;
      border-bottom: 3px solid #1e40af;
      padding-bottom: 10px;
    }
    
    .header-logos {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 40px;
      margin-bottom: 10px;
    }
    
    .main-logo {
      width: 60px;
      height: 60px;
      object-fit: contain;
    }
    
    .college-info {
      text-align: center;
    }
    
    .college-name {
      font-size: 14pt;
      font-weight: bold;
      margin: 0;
      color: #1e40af;
    }
    
    .college-location {
      font-size: 10pt;
      margin: 3px 0;
      color: #374151;
    }
    
    .course-info {
      font-size: 11pt;
      font-weight: bold;
      margin: 3px 0;
      color: #000000;
    }
    
    /* Instructions Section */
    .instructions {
      margin: 10px 0;
      padding: 10px;
      background: #f8fafc;
      border-left: 4px solid #1e40af;
    }
    
    .instructions h3 {
      margin: 0 0 5px 0;
      font-size: 12pt;
      font-weight: bold;
      color: #1e40af;
    }
    
    .instructions p {
      margin: 3px 0;
      font-size: 10pt;
    }
    
    /* Question Layout */
    .question {
      margin: 12px 0;
      page-break-inside: avoid;
    }
    
    .question-number {
      display: inline-block;
      width: 22px;
      height: 22px;
      background: #1e40af;
      color: white;
      border-radius: 50%;
      text-align: center;
      line-height: 22px;
      font-weight: bold;
      margin-right: 8px;
      font-size: 10pt;
    }
    
    .question-text {
      display: inline;
      font-size: 12pt;
      line-height: 1.5;
    }
    
    .question-instruction {
      margin: 5px 0 8px 30px;
      padding: 8px 12px;
      background: #f8fafc;
      border-left: 3px solid #3b82f6;
      font-size: 10pt;
      font-style: italic;
      color: #374151;
      border-radius: 4px;
    }
    
    .question-image {
      margin: 10px 0;
      text-align: center;
    }
    
    .question-image img {
      max-width: 100%;
      max-height: 200px;
      border: 1px solid #d1d5db;
      border-radius: 4px;
    }
    
    /* Options Layout - 2 Column Grid */
    .options {
      margin: 8px 0 8px 30px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    
    .option {
      margin: 5px 0;
      font-size: 10pt;
      line-height: 1.3;
    }
    
    .option-letter {
      font-weight: bold;
      margin-right: 8px;
    }
    
    .option-image {
      margin: 5px 0;
      text-align: center;
    }
    
    .option-image img {
      max-width: 100%;
      max-height: 120px;
      border: 1px solid #d1d5db;
      border-radius: 4px;
    }
    
    /* Answer Key Page */
    .answer-key-page {
      page-break-before: always;
      margin-top: 30px;
    }
    
    .answer-key-header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 2px solid #1e40af;
      padding-bottom: 15px;
    }
    
    .answer-key-title {
      font-size: 18pt;
      font-weight: bold;
      color: #1e40af;
      margin: 0;
    }
    
    /* Category Section Styling */
    .category-section {
      margin: 20px 0 15px 0;
      page-break-inside: avoid;
    }
    
    .category-title {
      font-size: 14pt;
      font-weight: bold;
      color: #1e40af;
      margin: 0;
      padding: 8px 15px;
      background: #f1f5f9;
      border-left: 4px solid #1e40af;
      border-radius: 4px;
    }
    
    .answer-key-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .answer-item {
      background: white;
      padding: 10px 15px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      font-size: 12pt;
      font-weight: bold;
      text-align: center;
      color: #1e293b;
    }
    
    .exam-footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #d1d5db;
      text-align: center;
      font-size: 9pt;
      color: #6b7280;
    }
    
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      body {
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  </style>
</head>
<body>
  <!-- Professional Header -->
  <div class="exam-header">
    <div class="header-logos">
      <div>
        @if($logo)
          <img src="{{ $logo }}" alt="OCC Logo" class="main-logo">
        @endif
      </div>
      <div class="college-info">
        <h1 class="college-name">OPOL COMMUNITY COLLEGE</h1>
        <p class="college-location">Opol, Misamis Oriental</p>
        <p class="course-info">{{ $exam['exam_ref_no'] }} - {{ $exam['exam_title'] }}</p>
      </div>
      <div>
        <!-- Empty div for symmetry -->
      </div>
    </div>
  </div>

  <!-- Instructions -->
  <div class="instructions">
    <h3>I. MULTIPLE CHOICE</h3>
    <p><strong>Instructions:</strong> Choose the letter of the correct answer. Write your answer on a separate answer sheet.</p>
    <p><strong>Time Limit:</strong> {{ $exam['time_limit'] }} minutes</p>
    <p><strong>Passing Score:</strong> 75%</p>
  </div>

  <!-- Questions Organized by Categories -->
  @if($questionsByCategory && count($questionsByCategory) > 0)
    @php $questionNumber = 1; @endphp
    @foreach($questionsByCategory as $category => $questions)
      <!-- Category Header -->
      <div class="category-section">
        <h2 class="category-title">{{ $category }}</h2>
      </div>
      
      @foreach($questions as $question)
        <div class="question">
          <span class="question-number">{{ $questionNumber }}</span>
          <span class="question-text">{{ $question['question'] }}</span>
          
          @if($question['direction'] && !empty(trim($question['direction'])))
            <div class="question-instruction">
              <strong>Instructions:</strong> {{ $question['direction'] }}
            </div>
          @endif
          
          @if($question['has_image'] && $question['image'])
            <div class="question-image">
              <img src="{{ $question['image'] }}" alt="Question Image" onerror="console.log('Question image failed to load:', this.src.substring(0, 100))">
            </div>
          @endif
          
          <div class="options">
            <div class="option">
              <span class="option-letter">A)</span> {{ $question['option1'] }}
              @if($question['has_option_images']['option1'] && $question['option1_image'])
                <div class="option-image">
                  <img src="{{ $question['option1_image'] }}" alt="Option A" onerror="console.log('Option A image failed to load:', this.src.substring(0, 100))">
                </div>
              @endif
            </div>
            
            <div class="option">
              <span class="option-letter">B)</span> {{ $question['option2'] }}
              @if($question['has_option_images']['option2'] && $question['option2_image'])
                <div class="option-image">
                  <img src="{{ $question['option2_image'] }}" alt="Option B" onerror="console.log('Option B image failed to load:', this.src.substring(0, 100))">
                </div>
              @endif
            </div>
            
            <div class="option">
              <span class="option-letter">C)</span> {{ $question['option3'] }}
              @if($question['has_option_images']['option3'] && $question['option3_image'])
                <div class="option-image">
                  <img src="{{ $question['option3_image'] }}" alt="Option C" onerror="console.log('Option C image failed to load:', this.src.substring(0, 100))">
                </div>
              @endif
            </div>
            
            <div class="option">
              <span class="option-letter">D)</span> {{ $question['option4'] }}
              @if($question['has_option_images']['option4'] && $question['option4_image'])
                <div class="option-image">
                  <img src="{{ $question['option4_image'] }}" alt="Option D" onerror="console.log('Option D image failed to load:', this.src.substring(0, 100))">
                </div>
              @endif
            </div>
            
            @if($question['option5'])
              <div class="option">
                <span class="option-letter">E)</span> {{ $question['option5'] }}
                @if($question['has_option_images']['option5'] && $question['option5_image'])
                  <div class="option-image">
                    <img src="{{ $question['option5_image'] }}" alt="Option E" onerror="console.log('Option E image failed to load:', this.src.substring(0, 100))">
                  </div>
                @endif
              </div>
            @endif
          </div>
        </div>
        @php $questionNumber++; @endphp
      @endforeach
    @endforeach
  @endif

  <!-- Answer Key Page -->
  <div class="answer-key-page">
    <div class="answer-key-header">
      <h2 class="answer-key-title">ANSWER KEY</h2>
      <p><strong>Exam:</strong> {{ $exam['exam_ref_no'] }} - {{ $exam['exam_title'] }}</p>
    </div>
    
    <div class="answer-key-grid">
      @if($allQuestions && count($allQuestions) > 0)
        @foreach($allQuestions as $index => $question)
          <div class="answer-item">
            {{ $index + 1 }}) {{ $question['correct_answer'] }}
          </div>
        @endforeach
      @endif
    </div>
    
    <div class="exam-footer">
      <p>Generated on {{ $generatedAt }} | OPOL COMMUNITY COLLEGE</p>
    </div>
  </div>

  <script>
    // Auto-print when page loads (same as ExamResults)
    if (typeof window !== 'undefined') {
      window.addEventListener('load', function() {
        console.log('PDF content loaded, triggering print...');
        setTimeout(function() {
          window.focus();
          window.print();
        }, 500);
      });
    }
  </script>
</body>
</html>