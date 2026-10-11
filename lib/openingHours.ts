const WEEK = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

/**
 * Checks a simple OSM `opening_hours` value against `now`.
 * Handles the common forms ("24/7", "Mo-Fr 08:00-18:00; Sa 09:00-12:00", "Su off").
 * Returns null when the value is missing or too complex to interpret safely.
 */
export function isOpenNow(spec: string | null, now = new Date()): boolean | null {
  if (!spec) return null;
  const trimmed = spec.trim();
  if (trimmed === '24/7') return true;

  const today = (now.getDay() + 6) % 7; // JS Sunday=0 → index into WEEK (Monday=0)
  const minutes = now.getHours() * 60 + now.getMinutes();
  let result: boolean | null = false; // days not mentioned are closed
  let matchedAny = false;

  for (const raw of trimmed.split(';')) {
    const rule = raw.trim();
    if (!rule) continue;
    if (/^(PH|SH)\b/.test(rule)) continue; // public/school holidays: ignore

    const match = rule.match(/^([A-Z][a-z](?:-[A-Z][a-z])?(?:,[A-Z][a-z](?:-[A-Z][a-z])?)*)?\s*(.*)$/);
    if (!match) return null;
    const [, daySpec, timeSpec] = match;

    if (daySpec) {
      const applies = dayMatches(daySpec, today);
      if (applies === null) return null;
      if (!applies) continue;
    }

    // Later rules override earlier ones, as in the OSM spec.
    const open = timeMatches(timeSpec.trim(), minutes);
    if (open === null) return null;
    result = open;
    matchedAny = true;
  }

  return matchedAny ? result : false;
}

function dayMatches(daySpec: string, today: number): boolean | null {
  for (const part of daySpec.split(',')) {
    const [from, to] = part.split('-');
    const start = WEEK.indexOf(from);
    const end = to ? WEEK.indexOf(to) : start;
    if (start < 0 || end < 0) return null;
    const inRange = start <= end ? today >= start && today <= end : today >= start || today <= end;
    if (inRange) return true;
  }
  return false;
}

function timeMatches(timeSpec: string, minutes: number): boolean | null {
  if (timeSpec === '' || timeSpec === '24/7') return true; // "Mo-Fr" alone means all day
  if (timeSpec === 'off' || timeSpec === 'closed') return false;

  for (const range of timeSpec.split(',')) {
    const m = range.trim().match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})\+?$/);
    if (!m) return null;
    const start = Number(m[1]) * 60 + Number(m[2]);
    const end = Number(m[3]) * 60 + Number(m[4]);
    // end <= start means the range runs past midnight.
    const open = end > start ? minutes >= start && minutes < end : minutes >= start || minutes < end;
    if (open) return true;
  }
  return false;
}
