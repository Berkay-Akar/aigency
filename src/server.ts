import dns from 'node:dns';
import { env } from './config/env';
import { buildApp } from './app';

dns.setDefaultResultOrder('ipv4first');

/**
 * BullMQ workers live in `src/workers/index.ts`. In production they are often a
 * separate process; in development we start them here unless opted out.
 */
function shouldStartWorkersInProcess(): boolean {
  const v = process.env.START_IN_PROCESS_WORKERS?.trim().toLowerCase();
  if (v === 'true' || v === '1') return true;
  if (v === 'false' || v === '0') return false;
  return env.NODE_ENV === 'development';
}

async function start(): Promise<void> {
  const app = buildApp();

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  if (shouldStartWorkersInProcess()) {
    await import('./workers');
    app.log.info('BullMQ workers started in-process (ai-jobs, publish, outbox).');
  } else if (env.NODE_ENV === 'production') {
    app.log.warn(
      'Workers not started in this process — run `node dist/workers/index.js` (or npm run start:worker) so queues are processed.',
    );
  }
}

start();
