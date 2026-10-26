import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import {
  MAX_RADIUS_M,
  findCafes,
  geocode,
  rankByDistance,
  type ApiError,
  type Cafe,
  type CafeDataSource,
  type CafesResponse,
  type GeocodeResponse,
  type Place,
} from '@coffee-finder/shared';
import Fastify, { type FastifyReply } from 'fastify';
import { z } from 'zod';
import { TtlCache } from './cache';
import type { Config } from './config';
import { snapToGrid } from './grid';
import { RouteMetrics } from './metrics';
import { spaced } from './spacing';

const GEOCODE_TTL_MS = 24 * 60 * 60 * 1000;

const cafesQuery = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().int().min(100).max(MAX_RADIUS_M).default(1500),
});

const geocodeQuery = z.object({
  q: z.string().trim().min(2).max(200),
});

export interface AppDeps {
  config: Config;
  /** Injected so tests can replace the upstream services. */
  fetchFn?: typeof fetch;
  logger?: boolean;
}

function badRequest(reply: FastifyReply, error: z.ZodError) {
  const message = error.issues.map((i) => `${i.path.join('.') || 'query'}: ${i.message}`);
  return reply.code(400).send({ error: message.join('; ') } satisfies ApiError);
}

export async function buildApp({ config, fetchFn = fetch, logger = true }: AppDeps) {
  const app = Fastify({
    logger: logger && { level: config.LOG_LEVEL },
    trustProxy: config.TRUST_PROXY,
  });

  const headers = { 'User-Agent': `coffee-finder-api/1.0 (+${config.CONTACT_URL})` };
  const cafeCache = new TtlCache<{ cafes: Cafe[]; source: CafeDataSource }>(
    config.CACHE_TTL_SECONDS * 1000,
    config.CACHE_MAX_ENTRIES,
  );
  const placeCache = new TtlCache<Place | null>(GEOCODE_TTL_MS, config.CACHE_MAX_ENTRIES);
  const nominatimSlot = spaced(1000);
  const metrics = { cafes: new RouteMetrics(), geocode: new RouteMetrics() };
  const startedAt = Date.now();

  async function timed<T>(route: RouteMetrics, call: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await call();
      route.recordUpstream(performance.now() - start, true);
      return result;
    } catch (err) {
      route.recordUpstream(performance.now() - start, false);
      throw err;
    }
  }

  await app.register(cors, { origin: config.CORS_ORIGINS, methods: ['GET'] });
  await app.register(rateLimit, {
    max: config.RATE_LIMIT_PER_MINUTE,
    timeWindow: '1 minute',
    errorResponseBuilder: (_req, ctx) => ({
      statusCode: 429,
      error: `Too many searches. Try again in ${ctx.after}.`,
    }),
  });

  app.setErrorHandler((err: Error & { statusCode?: number }, req, reply) => {
    const status = err.statusCode ?? 500;
    if (status >= 500) req.log.error(err);
    reply.code(status).send({ error: status >= 500 ? 'Internal server error' : err.message });
  });

  app.addHook('onResponse', async (req, reply) => {
    const path = req.routeOptions.url;
    if (path === '/api/cafes') metrics.cafes.recordResponse(reply.elapsedTime);
    if (path === '/api/geocode') metrics.geocode.recordResponse(reply.elapsedTime);
  });

  app.get('/health', { config: { rateLimit: false } }, async () => ({ status: 'ok' }));

  app.get('/metrics', { config: { rateLimit: false } }, async () => ({
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    cacheEntries: { cafes: cafeCache.size, geocode: placeCache.size },
    cafes: metrics.cafes.snapshot(),
    geocode: metrics.geocode.snapshot(),
  }));

  app.get('/api/cafes', async (req, reply) => {
    const parsed = cafesQuery.safeParse(req.query);
    if (!parsed.success) return badRequest(reply, parsed.error);
    const { lat, lng, radius } = parsed.data;

    const cell = snapToGrid({ lat, lng }, radius);
    try {
      const { value, hit } = await cafeCache.getOrLoad(cell.key, () =>
        timed(metrics.cafes, () =>
          findCafes(cell.center, cell.queryRadiusM, {
            overpassUrls: config.OVERPASS_URLS,
            nominatimUrl: config.NOMINATIM_URL,
            headers,
            fetchFn,
            nominatimSlot,
          }),
        ),
      );
      metrics.cafes.recordCache(hit);
      reply.header('X-Cache', hit ? 'HIT' : 'MISS');
      return {
        cafes: rankByDistance(value.cafes, { lat, lng }, radius),
        source: value.source,
      } satisfies CafesResponse;
    } catch (err) {
      metrics.cafes.recordCache(false); // failed loads are never cached
      req.log.warn({ err }, 'café search failed');
      return reply.code(502).send({ error: (err as Error).message } satisfies ApiError);
    }
  });

  app.get('/api/geocode', async (req, reply) => {
    const parsed = geocodeQuery.safeParse(req.query);
    if (!parsed.success) return badRequest(reply, parsed.error);
    const { q } = parsed.data;

    try {
      const { value, hit } = await placeCache.getOrLoad(q.toLowerCase(), () =>
        nominatimSlot(() =>
          timed(metrics.geocode, () => geocode(q, { url: config.NOMINATIM_URL, headers, fetchFn })),
        ),
      );
      metrics.geocode.recordCache(hit);
      reply.header('X-Cache', hit ? 'HIT' : 'MISS');
      return { place: value } satisfies GeocodeResponse;
    } catch (err) {
      metrics.geocode.recordCache(false);
      req.log.warn({ err }, 'geocoding failed');
      return reply.code(502).send({ error: (err as Error).message } satisfies ApiError);
    }
  });

  return app;
}
