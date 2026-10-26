import { describe, expect, it } from 'vitest';
import { isOpenAt, parseOpeningHours } from './openingHours';

// 2026-10-26 is a Monday. Dates are built in local time, like the browser uses.
const at = (day: number, time: string) => {
  const [h, m] = time.split(':').map(Number);
  return new Date(2026, 9, 26 + day, h, m);
};
const MON = 0;
const FRI = 4;
const SAT = 5;
const SUN = 6;

describe('isOpenAt', () => {
  it('handles weekday ranges and closes on unlisted days', () => {
    const spec = 'Mo-Fr 07:00-18:00';
    expect(isOpenAt(spec, at(MON, '06:59'))).toBe(false);
    expect(isOpenAt(spec, at(MON, '07:00'))).toBe(true);
    expect(isOpenAt(spec, at(FRI, '17:59'))).toBe(true);
    expect(isOpenAt(spec, at(FRI, '18:00'))).toBe(false);
    expect(isOpenAt(spec, at(SAT, '12:00'))).toBe(false);
  });

  it('handles several rules, day lists and "off"', () => {
    const spec = 'Mo-Fr 08:00-17:00; Sa,Su 10:00-16:00; Su off';
    expect(isOpenAt(spec, at(SAT, '11:00'))).toBe(true);
    expect(isOpenAt(spec, at(SUN, '11:00'))).toBe(false);
  });

  it('handles a lunch break', () => {
    const spec = 'Mo-Fr 08:00-12:00,13:00-17:00';
    expect(isOpenAt(spec, at(MON, '12:30'))).toBe(false);
    expect(isOpenAt(spec, at(MON, '13:30'))).toBe(true);
  });

  it('treats a comma after a time as an additional rule', () => {
    const spec = 'Mo-Fr 07:00-18:00, Sa 09:00-15:00';
    expect(isOpenAt(spec, at(MON, '08:00'))).toBe(true);
    expect(isOpenAt(spec, at(SAT, '10:00'))).toBe(true);
  });

  it('carries overnight hours into the next morning', () => {
    const spec = 'Fr,Sa 18:00-02:00';
    expect(isOpenAt(spec, at(FRI, '23:30'))).toBe(true);
    expect(isOpenAt(spec, at(SAT, '01:30'))).toBe(true);
    expect(isOpenAt(spec, at(SAT, '02:00'))).toBe(false);
    expect(isOpenAt(spec, at(SUN, '01:00'))).toBe(true);
    expect(isOpenAt(spec, at(MON, '01:00'))).toBe(false);
  });

  it('handles 24/7, wrap-around ranges and 24:00', () => {
    expect(isOpenAt('24/7', at(SUN, '03:00'))).toBe(true);
    expect(isOpenAt('Sa-Mo 10:00-24:00', at(MON, '23:59'))).toBe(true);
    expect(isOpenAt('Sa-Mo 10:00-24:00', at(FRI, '12:00'))).toBe(false);
  });

  it('ignores public holiday rules', () => {
    const spec = 'Mo-Sa 07:00-21:00; Su,PH 09:00-18:00; PH off';
    expect(isOpenAt(spec, at(SUN, '10:00'))).toBe(true);
  });

  it.each([
    undefined,
    '',
    'Mo-Fr',
    'sunrise-sunset',
    'Jan-Mar Mo-Fr 08:00-16:00',
    'Mo-Fr 08:00-17:00 || "by appointment"',
    'Mo-Fr 07:00+',
    'Mo-Fr 25:00-26:00',
    'Xy 08:00-12:00',
  ])('returns null for unsupported or missing hours: %s', (spec) => {
    expect(isOpenAt(spec, at(MON, '12:00'))).toBeNull();
  });
});

describe('parseOpeningHours', () => {
  it('lets later rules override earlier ones for the same day', () => {
    const week = parseOpeningHours('Mo-Su 08:00-20:00; We 10:00-12:00')!;
    expect(week[2]).toEqual([[600, 720]]);
    expect(week[3]).toEqual([[480, 1200]]);
  });
});
