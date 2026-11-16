import type pg from 'pg';

/** Tables with a user_id column that do not have row-level security both enabled and forced. */
export async function tablesMissingForcedRowLevelSecurity(db: pg.Pool | pg.PoolClient): Promise<string[]> {
  const result = await db.query<{ name: string }>(
    `select c.relname as name
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       join pg_attribute a on a.attrelid = c.oid and a.attname = 'user_id' and not a.attisdropped
      where c.relkind in ('r', 'p')
        and n.nspname not in ('pg_catalog', 'information_schema', 'pg_toast')
        and not (c.relrowsecurity and c.relforcerowsecurity)
      order by c.relname`,
  );

  return result.rows.map(({ name }) => name);
}
