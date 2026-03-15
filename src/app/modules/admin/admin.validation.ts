import { z } from "zod";
const roleEnum = z.enum([
  "SuperAdmin",
  "FinanceAdmin",
  "UserAdmin",
  "DisputeAdmin",
  "ContentAdmin",
]);
const termsEnum = z.enum(["User", "Expert"]);
const faqEnum = z.enum(["User", "Expert"]);
const receiverEnum = z.enum(["AllUsers", "Seekers", "Experts", "SingleUser"]);
const userReportStatusEnum = z.enum([
  "Full_Refund",
  "No_Refund",
  "Formal_Warning",
  "Partial_Refund",
  "Account_Suspend",
]);
const expertReportStatusEnum = z.enum([
  "Release_Payment",
  "Review_Removed",
  "Formal_Warning",
  "Account_Suspend",
]);

const adminValidationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: roleEnum,
  phoneNumber: z.string().min(1, "Phone Number is required"),
});

const adminLoginSchema = z.object({
  phoneNumber: z.string().min(1, "Phone number is required"),
  otp: z.string().min(1, "Otp is required"),
});
const faqValiationSchema = z.object({
  question: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required"),
  faqType: faqEnum,
});
const termsValidationSchema = z.object({
  content: z.string().min(1, "Content is required"),
  key: termsEnum,
});

const expertPlanValidationSchema = z.object({
  title: z.string().min(1, "Title is required"),
  features: z
    .array(z.string().min(1, "Feature cannot be empty"))
    .min(1, "At least one feature is required"),
  fee: z.number().positive("Fee must be a positive number"),
  mockCut: z.number().int().positive("Mock  positive whole number"),
  serviceCut: z.number().int().positive("Mock  positive whole number"),
  type: z.enum(["Yearly", "Monthly"]),
});

const subscriptionValidationSchema = z.object({
  title: z.string().min(1, "Title is required"),
  features: z
    .array(z.string().min(1, "Feature cannot be empty"))
    .min(1, "At least one feature is required"),
  fee: z.number().positive("Fee must be a positive number"),
  freeSession: z
    .number()
    .int()
    .positive("Free session must be a positive whole number"),
  type: z.enum(["ThreeDays", "Weekly", "Monthly"]),
});

const subscriptionUpdateSchema = z.object({
  planId: z.string(),
  title: z.string().optional(),
  freeSession: z.number().optional(),
  features: z.any().optional(),
  fee: z.number().optional(),
});

const expertPlanUpdateSchema = z.object({
  planId: z.string(),
  title: z.string().optional(),
  mockCut: z.number().min(1).max(99).optional(),
  serviceCut: z.number().min(1).max(99).optional(),
  features: z.any().optional(),
  fee: z.number().optional(),
});

const adminNotificationSchema = z.object({
  receiver: receiverEnum,
  content: z.string().min(1, "Content is required"),
  userId: z.string().optional().nullable(),
});

const userReportResponseSchema = z.object({
  reportId: z.string(),
  adminsReply: z.string().min(1, "Admin reply is required"),
  status: userReportStatusEnum,
  refundRate: z.number().optional(),
});
const expertReportResponseSchema = z.object({
  reportId: z.string(),
  adminsReply: z.string().min(1, "Admin reply is required"),
  status: expertReportStatusEnum,
});

export const adminValidation = {
  adminValidationSchema,
  subscriptionValidationSchema,
  userReportResponseSchema,
  faqValiationSchema,
  expertPlanValidationSchema,
  expertPlanUpdateSchema,
  adminLoginSchema,
  termsValidationSchema,
  subscriptionUpdateSchema,
  expertReportResponseSchema,
  adminNotificationSchema,
};
