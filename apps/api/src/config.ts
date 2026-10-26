import { DEFAULT_NOMINATIM_URL, DEFAULT_OVERPASS_URLS } from '@coffee-finder/shared';
import { z } from 'zod';

const list = (fallback: string[]) =>
  z
    .string()
    .optional()
    .transform((raw) => {
      const items = (raw ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      return items.length ? items : fallback;
    });

const schema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  CORS_ORIGINS: list(['http://localhost:5173']),
  TRUST_PROXY: z.stringbool().default(false),
  OVERPASS_URLS: list(DEFAULT_OVERPASS_URLS),
  NOMINATIM_URL: z.url().default(DEFAULT_NOMINATIM_URL),
  CACHE_TTL_SECONDS: z.coerce.number().int().min(0).default(600),
  CACHE_MAX_ENTRIES: z.coerce.number().int().min(1).default(1000),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).default(30),
  CONTACT_URL: z.url().default('https://github.com/KALalev18/Coffee-Finder'),
});

export type Config = z.infer<typeof schema>;

/** Parses environment variables, failing fast with a readable message on bad values. */
export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const result = schema.safeParse(env);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid configuration:\n  ${problems.join('\n  ')}`);
  }
  return result.data;
}
