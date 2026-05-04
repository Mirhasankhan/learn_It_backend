import { z } from "zod";
const roleEnum = z.enum(["USER", "EXPERT"]);

const userRegisterValidationSchema = z.object({
  userName: z.string().min(1, "User name is required"),
  education: z.string().min(1, "Education degree is required"),
  referralSource: z.string().min(1, "Reference source is required"),
  role: roleEnum,
});



export const userValidation = {
  userRegisterValidationSchema
};
