<?php

namespace App\Http\Controllers\Evaluator;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use App\Http\Controllers\Controller;
use App\Models\DepartmentExamBank;

class QuestionImportController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $evaluator = $user->evaluator;

        return Inertia::render('Evaluator/QuestionImport', [
            'user' => $user,
            'evaluator' => $evaluator
        ]);
    }

    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls|max:10240',
        ]);

        $user = Auth::user();
        $evaluator = $user->evaluator;
        
        if (!$evaluator) {
            Log::error('No evaluator found for user during import', ['user_id' => $user->id]);
            return back()->withErrors(['error' => 'Evaluator profile not found. Please contact administrator.']);
        }
        
        $department = $evaluator->Department ?? 'BSIT';
        
        // Validate department
        $validDepartments = ['BSIT', 'BSBA', 'EDUC'];
        if (!in_array(strtoupper($department), $validDepartments)) {
            Log::warning('Invalid department detected during import', [
                'user_id' => $user->id,
                'department' => $department
            ]);
            $department = 'BSIT'; // Default fallback
        }

        try {
            $file = $request->file('file');
            $extension = $file->getClientOriginalExtension();
            
            Log::info('Starting import for department: ' . $department, [
                'user_id' => $user->id,
                'evaluator_id' => $evaluator->id,
                'filename' => $file->getClientOriginalName(),
                'file_size' => $file->getSize()
            ]);

            DB::beginTransaction();

            $importedCount = 0;
            $errors = [];

            $importedCount = $this->importExcel($file, $department, $errors);

            DB::commit();

            $message = "Successfully imported {$importedCount} questions.";
            if (!empty($errors)) {
                $message .= " Errors: " . implode(', ', $errors);
            }

            return back()->with('success', $message);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::info('Import error: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Import failed: ' . $e->getMessage()]);
        }
    }



    private function importExcel($file, $department, &$errors)
    {
        $importedCount = 0;
        
        try {
        $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($file->getPathname());
        $worksheet = $spreadsheet->getActiveSheet();
        $rows = $worksheet->toArray();

            // Get all available images first
            $availableImages = $this->getAllAvailableImages($file->getPathname());
            
            // Get drawings (shapes with images) from the worksheet
            $drawings = $worksheet->getDrawingCollection();
            
            Log::info('Processing Excel file for evaluator', [
                'total_rows' => count($rows),
                'total_drawings' => $drawings->count(),
                'total_images' => count($availableImages),
                'department' => $department
            ]);
            
            // Convert drawings to array for easier handling
            $drawingsArray = iterator_to_array($drawings);
            
            // Create proper image-to-drawing mapping
            $drawingImageMap = $this->createDrawingImageMapping($file->getPathname(), $drawingsArray);
            
            // Skip header row
            array_shift($rows);

        foreach ($rows as $rowIndex => $row) {
                $rowNumber = $rowIndex + 2; // +2 because array is 0-indexed and we skipped header
            
            try {
                if (count($row) < 8) {
                        $errors[] = "Row {$rowNumber}: Insufficient columns (need at least 8 columns)";
                    continue;
                }

                    // Extract formatted text from cells
                    $questionFormatted = $this->extractFormattedText($worksheet, 'A' . $rowNumber);
                    $option1Formatted = $this->extractFormattedText($worksheet, 'B' . $rowNumber);
                    $option2Formatted = $this->extractFormattedText($worksheet, 'C' . $rowNumber);
                    $option3Formatted = $this->extractFormattedText($worksheet, 'D' . $rowNumber);
                    $option4Formatted = $this->extractFormattedText($worksheet, 'E' . $rowNumber);
                    $option5Formatted = $this->extractFormattedText($worksheet, 'F' . $rowNumber);

                $question = [
                    'question' => trim($row[0] ?? ''),
                        'question_formatted' => $questionFormatted ?: trim($row[0] ?? ''),
                        'option1' => trim($row[1] ?? ''),
                        'option1_formatted' => $option1Formatted ?: trim($row[1] ?? ''),
                        'option1_image' => null,
                        'option2' => trim($row[2] ?? ''),
                        'option2_formatted' => $option2Formatted ?: trim($row[2] ?? ''),
                        'option2_image' => null,
                        'option3' => trim($row[3] ?? ''),
                        'option3_formatted' => $option3Formatted ?: trim($row[3] ?? ''),
                        'option3_image' => null,
                        'option4' => trim($row[4] ?? ''),
                        'option4_formatted' => $option4Formatted ?: trim($row[4] ?? ''),
                        'option4_image' => null,
                        'option5' => trim($row[5] ?? ''),
                        'option5_formatted' => $option5Formatted ?: trim($row[5] ?? ''),
                        'option5_image' => null,
                        'correct_answer' => strtoupper(trim($row[6] ?? '')),
                        'category' => trim($row[7] ?? ''),
                        'image' => null,
                        'direction' => trim($row[8] ?? ''),
                    'department' => $department,
                    'status' => 1
                ];

                if (empty($question['question']) || empty($question['option1']) || 
                    empty($question['option2']) || empty($question['option3']) || 
                    empty($question['option4']) || empty($question['correct_answer']) || 
                    empty($question['category'])) {
                    $errors[] = "Row {$rowNumber}: Missing required fields";
                    continue;
                }

                if (!in_array($question['correct_answer'], ['A', 'B', 'C', 'D', 'E'])) {
                    $errors[] = "Row {$rowNumber}: Invalid correct answer";
                    continue;
                }

                    // Handle image mapping like guidance side
                    $imagesFoundInRow = 0;
                    foreach ($drawingImageMap as $coordinates => $imageInfo) {
                        $imageRow = intval($imageInfo['row']);
                        $imageColumn = $imageInfo['column'];
                        
                        // If this image is in the current row, assign it to the correct database field
                        if ($imageRow == $rowNumber) {
                            $imagesFoundInRow++;
                            $base64Image = base64_encode($imageInfo['data']);
                            $mimeType = $this->getMimeTypeFromExtension($imageInfo['name']);
                            $base64String = 'data:' . $mimeType . ';base64,' . $base64Image;
                            
                            // Column mapping for evaluator side
                            switch ($imageColumn) {
                                case 'J': // Column J = Main Image
                                    $question['image'] = $base64String;
                                    Log::info('✅ ASSIGNED: Cell ' . $coordinates . ' → main image field', [
                                        'row' => $rowNumber,
                                        'image' => $imageInfo['name']
                                    ]);
                                    break;
                                    
                                case 'K': // Column K = Option 1 Image
                                    $question['option1_image'] = $base64String;
                                    Log::info('✅ ASSIGNED: Cell ' . $coordinates . ' → option1_image field', [
                                        'row' => $rowNumber,
                                        'image' => $imageInfo['name']
                                    ]);
                                    break;
                                    
                                case 'L': // Column L = Option 2 Image
                                    $question['option2_image'] = $base64String;
                                    Log::info('✅ ASSIGNED: Cell ' . $coordinates . ' → option2_image field', [
                                        'row' => $rowNumber,
                                        'image' => $imageInfo['name']
                                    ]);
                                    break;
                                    
                                case 'M': // Column M = Option 3 Image
                                    $question['option3_image'] = $base64String;
                                    Log::info('✅ ASSIGNED: Cell ' . $coordinates . ' → option3_image field', [
                                        'row' => $rowNumber,
                                        'image' => $imageInfo['name']
                                    ]);
                                    break;
                                    
                                case 'N': // Column N = Option 4 Image
                                    $question['option4_image'] = $base64String;
                                    Log::info('✅ ASSIGNED: Cell ' . $coordinates . ' → option4_image field', [
                                        'row' => $rowNumber,
                                        'image' => $imageInfo['name']
                                    ]);
                                    break;
                                    
                                case 'O': // Column O = Option 5 Image
                                    $question['option5_image'] = $base64String;
                                    Log::info('✅ ASSIGNED: Cell ' . $coordinates . ' → option5_image field', [
                                        'row' => $rowNumber,
                                        'image' => $imageInfo['name']
                                    ]);
                                    break;
                                    
                                default:
                                    Log::warning('❌ IGNORED: Unexpected column', [
                                        'row' => $rowNumber,
                                        'column' => $imageColumn,
                                        'cell' => $coordinates
                                    ]);
                                    break;
                            }
                        }
                    }

                    Log::info('Row processing complete', [
                        'row' => $rowNumber,
                        'images_found_in_row' => $imagesFoundInRow,
                        'has_main_image' => !empty($question['image']),
                        'has_option1_image' => !empty($question['option1_image']),
                        'has_option2_image' => !empty($question['option2_image']),
                        'has_option3_image' => !empty($question['option3_image']),
                        'has_option4_image' => !empty($question['option4_image']),
                        'has_option5_image' => !empty($question['option5_image'])
                    ]);

                DepartmentExamBank::create($question);
                $importedCount++;

            } catch (\Exception $e) {
                $errors[] = "Row {$rowNumber}: " . $e->getMessage();
            }
            }

        } catch (\Exception $e) {
            Log::error('Error processing Excel file', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }

        return $importedCount;
    }

    public function generateTemplate()
    {
        // Get the logged-in evaluator's department
        $user = Auth::user();
        $evaluator = $user->evaluator;
        
        if (!$evaluator) {
            Log::error('No evaluator found for user', ['user_id' => $user->id]);
            return back()->withErrors(['error' => 'Evaluator profile not found. Please contact administrator.']);
        }
        
        $department = $evaluator->Department ?? 'BSIT';
        
        // Validate department
        $validDepartments = ['BSIT', 'BSBA', 'EDUC'];
        if (!in_array(strtoupper($department), $validDepartments)) {
            Log::warning('Invalid department detected', [
                'user_id' => $user->id,
                'department' => $department
            ]);
            $department = 'BSIT'; // Default fallback
        }
        
        Log::info('Generating department-specific template', [
            'user_id' => $user->id,
            'evaluator_id' => $evaluator->id ?? null,
            'department' => $department
        ]);

        require_once base_path('vendor/autoload.php');
        
        try {
        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
            $worksheet = $spreadsheet->getActiveSheet();
            
            // Set sheet title
            $worksheet->setTitle($department . ' Questions Template');

            // Set headers (matching guidance pattern exactly)
        $headers = [
                'question',
                'option1',
                'option2', 
                'option3',
                'option4',
                'option5',
                'correct_answer',
                'category',
                'direction',
                'image',
                'option1_image',
                'option2_image',
                'option3_image',
                'option4_image',
                'option5_image'
            ];
            
            // Add headers to worksheet
            foreach ($headers as $colIndex => $header) {
                $worksheet->setCellValue(\PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($colIndex + 1) . '1', $header);
            }
            
            // Style the header row
            $worksheet->getStyle('A1:O1')->getFont()->setBold(true);
            $worksheet->getStyle('A1:O1')->getFill()->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID);
            $worksheet->getStyle('A1:O1')->getFill()->getStartColor()->setRGB('4F46E5');
            
            // Add department-specific sample data
            $sampleData = $this->getDepartmentSampleData($department);
            
            foreach ($sampleData as $rowIndex => $rowData) {
                foreach ($rowData as $colIndex => $cellData) {
                    $worksheet->setCellValue(\PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($colIndex + 1) . ($rowIndex + 2), $cellData);
                }
            }
            
            // Auto-size columns
            foreach (range('A', 'O') as $column) {
                $worksheet->getColumnDimension($column)->setAutoSize(true);
            }
            
            // Create the Excel file
        $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
            $filename = $department . '_questions_template.xlsx';
            $filepath = public_path($filename);
            
            $writer->save($filepath);
            
            Log::info('Template generated successfully', [
                'filename' => $filename,
                'department' => $department,
                'sample_rows' => count($sampleData)
            ]);
            
            $response = response()->download($filepath, $filename, [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ]);
            
            return $response->deleteFileAfterSend(true);

        } catch (\Exception $e) {
            Log::error('Error generating template', [
                'error' => $e->getMessage(),
                'department' => $department,
                'trace' => $e->getTraceAsString()
            ]);
            
            return back()->withErrors(['error' => 'Failed to generate template: ' . $e->getMessage()]);
        }
    }

    private function getDepartmentSampleData($department)
    {
        $sampleData = [];
        
        switch (strtoupper($department)) {
            case 'BSIT':
                $sampleData = [
                    [
                        'What is the primary function of a database management system?',
                        'To store and retrieve data efficiently',
                        'To create web pages',
                        'To manage computer hardware',
                        'To design user interfaces',
                        '',
                        'A',
                        'Database Management',
                        'Choose the best answer that describes the primary function of a DBMS.',
                        '', // image
                        '', // option1_image
                        '', // option2_image
                        '', // option3_image
                        '', // option4_image
                        ''  // option5_image
                    ],
                    [
                        'Which programming language is commonly used for web development?',
                        'JavaScript',
                        'Assembly',
                        'Machine Code',
                        'Binary',
                        '',
                        'A',
                        'Programming',
                        'Select the programming language most commonly used for web development.',
                        '', // image
                        '', // option1_image
                        '', // option2_image
                        '', // option3_image
                        '', // option4_image
                        ''  // option5_image
                    ],
                    [
                        'What does HTTP stand for in web development?',
                        'HyperText Transfer Protocol',
                        'High Tech Transfer Process',
                        'Home Tool Transfer Protocol',
                        'Hyperlink Text Transfer Process',
                        '',
                        'A',
                        'Networking',
                        'Choose the correct expansion of HTTP.',
                        '', // image
                        '', // option1_image
                        '', // option2_image
                        '', // option3_image
                        '', // option4_image
                        ''  // option5_image
                    ]
                ];
                break;
                
            case 'BSBA':
                $sampleData = [
                    [
                        'What is the primary goal of marketing?',
                        'To satisfy customer needs and wants',
                        'To maximize profits only',
                        'To reduce production costs',
                        'To eliminate competition',
                        '',
                        'A',
                        'Marketing',
                        'Select the primary goal of marketing activities.',
                        '', // image
                        '', // option1_image
                        '', // option2_image
                        '', // option3_image
                        '', // option4_image
                        ''  // option5_image
                    ],
                    [
                        'Which financial statement shows a company\'s profitability?',
                        'Income Statement',
                        'Balance Sheet',
                        'Cash Flow Statement',
                        'Statement of Equity',
                        '',
                        'A',
                        'Finance',
                        'Choose the financial statement that primarily shows profitability.',
                        '', // image
                        '', // option1_image
                        '', // option2_image
                        '', // option3_image
                        '', // option4_image
                        ''  // option5_image
                    ],
                    [
                        'What is SWOT analysis used for in business?',
                        'Strategic planning and analysis',
                        'Financial reporting',
                        'Employee evaluation',
                        'Inventory management',
                        '',
                        'A',
                        'Business Strategy',
                        'Select the primary purpose of SWOT analysis.',
                        '', // image
                        '', // option1_image
                        '', // option2_image
                        '', // option3_image
                        '', // option4_image
                        ''  // option5_image
                    ]
                ];
                break;
                
            case 'EDUC':
                $sampleData = [
                    [
                        'What is the primary role of a teacher in student-centered learning?',
                        'Facilitator of learning',
                        'Sole source of knowledge',
                        'Disciplinarian',
                        'Administrator',
                        '',
                        'A',
                        'Teaching Methods',
                        'Choose the most appropriate role of a teacher in student-centered learning.',
                        '', // image
                        '', // option1_image
                        '', // option2_image
                        '', // option3_image
                        '', // option4_image
                        ''  // option5_image
                    ],
                    [
                        'Which learning theory emphasizes the importance of social interaction?',
                        'Social Constructivism',
                        'Behaviorism',
                        'Cognitivism',
                        'Humanism',
                        '',
                        'A',
                        'Educational Psychology',
                        'Select the learning theory that focuses on social interaction.',
                        '', // image
                        '', // option1_image
                        '', // option2_image
                        '', // option3_image
                        '', // option4_image
                        ''  // option5_image
                    ],
                    [
                        'What is curriculum alignment?',
                        'Matching learning objectives with assessment methods',
                        'Scheduling classes',
                        'Grading students',
                        'Managing school facilities',
                        '',
                        'A',
                        'Curriculum Development',
                        'Choose the best definition of curriculum alignment.',
                        '', // image
                        '', // option1_image
                        '', // option2_image
                        '', // option3_image
                        '', // option4_image
                        ''  // option5_image
                    ]
                ];
                break;
                
            default:
                // Default sample data for unknown departments
                $sampleData = [
                    [
                        'Sample question for your department?',
                        'Option A',
                        'Option B',
                        'Option C',
                        'Option D',
                        '',
                        'A',
                        'General',
                        'Sample direction for the question.',
                        '', // image
                        '', // option1_image
                        '', // option2_image
                        '', // option3_image
                        '', // option4_image
                        ''  // option5_image
                    ]
                ];
        }
        
        Log::info('Generated sample data for department', [
            'department' => $department,
            'sample_count' => count($sampleData)
        ]);
        
        return $sampleData;
    }

    /**
     * Get MIME type from file extension
     */
    private function getMimeTypeFromExtension($filename)
    {
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        
        switch ($extension) {
            case 'jpg':
            case 'jpeg':
                return 'image/jpeg';
            case 'png':
                return 'image/png';
            case 'gif':
                return 'image/gif';
            case 'bmp':
                return 'image/bmp';
            case 'webp':
                return 'image/webp';
            default:
                return 'image/jpeg'; // Default fallback
        }
    }

    /**
     * Extract formatted text from a cell
     */
    private function extractFormattedText($worksheet, $cellAddress)
    {
        try {
            $cell = $worksheet->getCell($cellAddress);
            $value = $cell->getValue();
            
            if (empty($value)) {
                return null;
            }
            
            // Get the rich text object if it exists
            $richText = $cell->getValue();
            if ($richText instanceof \PhpOffice\PhpSpreadsheet\RichText\RichText) {
                $formattedText = '';
                $hasFormatting = false;
                
                foreach ($richText->getRichTextElements() as $element) {
                    if ($element instanceof \PhpOffice\PhpSpreadsheet\RichText\TextElement) {
                        $text = $element->getText();
                        $font = $element->getFont();
                        
                        if ($font && ($font->getBold() || $font->getItalic() || $font->getUnderline() !== \PhpOffice\PhpSpreadsheet\Style\Font::UNDERLINE_NONE || $font->getColor() || $font->getSize())) {
                            $hasFormatting = true;
                            $formattedText .= '<span style="';
                            
                            // Bold
                            if ($font->getBold()) {
                                $formattedText .= 'font-weight: bold; ';
                            }
                            
                            // Italic
                            if ($font->getItalic()) {
                                $formattedText .= 'font-style: italic; ';
                            }
                            
                            // Underline
                            if ($font->getUnderline() !== \PhpOffice\PhpSpreadsheet\Style\Font::UNDERLINE_NONE) {
                                $formattedText .= 'text-decoration: underline; ';
                            }
                            
                            // Color
                            if ($font->getColor() && $font->getColor()->getRGB()) {
                                $formattedText .= 'color: #' . $font->getColor()->getRGB() . '; ';
                            }
                            
                            // Size
                            if ($font->getSize()) {
                                $formattedText .= 'font-size: ' . $font->getSize() . 'pt; ';
                            }
                            
                            $formattedText .= '">' . htmlspecialchars($text) . '</span>';
                        } else {
                            $formattedText .= htmlspecialchars($text);
                        }
                    }
                }
                
                return $hasFormatting ? $formattedText : null;
            }
            
            return null;
        } catch (\Exception $e) {
            Log::warning('Error extracting formatted text', [
                'cell' => $cellAddress,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Get all available images from the Excel file
     */
    private function getAllAvailableImages($filePath)
    {
        $images = [];
        
        try {
            $zip = new \ZipArchive();
            if ($zip->open($filePath) === TRUE) {
                for ($i = 0; $i < $zip->numFiles; $i++) {
                    $filename = $zip->getNameIndex($i);
                    if (strpos($filename, 'xl/media/') === 0) {
                        $images[] = $filename;
                    }
                }
                $zip->close();
            }
        } catch (\Exception $e) {
            Log::error('Error reading images from Excel file', [
                'file_path' => $filePath,
                'error' => $e->getMessage()
            ]);
        }
        
        return $images;
    }

    /**
     * Create mapping between drawings and images
     */
    private function createDrawingImageMapping($filePath, $drawingsArray)
    {
        $drawingImageMap = [];
        
        try {
            $zip = new \ZipArchive();
            if ($zip->open($filePath) === TRUE) {
                $mediaFiles = [];
                
                // Get all media files
                for ($i = 0; $i < $zip->numFiles; $i++) {
                    $filename = $zip->getNameIndex($i);
                    if (strpos($filename, 'xl/media/') === 0) {
                        $mediaFiles[] = $filename;
                    }
                }
                
                // Map drawings to images
                foreach ($drawingsArray as $index => $drawing) {
                    $coordinates = $drawing->getCoordinates();
                    $row = $this->getRowNumberFromCell($coordinates);
                    $column = $this->getColumnFromCell($coordinates);
                    
                    // Get image data
                    $imageData = $drawing->getPath();
                    if (isset($mediaFiles[$index])) {
                        $imageContent = $zip->getFromName($mediaFiles[$index]);
                        if ($imageContent !== false) {
                            $drawingImageMap[$coordinates] = [
                                'row' => $row,
                                'column' => $column,
                                'data' => $imageContent,
                                'name' => basename($mediaFiles[$index])
                            ];
                        }
                    }
                }
                
                $zip->close();
            }
        } catch (\Exception $e) {
            Log::error('Error creating drawing image mapping', [
                'file_path' => $filePath,
                'error' => $e->getMessage()
            ]);
        }
        
        return $drawingImageMap;
    }

    /**
     * Get row number from cell reference (e.g., "A1" returns 1)
     */
    private function getRowNumberFromCell($cellReference)
    {
        preg_match('/([A-Z]+)(\d+)/', $cellReference, $matches);
        return isset($matches[2]) ? (int)$matches[2] : 0;
    }

    /**
     * Get column letter from cell reference (e.g., "A1" returns "A")
     */
    private function getColumnFromCell($cellReference)
    {
        preg_match('/([A-Z]+)(\d+)/', $cellReference, $matches);
        return isset($matches[1]) ? $matches[1] : '';
    }

}
