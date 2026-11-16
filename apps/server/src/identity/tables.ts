import type { ColumnType, Generated } from 'kysely';

// Written by hand to match migrations/0001_identity.sql and 0002_user_profiles.sql. There is no code generation: a
// migration that changes a column changes this file in the same commit.

type Timestamp = ColumnType<Date, Date | string, Date | string>;

export type UsersTable = {
  id: string;
  name: string;
  email: string;
  email_verified: boolean;
  image: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type AccountsTable = {
  id: string;
  account_id: string;
  provider_id: string;
  user_id: string;
  access_token: string | null;
  refresh_token: string | null;
  id_token: string | null;
  access_token_expires_at: Timestamp | null;
  refresh_token_expires_at: Timestamp | null;
  scope: string | null;
  password: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type UserProfilesTable = {
  user_id: string;
  time_zone: string;
  units: 'metric' | 'imperial';
  /** True while time_zone is a stand-in (UTC) because the phone hasn't reported one yet. */
  time_zone_is_fallback: Generated<boolean>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
};

export type IdentityDatabase = {
  users: UsersTable;
  accounts: AccountsTable;
  user_profiles: UserProfilesTable;
};
