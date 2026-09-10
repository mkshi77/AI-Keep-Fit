# AI-Keep-Fit Full Version Progress

## Current Phase
Phase 6 - Release Hardening

Phase 2A resumed after Codex transport/parser interruption.
Recovered from existing working tree; no reset performed.

## Current Branch
codex/phase-6-release-hardening

## Completed Phases
- Phase 1A - PASS
- Phase 1B - PASS
- Phase 1C - PASS
- Phase 2A - PASS + merged (PR #4, merge `02f249bde8cf794ca74d0aecade234e8866929d9`)
- Phase 2B - PASS + merged (PR #5, merge `adb5886b87b23d2659eb0a6539253d9b47188fa6`)
- Phase 2C - PASS + merged (PR #6, merge `b36f6886aabd39642d805bd39880e075548402b9`)
- Phase 3 - PASS + merged (PR #7, merge `3f11befe37707fd68ec69b8887b8a6e88b1fae54`)
- Phase 4 - PASS + merged (PR #8, merge `88cbc4234f5635ea3e89f335288033315103deab`)
- Phase 5 - PASS + merged (PR #9, merge `f4df0fca1fd1bed2f53aac3c21fe6b8ba6ce5366`)

## Current Tasks
- [x] Preserve password protection for Preview/local while making Production intentionally passwordless
- [x] Protect remaining read endpoints in Preview/local
- [x] Add bounded per-client rate limits to live AI endpoints
- [x] Expose all workout routes through the local Express adapter
- [x] Resolve the Express dependency audit without application refactoring
- [x] Add authentication and rate-limit tests
- [x] Run lint/test/build and production dependency audit
- [ ] Confirm every Production Notion data source and environment mapping
- [x] Deploy and execute authenticated Preview E2E
- [ ] Review and merge Phase 6 into `integration/full-version`
- [ ] Review and merge the full integration branch into `main`
- [ ] Remove the Production app password, deploy, and execute read-only Production smoke tests

## Architecture Decisions
- Notion remains the formal business source of truth.
- History is aggregated on the server, not in React components.
- Completed sets only contribute to volume.
- Session duration is deduplicated by date to avoid double counting multi-exercise rows.
- `exerciseId` remains the immutable relationship key.
- AI workout review inputs are derived from completed sets only and future-plan output is a bounded, advisory proposal.
- Legacy history without snapshot fields is read compatibly and not rewritten.
- Body Feedback will use a dedicated Notion Data Source when available; until then the API returns an explicit empty state rather than mock data.

## Notion Migrations
- No destructive migrations.
- Phase 2A is read-only for existing Training Execution data.
- Additive `Body Feedback - Staging` Data Source created for Phase 3 and shared with the `Keep Fit App` Notion integration.
- Additive `Body Weight - Staging` Data Source created with the Phase 2C schema and shared with the `Keep Fit App` Notion integration.

## Staging Data Sources
- Exercise Library - Staging
- Training Execution - Staging
- Body Weight - Staging (`46add619-39fe-464b-8793-a57b9b5ece96`)
- Body Feedback - Staging (`0ff69ca3-b139-4e67-a39a-d6d004ee0d1c`)

## Production Data Sources
- Exercise Library
- Training Execution (`416617d0-fe26-4720-9a9c-fdb6a43eeff4`)
- Body Weight (`7dab9b26-60ee-41b4-a734-dd8afe16606f`)
- Body Feedback - to be created additively before Production launch

## Tests
- `npm run lint` - PASS
- `npm test` - PASS (71 tests)
- Phase 5 `npm test` - PASS (75 tests)
- Phase 6 `npm test` - PASS (79 tests)
- `npm run build` - PASS locally and in Vercel Preview

## E2E Status
PASS on Vercel Preview `dpl_47jwCAZ4nwF6zL1vEXXUkBV9PftC`.
- History periods `7d`, `30d`, `90d`, `180d`, and `all` returned normalized domain responses.
- Weekly overview returned aggregated completed/planned sets, volume, completion rate, and duration.
- Body Feedback returned the designed explicit empty state because the dedicated Staging data source is not configured.
- No Raw Notion page/property payload was exposed.

Phase 2B PASS on Vercel Preview `dpl_6b7WcWwuo7PdMeQQxKCTizH3YsPz`.
- Remote build completed successfully.
- History, all-history, weekly overview, and body-feedback requests passed against Staging.
- Records analytics are derived from normalized domain responses; training summary, PR, trend, and heatmap mock datasets were removed.
- Automated visual walkthrough stopped at the existing app authentication gate; no credential or Deployment Protection bypass was attempted.

Phase 2C implementation checkpoint on Vercel Preview `dpl_2JydL33BA2QaEFhGWmzGBdNSwhkN`.
- Remote build completed successfully.
- The Body Weight endpoint rejected an unauthenticated request with the expected authentication boundary.
- Local-only and hardcoded weight history were removed; the Records view now reads and writes normalized Body Weight domain records.
- Same-day saves update the existing measurement, and history reads are bounded to 1,000 records.
- Authenticated Staging read/write verification remains blocked until the dedicated data source is provisioned and mapped.

Phase 2C isolated data-source checkpoint on Vercel Preview `dpl_D4AnpWAbFJxhf8pk3ukUFNXQwJUV`.
- `Body Weight - Staging` was created additively; the existing Production `体重与饮食数据库` was not modified.
- Preview mappings for `NOTION_BODY_WEIGHT_DATA_SOURCE_ID` and the branch-scoped Staging access password were applied.
- Remote build and application authentication passed.
- The authenticated Body Weight read passed after the data source was shared with `Keep Fit App`.
- `Read content`, `Update content`, and `Insert content` are enabled for `Keep Fit App`.
- Authenticated create, same-day update, and final persisted read all passed. The same page ID was preserved and the final query returned exactly one record for the date.

Phase 3 foundation checkpoint on Vercel Preview `dpl_BqpCTsD4c3WUg5bdm5R4tcWcQjuN`.
- Remote build completed successfully and emitted isolated Coach and Body Feedback serverless routes.
- The Coach route rejects unauthenticated requests and no longer returns local fallback advice.
- The branch-scoped `NOTION_BODY_FEEDBACK_DATA_SOURCE_ID` mapping is active.
- Staging read reached the mapped data source and confirmed that `Keep Fit App` still needs explicit sharing access.
- Live Coach generation remains gated on a sensitive `GEMINI_API_KEY` Preview variable.

Phase 3 authenticated E2E PASS on Vercel Preview `dpl_7vjDFncYgdRMZHD1puf51GxkJxJ2`.
- Remote build and application authentication passed with Preview-only credentials.
- Live Gemini generation returned the validated structured Coach domain response for an explicitly synthetic fixture.
- The confirmed body-feedback proposal was persisted to `Body Feedback - Staging` and read back through the normalized Records API.
- Synthetic verification record `3d61e3e1-85ed-8108-b348-fa410daf2f20` preserved the formal `exerciseId` (`synthetic-test-row`) and score (`4`).
- No Raw Notion page/property payload was exposed to the client.
- All temporary local credential, cookie, request, and response files used by the verification were deleted after the run.

Phase 4 local foundation checkpoint.
- Replacement candidates are bounded to five per exercise and derived only from enabled, non-retired Exercise Library records with the same normalized target muscle.
- Replacement writes require authentication and same-origin POST, and reject non-current dates, duplicate IDs, cross-muscle candidates, or any server-side workout progress.
- The existing Training Execution row and order are preserved; only the formal replacement ID and supported plan snapshot fields are updated.
- Risk signals are bounded to six and derived deterministically from the last 14 days of normalized Body Feedback and workout history.
- Feedback without an `exerciseId` remains visible as a general risk; only exact formal IDs are linked to a current exercise.
- Hardcoded replacement exercises and the fixed right-shoulder warning were removed without changing the established modal/card layout.

Phase 4 authenticated Staging E2E PASS on Vercel Preview `dpl_HA9J9u42NAtZC5JeEqhSjPCSjsWf`.
- Application login and protected Safety GET passed through Vercel Deployment Protection.
- Safety returned normalized risk signals without exposing Raw Notion properties.
- A Preview-only, uncommitted fixture created one synthetic same-muscle Exercise Library candidate and one unstarted Training Execution row in isolated Staging.
- The production Replacement API found the candidate, persisted the replacement, returned the replacement `exerciseId`, restored the original action, and returned the original `exerciseId`.
- The synthetic training row and library candidate were moved to Notion trash using the 2026-03-11 `in_trash` contract.
- The known Phase 3 synthetic Body Feedback verification record was also moved to trash; no synthetic records remain active.
- The fixture endpoint was removed before the final Phase 4 deployment and is not part of Git history.

Phase 5 authenticated Staging E2E PASS on Vercel Preview `dpl_2DWU2DJrMMk2R3irVfz1Cpk8soGq`.
- The current-week response was derived from normalized Staging history and returned seven real calendar dates without fixed targets or mock workout facts.
- Staging reported one planned and one trained session for the current week, plus a grounded 09/08 training insight.
- Live Gemini review accepted an explicitly synthetic, non-persisted training summary and returned a bounded review with two future-plan actions.
- The future plan remained advisory; no Notion record or training plan was written or modified.
- Preview authentication remained branch-scoped, and the temporary local Cookie was deleted after verification.

Phase 6 authenticated Staging E2E PASS on Vercel Preview `dpl_mUYYYHNY4dTs4qoAxsqy8SxaN1rS`.
- The deployment was Ready and matched branch `codex/phase-6-release-hardening`.
- Unauthenticated application access remained rejected behind the Preview login boundary; a valid Preview-only session passed.
- Today, all-history, weekly overview, body-weight, body-feedback, safety, and maintenance GET routes returned normalized domain envelopes.
- No response exposed Raw Notion `properties`, and no Notion record was written or modified.

## Open Risks
- Historical snapshot fields may be absent in legacy records.
- The first live Coach E2E response took approximately 55 seconds; observe warm and production latency before launch.
- Authenticated visual walkthrough requires a user-authorized login session; build, adapter tests, and protected Preview API E2E are green.
- The current Staging Exercise Library has no two permanent enabled actions with the same target-muscle value; populate reviewed alternatives before Production launch so the replacement UI is useful without synthetic fixtures.
- AI future-plan suggestions are intentionally not persisted; the user retains control of the formal Notion plan.

## Release Blockers
- Production Exercise Library and Body Feedback data-source IDs must be mapped before launch.
- `GEMINI_API_KEY` must be enabled for Production without exposing or rotating the existing secret.
- Phase 6 must remove the application login password before the final Production launch, per product-owner direction; Preview authentication remains enabled for staging verification only.

## Next Checkpoint
Finish Production mappings, verify the hardened Preview, merge the full release, remove the Production password, and complete the Production smoke test.
