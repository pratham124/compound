-- Sync module: the phone's uploads, for every kind of item (workouts now; routines and custom exercises later).

-- One row per synced item: the change that last won (last write wins, ties broken by idempotency key). A replayed
-- or older change loses to it and writes nothing.
create table sync_versions (
  user_id uuid not null references users (id) on delete cascade,
  kind text not null,
  item_id uuid not null,
  changed_at timestamptz not null,
  change_key uuid not null,
  primary key (user_id, kind, item_id)
);

alter table sync_versions enable row level security;
alter table sync_versions force row level security;

create policy sync_versions_own_rows on sync_versions to compound_api
  using (user_id = app_user_id()) with check (user_id = app_user_id());

grant select, insert, update on sync_versions to compound_api;
