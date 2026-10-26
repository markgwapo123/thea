# THE HAVEN — MongoDB Atlas setup

**GitHub:** https://github.com/markgwapo123/thea

**Status:** The connection-test code is committed, but the **live MongoDB connection has not yet been verified**. The frontend currently has DEMO_MODE enabled.

## Security first
A database connection string containing a password was previously shared in chat. Rotate that password in Atlas, update any applications that depended on it, and **never upload a real .env to GitHub or share a full connection URI**.

Prefer a dedicated Atlas database user `haven_app` with **readWrite on the_haven_db only**, rather than broad admin permissions. In Atlas Network Access, allow the IP address of the machine/server running your backend.

## Initialize the actual the_haven_db in GitHub (phone-friendly)

The GitHub backend already targets **the_haven_db** via `MONGODB_DB_NAME`. A screenshot confirms this database exists in Cluster0 and currently has an empty `users` collection.

1. Confirm that the repository's private `MONGODB_URI` GitHub Actions secret uses **rotated** credentials with access to the_haven_db. No credentials should be committed to GitHub.
2. Open https://github.com/markgwapo123/thea/actions/workflows/mongodb-initialize.yml .
3. Click **Run workflow** on the `main` branch.
4. A green `initialize-the-haven-db` job means that nine collections and schema indexes were checked/created. Existing documents are retained; the command **does not insert sample clubs, student accounts, or an administrator**.

Collections: `users`, `clubs`, `clubstaffs`, `applications`, `memberships`, `announcements`, `notifications`, `auditlogs`, and `settings`. Names derive from the currently committed Mongoose models.

**This step is database setup only.** The web frontend remains in DEMO_MODE until a real Express backend runs privately using MONGODB_URI and JWT_SECRET; no Vercel deployment is part of this workflow.

## No laptop? Test from GitHub Actions (without Vercel/Render deployment)

1. **Rotate the old shared Atlas password first.** Use a dedicated least-privilege database account for THE HAVEN.
2. On a phone, open [THE HAVEN Actions Secrets](https://github.com/markgwapo123/thea/settings/secrets/actions).
3. Choose **New repository secret**; set **Name** to `MONGODB_URI`. Paste the newly rotated MongoDB Atlas URI as its **Value** (not into a GitHub file, issue, or chat), then save.
4. Open [THE HAVEN MongoDB Connection Check](https://github.com/markgwapo123/thea/actions/workflows/mongodb-connection-check.yml).
5. Tap **Run workflow** on `main`. This connects to `the_haven_db` and runs a read-only ping. It does *not* insert seed data, deploy a server, or turn demo mode off.

**Network access:** GitHub Actions uses cloud-hosted runners whose outbound IP changes. MongoDB Atlas Network Access must allow that runner for the connection test. Don't blindly add `0.0.0.0/0`; prefer a fixed-IP trusted runtime or approved network access policy for production. A connectivity failure does not mean your data was changed.

**After a successful ping:** The database credentials have been verified in GitHub Actions, but the web app will not use live data until the Express backend is run on a server with its own private `MONGODB_URI`, `JWT_SECRET`, and appropriate Atlas network access; then `frontend/config.js` can switch `DEMO_MODE` off. No deployment has been requested yet.

## Configure locally (Windows PowerShell)
From the repository root:

```powershell
cd the-haven-webapp/backend
Copy-Item .env.example .env
```

Edit `backend/.env` privately:
- `MONGODB_URI`: new credentials and a URI path of `/the_haven_db`
- `JWT_SECRET`: new random secret of at least 32 characters
- `ADMIN_EMAIL` and `ADMIN_PASSWORD`: only needed if you want to seed the first admin, strong password of 12+ characters
- `FRONTEND_ORIGINS`: localhost origin(s) for local development

If the new MongoDB password includes reserved characters, percent-encode them in the URI. The committed `.env.example` is a **placeholder only**, never a connection string.

## Test database connection (without deploying)
```powershell
npm install
npm run check
npm run db:check
```

Success: `MongoDB Atlas connected successfully to database: the_haven_db` and `Ping OK`.

## Initialize database and start the backend
```powershell
npm run seed
npm run dev
```

The seed script creates sample clubs and academic year; admin is created only when admin environment variables are provided. These sample club names are *not* official confirmed Fellowship Baptist College clubs.

Visit http://localhost:4000/api/health (when the backend is running) and verify `status: ok`.

## Frontend live-mode testing (local only)
After backend testing, edit `the-haven-webapp/frontend/config.js` to change `DEMO_MODE` to `false`, keeping `API_BASE_URL` as `http://localhost:4000/api`. Do not use demo mode for real registrations. Do not deploy until school account verification, privacy, and security requirements are complete.

**Vercel is intentionally not deployed yet.**
