import { z } from "zod";

const serviceEnum = z.enum(["LinkedIn", "Career", "Cv"]);

const serviceValidationSchema = z.object({
  serviceType: serviceEnum,
  about: z.string().min(1, "About is required"),
  //   price: z.number().nonnegative("Price must be non-negative"),
  duration: z.string().optional(),
  delivery: z.string().optional(),
});

export const serviceSchema = {
  serviceValidationSchema,
};
