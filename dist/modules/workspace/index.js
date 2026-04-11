"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inviteMember = exports.getMembers = exports.updateWorkspace = exports.getWorkspace = exports.workspaceRoutes = void 0;
var workspace_routes_1 = require("./workspace.routes");
Object.defineProperty(exports, "workspaceRoutes", { enumerable: true, get: function () { return workspace_routes_1.workspaceRoutes; } });
var workspace_service_1 = require("./workspace.service");
Object.defineProperty(exports, "getWorkspace", { enumerable: true, get: function () { return workspace_service_1.getWorkspace; } });
Object.defineProperty(exports, "updateWorkspace", { enumerable: true, get: function () { return workspace_service_1.updateWorkspace; } });
Object.defineProperty(exports, "getMembers", { enumerable: true, get: function () { return workspace_service_1.getMembers; } });
Object.defineProperty(exports, "inviteMember", { enumerable: true, get: function () { return workspace_service_1.inviteMember; } });
//# sourceMappingURL=index.js.map