-- Identity module (PRD section 12): people and the sign-in methods linked to them.
-- Sessions and one-time codes are not here; they live in Valkey.
create table users (
  id uuid primary key,
  name text not null,
  email text not null unique,
  email_verified boolean not null,
  image text,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table accounts (
  id uuid primary key,
  account_id text not null,
  provider_id text not null,
  user_id uuid not null references users (id) on delete cascade,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  -- Never set (no passwords), but better-auth checks that the column exists.
  password text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (provider_id, account_id)
);

create index accounts_user_id_idx on accounts (user_id);
