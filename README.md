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
- JWT Authentication (Bearer / httpOnly Cookie)

**Database**
- MySQL (Docker for local, PlanetScale/Railway for production)

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
DB: mysql://appuser:apppass@127.0.0.1:3306/taskmaker
Adminer UI: http://localhost:8080
3️⃣ Environment Variables
📌 /server/.env
DATABASE_URL="mysql://appuser:apppass@127.0.0.1:3306/taskmaker"

JWT_SECRET="replace_with_strong_secret"
JWT_EXPIRES_IN="7d"

CORS_ORIGIN="http://localhost:5173"
PORT=4000
NODE_ENV=development

COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
📌 /client/.env
VITE_API_URL="http://localhost:4000"
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
npx prisma migrate dev     # run migrations
npx prisma studio          # open DB explorer
npx prisma migrate deploy  # deploy migrations (prod)
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
POST /auth/logout
GET /me
Tasks
GET /tasks
POST /tasks (Admin)
PATCH /tasks/:id (Admin)
DELETE /tasks/:id (Admin)
Q&A
GET /tasks/:id/qa
POST /tasks/:id/qa (User ask / Admin answer)
🔐 Authentication Options
Option A: Bearer Token (localStorage)
Store accessToken in localStorage
Set axios Authorization: Bearer <token>
⚠️ Simpler but less secure (XSS risk).
Option B: httpOnly Cookie (Recommended)
API sets Set-Cookie with httpOnly
Client uses axios.defaults.withCredentials = true
Express CORS:
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
🌐 Deployment (Live Demo)
Recommended Setup
Database → PlanetScale / Railway (MySQL)
API → Render (Node.js)
Client → Vercel
Steps
Provision MySQL DB → copy connection string → DATABASE_URL.
Deploy API on Render:
Root: /server
Build:
npm install && npx prisma migrate deploy && npm run build
Start:
npm start
Env vars: DATABASE_URL, JWT_SECRET, CORS_ORIGIN, COOKIE_SECURE=true, COOKIE_SAME_SITE=none
Deploy client on Vercel:
Root: /client
Env var:
VITE_API_URL=<Render API URL>
🐞 Troubleshooting
Login loops / refreshes page → Add e.preventDefault() in login form and use navigate('/app').
Navbar shows before login → Render only when !loading && isAuthenticated.
401 in production (cookies) → Use SameSite=None; Secure, HTTPS, and withCredentials: true.
📌 Key Decisions & Rationale
React + Vite + shadcn/ui → Fast DX, consistent UI, accessible components.
Express + Prisma → Lightweight backend with type safety.
MySQL (Docker) → Reproducible dev setup, easy to reset.
JWT Auth → Flexible, secure, works across hosts.
React Context → Simple global state for auth & roles.
📄 License
MIT

---
