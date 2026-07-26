# h2oflows web#354 — Calendar/Plans/Runs Model Rework — Implementation Plan

Architected 2026-07-26 (Opus architect + overseer amendments). Binding terminology: **Event** = former `plans` row. **Run** = former `plan_runs` row (a dated calendar outing/log; references a river run = `user_reaches`). Runs and Events are coupled **only by date**. Invites live on **Runs**. There is **no** public/private flag anymore.

User-confirmed decisions (2026-07-26): two-type storage model (option A) + **unified "+ New" create sheet** (single sheet; picking a library run → item is a Run; no run picked → item is an Event). Kind fixed at creation — no morphing between Event and Run. **No event types**: type pills removed from the create sheet; the title carries the semantics (supersedes the issue's festival/race/club-cruise/expedition/rally list). Events keep their detail page + cover photo.

All names below verified against `api/migrations/000138–000144`, `api/internal/handlers/{plans,plan_runs,calendar,invites,nudges,discover}.go`, `api/internal/ics/ics.go`, and the listed web pages/components/composables.

---

## §1 Target model

### Naming decisions (resolved; see §6 for rationale/alternatives)
- `plans` → **`events`**
- `plan_runs` → **`calendar_runs`** (NOT bare `runs` — collides with the river-run library `user_reaches` and its `/runs`, `/my/runs`, `/user-runs` routes; the #246 rule forbids a bare `Run` type).
- `plan_members` → **`run_invites`** (Run-scoped; existing rows ditched per issue).
- Enum `plan_type` → **dropped entirely** (user 2026-07-26: no event types — title carries the semantics; single Event color on the calendar).
- Enum `plan_visibility` → **dropped entirely**.
- Enums `plan_member_origin` / `plan_member_status` → kept as-is (opaque, referenced only by `run_invites`).
- **Routes unchanged**: keep `/plan-runs/{id}` (load-bearing permalink — 301 target from `/reports/*`) and `/plans/{handle}/{slug}` (issue references it verbatim). Only DB tables, Go/TS types, JSON keys, and UI copy change. Eliminates redirect-chain and permalink risk. (`abuse_flags.target_type` keeps the opaque string `'plan_run'` — no moderation migration.)
- Go types: `Event`, `CalendarRun`, `RunInvite`. TS: `CalendarEvent`, `CalendarRun` (already exists in `useCalendar.ts`), `RunInvite`.

### Final DDL (changed tables)

**`events`** (was `plans`; drop `visibility` AND `type`):
```
id UUID PK · owner_id TEXT NOT NULL REFS user_profiles(owner_id) ON DELETE CASCADE
slug TEXT NOT NULL · name TEXT NOT NULL
start_date DATE NOT NULL · end_date DATE NOT NULL (CHECK end_date>=start_date)
location TEXT · cover_photo_id UUID (stub)
created_at/updated_at TIMESTAMPTZ · deleted_at TIMESTAMPTZ
UNIQUE(owner_id, slug)
-- REMOVED: visibility, type (event_type concept dropped — title carries semantics), looking_for_crew, max_crew (crew moved to runs in 000144)
idx events_owner_dates_idx (owner_id, start_date, end_date) WHERE deleted_at IS NULL
```

**`calendar_runs`** (was `plan_runs`; **drop `plan_id`** = the decouple):
```
id UUID PK · owner_id TEXT NOT NULL · user_reach_id UUID REFS user_reaches ON DELETE SET NULL
slug TEXT NOT NULL (UNIQUE owner_id,slug — permalink continuity: carries reports.slug)
run_date DATE NOT NULL · run_time TIME · sort_order SMALLINT DEFAULT 0
gauge_cfs NUMERIC(12,3) · flow_band TEXT · flow_color TEXT · gauge_id UUID REFS gauges ON DELETE SET NULL · stamped_at TIMESTAMPTZ
paddled BOOL DEFAULT false · paddled_at TIMESTAMPTZ (CHECK paddled_at IS NULL OR paddled)   -- "has a log" = paddled
notes TEXT · companions TEXT · aw_synced_at TIMESTAMPTZ · source_report_id UUID (UNIQUE partial — backfill idempotency, KEEP)
looking_for_crew BOOL DEFAULT false · max_crew INT (checks kept)
meetup_spot TEXT · meetup_rapid_id UUID REFS rapids ON DELETE SET NULL · meetup_access_id UUID REFS reach_access ON DELETE SET NULL (XOR check kept)
created_at/updated_at/deleted_at
-- REMOVED: plan_id (was NOT NULL FK plans ON DELETE CASCADE)
idx calendar_runs_owner_date_idx (owner_id, run_date, sort_order) WHERE deleted_at IS NULL   -- replaces plan_runs_plan_idx for itinerary/day ordering
idx calendar_runs_paddled_idx (owner_id, run_date DESC) WHERE paddled AND deleted_at IS NULL  -- kept (season/visibility)
idx calendar_runs_reach_idx / calendar_runs_discover_idx (run_date WHERE looking_for_crew…)   -- kept (renamed)
```

**`run_invites`** (was `plan_members`; **fresh table, no `plan_id`/`event_id`**, keyed to run only):
```
id UUID PK · run_id UUID NOT NULL REFS calendar_runs(id) ON DELETE CASCADE
member_owner_id TEXT REFS user_profiles ON DELETE CASCADE (NULL until email invite resolves)
invite_email TEXT (lowercased) · invite_handle TEXT · invited_by TEXT
origin plan_member_origin · status plan_member_status
invite_token_hash TEXT (SHA-256) · message TEXT · dismissed_at · responded_at · created_at/updated_at
CHECK (member_owner_id IS NOT NULL OR invite_email IS NOT NULL)
UNIQUE (run_id, member_owner_id) WHERE member_owner_id IS NOT NULL
UNIQUE (run_id, lower(invite_email)) WHERE invite_email IS NOT NULL AND member_owner_id IS NULL
idx run_invites_feed_idx (member_owner_id, status) · run_invites_run_idx (run_id, status) · run_invites_token_idx (invite_token_hash) WHERE NOT NULL
```

`nudge_dismissals`, `user_calendar_prefs`: **unchanged**.

### "Runs during this Event" query semantics (decouple mechanics — binding)
An Event owner's event page lists **the event owner's own `calendar_runs` whose `run_date` falls within `[event.start_date, event.end_date]`**, `deleted_at IS NULL`, ordered `run_date, sort_order`. No FK, no membership — pure date containment. Delivers "another Run the same day not part of the Event" for free (shows because same day, no structural attachment). Does **not** pull in other users' runs (privacy). Deleting the event does not touch these runs.

### Visibility model (replaces `visibility` entirely)
- **Events**: owner-only. Anon → uniform 401; authed non-owner → 404. No members, no token (invites live on Runs).
- **Runs** (`calendar_runs`), authed viewer:
  - owner → always;
  - `paddled = true` (has a log) → any authenticated user ("only trips that have logs may be seen by other h2oflows users");
  - invited/accepted crew (`run_invites` row for that run) → yes even if unpaddled;
  - `looking_for_crew = true` (future/today) → discoverable/joinable by any authed user (needed for /discover + Join);
  - otherwise (unpaddled, not invited, not crew-seeking) → 404.
- **Anon**: sees no calendar items. **Sole carve-out**: `?invite=<raw token>` on the **run** page (`renderPlanRun`) grants read of that one run (conversion path; accept still requires an account). Carve-out **moves from the plan page to the run page**.

---

## §2 Migration set (000145+)

golang-migrate rule: **never edit 000138–000144** (applied). All-new files. A table `RENAME TO` breaks every live query the instant it applies, so **each migration ships in the same api deploy as its Go query updates** (unlike #246, which created net-new tables).

**SPLIT (build decision 2026-07-26):** steps 1–5 = `000145_events_runs_rework` (A1, one transaction, flags F1+F3); step 6 = `000146_run_invites` (A2, flag F2). Rationale: `plan_members` must outlive the A1 deploy so invite/crew endpoints keep working until A2 lands — its FKs to the renamed tables auto-repoint, A1 just renames table refs inside invites.go SQL. Dropping it in 000145 would 500 every invite endpoint for the whole A1→A2 window.

**`000145_events_runs_rework.up.sql`** — ordered steps:

1. **Rename tables/indexes first:**
   ```sql
   ALTER TABLE plans      RENAME TO events;
   ALTER TABLE plan_runs  RENAME TO calendar_runs;
   ALTER INDEX plans_owner_dates_idx RENAME TO events_owner_dates_idx;
   ALTER INDEX plan_runs_owner_idx   RENAME TO calendar_runs_owner_idx; -- etc. (cosmetic, optional)
   ```
   (FKs referencing `plans` auto-repoint. Index/constraint names otherwise persist harmlessly.)

2. **Decouple** (drop the parent/child link):
   ```sql
   DROP INDEX plan_runs_plan_idx;
   ALTER TABLE calendar_runs DROP CONSTRAINT plan_runs_plan_id_fkey;  -- verify actual name via \d
   ALTER TABLE calendar_runs DROP COLUMN plan_id;
   CREATE INDEX calendar_runs_owner_date_idx ON calendar_runs (owner_id, run_date, sort_order) WHERE deleted_at IS NULL;
   ```

3. **Delete container/personal events** [DESTRUCTIVE F1]. Safe now because plan_id (CASCADE) is already gone, so runs survive:
   ```sql
   DELETE FROM events WHERE type = 'personal';   -- includes all 000143 'log-{date}' backfill containers + log-mine/nudge-confirm day-plans
   ```

4. **Drop the event-type concept** (must come AFTER step 3, which filters on `type='personal'`):
   ```sql
   ALTER TABLE events DROP COLUMN type;
   DROP TYPE plan_type;
   ```
   Surviving old festival/race/cruise events become typeless — name carries the semantics.

5. **Drop visibility:**
   ```sql
   ALTER TABLE events DROP COLUMN visibility;
   DROP TYPE plan_visibility;
   ```
   (`plans_discover_idx` — the only visibility-dependent index — was already dropped in 000144.)

6. **Rebuild invites Run-scoped** [DESTRUCTIVE F2 — ditch data, issue-authorized] — **in `000146_run_invites` (A2), NOT 000145**:
   ```sql
   DROP TABLE plan_members;
   CREATE TABLE run_invites ( … as §1 DDL … );  -- reuses plan_member_origin/status enums
   ```

**`000145_events_runs_rework.down.sql`** — best-effort reversibility (schema smoke only, **not** data-fidelity; mirrors 000143/000144 down conventions):
- Recreate `plan_visibility`, add `events.visibility DEFAULT 'private'`.
- Recreate `plan_type`, re-add `events.type DEFAULT 'personal'` (per-row values + deleted personal rows unrecoverable).
- Re-add `calendar_runs.plan_id UUID` **nullable, all NULL** (linkage unrecoverable) — cannot restore the NOT NULL/CASCADE FK.
- `ALTER TABLE calendar_runs RENAME TO plan_runs; ALTER TABLE events RENAME TO plans;`
- `DROP TABLE run_invites; CREATE TABLE plan_members (…000140 shape…)` empty.

**Destructive flags — USER GO-AHEAD GRANTED 2026-07-26 ("go"):**
- **(F1)** `DELETE FROM events WHERE type='personal'` — removes any user-named personal events too, not just log containers. Irreversible.
- **(F2)** `DROP TABLE plan_members` — all invite/crew RSVP history gone. Irreversible (issue authorizes).
- **(F3)** `DROP COLUMN plan_id` — which-event-a-run-belonged-to linkage gone. Irreversible.

Preflight to quantify F1 blast radius:
```sql
SELECT type, count(*) FROM plans WHERE deleted_at IS NULL GROUP BY 1;
SELECT count(*) FROM plans WHERE type='personal' AND slug NOT LIKE 'log-%';  -- real user-named personals that will be lost
```

---

## §3 API changes (endpoint-by-endpoint)

Global: every SQL string `plans`→`events`, `plan_runs`→`calendar_runs`, `plan_members`→`run_invites`; drop every `JOIN plans p ON p.id = pr.plan_id AND p.deleted_at IS NULL` and every `p.visibility` reference. JSON: rename wrapper keys `plan`→`event`, `plans`→`events` (see §7 deploy-order note).

### Events (was Plans) — `plans.go`
| Endpoint | Change |
|---|---|
| `POST /plans` (`Create`) | Drop `runs:[]` inline creation, `visibility`, and `type`. Body → `{name, start_date, end_date, location?}`. Silently ignore legacy `visibility`/`type`/`looking_for_crew`/`max_crew` (skew tolerance, existing pattern). Still ensures `user_profiles` + slug + rate-limit 20/hr. |
| `GET /plans/{handle}/{slug}`, `GET /plans/{id}` → `renderPlan` | **Owner-only.** Remove `?invite=` token carve-out (moves to run page), remove the `members` query + `plan_members` visibility branch. Itinerary query changes from `WHERE pr.plan_id=$1` to **`WHERE pr.owner_id = event.owner_id AND pr.run_date BETWEEN event.start_date AND event.end_date`** (§1 semantics). Response: `{event, itinerary}` (drop `members`, `invite_token_runs`, `visibility`). Per-run crew/RSVP LATERALs on itinerary rows stay (owner is viewer). Non-owner → 404; anon → 401. |
| `GET /me/plans` (`ListMine`) | Drop `visibility` and `type` from SELECT/response; remove the type filter param. |
| `PATCH /plans/{id}` (`Update`) | Drop `visibility` and `type` handling entirely. |
| `DELETE /plans/{id}` (`Delete`) | Tombstone the **event only** — no child-run cascade (decoupled). Remove any "tombstone child plan_runs" logic. |

### Runs (was Plan runs) — `plan_runs.go`, `calendar.go`
| Endpoint | Change |
|---|---|
| `POST /plans/{id}/runs` (`CreateRun`) | **Removed.** ("Add a run to this plan" is deleted.) |
| **NEW** `POST /plan-runs` | Standalone run create (unified "+ New" sheet, run branch). Body `{user_reach_id|reach_slug, run_date, run_time?, notes?, paddled?, looking_for_crew?, max_crew?, meetup_spot?, meetup_feature?}`. Reuse `insertPlanRun` with `plan_id` removed; flow-stamps; `paddled=true` ⇒ 422 if future (user-local, `userToday`). Route before `GET /plan-runs/{param}` (chi: no collision). |
| `GET /plan-runs/{param}` → `renderPlanRun` | **Add `?invite=<token>` carve-out** (port `inviteTokenMemberIDs` logic, re-keyed to `run_invites.run_id = runID`). New visibility gate (§1): owner OR `paddled` OR crew/invited (`run_invites` row) OR (`looking_for_crew` future) OR valid token; else 404 (anon w/o token 401). Drop the `JOIN plans` + `p.visibility`; drop the `plan` wrapper from the response (run is standalone, fields flat). Resolution order (id → source_report_id → unique slug) **unchanged** — permalink continuity. |
| `PATCH /plan-runs/{id}` (`UpdateRun`) | Owner-scoped by `owner_id` (already is). Remove any parent-plan `deleted_at` guard. Otherwise unchanged (meetup/crew/paddle logic intact). |
| `DELETE /plan-runs/{id}` (`DeleteRun`) | Remove the `EXISTS(SELECT 1 FROM plans …)` parent guard; tombstone by `owner_id`. |
| `POST /plan-runs/{id}/log-mine` (`LogMine`) + `findOrCreatePaddledLog` | **Major simplification.** Drop the "log-{date} Personal plan" find/create/un-tombstone dance entirely — no event is created. Just insert (or reuse) a standalone paddled `calendar_run` for `(owner, user_reach_id, run_date)`; idempotent on the existing paddled row. Authorization: caller is an **accepted `run_invites` member of the source run** or its owner. |
| `GET /me/calendar` (`Calendar`) | Two decoupled item types. `days[].runs` from `calendar_runs` by `owner_id`+date range (drop `JOIN plans`, drop `plan_id` from `calRun`). `events[]` (renamed from `plans[]`) = owner's own events overlapping range (drop the member `UNION ALL` branch, `role`, `member_status`, `visibility` — events owner-only now). Enhancement (decision #8): include **accepted-crew runs** (join `run_invites` accepted) in `days[]` with a `role` flag so "trips I joined" still surface. `needs_confirm`/`nudge_dot_dates` machinery unchanged (repoint tables). |
| `GET /me/calendar/day` (`CalendarDay`) | Drop `plan_id` from `dayRun` + `JOIN plans`; query `calendar_runs` by owner+date. |

### Invites / crew — `invites.go`, `ics.go`, `mail.go` (the PRIORITY rework)
Everything re-keys from `plan_id`/`plan_run_id` to **`run_invites.run_id`**. No plan/event context anywhere.
| Endpoint | Change |
|---|---|
| `POST /plans/{id}/invite` (`InviteToPlan`) | **Replace** with **`POST /plan-runs/{id}/invite`** (`InviteToRun`). Body `{handle?}` or `{email, attach_ics?}` for a single run. Insert one `run_invites` row (`origin=invite`, `status=invited`), token hash, async mail. Drop `loadPlanRuns`/`resolveInviteTargets`/`inviteOne` fan-out. Owner-of-run gated. |
| `POST /plans/{id}/invite/resend` | → `POST /plan-runs/{id}/invite/resend`, single-run. |
| `GET /me/invites` (`MyInvites`) | Rows = `run_invites` where I'm the member/email, `origin=invite`. Each item embeds **run summary** (river name, date, time, meetup, flow) — no plan layout. |
| `POST /invites/{memberId}/accept` (`AcceptInvite`) | Re-key SELECT to `run_invites` (`run_id` not `plan_id/plan_run_id`); crew cap check reads the run's `max_crew`. Response `{status:'accepted', run_id, slug}` so web routes to `/plan-runs/{slug|id}`. |
| `POST /invites/{memberId}/dismiss` (`DismissInvite`) | Re-key table only. |
| `POST /plan-runs/{id}/join` (`JoinRun`), `GET /plan-runs/{id}/crew` (`RunCrewList`), `…/crew/{memberId}/accept|decline` | Already per-run after A7 — re-key `plan_members`→`run_invites`, drop any `plan_id`. |
| **ICS** `BuildPlanInvite` → **`BuildRunInvite`** | Single VEVENT for one run: timed (`DTSTART` floating + `DURATION:PT2H`) if `run_time`, else all-day; `UID={run_id}@h2oflows.app`; `SUMMARY`=run name; `LOCATION`=meetup_spot; `URL=/plan-runs/{id}`. Delete the plan-spanning VEVENT + multi-run loop + `PlanInviteInput.Runs`. Keep all RFC-5545 escaping/folding/CRLF machinery + golden test (retarget). |
| **Email** `inviteSubject`/`buildInviteEmailBody`/`sendInviteMail`/`loadInvitedPlanInfo` | Single-run email. Subject: `@{host} invited you to run {RunName} on {date}[ at {time}]`. Body: run details (river, date/time, meetup, flow) + one **Accept** link `{WEB}/plan-runs/{id}?invite={token}` (lands on the **run** page). Delete whole-plan itinerary layout. |

### Discover / nudge / season / og
| Endpoint | Change |
|---|---|
| `GET /discover/plans` (`ListPlans`) | Rename to **`GET /discover/runs-for-crew`** (or keep path, rename internals). **Regroup by run, not event** (events owner-private now). Flat, `run_date`-sorted list of `calendar_runs` where `looking_for_crew AND run_date >= local_today AND deleted_at IS NULL`, each with river/date/time/flow/meetup + `crew:{filled,max}`. Drop the `JOIN plans`/`p.visibility='public'` gate. Class filters stay. Auth-only (unchanged). Optional secondary grouping header by day. |
| `GET /me/season` (`Season`) | Drop `JOIN plans p … p.deleted_at` from all four queries; operate directly on paddled `calendar_runs` by owner+date. Semantics unchanged (paddled runs). `highest_flow`/`new_runs`/`streak` unchanged. |
| Nudge (`scanCandidates`, `Candidate`, `Confirm`, `needs_confirm`) | Drop the `plans` join in `scanCandidates`; candidates = owner's unpaddled `calendar_runs` in `[today-14, today-1]`. `Confirm` uses the simplified `findOrCreatePaddledLog` (standalone paddled run, no event). |
| `GET /og/plan-runs/{id}` (`og.PlanRun`) | Repoint tables; gate on `paddled=true` (only logged runs shareable); else keep auth-only 401. |
| `moderation.FlagPlanRun` | Repoint `plan_runs`→`calendar_runs`; keep `abuse_flags.target_type='plan_run'` string. |

Router (`cmd/server/main.go`): remove `POST /plans/{id}/runs`, `POST /plans/{id}/invite`(+resend); add `POST /plan-runs`, `POST /plan-runs/{id}/invite`(+resend). Everything else keeps its path string.

---

## §4 Web changes (page/component)

### Types & plumbing (foundational)
- `utils/planType.ts`: **shrink to a single Event ribbon color constant** (event-type concept removed; one distinct Event color vs run flow-dots satisfies "Events colored differently than Runs"). Delete `PlanType`/`PLAN_TYPE`/`PLAN_TYPES` and per-type palette.
- `composables/useCalendar.ts`: rename `CalendarPlan`→`CalendarEvent`, `plans`→`events` (feed key `data.events`), **remove `plan_id` from `CalendarRun`** and every optimistic helper (`insertRunOptimistic`, `patchRunOptimistic`, etc.). Remove `role`/`member_status`/`visibility` from `CalendarEvent`.
- `utils/plan.ts` / `utils/planRun.ts`: rename `PlanDetail`→`CalendarEventDetail`; drop `visibility`; detail response wrapper `plan`→`event`. `PlanRunDetail` keeps crew/RSVP fields; drop `PlanRunDetailPlan.visibility`.
- `stores/planWizard.ts`: drop `visibility` and `type` (event-type concept removed).

### Unified "+ New" create sheet (user-confirmed amendment — supersedes the issue's dropdown fork)
ONE sheet for all calendar-item creation. **`PlanRunLogSheet.vue` survives and absorbs; `PlanCreateSheet.vue` is deleted.** (PlanRunLogSheet already owns the library-run picker, meetup combobox, crew, log modes — the event branch is the small addition. Keep the filename to avoid import churn; retitle headers in-template.)

- Sheet opens with the library-run picker (My runs | Community scopes) prominent, plus an explicit "No run — create an Event" toggle/branch.
- **Run picked** → run branch: date, time, meetup, crew toggle, notes, date-gated Log section (all existing behavior). Header "Create a Run". POSTs new standalone `POST /plan-runs`.
- **No run (Event branch)** → event fields: name, date range, location. **No type pills** (user 2026-07-26: title carries the semantics) and no visibility control (concept removed). Header "New Event". POSTs `POST /plans`.
- **Kind fixed at creation.** No converting Event↔Run after the fact (delete + recreate). Enforce in UI (no run-picker in event-edit, no event fields in run-edit).
- Modes in `usePlanRunLogSheet`: `create` (unified, branch chosen in-sheet), `edit-run`, `edit-event` (event branch prefilled; absorbs whatever PlanCreateSheet/planWizard edit flow existed), `confirm` (nudge, unchanged). `savedCount` signal unchanged.
- Entry points may preselect the branch: Events-list "+ New event" opens event branch; day-sheet "+ New" prefills the date; calendar "+ New" opens neutral.
- **Copy change** (run branch footer, currently line ~337): exactly — *"Runs on the calendar are visible to other h2oflows users — they share conditions & shots on the run page, and flow is recorded automatically from the nearest gauge reading when you log."* (Remove "Keep a plan private…" sentence.)
- `openCreate` signature: **drop `planId` and `visibility` params**.

### `pages/plans/[handle]/[slug].vue` (Event page)
- Remove `<PlanVisibilityBadge>` (line 43) AND `<PlanTypeBadge>` on the cover — no badges (event-type concept removed). Detail page + cover photo stay (user-confirmed).
- "Paddle plans" → **"Runs during this Event"** (line 83).
- **Remove** plan-level `PlanMembersRow` + `InviteSheet` (lines 69–78, 95) — invites are per-run. Invite entry moves onto each run row / run page.
- Itinerary fed by the date-range query (§3); page reads `data.event` + `data.itinerary`. Anon carve-out banner + token plumbing here **removed** (moved to run page).
- Final page: cover picture (no badges), Event details (name/host/date-range/location), "Runs during this event" section.

### `components/PlanItinerary.vue`
- **Remove** "+ Add a run to this plan" button (lines 85–90) and `onAddRun`/`planRunLogSheet.openCreate(plan.id,…)`.
- Keep per-run crew meter / Join / Accept-Decline / "Log my paddle" rows.
- `toCalendarRun` (line 135): drop `plan_id`.
- Add per-run **"Invite"** affordance (host) opening the run-scoped invite sheet (replaces removed plan-level InviteSheet).

### `pages/calendar/index.vue` + calendar components (reorg per spec)
New vertical order in `<main>`:
1. `InviteBanner`, `NudgeCard` (top, unchanged).
2. Title row + **"+ New" button** → opens the unified create sheet (neutral branch). No dropdown fork.
3. **NEW `CalendarRunsThisMonth`** component — "Runs this month" list (monthly view), reading `monthOnlyDays[].runs`.
4. Month grid / Year / (built-out) List view.
5. **`CalendarEventsList` moved to bottom, above stats**: header "Plans this month" → **"Events this month"** (line 4), empty state "No events this month", button "+ New plan" → "+ New event" (opens unified sheet, event branch). `runCount()` (lines 64–68) can no longer key on `r.plan_id`; recompute as **count of runs whose date ∈ `[event.start_date, event.end_date]`** (date containment).
6. **`CalendarQuickStatsBanner` moved to the very bottom.**
- `CalendarListView`: build out (currently stub) — grouped by date, Events + Runs interleaved.
- `CalendarMonthGrid`/`CalendarDayCell`: Events = single-color ribbons (one Event color, no per-type palette), Runs = flow dots ("Events colored differently than Runs" satisfied). Remove member/invited dashed-ribbon logic (events owner-only).
- `CalendarDaySheet.vue`: remove per-plan "Add a run" buttons (lines 74/150) and plan grouping; show the day's Events (label only) + Runs (each with actions), plus day-scoped "+ New" (date prefilled, unified sheet).

### Run detail — `pages/plan-runs/[id].vue`, `components/PlanRunDetailCard.vue`
- Remove `<PlanVisibilityBadge>` (line 57) and any `plan.visibility` usage.
- **Add `?invite=<token>` landing** (mirror the plan page's old carve-out, now here): anon-with-token banner + `InviteAcceptCard` for the token-bound run.
- Route stays `/plan-runs/{id}` (permalink; `middleware/reports-redirect.global.ts` unchanged and still valid — `source_report_id` resolution preserved).

### Invites/discover web
- `useInvites`/`InviteFeedCard`/`InviteBanner`/`InviteAcceptCard`: re-key to run-scoped `run_invites` (item = run summary, accept routes to `/plan-runs/{id}`).
- `InviteSheet`/`InviteHandleSearch`: repurpose as **run-scoped** invite sheet (single `run_id`, no run-selector checkbox list).
- `pages/discover/index.vue` + `DiscoverPlanCard` + `utils/discover.ts`: regroup to flat, date-sorted list of crew-seeking **Runs** (rename card → `DiscoverRunCard`); Join → per-run `POST /plan-runs/{id}/join`.

### Delete / dead after cutover
`components/PlanCreateSheet.vue` (absorbed into unified sheet), `components/PlanVisibilityBadge.vue`, `components/PlanTypeBadge.vue` (event-type concept removed), plan-level invite/members plumbing that becomes unused.

---

## §5 Wave / PR breakdown

api = `A`, web = `W`. A table `RENAME TO` breaks live queries instantly, so **each A-PR's migration + Go query updates deploy together**, and every A deploys before its dependent W. Invite rework is early-priority per the issue — lands immediately after the unavoidable foundational rename it depends on.

| # | Repo | Scope | Size | Depends |
|---|---|---|---|---|
| **A1** | api | **Foundational model migration** `000145` (rename tables, drop `plan_id`, delete personal events, drop type, drop visibility) + **all** Go query renames + rewrites: `renderPlan` (owner-only, date-range itinerary), `renderPlanRun` (paddled/crew/token visibility; token check still reads `plan_members` until A2), `Calendar`/`CalendarDay` (events+runs decoupled, owner-own), `Create` (drop runs/visibility/type), remove `POST /plans/{id}/runs`, add `POST /plan-runs`, `findOrCreatePaddledLog` (standalone), season/nudge decouple, **SQL-compat everywhere touching renamed tables / dropped cols** (invites.go table refs, discover regroup-by-run, og paddled gate, moderation repoint — cannot defer, they 500 otherwise). **Flags F1/F3.** | XL | — |
| **A2** | api | **Invite rework (PRIORITY)**: mig `000146` `DROP plan_members`→`CREATE run_invites` (F2), run-scoped `InviteToRun`/accept/dismiss/join/crew, `BuildRunInvite` single-VEVENT ICS, single-run email, run-page token carve-out re-keyed to `run_invites`, calendar crew-run inclusion (decision #8). | L | A1 |
| **A3** | api | Residual polish: anything A1 compat left rough in discover/og/season/nudge; may collapse into A1/A2 review fixes. | S | A1 |
| **W1** | web | Types/plumbing rename (`CalendarEvent`, feed `events`, drop `plan_id`/`visibility`/`type`), `planType.ts` → single Event color, **unified create sheet** (PlanRunLogSheet absorbs event branch — name/date-range/location, no pills; PlanCreateSheet deleted, copy change, "Create a Run"/"New Event" headers, standalone create). | L | A1 |
| **W2** | web | Event page rework (`/plans/{handle}/{slug}`): "Runs during this Event", remove visibility badge, remove "Add a run to this plan", relocate invite entry to runs. | M | A1 (+A2 for invite entry) |
| **W3** | web | Calendar page reorg: "+ New" → unified sheet, "Runs this month" (new), Events-list to bottom + rename, stats to bottom, build out List view, day-sheet cleanup. | L | A1, W1 |
| **W4** | web | Invite/discover web: run-scoped `useInvites`/feed/banner/accept, run-page `?invite=` landing, `DiscoverRunCard` regroup + Join. | L | A2, A3 |

**Ordering / parallelism:** A1 gates everything (the rename). After A1: **A2 next (priority)**; A3 parallels A2. On web, W1 unblocks W2/W3 (parallelize); W4 waits on A2/A3.

**Deploy runbook:** explicit go-ahead on F1/F2/F3 → deploy **A1 first** (api), verify calendar/event/run reads + season/nudge → push W1 → W2/W3 → deploy A2 (+A3) → push W4. Verify Resend SPF/DKIM still valid for the single-run email before A2. Verify old `/reports/{uuid}` still 301→`/plan-runs/{uuid}` resolves via `source_report_id` after the `calendar_runs` rename.

---

## §6 Decisions & open questions (with recommendations)

1. **Run table name.** **`calendar_runs`** (not bare `runs`). `runs`/`/runs`/`/my/runs` and Go/TS `Run` mean the river-run library; `calendar_runs` matches existing TS `CalendarRun`. Alt: `trips` (collides with `trips.go`).
2. **Routes.** **Keep `/plan-runs/{id}` and `/plans/{handle}/{slug}` unchanged.** `/plan-runs/{id}` is the 301 target from `/reports/*`; keeping paths avoids deploy-skew and redirect chains. UI copy changes without touching URLs. Alt: rename to `/events` + `/runs` with 301s (cosmetic; deferred).
3. **Decouple query.** Owner's own runs, `run_date` within event date range, for "Runs during this Event" (§1). Rejected alt: include crew/other-user runs (privacy + noise).
4. **Personal events.** **Delete all `type='personal'` events** (F1); runs survive standalone by date. They were pure log-containers (000143 backfill + log-mine); post-decouple they're clutter. Accept minor loss of rare user-named personals (preflight quantifies). Alt: remap `personal`→`expedition` (pollutes calendar with container events).
5. **Event types.** SUPERSEDED (user 2026-07-26): event-type concept **removed entirely** — no enum, no pills, no badge, single Event color. `type` column dropped after the `personal` delete; surviving festival/race/cruise events become typeless (name carries semantics). Restorable later via additive migration if ever wanted.
6. **Invites.** **Fresh `run_invites` table, drop `plan_members`** (F2, issue-authorized) — keyed to `run_id` only. Keep `plan_member_origin/status` enums. Discover = flat, date-sorted run list.
7. **Visibility.** Four-state Run rule (§1: owner / paddled-any-authed / crew-invited / crew-seeking) + Events owner-only + anon-token carve-out on the **run** page.
8. **Calendar crew-run inclusion** — USER-APPROVED 2026-07-26: `/me/calendar` `days[]` includes runs you've accepted crew on, with a `role` flag ('owner'|'crew'). Note: crew join reads `run_invites`, so this lands fully with A2; A1 ships owner-own only.
9. **JSON key rename** — USER-APPROVED 2026-07-26: response `plan`→`event`, `plans`→`events`, enforced by api-before-web deploy.
10. **Unified create sheet** (USER-CONFIRMED 2026-07-26): two-type storage + one "+ New" sheet; run picked → Run, no run → Event (name/date-range/location only); kind fixed at creation, no morphing. PlanRunLogSheet absorbs; PlanCreateSheet deleted.
11. **Event detail page + cover** (USER-CONFIRMED 2026-07-26): informational Events with no runs still get their detail page and cover photo.

---

## §7 Risks / gotchas

- **Permalink continuity (highest priority).** Do NOT rename the `/plan-runs/{id}` route or drop `calendar_runs.source_report_id` / the id→source_report_id→slug resolution order. `middleware/reports-redirect.global.ts` and old shared `/reports/{uuid}` links depend on it. Re-run the continuity test after the rename.
- **Applied-migration rule.** 000138–000144 live; all changes new files from **000145**. Enum values can't be dropped in place — the `type_new` swap (§2 step 4) is mandatory.
- **Table RENAME atomicity.** `RENAME TO` breaks all queries the instant it commits — A1's migration and Go query updates **must be one api deploy**. No gradual/dual-read window like #246 (which created net-new tables).
- **Deploy-order skew (Netlify web auto-deploy vs manual api).** Always **deploy the A-wave before pushing the dependent W branch.** Old web build reading `data.plan` after key rename gets `undefined` — degrades (blank), doesn't crash, but order anyway. api tolerates stale request bodies (keep silently-ignoring `visibility` etc., matching existing `Create` pattern).
- **Destructive migrations need explicit go-ahead.** F1/F2/F3 irreversible; down migration is schema-smoke only. Gate behind user confirmation before prod. Staging note: user labels PR branches for staging — once 000145 applies on staging it can never be edited (applied-anywhere rule).
- **Naming collision residue.** After rename, grep api for lingering `plan_runs`/`plan_id`/`plan_members`/`visibility`/`plan_type`/`plan_visibility` in SQL strings + struct tags (spread across `plans.go`, `plan_runs.go`, `calendar.go`, `invites.go`, `nudges.go`, `discover.go`, `og.go`, `moderation.go`, `ics.go`, `mail.go`). Web: grep `plan_id`, `visibility`, `PlanVisibilityBadge`, `'personal'`, `PLAN_TYPES`, `PlanCreateSheet`.
- **`findOrCreatePaddledLog` behavior shift.** No log-{date} event materialized anymore — verify season/calendar reads (now querying runs directly) still show these paddles, and idempotency on `(owner, user_reach_id, run_date, paddled)` still prevents dupes.
- **`abuse_flags` string.** Keeping `target_type='plan_run'` avoids a moderation migration but is a slight misnomer vs `calendar_runs`; document it.

### Critical files for implementation
- `api/migrations/000144_crew_per_run.up.sql` — precedent for 000145; exact current index/constraint/column names to rename
- `api/internal/handlers/plan_runs.go` — renderPlanRun visibility+token, GetRun resolution order, findOrCreatePaddledLog, CreateRun→standalone POST /plan-runs
- `api/internal/handlers/invites.go` + `api/internal/ics/ics.go` — Run-scoped invite rework, single-run email, BuildPlanInvite→BuildRunInvite
- `api/internal/handlers/calendar.go` — Calendar/CalendarDay decouple: drop JOIN plans, events[] own-only, drop plan_id/visibility
- `web/app/pages/calendar/index.vue` + `web/app/pages/plans/[handle]/[slug].vue` — the two page reorgs; drive W2/W3 component lists (PlanItinerary/PlanRunLogSheet/CalendarEventsList)
