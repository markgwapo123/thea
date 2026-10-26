# THE HAVEN: Role-Based Access Control (RBAC)

This project enforces access through **two levels**:

1. Frontend shows only the appropriate navigation and blocks unauthorized page routes.
2. Express API checks the authenticated account and assigned-club permissions; hidden UI controls alone are **not** security.

## Permissions matrix

| Feature | Public visitor | Student (user) | Officer | Adviser | Administrator |
|---|---|---|---|---|---|
| Landing page, available clubs and public announcements | View | View | View | View | View |
| Personal dashboard, own applications and memberships | — | Own | Own | Own | Own |
| Apply to join and cancel own pending/waitlisted applications | — | Own | Own | Own | Own |
| Personal notifications | — | Own | Own | Own | Own |
| View club applications and members | — | — | Assigned clubs | Assigned clubs | All clubs |
| Review / approve / reject applications | — | — | — | Assigned clubs | All clubs |
| Publish club announcements | — | — | Assigned clubs | Assigned clubs | All clubs |
| Publish school-wide announcements | — | — | — | — | All |
| Create/edit/archive clubs | — | — | — | — | All |
| Manage users, disable/reactivate accounts, assign officer/adviser | — | — | — | — | All |
| Access school-wide reports and statistics | — | — | Assigned clubs | Assigned clubs | All |
| View all memberships (paginated) | — | — | — | — | All |
| Edit public landing content and academic year | — | — | — | — | All |

> Officers and advisers are regular student accounts with an assignment in `ClubStaff`; a user without an assignment is not allowed into club management.

## API guard behavior

- `GET /api/applications?mine=1` gives the logged-in user's own applications.
- `GET /api/applications` requires an administrator or assigned club staff. For staff, results are limited to their assigned clubs.
- `GET /api/memberships` gives the user's own memberships.
- `GET /api/memberships?clubId=<id>` requires an administrator or an assignment to that club.
- `GET /api/memberships?all=1&page=1` requires an administrator; pages contain up to 100 members.
- `GET /api/admin/clubs` includes archived clubs, **admin-only**. `GET /api/clubs` remains the public non-archived directory.
- `GET /api/stats` and `GET /api/staff` require an administrator or assigned staff, with scoped results for staff.
- Club management, user management, staff assignments, and changing settings are **admin-only**.
- Application review requires the assigned adviser or an administrator; officers cannot approve applications.
- Attempts to access forbidden API routes return HTTP **403**.

## Security notes

- Public registration creates `student` accounts only. An ordinary registration payload cannot choose `admin`.
- Production accounts are validated using signed login cookies and the user's role stored in MongoDB; ordinary users cannot grant themselves admin access.
- The local `DEMO_MODE` role selector is a **visual preview only** and must never be used as production authorization.
- The changes in this repository do **not** deploy to Render/Vercel or provision administrator accounts. The MongoDB-backed behavior requires a configured production backend, authentic admin account and real database connection.
- Browser navigation controls are for usability; Express API guards remain the authoritative security boundary.
