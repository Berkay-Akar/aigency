"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingRoutes = billingRoutes;
const crypto_1 = __importDefault(require("crypto"));
const client_1 = require("@prisma/client");
const auth_middleware_1 = require("../auth/auth.middleware");
const billing_service_1 = require("./billing.service");
const env_1 = require("../../config/env");
const response_1 = require("../../utils/response");
const prisma_1 = require("../../lib/prisma");
const billing_schema_1 = require("./billing.schema");
function timingSafeEqual(a, b) {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    if (aBuf.length !== bBuf.length)
        return false;
    return crypto_1.default.timingSafeEqual(aBuf, bBuf);
}
function buildCallbackPayloadString(body) {
    return JSON.stringify({
        conversationId: body.conversationId,
        token: body.token,
    });
}
function verifyIyzicoHmacSignature(request, body) {
    const signature = request.headers['x-iyzi-signature'];
    const timestamp = request.headers['x-iyzi-timestamp'];
    const nonce = request.headers['x-iyzi-nonce'];
    if (typeof signature !== 'string' ||
        typeof timestamp !== 'string' ||
        typeof nonce !== 'string') {
        return false;
    }
    if (!env_1.env.IYZICO_WEBHOOK_HMAC_SECRET) {
        return false;
    }
    const payload = `${timestamp}.${nonce}.${buildCallbackPayloadString(body)}`;
    const expected = crypto_1.default
        .createHmac('sha256', env_1.env.IYZICO_WEBHOOK_HMAC_SECRET)
        .update(payload)
        .digest('hex');
    return timingSafeEqual(signature, expected);
}
function verifyFallbackSharedSecret(request) {
    if (!env_1.env.IYZICO_WEBHOOK_SHARED_SECRET)
        return false;
    const query = request.query;
    const provided = query.s;
    if (!provided)
        return false;
    return timingSafeEqual(provided, env_1.env.IYZICO_WEBHOOK_SHARED_SECRET);
}
async function registerReplay(replayKey, conversationId) {
    try {
        await prisma_1.prisma.paymentCallbackReplay.create({
            data: {
                replayKey,
                source: 'iyzico',
                conversationId,
                expiresAt: new Date(Date.now() + 60 * 60 * 1000),
            },
        });
        return true;
    }
    catch (err) {
        if (err instanceof client_1.Prisma.PrismaClientKnownRequestError &&
            err.code === 'P2002') {
            return false;
        }
        throw err;
    }
}
async function billingRoutes(fastify) {
    fastify.get('/billing/balance', { preHandler: auth_middleware_1.authenticate }, async (request, reply) => {
        const { workspaceId } = (0, auth_middleware_1.getUser)(request);
        try {
            const credits = await (0, billing_service_1.getBalance)(workspaceId);
            return (0, response_1.sendSuccess)(reply, { credits });
        }
        catch (err) {
            const error = err;
            return (0, response_1.sendError)(reply, error.message, error.statusCode ?? 500);
        }
    });
    fastify.post('/billing/payment', { preHandler: auth_middleware_1.authenticate }, async (request, reply) => {
        const { workspaceId } = (0, auth_middleware_1.getUser)(request);
        const parsed = billing_schema_1.CreatePaymentSchema.safeParse(request.body);
        if (!parsed.success) {
            return (0, response_1.sendError)(reply, parsed.error.errors[0]?.message ?? 'Invalid input', 400);
        }
        const { creditAmount, price, currency, callbackUrl, buyerName, buyerSurname, buyerEmail, buyerIp, buyerCity, buyerCountry, buyerAddress, buyerZip, buyerPhone, buyerIdentityNumber } = parsed.data;
        const conversationId = `ws-${workspaceId}-${Date.now()}`;
        const basketId = `credits-${creditAmount}`;
        const requestBody = {
            locale: 'tr',
            conversationId,
            price: price.toFixed(2),
            paidPrice: price.toFixed(2),
            currency,
            basketId,
            paymentGroup: 'PRODUCT',
            callbackUrl,
            buyer: {
                id: workspaceId,
                name: buyerName,
                surname: buyerSurname,
                email: buyerEmail,
                identityNumber: buyerIdentityNumber,
                lastLoginDate: new Date().toISOString().replace('T', ' ').slice(0, 19),
                registrationDate: new Date().toISOString().replace('T', ' ').slice(0, 19),
                registrationAddress: buyerAddress,
                ip: buyerIp,
                city: buyerCity,
                country: buyerCountry,
                zipCode: buyerZip,
                gsmNumber: buyerPhone,
            },
            shippingAddress: { contactName: `${buyerName} ${buyerSurname}`, city: buyerCity, country: buyerCountry, address: buyerAddress, zipCode: buyerZip },
            billingAddress: { contactName: `${buyerName} ${buyerSurname}`, city: buyerCity, country: buyerCountry, address: buyerAddress, zipCode: buyerZip },
            basketItems: [{ id: basketId, name: `${creditAmount} Credits`, category1: 'Credits', itemType: 'VIRTUAL', price: price.toFixed(2) }],
        };
        try {
            const authStr = `${env_1.env.IYZICO_API_KEY}:${Date.now()}`;
            const pkiString = buildPkiString(requestBody);
            const hash = generateHash(env_1.env.IYZICO_API_KEY, env_1.env.IYZICO_SECRET_KEY, pkiString);
            const response = await fetch(`${env_1.env.IYZICO_BASE_URL}/payment/iyzipos/checkoutform/initialize/auth/ecom`, {
                method: 'POST',
                headers: {
                    Authorization: `IYZWSv2 ${Buffer.from(authStr).toString('base64')}:${hash}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });
            const data = await response.json();
            if (data.status !== 'success') {
                return (0, response_1.sendError)(reply, data.errorMessage ?? 'Payment init failed', 502);
            }
            return (0, response_1.sendSuccess)(reply, {
                conversationId,
                checkoutFormContent: data.checkoutFormContent,
                creditAmount,
            });
        }
        catch (err) {
            const error = err;
            fastify.log.error({ err }, 'iyzico payment init failed');
            return (0, response_1.sendError)(reply, error.message, 500);
        }
    });
    // iyzico calls this after payment
    fastify.post('/billing/payment/callback', {
        config: {
            rateLimit: {
                max: 20,
                timeWindow: 60_000,
            },
        },
    }, async (request, reply) => {
        const parsed = billing_schema_1.CallbackBodySchema.safeParse(request.body);
        if (!parsed.success) {
            return (0, response_1.sendError)(reply, 'Missing token or conversationId', 400);
        }
        const body = parsed.data;
        try {
            const signatureOk = verifyIyzicoHmacSignature(request, body);
            const fallbackOk = verifyFallbackSharedSecret(request);
            if (!signatureOk && !fallbackOk) {
                return (0, response_1.sendError)(reply, 'Invalid callback signature', 401);
            }
            const replayKey = signatureOk
                ? `sig:${request.headers['x-iyzi-signature']}`
                : `fallback:${body.conversationId}:${body.token}`;
            const replayAccepted = await registerReplay(replayKey, body.conversationId);
            if (!replayAccepted) {
                return (0, response_1.sendError)(reply, 'Replay detected', 409);
            }
            // Verify payment with iyzico
            const verifyRes = await fetch(`${env_1.env.IYZICO_BASE_URL}/payment/iyzipos/checkoutform/auth/ecom/detail`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    locale: 'tr',
                    conversationId: body.conversationId,
                    token: body.token,
                }),
            });
            const data = await verifyRes.json();
            if (data.status !== 'success' || data.paymentStatus !== 'SUCCESS') {
                fastify.log.warn({ conversationId: body.conversationId }, 'Payment verification failed');
                return (0, response_1.sendError)(reply, 'Payment verification failed', 402);
            }
            // Parse workspaceId and creditAmount from conversationId: "ws-{workspaceId}-{ts}"
            const parts = body.conversationId.split('-');
            const workspaceId = parts.slice(1, -1).join('-');
            const creditAmount = parseInt(data.basketId?.replace('credits-', '') ?? '0', 10);
            if (!workspaceId || !creditAmount) {
                return (0, response_1.sendError)(reply, 'Cannot parse payment context', 400);
            }
            const [transaction, credits] = await prisma_1.prisma.$transaction(async (tx) => {
                const existing = await tx.paymentTransaction.findUnique({
                    where: { conversationId: body.conversationId },
                });
                if (existing) {
                    const workspace = await tx.workspace.findUnique({
                        where: { id: workspaceId },
                        select: { credits: true },
                    });
                    return [existing, workspace?.credits ?? 0];
                }
                const created = await tx.paymentTransaction.create({
                    data: {
                        conversationId: body.conversationId,
                        workspaceId,
                        creditAmount,
                        amount: new client_1.Prisma.Decimal(data.price ?? '0'),
                        status: data.paymentStatus ?? 'SUCCESS',
                        raw: data,
                    },
                });
                const workspace = await tx.workspace.update({
                    where: { id: workspaceId },
                    data: { credits: { increment: creditAmount } },
                    select: { credits: true },
                });
                return [created, workspace.credits];
            });
            fastify.log.info({ workspaceId, creditAmount, credits, conversationId: transaction.conversationId }, 'Payment callback processed');
            return (0, response_1.sendSuccess)(reply, { credits, conversationId: transaction.conversationId });
        }
        catch (err) {
            const error = err;
            fastify.log.error({ err }, 'Payment callback processing failed');
            return (0, response_1.sendError)(reply, error.message, 500);
        }
    });
}
function buildPkiString(obj) {
    return Object.entries(obj)
        .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
        .join('&');
}
function generateHash(apiKey, secretKey, pkiString) {
    const hash = crypto_1.default
        .createHmac('sha256', secretKey)
        .update(`${apiKey}${pkiString}`)
        .digest('base64');
    return hash;
}
//# sourceMappingURL=billing.routes.js.map