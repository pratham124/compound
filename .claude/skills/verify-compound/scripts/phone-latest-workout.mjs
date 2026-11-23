// Prints the id of the newest finished workout in a copy of the phone's compound.db (with its -wal beside it, if any).
// Usage: node phone-latest-workout.mjs <folder holding compound.db>
import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';

const folder = process.argv[2];

if (folder === undefined) {
  console.error('Usage: node phone-latest-workout.mjs <folder holding compound.db>');
  process.exit(2);
}

// Opened writable: SQLite needs that to read a WAL copied beside the file. It is a copy, never the phone's own file.
const db = new DatabaseSync(join(folder, 'compound.db'));

try {
  const row = db.prepare('SELECT id FROM workouts WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1').get();

  if (row === undefined) {
    console.error('The phone has no finished workout');
    process.exit(1);
  }

  console.log(row.id);
} finally {
  db.close();
}
