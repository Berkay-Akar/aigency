"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.getUser = getUser;
const response_1 = require("../../utils/response");
async function authenticate(request, reply) {
    try {
        await request.jwtVerify();
    }
    catch {
        (0, response_1.sendError)(reply, 'Unauthorized', 401);
    }
}
function getUser(request) {
    return request.user;
}
//# sourceMappingURL=auth.middleware.js.map