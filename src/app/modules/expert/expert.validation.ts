import { z } from "zod";

const payoutAccountSchema = z.object({
  iban: z
    .string()
    .min(10, "IBAN seems too short")
    .max(34, "IBAN seems too long"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  mobile: z.string().regex(/^\+?[0-9]{8,15}$/, "Invalid mobile number format"),
  city: z.string().min(2, "City is required"),
});
const withdrawSchema = z.object({
  payoutId: z.string().min(1, "Payout id is required"),
  amount: z.number().min(1, "Amount must be at least 1"),
});

export const expertValidation = {
  payoutAccountSchema,
  withdrawSchema,
};
