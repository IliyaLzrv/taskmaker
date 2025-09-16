# Task Maker

A full-stack web app for creating, assigning, and completing tasks with **role-based access** (Admin / User). Includes authentication, global auth state, CRUD for tasks, deadlines, and a per-task Q&A thread.

## Tech Stack

- **Frontend:** React + TypeScript (Vite) with **shadcn/ui** and Tailwind
- **State:** React Context (+ reducer) for global auth & role
- **Routing:** React Router
- **Backend:** Node.js + Express
- **ORM:** Prisma
- **Database:** **MySQL** (local via Docker; PlanetScale/Railway for prod)
- **Auth:** JWT (Bearer or httpOnly cookie)
- **Validation:** zod
- **Lint/Format:** ESLint + Prettier

---

## Features

- **Auth:** Register, login, logout
- **Roles**
  - **Admin:** Create/Edit/Delete tasks, set deadlines, answer user questions
  - **User:** View assigned tasks, mark completed, ask questions
- **Tasks:** Title, description, status, assigned user, optional deadline
- **Q&A:** Threaded Q&A per task
- **Security:** bcrypt password hashing, JWT, CORS, input validation

---

## Monorepo Structure

/client # React + Vite app
/server # Express + Prisma API
/server/prisma # Prisma schema & migrations

---

## Local Development

### 1) Prerequisites
- Node.js 18+ and npm (or pnpm)
- Docker Desktop (for MySQL)

### 2) Start MySQL with Docker

Create `docker-compose.yml` at the repo root (or inside `/server`—adjust paths accordingly):

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
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "127.0.0.1", "-u", "root", "-prootpass"]
      interval: 10s
      timeout: 5s
      retries: 10

  adminer:
    image: adminer
    restart: unless-stopped
    ports:
      - "8080:8080"

volumes:
  mysql_data:
Run:
docker compose up -d
DB host: 127.0.0.1
Port: 3306
Database: taskmaker
User/Pass: appuser / apppass (root: root / rootpass)
Adminer UI: http://localhost:8080 (Server: mysql, or host.docker.internal if needed)
3) Environment Variables
Create /server/.env:
# Prisma connection string (MySQL)
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
If using httpOnly cookies, set axios to send credentials and ensure CORS allows them (see “Auth Modes” below).
4) Install & Run
Backend
cd server
npm install
npx prisma migrate dev
npx prisma db seed   # if you have a seed script
npm run dev
Frontend
cd ../client
npm install
npm run dev
Frontend: http://localhost:5173
API: http://localhost:4000
Prisma & MySQL Notes
Datasource in server/prisma/schema.prisma:
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
Run migrations:
npx prisma migrate dev
Open Prisma Studio:
npx prisma studio
Scripts
Server
npm run dev — dev server with TS
npm run build — compile TypeScript
npm start — run compiled server
npx prisma migrate dev — dev migrations
npx prisma migrate deploy — deploy migrations (prod)
Client
npm run dev — Vite dev
npm run build — production build
npm run preview — preview prod build
API (Brief)
POST /auth/register
POST /auth/login
POST /auth/logout (if cookie mode)
GET /me
GET /tasks (list; user sees assigned; admin sees all)
POST /tasks (admin)
PATCH /tasks/:id (admin)
DELETE /tasks/:id (admin)
GET /tasks/:id/qa
POST /tasks/:id/qa (user ask / admin answer)
Protected routes require a valid JWT (Bearer or cookie). Admin routes enforce role === 'ADMIN'.
Auth Modes
Option A: Bearer Token (Local Storage)
On login, API returns accessToken.
Client stores it in localStorage and sets Authorization: Bearer <token> on axios.
Simple, but XSS risk—use only in trusted contexts.
Option B: httpOnly Cookie (Recommended for Prod)
Server sets Set-Cookie with httpOnly.
Client uses axios.defaults.withCredentials = true.
Server CORS must allow credentials and exact origin.
Express CORS:
import cors from "cors";
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
Global State & Routing
AuthContext tracks { user, role, isAuthenticated, loading }.
On app mount, call /me to rehydrate auth from token/cookie.
ProtectedRoute waits for loading === false before redirecting.
Hide Navbar until loading === false && isAuthenticated.
Deployment (Live Demo)
Recommended Setup
DB: PlanetScale (MySQL) or Railway MySQL
API: Render (Node) (or Railway)
Client: Vercel
1) MySQL in Production
PlanetScale: create DB, get connection string, set Prisma DATABASE_URL.
If you use PlanetScale, consider referentialIntegrity = "prisma" in your Prisma schema if you avoid FKs.
Railway: provision MySQL plugin and use the provided URL.
2) Deploy API (Render)
New Web Service → repo → root /server.
Build Command:
npm install && npx prisma migrate deploy && npm run build
Start Command:
npm start
Env Vars:
DATABASE_URL=<mysql connection string>
JWT_SECRET=<long_random_string>
NODE_ENV=production
CORS_ORIGIN=https://your-frontend.vercel.app
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
Copy your Render API URL (e.g., https://your-api.onrender.com).
3) Deploy Client (Vercel)
Import repo → set Root Directory to /client.
Env Var:
VITE_API_URL=https://your-api.onrender.com
If using cookie auth: in client code add axios.defaults.withCredentials = true;.
Troubleshooting
Login works locally but not in prod (cookie mode):
Ensure HTTPS on both domains.
Set cookie SameSite=None; Secure.
CORS origin must exactly match your Vercel URL.
withCredentials: true on client.
Navbar shows before auth finishes:
Render Navbar only when !loading && isAuthenticated.
“Login refreshes page / must log in again”:
Make sure the login form calls e.preventDefault().
Use SPA navigation (navigate('/app') or <Link to>), not <a href> or window.location.
Rehydrate auth state on app mount by calling /me before rendering protected routes.
Key Decisions & Rationale
React + Vite + shadcn/ui: Rapid development, strong DX, accessible components and consistent styling with Tailwind.
Express + Prisma: Familiar, minimal, and type-safe data access. Prisma makes MySQL schema & migrations straightforward.
MySQL via Docker (local): Reproducible local environment with no host pollution; easy to reset via volumes.
JWT Auth: Works across API hosts. Cookie mode for better security in production; Bearer for simpler local dev.
React Context: Lightweight global auth/role state without bringing in heavier state libraries.
License
MIT
