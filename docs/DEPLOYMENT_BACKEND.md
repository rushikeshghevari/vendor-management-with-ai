# Backend Deployment — How It Actually Works

## The two repos (important — don't confuse them)

- **`vendor_management_system3.0`** (GitHub) — the monorepo checked out at `d:\Vendor Management\`.
  Contains both `Vendor_management_backend/` and `Vendor_management_frontend/` as plain folders
  (no independent git identity). Pushing here is just a source-control backup — **the live
  server never reads from this repo.**
- **`Vendor_management_backend_deploy`** (GitHub) — the repo the live server actually pulls from.
  Not a separate clone you need to create: the `Vendor_management_backend/` folder itself already
  has its own **nested `.git`**, with `origin` pointing straight at this repo. Run all deploy git
  commands from inside `Vendor_management_backend/`, not from the parent monorepo root.

Confirm this at any time:
```
cd "d:\Vendor Management\Vendor_management_backend"
git remote -v
# origin  https://github.com/rushikeshghevari/Vendor_management_backend_deploy.git
```

## Deploy steps

**1. Commit + push from the backend folder (local machine, not the server):**
```
cd "d:\Vendor Management\Vendor_management_backend"
git add <changed files>       # avoid `git add -A` — line-ending noise (CRLF/LF) can make
                               # unrelated files show as "modified"; check `git diff --stat`
                               # first to see which files have *real* content changes.
git commit -m "..."
git push origin main
```

**2. On the server (SSH), pull and rebuild — a plain restart does NOT pick up new code:**
```
ssh root@srv1728200
cd /var/www/vendor_management_system
git pull
npm run build          # REQUIRED — production runs compiled dist/, not src/.
                        # `git pull` alone updates src/; without this the old dist/ keeps running.
pm2 restart vendor-backend
```

The server runs several unrelated apps under PM2 (`ekam uat backend`, `pos_uat_backend`,
`vendor-backend`, `vms_backend`, `wms_uat_backend`) — this project is **`vendor-backend`**
(PID name), serving `https://vendorbackenduat.genericartmedicine.com`. Double-check with
`pm2 list` before restarting if unsure.

**3. New environment variables** go in the server's `.env` at
`/var/www/vendor_management_system/.env` (edit with `nano .env`, save, then `pm2 restart`).
A plain `pm2 restart` is enough to pick up `.env` changes here — the app loads it itself via
`import 'dotenv/config'` at process boot, so it re-reads the file fresh every restart
regardless of PM2's own `--update-env` flag (that flag only matters for env vars PM2 injected
itself via an ecosystem file, which this project doesn't use).

## Verify after deploy

Hit a known route with curl to confirm the new code is actually live before telling the user
it's done:
```
curl -s "https://vendorbackenduat.genericartmedicine.com/api/v1/<route>" -H "..."
```
"Route not found" after a `git pull` almost always means step 2's `npm run build` was skipped.

## External API (`/external/*`)

Read-only routes for other, separate projects that don't log in as a user — authenticated via
a shared `X-API-Key` header (see `apiKeyAuth` middleware), not the JWT `authenticate` middleware
used everywhere else. Configured via `EXTERNAL_API_KEY` in `.env`; if unset, every request is
rejected (fails closed, never falls back to an insecure default).

- `GET /api/v1/external/bills` — all Bills (any status), optional `?status=`, `?dueWithinDays=`,
  `?page=`, `?limit=`. Built for a separate Payment-department project to sync bills nearing
  their `creditPeriod` due date into a calendar (credit-period-due reminders).
