import { describe, expect, it } from 'vitest';
import { RouteMetrics, percentile } from './metrics';

describe('percentile', () => {
  it('uses the nearest-rank method', () => {
    const values = [5, 1, 4, 2, 3, 6, 7, 8, 9, 10];
    expect(percentile(values, 50)).toBe(5);
    expect(percentile(values, 95)).toBe(10);
    expect(percentile([42], 95)).toBe(42);
    expect(percentile([], 50)).toBeNull();
  });
});

describe('RouteMetrics', () => {
  it('reports hit rate, upstream errors and latency', () => {
    const m = new RouteMetrics();
    m.recordCache(false);
    m.recordCache(true);
    m.recordCache(true);
    m.recordUpstream(800, true);
    m.recordUpstream(1200, false);
    m.recordResponse(3);

    expect(m.snapshot()).toEqual({
      cache: { hits: 2, misses: 1, hitRate: 0.667 },
      upstream: { samples: 2, p50Ms: 800, p95Ms: 1200, errors: 1 },
      response: { samples: 1, p50Ms: 3, p95Ms: 3 },
    });
  });

  it('reports a null hit rate before any lookups', () => {
    expect(new RouteMetrics().snapshot().cache.hitRate).toBeNull();
  });
});
