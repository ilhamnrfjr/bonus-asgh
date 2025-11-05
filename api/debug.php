<?php
// api/debug.php - Untuk debugging
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

try {
    // Test database connection
    $db_file = '../data/hospital_bonus.db';
    
    $response = [
        'success' => true,
        'debug_info' => [
            'database_file' => $db_file,
            'database_exists' => file_exists($db_file),
            'database_size' => file_exists($db_file) ? filesize($db_file) : 0,
            'data_directory' => '../data',
            'data_directory_exists' => file_exists('../data'),
            'data_directory_writable' => is_writable('../data'),
            'php_version' => PHP_VERSION,
            'pdo_sqlite_available' => extension_loaded('pdo_sqlite'),
            'timestamp' => date('Y-m-d H:i:s')
        ]
    ];
    
    if (file_exists($db_file)) {
        $pdo = new PDO("sqlite:" . $db_file);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // Check tables
        $tables = $pdo->query("SELECT name FROM sqlite_master WHERE type='table'")->fetchAll(PDO::FETCH_COLUMN);
        $response['debug_info']['tables'] = $tables;
        
        // Check employees count
        $employeeCount = $pdo->query("SELECT COUNT(*) FROM employees")->fetchColumn();
        $response['debug_info']['employee_count'] = $employeeCount;
        
        // Sample employees
        $sampleEmployees = $pdo->query("SELECT * FROM employees LIMIT 3")->fetchAll(PDO::FETCH_ASSOC);
        $response['debug_info']['sample_employees'] = $sampleEmployees;
    }
    
    echo json_encode($response);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'debug_info' => [
            'php_version' => PHP_VERSION,
            'pdo_sqlite_available' => extension_loaded('pdo_sqlite'),
            'timestamp' => date('Y-m-d H:i:s')
        ]
    ]);
}
?>