# Invite Sync Plan — Outlook-parity calendar invites

Architected 2026-07-29 (Opus). User requirement: invites behave like Outlook/Google calendar invites — invite email → accept → on your calendar; organizer edits → update email + external-calendar auto-update; attendee removes from calendar → declined + organizer notified ("invite someone else"); organizer deletes → cancel to everyone.

## Ground truth (verified in code)

- `plan_member_status` already has `declined`; no `left` needed. Next migration = **000148**.
- `ics.BuildRunInvite` emits `METHOD:PUBLISH`, no SEQUENCE/ORGANIZER/ATTENDEE. Golden tests pin PUBLISH.
- `UpdateRun`/`DeleteRun` have zero notification side effects; `PlanHandler` has no mailer.
- `/me/calendar` LIVE-JOINS accepted crew runs (role='crew') — organizer edits already propagate to in-app calendars; leaving (status≠accepted) auto-removes. `.ics` machinery is solely for EXTERNAL calendars.
- **`user_profiles` has NO email column** — emails ride the JWT (`auth.EmailFromContext`). Only stored address anywhere: `run_invites.invite_email` on pending email invites. → stored-email capture is a prerequisite.
- `RunCrewDecline` (host-gated) is the de-facto uninvite; no attendee-facing leave endpoint exists; web has NO "remove from my calendar" affordance for crew.
- Tombstone surfaces verified clean: MyInvites/renderPlanRun/calendar all filter `deleted_at IS NULL`.

## Semantics map

| Action | METHOD | SEQ | Notified |
|---|---|---|---|
| Invite (email) | REQUEST (was PUBLISH) | 0 | the invitee |
| Invite (handle) | — | — | in-app feed only |
| Accept | — | — | organizer ("@X accepted") |
| Organizer edits MATERIAL field (`run_date`, `run_time`, `meetup_spot`, `name`) | REQUEST, same UID | +1 | accepted crew + pending invitees w/ resolvable email |
| Non-material edit (notes/companions/crew cap/sort/paddled) | — | — | nobody |
| Attendee removes from calendar (pre- or post-accept) | optional CANCEL to leaver | +1 | organizer: "@X declined — invite someone else" |
| Organizer deletes run | CANCEL | +1 | all live invitees |
| Organizer uninvites one person | CANCEL to that person | +1 | that person |
| Host declines a join request | — | — | nobody (v1) |

UID stays `{run_id}@h2oflows.app` forever — the reconciliation key. ATTENDEE is per-recipient → one .ics per recipient, not shared.

## Mig 000148 (additive, no destructive flags)

```sql
ALTER TABLE calendar_runs ADD COLUMN ics_sequence INT NOT NULL DEFAULT 0;
CREATE TABLE user_emails (
  owner_id   TEXT PRIMARY KEY REFERENCES user_profiles(owner_id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
Down: drop both. No enum change (reuse `declined` — also dodges the ALTER TYPE ADD VALUE same-transaction gotcha under golang-migrate).

## API

- **Email capture**: `upsertUserEmail(ctx,q,ownerID,email)` best-effort from CreateRun, findOrCreatePaddledLog, AcceptInvite. `resolveNotifyEmail` = COALESCE(user_emails[member_owner_id], invite_email); NULL → skip (in-app only).
- **ICS builder**: `Method` (REQUEST|CANCEL), `Sequence`, `ORGANIZER;CN=…:mailto:{parsed MAIL_FROM}` (MUST equal From header or Outlook ignores updates), per-recipient `ATTENDEE;CN=…;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:…`, CANCEL adds `STATUS:CANCELLED`. Content type `…; method=REQUEST|CANCEL`. RFC 5546: REQUEST/CANCEL require ORGANIZER + ≥1 ATTENDEE — builder must enforce. Retarget 3 golden tests + add CANCEL golden.
- **`internal/handlers/notifications.go`**: async senders mirroring sendRunInviteMail (context.Background + timeout, log-only failure): notifyRunMaterialChange, notifyRunCancelled, notifyOrganizerDeclined, notifyUninvited, notifyOrganizerAccepted. Recipient query: run_invites WHERE run_id=$1 AND status IN ('invited','accepted') AND dismissed_at IS NULL, with resolved notify_email.
- **PlanHandler gains mailer** (NewPlanHandler signature + main.go).
- **UpdateRun**: pre-select material fields + ics_sequence; post-update diff; changed → sequence+1 + fan-out. Diff-gating only (D3): no email unless a material value actually changed.
- **DeleteRun**: snapshot run+recipients → tombstone → CANCEL fan-out.
- **NEW `POST /plan-runs/{id}/leave`** (attendee; run-scoped per D6): own row (member match OR email match), status IN (invited,accepted) → declined + responded_at; idempotent; notify organizer; optional CANCEL to leaver.
- **RunCrewDecline** (uninvite): + notifyUninvited when row was accepted or pending-invite; nothing for join-request declines.

## Web

- `CalendarRun.role` added to type (api already returns it).
- `usePlans.leaveRun(runId,date?)` → POST leave → removeRunOptimistic + refresh both calendar + invites; toast "Removed from your calendar."
- `PlanRunDetailCard`: non-owner w/ my_rsvp accepted|invited → "Remove from my calendar" + confirm: "Remove this run from your calendar? The organizer will be notified that you can't make it."
- `PlanRunItem`/`CalendarDaySheet`: role==='crew' rows get remove action instead of owner Edit/Mark-paddled.
- `InviteSheet`: Remove (uninvite) action on crew/pending rows; declined state + re-invite hint. PlanCrewPanel already renders declined.
- In-app "updated" marker: DEFERRED (D4) — calendar renders live data; email is the channel. Revisit with push (web#338).

## Waves (deploy: api before web; API-1 smoke-tested against Gmail/Apple/Outlook before API-2)

| PR | Scope | Size |
|---|---|---|
| API-1 | mig 000148 + user_emails capture + ICS REQUEST/CANCEL/SEQUENCE/ORGANIZER/ATTENDEE + notifications.go + initial invite PUBLISH→REQUEST | L |
| API-2 | mailer into PlanHandler; UpdateRun diff+fan-out; DeleteRun cancel; POST leave; uninvite email | M–L |
| WEB-3 | role type; leaveRun; remove-from-calendar affordances (detail card + day sheet) | M |
| WEB-4 | InviteSheet uninvite/declined/re-invite; (opt) updated marker | M |

## Decisions (architect recommendations, adopted)

- D1 `user_emails` table over owner_email column (also feeds future push). Gap: pre-existing organizers have no row until next authed write → their notifications silently no-op (R2, documented).
- D2 initial invite = REQUEST (PUBLISH copies don't reconcile later updates). Cost: RSVP buttons appear in mail clients; MAIL_FROM must be SPF/DKIM-aligned real sender.
- D3 diff-gating only; no debounce v1 (3 saves = 3 emails, accepted).
- D4 in-app updated marker deferred.
- D5 notify organizer on accept AND on decline/leave; skip join-request decline emails.
- D6 leave is run-scoped POST /plan-runs/{id}/leave; DismissInvite unchanged ("hide from feed" ≠ decline).

## Risks

- **R1 ICS compat**: floating DTSTART + DURATION; Outlook quirks (DTEND pref); reconciliation needs identical UID + higher SEQUENCE + matching ORGANIZER. Smoke REQUEST→update→CANCEL on Gmail/Apple/Outlook after API-1.
- **R2 missing stored emails**: handle invitees + pre-feature organizers no-op email (in-app only) until their next authed write. Documented, not a bug.
- **R3 volume**: diff-gating is the guard.
- **R4 re-invite 409 TRAP**: declined EMAIL invite keeps member_owner_id NULL → `run_invites_email_uk` collides on re-inviting the same address. Fix in API-1/2: resurrect the declined row (flip to invited + new token) instead of inserting.
- **R5 tombstone surfaces**: verified clean.

Prereq sequencing: build API-1 off main AFTER api#168 (A4 run-name) merges — both touch ics.go/invites.go email paths.

## Amendments (user, 2026-07-29)

- **RSVP copy-steer (API-2 scope, approved).** Mail clients' native RSVP buttons (shown because METHOD:REQUEST) send an iTIP REPLY to invites@h2oflows.app which nothing reads — one-way. Every REQUEST-bearing email must make OUR Accept button visually primary with the line: "RSVP in your mail app only updates your calendar — tap Accept to join the crew."
- **Inbound RSVP processing (FUTURE wave, post-pilot, spec alongside notif-prefs web#338).** MX for the invites@ domain → Resend Inbound (or similar) webhook → parse METHOD:REPLY, match UID {run_id}@h2oflows.app + attendee email to the run_invites row, map PARTSTAT ACCEPTED/DECLINED → accept/decline. Closes the loop so a mail-client "Yes" becomes a real accept.

- **No inviting to logged runs.** UI gate shipped in web#362 (Invite button hidden when `run.paddled`). **API-2 addition**: `InviteToRun` (and resend) reject paddled runs with 422 "run already logged" — server-side enforcement, not just UI.
- **Crew who ran it belongs in the log.** **API-2 addition**: `renderPlanRun` response gains `crew_members: [{handle}]` — ACCEPTED crew handles only (never emails), for all runs (planned = who's coming; logged = who ran it), visible to whoever can see the run. **WEB-3 addition**: run detail renders the crew list — logged runs show it in the log section ("Crew: @a, @b"); planned runs near the crew meter.
- **All run rows link to the detail page** (shipped web#362) — planned runs' rows previously opened the edit sheet only, leaving no path to the Invite button for exactly the runs you invite people to; Edit stays as the explicit button.
