import { isOpenNow } from '@/lib/openingHours';

// 13 November 2026 is a Friday.
const at = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute);
const FRI = 13;
const SAT = 14;

describe('isOpenNow', () => {
  it('returns null when the hours are missing', () => {
    expect(isOpenNow(null, at(FRI, 12))).toBeNull();
    expect(isOpenNow('', at(FRI, 12))).toBeNull();
  });

  it('treats 24/7 as always open', () => {
    expect(isOpenNow('24/7', at(FRI, 3))).toBe(true);
  });

  it('handles day ranges with hours', () => {
    expect(isOpenNow('Mo-Fr 08:00-18:00', at(FRI, 9))).toBe(true);
    expect(isOpenNow('Mo-Fr 08:00-18:00', at(FRI, 18))).toBe(false); // the end time is exclusive
    expect(isOpenNow('Mo-Fr 08:00-18:00', at(SAT, 9))).toBe(false); // days not mentioned are closed
  });

  it('applies later rules over earlier ones', () => {
    expect(isOpenNow('Mo-Fr 08:00-18:00; Fr off', at(FRI, 9))).toBe(false);
    expect(isOpenNow('Mo-Su 08:00-20:00; Sa 10:00-14:00', at(SAT, 9))).toBe(false);
  });

  it('handles split hours', () => {
    expect(isOpenNow('Mo-Fr 08:00-12:00,13:00-17:00', at(FRI, 12, 30))).toBe(false);
    expect(isOpenNow('Mo-Fr 08:00-12:00,13:00-17:00', at(FRI, 14))).toBe(true);
  });

  it("counts overnight hours on the day they start, not the day they end", () => {
    // Friday 22:00 to Saturday 03:00.
    expect(isOpenNow('Fr 22:00-03:00', at(FRI, 1))).toBe(false);
    expect(isOpenNow('Fr 22:00-03:00', at(FRI, 23))).toBe(true);
    expect(isOpenNow('Fr 22:00-03:00', at(SAT, 1))).toBe(true);
    expect(isOpenNow('Fr 22:00-03:00', at(SAT, 4))).toBe(false);
    expect(isOpenNow('Mo-Su 06:00-02:00', at(SAT, 1))).toBe(true);
  });

  it("doesn't carry an all-day rule into the next morning", () => {
    expect(isOpenNow('Fr', at(FRI, 12))).toBe(true);
    expect(isOpenNow('Fr', at(SAT, 1))).toBe(false);
  });

  it('accepts 24:00 as the end of the day', () => {
    expect(isOpenNow('Mo-Su 00:00-24:00', at(SAT, 0))).toBe(true);
  });

  it('ignores holiday rules', () => {
    expect(isOpenNow('08:00-20:00; PH off', at(FRI, 12))).toBe(true);
  });

  it('gives up (null) on forms it can\'t read safely', () => {
    expect(isOpenNow('sunrise-sunset', at(FRI, 12))).toBeNull();
    expect(isOpenNow('Apr-Oct Mo-Su 08:00-20:00', at(FRI, 12))).toBeNull();
  });
});
