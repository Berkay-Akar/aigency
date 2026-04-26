import { z } from "zod";
import { BrandTone } from "@prisma/client";

export const BrandKitUpdateSchema = z.object({
  brandName: z.string().min(1).max(100).optional(),
  tagline: z.string().max(200).optional(),
  industry: z.string().max(100).optional(),
  website: z.string().url().optional(),
  description: z.string().max(1000).optional(),
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().max(20).optional(),
  secondaryColor: z.string().max(20).optional(),
  accentColor: z.string().max(20).optional(),
  tone: z.nativeEnum(BrandTone).optional(),
});

export type BrandKitUpdateInput = z.infer<typeof BrandKitUpdateSchema>;
