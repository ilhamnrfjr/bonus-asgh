<?php
// api/employees.php
require_once 'config.php';

$db = new Database();
$pdo = $db->getConnection();

$method = $_SERVER['REQUEST_METHOD'];

// Debug logging
error_log("Employees API called: " . $method);

try {
    switch ($method) {
        case 'GET':
            // GET semua employees dengan sorting berdasarkan rank
            $stmt = $pdo->query("
                SELECT * FROM employees 
                ORDER BY 
                    CASE rank
                        WHEN 'Hospital Executive' THEN 1
                        WHEN 'Executive Assistant' THEN 2
                        WHEN 'Medical Director' THEN 3
                        WHEN 'Attending Physician' THEN 4
                        WHEN 'Fellow' THEN 5
                        WHEN 'Senior Resident' THEN 6
                        WHEN 'Resident' THEN 7
                        ELSE 8
                    END,
                    name
            ");
            $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Tambahkan last_updated timestamp
            $lastUpdated = $db->getLastUpdate('employees');
            
            sendResponse([
                'success' => true, 
                'employees' => $employees,
                'last_updated' => $lastUpdated
            ]);
            break;
            
        case 'POST':
            // CREATE employee baru
            $data = getRequestBody();
            error_log("POST data: " . print_r($data, true));
            
            if (!isset($data['name']) || empty($data['name']) || !isset($data['rank']) || empty($data['rank'])) {
                sendResponse(['success' => false, 'error' => 'Name and rank are required and cannot be empty'], 400);
            }
            
            $name = trim($data['name']);
            $rank = trim($data['rank']);
            
            if (empty($name) || empty($rank)) {
                sendResponse(['success' => false, 'error' => 'Name and rank cannot be empty'], 400);
            }
            
            $stmt = $pdo->prepare("INSERT INTO employees (name, rank) VALUES (?, ?)");
            $stmt->execute([$name, $rank]);
            
            $employeeId = $pdo->lastInsertId();
            
            // Update timestamp
            $db->updateTimestamp('employees');
            
            error_log("Employee created successfully: " . $employeeId);
            
            sendResponse([
                'success' => true, 
                'employeeId' => $employeeId,
                'message' => 'Employee created successfully'
            ], 201);
            break;
            
        case 'PUT':
            // UPDATE employee
            $path = explode('/', $_SERVER['REQUEST_URI']);
            $id = end($path);
            
            error_log("PUT request for ID: " . $id);
            
            if (!is_numeric($id)) {
                sendResponse(['success' => false, 'error' => 'Invalid employee ID'], 400);
            }
            
            $data = getRequestBody();
            
            if (!isset($data['name']) || empty($data['name']) || !isset($data['rank']) || empty($data['rank'])) {
                sendResponse(['success' => false, 'error' => 'Name and rank are required'], 400);
            }
            
            $name = trim($data['name']);
            $rank = trim($data['rank']);
            
            // Cek jika employee exists
            $checkStmt = $pdo->prepare("SELECT id FROM employees WHERE id = ?");
            $checkStmt->execute([$id]);
            if (!$checkStmt->fetch()) {
                sendResponse(['success' => false, 'error' => 'Employee not found'], 404);
            }
            
            $stmt = $pdo->prepare("UPDATE employees SET name = ?, rank = ? WHERE id = ?");
            $stmt->execute([$name, $rank, $id]);
            
            // Update timestamp
            $db->updateTimestamp('employees');
            
            sendResponse([
                'success' => true,
                'message' => 'Employee updated successfully'
            ]);
            break;
            
        case 'DELETE':
            // DELETE employee
            $path = explode('/', $_SERVER['REQUEST_URI']);
            $id = end($path);
            
            error_log("DELETE request for ID: " . $id);
            
            if (!is_numeric($id)) {
                sendResponse(['success' => false, 'error' => 'Invalid employee ID'], 400);
            }
            
            // Cek jika employee exists
            $checkStmt = $pdo->prepare("SELECT id FROM employees WHERE id = ?");
            $checkStmt->execute([$id]);
            if (!$checkStmt->fetch()) {
                sendResponse(['success' => false, 'error' => 'Employee not found'], 404);
            }
            
            $stmt = $pdo->prepare("DELETE FROM employees WHERE id = ?");
            $stmt->execute([$id]);
            
            // Update timestamp
            $db->updateTimestamp('employees');
            
            sendResponse([
                'success' => true,
                'message' => 'Employee deleted successfully'
            ]);
            break;
            
        default:
            sendResponse(['success' => false, 'error' => 'Method not allowed'], 405);
    }
} catch (Exception $e) {
    error_log("Employees API Error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    sendResponse(['success' => false, 'error' => 'Internal server error: ' . $e->getMessage()], 500);
}
?>