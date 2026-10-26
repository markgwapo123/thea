# THE HAVEN — MongoDB Atlas setup

**GitHub:** https://github.com/markgwapo123/thea

**Status:** The connection-test code is committed, but the **live MongoDB connection has not yet been verified**. The frontend currently has DEMO_MODE enabled.

## Security first
A database connection string containing a password was previously shared in chat. Rotate that password in Atlas, update any applications that depended on it, and **never upload a real .env to GitHub or share a full connection URI**.

Prefer a dedicated Atlas database user `haven_app` with **readWrite on the_haven_db only**, rather than broad admin permissions. In Atlas Network Access, allow the IP address of the machine/server running your backend.

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
