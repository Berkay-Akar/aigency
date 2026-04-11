"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refundCredits = exports.addCredits = exports.deductCredits = exports.getBalance = exports.billingRoutes = void 0;
var billing_routes_1 = require("./billing.routes");
Object.defineProperty(exports, "billingRoutes", { enumerable: true, get: function () { return billing_routes_1.billingRoutes; } });
var billing_service_1 = require("./billing.service");
Object.defineProperty(exports, "getBalance", { enumerable: true, get: function () { return billing_service_1.getBalance; } });
Object.defineProperty(exports, "deductCredits", { enumerable: true, get: function () { return billing_service_1.deductCredits; } });
Object.defineProperty(exports, "addCredits", { enumerable: true, get: function () { return billing_service_1.addCredits; } });
Object.defineProperty(exports, "refundCredits", { enumerable: true, get: function () { return billing_service_1.refundCredits; } });
//# sourceMappingURL=index.js.map