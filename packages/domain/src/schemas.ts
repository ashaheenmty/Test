import { z } from 'zod';
import { DiscountCardType, ThemePreference } from './enums';

export const SUPPORTED_LOCALES = ['de', 'en', 'fr', 'ar', 'es', 'ru', 'zh-Hans'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const localeSchema = z.enum(SUPPORTED_LOCALES);

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .email();

/**
 * Password policy follows NIST SP 800-63B / BSI guidance: length over complexity.
 * Minimum 10 characters, max 128, must not be all whitespace.
 */
export const passwordSchema = z
  .string()
  .min(10, 'password.tooShort')
  .max(128, 'password.tooLong')
  .refine((p) => p.trim().length > 0, 'password.blank');

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  locale: localeSchema.default('de'),
  acceptedAgentTermsVersion: z.string().min(1),
  acceptedPrivacyPolicyVersion: z.string().min(1),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({ refreshToken: z.string().min(20).max(200) });

export const oauthSchema = z.object({
  idToken: z.string().min(10).max(8192),
  locale: localeSchema.optional(),
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
});

export const tokenSchema = z.object({ token: z.string().min(20).max(200) });
export const forgotPasswordSchema = z.object({ email: emailSchema });
export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password: passwordSchema,
});

export const updateProfileSchema = z
  .object({
    locale: localeSchema,
    theme: z.enum(ThemePreference),
  })
  .partial();

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date.format');

export const passengerSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  dateOfBirth: isoDate.optional(),
  email: emailSchema.optional(),
  isAccountHolder: z.boolean().default(false),
  discountCards: z
    .array(
      z.object({
        type: z.enum(DiscountCardType),
        travelClass: z.enum(['FIRST', 'SECOND']).optional(),
        number: z.string().trim().max(40).optional(),
        validUntil: isoDate.optional(),
      }),
    )
    .max(10)
    .default([]),
});
export type PassengerInput = z.infer<typeof passengerSchema>;

export interface AuthTokens {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

export interface MeResponse {
  id: string;
  email: string;
  emailVerified: boolean;
  locale: SupportedLocale;
  theme: ThemePreference;
  firstName: string | null;
  lastName: string | null;
}
