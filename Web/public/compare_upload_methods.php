<?php
require_once '../vendor/autoload.php';

$app = require_once '../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\Log;

echo "<h2>Upload Method Comparison Test</h2>";

if (isset($_FILES['file'])) {
    $file = $_FILES['file'];
    $tempPath = $file['tmp_name'];
    
    echo "<h3>Testing: " . $file['name'] . "</h3>";
    echo "<p>File size: " . number_format($file['size']) . " bytes</p>";
    echo "<p>Temp path: $tempPath</p>";
    echo "<p>File exists: " . (file_exists($tempPath) ? 'Yes' : 'No') . "</p>";
    
    try {
        // Test 1: Direct PhpSpreadsheet loading (like test script)
        echo "<h4>Test 1: Direct PhpSpreadsheet Loading</h4>";
        $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($tempPath);
        $worksheet = $spreadsheet->getActiveSheet();
        $drawings = $worksheet->getDrawingCollection();
        
        echo "<p>Direct loading - Drawings found: " . count($drawings) . "</p>";
        
        if (count($drawings) > 0) {
            foreach ($drawings as $i => $drawing) {
                $cell = $drawing->getCoordinates();
                $name = $drawing->getName();
                echo "<p>Drawing $i: Cell $cell, Name: $name</p>";
            }
        }
        
        // Test 2: Simulate the upload process
        echo "<h4>Test 2: Simulate Upload Process</h4>";
        
        // Copy the file to a temporary location (like the upload process does)
        $uploadDir = '../storage/app/private/temp/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        
        $uploadedFilePath = $uploadDir . uniqid() . '.xlsx';
        copy($tempPath, $uploadedFilePath);
        
        echo "<p>Copied to: $uploadedFilePath</p>";
        echo "<p>Copied file exists: " . (file_exists($uploadedFilePath) ? 'Yes' : 'No') . "</p>";
        
        // Try loading the copied file
        $spreadsheet2 = \PhpOffice\PhpSpreadsheet\IOFactory::load($uploadedFilePath);
        $worksheet2 = $spreadsheet2->getActiveSheet();
        $drawings2 = $worksheet2->getDrawingCollection();
        
        echo "<p>Copied file loading - Drawings found: " . count($drawings2) . "</p>";
        
        if (count($drawings2) > 0) {
            foreach ($drawings2 as $i => $drawing) {
                $cell = $drawing->getCoordinates();
                $name = $drawing->getName();
                echo "<p>Drawing $i: Cell $cell, Name: $name</p>";
            }
        }
        
        // Test 3: Check ZIP structure of both files
        echo "<h4>Test 3: ZIP Structure Comparison</h4>";
        
        echo "<p><strong>Original file ZIP structure:</strong></p>";
        $zip1 = new \ZipArchive();
        if ($zip1->open($tempPath) === true) {
            echo "<p>Files in original: " . $zip1->numFiles . "</p>";
            for ($i = 0; $i < $zip1->numFiles; $i++) {
                $filename = $zip1->getNameIndex($i);
                if (strpos($filename, 'xl/media/') === 0) {
                    echo "<p>Media file: $filename</p>";
                }
            }
            $zip1->close();
        }
        
        echo "<p><strong>Copied file ZIP structure:</strong></p>";
        $zip2 = new \ZipArchive();
        if ($zip2->open($uploadedFilePath) === true) {
            echo "<p>Files in copied: " . $zip2->numFiles . "</p>";
            for ($i = 0; $i < $zip2->numFiles; $i++) {
                $filename = $zip2->getNameIndex($i);
                if (strpos($filename, 'xl/media/') === 0) {
                    echo "<p>Media file: $filename</p>";
                }
            }
            $zip2->close();
        }
        
        // Clean up
        if (file_exists($uploadedFilePath)) {
            unlink($uploadedFilePath);
        }
        
    } catch (Exception $e) {
        echo "<p style='color: red;'>❌ Error: " . $e->getMessage() . "</p>";
    }
} else {
    echo "<form method='post' enctype='multipart/form-data'>";
    echo "<input type='file' name='file' accept='.xlsx,.xls' required>";
    echo "<br><br>";
    echo "<input type='submit' value='Compare Upload Methods'>";
    echo "</form>";
    
    echo "<hr>";
    echo "<h3>Instructions:</h3>";
    echo "<p>Upload your Excel file to compare how it's processed in different scenarios.</p>";
}
?>


