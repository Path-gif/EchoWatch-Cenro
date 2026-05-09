<?php

header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

require_once 'db.php';

//json
$body = json_decode(file_get_contents('php://input'), true);

$email    = trim($body['email']    ?? '');
$password =      $body['password'] ?? '';

if (!$email || !$password) {
    echo json_encode(['success' => false, 'message' => 'Email and password are required.']);
    exit;
}

//search user using email
$stmt = $conn->prepare('SELECT id, username, email, password FROM users WHERE email = ?');
$stmt->bind_param('s', $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    // No user found with that email
    echo json_encode(['success' => false, 'message' => 'User not registered.']);
    $stmt->close();
    exit;
}

$user = $result->fetch_assoc();

// verify pass 
if (!password_verify($password, $user['password'])) {
    echo json_encode(['success' => false, 'message' => 'Incorrect password.']);
    $stmt->close();
    exit;
}

// return if successful
echo json_encode([
    'success' => true,
    'message' => 'Login successful.',
    'user' => [
        'id'       => $user['id'],
        'username' => $user['username'],
        'email'    => $user['email'],
    ]
]);

$stmt->close();
$conn->close();
