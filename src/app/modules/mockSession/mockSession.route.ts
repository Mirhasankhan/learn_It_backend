import express from "express";
import { mockSessionController } from "./mockSession.controller";
import validateRequest from "../../middlewares/validateRequest";
import { mockSessionSchema } from "./mockSession.validation";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();

router.get("/", mockSessionController.getMockSession);
router.put(
  "/update",
  validateRequest(mockSessionSchema.mockSessionUpdateSchema),
  mockSessionController.updateMockSession
);
router.post(
  "/book",
  auth(UserRole.USER),
  validateRequest(mockSessionSchema.mockSessionBookingSchema),
  mockSessionController.bookMockSession
);

export const mockSessionRoutes = router;
