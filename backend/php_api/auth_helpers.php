<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';

function base64url_encode(string $value): string
{
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}

function base64url_decode(string $value): string|false
{
    $padding = strlen($value) % 4;
    if ($padding > 0) {
        $value .= str_repeat('=', 4 - $padding);
    }

    return base64_decode(strtr($value, '-_', '+/'), true);
}

function jwt_secret(): string
{
    return env_value('JWT_SECRET', 'change_me') ?? 'change_me';
}

function create_token(array $payload, int $days = 7): string
{
    $now = time();
    $payload['iat'] = $now;
    $payload['exp'] = $now + ($days * 24 * 60 * 60);

    $header = ['alg' => 'HS256', 'typ' => 'JWT'];
    $segments = [
        base64url_encode(json_encode($header, JSON_UNESCAPED_SLASHES)),
        base64url_encode(json_encode($payload, JSON_UNESCAPED_SLASHES)),
    ];
    $signature = hash_hmac('sha256', implode('.', $segments), jwt_secret(), true);
    $segments[] = base64url_encode($signature);

    return implode('.', $segments);
}

function decode_token(?string $token): ?array
{
    if (!$token) {
        return null;
    }

    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return null;
    }

    [$encodedHeader, $encodedPayload, $encodedSignature] = $parts;
    $expected = base64url_encode(hash_hmac('sha256', "$encodedHeader.$encodedPayload", jwt_secret(), true));

    if (!hash_equals($expected, $encodedSignature)) {
        return null;
    }

    $payloadJson = base64url_decode($encodedPayload);
    if ($payloadJson === false) {
        return null;
    }

    $payload = json_decode($payloadJson, true);
    if (!is_array($payload) || (isset($payload['exp']) && time() > (int) $payload['exp'])) {
        return null;
    }

    return $payload;
}

function bearer_payload(): ?array
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) {
        return null;
    }

    return decode_token($matches[1]);
}

function require_user(): array
{
    $payload = bearer_payload();
    if (!$payload || empty($payload['sub']) || (($payload['role'] ?? null) === 'admin')) {
        json_response(['error' => 'unauthorized'], 401);
    }

    return $payload;
}

function require_admin(): array
{
    $payload = bearer_payload();
    if (!$payload || (($payload['role'] ?? null) !== 'admin')) {
        json_response(['error' => 'unauthorized'], 401);
    }

    return $payload;
}

