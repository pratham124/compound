--------------------------- MODULE OfflineReplay ---------------------------
(***************************************************************************)
(* Compound's upload outbox and the server's sync endpoint, for the promise *)
(* "an offline replay never creates a duplicate set" (PRD section 5).       *)
(*                                                                         *)
(* Two devices finish or edit workouts offline. Each queued change is      *)
(* uploaded in batches that can be lost on the way, lost on the way back   *)
(* (a timeout, a killed app), sent again while the first copy is still in  *)
(* flight, or failed by the server part-way (a deadlock or a timeout). The *)
(* server applies a batch in one transaction, one change at a time.        *)
(*                                                                         *)
(* Code each action stands for:                                            *)
(*   Finish   apps/mobile/src/localDatabase/migrations/0004-workout-sync.ts *)
(*            (the trigger writes the outbox row with the finished workout)*)
(*   Send     apps/mobile/src/sync/syncRunner.ts pass() and its upload     *)
(*   Answer   syncRunner.ts settle()                                       *)
(*   Begin, Step, Abort, Commit                                            *)
(*            apps/server/src/sync/applyChanges.ts (the withUser           *)
(*            transaction, CLAIM, kind write, which errors fail the batch) *)
(*   the write in Step                                                     *)
(*            apps/server/src/workouts/workoutStore.ts workoutKind: delete *)
(*            the workout's exercises (their sets go by cascade), then     *)
(*            insert the body's sets under the key (user_id, id)           *)
(*                                                                         *)
(* Each flag is TRUE for the code as it is; each cfg in broken/ turns one  *)
(* off to show the invariant it guards failing.                            *)
(***************************************************************************)
EXTENDS Naturals, FiniteSets, Sequences, TLC

CONSTANTS
    ClaimIsConditional,    \* CLAIM's where (changed_at, change_key) < excluded
    ClaimLocks,            \* CLAIM is one statement holding the sync_versions row lock to commit
    DeleteBeforeInsert,    \* workoutKind.write deletes the workout's exercises first
    SetIdIsPrimaryKey,     \* workout_sets primary key (user_id, id)
    KeepRowsUntilAnswered, \* the runner removes a row only on the server's answer
    MaxSends               \* bound on uploads, so the state space is finite

Devices == {"phone", "tablet"}
Items   == {"A", "B"}
None    == "none"

\* Each change is one queued outbox row. Rank stands for (changedAt, key), the
\* pair CLAIM compares. a2 is a later edit of workout A made on the tablet: it
\* keeps set s1 and drops s2.
Changes   == {"a1", "a2", "b1"}
ItemOf    == [c \in Changes |-> IF c = "b1" THEN "B" ELSE "A"]
DevOf     == [c \in Changes |-> IF c = "a2" THEN "tablet" ELSE "phone"]
Rank      == [c \in Changes |-> IF c = "a2" THEN 2 ELSE 1]
SetsOf    == [c \in Changes |-> CASE c = "a1" -> {"s1", "s2"}
                                 [] c = "a2" -> {"s1"}
                                 [] c = "b1" -> {"s3"}]
SetIds    == {"s1", "s2", "s3"}
ItemOfSet == [s \in SetIds |-> IF s = "s3" THEN "B" ELSE "A"]

Newer(c, v) == v = None \/ Rank[c] > Rank[v]

\* A batch is applied in item order (applyChanges sorts by kind and itemId).
ItemOrder == [i \in Items |-> IF i = "A" THEN 1 ELSE 2]

RECURSIVE SortedSeq(_)
SortedSeq(S) == IF S = {} THEN << >>
                ELSE LET c == CHOOSE x \in S : \A y \in S : ItemOrder[ItemOf[x]] <= ItemOrder[ItemOf[y]]
                     IN <<c>> \o SortedSeq(S \ {c})

VARIABLES
    made,      \* changes finished or edited on their device so far
    pending,   \* device -> outbox rows still waiting
    rejected,  \* device -> outbox rows the server rejected (kept, not retried)
    requests,  \* uploads on their way to the server
    answers,   \* answers on their way back
    txs,       \* server transactions in progress, by request id
    versions,  \* sync_versions, committed: item -> winning change
    stored,    \* workout_sets, committed: set id -> number of rows
    seen,      \* changes the server has committed an answer for
    sends

vars == <<made, pending, rejected, requests, answers, txs, versions, stored, seen, sends>>

Init ==
    /\ made = {}
    /\ pending = [d \in Devices |-> {}]
    /\ rejected = [d \in Devices |-> {}]
    /\ requests = {}
    /\ answers = {}
    /\ txs = [r \in {} |-> 0]
    /\ versions = [i \in Items |-> None]
    /\ stored = [s \in SetIds |-> 0]
    /\ seen = {}
    /\ sends = 0

Finish(c) ==
    /\ c \notin made
    /\ made' = made \cup {c}
    /\ pending' = [pending EXCEPT ![DevOf[c]] = @ \cup {c}]
    /\ UNCHANGED <<rejected, requests, answers, txs, versions, stored, seen, sends>>

\* Several uploads of the same rows can be in flight: a timed-out request still runs
\* on the server while the runner, or the app after a restart, sends the rows again.
Send(d, batch) ==
    /\ sends < MaxSends
    /\ batch # {} /\ batch \subseteq pending[d]
    /\ requests' = requests \cup {[id |-> sends, dev |-> d, batch |-> batch]}
    /\ sends' = sends + 1
    /\ pending' = IF KeepRowsUntilAnswered THEN pending ELSE [pending EXCEPT ![d] = @ \ batch]
    /\ UNCHANGED <<made, rejected, answers, txs, versions, stored, seen>>

LoseRequest(r) ==
    /\ requests' = requests \ {r}
    /\ UNCHANGED <<made, pending, rejected, answers, txs, versions, stored, seen, sends>>

Begin(r) ==
    /\ requests' = requests \ {r}
    /\ txs' = txs @@ (r.id :> [dev |-> r.dev, todo |-> SortedSeq(r.batch), locks |-> {},
                                buf |-> [i \in {} |-> None], rows |-> [s \in {} |-> 0],
                                outcomes |-> [c \in {} |-> "none"]])
    /\ UNCHANGED <<made, pending, rejected, answers, versions, stored, seen, sends>>

\* An item's version and rows as a transaction sees them: its own writes, else committed.
VersionIn(t, i) == IF i \in DOMAIN t.buf THEN t.buf[i] ELSE versions[i]
RowsIn(t, s)    == IF s \in DOMAIN t.rows THEN t.rows[s] ELSE stored[s]

\* One change of a transaction: CLAIM, then on a win the kind's write, on a savepoint.
Step(id) ==
    LET t           == txs[id]
        c           == Head(t.todo)
        i           == ItemOf[c]
        wins        == ~ClaimIsConditional \/ Newer(c, VersionIn(t, i))
        itemSets    == {s \in SetIds : ItemOfSet[s] = i}
        afterDelete == [s \in itemSets |-> IF DeleteBeforeInsert THEN 0 ELSE RowsIn(t, s)]
        conflict    == SetIdIsPrimaryKey /\ \E s \in SetsOf[c] : afterDelete[s] > 0
        newRows     == [s \in itemSets |-> afterDelete[s] + (IF s \in SetsOf[c] THEN 1 ELSE 0)]
        outcome     == IF ~wins THEN "stale" ELSE IF conflict THEN "rejected" ELSE "applied"
    IN
    /\ t.todo # << >>
    \* Another transaction holding this item's row lock makes this CLAIM wait for it to end.
    /\ ClaimLocks => \A o \in DOMAIN txs \ {id} : i \notin txs[o].locks
    /\ txs' = [txs EXCEPT ![id] =
                 [t EXCEPT !.todo     = Tail(t.todo),
                           !.locks    = IF ClaimLocks /\ wins THEN @ \cup {i} ELSE @,
                           !.buf      = IF outcome = "applied"
                                          THEN [x \in DOMAIN @ \cup {i} |-> IF x = i THEN c ELSE @[x]]
                                          ELSE @,
                           !.rows     = IF outcome = "applied"
                                          THEN [s \in DOMAIN @ \cup itemSets |-> IF s \in itemSets THEN newRows[s] ELSE @[s]]
                                          ELSE @,
                           !.outcomes = @ @@ (c :> outcome)]]
    /\ UNCHANGED <<made, pending, rejected, requests, answers, versions, stored, seen, sends>>

\* A deadlock, serialization failure or timeout: all of it rolls back and the phone gets no answer.
Abort(id) ==
    /\ txs' = [o \in DOMAIN txs \ {id} |-> txs[o]]
    /\ UNCHANGED <<made, pending, rejected, requests, answers, versions, stored, seen, sends>>

Commit(id) ==
    LET t == txs[id] IN
    /\ t.todo = << >>
    /\ versions' = [i \in Items |-> IF i \in DOMAIN t.buf THEN t.buf[i] ELSE versions[i]]
    /\ stored' = [s \in SetIds |-> IF s \in DOMAIN t.rows THEN t.rows[s] ELSE stored[s]]
    /\ seen' = seen \cup DOMAIN t.outcomes
    /\ answers' = answers \cup {[id |-> id, dev |-> t.dev, outcomes |-> t.outcomes]}
    /\ txs' = [o \in DOMAIN txs \ {id} |-> txs[o]]
    /\ UNCHANGED <<made, pending, rejected, requests, sends>>

LoseAnswer(a) ==
    /\ answers' = answers \ {a}
    /\ UNCHANGED <<made, pending, rejected, requests, txs, versions, stored, seen, sends>>

Answer(a) ==
    LET settled == {c \in DOMAIN a.outcomes : a.outcomes[c] \in {"applied", "stale"}}
        refused == {c \in DOMAIN a.outcomes : a.outcomes[c] = "rejected"}
    IN
    /\ answers' = answers \ {a}
    /\ pending' = [pending EXCEPT ![a.dev] = @ \ (settled \cup refused)]
    /\ rejected' = [rejected EXCEPT ![a.dev] = @ \cup (refused \ settled)]
    /\ UNCHANGED <<made, requests, txs, versions, stored, seen, sends>>

Next ==
    \/ \E c \in Changes : Finish(c)
    \/ \E d \in Devices : \E b \in SUBSET pending[d] : Send(d, b)
    \/ \E r \in requests : LoseRequest(r) \/ Begin(r)
    \/ \E id \in DOMAIN txs : Step(id) \/ Abort(id) \/ Commit(id)
    \/ \E a \in answers : LoseAnswer(a) \/ Answer(a)

Spec == Init /\ [][Next]_vars

-----------------------------------------------------------------------------
\* The promise: no set is ever stored twice.
NoDuplicateSet == \A s \in SetIds : stored[s] <= 1

\* A workout's stored sets are exactly its winning change's: no set from a replayed
\* or older upload lingers beside them.
StoredIsWinner ==
    \A i \in Items :
        {s \in SetIds : ItemOfSet[s] = i /\ stored[s] > 0}
            = IF versions[i] = None THEN {} ELSE SetsOf[versions[i]]

\* The stored version is the newest change the server has answered for, so a replay
\* of an older upload never wins over a newer edit.
NewestWins == \A c \in seen : versions[ItemOf[c]] # None /\ Rank[c] <= Rank[versions[ItemOf[c]]]

\* The phone drops a row only once the server holds that change or a newer one.
NothingLost ==
    \A c \in made :
        (c \notin pending[DevOf[c]] /\ c \notin rejected[DevOf[c]])
            => (versions[ItemOf[c]] # None /\ Rank[c] <= Rank[versions[ItemOf[c]]])

\* Once every change is made and nothing is queued, in flight or rejected, the server
\* holds each workout's newest change.
QuiescentSynced ==
    (made = Changes /\ requests = {} /\ answers = {} /\ DOMAIN txs = {}
        /\ \A d \in Devices : pending[d] = {} /\ rejected[d] = {})
      => \A c \in Changes : versions[ItemOf[c]] # None /\ Rank[c] <= Rank[versions[ItemOf[c]]]
=============================================================================
