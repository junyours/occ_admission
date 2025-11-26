<?php
require_once '../vendor/autoload.php';

$app = require_once '../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "<h2>Excel Image Debug</h2>";

if (isset($_FILES['file'])) {
    $file = $_FILES['file'];
    $tempPath = $file['tmp_name'];
    
    try {
        $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($tempPath);
        $worksheet = $spreadsheet->getActiveSheet();
        $drawings = $worksheet->getDrawingCollection();
        
        echo "<p>Drawings found: " . count($drawings) . "</p>";
        
        foreach ($drawings as $i => $drawing) {
            echo "<p>Drawing $i: " . $drawing->getCoordinates() . " - " . $drawing->getName() . "</p>";
        }
        
    } catch (Exception $e) {
        echo "<p>Error: " . $e->getMessage() . "</p>";
    }
} else {
    echo "<form method='post' enctype='multipart/form-data'>";
    echo "<input type='file' name='file' accept='.xlsx,.xls'>";
    echo "<input type='submit' value='Upload'>";
    echo "</form>";
}
?>
