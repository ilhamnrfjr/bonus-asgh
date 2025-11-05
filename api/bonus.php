<?php
// api/bonus.php
require_once 'config.php';

$db = new Database();
$pdo = $db->getConnection();

$method = $_SERVER['REQUEST_METHOD'];
$path = explode('/', $_SERVER['REQUEST_URI']);
$week = end($path);

try {
    switch ($method) {
        case 'GET':
            // GET bonus data untuk week tertentu
            if (!is_numeric($week)) {
                sendResponse(['success' => false, 'error' => 'Invalid week parameter'], 400);
            }
            
            $stmt = $pdo->prepare("
                SELECT * FROM bonus_records 
                WHERE week = ?
            ");
            $stmt->execute([$week]);
            $bonusData = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Tambahkan last_updated timestamp
            $lastUpdated = $db->getLastUpdate('bonus_records');
            
            sendResponse([
                'success' => true, 
                'bonusData' => $bonusData,
                'last_updated' => $lastUpdated
            ]);
            break;
            
        case 'POST':
            // SAVE bonus data
            $data = getRequestBody();
            
            if (!isset($data['week']) || !isset($data['bonusData']) || !is_array($data['bonusData'])) {
                sendResponse(['success' => false, 'error' => 'Week and bonusData are required'], 400);
            }
            
            // Mulai transaction
            $pdo->beginTransaction();
            
            try {
                // Hapus data lama untuk week yang sama
                $stmt = $pdo->prepare("DELETE FROM bonus_records WHERE week = ?");
                $stmt->execute([$data['week']]);
                
                // Insert data baru
                $stmt = $pdo->prepare("
                    INSERT INTO bonus_records 
                    (employee_id, week, input_zone, absence_status, absence_link, bonus, penalty, conclusion) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ");
                
                $insertedCount = 0;
                foreach ($data['bonusData'] as $record) {
                    $stmt->execute([
                        $record['employee_id'],
                        $data['week'],
                        $record['input_zone'] ?? 0,
                        $record['absence_status'] ?? 'No Absence',
                        $record['absence_link'] ?? '',
                        $record['bonus'] ?? 0,
                        $record['penalty'] ?? 0,
                        $record['conclusion'] ?? 'No Penalty'
                    ]);
                    $insertedCount++;
                }
                
                // Update timestamp
                $db->updateTimestamp('bonus_records');
                
                $pdo->commit();
                sendResponse(['success' => true, 'insertedCount' => $insertedCount]);
                
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;
            
        default:
            sendResponse(['success' => false, 'error' => 'Method not allowed'], 405);
    }
} catch (Exception $e) {
    sendResponse(['success' => false, 'error' => $e->getMessage()], 500);
}
?>