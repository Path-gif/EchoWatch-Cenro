# EchoWatch CENRO

EchoWatch CENRO is an environmental monitoring and citizen reporting system with a web frontend, backend API, and mobile app workspace.

## Project Structure

- `frontend/` - Vite React web app for citizen, admin, and landing pages.
- `backend/` - Node/Express backend, database scripts, and legacy PHP API files.
- `mobile/` - React Native/Expo mobile app workspace.

## Local Setup

Create local environment files from the examples before running the apps:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Install dependencies in each app folder:

```bash
cd backend && npm install
cd ../frontend && npm install
cd ../mobile && npm install
```

Run the frontend:

```bash
cd frontend
npm run dev
```

Run the backend:

```bash
cd backend
npm start
```
