import { uuid } from 'expo';

const TIMESTAMP_HEX = 12;

/** RFC 9562 UUIDv7 built from Expo's random v4, so new ids sort by creation time. v4 already sets the variant nibble. */
export function uuidv7(now: number = Date.now()): string {
  const hex = uuid.v4().replaceAll('-', '');
  const timestamp = now.toString(16).padStart(TIMESTAMP_HEX, '0');
  const joined = `${timestamp}7${hex.slice(TIMESTAMP_HEX + 1)}`;

  return `${joined.slice(0, 8)}-${joined.slice(8, 12)}-${joined.slice(12, 16)}-${joined.slice(16, 20)}-${joined.slice(20)}`;
}
