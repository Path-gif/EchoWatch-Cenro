<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth_helpers.php';

send_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

ensure_runtime_columns();

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');
if ($base !== '' && $base !== '/' && str_starts_with($path, $base)) {
    $path = substr($path, strlen($base)) ?: '/';
}
$path = '/' . trim($path, '/');

if ($method === 'GET' && preg_match('#^/uploads/([^/]+)$#', $path, $matches)) {
    $file = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'backend_uploads' . DIRECTORY_SEPARATOR . basename(rawurldecode($matches[1]));
    if (!is_file($file)) {
        json_response(['error' => 'File not found'], 404);
    }

    $mime = mime_content_type($file) ?: 'application/octet-stream';
    header('Content-Type: ' . $mime);
    header('Content-Length: ' . filesize($file));
    readfile($file);
    exit;
}

function request_json(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function is_valid_email(string $email): bool
{
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

function user_payload(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'phone' => $row['phone'] ?? null,
        'email' => $row['email'] ?? null,
        'name' => $row['full_name'] ?? null,
        'municipality' => $row['municipality'] ?? null,
    ];
}

function issue_user_token(array $user): string
{
    return create_token([
        'sub' => (int) $user['id'],
        'phone' => $user['phone'] ?? null,
        'email' => $user['email'] ?? null,
        'name' => $user['full_name'] ?? null,
        'municipality' => $user['municipality'] ?? null,
    ], 7);
}

function municipality_code(?float $latitude, ?float $longitude): string
{
    if ($latitude === null || $longitude === null) {
        return 'UNS';
    }

    $municipalities = [
        ['code' => 'OLO', 'lat' => 14.8386, 'lng' => 120.2842],
        ['code' => 'SUB', 'lat' => 14.8799, 'lng' => 120.2312],
        ['code' => 'SM', 'lat' => 14.9742, 'lng' => 120.1579],
        ['code' => 'SA', 'lat' => 14.9471, 'lng' => 120.0897],
        ['code' => 'SN', 'lat' => 15.0167, 'lng' => 120.0833],
        ['code' => 'SF', 'lat' => 15.0622, 'lng' => 120.0708],
        ['code' => 'CAB', 'lat' => 15.1673, 'lng' => 120.0334],
    ];

    $closest = null;
    foreach ($municipalities as $item) {
        $distance = hypot($latitude - $item['lat'], $longitude - $item['lng']);
        if ($closest === null || $distance < $closest['distance']) {
            $closest = ['code' => $item['code'], 'distance' => $distance];
        }
    }

    return $closest['code'] ?? 'UNS';
}

function category_name(string $violationType): ?string
{
    $value = strtolower(trim(preg_replace('/\s+/', ' ', $violationType)));
    if (str_starts_with($value, 'illegal cutting')) return 'Illegal Cutting';
    if (str_starts_with($value, 'illegal occupation')) return 'Illegal Occupation';
    if (str_contains($value, 'wildlife')) return 'Wildlife Poaching';
    if (str_contains($value, 'mining')) return 'Mining Violation';
    if (str_contains($value, 'pollution')) return 'Pollution';
    if (str_contains($value, 'waste')) return 'Waste Dumping';
    return null;
}

function public_media_url(array $media): ?string
{
    if (!empty($media['file_url'])) {
        return $media['file_url'];
    }
    if (empty($media['file_path'])) {
        return null;
    }

    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    return $scheme . '://' . $host . '/uploads/' . rawurlencode(basename($media['file_path']));
}

if ($method === 'GET' && $path === '/') {
    json_response(['ok' => true, 'service' => 'ecowatch-php-backend']);
}

if ($method === 'POST' && $path === '/auth/register') {
    $body = request_json();
    $name = trim((string) ($body['fullName'] ?? $body['name'] ?? ''));
    $phone = trim((string) ($body['phone'] ?? ''));
    $email = strtolower(trim((string) ($body['email'] ?? '')));
    $password = (string) ($body['password'] ?? '');
    $municipality = trim((string) ($body['municipality'] ?? ''));

    if ($name === '' || $phone === '' || $email === '' || $password === '') {
        json_response(['error' => 'full name, phone number, email, and password are required'], 400);
    }
    if (!is_valid_email($email)) {
        json_response(['error' => 'Invalid email address'], 400);
    }
    if (strlen($phone) < 10) {
        json_response(['error' => 'Invalid phone number'], 400);
    }
    if (strlen($password) < 6) {
        json_response(['error' => 'Password must be at least 6 characters'], 400);
    }

    $pdo = db();
    $check = $pdo->prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(:email) OR phone = :phone LIMIT 1');
    $check->execute(['email' => $email, 'phone' => $phone]);
    if ($check->fetch()) {
        json_response(['error' => 'Email address or phone number already registered'], 409);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO users (phone, email, password_hash, full_name, municipality, created_at, updated_at)
         VALUES (:phone, :email, :password_hash, :full_name, :municipality, NOW(), NOW())
         RETURNING id, phone, email, full_name, municipality'
    );
    $stmt->execute([
        'phone' => $phone,
        'email' => $email,
        'password_hash' => password_hash($password, PASSWORD_BCRYPT),
        'full_name' => $name,
        'municipality' => $municipality !== '' ? $municipality : null,
    ]);
    $user = $stmt->fetch();

    json_response(['ok' => true, 'message' => 'Registration successful', 'user' => user_payload($user), 'token' => issue_user_token($user)], 201);
}

if ($method === 'POST' && $path === '/auth/login') {
    $body = request_json();
    $identifier = trim((string) ($body['email'] ?? $body['phone'] ?? ''));
    $password = (string) ($body['password'] ?? '');
    if ($identifier === '' || $password === '') {
        json_response(['error' => 'Email or phone and password are required'], 400);
    }

    $loginByEmail = is_valid_email($identifier);
    $stmt = db()->prepare(
        $loginByEmail
            ? 'SELECT id, phone, email, full_name, municipality, password_hash FROM users WHERE LOWER(email) = LOWER(:identifier) LIMIT 1'
            : 'SELECT id, phone, email, full_name, municipality, password_hash FROM users WHERE phone = :identifier LIMIT 1'
    );
    $stmt->execute(['identifier' => $loginByEmail ? strtolower($identifier) : $identifier]);
    $user = $stmt->fetch();
    if (!$user || !password_verify($password, (string) $user['password_hash'])) {
        json_response(['error' => 'Invalid email/phone or password'], 401);
    }

    $update = db()->prepare('UPDATE users SET last_login = NOW() WHERE id = :id');
    $update->execute(['id' => $user['id']]);

    json_response(['ok' => true, 'message' => 'Login successful', 'user' => user_payload($user), 'token' => issue_user_token($user)]);
}

if ($method === 'PATCH' && $path === '/auth/me') {
    $payload = require_user();
    $body = request_json();
    $name = trim((string) ($body['name'] ?? $body['fullName'] ?? ''));
    $phone = trim((string) ($body['phone'] ?? ''));
    $email = strtolower(trim((string) ($body['email'] ?? '')));
    $municipality = trim((string) ($body['municipality'] ?? ''));

    if ($name === '' || $phone === '' || $email === '') {
        json_response(['error' => 'full name, phone number, and email are required'], 400);
    }
    if (!is_valid_email($email)) {
        json_response(['error' => 'Invalid email address'], 400);
    }

    $pdo = db();
    $check = $pdo->prepare('SELECT id FROM users WHERE (LOWER(email) = LOWER(:email) OR phone = :phone) AND id <> :id LIMIT 1');
    $check->execute(['email' => $email, 'phone' => $phone, 'id' => $payload['sub']]);
    if ($check->fetch()) {
        json_response(['error' => 'Email address or phone number already registered'], 409);
    }

    $stmt = $pdo->prepare(
        'UPDATE users SET full_name = :name, phone = :phone, email = :email, municipality = :municipality, updated_at = NOW()
         WHERE id = :id RETURNING id, phone, email, full_name, municipality'
    );
    $stmt->execute([
        'name' => $name,
        'phone' => $phone,
        'email' => $email,
        'municipality' => $municipality !== '' ? $municipality : null,
        'id' => $payload['sub'],
    ]);
    $user = $stmt->fetch();
    if (!$user) {
        json_response(['error' => 'User not found'], 404);
    }

    json_response(['ok' => true, 'message' => 'Profile updated successfully', 'user' => user_payload($user), 'token' => issue_user_token($user)]);
}

if ($method === 'POST' && $path === '/reports') {
    $payload = require_user();
    $violationType = trim((string) ($_POST['violation_type'] ?? ''));
    $description = trim((string) ($_POST['description'] ?? ''));
    $manualLocation = trim((string) ($_POST['location_manual'] ?? $_POST['manual_location'] ?? ''));
    $latitude = isset($_POST['latitude']) && $_POST['latitude'] !== '' ? (float) $_POST['latitude'] : null;
    $longitude = isset($_POST['longitude']) && $_POST['longitude'] !== '' ? (float) $_POST['longitude'] : null;
    $isAnonymous = in_array((string) ($_POST['is_anonymous'] ?? '0'), ['1', 'true', 'yes'], true);

    if ($violationType === '' || $description === '') {
        json_response(['error' => 'violation_type and description are required'], 400);
    }
    if ($latitude === null && $manualLocation === '') {
        json_response(['error' => 'Latitude/longitude or manual location is required'], 400);
    }

    $pdo = db();
    $pdo->beginTransaction();
    try {
        $categoryId = null;
        $categoryName = category_name($violationType);
        if ($categoryName) {
            $category = $pdo->prepare('SELECT id FROM categories WHERE LOWER(name) = LOWER(:name) LIMIT 1');
            $category->execute(['name' => $categoryName]);
            $row = $category->fetch();
            $categoryId = $row['id'] ?? null;
        }

        $prefix = municipality_code($latitude, $longitude) . '-' . date('Y') . '-';
        $last = $pdo->prepare('SELECT reference_number FROM reports WHERE reference_number LIKE :prefix ORDER BY id DESC LIMIT 1');
        $last->execute(['prefix' => $prefix . '%']);
        $lastRef = $last->fetchColumn();
        $next = $lastRef ? ((int) substr((string) $lastRef, -4)) + 1 : 1;
        $reference = $prefix . str_pad((string) $next, 4, '0', STR_PAD_LEFT);

        $insert = $pdo->prepare(
            'INSERT INTO reports (reference_number, user_id, category_id, violation_type, description, latitude, longitude, manual_location, is_anonymous, status, created_at, updated_at)
             VALUES (:reference_number, :user_id, :category_id, :violation_type, :description, :latitude, :longitude, :manual_location, :is_anonymous, :status, NOW(), NOW())
             RETURNING id, reference_number, status, created_at'
        );
        $insert->execute([
            'reference_number' => $reference,
            'user_id' => $payload['sub'],
            'category_id' => $categoryId,
            'violation_type' => $violationType,
            'description' => $description,
            'latitude' => $latitude,
            'longitude' => $longitude,
            'manual_location' => $manualLocation !== '' ? $manualLocation : null,
            'is_anonymous' => $isAnonymous,
            'status' => 'submitted',
        ]);
        $report = $insert->fetch();

        $files = $_FILES['media'] ?? null;
        if ($files && is_array($files['name'])) {
            $uploadDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'backend_uploads';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0775, true);
            }

            $mediaInsert = $pdo->prepare('INSERT INTO report_media (report_id, file_path, mime_type, uploaded_by_user) VALUES (:report_id, :file_path, :mime_type, true)');
            foreach ($files['name'] as $index => $originalName) {
                if (($files['error'][$index] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
                    continue;
                }
                $safe = preg_replace('/[^a-zA-Z0-9._-]/', '_', basename((string) $originalName));
                $filename = time() . '-' . random_int(100000, 999999) . '-' . $safe;
                $target = $uploadDir . DIRECTORY_SEPARATOR . $filename;
                if (move_uploaded_file($files['tmp_name'][$index], $target)) {
                    $mediaInsert->execute([
                        'report_id' => $report['id'],
                        'file_path' => 'backend_uploads/' . $filename,
                        'mime_type' => $files['type'][$index] ?? null,
                    ]);
                }
            }
        }

        $pdo->commit();
        json_response(['ok' => true] + $report, 201);
    } catch (Throwable $exception) {
        $pdo->rollBack();
        json_response(['error' => 'Failed to create report', 'detail' => $exception->getMessage()], 500);
    }
}

if ($method === 'GET' && $path === '/reports') {
    $payload = require_user();
    $stmt = db()->prepare(
        'SELECT id, reference_number, violation_type, description, latitude, longitude, manual_location, status, is_anonymous, created_at, updated_at
         FROM reports WHERE user_id = :user_id ORDER BY created_at DESC'
    );
    $stmt->execute(['user_id' => $payload['sub']]);
    json_response(['ok' => true, 'reports' => $stmt->fetchAll()]);
}

if ($method === 'GET' && $path === '/reports/notifications') {
    $payload = require_user();
    $stmt = db()->prepare(
        "SELECT id, reference_number, violation_type, status, resolution_notes, resolution_date, updated_at, created_at
         FROM reports
         WHERE user_id = :user_id AND LOWER(status) IN ('resolved', 'completed', 'done', 'closed')
         ORDER BY COALESCE(resolution_date, updated_at, created_at) DESC"
    );
    $stmt->execute(['user_id' => $payload['sub']]);
    $notifications = array_map(static fn ($row) => [
        'id' => 'report-' . $row['id'] . '-' . $row['status'],
        'report_id' => (int) $row['id'],
        'reference_number' => $row['reference_number'],
        'title' => 'Report activity completed',
        'message' => $row['reference_number'] . ' has been marked ' . str_replace('_', ' ', (string) $row['status']) . '.',
        'violation_type' => $row['violation_type'],
        'status' => $row['status'],
        'notes' => $row['resolution_notes'] ?? null,
        'created_at' => $row['resolution_date'] ?? $row['updated_at'] ?? $row['created_at'],
    ], $stmt->fetchAll());

    json_response(['ok' => true, 'notifications' => $notifications]);
}

if ($method === 'POST' && $path === '/admin/login') {
    $body = request_json();
    $identifier = trim((string) ($body['username'] ?? $body['email'] ?? ''));
    $password = (string) ($body['password'] ?? '');
    if ($identifier === '' || $password === '') {
        json_response(['error' => 'email/name and password required'], 400);
    }

    $stmt = db()->prepare('SELECT id, email, password_hash, name, is_active FROM admin_users WHERE LOWER(email) = LOWER(:identifier) OR LOWER(name) = LOWER(:identifier) LIMIT 1');
    $stmt->execute(['identifier' => $identifier]);
    $admin = $stmt->fetch();
    $isActive = $admin && !in_array($admin['is_active'] ?? true, [false, 'f', 'false', 0, '0'], true);
    if (!$admin || !$isActive || !password_verify($password, (string) $admin['password_hash'])) {
        json_response(['error' => 'invalid_credentials'], 401);
    }

    $token = create_token(['sub' => (int) $admin['id'], 'role' => 'admin', 'email' => $admin['email'], 'name' => $admin['name']], 30);
    json_response(['ok' => true, 'token' => $token, 'admin' => ['id' => (int) $admin['id'], 'email' => $admin['email'], 'name' => $admin['name']]]);
}

if ($method === 'GET' && $path === '/admin/reports/overview') {
    require_admin();
    $pdo = db();
    $reports = $pdo->query(
        'SELECT r.id, r.reference_number, r.violation_type, r.latitude, r.longitude, r.manual_location, r.status, r.created_at, r.description, u.full_name, u.phone
         FROM reports r LEFT JOIN users u ON r.user_id = u.id ORDER BY r.created_at DESC'
    )->fetchAll();
    $mediaRows = $pdo->query('SELECT id, report_id, file_path, file_url, mime_type, created_at FROM report_media ORDER BY created_at ASC, id ASC')->fetchAll();
    $mediaByReport = [];
    foreach ($mediaRows as $media) {
        $url = public_media_url($media);
        if (!$url) {
            continue;
        }
        $mediaByReport[$media['report_id']][] = [
            'id' => (int) $media['id'],
            'url' => $url,
            'mime_type' => $media['mime_type'] ?? null,
            'is_image' => str_starts_with((string) ($media['mime_type'] ?? ''), 'image/'),
        ];
    }

    $municipalities = ['Olongapo', 'Subic', 'San Marcelino', 'San Antonio', 'San Narciso', 'San Felipe', 'Cabangan'];
    $mapped = array_map(static function ($row) use ($mediaByReport) {
        return [
            'id' => (int) $row['id'],
            'reference_number' => $row['reference_number'],
            'violation_type' => $row['violation_type'],
            'municipality' => 'Unspecified',
            'latitude' => $row['latitude'] !== null ? (float) $row['latitude'] : null,
            'longitude' => $row['longitude'] !== null ? (float) $row['longitude'] : null,
            'manual_location' => $row['manual_location'],
            'status' => $row['status'],
            'created_at' => $row['created_at'],
            'description' => $row['description'],
            'submitter_name' => $row['full_name'],
            'phone' => $row['phone'],
            'evidence_media' => $mediaByReport[$row['id']] ?? [],
        ];
    }, $reports);

    $counts = array_map(static fn ($name) => ['municipality' => $name, 'count' => 0], $municipalities);
    json_response(['ok' => true, 'generated_at' => date(DATE_ATOM), 'top_municipality' => null, 'municipality_counts' => $counts, 'reports' => $mapped]);
}

if ($method === 'DELETE' && preg_match('#^/admin/reports/(\d+)$#', $path, $matches)) {
    require_admin();
    $pdo = db();
    $pdo->beginTransaction();
    $reportId = (int) $matches[1];
    $pdo->prepare('DELETE FROM report_media WHERE report_id = :id')->execute(['id' => $reportId]);
    $pdo->prepare('DELETE FROM report_activities WHERE report_id = :id')->execute(['id' => $reportId]);
    $stmt = $pdo->prepare('DELETE FROM reports WHERE id = :id RETURNING id');
    $stmt->execute(['id' => $reportId]);
    $deleted = $stmt->fetch();
    $pdo->commit();
    if (!$deleted) {
        json_response(['error' => 'Report not found'], 404);
    }
    json_response(['ok' => true, 'message' => 'Report deleted successfully']);
}

if ($method === 'PATCH' && preg_match('#^/admin/reports/(\d+)/status$#', $path, $matches)) {
    $admin = require_admin();
    $body = request_json();
    $status = strtolower(trim((string) ($body['status'] ?? '')));
    $notes = trim((string) ($body['notes'] ?? ''));
    if (!in_array($status, ['resolved', 'completed', 'done', 'closed', 'in_review', 'submitted'], true)) {
        json_response(['error' => 'Invalid report status'], 400);
    }

    $pdo = db();
    $pdo->beginTransaction();
    $current = $pdo->prepare('SELECT id, status FROM reports WHERE id = :id FOR UPDATE');
    $current->execute(['id' => (int) $matches[1]]);
    $row = $current->fetch();
    if (!$row) {
        $pdo->rollBack();
        json_response(['error' => 'Report not found'], 404);
    }

    $resolved = in_array($status, ['resolved', 'completed', 'done', 'closed'], true);
    $update = $pdo->prepare(
        'UPDATE reports SET status = :status, resolution_date = ' . ($resolved ? 'NOW()' : 'NULL') . ', resolution_notes = :notes, updated_at = NOW()
         WHERE id = :id RETURNING id, status, resolution_date, resolution_notes, updated_at'
    );
    $update->execute(['status' => $status, 'notes' => $notes !== '' ? $notes : null, 'id' => (int) $matches[1]]);
    $report = $update->fetch();

    $activity = $pdo->prepare('INSERT INTO report_activities (report_id, admin_id, activity_type, old_status, new_status, notes) VALUES (:report_id, :admin_id, :activity_type, :old_status, :new_status, :notes)');
    $activity->execute([
        'report_id' => (int) $matches[1],
        'admin_id' => $admin['sub'],
        'activity_type' => 'status_update',
        'old_status' => $row['status'],
        'new_status' => $status,
        'notes' => $notes !== '' ? $notes : null,
    ]);
    $pdo->commit();

    json_response(['ok' => true, 'report' => $report]);
}

if ($method === 'POST' && $path === '/ai/description-suggestions') {
    $body = request_json();
    $type = trim((string) ($body['violationType'] ?? $body['violation_type'] ?? 'environmental violation'));
    $location = trim((string) ($body['location'] ?? 'the reported location'));
    json_response([
        'ok' => true,
        'suggestions' => [
            "Observed possible {$type} at {$location}. Please verify the area and assess environmental impact.",
            "Reported activity appears related to {$type}. Evidence, location details, and witness notes are attached for review.",
            "Citizen report for {$type} near {$location}. Immediate inspection is recommended if resources are available.",
        ],
    ]);
}

json_response(['error' => 'Not found', 'path' => $path], 404);
