<?php
require_once '../vendor/autoload.php';

$app = require_once '../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "<h2>Excel ZIP Structure Explorer</h2>";

if (isset($_FILES['file'])) {
    $file = $_FILES['file'];
    $tempPath = $file['tmp_name'];
    
    echo "<h3>Exploring: " . $file['name'] . "</h3>";
    
    try {
        $zip = new \ZipArchive();
        if ($zip->open($tempPath) === true) {
            echo "<p>✅ ZIP opened successfully</p>";
            echo "<p>Total files in ZIP: " . $zip->numFiles . "</p>";
            
            echo "<h4>All Files in ZIP:</h4>";
            echo "<table border='1' style='border-collapse: collapse; width: 100%;'>";
            echo "<tr><th>#</th><th>File Path</th><th>Size</th><th>Type</th></tr>";
            
            $mediaFiles = [];
            $imageFiles = [];
            
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $filename = $zip->getNameIndex($i);
                $fileSize = $zip->statIndex($i)['size'];
                
                // Check if it's a media file
                $isMedia = strpos($filename, 'media') !== false;
                $isImage = preg_match('/\.(jpg|jpeg|png|gif|bmp|webp)$/i', $filename);
                
                if ($isMedia) {
                    $mediaFiles[] = $filename;
                }
                if ($isImage) {
                    $imageFiles[] = $filename;
                }
                
                $type = $isMedia ? 'MEDIA' : ($isImage ? 'IMAGE' : 'OTHER');
                $style = $isMedia ? 'background-color: #e6f3ff;' : ($isImage ? 'background-color: #e6ffe6;' : '');
                
                echo "<tr style='$style'>";
                echo "<td>$i</td>";
                echo "<td>$filename</td>";
                echo "<td>" . number_format($fileSize) . " bytes</td>";
                echo "<td>$type</td>";
                echo "</tr>";
            }
            echo "</table>";
            
            echo "<h4>Media Files Found:</h4>";
            if (count($mediaFiles) > 0) {
                echo "<ul>";
                foreach ($mediaFiles as $mediaFile) {
                    echo "<li>$mediaFile</li>";
                }
                echo "</ul>";
            } else {
                echo "<p>No media files found</p>";
            }
            
            echo "<h4>Image Files Found:</h4>";
            if (count($imageFiles) > 0) {
                echo "<ul>";
                foreach ($imageFiles as $imageFile) {
                    echo "<li>$imageFile</li>";
                }
                echo "</ul>";
            } else {
                echo "<p>No image files found</p>";
            }
            
            // Try to find files that might contain "Picture"
            echo "<h4>Files containing 'Picture':</h4>";
            $pictureFiles = [];
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $filename = $zip->getNameIndex($i);
                if (strpos($filename, 'Picture') !== false) {
                    $pictureFiles[] = $filename;
                }
            }
            
            if (count($pictureFiles) > 0) {
                echo "<ul>";
                foreach ($pictureFiles as $pictureFile) {
                    echo "<li>$pictureFile</li>";
                }
                echo "</ul>";
            } else {
                echo "<p>No files containing 'Picture' found</p>";
            }
            
            $zip->close();
        } else {
            echo "<p style='color: red;'>❌ Failed to open ZIP file</p>";
        }
        
    } catch (Exception $e) {
        echo "<p style='color: red;'>❌ Error: " . $e->getMessage() . "</p>";
    }
} else {
    echo "<form method='post' enctype='multipart/form-data'>";
    echo "<input type='file' name='file' accept='.xlsx,.xls' required>";
    echo "<br><br>";
    echo "<input type='submit' value='Explore ZIP Structure'>";
    echo "</form>";
    
    echo "<hr>";
    echo "<h3>Instructions:</h3>";
    echo "<p>Upload your Excel file to see the actual ZIP structure and find where the images are stored.</p>";
}
?>
