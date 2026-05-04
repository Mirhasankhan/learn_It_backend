import { z } from "zod";

const TUserSubjectEnum = z.enum([
  "Expert_No_Show",
  "Non_Delivery",
  "Technical_Failure",
  "Quality_Issue",
  "Bad_Behaviour",
]);
const TExpertSubjectEnum = z.enum([
  "User_No_Show",
  "Extra_Demands",
  "Unfair_Rating",
  "Technical_Failure",
  "Bad_Behaviour",
]);

const userReportValidationSchema = z.object({
  bookingId: z.string().min(1, "bookingId is required"),
  orderId: z.string().min(1, "bookingId is required"),
  subject: TUserSubjectEnum,
  description: z
    .string()
    .min(10, "Description should be at least 10 characters"),
});
const expertReportValidationSchema = z.object({
  bookingId: z.string().min(1, "bookingId is required"),
  orderId: z.string().min(1, "bookingId is required"),
  subject: TExpertSubjectEnum,
  description: z
    .string()
    .min(10, "Description should be at least 10 characters"),
});

export const reportValidation = {
  userReportValidationSchema,
  expertReportValidationSchema,
};
