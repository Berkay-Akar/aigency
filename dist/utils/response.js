"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSuccess = sendSuccess;
exports.sendError = sendError;
function sendSuccess(reply, data, statusCode = 200) {
    const response = { success: true, data };
    reply.status(statusCode).send(response);
}
function sendError(reply, message, statusCode = 500) {
    const response = { success: false, message };
    reply.status(statusCode).send(response);
}
//# sourceMappingURL=response.js.map