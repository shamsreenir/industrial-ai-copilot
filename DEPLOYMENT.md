# Industrial AI Copilot — Production Deployment Guide

This project is architected for zero-friction deployment. You can deploy it either as a **Single Unified Web Service (Easiest)** or as a **Split Vercel + Render Architecture**.

---

## ⚡ Method 1: The Easiest Way — Single Unified Deployment on Render (Recommended)

Because the project includes a unified production `Dockerfile` that packages both the React 19 frontend and the FastAPI backend into one container, deploying to Render gives you **a single URL with zero CORS configuration and zero proxy lag**.

### Step 1: Push your Code to GitHub
In your terminal, run:
```bash
# 1. Add your GitHub repository remote
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPOSITORY_NAME>.git

# 2. Rename branch to main
git branch -M main

# 3. Push all commits
git push -u origin main
```

### Step 2: Deploy on Render
1. Log in to [Render.com](https://render.com).
2. Click **New +** → **Web Service**.
3. Select your GitHub repository.
4. Render will detect `render.yaml` and `Dockerfile` automatically:
   - **Environment:** `Docker`
   - **Dockerfile Path:** `./Dockerfile`
   - **Instance Type:** Standard (or Free)
5. Click **Create Web Service**.

Render will build the React frontend, set up PyTorch CPU and OpenCV, launch the unified FastAPI server, and provide you with a live URL:
`https://industrial-ai-copilot.onrender.com`

---

## 🌐 Method 2: Split Deployment — Vercel (Frontend) + Render (Backend)

If you prefer hosting the frontend on Vercel's global CDN edge and the backend on Render:

### Step 1: Deploy Backend on Render
1. Go to [Render.com](https://render.com) → **New +** → **Web Service**.
2. Select your repository.
3. Configure:
   - **Root Directory:** leave blank (or `./`)
   - **Environment:** `Docker` (Dockerfile builds backend + models cleanly)
   - **Health Check Path:** `/health`
4. Click **Deploy**.
5. Once deployed, copy your Render URL (e.g., `https://industrial-backend.onrender.com`).

### Step 2: Deploy Frontend on Vercel
1. Go to [Vercel.com](https://vercel.com) → **Add New** → **Project**.
2. Import your GitHub repository.
3. Vercel automatically detects `vercel.json`:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `./` (or `frontend`)
4. In **Environment Variables**, add:
   - **Key:** `VITE_API_URL`
   - **Value:** `https://industrial-backend.onrender.com` (your Render URL from Step 1)
5. Click **Deploy**.

> **How it works:** The frontend contains an automatic request interceptor in `frontend/src/main.jsx` and `vercel.json` rewrite rules. Any API call to `/api/...` will automatically route to your Render backend with CORS headers allowed (`allow_origins=["*"]`).

---

## 💻 Method 3: Local Production Deployment

To run the unified production build on your local machine:

### Using PowerShell:
```powershell
.\deploy_production.ps1
```

### Using Command Prompt / Batch:
```cmd
deploy_production.bat
```

### Using Docker:
```bash
docker-compose up --build
```
This builds and serves the entire unified application on `http://localhost:8000`.

---

## 🔍 Verification Endpoints

Once deployed, you can verify your service status using:
- **System Health:** `GET /health`
- **Model Test Metrics:** `GET /api/vision/metrics?model_mode=primary`
- **Interactive Swagger Docs:** `GET /docs`
- **Main Web Interface:** `GET /`
