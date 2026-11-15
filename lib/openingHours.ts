const WEEK = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const DAY_MINUTES = 24 * 60;

/**
 * Checks a simple OSM `opening_hours` value against `now`.
 * Handles the common forms ("24/7", "Mo-Fr 08:00-18:00; Sa 09:00-12:00", "Su off") and ranges
 * that run past midnight ("Fr 22:00-03:00" is open early on Saturday, not early on Friday).
 * Returns null when the value is missing or too complex to interpret safely.
 */
export function isOpenNow(spec: string | null, now = new Date()): boolean | null {
  if (!spec) return null;
  const trimmed = spec.trim();
  if (trimmed === '24/7') return true;

  const today = (now.getDay() + 6) % 7; // JS Sunday=0 → index into WEEK (Monday=0)
  const minutes = now.getHours() * 60 + now.getMinutes();

  // Today's own hours, or the tail of yesterday's hours that ran past midnight.
  const openToday = dayOpen(trimmed, today, minutes);
  if (openToday === null) return null;
  if (openToday) return true;
  return dayOpen(trimmed, (today + 6) % 7, minutes + DAY_MINUTES);
}

/**
 * Whether the rules for `day` cover `minutes`, counted from that day's midnight
 * (so 1500 means 01:00 the next morning).
 */
function dayOpen(spec: string, day: number, minutes: number): boolean | null {
  let result = false; // days not mentioned are closed

  for (const raw of spec.split(';')) {
    const rule = raw.trim();
    if (!rule) continue;
    if (/^(PH|SH)\b/.test(rule)) continue; // public/school holidays: ignore

    const match = rule.match(/^([A-Z][a-z](?:-[A-Z][a-z])?(?:,[A-Z][a-z](?:-[A-Z][a-z])?)*)?\s*(.*)$/);
    if (!match) return null;
    const [, daySpec, timeSpec] = match;

    if (daySpec) {
      const applies = dayMatches(daySpec, day);
      if (applies === null) return null;
      if (!applies) continue;
    }

    // Later rules override earlier ones, as in the OSM spec.
    const open = timeMatches(timeSpec.trim(), minutes);
    if (open === null) return null;
    result = open;
  }

  return result;
}

function dayMatches(daySpec: string, day: number): boolean | null {
  for (const part of daySpec.split(',')) {
    const [from, to] = part.split('-');
    const start = WEEK.indexOf(from);
    const end = to ? WEEK.indexOf(to) : start;
    if (start < 0 || end < 0) return null;
    const inRange = start <= end ? day >= start && day <= end : day >= start || day <= end;
    if (inRange) return true;
  }
  return false;
}

function timeMatches(timeSpec: string, minutes: number): boolean | null {
  // "Mo-Fr" alone means all day, but only that day: it doesn't spill into the next morning.
  if (timeSpec === '' || timeSpec === '24/7') return minutes < DAY_MINUTES;
  if (timeSpec === 'off' || timeSpec === 'closed') return false;

  let open = false;
  for (const range of timeSpec.split(',')) {
    const m = range.trim().match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})\+?$/);
    if (!m) return null;
    const start = Number(m[1]) * 60 + Number(m[2]);
    let end = Number(m[3]) * 60 + Number(m[4]);
    // end <= start means the range runs past midnight into the next day.
    if (end <= start) end += DAY_MINUTES;
    if (minutes >= start && minutes < end) open = true;
  }
  return open;
}
