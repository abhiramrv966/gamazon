// --local uses only the fictional loopback demo. Hosted tests need a dedicated staging cookie.
const local = process.argv.includes('--local');
const base = process.env.GAMAZON_BASE_URL || (local ? 'http://127.0.0.1:3000' : '');
const cookie =
  process.env.GAMAZON_SESSION_COOKIE ||
  (local ? 'gamazon-demo-user=11111111-1111-4111-8111-111111111111' : '');
if (!base || !cookie)
  throw new Error('Set GAMAZON_BASE_URL and GAMAZON_SESSION_COOKIE, or use --local for the demo.');
const parsed = new URL(base);
const loopback = ['127.0.0.1', 'localhost'].includes(parsed.hostname);
if ((local && !loopback) || (!loopback && parsed.protocol !== 'https:'))
  throw new Error('Use loopback for --local and HTTPS for staging.');
const concurrency = Number(process.env.GAMAZON_CONCURRENCY || 100);
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 500)
  throw new Error('Concurrency must be between 1 and 500.');
const first = await fetch(new URL('/api/v1/state', base), {
  headers: { cookie },
  signal: AbortSignal.timeout(10000),
});
if (!first.ok) throw new Error('The test account cannot read community data.');
const state = await first.json();
if (local && !state.demo) throw new Error('--local must target the fictional demo.');
const times = [],
  bytes = [];
const statuses = {};
let errors = 0;
const started = performance.now();
await Promise.all(
  Array.from({ length: concurrency }, async (_, user) => {
    for (let round = 0; round < 5; round++) {
      const start = performance.now();
      try {
        const route =
          (user + round) % 3 === 0
            ? '/api/v1/state'
            : (user + round) % 3 === 1
              ? '/api/v1/posts?limit=20'
              : '/api/v1/posts?limit=20&exchange=sale';
        const response = await fetch(new URL(route, base), {
          headers: { cookie },
          signal: AbortSignal.timeout(10000),
        });
        statuses[response.status] = (statuses[response.status] || 0) + 1;
        const body = await response.text();
        bytes.push(Buffer.byteLength(body));
        const json = JSON.parse(body);
        if (!response.ok || !(Array.isArray(json.items) || Array.isArray(json.posts))) errors++;
      } catch {
        errors++;
      }
      times.push(performance.now() - start);
    }
  }),
);
times.sort((a, b) => a - b);
bytes.sort((a, b) => a - b);
const percentile = (values, p) => Math.round(values[Math.ceil(values.length * p) - 1] || 0);
const result = {
  mode: state.demo ? 'local in-memory demo' : 'configured staging',
  fixture_profiles: state.profiles.length,
  concurrency,
  requests: times.length,
  errors,
  statuses,
  duration_ms: Math.round(performance.now() - started),
  p50_ms: percentile(times, 0.5),
  p95_ms: percentile(times, 0.95),
  p95_response_bytes: percentile(bytes, 0.95),
  target_met: errors === 0 && percentile(times, 0.95) < 1000,
};
console.log(JSON.stringify(result, null, 2));
if (!result.target_met) process.exitCode = 1;
