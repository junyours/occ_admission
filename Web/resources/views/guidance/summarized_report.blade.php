<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OCC - Exam Results</title>
    <style>
        @media print { 
            @page { 
                margin: 10mm; 
                size: A4;
            } 
        }
        body { 
            font-family: Arial, sans-serif; 
            color:#000; 
            font-size: 12px; 
            line-height: 1.4;
        }
        .header { 
            text-align: center; 
            margin-bottom: 20px; 
            border-bottom: 2px solid #000; 
            padding-bottom: 10px;
        }
        .college-name { 
            font-size: 18px; 
            font-weight: bold; 
            margin-bottom: 5px;
        }
        .college-location { 
            font-size: 14px; 
            margin-bottom: 10px;
        }
        .report-title { 
            font-size: 16px; 
            font-weight: bold; 
            color: #d32f2f; 
            text-transform: uppercase;
            margin-bottom: 20px;
        }
        .student-info { 
            margin-bottom: 20px;
        }
        .info-row {
            display: flex;
            margin-bottom: 15px;
        }
        .info-row-left {
            display: flex;
            flex: 1;
        }
        .info-row-right {
            display: flex;
            flex: 1;
        }
        .info-label { 
            font-weight: bold; 
            min-width: 150px;
            text-align: left;
        }
        .info-value { 
            flex: 1;
            text-align: left;
        }
        .scores-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 20px;
        }
        .scores-table th, 
        .scores-table td { 
            border: 1px solid #000; 
            padding: 8px; 
            text-align: center;
        }
        .scores-table th { 
            background-color: #f5f5f5; 
            font-weight: bold;
        }
        .total-row { 
            background-color: #fff3e0; 
            font-weight: bold;
        }
        .programs-section { 
            margin-top: 20px;
        }
        .programs-title { 
            font-weight: bold; 
            margin-bottom: 10px; 
            text-align: center;
        }
        .programs-container {
            border: 2px solid #000;
            padding: 20px;
            margin: 20px auto;
            max-width: 100%;
            background-color: #f9f9f9;
        }
        .programs-list { 
            text-align: center; 
            margin-bottom: 30px;
        }
        .program-item {
            display: inline-block;
            margin: 10px 15px;
            font-size: 16px;
            font-weight: bold;
        }
        .program-checkbox {
            border: 2px solid #000;
            padding: 4px 6px;
            margin-right: 8px;
            font-size: 16px;
            font-weight: bold;
            display: inline-block;
            min-width: 20px;
            text-align: center;
        }
        .signature-section { 
            margin-top: 40px; 
            text-align: center;
        }
        .signature-image {
            margin-bottom: 15px;
        }
        .signature-image img {
            height: 80px;
        }
        .signature-line { 
            border-bottom: 1px solid #000; 
            width: 200px; 
            margin: 20px 0 5px auto;
        }
        .officer-name { 
            font-weight: bold; 
            margin-bottom: 5px;
        }
        .officer-title { 
            font-size: 11px; 
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="college-name">OPOL COMMUNITY COLLEGE</div>
        <div class="college-location">Opol, Misamis Oriental</div>
        <div class="report-title">Entrance Exam Results</div>
    </div>

    <div class="student-info">
        <div class="info-row">
            <div class="info-row-left">
                <div class="info-label">NAME:</div>
                <div class="info-value" style="font-weight: bold; text-decoration: underline;">{{ $studentName }}</div>
            </div>
            <div class="info-row-right">
                <div class="info-label">DATE OF EXAM:</div>
                <div class="info-value">{{ $examDate }}</div>
            </div>
        </div>
        <div class="info-row">
            <div class="info-row-left">
                <div class="info-label">ADDRESS:</div>
                <div class="info-value" style="font-weight: bold; text-decoration: underline;">{{ $studentAddress }}</div>
            </div>
            <div class="info-row-right">
                <div class="info-label">PREFERRED COURSE:</div>
                <div class="info-value">{{ $preferredCourse ?? '[To be added later]' }}</div>
            </div>
        </div>
    </div>

    <table class="scores-table">
        <thead>
            <tr>
                <th>SUBJECT</th>
                <th>SCORE</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>ENGLISH</td>
                <td>{{ $englishScore }}</td>
            </tr>
            <tr>
                <td>FILIPINO</td>
                <td>{{ $filipinoScore }}</td>
            </tr>
            <tr>
                <td>MATH</td>
                <td>{{ $mathScore }}</td>
            </tr>
            <tr>
                <td>SCIENCE</td>
                <td>{{ $scienceScore }}</td>
            </tr>
            <tr>
                <td>ABSTRACT</td>
                <td>{{ $abstractScore }}</td>
            </tr>
            <tr class="total-row">
                <td>TOTAL</td>
                <td>{{ $totalScore }}</td>
            </tr>
        </tbody>
    </table>

    <div class="programs-section">
        <div class="programs-title">PROGRAM QUALIFIED TO ENROLL</div>
        <div class="programs-container">
            <div class="programs-list">
                <div class="program-item">
                    <span class="program-checkbox">{{ in_array('EDUC', $qualifiedPrograms) ? '✓' : '' }}</span>
                    EDUC
                </div>
                <div class="program-item">
                    <span class="program-checkbox">{{ in_array('BSBA', $qualifiedPrograms) ? '✓' : '' }}</span>
                    BSBA
                </div>
                <div class="program-item">
                    <span class="program-checkbox">{{ in_array('BSIT', $qualifiedPrograms) ? '✓' : '' }}</span>
                    BSIT
                </div>
            </div>
        </div>
    </div>

    <div class="signature-section">
        <div class="signature-image">
            <img src="{{ asset('sign.png') }}" alt="Signature" />
        </div>
    </div>

    <div style="margin-top: 20px; font-size: 10px; color: #666; text-align: center;">
        Generated by OCC Guidance Office • {{ now()->format('M d, Y g:i A') }}
    </div>
</body>
</html>
