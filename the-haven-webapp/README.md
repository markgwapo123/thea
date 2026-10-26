# THE HAVEN: PEER FACILITATORS' COMMUNITY

## Vercel production frontend (2026-10-26)

The Render backend is online at `https://the-haven-backend.onrender.com`, and the GitHub standalone frontend is now prepared for **real production API mode** via `frontend/config.js`.

For a new Vercel project, import **`markgwapo123/thea`** using the **Root Directory `the-haven-webapp/frontend`** (not the repo root or backend folder). Choose *Other* as the framework preset and use the existing `frontend/vercel.json` for the no-build static site. Vercel sends `/api/*` to Render using an external rewrite, while browsers use the Vercel domain for login session cookies. No frontend secrets are required.

**Post-deployment required step:** In Render for `the-haven-backend`, set `FRONTEND_ORIGINS` to the exact production Vercel origin, such as `https://YOUR-PROJECT.vercel.app`, **after Vercel shows the real URL**. Keep `CROSS_SITE_COOKIES=false`. This is required because the API rejects unapproved browser origins for POST/PUT/PATCH/DELETE requests. Do **not** blindly allow `*.vercel.app` and do **not** put `MONGODB_URI`, `JWT_SECRET`, `ADMIN_PASSWORD` or `ADMIN_EMAIL` in Vercel static frontend files.

After the origin is set, test Vercel `/api/health` (expect HTTP 200 + `status:ok`), admin sign-in, `/api/me`, a new pending test registration, admin approval, and the limited approved student dashboard.

The frontend is **configured and committed only** until an actual Vercel deployment appears. Do not treat a GitHub commit as proof of Vercel hosting.

---


> **Repository status (2026-10-26):** This project is already uploaded to **https://github.com/markgwapo123/thea** under `the-haven-webapp/`. **Do not deploy to Vercel yet.** MongoDB connection utilities are in `backend/src/check-db.js`, with instructions in `DATABASE_SETUP.md`. **No real database password or connection URI is committed.** The database connection has not been verified; configure your private `backend/.env` before running `npm run db:check`. When deployment is requested, the Vercel root will be `the-haven-webapp/frontend` and the backend directory will be `the-haven-webapp/backend`. The original setup section below was written before this repository was created; use the updated instructions above instead.

## Access update — Administrator approval and member announcements (2026-10-26)

**Current source has a new registration flow.** Public registration creates a **pending** student account. Applicants may sign in to see Pending / Rejected status, but **only administrators can approve registration** and unlock member dashboard access.

After approval, the **regular member** interface is limited to **admin announcements on the dashboard, club officers/advisers, and personal account settings**. Officers and advisers are listed read-only and do not get system management privileges. Administrators retain all management pages and can **publish announcements, approve/reject applicants, assign/remove officers or advisers, create additional administrators, and change the website name or logo**.

Details and endpoint policies: [ROLE_ACCESS.md](ROLE_ACCESS.md).

**Source-code update only.** The code has not been live-deployed; the standalone frontend still uses `DEMO_MODE: true` until the MongoDB-backed API is configured. The default official logo is preserved until an admin uploads a new supported image. Existing active accounts are not automatically changed to pending.

---

### Online Club Registration and Management System · Fellowship Baptist College

A responsive web app using the **original uploaded THE HAVEN logo**. Frontend: plain HTML/CSS/JavaScript. Backend: Node.js/Express. Database: MongoDB Atlas. Designed for Vercel + Render deployment.

## Phase 3: Frontend and Backend Integration

Phase 3 is **prepared in GitHub, not deployed**. THE HAVEN can serve its original frontend and Express API on one Render Node.js service using the repo's `render.yaml`. See [PHASE_3_INTEGRATION.md](PHASE_3_INTEGRATION.md).

Run the **manual, non-deploy** [Phase 3 Integration workflow](https://github.com/markgwapo123/thea/actions/workflows/phase3-integration.yml) to validate the existing real admin login, MongoDB connectivity, same-origin frontend, and protected API endpoints.

The standalone frontend's `DEMO_MODE` stays **true** until a persistent backend host is separately authorized. No Vercel deployment has been performed.

---

## 0. Upload to GitHub and deploy the preview to Vercel (Windows PowerShell)

This repository deliberately contains **both** `frontend/` and `backend/`, but **Vercel deploys only `frontend/`**. It is a static HTML/CSS/JS application, so no npm build is needed for the frontend.

1. On GitHub, create a **new empty repository** named `the-haven` at https://github.com/new (do not initialize with a README, .gitignore, or license).
2. Download and unzip the GitHub/Vercel-ready project. Open PowerShell in the **`the-haven-webapp`** directory (the one containing `frontend/` and `backend/`).
3. Run these commands, one at a time:

```powershell
git init
git add .
git commit -m "Initial THE HAVEN web app"
git branch -M main
git remote add origin https://github.com/markgwapo123/the-haven.git
git push -u origin main
```

If you have not authenticated Git on this computer, GitHub may prompt you to sign in. Do **not** add secret `.env` values to GitHub; the tracked `backend/.env.example` is placeholders only.

4. Go to https://vercel.com/new → **Import** `markgwapo123/the-haven` → set:

| Setting | Value |
|---|---|
| Project Name | `the-haven` (or another available name) |
| **Root Directory** | **`frontend`** |
| Framework Preset | **Other** (also declared in `frontend/vercel.json`) |
| Build Command | **None / blank** (no build needed) |
| Output Directory | **`.`** (frontend root) |

5. Click **Deploy**. Vercel should serve `frontend/index.html`, the logo, styling, demo registration flow, and the two-second splash screen. When GitHub is connected, subsequent pushes to the linked production branch trigger deployments automatically.

**IMPORTANT — live preview only:** `frontend/config.js` starts with `DEMO_MODE: true`. All sample registrations and role switches are stored locally in the browser, **not** shared among users. **Do not use the demo link for real student registrations.** For real use, set up the backend on Render and MongoDB Atlas, confirm account/student-ID verification, set `DEMO_MODE: false`, update `API_BASE_URL` to the actual HTTPS Render API, configure `FRONTEND_ORIGINS`, then commit and push the changes.

---

## What is included

- **Splash screen:** original logo centered with pulse animation. 1.7s visible pulse and 0.3s fade out = approximately 2 seconds total.
- Public landing page, responsive club directory with categories and search, club detail dialogs.
- Student registration/login (real API mode), student dashboard, club applications, cancel pending applications, status, memberships, and notifications.
- Club adviser approval/rejection/waitlist with capacity-aware approval.
- Club officer access for assigned-club announcements and membership viewing.
- Administrator dashboard, club creation/editing, staff assignment, account status management, application reviews, academic-year settings, reporting with CSV export.
- Server-side role checks, password hashing, HTTP-only cookie authentication, API origin allowlist, basic rate limiting, database indexes, and approval transactions.
- **Local demo mode**, useful for previewing without MongoDB. Demo data is stored in browser localStorage and has role-switching controls. It is NOT a production login or real school record system.

> The four sample club names are **illustrative placeholders**. Replace them with officially authorized clubs and policies. Neither the demo nor the seed data represents a real list from Fellowship Baptist College.

## 1. Preview immediately (no database needed)

1. Open `frontend/index.html` in Chrome/Brave, or serve `frontend` using `python -m http.server 5500`.
2. `frontend/config.js` ships with `DEMO_MODE: true`.
3. Wait for the 2-second logo splash, then use **Explore**, **Dashboard**, and the **Student / Adviser / Officer / Admin** controls.
4. Submit an application as Student → switch to Admin → Application Review → approve → switch back to Student to see status and membership.
5. To clear browser demo data, use the **Reset** button in the demo bar.

In demo mode, the login/register dialog is a UI simulation. Real account authentication requires the backend.

## 2. Start the real Express + MongoDB backend

Node.js 20+ and a **MongoDB Atlas cluster** are required.

```bash
cd backend
npm install
cp .env.example .env         # Windows PowerShell: Copy-Item .env.example .env
```

Edit `backend/.env`:

```env
PORT=4000
NODE_ENV=development
MONGODB_URI=<your MongoDB Atlas URI>
JWT_SECRET=<at least 32 random characters, keep secret>
FRONTEND_ORIGINS=http://localhost:4000,http://localhost:5500
ADMIN_EMAIL=<your own admin email>
ADMIN_PASSWORD=<your own strong admin password, 12+ chars>
ADMIN_NAME=Haven Administrator
```

Never commit `.env` to Git. Add your network/IP to MongoDB Atlas Network Access, configure a database user, and grant only the needed permissions.

Seed example clubs and bootstrap the FIRST admin:

```bash
npm run seed
npm run dev
```

For a one-server local preview, open `http://localhost:4000/` (backend serves frontend in development). Before loading the page, edit `frontend/config.js`:

```js
window.HAVEN_CONFIG = {
  DEMO_MODE: false,
  API_BASE_URL: 'http://localhost:4000/api'
};
```

**Important:** `npm run seed` creates an admin only when `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set. It will **not** change the password or privileges of an existing matching user. There are no shipped administrator credentials.

## 3. Suggested Vercel + Render deployment

**Render (API):** Create a Node Web Service, root directory `backend`, build command `npm install`, start command `npm start`. Set `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`, and `FRONTEND_ORIGINS=https://YOUR_FRONTEND.vercel.app` as environment variables. Seed your database/admin from a trusted local terminal before going live; do not publicly expose a seed route.

**Vercel (frontend):** Create a project with root directory `frontend` and no framework preset (static site). Before deployment, edit `frontend/config.js`: set `DEMO_MODE: false` and `API_BASE_URL: 'https://YOUR_BACKEND.onrender.com/api'`.

Cross-site cookie auth requires HTTPS on both deployments, `credentials: include` (already used), a correct allowed frontend origin, and browsers that permit the session cookie. For a school deployment, consider a single site/domain with a `/api` reverse proxy for robust first-party cookies. The API origin list must be updated if you change the web app domain.

## 4. Key source files

```text
the-haven-webapp/
├── README.md
├── .gitignore
├── frontend/
│   ├── index.html            # splash, SPA shell
│   ├── styles.css            # responsive layout + pulse animation
│   ├── app.js                # routes, UI, demo adapter, API integration
│   ├── config.js             # demo and API configuration
│   └── assets/
│       ├── haven-logo.png            # transparent-background display derivative
│       └── haven-logo-original.jpg   # original uploaded image preserved
└── backend/
    ├── .env.example
    ├── package.json
    └── src/
        ├── models.js        # MongoDB schemas/indexes
        ├── server.js        # Express REST endpoints
        └── seed.js          # sample clubs and bootstrap admin
```

## 5. Roles & registration policies

- Student: register/apply, status, memberships, notifications.
- Club Officer: assigned-club announcements, view memberships and application information. **Cannot** approve.
- Club Adviser: officer permissions **plus** approve/reject/waitlist for assigned clubs.
- Admin: all clubs, registrations, account management, staff assignment, reports/settings.
- Default policy: a student can apply to multiple clubs; no duplicate application for the **same club + academic year**. Slots are counted when an adviser/admin approves. When capacity is reached, new applications are waitlisted.
- Approved applications create an active membership and increment a capacity counter within a MongoDB Atlas transaction.
- Current simplified version does not automatically promote waitlisted applicants or end old academic-year memberships. Configure these workflow policies before production school use.

## 6. Security and production-readiness notes

- **DEMO_MODE must be turned off on the actual deployed student portal.** Demo role switching is for development only.
- HTTPS, secure secrets, database backups, database least privilege, and an approved student data privacy notice are required before enrolling real students.
- Email ownership and Student ID verification are **not implemented yet**; the registration page currently accepts self-reported Student ID. Verify identity through an approved school roster, email verification or administrator review before real use.
- The frontend uses a simple page router with accessible dialogs but still needs formal QA and accessibility review.
- Enrollment windows, password reset, uploads/storage integration, fine-grained audit-log viewer, export permissions policies, and automated integration tests are next-step production additions. The official logo is bundled locally; cloud storage is an extension point and is not configured.
- Do not treat this as a production-ready student records platform until school data privacy/security requirements are verified.

## 7. Health endpoint

`GET /api/health` reports API/database connection status, suitable for basic monitoring.

## 8. Verify syntax

```bash
cd backend
npm run check
node --check ../frontend/app.js
```
