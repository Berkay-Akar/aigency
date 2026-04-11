import { z } from 'zod';
export declare const CreatePaymentSchema: z.ZodObject<{
    creditAmount: z.ZodNumber;
    price: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    callbackUrl: z.ZodString;
    buyerName: z.ZodString;
    buyerSurname: z.ZodString;
    buyerEmail: z.ZodString;
    buyerIp: z.ZodString;
    buyerCity: z.ZodString;
    buyerCountry: z.ZodString;
    buyerAddress: z.ZodString;
    buyerZip: z.ZodString;
    buyerPhone: z.ZodString;
    buyerIdentityNumber: z.ZodString;
}, "strip", z.ZodTypeAny, {
    creditAmount: number;
    price: number;
    currency: string;
    callbackUrl: string;
    buyerName: string;
    buyerSurname: string;
    buyerEmail: string;
    buyerIp: string;
    buyerCity: string;
    buyerCountry: string;
    buyerAddress: string;
    buyerZip: string;
    buyerPhone: string;
    buyerIdentityNumber: string;
}, {
    creditAmount: number;
    price: number;
    callbackUrl: string;
    buyerName: string;
    buyerSurname: string;
    buyerEmail: string;
    buyerIp: string;
    buyerCity: string;
    buyerCountry: string;
    buyerAddress: string;
    buyerZip: string;
    buyerPhone: string;
    buyerIdentityNumber: string;
    currency?: string | undefined;
}>;
export declare const CallbackBodySchema: z.ZodObject<{
    token: z.ZodString;
    conversationId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
    conversationId: string;
}, {
    token: string;
    conversationId: string;
}>;
export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;
//# sourceMappingURL=billing.schema.d.ts.map