# 📌 Task Maker

A full-stack web app for **task management** with **role-based access control (Admin / User)**.  
Includes authentication, global state, CRUD for tasks, deadlines, and per-task Q&A threads.

---

## 🚀 Tech Stack

**Frontend**
- React + TypeScript (Vite)
- React Router
- TailwindCSS + shadcn/ui

**Backend**
- Node.js + Express
- Prisma ORM
- JWT Authentication (Bearer or httpOnly Cookie)

**Database**
- MySQL (Docker for local development)

**Other**
- zod (validation)  
- ESLint + Prettier (lint/format)

---

## ✨ Features

- 🔑 **Authentication**
  - Register, login, logout  
  - Role-based access (Admin/User)

- 👩‍💻 **Roles**
  - **Admin:** Create / Edit / Delete tasks, set deadlines, answer user questions  
  - **User:** View assigned tasks, mark completed, ask questions

- 📋 **Tasks**
  - Title, description, status, assigned user, optional deadline

- 💬 **Q&A System**
  - Threaded Q&A per task (User asks, Admin answers)

- 🔒 **Security**
  - bcrypt password hashing  
  - JWT for authentication  
  - CORS + input validation

---

## 📂 Project Structure

/client → React + Vite frontend
/server → Express + Prisma backend
/server/prisma → Prisma schema & migrations

---

## 🛠️ Local Development Setup

### 1️⃣ Prerequisites
- Node.js v18+  
- npm (or pnpm)  
- Docker Desktop (for MySQL)

---

### 2️⃣ Start MySQL with Docker

Create a `docker-compose.yml`:

```yaml
version: "3.9"
services:
  mysql:
    image: mysql:8.0
    container_name: taskmaker-mysql
    restart: unless-stopped
    environment:
      MYSQL_DATABASE: taskmaker
      MYSQL_USER: appuser
      MYSQL_PASSWORD: apppass
      MYSQL_ROOT_PASSWORD: rootpass
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

  adminer:
    image: adminer
    restart: unless-stopped
    ports:
      - "8080:8080"

volumes:
  mysql_data:
Run:
docker compose up -d
DB connection: mysql://appuser:apppass@127.0.0.1:3306/taskmaker
Adminer UI: http://localhost:8080
3️⃣ Environment Variables
Create /server/.env:
# Prisma connection (MySQL)
DATABASE_URL="mysql://appuser:apppass@127.0.0.1:3306/taskmaker"

# Auth
JWT_SECRET="replace_with_strong_secret"
JWT_EXPIRES_IN="7d"

# CORS
CORS_ORIGIN="http://localhost:5173"

# Server
PORT=4000
NODE_ENV=development

# Cookie mode flags (only used if you enable cookie auth)
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
Create /client/.env:
VITE_API_URL="http://localhost:4000"
After editing .env files, restart the dev servers.
4️⃣ Install & Run
Backend
cd server
npm install
npx prisma migrate dev
npm run dev
Frontend
cd ../client
npm install
npm run dev
Frontend → http://localhost:5173
API → http://localhost:4000
🔧 Useful Commands
Prisma
npx prisma migrate dev     # run migrations (dev)
npx prisma migrate deploy  # apply migrations (prod-like)
npx prisma studio          # open DB explorer
Backend
npm run dev    # dev server with TS
npm run build  # compile TypeScript
npm start      # run built server
Frontend
npm run dev       # Vite dev
npm run build     # production build
npm run preview   # preview build
📡 API Endpoints
Auth
POST /auth/register
POST /auth/login
POST /auth/logout (if cookie mode)
GET /me
Tasks
GET /tasks
POST /tasks (Admin)
PATCH /tasks/:id (Admin)
DELETE /tasks/:id (Admin)
Q&A
GET /tasks/:id/qa
POST /tasks/:id/qa (User ask / Admin answer)
Protected routes require a valid JWT (Bearer or cookie). Admin routes enforce role === 'ADMIN'.
🔐 Authentication Options
Option A: Bearer Token (localStorage)
On login, API returns accessToken.
Client stores it in localStorage and sets Authorization: Bearer <token> on fetch/axios.
⚠️ Simpler but less secure (XSS risk) — fine for dev.
Option B: httpOnly Cookie (Recommended for Prod)
Server sets Set-Cookie with httpOnly.
Client uses fetch(..., { credentials: 'include' }) or axios.defaults.withCredentials = true.
Express CORS must allow credentials and exact origin.
Express CORS example:
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
}));
Cookie example:
res.cookie("accessToken", token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
🌉 Global State & Routing
AuthContext tracks { user, role, isAuthenticated, loading }.
On app mount, call /me to rehydrate auth from token/cookie.
ProtectedRoute waits for loading === false before redirecting.
Hide Navbar until loading === false && isAuthenticated.
🛡️ Security Notes
Passwords hashed with bcrypt.
JWT signed with strong JWT_SECRET.
Input validation on server (zod).
CORS locked to known origins.
Avoid storing sensitive data in localStorage in production.
📌 Key Decisions & Rationale
React + Vite + shadcn/ui → Fast DX, consistent UI, accessible components.
Express + Prisma → Lightweight backend with type safety and clear DB migrations.
MySQL via Docker (local) → Reproducible local environment with easy resets.
JWT Auth → Flexible and host-agnostic.
React Context → Simple global state for auth/roles without extra libs.
🐞 Troubleshooting
Login loops / refreshes page
Ensure login form does e.preventDefault() and uses SPA navigation (navigate('/app')).
Ensure ProtectedRoute waits for loading === false.
Hydrate auth on mount by calling /me before rendering protected routes.
“Failed to fetch”
Check VITE_API_URL → http://localhost:4000 for local dev.
Make sure API is running and responding at /api/health (add a simple route if needed).
For different ports, configure CORS on the server.
Navbar shows before login
Render it only when !loading && isAuthenticated.
📝 License
MIT
