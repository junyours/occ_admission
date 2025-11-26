<?php

namespace App\Http\Controllers\Guidance;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use App\Models\QuestionBank;
use App\Http\Controllers\Controller;

class QuestionImportController extends Controller
{
    /**
     * Upload questions via CSV or Excel file
     */
    public function uploadQuestions(Request $request)
    {
        // Debug: Log the request
        Log::info('Upload request received', [
            'has_file' => $request->hasFile('csv_file'),
            'all_data' => $request->all()
        ]);

        $request->validate([
            'csv_file' => 'required|file|mimes:csv,txt,xlsx,xls|max:10240'
        ]);

        try {
            $file = $request->file('csv_file');
            $fileExtension = strtolower($file->getClientOriginalExtension());
            $path = $file->store('temp');
            $fullPath = Storage::path($path);

            Log::info('File upload started', [
                'filename' => $file->getClientOriginalName(),
                'extension' => $fileExtension,
                'size' => $file->getSize(),
                'path' => $fullPath,
                'mime_type' => $file->getMimeType()
            ]);

            $questions = [];

            if (in_array($fileExtension, ['xlsx', 'xls'])) {
                // Handle Excel files
                Log::info('Processing Excel file');
                $questions = $this->processExcelFile($fullPath);
            } else {
                // Handle CSV files
                Log::info('Processing CSV file');
                $questions = $this->processCsvFile($fullPath);
            }

            Log::info('Questions processed', ['count' => count($questions)]);

            if (empty($questions)) {
                Storage::delete($path);
                Log::warning('No valid questions found in file');
                return back()->withErrors(['error' => 'No valid questions found in the file. Please check the file format.']);
            }

            // Debug: Log first question structure
            if (!empty($questions)) {
                Log::info('First question structure', ['question' => $questions[0]]);
            }

            // Insert questions in batches
            $insertedCount = 0;
            foreach (array_chunk($questions, 100) as $chunkIndex => $chunk) {
                try {
                    Log::info('Inserting batch', ['batch_index' => $chunkIndex, 'count' => count($chunk)]);
                    
                    // Ensure each question has the correct structure
                    $cleanChunk = [];
                    foreach ($chunk as $question) {
                        $cleanQuestion = [
                            'question' => $question['question'] ?? '',
                            'question_formatted' => $question['question_formatted'] ?? null,
                            'option1' => $question['option1'] ?? '',
                            'option1_formatted' => $question['option1_formatted'] ?? null,
                            'option1_image' => $question['option1_image'] ?? null,
                            'option2' => $question['option2'] ?? '',
                            'option2_formatted' => $question['option2_formatted'] ?? null,
                            'option2_image' => $question['option2_image'] ?? null,
                            'option3' => $question['option3'] ?? '',
                            'option3_formatted' => $question['option3_formatted'] ?? null,
                            'option3_image' => $question['option3_image'] ?? null,
                            'option4' => $question['option4'] ?? '',
                            'option4_formatted' => $question['option4_formatted'] ?? null,
                            'option4_image' => $question['option4_image'] ?? null,
                            'option5' => $question['option5'] ?? '',
                            'option5_formatted' => $question['option5_formatted'] ?? null,
                            'option5_image' => $question['option5_image'] ?? null,
                            'correct_answer' => $question['correct_answer'] ?? '',
                            'category' => $question['category'] ?? '',
                            'direction' => $question['direction'] ?? '',
                            'status' => $question['status'] ?? '1',
                            'image' => $question['image'] ?? null,
                            'created_at' => $question['created_at'] ?? now(),
                            'updated_at' => $question['updated_at'] ?? now(),
                        ];
                        $cleanChunk[] = $cleanQuestion;
                    }
                    
                    QuestionBank::insert($cleanChunk);
                    $insertedCount += count($cleanChunk);
                    Log::info('Batch inserted successfully', ['batch_index' => $chunkIndex]);
                } catch (\Exception $e) {
                    Log::error('Error inserting questions batch', [
                        'batch_index' => $chunkIndex,
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString()
                    ]);
                    throw new \Exception('Error inserting questions: ' . $e->getMessage());
                }
            }

            Storage::delete($path);

            Log::info('Upload completed successfully', ['inserted' => $insertedCount]);

            return redirect()->route('guidance.question-bank')->with('success', $insertedCount . ' questions uploaded successfully (duplicates automatically skipped)');

        } catch (\Exception $e) {
            Log::error('Upload failed', [
                'error' => $e->getMessage(), 
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);
            
            // Clean up temp file if it exists
            if (isset($path) && Storage::exists($path)) {
                Storage::delete($path);
            }
            
            return back()->withErrors(['error' => 'Failed to upload questions: ' . $e->getMessage()]);
        }
    }

    /**
     * Process CSV file
     */
    private function processCsvFile($filePath)
    {
        $questions = [];
        $rowNumber = 1; // Start from 1 for header row
        
        Log::info('Starting CSV processing', ['file_path' => $filePath]);
        
        if (($handle = fopen($filePath, "r")) !== FALSE) {
            // Detect delimiter by reading first line
            $firstLine = fgets($handle);
            rewind($handle);
            
            $delimiter = ',';
            if (strpos($firstLine, "\t") !== false) {
                $delimiter = "\t";
                Log::info('Detected tab delimiter');
            } else {
                Log::info('Using comma delimiter');
            }
            
            // Read and log header row
            $header = fgetcsv($handle, 0, $delimiter);
            Log::info('CSV header', ['header' => $header, 'column_count' => count($header), 'delimiter' => $delimiter]);
            $rowNumber++;
            
            while (($data = fgetcsv($handle, 0, $delimiter)) !== FALSE) {
                $rowNumber++;
                
                Log::info('Processing row', ['row_number' => $rowNumber, 'data' => $data, 'column_count' => count($data)]);
                
                // Skip empty rows
                if (empty(array_filter($data))) {
                    Log::info('Skipping empty row', ['row_number' => $rowNumber]);
                    continue;
                }
                
                if (count($data) >= 7) {
                        $questionData = [
                        'question' => trim($data[0]),
                        'option1' => trim($data[1]),
                        'option2' => trim($data[2]),
                        'option3' => trim($data[3]),
                        'option4' => trim($data[4]),
                        'option5' => trim($data[5] ?? ''),
                        'correct_answer' => strtoupper(trim($data[6] ?? '')),
                        'category' => trim($data[7] ?? ''),
                        'direction' => trim($data[8] ?? ''),
                        'status' => 1, // Default to active
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                        
                    Log::info('Question data created', ['row_number' => $rowNumber, 'question_data' => $questionData]);
                    
                    // Validate required fields (only question, option1, option2, correct_answer, and category are required)
                    if (empty($questionData['question']) || 
                        empty($questionData['option1']) || 
                        empty($questionData['option2']) || 
                        empty($questionData['correct_answer']) || 
                        empty($questionData['category'])) {
                        Log::warning('Skipping row ' . $rowNumber . ' due to missing required fields', $questionData);
                        continue;
                    }
                    
                    // Validate correct answer - only allow options that have content
                    $availableOptions = [];
                    if (!empty($questionData['option1'])) $availableOptions[] = 'A';
                    if (!empty($questionData['option2'])) $availableOptions[] = 'B';
                    if (!empty($questionData['option3'])) $availableOptions[] = 'C';
                    if (!empty($questionData['option4'])) $availableOptions[] = 'D';
                    if (!empty($questionData['option5'])) $availableOptions[] = 'E';
                    
                    if (!in_array($questionData['correct_answer'], $availableOptions)) {
                        Log::warning('Skipping row ' . $rowNumber . ' due to invalid correct answer: ' . $questionData['correct_answer'] . ' (available options: ' . implode(', ', $availableOptions) . ')');
                        continue;
                    }
                    
                    // Handle image data if present (10th column)
                    if (count($data) >= 10 && !empty($data[9])) {
                        $imageData = trim($data[9]);
                        Log::info('Processing image data', ['row_number' => $rowNumber, 'image_length' => strlen($imageData)]);
                            // Check if it's a base64 encoded image
                            if (strpos($imageData, 'data:image') === 0) {
                                // Extract base64 data
                                $imageData = explode(',', $imageData)[1] ?? $imageData;
                            }
                            $questionData['image'] = $imageData;
                        }
                    
                    // Handle option images if present (columns 11-15)
                    if (count($data) >= 15) {
                        for ($i = 10; $i <= 14; $i++) {
                            if (!empty($data[$i])) {
                                $imageData = trim($data[$i]);
                                if (strpos($imageData, 'data:image') === 0) {
                                    $imageData = explode(',', $imageData)[1] ?? $imageData;
                                }
                                $questionData['option' . ($i - 9) . '_image'] = $imageData;
                            }
                        }
                    }
                    
                    // Ensure all required fields exist
                    $questionData = array_merge([
                        'question' => '',
                        'option1' => '',
                        'option2' => '',
                        'option3' => '',
                        'option4' => '',
                        'option5' => '',
                        'correct_answer' => '',
                        'category' => '',
                        'direction' => '',
                        'status' => '1',
                        'image' => null,
                        'option1_image' => null,
                        'option2_image' => null,
                        'option3_image' => null,
                        'option4_image' => null,
                        'option5_image' => null,
                        'question_formatted' => null,
                        'option1_formatted' => null,
                        'option2_formatted' => null,
                        'option3_formatted' => null,
                        'option4_formatted' => null,
                        'option5_formatted' => null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ], $questionData);
                    
                    // Check if question already exists
                    $existingQuestion = $this->questionExists($questionData);
                    
                    if ($existingQuestion) {
                        Log::info('Skipping duplicate question (CSV)', [
                            'row_number' => $rowNumber,
                            'existing_question_id' => $existingQuestion->questionId,
                            'question' => $questionData['question']
                        ]);
                        continue; // Skip this question
                        }
                        
                        $questions[] = $questionData;
                    Log::info('Question added to array', ['row_number' => $rowNumber, 'total_questions' => count($questions)]);
                } else {
                    Log::warning('Skipping row ' . $rowNumber . ' due to insufficient columns: ' . (is_array($data) ? count($data) : 'not an array'));
                    }
                }
                fclose($handle);
        } else {
            Log::error('Failed to open CSV file', ['file_path' => $filePath]);
        }
        
        Log::info('CSV processing completed', ['total_rows' => $rowNumber - 1, 'valid_questions' => count($questions)]);
        return $questions;
    }

    /**
     * Process Excel file
     */
    private function processExcelFile($filePath)
    {
        require_once base_path('vendor/autoload.php');
        
        $questions = [];
        $rowNumber = 1; // Start from 1 for header row
        
        try {
            $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($filePath);
            $worksheet = $spreadsheet->getActiveSheet();
            $rows = $worksheet->toArray();
            
            // Get all available images first
            $availableImages = $this->getAllAvailableImages($filePath);
            
            // Get drawings (shapes with images) from the worksheet
            $drawings = $worksheet->getDrawingCollection();
            
            Log::info('Processing Excel file', [
                'total_rows' => count($rows),
                'total_drawings' => $drawings->count(),
                'total_images' => count($availableImages),
                'file_path' => $filePath
            ]);
            
            // Convert drawings to array for easier handling
            $drawingsArray = iterator_to_array($drawings);
            
            // Create proper image-to-drawing mapping
            $drawingImageMap = $this->createDrawingImageMapping($filePath, $drawingsArray);
            
            // Skip header row
            array_shift($rows);
            $rowNumber++;
            
            foreach ($rows as $rowIndex => $row) {
                $currentRow = $rowIndex + 2; // +2 because array is 0-indexed and we skipped header
                
                if (is_array($row) && count($row) >= 7) {
                    // Extract formatted text from cells
                    $questionFormatted = $this->extractFormattedText($worksheet, 'A' . $currentRow);
                    $option1Formatted = $this->extractFormattedText($worksheet, 'B' . $currentRow);
                    $option2Formatted = $this->extractFormattedText($worksheet, 'C' . $currentRow);
                    $option3Formatted = $this->extractFormattedText($worksheet, 'D' . $currentRow);
                    $option4Formatted = $this->extractFormattedText($worksheet, 'E' . $currentRow);
                    $option5Formatted = $this->extractFormattedText($worksheet, 'F' . $currentRow);
                    
                    // Extract basic text data
                    $questionData = [
                        'question' => trim($row[0] ?? ''),
                        'option1' => trim($row[1] ?? ''),
                        'option2' => trim($row[2] ?? ''),
                        'option3' => trim($row[3] ?? ''),
                        'option4' => trim($row[4] ?? ''),
                        'option5' => trim($row[5] ?? ''),
                        'correct_answer' => strtoupper(trim($row[6] ?? '')),
                        'category' => trim($row[7] ?? ''),
                        'direction' => trim($row[8] ?? ''),
                        'status' => '1', // Default to active
                        'question_formatted' => $questionFormatted,
                        'option1_formatted' => $option1Formatted,
                        'option2_formatted' => $option2Formatted,
                        'option3_formatted' => $option3Formatted,
                        'option4_formatted' => $option4Formatted,
                        'option5_formatted' => $option5Formatted,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                    
                    // Initialize image fields
                    $questionData['image'] = null;
                    $questionData['option1_image'] = null;
                    $questionData['option2_image'] = null;
                    $questionData['option3_image'] = null;
                    $questionData['option4_image'] = null;
                    $questionData['option5_image'] = null;
                    
                    // Validate required fields (only question, option1, option2, correct_answer, and category are required)
                    if (empty($questionData['question']) || 
                        empty($questionData['option1']) || 
                        empty($questionData['option2']) || 
                        empty($questionData['correct_answer']) || 
                        empty($questionData['category'])) {
                        Log::warning('Skipping row ' . $rowNumber . ' due to missing required fields');
                        continue;
                    }
                    
                    // Validate correct answer - only allow options that have content
                    $availableOptions = [];
                    if (!empty($questionData['option1'])) $availableOptions[] = 'A';
                    if (!empty($questionData['option2'])) $availableOptions[] = 'B';
                    if (!empty($questionData['option3'])) $availableOptions[] = 'C';
                    if (!empty($questionData['option4'])) $availableOptions[] = 'D';
                    if (!empty($questionData['option5'])) $availableOptions[] = 'E';
                    
                    if (!in_array($questionData['correct_answer'], $availableOptions)) {
                        Log::warning('Skipping row ' . $rowNumber . ' due to invalid correct answer: ' . $questionData['correct_answer'] . ' (available options: ' . implode(', ', $availableOptions) . ')');
                        continue;
                    }
                    
                    // SIMPLE LOGIC: Check each cell in this row for images
                    Log::info('PROCESSING ROW', [
                        'current_row' => $currentRow,
                        'row_index' => $rowIndex,
                        'question' => substr($questionData['question'], 0, 30) . '...'
                    ]);
                    
                    $imagesFoundInRow = 0;
                    foreach ($drawingImageMap as $coordinates => $imageInfo) {
                        $imageRow = intval($imageInfo['row']);
                        $imageColumn = $imageInfo['column'];
                        
                        // If this image is in the current row, assign it to the correct database field
                        if ($imageRow == $currentRow) {
                            $imagesFoundInRow++;
                            $base64Image = base64_encode($imageInfo['data']);
                            $mimeType = $this->getMimeTypeFromExtension($imageInfo['name']);
                            $base64String = 'data:' . $mimeType . ';base64,' . $base64Image;
                            
                            // SIMPLE MAPPING: Column Header → Database Field (EXACT MATCH FROM TEST)
                            switch ($imageColumn) {
                                case 'J': // Column J = Main Image
                                    $questionData['image'] = $base64String;
                                    Log::info('✅ ASSIGNED: Cell ' . $coordinates . ' → main image field', [
                                        'row' => $currentRow,
                                        'image' => $imageInfo['name']
                                    ]);
                                    break;
                                    
                                case 'K': // Column K = Option 1 Image
                                    $questionData['option1_image'] = $base64String;
                                    Log::info('✅ ASSIGNED: Cell ' . $coordinates . ' → option1_image field', [
                                        'row' => $currentRow,
                                        'image' => $imageInfo['name']
                                    ]);
                                    break;
                                    
                                case 'L': // Column L = Option 2 Image
                                    $questionData['option2_image'] = $base64String;
                                    Log::info('✅ ASSIGNED: Cell ' . $coordinates . ' → option2_image field', [
                                        'row' => $currentRow,
                                        'image' => $imageInfo['name']
                                    ]);
                                    break;
                                    
                                case 'M': // Column M = Option 3 Image
                                    $questionData['option3_image'] = $base64String;
                                    Log::info('✅ ASSIGNED: Cell ' . $coordinates . ' → option3_image field', [
                                        'row' => $currentRow,
                                        'image' => $imageInfo['name']
                                    ]);
                                    break;
                                    
                                case 'N': // Column N = Option 4 Image
                                    $questionData['option4_image'] = $base64String;
                                    Log::info('✅ ASSIGNED: Cell ' . $coordinates . ' → option4_image field', [
                                        'row' => $currentRow,
                                        'image' => $imageInfo['name']
                                    ]);
                                    break;
                                    
                                case 'O': // Column O = Option 5 Image
                                    $questionData['option5_image'] = $base64String;
                                    Log::info('✅ ASSIGNED: Cell ' . $coordinates . ' → option5_image field', [
                                        'row' => $currentRow,
                                        'image' => $imageInfo['name']
                                    ]);
                                    break;
                                    
                                default:
                                    Log::warning('❌ IGNORED: Unexpected column', [
                                        'row' => $currentRow,
                                        'column' => $imageColumn,
                                        'cell' => $coordinates
                                    ]);
                                    break;
                            }
                        }
                    }
                    
                    Log::info('ROW PROCESSING COMPLETE', [
                        'current_row' => $currentRow,
                        'images_found_in_row' => $imagesFoundInRow,
                        'has_main_image' => !empty($questionData['image']),
                        'has_option1_image' => !empty($questionData['option1_image']),
                        'has_option2_image' => !empty($questionData['option2_image']),
                        'has_option3_image' => !empty($questionData['option3_image']),
                        'has_option4_image' => !empty($questionData['option4_image']),
                        'has_option5_image' => !empty($questionData['option5_image'])
                    ]);
                    
                    // Check if question already exists
                    $existingQuestion = $this->questionExists($questionData);
                    
                    if ($existingQuestion) {
                        Log::info('Skipping duplicate question', [
                            'row_number' => $rowNumber,
                            'existing_question_id' => $existingQuestion->questionId,
                            'question' => $questionData['question']
                        ]);
                        continue;
                    }
                    
                    $questions[] = $questionData;
                    Log::info('Question added', [
                        'row_number' => $rowNumber,
                        'question' => substr($questionData['question'], 0, 50) . '...',
                        'has_main_image' => !empty($questionData['image']),
                        'has_option1_image' => !empty($questionData['option1_image']),
                        'has_option2_image' => !empty($questionData['option2_image']),
                        'has_option3_image' => !empty($questionData['option3_image']),
                        'has_option4_image' => !empty($questionData['option4_image']),
                        'has_option5_image' => !empty($questionData['option5_image'])
                    ]);
                }
                
                $rowNumber++;
            }
            
            Log::info('Excel processing completed', ['total_questions' => count($questions)]);
            
        } catch (\Exception $e) {
            Log::error('Error processing Excel file', [
                'file_path' => $filePath,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
        
        return $questions;
    }

    /**
     * Check if a question already exists in the database
     */
    private function questionExists($questionData)
    {
        // Strict duplicate check - all fields must match
        $existingQuestion = QuestionBank::where('question', $questionData['question'])
            ->where('option1', $questionData['option1'])
            ->where('option2', $questionData['option2'])
            ->where('option3', $questionData['option3'])
            ->where('option4', $questionData['option4'])
            ->where('option5', $questionData['option5'])
            ->where('correct_answer', $questionData['correct_answer'])
            ->where('category', $questionData['category'])
            ->first();
        
        return $existingQuestion;
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
                
                // Log if formatting was found
                if ($hasFormatting) {
                    Log::info('Found formatted text', ['cell' => $cellAddress, 'formatted_length' => strlen($formattedText)]);
                    return $formattedText;
                }
            }
            
            // If not rich text or no formatting, return plain text
            return htmlspecialchars($value);
            
        } catch (\Exception $e) {
            Log::warning('Error extracting formatted text', ['cell' => $cellAddress, 'error' => $e->getMessage()]);
            return htmlspecialchars($value ?? '');
        }
    }

    /**
     * Get all available images from ZIP file
     */
    private function getAllAvailableImages($filePath)
    {
        $images = [];
        if ($filePath && file_exists($filePath)) {
            $zip = new \ZipArchive();
            if ($zip->open($filePath) === true) {
                for ($i = 0; $i < $zip->numFiles; $i++) {
                    $filename = $zip->getNameIndex($i);
                    if (strpos($filename, 'xl/media/') === 0 && 
                        preg_match('/\.(jpg|jpeg|png|gif|bmp|webp)$/i', $filename)) {
                        $imageData = $zip->getFromName($filename);
                        if ($imageData) {
                            $images[] = [
                                'filename' => $filename,
                                'data' => $imageData,
                                'name' => basename($filename)
                            ];
                        }
                    }
                }
                $zip->close();
            }
        }
        return $images;
    }

    /**
     * SUPER SIMPLE: Just map each drawing to the next available image
     */
    private function createDrawingImageMapping($filePath, $drawingsArray)
    {
        $drawingImageMap = [];
        $availableImages = $this->getAllAvailableImages($filePath);
        
        Log::info('SUPER SIMPLE MAPPING', [
            'total_drawings' => count($drawingsArray),
            'total_images' => count($availableImages)
        ]);
        
        // For each drawing, assign the next available image (cycle if needed)
        foreach ($drawingsArray as $drawingIndex => $drawing) {
            $coordinates = $drawing->getCoordinates();
            $column = $this->getColumnFromCell($coordinates);
            $row = $this->getRowNumberFromCell($coordinates);
            
            if (count($availableImages) > 0) {
                $imageIndex = $drawingIndex % count($availableImages);
                $imageData = $availableImages[$imageIndex];
                
                $drawingImageMap[$coordinates] = [
                    'coordinates' => $coordinates,
                    'column' => $column,
                    'row' => $row,
                    'data' => $imageData['data'],
                    'name' => $imageData['name'],
                    'filename' => $imageData['filename']
                ];
                
                Log::info('MAPPED', [
                    'cell' => $coordinates,
                    'image' => $imageData['name'],
                    'column' => $column,
                    'row' => $row,
                    'drawing_index' => $drawingIndex,
                    'image_index' => $imageIndex
                ]);
            }
        }
        
        return $drawingImageMap;
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

    /**
     * Generate Excel template for questions
     */
    public function generateExcelTemplate()
    {
        require_once base_path('vendor/autoload.php');
        
        try {
            $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
            $worksheet = $spreadsheet->getActiveSheet();
            
            // Set headers (removed questionId since it's auto-increment)
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
            $worksheet->getStyle('A1:O1')->getFill()->getStartColor()->setRGB('CCCCCC');
            
            // Add sample data
            $sampleData = [
                ['What is the capital of the Philippines?', 'Manila', 'Cebu', 'Davao', 'Quezon City', 'Baguio', 'A', 'Geography', 'Directions(1-10) Find the correct meaning of the idiomatic expression'],
                ['Which programming language is this application built with?', 'PHP', 'Python', 'Java', 'JavaScript', 'C#', 'A', 'Programming', 'Directions(11-20) Choose the best answer'],
            ];
            
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
            $filename = 'sample_questions_template.xlsx';
            $filepath = public_path($filename);
            
            $writer->save($filepath);
            
            $response = response()->download($filepath, $filename, [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ]);
            
            return $response->deleteFileAfterSend(true);
            
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to generate template: ' . $e->getMessage()]);
        }
    }

    /**
     * Generate CSV template for questions
     */
    public function generateCsvTemplate()
    {
        try {
            // Define headers (must match the processing logic)
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
            
            // Sample data
            $sampleData = [
                [
                    'What is the capital of the Philippines?',
                    'Manila',
                    'Cebu',
                    'Davao',
                    'Quezon City',
                    'Baguio',
                    'A',
                    'Geography',
                    'Directions(1-10) Find the correct meaning of the idiomatic expression',
                    '', // Main image (base64 or empty)
                    '', // Option 1 image
                    '', // Option 2 image
                    '', // Option 3 image
                    '', // Option 4 image
                    ''  // Option 5 image
                ],
                [
                    'Which programming language is this application built with?',
                    'PHP',
                    'Python',
                    'Java',
                    'JavaScript',
                    'C#',
                    'A',
                    'Programming',
                    'Directions(11-20) Choose the best answer',
                    '',
                    '',
                    '',
                    '',
                    '',
                    ''
                ],
                [
                    'What is 2 + 2?',
                    '3',
                    '4',
                    '5',
                    '6',
                    '7',
                    'B',
                    'Mathematics',
                    'Directions(21-30) Select the correct answer',
                    '',
                    '',
                    '',
                    '',
                    '',
                    ''
                ],
                [
                    'Which planet is closest to the Sun?',
                    'Venus',
                    'Mercury',
                    'Earth',
                    'Mars',
                    'Pluto',
                    'B',
                    'Science',
                    'Directions(31-40) Choose the correct option',
                    '',
                    '',
                    '',
                    '',
                    '',
                    ''
                ],
                [
                    'What is the largest ocean on Earth?',
                    'Atlantic',
                    'Pacific',
                    'Indian',
                    'Arctic',
                    'Southern',
                    'B',
                    'Geography',
                    'Directions(41-50) Select the best answer',
                    '',
                    '',
                    '',
                    '',
                    '',
                    ''
                ]
            ];
            
            // Create CSV content
            $filename = 'sample_questions_template.csv';
            $filepath = public_path($filename);
            
            $handle = fopen($filepath, 'w');
            
            // Write headers
            fputcsv($handle, $headers);
            
            // Write sample data
            foreach ($sampleData as $row) {
                fputcsv($handle, $row);
            }
            
            fclose($handle);
            
            $response = response()->download($filepath, $filename, [
                'Content-Type' => 'text/csv',
            ]);
            
            return $response->deleteFileAfterSend(true);
            
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to generate CSV template: ' . $e->getMessage()]);
        }
    }
}
