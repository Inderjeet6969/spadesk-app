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

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

// Simple JWT-like token validation
function validateToken() {
    $headers = getallheaders();
    $auth = $headers['Authorization'] ?? '';
    if (preg_match('/Bearer\s+(.*)/i', $auth, $matches)) {
        $token = $matches[1];
        $payload = json_decode(base64_decode($token), true);
        if ($payload && isset($payload['user_id']) && $payload['exp'] > time()) {
            return $payload['user_id'];
        }
    }
    return null;
}

function generateToken($userId) {
    $header = base64_encode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
    $payload = base64_encode(json_encode([
        'user_id' => $userId,
        'exp' => time() + (30 * 24 * 60 * 60) // 30 days
    ]));
    $signature = base64_encode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
    return "$header.$payload.$signature";
}

function hashPassword($password) {
    return password_hash($password, PASSWORD_BCRYPT);
}

function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if ($conn->connect_error) {
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

$uri = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];

// Auth routes
if (strpos($uri, '/api/auth/register') !== false && $method === 'POST') {
    $name = $conn->real_escape_string($input['name'] ?? '');
    $email = $conn->real_escape_string($input['email'] ?? '');
    $password = $input['password'] ?? '';
    
    if (empty($name) || empty($email) || empty($password)) {
        echo json_encode(['error' => 'All fields required']);
        exit;
    }
    
    // Check if email exists
    $check = $conn->query("SELECT id FROM users WHERE email = '$email'");
    if ($check->num_rows > 0) {
        echo json_encode(['error' => 'Email already registered']);
        exit;
    }
    
    $hashed = hashPassword($password);
    $conn->query("INSERT INTO users (name, email, password) VALUES ('$name', '$email', '$hashed')");
    
    $userId = $conn->insert_id;
    $token = generateToken($userId);
    
    echo json_encode([
        'token' => $token,
        'user' => ['id' => $userId, 'name' => $name, 'email' => $email]
    ]);
}

elseif (strpos($uri, '/api/auth/login') !== false && $method === 'POST') {
    $email = $conn->real_escape_string($input['email'] ?? '');
    $password = $input['password'] ?? '';
    
    $result = $conn->query("SELECT * FROM users WHERE email = '$email'");
    if ($result->num_rows === 0) {
        echo json_encode(['error' => 'Invalid credentials']);
        exit;
    }
    
    $user = $result->fetch_assoc();
    if (!verifyPassword($password, $user['password'])) {
        echo json_encode(['error' => 'Invalid credentials']);
        exit;
    }
    
    $token = generateToken($user['id']);
    echo json_encode([
        'token' => $token,
        'user' => ['id' => $user['id'], 'name' => $user['name'], 'email' => $user['email']]
    ]);
}

elseif (strpos($uri, '/api/auth/me') !== false) {
    $userId = validateToken();
    if (!$userId) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        exit;
    }
    
    $result = $conn->query("SELECT id, name, email, created_at FROM users WHERE id = $userId");
    echo json_encode($result->fetch_assoc());
}

// Protected routes
$userId = validateToken();

if (!$userId) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// Sales
if (strpos($uri, '/api/sales') !== false) {
    if ($method === 'GET') {
        $result = $conn->query("SELECT * FROM sales WHERE user_id = $userId ORDER BY created_at DESC");
        $sales = [];
        while ($row = $result->fetch_assoc()) {
            $sales[] = [
                'id' => $row['id'],
                'userId' => $row['user_id'],
                'customerName' => $row['customer_name'],
                'amount' => floatval($row['amount']),
                'description' => $row['description'],
                'paymentMethod' => $row['payment_method'],
                'createdAt' => $row['created_at']
            ];
        }
        echo json_encode($sales);
    }
    elseif ($method === 'POST') {
        $customerName = $conn->real_escape_string($input['customerName'] ?? '');
        $amount = floatval($input['amount'] ?? 0);
        $description = $conn->real_escape_string($input['description'] ?? '');
        $paymentMethod = $conn->real_escape_string($input['paymentMethod'] ?? 'Cash');
        
        $conn->query("INSERT INTO sales (user_id, customer_name, amount, description, payment_method) VALUES ($userId, '$customerName', $amount, '$description', '$paymentMethod')");
        
        echo json_encode([
            'id' => $conn->insert_id,
            'userId' => $userId,
            'customerName' => $customerName,
            'amount' => $amount,
            'description' => $description,
            'paymentMethod' => $paymentMethod,
            'createdAt' => date('Y-m-d H:i:s')
        ]);
    }
    elseif ($method === 'DELETE' && preg_match('/\/api\/sales\/(\d+)/', $uri, $matches)) {
        $id = intval($matches[1]);
        $conn->query("DELETE FROM sales WHERE id = $id AND user_id = $userId");
        echo json_encode(['success' => true]);
    }
}

// Expenses
elseif (strpos($uri, '/api/expenses') !== false) {
    if ($method === 'GET') {
        $result = $conn->query("SELECT * FROM expenses WHERE user_id = $userId ORDER BY created_at DESC");
        $expenses = [];
        while ($row = $result->fetch_assoc()) {
            $expenses[] = [
                'id' => $row['id'],
                'userId' => $row['user_id'],
                'category' => $row['category'],
                'amount' => floatval($row['amount']),
                'description' => $row['description'],
                'createdAt' => $row['created_at']
            ];
        }
        echo json_encode($expenses);
    }
    elseif ($method === 'POST') {
        $category = $conn->real_escape_string($input['category'] ?? '');
        $amount = floatval($input['amount'] ?? 0);
        $description = $conn->real_escape_string($input['description'] ?? '');
        
        $conn->query("INSERT INTO expenses (user_id, category, amount, description) VALUES ($userId, '$category', $amount, '$description')");
        
        echo json_encode([
            'id' => $conn->insert_id,
            'userId' => $userId,
            'category' => $category,
            'amount' => $amount,
            'description' => $description,
            'createdAt' => date('Y-m-d H:i:s')
        ]);
    }
    elseif ($method === 'DELETE' && preg_match('/\/api\/expenses\/(\d+)/', $uri, $matches)) {
        $id = intval($matches[1]);
        $conn->query("DELETE FROM expenses WHERE id = $id AND user_id = $userId");
        echo json_encode(['success' => true]);
    }
}

// Customers
elseif (strpos($uri, '/api/customers') !== false) {
    if ($method === 'GET') {
        $result = $conn->query("SELECT * FROM customers WHERE user_id = $userId ORDER BY created_at DESC");
        $customers = [];
        while ($row = $result->fetch_assoc()) {
            $customers[] = [
                'id' => $row['id'],
                'userId' => $row['user_id'],
                'name' => $row['name'],
                'email' => $row['email'],
                'phone' => $row['phone'],
                'address' => $row['address'],
                'createdAt' => $row['created_at']
            ];
        }
        echo json_encode($customers);
    }
    elseif ($method === 'POST') {
        $name = $conn->real_escape_string($input['name'] ?? '');
        $email = $conn->real_escape_string($input['email'] ?? '');
        $phone = $conn->real_escape_string($input['phone'] ?? '');
        $address = $conn->real_escape_string($input['address'] ?? '');
        
        $conn->query("INSERT INTO customers (user_id, name, email, phone, address) VALUES ($userId, '$name', '$email', '$phone', '$address')");
        
        echo json_encode([
            'id' => $conn->insert_id,
            'userId' => $userId,
            'name' => $name,
            'email' => $email,
            'phone' => $phone,
            'address' => $address,
            'createdAt' => date('Y-m-d H:i:s')
        ]);
    }
    elseif ($method === 'DELETE' && preg_match('/\/api\/customers\/(\d+)/', $uri, $matches)) {
        $id = intval($matches[1]);
        $conn->query("DELETE FROM customers WHERE id = $id AND user_id = $userId");
        echo json_encode(['success' => true]);
    }
}

$conn->close();