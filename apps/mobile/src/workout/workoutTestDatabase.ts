import type { LocalDatabase } from '../localDatabase/migrations.ts';

type NodeDatabase = {
  exec: (sql: string) => void;
  close: () => void;
  prepare: (sql: string) => {
    run: (...params: (string | number | null)[]) => { changes: number | bigint };
    all: (...params: (string | number | null)[]) => object[];
  };
};

const { DatabaseSync } = jest.requireActual<{ DatabaseSync: new (path: string) => NodeDatabase }>('node:sqlite');

export function openTestDatabase(path = ':memory:') {
  const native = new DatabaseSync(path);

  const db: LocalDatabase = {
    execAsync: async (sql) => { native.exec(sql); },
    runAsync: async (sql, ...params) => ({ changes: Number(native.prepare(sql).run(...params).changes) }),
    getAllAsync: async (sql, ...params) => native.prepare(sql).all(...params),
  };

  return { native, db };
}

export function temporaryWorkoutDatabase() {
  const fs = jest.requireActual<{
    mkdtempSync: (prefix: string) => string;
    existsSync: (path: string) => boolean;
    unlinkSync: (path: string) => void;
    rmdirSync: (path: string) => void;
  }>('node:fs');

  const os = jest.requireActual<{ tmpdir: () => string }>('node:os');
  const directory = fs.mkdtempSync(`${os.tmpdir()}/compound-workout-`);
  const path = `${directory}/compound.db`;

  return {
    open: () => openTestDatabase(path),
    remove: () => {
      for (const file of [path, `${path}-wal`, `${path}-shm`]) {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      }

      fs.rmdirSync(directory);
    },
  };
}
