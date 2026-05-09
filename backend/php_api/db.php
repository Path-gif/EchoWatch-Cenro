<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';

function db(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $hasDiscreteConfig = env_value('DB_NAME') !== null || env_value('DB_USER') !== null || env_value('DB_PASSWORD') !== null;
    $databaseUrl = $hasDiscreteConfig ? null : env_value('DATABASE_URL');

    if ($databaseUrl) {
        $parts = parse_url($databaseUrl);
        if ($parts === false) {
            json_response(['error' => 'Invalid DATABASE_URL'], 500);
        }

        $host = $parts['host'] ?? 'localhost';
        $port = (string) ($parts['port'] ?? '5432');
        $name = ltrim($parts['path'] ?? '', '/');
        $user = rawurldecode($parts['user'] ?? '');
        $pass = rawurldecode($parts['pass'] ?? '');
    } else {
        $host = env_value('DB_HOST', 'localhost');
        $port = env_value('DB_PORT', '5432');
        $name = env_value('DB_NAME', 'ecowatch');
        $user = env_value('DB_USER', 'postgres');
        $pass = env_value('DB_PASSWORD', '');
    }

    $dsn = "pgsql:host={$host};port={$port};dbname={$name}";

    try {
        $pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    } catch (PDOException $exception) {
        json_response(['error' => 'Database connection failed', 'detail' => $exception->getMessage()], 500);
    }

    return $pdo;
}

function ensure_runtime_columns(): void
{
    $pdo = db();
    $pdo->exec('ALTER TABLE users ADD COLUMN IF NOT EXISTS municipality TEXT');
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS report_media (
            id SERIAL PRIMARY KEY,
            report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,
            file_path TEXT,
            file_url TEXT,
            mime_type TEXT,
            uploaded_by_user BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )'
    );
    $pdo->exec('ALTER TABLE report_media ADD COLUMN IF NOT EXISTS uploaded_by_user BOOLEAN DEFAULT false');
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS report_activities (
            id SERIAL PRIMARY KEY,
            report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
            admin_id INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
            activity_type VARCHAR(50),
            old_status VARCHAR(50),
            new_status VARCHAR(50),
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        )'
    );
}
