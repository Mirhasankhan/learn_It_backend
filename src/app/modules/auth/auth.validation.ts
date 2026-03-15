import { z } from "zod";
const optionEnum = z.enum([
  "all",
  "onehour",
  "fifteen",
  "cancelled",
  "rescheduled",
  "newSession",
  "review",
  "payments",
  "withdraw",
  "refund",
  "offers",
]);

const toggleValidationSchema = z.object({
  option: optionEnum,
});

const userProfileValidationSchema = z.object({
  currentSituation: z.string().min(1, "Current situation is required"),
  targetIndustry: z
    .array(z.string())
    .min(1, "At least one target industry is required"),
  aimingRole: z.string().optional(),
  experience: z.string().min(1, "Experience is required"),
  expectedSalary: z.string().min(1, "Expected salary is required"),
  availability: z.string().min(1, "Availability is required"),
  confidence: z.string().min(1, "Confidence is required"),
  struggleArea: z.string().min(1, "Struggle area is required"),
});

const expertProfileValiationSchema = z.object({
  targetIndustry: z
    .array(z.string())
    .min(1, "At least one target industry is required"),
  // experience: z.string().min(1, "Experience is required"),
  about: z.string().min(1, "About is required"),
  linkedInUrl: z.string().url("Invalid LinkedIn URL"),
});

export const authValidation = {
  toggleValidationSchema,
  userProfileValidationSchema,
  expertProfileValiationSchema,
};
