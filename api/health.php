<?php
// api/health.php
require_once 'config.php';

$db = new Database();
$pdo = $db->getConnection();

// Test database connection
try {
    $stmt = $pdo->query("SELECT COUNT(*) as employee_count FROM employees");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    sendResponse([
        'success' => true,
        'message' => 'Hospital Bonus API is running',
        'database' => 'Connected',
        'employee_count' => $result['employee_count'],
        'timestamp' => date('Y-m-d H:i:s')
    ]);
} catch (Exception $e) {
    sendResponse([
        'success' => false,
        'error' => 'Database connection failed',
        'message' => $e->getMessage()
    ], 500);
}
?>