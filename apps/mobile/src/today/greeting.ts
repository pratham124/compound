/** "Good morning" before noon, "Good afternoon" until 18:00, then "Good evening", by the phone's local time. */
function partOfDay(now: Date): string {
  const hour = now.getHours();

  if (hour < 12) {
    return 'Good morning';
  }

  return hour < 18 ? 'Good afternoon' : 'Good evening';
}

/** "Good morning, Pratham." with the first word of the name, or just "Good morning." when there is no name. */
export function greetingFor({ now, name }: { now: Date; name: string }): string {
  const firstName = name.trim().split(/\s+/)[0] ?? '';

  return firstName === '' ? `${partOfDay(now)}.` : `${partOfDay(now)}, ${firstName}.`;
}

/** "Saturday, 7 November": weekday, day, month, no year, in day-month order. */
export function dateLineFor(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((candidate) => candidate.type === type)?.value ?? '';

  return `${part('weekday')}, ${part('day')} ${part('month')}`;
}
