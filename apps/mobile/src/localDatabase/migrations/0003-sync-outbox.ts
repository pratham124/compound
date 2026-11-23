// One row per change waiting to upload. The body isn't stored: the item's kind reads it when the row uploads, so a
// row always sends the item as it is now. A rejected row stays, with the server's reason and the app version that got it.
export const syncOutboxMigration = {
  name: '0003-sync-outbox',
  sql: `
    CREATE TABLE sync_outbox (
      key TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      item_id TEXT NOT NULL,
      changed_at INTEGER NOT NULL,
      rejected_reason TEXT,
      rejected_app_version TEXT,
      CHECK ((rejected_reason IS NULL) = (rejected_app_version IS NULL))
    );
    CREATE INDEX sync_outbox_by_person ON sync_outbox(user_id, key);
  `,
};
