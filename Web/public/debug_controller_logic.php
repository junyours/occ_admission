<?php
require_once '../vendor/autoload.php';

// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h1>Debug Controller Logic</h1>";

if (!isset($_FILES['excel_file'])) {
    echo "<form method='post' enctype='multipart/form-data'>";
    echo "<input type='file' name='excel_file' accept='.xlsx,.xls' required>";
    echo "<input type='submit' value='Debug Controller Logic'>";
    echo "</form>";
    echo "<p><strong>Note:</strong> This will debug the exact controller logic.</p>";
    exit;
}

$file = $_FILES['excel_file'];
$filePath = $file['tmp_name'];

echo "<h2>File Information</h2>";
echo "<p><strong>Filename:</strong> " . $file['name'] . "</p>";
echo "<p><strong>Size:</strong> " . $file['size'] . " bytes</p>";
echo "<p><strong>Type:</strong> " . $file['type'] . "</p>";

// Helper functions (same as controller)
function getRowNumberFromCell($cellReference) {
    preg_match('/([A-Z]+)(\d+)/', $cellReference, $matches);
    return isset($matches[2]) ? (int)$matches[2] : 0;
}

function getColumnFromCell($cellReference) {
    preg_match('/([A-Z]+)(\d+)/', $cellReference, $matches);
    return isset($matches[1]) ? $matches[1] : '';
}

function getAllAvailableImages($filePath) {
    $availableImages = [];
    if ($filePath && file_exists($filePath)) {
        $zip = new \ZipArchive();
        if ($zip->open($filePath) === true) {
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $filename = $zip->getNameIndex($i);
                if (strpos($filename, 'xl/media/') === 0 && 
                    preg_match('/\.(jpg|jpeg|png|gif|bmp|webp)$/i', $filename)) {
                    $imageData = $zip->getFromName($filename);
                    if ($imageData) {
                        $availableImages[] = [
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
    return $availableImages;
}

// Simulate the exact controller logic
try {
    $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($filePath);
    $worksheet = $spreadsheet->getActiveSheet();
    $rows = $worksheet->toArray();
    
    // Get all available images first
    $availableImages = getAllAvailableImages($filePath);
    
    // Get drawings (shapes with images) from the worksheet
    $drawings = $worksheet->getDrawingCollection();
    
    echo "<h2>Processing Results</h2>";
    echo "<p><strong>Total Rows:</strong> " . count($rows) . "</p>";
    echo "<p><strong>Total Drawings:</strong> " . count($drawings) . "</p>";
    echo "<p><strong>Available Images:</strong> " . count($availableImages) . "</p>";
    
    // Create a mapping of drawings by row and column (EXACT SAME AS CONTROLLER)
    $drawingsByRow = [];
    foreach ($drawings as $drawing) {
        $coordinates = $drawing->getCoordinates();
        $row = getRowNumberFromCell($coordinates);
        $col = getColumnFromCell($coordinates);
        
        if (!isset($drawingsByRow[$row])) {
            $drawingsByRow[$row] = [];
        }
        $drawingsByRow[$row][$col] = $drawing;
        
        echo "<p><strong>Mapped drawing:</strong> $coordinates → Row $row, Column $col ({$drawing->getName()})</p>";
    }
    
    echo "<h3>Complete drawingsByRow structure:</h3>";
    echo "<pre>" . print_r($drawingsByRow, true) . "</pre>";
    
    // Skip header row
    array_shift($rows);
    
    $globalImageIndex = 0; // Global counter for all images across all rows
    
    foreach ($rows as $rowIndex => $row) {
        $currentRow = $rowIndex + 2; // +2 because we skipped header and array is 0-indexed
        
        // Skip empty rows
        if (empty(array_filter($row))) {
            continue;
        }
        
        if (count($row) >= 7) {
            echo "<h3>Question (Row $currentRow)</h3>";
            
            // Check if this row has any drawings (EXACT SAME AS CONTROLLER)
            if (isset($drawingsByRow[$currentRow])) {
                echo "<p><strong>Found drawings in row:</strong> " . implode(', ', array_keys($drawingsByRow[$currentRow])) . "</p>";
                
                // Map images for this specific row using global sequential mapping
                $rowDrawings = $drawingsByRow[$currentRow];
                
                // Only process the columns that actually have drawings
                // Sort columns alphabetically to ensure correct order: J, K, L, M, N, O
                $sortedColumns = array_keys($rowDrawings);
                sort($sortedColumns);
                
                echo "<p><strong>Processing columns:</strong> Original: " . implode(', ', array_keys($rowDrawings)) . " → Sorted: " . implode(', ', $sortedColumns) . "</p>";
                echo "<p><strong>Global image index:</strong> $globalImageIndex</p>";
                
                foreach ($sortedColumns as $col) {
                    $drawing = $rowDrawings[$col];
                    if (!empty($availableImages)) {
                        // Cycle through available images if we run out
                        $imageIndex = $globalImageIndex % count($availableImages);
                        $selectedImage = $availableImages[$imageIndex];
                        
                        // Show the mapping
                        $fieldName = '';
                        if ($col === 'J') {
                            $fieldName = 'main image';
                        } elseif ($col === 'K') {
                            $fieldName = 'option1_image';
                        } elseif ($col === 'L') {
                            $fieldName = 'option2_image';
                        } elseif ($col === 'M') {
                            $fieldName = 'option3_image';
                        } elseif ($col === 'N') {
                            $fieldName = 'option4_image';
                        } elseif ($col === 'O') {
                            $fieldName = 'option5_image';
                        }
                        
                        echo "<p style='color: green;'>✅ <strong>Column $col ($fieldName):</strong> {$selectedImage['name']} (global index $globalImageIndex, actual index $imageIndex)</p>";
                    } else {
                        echo "<p style='color: red;'>❌ <strong>Column $col:</strong> No images available</p>";
                    }
                    $globalImageIndex++; // Always increment the global index
                }
            } else {
                echo "<p style='color: orange;'>⚠️ No drawings found in this row</p>";
            }
        }
    }
    
} catch (Exception $e) {
    echo "<p style='color: red;'><strong>Error:</strong> " . $e->getMessage() . "</p>";
}
?>

