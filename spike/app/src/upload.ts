import AsyncStorage from '@react-native-async-storage/async-storage';

const URL_KEY = 'serverUrl';
const OUTBOX_KEY = 'outbox';
const LOG_KEY = 'eventLog';
const OUTBOX_CAP = 50;
const LOG_CAP = 30;
const FETCH_TIMEOUT_MS = 8000;

export type Payload = Record<string, unknown>;
export type LogEntry = { at: string; event: string; type?: string; status: 'sent' | 'queued'; note?: string };

export const launchId = Math.random().toString(36).slice(2, 10);

export async function getServerUrl(): Promise<string | null> {
  return AsyncStorage.getItem(URL_KEY);
}

export async function saveServerUrl(url: string): Promise<string> {
  const clean = url.trim().replace(/\/+$/, '');
  await AsyncStorage.setItem(URL_KEY, clean);
  return clean;
}

async function readList<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

export const getLog = () => readList<LogEntry>(LOG_KEY);

async function appendLog(entry: LogEntry): Promise<void> {
  const log = await getLog();
  log.unshift(entry);
  await AsyncStorage.setItem(LOG_KEY, JSON.stringify(log.slice(0, LOG_CAP)));
}

/** Returns null on success, or an error message. */
async function post(payload: Payload): Promise<string | null> {
  const base = await getServerUrl();
  if (!base) return 'no server url';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${base}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    return res.ok ? null : `http ${res.status}`;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  } finally {
    clearTimeout(timer);
  }
}

async function enqueue(payload: Payload): Promise<void> {
  const outbox = await readList<Payload>(OUTBOX_KEY);
  outbox.push(payload);
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox.slice(-OUTBOX_CAP)));
}

/** Try to send everything queued earlier; keep whatever still fails. */
export async function flushOutbox(): Promise<void> {
  const outbox = await readList<Payload>(OUTBOX_KEY);
  if (outbox.length === 0) return;
  const remaining: Payload[] = [];
  let failed = false;
  for (const item of outbox) {
    if (failed) {
      remaining.push(item);
      continue;
    }
    const err = await post({ ...item, flushedFromOutbox: true });
    if (err) {
      failed = true;
      remaining.push(item);
    }
  }
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(remaining));
}

// A cold wake fires the launch event and several observers at once; run uploads
// one at a time so outbox and log read-modify-writes don't clobber each other.
let queue: Promise<void> = Promise.resolve();

export function upload(payload: Payload): Promise<void> {
  queue = queue.then(() => uploadNow(payload)).catch(() => {});
  return queue;
}

async function uploadNow(payload: Payload): Promise<void> {
  await flushOutbox();
  const err = await post(payload);
  if (err) await enqueue(payload);
  await appendLog({
    at: String(payload.readAt),
    event: String(payload.event),
    type: payload.type ? String(payload.type) : undefined,
    status: err ? 'queued' : 'sent',
    note: err ?? undefined,
  });
}
