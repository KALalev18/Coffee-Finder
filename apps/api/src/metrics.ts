const SAMPLE_SIZE = 1000;

/** Nearest-rank percentile of `values` (0 < p <= 100). Returns null for an empty list. */
export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];
}

/** Keeps the most recent `SAMPLE_SIZE` durations so memory stays bounded. */
class Durations {
  private readonly values: number[] = [];

  add(ms: number) {
    this.values.push(ms);
    if (this.values.length > SAMPLE_SIZE) this.values.shift();
  }

  summary() {
    const round = (ms: number | null) => (ms === null ? null : Math.round(ms));
    return {
      samples: this.values.length,
      p50Ms: round(percentile(this.values, 50)),
      p95Ms: round(percentile(this.values, 95)),
    };
  }
}

export class RouteMetrics {
  private hits = 0;
  private misses = 0;
  private upstreamErrors = 0;
  private readonly upstream = new Durations();
  private readonly response = new Durations();

  recordCache(hit: boolean) {
    if (hit) this.hits++;
    else this.misses++;
  }

  recordUpstream(ms: number, ok: boolean) {
    this.upstream.add(ms);
    if (!ok) this.upstreamErrors++;
  }

  recordResponse(ms: number) {
    this.response.add(ms);
  }

  snapshot() {
    const lookups = this.hits + this.misses;
    return {
      cache: {
        hits: this.hits,
        misses: this.misses,
        hitRate: lookups ? Number((this.hits / lookups).toFixed(3)) : null,
      },
      upstream: { ...this.upstream.summary(), errors: this.upstreamErrors },
      response: this.response.summary(),
    };
  }
}
