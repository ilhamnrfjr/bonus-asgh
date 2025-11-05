<?php
// api/employees.php - UNTUK SUPABASE
require_once 'config.php';

$db = new Database();
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            $employees = $db->getEmployees();
            $lastUpdated = $db->getLastUpdate('employees');
            
            sendResponse([
                'success' => true, 
                'employees' => $employees,
                'last_updated' => $lastUpdated
            ]);
            break;
            
        case 'POST':
            $data = getRequestBody();
            
            if (!isset($data['name']) || !isset($data['rank'])) {
                sendResponse(['success' => false, 'error' => 'Name and rank are required'], 400);
            }
            
            $employeeId = $db->createEmployee(trim($data['name']), trim($data['rank']));
            
            if ($employeeId) {
                $db->updateTimestamp('employees');
                sendResponse([
                    'success' => true, 
                    'employeeId' => $employeeId
                ], 201);
            } else {
                sendResponse(['success' => false, 'error' => 'Failed to create employee'], 500);
            }
            break;
            
        case 'PUT':
            $path = explode('/', $_SERVER['REQUEST_URI']);
            $id = end($path);
            
            if (!is_numeric($id)) {
                sendResponse(['success' => false, 'error' => 'Invalid employee ID'], 400);
            }
            
            $data = getRequestBody();
            
            if (!isset($data['name']) || !isset($data['rank'])) {
                sendResponse(['success' => false, 'error' => 'Name and rank are required'], 400);
            }
            
            $success = $db->updateEmployee($id, trim($data['name']), trim($data['rank']));
            
            if ($success) {
                $db->updateTimestamp('employees');
                sendResponse(['success' => true]);
            } else {
                sendResponse(['success' => false, 'error' => 'Employee not found or update failed'], 404);
            }
            break;
            
        case 'DELETE':
            $path = explode('/', $_SERVER['REQUEST_URI']);
            $id = end($path);
            
            if (!is_numeric($id)) {
                sendResponse(['success' => false, 'error' => 'Invalid employee ID'], 400);
            }
            
            $success = $db->deleteEmployee($id);
            
            if ($success) {
                $db->updateTimestamp('employees');
                sendResponse(['success' => true]);
            } else {
                sendResponse(['success' => false, 'error' => 'Employee not found or delete failed'], 404);
            }
            break;
            
        default:
            sendResponse(['success' => false, 'error' => 'Method not allowed'], 405);
    }
} catch (Exception $e) {
    error_log("Employees API Error: " . $e->getMessage());
    sendResponse(['success' => false, 'error' => 'Internal server error'], 500);
}
?>