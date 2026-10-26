# THE HAVEN — Final Access & Registration Flow

## Account approval policy

**New registrations are not immediately active.** The server always creates public signup accounts with `role: student` and `status: pending`.

- **Pending:** Can log in only to see “Waiting for Admin Approval” and check status. Cannot open community dashboard or protected data.
- **Rejected:** Can log in only to see “Registration Rejected” and any administrator note. Cannot open community dashboard.
- **Active/approved:** Can access the limited member experience (below).
- **Disabled:** Cannot log in. An admin may reactivate a previously active account.

Admin approves or rejects accounts through **Registration Requests**. Rejected accounts may be reconsidered by an admin later. Public signup cannot create administrator accounts. The initial admin is provisioned separately, and any additional administrators are created through an existing admin session.

**Existing accounts already marked `active` retain that status.** This rollout does not silently downgrade existing approved users. Administrators should review any legacy active users before real use.

## Approved student dashboard

Students, officers and advisers share a limited, read-only member view:

| Feature | Approved member | Administrator |
|---|---|---|
| Dashboard announcements | View | View and publish |
| Club officer & adviser directory | View names and roles | View, assign and remove roles |
| Personal account settings | Change own name, department, year level and password | Same for own account |
| Approve/reject new user registrations | No | Yes |
| Create other admin accounts | No | Yes |
| Edit website name/logo | No | Yes |
| Edit public landing page | No | Yes |
| Manage clubs, accounts and reports | No | Yes |
| Legacy club application/membership management | No | Yes |

The public club directory and landing page remain viewable before login, but those sections are not student dashboard modules. The earlier student club-application features are no longer available to approved regular users; existing legacy club records and admin controls are preserved.

## Admin operations

- **Admin → Registration Requests:** Approve or reject pending students and reconsider rejected accounts.
- **Admin → Announcements:** Create school-wide or club announcements for approved users.
- **Admin → Manage Officers:** Assign an approved student to a club as officer or adviser; remove an assignment.
- **Admin → User Management → Add Administrator:** Create a new active admin with a 12–128 character password. This protected endpoint is unavailable through public registration.
- **Admin → System Settings → Edit Name & Logo:** Customize the visible brand name and upload PNG/JPEG/WebP logo up to 350 KB, or restore the official original logo. Values are stored in the existing `Setting` collection and apply to splash, header, dashboard, favicon and relevant website labels.
- **Admin → System Settings → Edit Landing Page:** Edit public section text.

## New and updated endpoints

- `POST /api/auth/register` → create pending member.
- `POST /api/auth/login` → pending/rejected login permitted for status-only viewing; disabled login denied.
- `GET /api/me` → logged-in status information; pending/rejected allowed.
- `PATCH /api/users/:id/registration` → **admin only**; approve/reject registration.
- `POST /api/admin/accounts` → **admin only**; add another admin.
- `GET /api/leadership` → **approved member/admin only**; public-facing officer and adviser names.
- `POST /api/staff`, `DELETE /api/staff/:id` → **admin only**; manage leadership.
- `GET /api/announcements` → approved member/admin only.
- `POST /api/announcements` → **admin only**.
- `PUT /api/me/profile`, `PUT /api/me/password` → approved user editing own information only.
- `GET /api/settings` → public branding and public landing copy.
- `PUT /api/settings/branding` → **admin only**; update brand.
- Existing management endpoints for users, reports, club applications and memberships remain admin-only.

The server checks account status from MongoDB on each protected request, in addition to signed authentication cookies. Route restrictions are enforced on the frontend as well, but backend guards remain authoritative. Uploaded branding is checked for supported image signatures and capped at 350 KB to avoid arbitrary external image URLs.

## Deployment and validation

This change updates GitHub source code **only**. It does not deploy a live app, run MongoDB data migrations, or verify existing MongoDB credentials. The standalone `frontend/config.js` still has `DEMO_MODE: true` for preview until production deployment is authorized.

To use real accounts: deploy the existing Express backend with MongoDB Atlas, ensure an active initial administrator, serve the frontend in real API mode, run backend syntax checks and the manual read-only smoke test, and test new pending signup → rejected or approved status → dashboard access.

Review existing active users first: `status: active` means already allowed, while new public signup accounts automatically become `pending`. No `.env` secrets or real student records should be committed.
