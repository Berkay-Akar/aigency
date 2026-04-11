"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const social_1 = require("../services/social");
const POLL_MS = 10 * 60 * 1000;
setInterval(() => {
    (0, social_1.refreshExpiringSocialConnections)(100).catch((err) => {
        const error = err;
        // eslint-disable-next-line no-console
        console.error(`[social-token-refresh] ${error.message}`);
    });
}, POLL_MS);
//# sourceMappingURL=social-token-refresh.worker.js.map