import { z } from 'zod';

export const CreatePaymentSchema = z.object({
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
  buyerIdentityNumber: z.string().regex(/^\d{11}$/),
});

export const CallbackBodySchema = z.object({
  token: z.string().min(1),
  conversationId: z.string().min(1),
});

export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;
