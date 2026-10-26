import { DEFAULT_OVERPASS_URLS } from '@coffee-finder/shared';
import { describe, expect, it } from 'vitest';
import { loadConfig } from './config';

describe('loadConfig', () => {
  it('works with no environment variables', () => {
    const config = loadConfig({});
    expect(config.PORT).toBe(3001);
    expect(config.TRUST_PROXY).toBe(false);
    expect(config.OVERPASS_URLS).toEqual(DEFAULT_OVERPASS_URLS);
    expect(config.CORS_ORIGINS).toEqual(['http://localhost:5173']);
  });

  it('parses lists, numbers and booleans', () => {
    const config = loadConfig({
      PORT: '8080',
      TRUST_PROXY: 'true',
      CORS_ORIGINS: 'https://a.example, https://b.example',
      CACHE_TTL_SECONDS: '60',
    });
    expect(config).toMatchObject({
      PORT: 8080,
      TRUST_PROXY: true,
      CORS_ORIGINS: ['https://a.example', 'https://b.example'],
      CACHE_TTL_SECONDS: 60,
    });
  });

  it('fails fast with a readable message', () => {
    expect(() => loadConfig({ PORT: 'abc', NOMINATIM_URL: 'not a url' })).toThrow(
      /Invalid configuration:[\s\S]*PORT[\s\S]*NOMINATIM_URL/,
    );
  });
});
