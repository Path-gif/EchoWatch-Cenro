<?php

declare(strict_types=1);

function load_env_file(string $path): void
{
    if (!is_file($path)) {
        return;
    }

    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }

        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value, " \t\n\r\0\x0B\"'");

        if ($key !== '' && getenv($key) === false) {
            putenv("$key=$value");
            $_ENV[$key] = $value;
        }
    }
}

load_env_file(dirname(__DIR__) . DIRECTORY_SEPARATOR . '.env');

function env_value(string $key, ?string $fallback = null): ?string
{
    $value = getenv($key);
    return $value === false ? $fallback : $value;
}

function api_origin(): string
{
    return env_value('CORS_ORIGIN', $_SERVER['HTTP_ORIGIN'] ?? 'http://localhost:5173') ?? '*';
}

function send_cors_headers(): void
{
    header('Access-Control-Allow-Origin: ' . api_origin());
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Credentials: true');
}

function json_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

