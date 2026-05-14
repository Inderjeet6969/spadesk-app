<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'config.php';

$input = json_decode(file_get_contents('php://input'), true);

function getDB() {
    static $db = null;
    if ($db === null) {
        $db = new SQLite3(DB_FILE);
        $db->exec("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT, email TEXT UNIQUE, password TEXT, created_at TEXT)");
        $db->exec("CREATE TABLE IF NOT EXISTS sales (id INTEGER PRIMARY KEY, user_id INTEGER, customer_name TEXT, amount REAL, description TEXT, payment_method TEXT, created_at TEXT)");
        $db->exec("CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY, user_id INTEGER, category TEXT, amount REAL, description TEXT, created_at TEXT)");
        $db->exec("CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY, user_id INTEGER, name TEXT, email TEXT, phone TEXT, address TEXT, created_at TEXT)");
    }
    return $db;
}

function validateToken() {
    $headers = getallheaders();
    $auth = $headers['Authorization'] ?? '';
    if (preg_match('/Bearer\s+(.*)/i', $auth, $matches)) {
        $token = $matches[1];
        $parts = explode('.', $token);
        if (count($parts) === 3) {
            $payload = json_decode(base64_decode($parts[1]), true);
            if ($payload && isset($payload['user_id']) && $payload['exp'] > time()) {
                return $payload['user_id'];
            }
        }
    }
    return null;
}

function generateToken($userId) {
    $header = base64_encode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
    $payload = base64_encode(json_encode(['user_id' => $userId, 'exp' => time() + (30 * 24 * 60 * 60)]));
    $signature = base64_encode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
    return "$header.$payload.$signature";
}

$uri = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

// Auth: Register
if (strpos($uri, '/api/auth/register') !== false && $method === 'POST') {
    $name = htmlspecialchars($input['name'] ?? '');
    $email = htmlspecialchars($input['email'] ?? '');
    $password = $input['password'] ?? '';
    
    if (empty($name) || empty($email) || empty($password)) {
        echo json_encode(['error' => 'All fields required']);
        exit;
    }
    
    $check = $db->query("SELECT id FROM users WHERE email = '$email'");
    if ($check->fetchArray()) {
        echo json_encode(['error' => 'Email already registered']);
        exit;
    }
    
    $hash = password_hash($password, PASSWORD_BCRYPT);
    $db->exec("INSERT INTO users (name, email, password, created_at) VALUES ('$name', '$email', '$hash', datetime('now'))");
    
    $userId = $db->lastInsertRowID();
    $token = generateToken($userId);
    echo json_encode(['token' => $token, 'user' => ['id' => $userId, 'name' => $name, 'email' => $email]);
}

// Auth: Login
elseif (strpos($uri, '/api/auth/login') !== false && $method === 'POST') {
    $email = htmlspecialchars($input['email'] ?? '');
    $password = $input['password'] ?? '';
    
    $result = $db->query("SELECT * FROM users WHERE email = '$email'");
    $user = $result->fetchArray(SQLITE3_ASSOC);
    
    if (!$user || !password_verify($password, $user['password'])) {
        echo json_encode(['error' => 'Invalid credentials']);
        exit;
    }
    
    $token = generateToken($user['id']);
    echo json_encode(['token' => $token, 'user' => ['id' => $user['id'], 'name' => $user['name'], 'email' => $user['email']]]);
}

// Auth: Me
elseif (strpos($uri, '/api/auth/me') !== false) {
    $userId = validateToken();
    if (!$userId) { http_response_code(401); echo json_encode(['error' => 'Unauthorized']); exit; }
    $result = $db->query("SELECT id, name, email, created_at FROM users WHERE id = $userId");
    echo json_encode($result->fetchArray(SQLITE3_ASSOC));
}

$userId = validateToken();
if (!$userId) { http_response_code(401); echo json_encode(['error' => 'Unauthorized']); exit; }

// Sales
if (strpos($uri, '/api/sales') !== false) {
    if ($method === 'GET') {
        $result = $db->query("SELECT * FROM sales WHERE user_id = $userId ORDER BY created_at DESC");
        $sales = [];
        while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
            $sales[] = ['id' => $row['id'], 'userId' => $row['user_id'], 'customerName' => $row['customer_name'], 'amount' => floatval($row['amount']), 'description' => $row['description'], 'paymentMethod' => $row['payment_method'], 'createdAt' => $row['created_at']];
        }
        echo json_encode($sales);
    }
    elseif ($method === 'POST') {
        $customerName = htmlspecialchars($input['customerName'] ?? '');
        $amount = floatval($input['amount'] ?? 0);
        $description = htmlspecialchars($input['description'] ?? '');
        $paymentMethod = htmlspecialchars($input['paymentMethod'] ?? 'Cash');
        $db->exec("INSERT INTO sales (user_id, customer_name, amount, description, payment_method, created_at) VALUES ($userId, '$customerName', $amount, '$description', '$paymentMethod', datetime('now'))");
        echo json_encode(['id' => $db->lastInsertRowID(), 'userId' => $userId, 'customerName' => $customerName, 'amount' => $amount, 'description' => $description, 'paymentMethod' => $paymentMethod, 'createdAt' => date('Y-m-d H:i:s')]);
    }
    elseif ($method === 'DELETE' && preg_match('/\/api\/sales\/(\d+)/', $uri, $matches)) {
        $id = intval($matches[1]);
        $db->exec("DELETE FROM sales WHERE id = $id AND user_id = $userId");
        echo json_encode(['success' => true]);
    }
}

// Expenses
elseif (strpos($uri, '/api/expenses') !== false) {
    if ($method === 'GET') {
        $result = $db->query("SELECT * FROM expenses WHERE user_id = $userId ORDER BY created_at DESC");
        $expenses = [];
        while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
            $expenses[] = ['id' => $row['id'], 'userId' => $row['user_id'], 'category' => $row['category'], 'amount' => floatval($row['amount']), 'description' => $row['description'], 'createdAt' => $row['created_at']];
        }
        echo json_encode($expenses);
    }
    elseif ($method === 'POST') {
        $category = htmlspecialchars($input['category'] ?? '');
        $amount = floatval($input['amount'] ?? 0);
        $description = htmlspecialchars($input['description'] ?? '');
        $db->exec("INSERT INTO expenses (user_id, category, amount, description, created_at) VALUES ($userId, '$category', $amount, '$description', datetime('now'))");
        echo json_encode(['id' => $db->lastInsertRowID(), 'userId' => $userId, 'category' => $category, 'amount' => $amount, 'description' => $description, 'createdAt' => date('Y-m-d H:i:s')]);
    }
    elseif ($method === 'DELETE' && preg_match('/\/api\/expenses\/(\d+)/', $uri, $matches)) {
        $id = intval($matches[1]);
        $db->exec("DELETE FROM expenses WHERE id = $id AND user_id = $userId");
        echo json_encode(['success' => true]);
    }
}

// Customers
elseif (strpos($uri, '/api/customers') !== false) {
    if ($method === 'GET') {
        $result = $db->query("SELECT * FROM customers WHERE user_id = $userId ORDER BY created_at DESC");
        $customers = [];
        while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
            $customers[] = ['id' => $row['id'], 'userId' => $row['user_id'], 'name' => $row['name'], 'email' => $row['email'], 'phone' => $row['phone'], 'address' => $row['address'], 'createdAt' => $row['created_at']];
        }
        echo json_encode($customers);
    }
    elseif ($method === 'POST') {
        $name = htmlspecialchars($input['name'] ?? '');
        $email = htmlspecialchars($input['email'] ?? '');
        $phone = htmlspecialchars($input['phone'] ?? '');
        $address = htmlspecialchars($input['address'] ?? '');
        $db->exec("INSERT INTO customers (user_id, name, email, phone, address, created_at) VALUES ($userId, '$name', '$email', '$phone', '$address', datetime('now'))");
        echo json_encode(['id' => $db->lastInsertRowID(), 'userId' => $userId, 'name' => $name, 'email' => $email, 'phone' => $phone, 'address' => $address, 'createdAt' => date('Y-m-d H:i:s')]);
    }
    elseif ($method === 'DELETE' && preg_match('/\/api\/customers\/(\d+)/', $uri, $matches)) {
        $id = intval($matches[1]);
        $db->exec("DELETE FROM customers WHERE id = $id AND user_id = $userId");
        echo json_encode(['success' => true]);
    }
}