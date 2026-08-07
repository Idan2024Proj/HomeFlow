import { z } from "zod";

export const transactionTypeSchema = z.enum(["expense", "income"]);
export const splitModeSchema = z.enum(["personal", "equal", "percent", "custom"]);

const moneySchema = z.coerce.number().positive("סכום חייב להיות גדול מאפס");

export const transactionFormSchema = z
  .object({
    type: transactionTypeSchema,
    amount: moneySchema,
    merchantName: z.string().trim().min(1, "נא להזין בית עסק / תיאור").max(120),
    categoryId: z.string().uuid("נא לבחור קטגוריה"),
    occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "תאריך לא תקין"),
    paidBy: z.string().uuid("נא לבחור מי שילם"),
    isShared: z.coerce.boolean().default(false),
    splitMode: splitModeSchema.default("personal"),
    paymentMethodId: z
      .string()
      .uuid()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : undefined)),
    note: z
      .string()
      .trim()
      .max(500)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : undefined)),
    percentA: z.coerce.number().min(0).max(100).optional(),
    percentB: z.coerce.number().min(0).max(100).optional(),
    customAmountA: z.coerce.number().min(0).optional(),
    customAmountB: z.coerce.number().min(0).optional(),
    participantA: z.string().uuid().optional(),
    participantB: z.string().uuid().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.isShared || data.splitMode === "personal") {
      return;
    }

    if (!data.participantA || !data.participantB) {
      ctx.addIssue({
        code: "custom",
        message: "לחלוקה משותפת נדרשים שני משתתפים",
        path: ["participantA"],
      });
    }

    if (data.splitMode === "percent") {
      const sum = (data.percentA ?? 0) + (data.percentB ?? 0);
      if (Math.abs(sum - 100) > 0.01) {
        ctx.addIssue({
          code: "custom",
          message: "סכום האחוזים חייב להיות 100",
          path: ["percentA"],
        });
      }
    }

    if (data.splitMode === "custom") {
      const sum = (data.customAmountA ?? 0) + (data.customAmountB ?? 0);
      if (Math.abs(sum - data.amount) > 0.01) {
        ctx.addIssue({
          code: "custom",
          message: "סכומי החלוקה חייבים להסתכם לסכום העסקה",
          path: ["customAmountA"],
        });
      }
    }
  });

export type TransactionFormInput = z.infer<typeof transactionFormSchema>;

export const transactionFiltersSchema = z.object({
  q: z.string().trim().optional(),
  type: z.enum(["all", "expense", "income"]).default("all"),
  categoryId: z.string().uuid().optional().or(z.literal("")).optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal(""))
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal(""))
    .optional(),
});

export type TransactionFilters = z.infer<typeof transactionFiltersSchema>;
