<?php
// api/config.php - UNTUK SUPABASE
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Supabase configuration - GANTI DENGAN DATA ANDA!
class Database {
    private $supabase_url;
    private $supabase_key;
    
    public function __construct() {
        // ⚠️ GANTI DENGAN URL DAN KEY ANDA!
        $this->supabase_url = 'https://hislvqwzpvwpgysovtsi.supabase.co';
        $this->supabase_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhpc2x2cXd6cHZ3cGd5c292dHNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMDk0MzksImV4cCI6MjA3Nzg4NTQzOX0.bN65bD_ge9pLv3NZLHKV-q7Yu62Jjo8tsHABPcUPLSM';
    }
    
    private function makeRequest($method, $endpoint, $data = null) {
        $url = $this->supabase_url . $endpoint;
        
        $headers = [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $this->supabase_key,
            'apikey: ' . $this->supabase_key,
            'Prefer: return=representation'
        ];
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        
        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            if ($data) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        } elseif ($method === 'PATCH' || $method === 'PUT') {
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
            if ($data) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        } elseif ($method === 'DELETE') {
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
        }
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        return [
            'status' => $httpCode,
            'data' => json_decode($response, true)
        ];
    }
    
    // Employees methods
    public function getEmployees() {
        $result = $this->makeRequest('GET', '/rest/v1/employees?order=rank,name');
        return $result['status'] === 200 ? $result['data'] : [];
    }
    
    public function createEmployee($name, $rank) {
        $result = $this->makeRequest('POST', '/rest/v1/employees', [
            'name' => $name,
            'rank' => $rank
        ]);
        return $result['status'] === 201 ? $result['data'][0]['id'] : false;
    }
    
    public function updateEmployee($id, $name, $rank) {
        $result = $this->makeRequest('PATCH', "/rest/v1/employees?id=eq.{$id}", [
            'name' => $name,
            'rank' => $rank
        ]);
        return $result['status'] === 200;
    }
    
    public function deleteEmployee($id) {
        $result = $this->makeRequest('DELETE', "/rest/v1/employees?id=eq.{$id}");
        return $result['status'] === 200;
    }
    
    // Bonus records methods
    public function getBonusByWeek($week) {
        $result = $this->makeRequest('GET', "/rest/v1/bonus_records?week=eq.{$week}");
        return $result['status'] === 200 ? $result['data'] : [];
    }
    
    public function saveBonusData($week, $bonusData) {
        // Delete existing data for the week
        $this->makeRequest('DELETE', "/rest/v1/bonus_records?week=eq.{$week}");
        
        // Insert new data
        $inserted = 0;
        foreach ($bonusData as $record) {
            $result = $this->makeRequest('POST', '/rest/v1/bonus_records', [
                'employee_id' => $record['employee_id'],
                'week' => $week,
                'input_zone' => $record['input_zone'] ?? 0,
                'absence_status' => $record['absence_status'] ?? 'No Absence',
                'absence_link' => $record['absence_link'] ?? '',
                'bonus' => $record['bonus'] ?? 0,
                'penalty' => $record['penalty'] ?? 0,
                'conclusion' => $record['conclusion'] ?? 'No Penalty'
            ]);
            if ($result['status'] === 201) $inserted++;
        }
        
        return $inserted;
    }
    
    // Data updates methods
    public function updateTimestamp($tableName) {
        $result = $this->makeRequest('PATCH', "/rest/v1/data_updates?table_name=eq.{$tableName}", [
            'last_updated' => date('c')
        ]);
        if ($result['status'] !== 200) {
            // Insert if doesn't exist
            $this->makeRequest('POST', '/rest/v1/data_updates', [
                'table_name' => $tableName,
                'last_updated' => date('c')
            ]);
        }
    }
    
    public function getLastUpdate($tableName) {
        $result = $this->makeRequest('GET', "/rest/v1/data_updates?table_name=eq.{$tableName}");
        return $result['status'] === 200 && !empty($result['data']) 
            ? $result['data'][0]['last_updated'] 
            : null;
    }
}

function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

function getRequestBody() {
    $input = file_get_contents('php://input');
    return $input ? json_decode($input, true) : [];
}
?>