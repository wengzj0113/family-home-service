# Deployment Guide (GitHub Pages + Render)

## 1) Deploy frontend and admin to GitHub Pages

This repository includes workflow: `.github/workflows/deploy-pages.yml`.

### Required GitHub settings

1. Open repository `Settings -> Pages`
2. Under **Build and deployment**, choose **GitHub Actions**
3. Open repository `Settings -> Secrets and variables -> Actions -> Variables`
4. Add:
   - `VITE_API_BASE_URL` = your backend URL, e.g. `https://your-backend.onrender.com`
   - Optional: `VITE_ADMIN_API_BASE_URL` (if admin uses a different API URL)

### Trigger deployment

- Push to `main` or `master`
- Or run workflow manually from `Actions`

### Result paths

- User app: `https://<your-user>.github.io/<repo>/`
- Admin app: `https://<your-user>.github.io/<repo>/admin/`

---

## 2) Deploy backend to Render

This repository includes `render.yaml` at repo root.

### Option A: Blueprint deploy (recommended)

1. Create a new Render Blueprint from your GitHub repository
2. Render reads `render.yaml` automatically
3. Fill all required environment variables (marked `sync: false`)
4. Deploy

### Option B: Manual web service

Use values from `render.yaml`:

- Root Directory: `backend`
- Build command: `npm ci --legacy-peer-deps && npm run build`
- Start command: `npm run start:prod`
- Health check path: `/`

### Required backend env

Use `backend/.env.production.example` as template.

Important:

- Set `NODE_ENV=production`
- Set `DB_SYNCHRONIZE=false`
- Set strong `JWT_SECRET`
- Set `CORS_ORIGIN` to your GitHub Pages origins

---

## 3) Final verification checklist

1. Open user app page and check login/register
2. Open admin page and check dashboard API requests
3. Verify backend logs show successful startup
4. Verify browser CORS errors are gone
5. If payments enabled, update notify URLs to Render domain
