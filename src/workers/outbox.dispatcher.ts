import { dispatchPendingOutboxJobs } from '../services/queue';

const POLL_INTERVAL_MS = 2_000;

let isRunning = false;

async function runOnce(): Promise<void> {
  if (isRunning) return;
  isRunning = true;
  try {
    await dispatchPendingOutboxJobs(100);
  } finally {
    isRunning = false;
  }
}

setInterval(() => {
  runOnce().catch((err: unknown) => {
    const error = err as Error;
    // eslint-disable-next-line no-console
    console.error(`[outbox-dispatcher] ${error.message}`);
  });
}, POLL_INTERVAL_MS);
