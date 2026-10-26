/**
 * Measures cache behaviour against the real OpenStreetMap services.
 *
 * cafes:   for each city, one search from the centre, then repeat searches from points
 *          up to ~150 m away, as several users in the same area would.
 * geocode: each place is looked up three times with different spelling/casing.
 *
 * Upstream traffic stays tiny (a handful of requests), well inside the usage policies.
 *
 * Run: npm run bench -w @coffee-finder/api -- [cafes|geocode|all]
 */
import { buildApp } from '../src/app';
import { loadConfig } from '../src/config';

const CITIES = [
  { name: 'Helsinki', lat: 60.1699, lng: 24.9384 },
  { name: 'Sofia', lat: 42.6977, lng: 23.3219 },
  { name: 'Plovdiv', lat: 42.1354, lng: 24.7453 },
  { name: 'Tampere', lat: 61.4978, lng: 23.761 },
];
// Offsets in degrees: 0.001° of latitude is about 111 m.
const OFFSETS = [
  [0, 0],
  [0.0004, 0.0003],
  [-0.0006, 0.0008],
  [0.0011, -0.0009],
  [-0.0013, -0.0012],
];
const PLACES = [
  ['Kamppi, Helsinki', 'kamppi, helsinki', '  KAMPPI, Helsinki '],
  ['Plovdiv Old Town', 'plovdiv old town', 'PLOVDIV OLD TOWN'],
  ['Tampere', 'tampere', 'TAMPERE '],
];

const mode = process.argv[2] ?? 'all';
const app = await buildApp({ config: loadConfig({ LOG_LEVEL: 'silent' }), logger: false });

async function timedInject(url: string) {
  const start = performance.now();
  const res = await app.inject(url);
  return { res, ms: Math.round(performance.now() - start) };
}

if (mode === 'all' || mode === 'cafes') {
  console.log('| City | Request | Cache | Cafés | Time (ms) |');
  console.log('| ---- | ------- | ----- | ----- | --------- |');
  for (const city of CITIES) {
    for (const [i, [dLat, dLng]] of OFFSETS.entries()) {
      const { res, ms } = await timedInject(
        `/api/cafes?lat=${city.lat + dLat}&lng=${city.lng + dLng}&radius=1500`,
      );
      const count = res.statusCode === 200 ? res.json().cafes.length : `HTTP ${res.statusCode}`;
      const cache = res.headers['x-cache'] ?? '-';
      console.log(`| ${city.name} | ${i + 1} | ${cache} | ${count} | ${ms} |`);
    }
  }
}

if (mode === 'all' || mode === 'geocode') {
  console.log('\n| Query | Cache | Result | Time (ms) |');
  console.log('| ----- | ----- | ------ | --------- |');
  for (const spellings of PLACES) {
    for (const q of spellings) {
      const { res, ms } = await timedInject(`/api/geocode?${new URLSearchParams({ q })}`);
      const result = res.statusCode === 200 ? 'found' : `HTTP ${res.statusCode}`;
      console.log(`| "${q}" | ${res.headers['x-cache'] ?? '-'} | ${result} | ${ms} |`);
    }
  }
}

const metrics = (await app.inject('/metrics')).json();
console.log('\n/metrics after the run:');
console.log(JSON.stringify({ cafes: metrics.cafes, geocode: metrics.geocode }, null, 2));
await app.close();
