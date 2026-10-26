import { buildApp } from './app';
import { loadConfig } from './config';

try {
  process.loadEnvFile(); // optional .env for local development
} catch {
  // no .env file: use the environment as it is
}
const config = loadConfig();
const app = await buildApp({ config });

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    app.log.info(`${signal} received, shutting down`);
    await app.close();
    process.exit(0);
  });
}

await app.listen({ port: config.PORT, host: config.HOST });
