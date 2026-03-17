import crypto from 'crypto';
import type { FastifyInstance } from 'fastify';
import { authenticate, getUser } from '../auth/auth.middleware';
import { getBalance, addCredits } from './billing.service';
import { env } from '../../config/env';
import { sendSuccess, sendError } from '../../utils/response';
import { z } from 'zod';

const CreatePaymentSchema = z.object({
  creditAmount: z.number().int().min(10).max(100_000),
  price: z.number().positive(),
  currency: z.string().length(3).default('TRY'),
  callbackUrl: z.string().url(),
  buyerName: z.string().min(1),
  buyerSurname: z.string().min(1),
  buyerEmail: z.string().email(),
  buyerIp: z.string().min(1),
  buyerCity: z.string().min(1),
  buyerCountry: z.string().min(1),
  buyerAddress: z.string().min(1),
  buyerZip: z.string().min(1),
  buyerPhone: z.string().min(1),
});

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
        buyerEmail, buyerIp, buyerCity, buyerCountry, buyerAddress, buyerZip, buyerPhone } = parsed.data;

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
          identityNumber: '11111111111',
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
  fastify.post('/billing/payment/callback', async (request, reply) => {
    const body = request.body as { token?: string; conversationId?: string };

    if (!body.token || !body.conversationId) {
      return sendError(reply, 'Missing token or conversationId', 400);
    }

    try {
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

      const credits = await addCredits(workspaceId, creditAmount);

      fastify.log.info({ workspaceId, creditAmount, credits }, 'Credits added after payment');
      return sendSuccess(reply, { credits });
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
