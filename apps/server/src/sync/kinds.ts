import type { UserId } from "@compound/contracts";
import { z } from "zod";

import type { UserQuery } from "../identity/profileStore.ts";

export type SyncTarget = { userId: UserId; itemId: string };

export type SyncWrite = (query: UserQuery, target: SyncTarget) => Promise<void>;

/**
 * What a module describes to make one kind of item syncable: its name, the shape of its body and how to store the
 * winning version. The sync module owns the protocol, idempotency and last-write-wins; `write` runs only for a change
 * that has already won, inside the request's transaction, and replaces the stored item with `body`.
 */
export type SyncKind<Body> = {
  kind: string;
  body: z.ZodType<Body>;
  write: (query: UserQuery, item: SyncTarget & { body: Body }) => Promise<void>;
};

/** A kind as the sync module sees it: parsing a change's body gives the write that stores it. */
export type RegisteredKind = { kind: string; change: z.ZodType<SyncWrite> };

export function defineSyncKind<Body>({
  kind,
  body,
  write,
}: SyncKind<Body>): RegisteredKind {
  return {
    kind,
    change: body.transform(
      (parsed): SyncWrite =>
        (query, target) =>
          write(query, { ...target, body: parsed }),
    ),
  };
}
