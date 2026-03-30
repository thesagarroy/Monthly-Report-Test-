<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); 
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

$dataFile = 'data.json';

// Handle POST request (Save Data)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Read the raw POST data
    $json = file_get_contents('php://input');
    
    // Validate JSON
    $decoded = json_decode($json, true);
    if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Invalid JSON payload."]);
        exit;
    }
    
    // Acquire exclusive lock and write to file to prevent concurrent access corruption
    $fp = fopen($dataFile, 'w');
    if ($fp) {
        if (flock($fp, LOCK_EX)) {
            fwrite($fp, json_encode($decoded, JSON_PRETTY_PRINT));
            flock($fp, LOCK_UN);
            fclose($fp);
            echo json_encode(["status" => "success", "message" => "Data saved successfully."]);
        } else {
            fclose($fp);
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "Could not lock the file for writing."]);
        }
    } else {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Could not open data.json for writing."]);
    }
    exit;
}

// Handle GET request (Read Data)
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($dataFile)) {
        // Prevent caching 
        header('Cache-Control: no-cache, must-revalidate');
        echo file_get_contents($dataFile);
    } else {
        echo json_encode([]);
    }
    exit;
}
?>
