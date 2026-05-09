# EcoWatch PHP API

PHP backend for the React frontend. It mirrors the existing API contract:

- `POST /auth/register`
- `POST /auth/login`
- `PATCH /auth/me`
- `GET /reports`
- `POST /reports`
- `GET /reports/notifications`
- `POST /admin/login`
- `GET /admin/reports/overview`
- `PATCH /admin/reports/{id}/status`
- `DELETE /admin/reports/{id}`

## Database

The API uses PostgreSQL through PDO. It reads the existing backend `.env` file:

```env
DATABASE_URL=postgresql://postgres:Admin_DENR@localhost:5432/ecowatch
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecowatch
DB_USER=postgres
DB_PASSWORD=Admin_DENR
JWT_SECRET=ecowatch_super_secret_jwt_key_2024
```

Use the SQL schema in `backend/db/ecowatch_postgresql.sql` to initialize the database.

Note: phpMyAdmin is for MySQL/MariaDB. For PostgreSQL, use pgAdmin, phpPgAdmin, Adminer with the PostgreSQL driver, or another PostgreSQL-capable admin tool.

## Run Locally

From the repository root:

```powershell
php -S localhost:8000 -t backend/php_api backend/php_api/index.php
```

Then run the frontend:

```powershell
cd frontend
npm run dev
```

The frontend `.env` points to `http://localhost:8000`.
