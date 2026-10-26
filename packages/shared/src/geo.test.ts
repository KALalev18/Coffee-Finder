import { describe, expect, it } from 'vitest';
import { distanceMeters, formatDistance, walkingMinutes } from './geo';

describe('distanceMeters', () => {
  it('returns 0 for the same point', () => {
    expect(distanceMeters({ lat: 60.17, lng: 24.94 }, { lat: 60.17, lng: 24.94 })).toBe(0);
  });

  it('matches one degree of latitude (~111.2 km)', () => {
    expect(distanceMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111_195, -1);
  });

  it('matches the known Helsinki to Tampere distance (~160 km)', () => {
    const helsinki = { lat: 60.1699, lng: 24.9384 };
    const tampere = { lat: 61.4978, lng: 23.761 };
    expect(distanceMeters(helsinki, tampere) / 1000).toBeCloseTo(160, -1);
  });

  it('is symmetric', () => {
    const a = { lat: 42.7, lng: 27.25 };
    const b = { lat: 42.5, lng: 27.47 };
    expect(distanceMeters(a, b)).toBeCloseTo(distanceMeters(b, a), 6);
  });
});

describe('formatDistance', () => {
  it('shows metres rounded to 10 below 1 km', () => {
    expect(formatDistance(0)).toBe('0 m');
    expect(formatDistance(234)).toBe('230 m');
    expect(formatDistance(994)).toBe('990 m');
  });

  it('switches to kilometres instead of showing "1000 m"', () => {
    expect(formatDistance(996)).toBe('1.0 km');
    expect(formatDistance(1500)).toBe('1.5 km');
  });
});

describe('walkingMinutes', () => {
  it('never returns less than one minute', () => {
    expect(walkingMinutes(10)).toBe(1);
  });

  it('uses about 5 km/h', () => {
    expect(walkingMinutes(830)).toBe(10);
  });
});
