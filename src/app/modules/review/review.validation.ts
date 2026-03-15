import { z } from "zod";

const reviewValidationSchema = z.object({
  comment: z.string().min(1, "comment is required").optional(),
  rating: z
    .number()
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must be at most 5"),
});

export const reviewValidation = {
  reviewValidationSchema,
};
