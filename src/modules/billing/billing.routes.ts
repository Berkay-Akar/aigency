import crypto from 'crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { Prisma } from '@prisma/client';
import { authenticate, getUser } from '../auth/auth.middleware';
import { getBalance } from './billing.service';
import { env } from '../../config/env';
import { sendSuccess, sendError } from '../../utils/response';
import { prisma } from '../../lib/prisma';
import { CallbackBodySchema, CreatePaymentSchema } from './billing.schema';

type CallbackBody = {
  token: string;
  conversationId: string;
};

function timingSafeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function buildCallbackPayloadString(body: CallbackBody): string {
  return JSON.stringify({
    conversationId: body.conversationId,
    token: body.token,
  });
}

function verifyIyzicoHmacSignature(
  request: FastifyRequest,
  body: CallbackBody,
): boolean {
  const signature = request.headers['x-iyzi-signature'];
  const timestamp = request.headers['x-iyzi-timestamp'];
  const nonce = request.headers['x-iyzi-nonce'];

  if (
    typeof signature !== 'string' ||
    typeof timestamp !== 'string' ||
    typeof nonce !== 'string'
  ) {
    return false;
  }

  if (!env.IYZICO_WEBHOOK_HMAC_SECRET) {
    return false;
  }

  const payload = `${timestamp}.${nonce}.${buildCallbackPayloadString(body)}`;
  const expected = crypto
    .createHmac('sha256', env.IYZICO_WEBHOOK_HMAC_SECRET)
    .update(payload)
    .digest('hex');

  return timingSafeEqual(signature, expected);
}

function verifyFallbackSharedSecret(request: FastifyRequest): boolean {
  if (!env.IYZICO_WEBHOOK_SHARED_SECRET) return false;
  const query = request.query as Record<string, string | undefined>;
  const provided = query.s;
  if (!provided) return false;
  return timingSafeEqual(provided, env.IYZICO_WEBHOOK_SHARED_SECRET);
}

async function registerReplay(
  replayKey: string,
  conversationId: string,
): Promise<boolean> {
  try {
    await prisma.paymentCallbackReplay.create({
      data: {
        replayKey,
        source: 'iyzico',
        conversationId,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    return true;
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      return false;
    }
    throw err;
  }
}

export async function billingRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    '/billing/balance',
    { preHandler: authenticate },
    async (request, reply) => {
      const { workspaceId } = getUser(request);
      try {
        const credits = await getBalance(workspaceId);
        return sendSuccess(reply, { credits });
      } catch (err) {
        const error = err as Error & { statusCode?: number };
        return sendError(reply, error.message, error.statusCode ?? 500);
      }
    },
  );

  fastify.post(
    '/billing/payment',
    { preHandler: authenticate },
    async (request, reply) => {
      const { workspaceId } = getUser(request);
      const parsed = CreatePaymentSchema.safeParse(request.body);

      if (!parsed.success) {
        return sendError(reply, parsed.error.errors[0]?.message ?? 'Invalid input', 400);
      }

      const { creditAmount, price, currency, callbackUrl, buyerName, buyerSurname,
        buyerEmail, buyerIp, buyerCity, buyerCountry, buyerAddress, buyerZip, buyerPhone, buyerIdentityNumber } = parsed.data;

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
        const authStr = `${env.IYZICO_API_KEY}:${Date.now()}`;
        const pkiString = buildPkiString(requestBody);
        const hash = generateHash(env.IYZICO_API_KEY, env.IYZICO_SECRET_KEY, pkiString);

        const response = await fetch(`${env.IYZICO_BASE_URL}/payment/iyzipos/checkoutform/initialize/auth/ecom`, {
          method: 'POST',
          headers: {
            Authorization: `IYZWSv2 ${Buffer.from(authStr).toString('base64')}:${hash}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json() as { status: string; checkoutFormContent?: string; errorMessage?: string };

        if (data.status !== 'success') {
          return sendError(reply, data.errorMessage ?? 'Payment init failed', 502);
        }

        return sendSuccess(reply, {
          conversationId,
          checkoutFormContent: data.checkoutFormContent,
          creditAmount,
        });
      } catch (err) {
        const error = err as Error;
        fastify.log.error({ err }, 'iyzico payment init failed');
        return sendError(reply, error.message, 500);
      }
    },
  );

  // iyzico calls this after payment
  fastify.post('/billing/payment/callback', {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: 60_000,
      },
    },
  }, async (request, reply) => {
    const parsed = CallbackBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 'Missing token or conversationId', 400);
    }
    const body = parsed.data;

    try {
      const signatureOk = verifyIyzicoHmacSignature(request, body);
      const fallbackOk = verifyFallbackSharedSecret(request);
      if (!signatureOk && !fallbackOk) {
        return sendError(reply, 'Invalid callback signature', 401);
      }

      const replayKey = signatureOk
        ? `sig:${request.headers['x-iyzi-signature'] as string}`
        : `fallback:${body.conversationId}:${body.token}`;
      const replayAccepted = await registerReplay(replayKey, body.conversationId);
      if (!replayAccepted) {
        return sendError(reply, 'Replay detected', 409);
      }

      // Verify payment with iyzico
      const verifyRes = await fetch(`${env.IYZICO_BASE_URL}/payment/iyzipos/checkoutform/auth/ecom/detail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale: 'tr',
          conversationId: body.conversationId,
          token: body.token,
        }),
      });

      const data = await verifyRes.json() as {
        status: string;
        paymentStatus?: string;
        basketId?: string;
        price?: string;
      };

      if (data.status !== 'success' || data.paymentStatus !== 'SUCCESS') {
        fastify.log.warn({ conversationId: body.conversationId }, 'Payment verification failed');
        return sendError(reply, 'Payment verification failed', 402);
      }

      // Parse workspaceId and creditAmount from conversationId: "ws-{workspaceId}-{ts}"
      const parts = body.conversationId.split('-');
      const workspaceId = parts.slice(1, -1).join('-');
      const creditAmount = parseInt(data.basketId?.replace('credits-', '') ?? '0', 10);

      if (!workspaceId || !creditAmount) {
        return sendError(reply, 'Cannot parse payment context', 400);
      }

      const [transaction, credits] = await prisma.$transaction(async (tx) => {
        const existing = await tx.paymentTransaction.findUnique({
          where: { conversationId: body.conversationId },
        });

        if (existing) {
          const workspace = await tx.workspace.findUnique({
            where: { id: workspaceId },
            select: { credits: true },
          });
          return [existing, workspace?.credits ?? 0] as const;
        }

        const created = await tx.paymentTransaction.create({
          data: {
            conversationId: body.conversationId,
            workspaceId,
            creditAmount,
            amount: new Prisma.Decimal(data.price ?? '0'),
            status: data.paymentStatus ?? 'SUCCESS',
            raw: data,
          },
        });

        const workspace = await tx.workspace.update({
          where: { id: workspaceId },
          data: { credits: { increment: creditAmount } },
          select: { credits: true },
        });
        return [created, workspace.credits] as const;
      });

      fastify.log.info(
        { workspaceId, creditAmount, credits, conversationId: transaction.conversationId },
        'Payment callback processed',
      );
      return sendSuccess(reply, { credits, conversationId: transaction.conversationId });
    } catch (err) {
      const error = err as Error;
      fastify.log.error({ err }, 'Payment callback processing failed');
      return sendError(reply, error.message, 500);
    }
  });
}

function buildPkiString(obj: Record<string, unknown>): string {
  return Object.entries(obj)
    .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join('&');
}

function generateHash(apiKey: string, secretKey: string, pkiString: string): string {
  const hash = crypto
    .createHmac('sha256', secretKey)
    .update(`${apiKey}${pkiString}`)
    .digest('base64');
  return hash;
}
