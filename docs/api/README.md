# API docs

Cogsplint has no server of its own. The app calls Supabase directly (through `supabase-js`),
and Postgres RLS (`user_id = auth.uid()`) makes sure each user only touches their own rows.

These docs describe every data operation the app makes, grouped by product:

- [discipline.md](discipline.md): Daily Discipline (Today, Manage, Rewards, Analysis)

When a ticket adds or changes a data operation, update the doc of its product in the same PR.
