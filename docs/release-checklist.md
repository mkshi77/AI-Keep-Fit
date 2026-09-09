# Release Checklist

## Phase Gates
- [x] Phase 2A - History Foundation
- [x] Phase 2B - Records / Analytics
- [x] Phase 2C - Body Weight
- [ ] Phase 3 - AI Coach
- [ ] Phase 4 - Replacement + Risk Engine
- [ ] Phase 5 - AI Maintenance + Future Plan
- [ ] Phase 6 - Release Hardening

## Engineering Gates
- [x] npm run lint PASS
- [x] npm test PASS
- [x] npm run build PASS
- [x] Staging E2E PASS
- [x] No Secret leak
- [ ] No Production mock business dependency
- [x] No destructive Notion migration
- [x] exerciseId immutable
- [x] History snapshots preserved
- [x] Preview / Production data isolation

## Final Release
- [ ] Full integration diff reviewed
- [ ] Production app login password removed before launch
- [ ] Production Notion schema confirmed
- [ ] Production environment mapping confirmed
- [ ] Production read-only smoke test PASS
- [ ] Rollback plan documented
