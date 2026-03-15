import express from "express";
import { bookingController } from "./booking.controller";
import auth from "../../middlewares/auth";
import { fileUploader } from "../../../helpers/fileUploadHelper";
import { parseBodyData } from "../../middlewares/parseBodyData";
import { UserRole } from "@prisma/client";
import validateRequest from "../../middlewares/validateRequest";
import { bookingValidation } from "./booking.validation";

const router = express.Router();

router.post(
  "/create",
 auth(UserRole.USER),
  fileUploader.cvUrl,
  parseBodyData,
  bookingController.createBooking
);
router.post(
  "/use/free-session",
  auth(UserRole.USER),
  validateRequest(bookingValidation.bookingValidationSchema),
  bookingController.createBookingUsingFreeSession
);
router.put("/reschedule", auth(), bookingController.rescheduleSession);
router.get(
  "/job-seeker/orders",
  auth(UserRole.USER),
  bookingController.jobSeekerWiseOrders
);
router.get(
  "/job-seeker/sessions",
  auth(UserRole.USER),
  bookingController.jobSeekerWiseSessions
);
router.get(
  "/expert/sessions",
  auth(UserRole.EXPERT),
  bookingController.expertWiseSessions
);
router.get(
  "/expert/orders",
  auth(UserRole.EXPERT),
  bookingController.expertWiseOrders
);
router.get("/order/:id", auth(), bookingController.orderDetails);
router.get("/session/:id", auth(), bookingController.sessionDetails);
router.post(
  "/feedback/create",
  // auth(UserRole.EXPERT),
  validateRequest(bookingValidation.feedbackValidationSchema),
  bookingController.giveFeedback
);
router.post("/mark-complete", auth(), bookingController.completeOrder);
router.put("/cancel-order/:id", auth(), bookingController.cancelOrder);
router.put("/cancel-session/:id", auth(), bookingController.cancelSession);
router.patch("/recording/in-progress/:id", bookingController.markSessionRecordingInProgress);

export const bookingRoutes = router;
