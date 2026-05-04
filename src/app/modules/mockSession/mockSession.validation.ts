import { z } from "zod";

const mockSessionUpdateSchema = z.object({
  price: z
    .number()
    .int("Price must be a whole number")
    .positive("Price must be greater than 0")
    .optional(),
  duration: z
    .enum(["30 minutes", "45 minutes", "60 minutes","90 minutes" ,"120 minutes","150 minutes","180 minutes"], {
      message: "Duration not allowed",
    })
    .optional(),
});



const mockSessionBookingSchema = z.object({
  serviceId: z.string().min(1, "Service is required"),
  expertId: z.string().min(1, "Expert is required"),
  date: z.coerce.date({
    required_error: "Date is required",
  }),
  startTime: z.string().min(1, "Start time cannot be empty"),
});

export const mockSessionSchema = {
  mockSessionBookingSchema,
  mockSessionUpdateSchema,
};
