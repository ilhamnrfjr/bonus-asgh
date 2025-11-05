<?php
// api/config.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// Enable error reporting untuk debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

class Database {
    private $db_file = '../data/hospital_bonus.db';
    private $pdo;
    
    public function __construct() {
        try {
            // Pastikan folder data exists
            if (!file_exists('../data')) {
                mkdir('../data', 0755, true);
            }
            
            $this->pdo = new PDO("sqlite:" . $this->db_file);
            $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_WARNING); // Tambahkan ini untuk debug
            $this->createTables();
        } catch(PDOException $e) {
            $this->sendError("Database connection error: " . $e->getMessage());
        }
    }
    
    private function sendError($message) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $message]);
        exit;
    }
    
    private function createTables() {
        try {
            // Tabel employees - HAPUS sort_order sementara
            $this->pdo->exec("
                CREATE TABLE IF NOT EXISTS employees (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    rank TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ");
            
            // Tabel bonus_records
            $this->pdo->exec("
                CREATE TABLE IF NOT EXISTS bonus_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    employee_id INTEGER NOT NULL,
                    week INTEGER NOT NULL,
                    input_zone REAL DEFAULT 0,
                    absence_status TEXT DEFAULT 'No Absence',
                    absence_link TEXT DEFAULT '',
                    bonus REAL DEFAULT 0,
                    penalty REAL DEFAULT 0,
                    conclusion TEXT DEFAULT 'No Penalty',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
                    UNIQUE(employee_id, week)
                )
            ");
            
            // Tabel untuk tracking perubahan
            $this->pdo->exec("
                CREATE TABLE IF NOT EXISTS data_updates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    table_name TEXT NOT NULL,
                    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ");
            
            // Insert data default jika tabel kosong
            $stmt = $this->pdo->query("SELECT COUNT(*) FROM employees");
            if ($stmt->fetchColumn() == 0) {
                $this->insertDefaultData();
            }
        } catch (Exception $e) {
            $this->sendError("Table creation error: " . $e->getMessage());
        }
    }
    
    private function insertDefaultData() {
        $defaultEmployees = [
            ['Rainer Joyce', 'Hospital Executive'],
            ['Jareth Ashford', 'Executive Assistant'],
            ['Devanarley Wyattavery', 'Medical Director'],
            ['Flovino Neophytus', 'Attending Physician'],
            ['Hank Mccormick', 'Attending Physician'],
            ['Olivia Gabriella', 'Fellow'],
            ['Bastian Adler', 'Senior Resident'],
            ['Sano Franzi', 'Senior Resident'],
            ['Dalton Morbidelli', 'Resident'],
            ['Stefano Liang', 'Resident'],
            ['Zac Whittle', 'Resident']
        ];
        
        try {
            $stmt = $this->pdo->prepare("INSERT INTO employees (name, rank) VALUES (?, ?)");
            foreach ($defaultEmployees as $employee) {
                $stmt->execute($employee);
            }
            
            // Insert initial update timestamp
            $this->pdo->exec("INSERT OR REPLACE INTO data_updates (table_name, last_updated) VALUES ('employees', CURRENT_TIMESTAMP)");
            $this->pdo->exec("INSERT OR REPLACE INTO data_updates (table_name, last_updated) VALUES ('bonus_records', CURRENT_TIMESTAMP)");
            
        } catch (Exception $e) {
            $this->sendError("Default data insertion error: " . $e->getMessage());
        }
    }
    
    public function getConnection() {
        return $this->pdo;
    }
    
    public function updateTimestamp($tableName) {
        try {
            $stmt = $this->pdo->prepare(
                "INSERT OR REPLACE INTO data_updates (table_name, last_updated) VALUES (?, CURRENT_TIMESTAMP)"
            );
            $stmt->execute([$tableName]);
        } catch (Exception $e) {
            error_log("Timestamp update error: " . $e->getMessage());
        }
    }
    
    public function getLastUpdate($tableName) {
        try {
            $stmt = $this->pdo->prepare(
                "SELECT last_updated FROM data_updates WHERE table_name = ?"
            );
            $stmt->execute([$tableName]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return $result ? $result['last_updated'] : null;
        } catch (Exception $e) {
            error_log("Last update error: " . $e->getMessage());
            return null;
        }
    }
}

function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

function getRequestBody() {
    $input = file_get_contents('php://input');
    if (empty($input)) {
        return [];
    }
    return json_decode($input, true) ?? [];
}
?>