# THE HAVEN — Phase 2: Real Admin + Backend Integration

**Status:** The source code and manually triggered GitHub Actions have been uploaded. The two new workflows have **not** been executed yet.

## What is in GitHub
- `backend/src/bootstrap-admin.js`: creates the **first** real admin account in `the_haven_db`, with bcrypt-hashed password. It refuses to promote existing users or create another admin if one already exists. It does not insert dummy clubs or students.
- `.github/workflows/admin-bootstrap.yml`: manual first-admin provisioning.
- `backend/src/smoke-api.js`: starts the Express API temporarily in a private GitHub Actions runner, verifies MongoDB health, public endpoints, real admin login, admin-only APIs, and unauthenticated access denial. No data modification.
- `.github/workflows/backend-smoke.yml`: manual backend integration test. No Vercel or Render deployment.

## Security prerequisite
A MongoDB password was shared in chat earlier. **Rotate that exposed password** in MongoDB Atlas before running a workflow with it. Do not put the credentials in GitHub files, chat, issues, or screenshots.

## Step 1 — Add secure GitHub Secrets (phone or computer)
Open: https://github.com/markgwapo123/thea/settings/secrets/actions

Repository Secrets (not Variables):
- `MONGODB_URI`: fresh, private Atlas URI (existing secret can stay if already rotated)
- `ADMIN_EMAIL`: an email address you actually control for the first admin
- `ADMIN_PASSWORD`: a unique strong admin password, 12–128 characters; do not reuse the Atlas password
- `JWT_SECRET`: a separately generated random secret, **at least 32 characters** (prefer 64+ random characters). This signs backend sessions. Do not reuse any other password.

Avoid committing any `.env` file. The new workflows pass these secrets to the process without printing them.

## Step 2 — Create the actual first administrator
Open: https://github.com/markgwapo123/thea/actions/workflows/admin-bootstrap.yml

Tap **Run workflow** on **main**. The workflow creates the admin ONLY if no administrator already exists in `the_haven_db`. Existing records are preserved and no sample clubs are inserted. An account with the same email or an existing admin causes the job to exit without changing that account.

## Step 3 — Test the backend and admin authentication (without deploying)
Open: https://github.com/markgwapo123/thea/actions/workflows/backend-smoke.yml

Tap **Run workflow** on **main**. A green **test-backend** run confirms that a temporary GitHub runner could start the Express server, query MongoDB, authenticate the real admin, and access admin-only APIs. The runner stops at the end. No live website or persistent server is created.

## Current frontend status
`the-haven-webapp/frontend/config.js` still sets `DEMO_MODE: true`. **Do not change it to false yet:** the browser requires a running backend URL before real students can register. A GitHub Actions test is ephemeral and not a hosting service. We will use your chosen Render or other backend host only after you explicitly approve deployment.

## Production safety gate
Before real school student registration: verify student identity and email ownership, gain school approval for student data processing and privacy information, rotate all previously exposed credentials, configure least-privilege Atlas users/network access, use HTTPS/correct cookie policies, and test authorization and rate limits.
