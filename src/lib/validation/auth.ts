import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .email("כתובת דוא״ל לא תקינה")
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, "הסיסמה חייבת להכיל לפחות 8 תווים");

export const loginWithPasswordSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const magicLinkSchema = z.object({
  email: emailSchema,
});

export const signUpInvitedSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().trim().min(1, "נא להזין שם").max(80),
});

export const bootstrapHouseholdSchema = z.object({
  householdName: z.string().trim().min(2, "שם משק הבית קצר מדי").max(80),
  displayName: z.string().trim().min(1, "נא להזין שם תצוגה").max(80),
});

export const inviteMemberSchema = z.object({
  email: emailSchema,
  displayName: z.string().trim().max(80).optional(),
});

export const updateDisplayNameSchema = z.object({
  displayName: z.string().trim().min(1, "נא להזין שם תצוגה").max(80),
});

export type LoginWithPasswordInput = z.infer<typeof loginWithPasswordSchema>;
export type MagicLinkInput = z.infer<typeof magicLinkSchema>;
export type SignUpInvitedInput = z.infer<typeof signUpInvitedSchema>;
export type BootstrapHouseholdInput = z.infer<typeof bootstrapHouseholdSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateDisplayNameInput = z.infer<typeof updateDisplayNameSchema>;
