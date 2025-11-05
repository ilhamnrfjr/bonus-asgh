<?php
// api/bonus.php - UNTUK SUPABASE
require_once 'config.php';

$db = new Database();
$method = $_SERVER['REQUEST_METHOD'];
$path = explode('/', $_SERVER['REQUEST_URI']);
$week = end($path);

try {
    switch ($method) {
        case 'GET':
            if (!is_numeric($week)) {
                sendResponse(['success' => false, 'error' => 'Invalid week parameter'], 400);
            }
            
            $bonusData = $db->getBonusByWeek($week);
            $lastUpdated = $db->getLastUpdate('bonus_records');
            
            sendResponse([
                'success' => true, 
                'bonusData' => $bonusData,
                'last_updated' => $lastUpdated
            ]);
            break;
            
        case 'POST':
            $data = getRequestBody();
            
            if (!isset($data['week']) || !isset($data['bonusData'])) {
                sendResponse(['success' => false, 'error' => 'Week and bonusData are required'], 400);
            }
            
            $insertedCount = $db->saveBonusData($data['week'], $data['bonusData']);
            
            if ($insertedCount >= 0) {
                $db->updateTimestamp('bonus_records');
                sendResponse(['success' => true, 'insertedCount' => $insertedCount]);
            } else {
                sendResponse(['success' => false, 'error' => 'Failed to save bonus data'], 500);
            }
            break;
            
        default:
            sendResponse(['success' => false, 'error' => 'Method not allowed'], 405);
    }
} catch (Exception $e) {
    error_log("Bonus API Error: " . $e->getMessage());
    sendResponse(['success' => false, 'error' => 'Internal server error'], 500);
}
?>