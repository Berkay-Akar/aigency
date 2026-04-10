import { refreshExpiringSocialConnections } from '../services/social';

const POLL_MS = 10 * 60 * 1000;

setInterval(() => {
  refreshExpiringSocialConnections(100).catch((err: unknown) => {
    const error = err as Error;
    // eslint-disable-next-line no-console
    console.error(`[social-token-refresh] ${error.message}`);
  });
}, POLL_MS);
