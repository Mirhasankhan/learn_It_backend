import { z } from "zod";

const feedbackValidationSchema = z.object({
  confidence: z.number().min(1).max(5).optional(),
  speaking: z.number().min(1).max(5).optional(),
  professionalism: z.number().min(1).max(5).optional(),
  thinking: z.number().min(1).max(5).optional(),
  management: z.number().min(1).max(5).optional(),
  technique: z.number().min(1).max(5).optional(),
  overall: z.number().min(1).max(5).optional(),
  comment: z.string().optional(),
});

const bookingValidationSchema = z.object({
  startTime: z.string().min(1, "Start time cannot be empty"),

  date: z.coerce.date({
    required_error: "Date is required",
  }),
});

export const bookingValidation = {
  feedbackValidationSchema,
  bookingValidationSchema
};
