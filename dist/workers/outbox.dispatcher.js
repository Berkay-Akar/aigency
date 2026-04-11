"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const queue_1 = require("../services/queue");
const POLL_INTERVAL_MS = 2_000;
let isRunning = false;
async function runOnce() {
    if (isRunning)
        return;
    isRunning = true;
    try {
        await (0, queue_1.dispatchPendingOutboxJobs)(100);
    }
    finally {
        isRunning = false;
    }
}
setInterval(() => {
    runOnce().catch((err) => {
        const error = err;
        // eslint-disable-next-line no-console
        console.error(`[outbox-dispatcher] ${error.message}`);
    });
}, POLL_INTERVAL_MS);
//# sourceMappingURL=outbox.dispatcher.js.map