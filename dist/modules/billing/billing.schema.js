"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CallbackBodySchema = exports.CreatePaymentSchema = void 0;
const zod_1 = require("zod");
exports.CreatePaymentSchema = zod_1.z.object({
    creditAmount: zod_1.z.number().int().min(10).max(100_000),
    price: zod_1.z.number().positive(),
    currency: zod_1.z.string().length(3).default('TRY'),
    callbackUrl: zod_1.z.string().url(),
    buyerName: zod_1.z.string().min(1),
    buyerSurname: zod_1.z.string().min(1),
    buyerEmail: zod_1.z.string().email(),
    buyerIp: zod_1.z.string().min(1),
    buyerCity: zod_1.z.string().min(1),
    buyerCountry: zod_1.z.string().min(1),
    buyerAddress: zod_1.z.string().min(1),
    buyerZip: zod_1.z.string().min(1),
    buyerPhone: zod_1.z.string().min(1),
    buyerIdentityNumber: zod_1.z.string().regex(/^\d{11}$/),
});
exports.CallbackBodySchema = zod_1.z.object({
    token: zod_1.z.string().min(1),
    conversationId: zod_1.z.string().min(1),
});
//# sourceMappingURL=billing.schema.js.map