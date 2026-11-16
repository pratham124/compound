import { DummyDriver, Kysely, PostgresAdapter, PostgresIntrospector, PostgresQueryCompiler } from 'kysely';

/**
 * A Kysely that only writes SQL. It has no connection, so nothing can run through it: callers `.compile()` a query and send
 * it themselves (see `withUser`), which keeps the first query in the same round trip as the transaction setup. Kysely's own
 * execution and `transaction()` send one statement and wait, which would break that.
 */
export function createQueryBuilder<Database>(): Kysely<Database> {
  return new Kysely<Database>({
    dialect: {
      createAdapter: () => new PostgresAdapter(),
      createDriver: () => new DummyDriver(),
      createIntrospector: (db) => new PostgresIntrospector(db),
      createQueryCompiler: () => new PostgresQueryCompiler(),
    },
  });
}
