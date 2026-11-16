-- Identity module: each person's profile, and the first tables under row-level security.

-- The server connects as the database owner and switches to one of these roles, because an owner that is a
-- superuser skips row-level security however it is configured. The owner may switch to them (set) but does not
-- inherit their privileges, so an owner that is not a superuser (RDS) still sees nothing in a table until it
-- has switched.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'compound_api') then
    create role compound_api nologin;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'compound_auth') then
    create role compound_auth nologin;
  end if;
end
$$;

grant compound_api to current_user with inherit false, set true;
grant compound_auth to current_user with inherit false, set true;
grant usage on schema public to compound_api, compound_auth;

-- The id of the person making this request, set per transaction. Null when unset, so a query that forgot to set it sees no rows.
create function app_user_id() returns uuid
language sql stable
as $$ select nullif(current_setting('app.user_id', true), '')::uuid $$;

create table user_profiles (
  user_id uuid primary key references users (id) on delete cascade,
  time_zone text not null,
  -- True while time_zone is a stand-in (UTC) because the phone hasn't reported one yet; the first real zone replaces it.
  time_zone_is_fallback boolean not null default false,
  units text not null check (units in ('metric', 'imperial')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table user_profiles enable row level security;
alter table user_profiles force row level security;

create policy user_profiles_own_rows on user_profiles
  to compound_api
  using (user_id = app_user_id())
  with check (user_id = app_user_id());

grant select, insert, update on user_profiles to compound_api;

-- Sign-in finds and creates accounts before it knows who the person is, so better-auth runs as compound_auth,
-- which may reach every row of users and accounts and nothing else. No other role can reach accounts.
grant select, insert, update on users to compound_auth;
grant select, insert, update, delete on accounts to compound_auth;

alter table accounts enable row level security;
alter table accounts force row level security;

create policy accounts_sign_in on accounts
  to compound_auth
  using (true)
  with check (true);
