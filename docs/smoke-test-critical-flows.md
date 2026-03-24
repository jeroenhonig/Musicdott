# Smoke Test - Critical Flows (Agenda + Import + Blocks)

Use this after backend/import/block changes. Goal: confirm the platform can build lessons/songs with blocks and recurring schedules still work.

## Preconditions

- Log in as `teacher` or `school_owner`
- Open browser devtools (`Network` + `Console`)
- Test with a school that has at least one student

## 1. Agenda (Recurring Schedules)

1. Go to `/schedule`
2. Create a recurring schedule (weekly)
3. Verify it appears immediately in list/calendar
4. Refresh and verify it persists
5. Drag/move the schedule in the calendar
6. Refresh and verify the updated time persists
7. Delete the schedule
8. Refresh and verify it is gone
9. Repeat create test with `BIWEEKLY` from student schedule form

Expected:
- `POST /api/recurring-schedules` => `201`
- `PUT /api/recurring-schedules/:id` => `200`
- `DELETE /api/recurring-schedules/:id` => `204`
- No `RECURRING_SCHEDULE_*_VALIDATION_ERROR` unless input is actually invalid

## 2. JSON Import (Lessons + Songs)

1. Open `/import`
2. Import JSON with at least:
   - 1 lesson
   - 1 song
   - content blocks including `groove/groovescribe`, `YouTube`, `Spotify`, text, external link, optional PDF
3. Check import response/stats
4. Open imported lesson in view mode
5. Open imported lesson in edit mode
6. Open imported song in view mode
7. Open imported song in edit mode

Expected:
- `POST /api/import/json-content` succeeds (no authz middleware error)
- Blocks render in view mode
- Blocks load/edit without empty-state crashes

## 3. POS Sync (Songs + Notations)

1. Run POS sync preview (`dryRun`) for songs
2. Run POS sync preview (`dryRun`) for notations/lessons
3. If previews look correct, run actual sync
4. Open 1-2 synced songs and lessons in view mode
5. Open same records in edit mode

Expected:
- Preview returns block summaries
- Sync completes without `POS_*_SYNC_ERROR`
- `contentBlocks` render for GrooveScribe/YouTube/PDF/external links

## 4. Quick Debug Data To Capture If Something Fails

- Flow: `agenda` / `json import` / `pos sync`
- Exact action (e.g. `drag recurring schedule`, `open imported lesson edit dialog`)
- Request URL + method
- Response status + JSON body
- Browser console error (full message + stack if available)
