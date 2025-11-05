<?php
// api/health.php - UNTUK SUPABASE
require_once 'config.php';

$db = new Database();

try {
    // Test connection by getting employees count
    $employees = $db->getEmployees();
    
    sendResponse([
        'success' => true,
        'message' => 'Supabase API is connected',
        'employees_count' => count($employees),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
} catch (Exception $e) {
    sendResponse([
        'success' => false,
        'error' => 'Supabase connection failed: ' . $e->getMessage()
    ], 500);
}
?>