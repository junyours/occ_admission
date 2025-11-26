<?php
require_once '../vendor/autoload.php';

$app = require_once '../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "<h2>Excel Image Debug Tool</h2>";

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['excel_file'])) {
    $file = $_FILES['excel_file'];
    
    if ($file['error'] === UPLOAD_ERR_OK) {
        $tempPath = $file['tmp_name'];
        $fileName = $file['name'];
        
        echo "<h3>Analyzing: $fileName</h3>";
        
        try {
            // Load the Excel file
            $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($tempPath);
            $worksheet = $spreadsheet->getActiveSheet();
            
            // Get all drawings
            $drawings = $worksheet->getDrawingCollection();
            echo "<p><strong>Total drawings found:</strong> " . count($drawings) . "</p>";
            
            if (count($drawings) > 0) {
                echo "<h4>Drawing Details:</h4>";
                echo "<table border='1' style='border-collapse: collapse; width: 100%;'>";
                echo "<tr><th>Index</th><th>Cell</th><th>Name</th><th>Type</th><th>Width</th><th>Height</th><th>Offset X</th><th>Offset Y</th></tr>";
                
                foreach ($drawings as $index => $drawing) {
                    $coordinates = $drawing->getCoordinates();
                    $name = $drawing->getName();
                    $type = get_class($drawing);
                    $width = $drawing->getWidth();
                    $height = $drawing->getHeight();
                    $offsetX = $drawing->getOffsetX();
                    $offsetY = $drawing->getOffsetY();
                    
                    echo "<tr>";
                    echo "<td>$index</td>";
                    echo "<td>$coordinates</td>";
                    echo "<td>$name</td>";
                    echo "<td>$type</td>";
                    echo "<td>$width</td>";
                    echo "<td>$height</td>";
                    echo "<td>$offsetX</td>";
                    echo "<td>$offsetY</td>";
                    echo "</tr>";
                }
                echo "</table>";
            }
            
            // Analyze ZIP contents
            echo "<h4>ZIP File Contents:</h4>";
            $zip = new \ZipArchive();
            if ($zip->open($tempPath) === true) {
                echo "<table border='1' style='border-collapse: collapse; width: 100%;'>";
                echo "<tr><th>File</th><th>Size</th><th>Type</th></tr>";
                
                for ($i = 0; $i < $zip->numFiles; $i++) {
                    $filename = $zip->getNameIndex($i);
                    $stat = $zip->statIndex($i);
                    $size = $stat['size'];
                    
                    $type = 'Other';
                    if (strpos($filename, 'xl/media/') === 0) {
                        $type = 'Image';
                    } elseif (strpos($filename, 'xl/drawings/') === 0) {
                        $type = 'Drawing';
                    } elseif (strpos($filename, 'xl/worksheets/') === 0) {
                        $type = 'Worksheet';
                    }
                    
                    echo "<tr>";
                    echo "<td>$filename</td>";
                    echo "<td>$size bytes</td>";
                    echo "<td>$type</td>";
                    echo "</tr>";
                }
                echo "</table>";
                $zip->close();
            }
            
            // Test image extraction
            echo "<h4>Image Extraction Test:</h4>";
            foreach ($drawings as $index => $drawing) {
                echo "<h5>Drawing $index:</h5>";
                
                // Test reflection method
                $reflection = new \ReflectionClass($drawing);
                $possibleProperties = ['imageData', 'image', 'data', 'contents', 'imageResource', 'path', 'name', 'fileName', 'imageName', 'reference', 'imageIndex', 'imageId', 'index', 'id', 'rId'];
                
                echo "<ul>";
                foreach ($possibleProperties as $propertyName) {
                    if ($reflection->hasProperty($propertyName)) {
                        $property = $reflection->getProperty($propertyName);
                        $property->setAccessible(true);
                        $value = $property->getValue($drawing);
                        
                        if (is_string($value)) {
                            echo "<li><strong>$propertyName:</strong> " . substr($value, 0, 100) . (strlen($value) > 100 ? '...' : '') . "</li>";
                        } elseif (is_numeric($value)) {
                            echo "<li><strong>$propertyName:</strong> $value</li>";
                        } else {
                            echo "<li><strong>$propertyName:</strong> " . gettype($value) . "</li>";
                        }
                    }
                }
                echo "</ul>";
            }
            
        } catch (Exception $e) {
            echo "<p style='color: red;'>Error: " . $e->getMessage() . "</p>";
        }
        
        // Clean up
        unlink($tempPath);
    } else {
        echo "<p style='color: red;'>Upload error: " . $file['error'] . "</p>";
    }
} else {
    echo "<form method='POST' enctype='multipart/form-data'>";
    echo "<p>Select an Excel file to analyze:</p>";
    echo "<input type='file' name='excel_file' accept='.xlsx,.xls' required>";
    echo "<br><br>";
    echo "<input type='submit' value='Analyze Excel File'>";
    echo "</form>";
}

echo "<hr>";
echo "<p><strong>Instructions:</strong></p>";
echo "<ol>";
echo "<li>Upload your Excel file with images</li>";
echo "<li>This tool will show you all drawings and ZIP contents</li>";
echo "<li>Check if images are being detected correctly</li>";
echo "<li>Look for any patterns in the drawing properties</li>";
echo "</ol>";
?>
