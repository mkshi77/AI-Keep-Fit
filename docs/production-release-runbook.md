# Production Release Runbook

## Preconditions

- `integration/full-version` contains every completed phase and all required checks pass.
- Production Notion data-source IDs are mapped independently from Preview/Staging.
- `Keep Fit App` has read, insert, and update access only to the required Production data sources.
- `GEMINI_API_KEY` is available to Production.
- `APP_ACCESS_PASSWORD` is absent from Production. Preview remains password protected.

## Required Production Variables

- `NOTION_TOKEN`
- `NOTION_TRAINING_DATA_SOURCE_ID`
- `NOTION_EXERCISE_DATA_SOURCE_ID`
- `NOTION_BODY_WEIGHT_DATA_SOURCE_ID`
- `NOTION_BODY_FEEDBACK_DATA_SOURCE_ID`
- `GEMINI_API_KEY`
- `APP_TIME_ZONE=Asia/Shanghai`

Do not configure `APP_ACCESS_PASSWORD` for Production. The application intentionally opens only when `VERCEL_ENV=production` and the password is absent; Preview and local environments fail closed.

## Release Sequence

1. Confirm Production Notion schemas and connection access.
2. Apply the Production environment mappings without copying Preview/Staging IDs.
3. Merge the reviewed release branch into `integration/full-version`.
4. Merge `integration/full-version` into `main` after all checks pass.
5. Remove the Production `APP_ACCESS_PASSWORD` variable and redeploy the exact `main` commit.
6. Verify the deployment is Ready and is serving the expected Git SHA.
7. Run read-only Production smoke tests and a browser walkthrough.

## Read-only Smoke Tests

- `GET /api/auth/session` returns `200` and `{ "authenticated": true }` without a Cookie.
- `GET /api/workout/today` returns normalized workout domain data.
- `GET /api/records/history?period=7d` and `period=all` return bounded normalized history.
- `GET /api/records/overview?period=week` returns derived weekly metrics.
- `GET /api/records/body-weight` and `GET /api/records/body-feedback` return normalized records.
- `GET /api/workout/safety` and `GET /api/workout/maintenance` return bounded normalized responses.
- A cross-origin mutation request is rejected with `403`; do not create Production smoke records.
- The browser loads the original AI-Keep-Fit UI without a login gate and key views render without console-blocking failures.

## Rollback

If a release check fails, immediately promote the last known-good Vercel Production deployment or use the Vercel rollback command for the project. Restore the previous Production environment-variable revision if the failure is configuration-related, then re-run the read-only smoke tests. No database migration is part of this release, so rollback does not rewrite or delete Notion history.

AI suggestions are advisory and do not mutate the future plan. Existing workout and history writes remain guarded by same-origin checks, validation, current-day constraints, and idempotency.
