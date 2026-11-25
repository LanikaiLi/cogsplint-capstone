# Daily Discipline API

The Rewards tab was first called "Jar", so its code folder, file names and route are still `jar`.

All calls go to Supabase with the logged-in user's session. RLS limits every call to the user's own rows,
so no call sends a `user_id` (the database fills it in from the login).

Table: `disciplines` (in the app and UI these are called **tasks**).

| Column | Meaning |
|---|---|
| `id` | Task id |
| `title` | Task name (cannot be empty) |
| `points` | Points earned for doing it (0 or more, no upper limit) |
| `time_block` | `morning`, `afternoon`, `evening` or `anytime` |
| `is_active` | `false` means the user deleted it (hidden, history kept) |
| `created_at` | When the task was created |

---

## List tasks

- **What it does:** Gets all of the user's tasks that are not deleted, oldest first.
- **Used by:** Today tab, Manage tab (same cached list, so both always match).
- **Supabase call:** `select` from `disciplines` where `is_active = true`, ordered by `created_at`.
- **Returns:** a list of `{ id, title, points, time_block, created_at }`.
- **Errors:** network or permission error; the screens show "We could not load your tasks" with a retry button.
- **Code:** `useDisciplines` in `src/features/discipline/shared/task-read-api.ts`

## Save a task (create or edit)

- **What it does:** Creates a new task, or updates an existing one when an `id` is given.
- **Used by:** Task form (opened from Manage).
- **Sends:** `{ title, points, time_block }`, plus `id` when editing.
- **Supabase call:** `insert` into `disciplines`, or `update` where `id` matches.
- **Returns:** nothing. Afterwards the task list is refreshed so Today and Manage show the change right away.
- **Errors:** the database rejects an empty title, negative points, or an unknown time block.
- **Code:** `useSaveDiscipline` in `src/features/discipline/manage/task-write-api.ts`

## Delete a task

- **What it does:** Removes the task from Today and Manage. It is not erased: it is hidden by setting
  `is_active = false`, so past check-ins and points stay in the history.
- **Used by:** Manage tab (delete with confirmation).
- **Sends:** the task `id`.
- **Supabase call:** `update` `disciplines` set `is_active = false` where `id` matches.
  A database trigger fills `archived_at` automatically.
- **Returns:** nothing. The task list is refreshed afterwards.
- **Code:** `useDeleteDiscipline` in `src/features/discipline/manage/task-write-api.ts`

---

## Check-in table

Table: `discipline_logs`. One row means "this task was done on this day".

| Column | Meaning |
|---|---|
| `id` | Check-in id |
| `discipline_id` | Which task |
| `completed_date` | The user's local date (YYYY-MM-DD), sent by the app, not UTC |
| `title`, `time_block`, `points_earned` | Copies of the task at check-in time, filled by a database trigger (the app cannot send them) |

A task can only be checked in once per day. There is no edit: a check-in is added or undone (deleted).

## List today's check-ins

- **What it does:** Gets the check-ins for one date. A task is "done" if it has a row here. The next day the date is
  different, so every task shows as not done again.
- **Used by:** Today tab.
- **Supabase call:** `select` from `discipline_logs` where `completed_date` = the given date.
- **Returns:** a list of `{ id, discipline_id, completed_date, points_earned }`.
- **Code:** `useCheckIns` in `src/features/discipline/today/today-api.ts`

## Check off / undo a task

- **What it does:** Tap a task to mark it done for today. Tap a done task to undo it.
- **Used by:** Today tab.
- **Sends:** when checking off: `{ discipline_id, completed_date }`. When undoing: the check-in `id`.
- **Supabase call:** `insert` into `discipline_logs`, or `delete` where `id` matches.
  The trigger copies the task's current title, time block and points into the new row.
- **Returns:** nothing. The screen updates immediately, then refreshes from the database. If saving fails, it goes back.
  The points balance is refreshed afterwards.
- **Rule:** undo is blocked when it would push the balance below 0 (the points were already spent on a reward).
  The app shows a message instead. The user can delete that reward first, which gives the points back.
- **Code:** `useToggleCheckIn` in `src/features/discipline/today/today-api.ts`

## Points balance

- **What it does:** Points balance = sum of `points_earned` (all check-ins) minus sum of `points_spent` (all rewards).
  It is never stored, only added up, so it cannot get out of step with the records.
- **Used by:** Rewards tab (will show it). Today only refreshes it after each check-in.
- **Supabase call:** `select points_earned` from `discipline_logs` and `select points_spent` from `rewards`.
- **Returns:** a number.
- **Code:** `usePointsBalance` in `src/features/discipline/jar/jar-api.ts`

---

## Rewards table

Table: `rewards`. One row is one thing the user gave themselves, paid for with points.

| Column | Meaning |
|---|---|
| `id` | Reward id |
| `description` | What the reward is (required) |
| `points_spent` | Points it cost (0 or more; the app requires 1 or more and not more than the balance) |
| `reflection` | The note "How does this show my love for myself?" (optional, stored only) |
| `photo_path` | Photo in the private `reward-photos` bucket: `<user id>/<file>.jpg` (optional) |
| `created_at` | When the reward was saved |

## Read the exchange rate

- **What it does:** Gets how many points equal 1 dollar for this user. A settings row is created automatically at sign-up (default 10).
- **Used by:** Rewards tab (balance card).
- **Supabase call:** `select exchange_rate` from `user_settings` (RLS returns only the user's own row).
- **Returns:** a number.
- **Code:** `useExchangeRate` in `src/features/discipline/jar/jar-api.ts`

## Change the exchange rate

- **What it does:** Saves a new points-per-dollar rate. The money equivalent on Rewards updates.
- **Used by:** Rewards tab (Edit next to the rate).
- **Sends:** the new rate (must be greater than 0).
- **Supabase call:** `update` `user_settings` set `exchange_rate` where `user_id` is the user.
- **Errors:** the database rejects a rate of 0 or less.
- **Code:** `useSaveExchangeRate` in `src/features/discipline/jar/jar-api.ts`

## List rewards

- **What it does:** Gets all of the user's rewards, newest first.
- **Used by:** Rewards tab (reward history).
- **Supabase call:** `select` from `rewards` ordered by `created_at` descending.
- **Photos:** the bucket is private, so each photo gets a link that works for one hour (`createSignedUrls`). If a link
  cannot be made, the reward still shows, just without a thumbnail.
- **Returns:** a list of `{ id, description, points_spent, reflection, photo_path, photo_url, created_at }`.
- **Code:** `useRewards` in `src/features/discipline/jar/jar-api.ts`
- **Grouping by month:** all rewards are loaded in one call, and the app groups them by month on the phone
  (`groupRewardsByMonth` in `jar-logic.ts`). This month is shown in full, the 2 months before it are
  folded up (only if they have rewards), and every older month is reached with "Pick a month", which shows just that month.
  Each month shows its newest 5 rewards, with a "Show all" button for the rest. No extra Supabase call is needed.
- **Sign-up month:** comes from the login session (`session.user.created_at`), not from a table. It is used to tell
  "before you started" apart from "no rewards that month".

## Create a reward (Treat yourself)

- **What it does:** Spends points on a reward. The balance is added up from the records, so it drops by itself.
- **Used by:** Treat yourself form (opened from Rewards).
- **Sends:** `{ description, points_spent, reflection }` and an optional photo picked from the library. The app checks first that the description is not empty and the cost
  is at least 1 and not more than the balance.
- **Supabase call:** if there is a photo, `upload` it to the `reward-photos` bucket (JPEG, quality 50%) in the
  user's own folder, then `insert` into `rewards` with `photo_path`. If the insert fails, the uploaded photo is removed again.
- **Returns:** nothing. The rewards list and the balance are refreshed afterwards.
- **Code:** `useCreateReward` in `src/features/discipline/jar/jar-api.ts`

## Delete a reward

- **What it does:** Deletes the reward and its photo for good (not hidden). The points come back by themselves, because the balance is
  added up from the records.
- **Used by:** Rewards tab (Delete on a reward, with a confirmation).
- **Sends:** the reward `id` and its `photo_path`.
- **Supabase call:** `delete` from `rewards` where `id` matches, then `remove` the photo from the bucket if there is one.
- **Returns:** nothing. The rewards list and the balance are refreshed afterwards.
- **Code:** `useDeleteReward` in `src/features/discipline/jar/jar-api.ts`

---

## Points earned each month (chart)

- **What it does:** Gets every check-in's date and points, then adds them up per month, from the first check-in
  (at most the last 6 months) up to this month. A month without check-ins counts as 0. Spending points does not change it.
- **Used by:** Rewards tab (line chart). Refreshed after every check-in or undo.
- **Supabase call:** `select completed_date, points_earned` from `discipline_logs`.
- **Returns:** a list of `{ key, label, total }`, one per month (for example `{ key: '2026-10', label: 'October 2026', total: 50 }`).
- **Code:** `useEarnedByMonth` in `src/features/discipline/jar/jar-api.ts`, calculation (`earnedByMonth`) in `jar-logic.ts`

## Analysis (streak, completion rate, heatmap)

- **What it does:** Gets all of the user's tasks (including deleted ones, because their history still counts) and
  their check-ins, newest first, at most 2000. The app calculates everything else on the phone.
- **Used by:** Analysis tab. Refreshed after every check-in or undo, and after a task is saved or deleted.
- **Supabase calls:** `select id, title, is_active, created_at, archived_at` from `disciplines`, and
  `select discipline_id, completed_date` from `discipline_logs` ordered by `completed_date` descending.
- **How the numbers work:**
  - *A day's completion rate* = tasks done that day / tasks the user had that day. A task counts for a day if it was
    created on or before it and not yet deleted (or if it was done that day), so later changes never rewrite the past.
    Days without tasks are skipped.
  - *Heatmap:* one square per day for the last 84 days. Shade = completion rate (none done = lightest, all done = darkest).
  - *Streak:* days in a row with at least one task done. If today has nothing yet, it counts from yesterday.
  - *30-day average* and *perfect days* (every task done): over the last 30 days, today included.
  - *Each task:* on how many of the last 30 days it was done, and that as a percent of 30 (new tasks included).
  - *Tap a day:* the heatmap square the user taps shows that day's date, "3 of 4 tasks · 75%", and each task with a tick if done.
    It uses the same data, so no extra call is made.
- **Code:** `useAnalysisData` in `src/features/discipline/analysis/analysis-api.ts`, calculations in `analysis-logic.ts`

---

## Not built yet
Nothing for the Rewards and Analysis tabs. Choosing a currency is a separate ticket.
