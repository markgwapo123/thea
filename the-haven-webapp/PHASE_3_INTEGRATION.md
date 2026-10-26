# THE HAVEN — Phase 3: Frontend + Backend Integration (not deployed)

**GitHub:** https://github.com/markgwapo123/thea

**Status:** Phase 3 code and configuration are ready in `main`. No Render service or Vercel project has been created or deployed by this phase.

## What this phase adds
- An **opt-in** [Render Blueprint](../../render.yaml) for a free Node.js web service using `the-haven-webapp` as the shared frontend/backend directory.
- **One HTTPS origin** for the UI and API, so authenticated browser requests use first-party cookies instead of cross-site third-party cookies.
- Express serves the original existing frontend only when `SERVE_FRONTEND=true`. On that hosted service it overrides the public `/config.js` response with `DEMO_MODE:false` and `API_BASE_URL:'/api'`; **no MongoDB URI, JWT secret, or admin credentials are exposed to the browser**.
- Production session cookies use `Secure; HttpOnly; SameSite=Lax` by default. Only configure `CROSS_SITE_COOKIES=true` if deploying a separate cross-site frontend later, with proper HTTPS, origin allowlist, and browser compatibility testing.
- Production Content Security Policy permits THE HAVEN's external Google Fonts while restricting scripts to the same origin. The retry button no longer uses inline JS.
- A read-only GitHub Actions integration test for the existing real administrator and actual MongoDB database, plus production-mode HTML/config/logo checks.

## Step 1 — Test Phase 3 without any deployment

1. Ensure the existing GitHub Actions repository secrets have been configured **privately**: `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`. Rotate any previously exposed Atlas password.
2. Open https://github.com/markgwapo123/thea/actions/workflows/phase3-integration.yml .
3. Click **Run workflow** → **main** → **Run workflow**.
4. Green `same-origin-integration` means the temporary process passed the checks below (and then stopped):
   - Express ↔ MongoDB `the_haven_db` health.
   - Existing frontend HTML served from the backend in production hosting mode.
   - Dynamic browser `config.js` sets `DEMO_MODE:false` and same-origin `/api`.
   - THE HAVEN logo asset available.
   - Basic production Content Security Policy.
   - Public club and academic-year APIs.
   - Admin-only API rejects anonymous users.
   - Real admin login, HttpOnly session cookie, `/api/me`, user-management API, statistics API.
5. **The test is non-destructive**: no new accounts, club/application records, or memberships are inserted.

## Future Render hosting — NOT STARTED

`render.yaml` is configuration only. Do **not** click *Create Blueprint* until ready to create an internet-accessible service.

Once approved, use https://dashboard.render.com/blueprints to link `markgwapo123/thea` and import `render.yaml`. This Blueprint:

| Setting | Value |
|---|---|
| Name | `the-haven-fbc` (subject to availability) |
| Runtime/plan | Node.js / Free (subject to Render plan availability) |
| Repo branch | `main` |
| Automatic deploys | Disabled |
| Build | `cd the-haven-webapp/backend && npm install --no-audit --no-fund` |
| Start | `cd the-haven-webapp/backend && npm start` |
| Health check | `/api/health` |
| Frontend | Served by the same Node.js process, no Vercel needed |
| Database | MongoDB Atlas `the_haven_db` |

Private environment values on Render:
- `MONGODB_URI`: enter **only** in Render's private environment field (defined as `sync:false` in the Blueprint). Atlas must authorize the server's outgoing IP/network.
- `JWT_SECRET`: automatically generated **new random value** in Render; it does not need to match the GitHub Actions test JWT secret.
- `MONGODB_DB_NAME=the_haven_db`, `SERVE_FRONTEND=true`, `NODE_ENV=production`, `CROSS_SITE_COOKIES=false`: stored in the Blueprint as non-secret settings.
- `RENDER_EXTERNAL_URL`: supplied automatically by Render and trusted as the service origin. If later using a custom domain, configure `PUBLIC_BASE_URL` and `FRONTEND_ORIGINS` appropriately.

Important: Render's **rootDir is intentionally omitted**, because Render would hide files outside a narrower root. Backend and frontend are sibling folders under `the-haven-webapp`.

## Still needed before public student registrations

- Real school-managed club list (no unapproved example clubs in live data).
- Student ID and email ownership verification (not yet implemented).
- Clear registration periods and school authorization to process student data.
- Input/authorization review, secure backups, account recovery, privacy notices, and a full end-to-end test of a **test student** applying and an adviser approving.
- A deployed service and known public URL, after separate user approval.

Current `frontend/config.js` remains `DEMO_MODE:true` in GitHub for standalone previews. This is intentional; only the optional same-origin hosted backend serves a live configuration.
