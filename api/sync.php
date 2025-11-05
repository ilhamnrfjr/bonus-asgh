<?php
// api/sync.php - Untuk check data updates
require_once 'config.php';

$db = new Database();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $employeesUpdated = $db->getLastUpdate('employees');
    $bonusUpdated = $db->getLastUpdate('bonus_records');
    
    sendResponse([
        'success' => true,
        'updates' => [
            'employees' => $employeesUpdated,
            'bonus_records' => $bonusUpdated
        ]
    ]);
} else {
    sendResponse(['success' => false, 'error' => 'Method not allowed'], 405);
}
?>