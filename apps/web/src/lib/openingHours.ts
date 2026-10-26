/**
 * A small parser for the most common forms of OpenStreetMap's `opening_hours` tag,
 * e.g. "Mo-Fr 07:00-18:00; Sa,Su 09:00-16:00; PH off" or "Fr,Sa 18:00-02:00".
 *
 * Supported: 24/7, weekday lists and ranges (including wrap-around like Sa-Mo),
 * several time spans per day, overnight spans, "off"/"closed", later rules overriding
 * earlier ones, and comma-separated additional rules. Anything else (months, week
 * numbers, sunrise, comments, "||" fallbacks) returns null, so the UI says nothing
 * rather than guessing. Public and school holiday selectors are ignored.
 */

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const DAY = '(?:Mo|Tu|We|Th|Fr|Sa|Su|PH|SH)';
const RULE = new RegExp(`^(${DAY}(?:\\s*[-,]\\s*${DAY})*)?\\s*(.*)$`);
// "Mo-Fr 08:00-12:00, Sa 09:00-13:00": a comma right after a time starts an additional rule.
const ADDITIONAL_RULE = new RegExp(`(?<=\\d),\\s*(?=${DAY}\\b)`);
const DAY_MINUTES = 24 * 60;

/** [start, end) in minutes from midnight; `end` is above 1440 for spans past midnight. */
type Interval = [number, number];

/** Opening intervals per weekday, Monday first. */
export type WeekSchedule = Interval[][];

function toMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const [hours, minutes] = [Number(match[1]), Number(match[2])];
  if (hours > 24 || minutes > 59 || (hours === 24 && minutes > 0)) return null;
  return hours * 60 + minutes;
}

function parseDays(selector: string): number[] | null {
  const days = new Set<number>();
  for (const part of selector.split(',')) {
    if (part === 'PH' || part === 'SH') continue;
    const [first, last = first] = part.split('-');
    const from = DAYS.indexOf(first);
    const to = DAYS.indexOf(last);
    if (from < 0 || to < 0) return null;
    for (let d = from; ; d = (d + 1) % 7) {
      days.add(d);
      if (d === to) break;
    }
  }
  return [...days];
}

function parseTimes(selector: string): Interval[] | null {
  const intervals: Interval[] = [];
  for (const span of selector.split(',')) {
    const [from, to, extra] = span.split('-');
    if (to === undefined || extra !== undefined) return null;
    const start = toMinutes(from);
    const end = toMinutes(to);
    if (start === null || end === null) return null;
    intervals.push([start, end <= start ? end + DAY_MINUTES : end]);
  }
  return intervals;
}

export function parseOpeningHours(spec: string): WeekSchedule | null {
  const text = spec.trim();
  if (!text) return null;
  if (text === '24/7') return DAYS.map(() => [[0, DAY_MINUTES]]);

  const week: WeekSchedule = DAYS.map(() => []);
  for (const group of text.split(';')) {
    for (const [index, rule] of group.split(ADDITIONAL_RULE).entries()) {
      const trimmed = rule.trim();
      if (!trimmed) continue;

      const [, daySelector, rest] = RULE.exec(trimmed)!;
      const days = daySelector ? parseDays(daySelector.replace(/\s/g, '')) : [0, 1, 2, 3, 4, 5, 6];
      if (!days) return null;
      if (days.length === 0) continue; // only holidays, which we can't know about

      let intervals: Interval[] | null;
      if (rest === 'off' || rest === 'closed') intervals = [];
      else if (rest === '24/7') intervals = [[0, DAY_MINUTES]];
      else intervals = rest ? parseTimes(rest.replace(/\s/g, '')) : null;
      if (!intervals) return null;

      const additional = index > 0;
      for (const d of days) week[d] = additional ? [...week[d], ...intervals] : intervals;
    }
  }
  return week;
}

/** true/false when the hours are understood, null when they are missing or unsupported. */
export function isOpenAt(spec: string | undefined, date: Date): boolean | null {
  const week = spec ? parseOpeningHours(spec) : null;
  if (!week) return null;

  const today = (date.getDay() + 6) % 7;
  const yesterday = (today + 6) % 7;
  const now = date.getHours() * 60 + date.getMinutes();
  return (
    week[today].some(([start, end]) => now >= start && now < end) ||
    week[yesterday].some(([, end]) => now + DAY_MINUTES < end)
  );
}
