import type { Generated } from 'kysely';

// Written by hand to match migrations/0002_user_profiles.sql. There is no code generation: a migration that changes a
// column changes this file in the same commit.

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
  user_profiles: UserProfilesTable;
};
